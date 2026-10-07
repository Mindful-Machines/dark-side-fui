"""V1.1 no-ring cardiac storyboard.

Approved V4/V6 heart, camera, heartbeat, rotation and scan band.
No ellipse, tracker, orbit or radial-line geometry.
Renders transparent, then composites onto a panel-matched matte.

Renders only 0, 112, 225, 338, 450. Does not encode a full MP4.
"""

import math
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

LAB = Path(__file__).resolve().parent.parent
SRC_BLEND = LAB / "blends" / "heart_recognition_final.blend"
BLEND_OUT = LAB / "blends" / "heart_motion_v11.blend"
PNG_DIR = LAB / "renders" / "motion-storyboard-v11"
SHEET_OUT = LAB / "renders" / "motion-storyboard-v11" / "storyboard.png"

FPS = 30
DURATION = 15.0
END_FRAME = 450
STORY_FRAMES = (0, 112, 225, 338, 450)
SAMPLES = 16
RES = (1280, 720)
BEATS = 17
YAW_PEAK = 13.2
YAW_HOLD = 4.4
PITCH_DEG = 2.0
ROLL_DEG = 0.75
RADIAL = 0.0255
LONGITUDINAL = 0.0135
TORSION = math.radians(0.40)
ZONE_OUTER = 0.038
BEHIND_FADE = 0.045
# Captured FUI panel is ~ (14,16,14). H.264/browser lifted V6's Filmic
# (43,50,53) by ~+7. Composite slightly darker than #0d0f0d so the encoded
# plate lands on the stage.
MATTE = (10 / 255, 12 / 255, 10 / 255, 1.0)


def smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease_cos(u):
    return 0.5 - 0.5 * math.cos(math.pi * min(max(u, 0.0), 1.0))


def drift(t):
    u = t / DURATION
    if u <= 0:
        yaw = 0.0
    elif u < 0.30:
        yaw = YAW_PEAK * ease_cos(u / 0.30)
    elif u < 0.62:
        yaw = YAW_PEAK + (YAW_HOLD - YAW_PEAK) * ease_cos((u - 0.30) / 0.32)
    else:
        yaw = YAW_HOLD + (0.0 - YAW_HOLD) * ease_cos((u - 0.62) / 0.38)
    w = 2 * math.pi * u
    return math.radians(yaw), math.radians(PITCH_DEG * math.sin(w)), math.radians(ROLL_DEG * math.sin(2 * w))


def beat_pulse(u):
    if u < 0.10:
        return smooth(u / 0.10)
    if u < 0.38:
        return 1.0 + (-0.14 - 1.0) * smooth((u - 0.10) / 0.28)
    if u < 0.50:
        return -0.14 * (1.0 - smooth((u - 0.38) / 0.12))
    return 0.0


def beat_scale(t):
    p = beat_pulse((BEATS * t / DURATION) % 1.0)
    return 1.0 - RADIAL * p, 1.0 - RADIAL * p, 1.0 - LONGITUDINAL * p


def torsion(t):
    return TORSION * max(beat_pulse((BEATS * t / DURATION) % 1.0), 0.0)


def scan_env(t):
    if t <= 0.40 or t >= 14.50:
        return 0.0
    env = 1.0
    if t < 1.15:
        env = smooth((t - 0.40) / 0.75)
    if t > 13.15:
        env = min(env, 1.0 - smooth((t - 13.15) / 1.35))
    return env


def scan_z(t, centre_z, height):
    if t <= 0.40 or t >= 14.50:
        return centre_z + height * 0.42
    return centre_z + height * (0.42 - 0.84 * min(max((t - 0.50) / 12.70, 0.0), 1.0))


def linear_keys(id_data):
    if not id_data.animation_data or not id_data.animation_data.action:
        return
    for fc in id_data.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


def close_slices():
    bpy.data.objects["A"].location = (0.0, 0.0, 0.0)
    bpy.data.objects["C"].location = (0.0, 0.0, 0.0)
    ext = bpy.data.materials["ExteriorCharcoal"]
    for name in "ABC":
        o = bpy.data.objects[name]
        names = [s.material.name if s.material else "" for s in o.material_slots]
        if "CutSurface" not in names or "ExteriorCharcoal" not in names:
            continue
        cut_i, ext_i = names.index("CutSurface"), names.index("ExteriorCharcoal")
        for p in o.data.polygons:
            if p.material_index == cut_i:
                p.material_index = ext_i
        o.material_slots[cut_i].material = ext


