"""V6 five-frame compact scanner storyboard.

Approved V4 heart, camera, heartbeat, rotation and palette.
Two complete ellipses share the heart centroid and stay inside frame.
Soft translucent scan plane plus a faint local point-cloud — no surface seam.

Renders only 0%, 25%, 50%, 75%, 100%. Does not encode a full MP4.
"""

import math
import time
from pathlib import Path

import bpy
from mathutils import Vector

LAB = Path(__file__).resolve().parent.parent
SRC_BLEND = LAB / "blends" / "heart_recognition_final.blend"
BLEND_OUT = LAB / "blends" / "heart_motion_v6.blend"
PNG_DIR = LAB / "renders" / "motion-storyboard-v6"
SHEET_OUT = LAB.parent.parent / "exports" / "chad-moc-v1-review" / "cardiac-v6" / "storyboard.png"
REVIEW_DIR = LAB.parent.parent / "exports" / "chad-moc-v1-review" / "cardiac-v6"

FPS = 30
DURATION = 15.0
END_FRAME = 450
STORY_FRAMES = (0, 113, 225, 338, 450)
SAMPLES = 16
RES = (640, 360)
BEATS = 17
YAW_PEAK = 13.2
YAW_HOLD = 4.4
PITCH_DEG = 2.0
ROLL_DEG = 0.75
RADIAL = 0.0255
LONGITUDINAL = 0.0135
TORSION = math.radians(0.40)
TUBE = 0.0036
ZONE_OUTER = 0.038
BEHIND_FADE = 0.045


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


def emit_mat(name, color, strength, alpha=0.42):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.use_backface_culling = True
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (*color, 1)
    emit.inputs["Strength"].default_value = strength
    trans = n("ShaderNodeBsdfTransparent")
    mix = n("ShaderNodeMixShader")
    mix.inputs["Fac"].default_value = alpha
    link(trans.outputs[0], mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


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


def make_torus(name, major, minor, scale_xy, segs=128):
    mesh = bpy.data.meshes.new(name)
    tubes = 8
    verts, faces = [], []
    for i in range(segs):
        u = 2 * math.pi * i / segs
        cx, cy = math.cos(u) * major, math.sin(u) * major
        for j in range(tubes):
            v = 2 * math.pi * j / tubes
            nrm = Vector((math.cos(u) * math.cos(v), math.sin(u) * math.cos(v), math.sin(v)))
            verts.append((cx + nrm.x * minor, cy + nrm.y * minor, nrm.z * minor))
        i0, i1 = i * tubes, ((i + 1) % segs) * tubes
        for j in range(tubes):
            j1 = (j + 1) % tubes
            faces.append((i0 + j, i1 + j, i1 + j1, i0 + j1))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.scale = (scale_xy[0], scale_xy[1], 1.0)
    obj.visible_shadow = False
    bpy.context.scene.collection.objects.link(obj)
    return obj


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


def add_nodes(parent, major, angles, r=0.008):
    mesh = bpy.data.meshes.new(f"{parent.name}_Node")
    mv = [(r, 0, 0), (-r, 0, 0), (0, r, 0), (0, -r, 0), (0, 0, r), (0, 0, -r)]
    mf = [(0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2), (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5)]
    mesh.from_pydata(mv, [], mf)
    mesh.update()
    o = bpy.data.objects.new(f"{parent.name}_Node0", mesh)
    o.location = (math.cos(angles[0]) * major, math.sin(angles[0]) * major, 0.0)
    o.visible_shadow = False
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    return o


def apply_pose(root, orbit, gimbal, scan, plane, envs, t, centre_z, height):
    yaw, pitch, roll = drift(t)
    root.rotation_euler = (pitch, roll, yaw + torsion(t))
    root.scale = beat_scale(t)
    w = 2 * math.pi * t / DURATION
    orbit.rotation_euler = (orbit.rotation_euler.x, orbit.rotation_euler.y, w)
    gimbal.rotation_euler = (
        gimbal.rotation_euler.x,
        gimbal.rotation_euler.y,
        math.radians(18.0) * math.sin(w),
    )
    scan.location.z = scan_z(t, centre_z, height)
    env = scan_env(t)
    for node in envs:
        node.outputs[0].default_value = env
    plane.hide_render = env <= 0.001


def key_pose(root, orbit, gimbal, scan, plane, envs, t, centre_z, height):
    apply_pose(root, orbit, gimbal, scan, plane, envs, t, centre_z, height)
    f = t * FPS
    root.keyframe_insert("rotation_euler", frame=f)
    root.keyframe_insert("scale", frame=f)
    orbit.keyframe_insert("rotation_euler", frame=f)
    gimbal.keyframe_insert("rotation_euler", frame=f)
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
    print(f"[v6] heart width={width:.3f} height={height:.3f} centre={tuple(round(c, 3) for c in centre)}")

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

    ring_mat = emit_mat("GimbalRing", (0.44, 0.58, 0.52), 0.88, alpha=0.38)
    quiet_mat = emit_mat("GimbalQuiet", (0.44, 0.58, 0.52), 0.52, alpha=0.22)
    amber_mat = emit_mat("GimbalAmber", (0.72, 0.48, 0.28), 0.80, alpha=0.68)

    # Diameter ≈ 132% of visible width, slight ellipse stays inside 125–140%.
    primary_r = width * 0.66
    secondary_r = width * 0.54

    orbit_root = bpy.data.objects.new("GimbalOrbit", None)
    orbit_root.location = centre
    orbit_root.rotation_euler = (math.radians(72), math.radians(16), math.radians(-12))
    scene.collection.objects.link(orbit_root)
    orbit = make_torus("GimbalOrbitRing", primary_r, TUBE, (0.96, 1.04))
    orbit.parent = orbit_root
    orbit.data.materials.append(ring_mat)

    gimbal_root = bpy.data.objects.new("GimbalSlow", None)
    gimbal_root.location = centre
    gimbal_root.rotation_euler = (math.radians(46), math.radians(-34), math.radians(18))
    scene.collection.objects.link(gimbal_root)
    gimbal = make_torus("GimbalSlowRing", secondary_r, TUBE * 0.9, (1.02, 0.94))
    gimbal.parent = gimbal_root
    gimbal.data.materials.append(quiet_mat)

    marker = add_nodes(orbit, primary_r, (0.0,), r=0.009)
    marker.name = "AmberTrackerNode"
    marker.data.materials.clear()
    marker.data.materials.append(amber_mat)

    envs = [env_plane, env_cloud]
    for i in range(0, END_FRAME + 1, 2):
        key_pose(root, orbit_root, gimbal_root, scan, plane, envs, i / FPS, centre.z, height)
    linear_keys(root)
    linear_keys(orbit_root)
    linear_keys(gimbal_root)
    linear_keys(scan)
    linear_keys(plane_mat.node_tree)
    linear_keys(cloud_mat.node_tree)

    scene.frame_start = 0
    scene.frame_end = END_FRAME
    scene.render.fps = FPS
    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    print(f"[v6] rings primary={primary_r * 2 / width:.2f}w secondary={secondary_r * 2 / width:.2f}w")
    return scene


def configure_render(scene):
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.use_overwrite = True
    scene.render.use_file_extension = True
    if scene.world and scene.world.use_nodes:
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (8 / 255, 10 / 255, 11 / 255, 1)
            bg.inputs[1].default_value = 1.0
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)


def write_contact_sheet(paths, dest):
    images = [bpy.data.images.load(str(p)) for p in paths]
    w, h = int(images[0].size[0]), int(images[0].size[1])
    gap = 8
    sheet_w = w * len(images) + gap * (len(images) + 1)
    sheet_h = h + gap * 2
    pixels = [8 / 255, 10 / 255, 11 / 255, 1.0] * (sheet_w * sheet_h)
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
    out = bpy.data.images.new("v6_sheet", sheet_w, sheet_h, alpha=True)
    out.pixels = pixels
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.filepath_raw = str(dest)
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    print(f"[v6] contact sheet {dest} {sheet_w}x{sheet_h}")


def render_storyboard(scene):
    configure_render(scene)
    start = time.time()
    paths = []
    for f in STORY_FRAMES:
        scene.frame_set(f)
        name = f"frame_{f:04d}"
        scene.render.filepath = str(PNG_DIR / name)
        bpy.ops.render.render(write_still=True)
        src = PNG_DIR / f"{name}.png"
        dest = REVIEW_DIR / f"{name}.png"
        dest.write_bytes(src.read_bytes())
        paths.append(dest)
        print(f"[v6] frame {f}")
    write_contact_sheet(paths, SHEET_OUT)
    print(f"[v6] storyboard time {time.time() - start:.1f}s")


def main():
    scene = build_rig()
    render_storyboard(scene)


if __name__ == "__main__":
    main()