def plane_material():
    mat = bpy.data.materials.new("ScanPlane")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.use_backface_culling = False
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new
    env = n("ShaderNodeValue")
    env.name = "ScanEnv"
    env.outputs[0].default_value = 0.0
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.40, 0.54, 0.48, 1)
    emit.inputs["Strength"].default_value = 0.28
    trans = n("ShaderNodeBsdfTransparent")
    mix = n("ShaderNodeMixShader")
    gain = n("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = 0.11
    link(env.outputs[0], gain.inputs[0])
    link(gain.outputs[0], mix.inputs["Fac"])
    link(trans.outputs[0], mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat, env


def cloud_material(scan_obj):
    mat = bpy.data.materials.new("ScanCloud")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.use_backface_culling = False
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new
    tex = n("ShaderNodeTexCoord")
    tex.object = scan_obj
    sep = n("ShaderNodeSeparateXYZ")
    link(tex.outputs["Object"], sep.inputs[0])
    env = n("ShaderNodeValue")
    env.name = "ScanEnv"
    env.outputs[0].default_value = 0.0
    absz = n("ShaderNodeMath")
    absz.operation = "ABSOLUTE"
    link(sep.outputs["Z"], absz.inputs[0])
    zone = n("ShaderNodeMapRange")
    zone.interpolation_type = "SMOOTHSTEP"
    zone.inputs["From Min"].default_value = 0.008
    zone.inputs["From Max"].default_value = ZONE_OUTER
    zone.inputs["To Min"].default_value = 1.0
    zone.inputs["To Max"].default_value = 0.0
    link(absz.outputs[0], zone.inputs["Value"])
    behind = n("ShaderNodeMapRange")
    behind.interpolation_type = "SMOOTHSTEP"
    behind.inputs["From Min"].default_value = 0.0
    behind.inputs["From Max"].default_value = BEHIND_FADE
    behind.inputs["To Min"].default_value = 1.0
    behind.inputs["To Max"].default_value = 0.08
    link(sep.outputs["Z"], behind.inputs["Value"])
    faded = n("ShaderNodeMath")
    faded.operation = "MULTIPLY"
    link(zone.outputs["Result"], faded.inputs[0])
    link(behind.outputs["Result"], faded.inputs[1])
    gated = n("ShaderNodeMath")
    gated.operation = "MULTIPLY"
    link(faded.outputs[0], gated.inputs[0])
    link(env.outputs[0], gated.inputs[1])
    vor = n("ShaderNodeTexVoronoi")
    vor.voronoi_dimensions = "3D"
    vor.feature = "F1"
    vor.inputs["Scale"].default_value = 78.0
    obj = n("ShaderNodeTexCoord")
    link(obj.outputs["Object"], vor.inputs["Vector"])
    dots = n("ShaderNodeMath")
    dots.operation = "GREATER_THAN"
    dots.inputs[1].default_value = 0.84
    link(vor.outputs["Distance"], dots.inputs[0])
    fac = n("ShaderNodeMath")
    fac.operation = "MULTIPLY"
    link(gated.outputs[0], fac.inputs[0])
    link(dots.outputs[0], fac.inputs[1])
    gain = n("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = 0.22
    link(fac.outputs[0], gain.inputs[0])
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.46, 0.62, 0.54, 1)
    emit.inputs["Strength"].default_value = 0.45
    trans = n("ShaderNodeBsdfTransparent")
    mix = n("ShaderNodeMixShader")
    link(gain.outputs[0], mix.inputs["Fac"])
    link(trans.outputs[0], mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat, env


def make_disc(name, radius, segs=64):
    mesh = bpy.data.meshes.new(name)
    verts = [(0.0, 0.0, 0.0)]
    faces = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        verts.append((math.cos(a) * radius, math.sin(a) * radius, 0.0))
    for i in range(1, segs + 1):
        faces.append((0, i, 1 if i == segs else i + 1))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.visible_shadow = False
    bpy.context.scene.collection.objects.link(obj)
    return obj


def apply_pose(root, scan, plane, envs, t, centre_z, height):
    yaw, pitch, roll = drift(t)
    root.rotation_euler = (pitch, roll, yaw + torsion(t))
    root.scale = beat_scale(t)
    scan.location.z = scan_z(t, centre_z, height)
    env = scan_env(t)
    for node in envs:
        node.outputs[0].default_value = env
    plane.hide_render = env <= 0.001


def key_pose(root, scan, plane, envs, t, centre_z, height):
    apply_pose(root, scan, plane, envs, t, centre_z, height)
    f = t * FPS
    root.keyframe_insert("rotation_euler", frame=f)
    root.keyframe_insert("scale", frame=f)
    scan.keyframe_insert("location", frame=f)
    for node in envs:
        node.outputs[0].keyframe_insert("default_value", frame=f)


def build_rig():
    bpy.ops.wm.open_mainfile(filepath=str(SRC_BLEND))
    scene = bpy.context.scene
    close_slices()

    heart_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    pts = []
    for o in heart_meshes:
        for corner in o.bound_box:
            pts.append(o.matrix_world @ Vector(corner))
    centre = sum(pts, Vector()) / len(pts)
    width = max(p.x for p in pts) - min(p.x for p in pts)
    height = max(p.z for p in pts) - min(p.z for p in pts)
    print(f"[v11] heart width={width:.3f} height={height:.3f} centre={tuple(round(c, 3) for c in centre)}")

    root = bpy.data.objects.new("HeartRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = centre
    scene.collection.objects.link(root)
    bpy.context.view_layer.update()
    for o in heart_meshes:
        world = o.matrix_world.copy()
        o.parent = root
        o.matrix_world = world

    scan = bpy.data.objects.new("ScanBand", None)
    scan.empty_display_type = "PLAIN_AXES"
    scan.location = Vector((centre.x, centre.y, centre.z + height * 0.42))
    scene.collection.objects.link(scan)

    plane_mat, env_plane = plane_material()
    plane = make_disc("ScanPlane", width * 0.62)
    plane.parent = scan
    plane.data.materials.append(plane_mat)

    cloud_mat, env_cloud = cloud_material(scan)
    skip = ("whole", "shell")
    for o in heart_meshes:
        if any(s in o.name.lower() for s in skip):
            continue
        w = o.copy()
        w.data = o.data
        w.name = f"Cloud_{o.name}"
        w.visible_shadow = False
        scene.collection.objects.link(w)
        w.parent = root
        w.matrix_world = o.matrix_world.copy()
        if not w.material_slots:
            w.data.materials.append(cloud_mat)
        for slot in w.material_slots:
            slot.link = "OBJECT"
            slot.material = cloud_mat

    envs = [env_plane, env_cloud]
    for i in range(0, END_FRAME + 1, 2):
        key_pose(root, scan, plane, envs, i / FPS, centre.z, height)
    linear_keys(root)
    linear_keys(scan)
    linear_keys(plane_mat.node_tree)
    linear_keys(cloud_mat.node_tree)

    scene.frame_start = 0
    scene.frame_end = END_FRAME
    scene.render.fps = FPS
    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    print("[v11] no rings; scan band + heartbeat + rotation only")
    return scene


def configure_render(scene, res=RES, samples=SAMPLES):
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = samples
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.use_overwrite = True
    scene.render.use_file_extension = True
    if scene.world and scene.world.use_nodes:
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = MATTE
            bg.inputs[1].default_value = 1.0


def composite_matte(src: Path, dest: Path | None = None):
    dest = dest or src
    img = bpy.data.images.load(str(src))
    w, h = int(img.size[0]), int(img.size[1])
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    alpha = px[:, :, 3:4]
    matte = np.array(MATTE, dtype=np.float32).reshape(1, 1, 4)
    out = px * alpha + matte * (1.0 - alpha)
    out[:, :, 3] = 1.0
    img.pixels = out.reshape(-1)
    img.filepath_raw = str(dest)
    img.file_format = "PNG"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save()
    bpy.data.images.remove(img)


def write_contact_sheet(paths, dest):
    images = [bpy.data.images.load(str(p)) for p in paths]
    w, h = int(images[0].size[0]), int(images[0].size[1])
    gap = 8
    sheet_w = w * len(images) + gap * (len(images) + 1)
    sheet_h = h + gap * 2
    pixels = list(MATTE) * (sheet_w * sheet_h)
    for i, img in enumerate(images):
        src = list(img.pixels)
        ox = gap + i * (w + gap)
        oy = gap
        for y in range(h):
            for x in range(w):
                si = (y * w + x) * 4
                di = ((oy + y) * sheet_w + (ox + x)) * 4
                pixels[di : di + 4] = src[si : si + 4]
        bpy.data.images.remove(img)
    out = bpy.data.images.new("v11_sheet", sheet_w, sheet_h, alpha=True)
    out.pixels = pixels
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.filepath_raw = str(dest)
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    print(f"[v11] contact sheet {dest} {sheet_w}x{sheet_h}")


def render_storyboard(scene):
    configure_render(scene)
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    start = time.time()
    paths = []
    for f in STORY_FRAMES:
        scene.frame_set(f)
        name = f"frame_{f:04d}"
        scene.render.filepath = str(PNG_DIR / name)
        bpy.ops.render.render(write_still=True)
        src = PNG_DIR / f"{name}.png"
        composite_matte(src)
        paths.append(src)
        print(f"[v11] frame {f}")
    write_contact_sheet(paths, SHEET_OUT)
    print(f"[v11] storyboard time {time.time() - start:.1f}s")


def main():
    scene = build_rig()
    render_storyboard(scene)


if __name__ == "__main__":
    main()
