"""V5 five-frame scanner-cleanup storyboard.

Based on the approved V4 heart, camera, heartbeat, rotation and palette.
Removes the incomplete orbital arc and extra floating sample marker.
Keeps exactly two complete elliptical gimbal rings: one primary, one ~40%
quieter, plus a single amber tracker on the primary ring and the narrow
tomography band.

Renders only 0%, 25%, 50%, 75%, 100%. Does not encode a full MP4.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_motion_v5_storyboard.py
"""

import math
import os
import time
from pathlib import Path

import bpy
from mathutils import Vector

PHASE = os.environ.get("PREVIEW_PHASE", "render")

LAB = Path(__file__).resolve().parent.parent
SRC_BLEND = LAB / "blends" / "heart_recognition_final.blend"
BLEND_OUT = LAB / "blends" / "heart_motion_v5.blend"
PNG_DIR = LAB / "renders" / "motion-storyboard-v5"
SHEET_OUT = LAB.parent.parent / "exports" / "chad-moc-v1-review" / "cardiac-v5" / "storyboard.png"
REVIEW_DIR = LAB.parent.parent / "exports" / "chad-moc-v1-review" / "cardiac-v5"

FPS = 30
DURATION = 15.0
END_FRAME = 450
STORY_FRAMES = (0, 113, 225, 338, 450)
FIRST, LAST = 0, 449
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
# Thin leading line ~3 px; sampling zone ~4.5% of heart height (~2.08).
LINE_INNER = 0.004
LINE_OUTER = 0.014
ZONE_OUTER = 0.048
BEHIND_FADE = 0.055
TUBE = 0.0050


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
    pitch = PITCH_DEG * math.sin(w)
    roll = ROLL_DEG * math.sin(2 * w)
    return math.radians(yaw), math.radians(pitch), math.radians(roll)


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
    p = max(beat_pulse((BEATS * t / DURATION) % 1.0), 0.0)
    return TORSION * p


def scan_env(t):
    if t <= 0.40 or t >= 14.50:
        return 0.0
    env = 1.0
    if t < 1.15:
        env = smooth((t - 0.40) / 0.75)
    if t > 13.15:
        env = min(env, 1.0 - smooth((t - 13.15) / 1.35))
    return env


def scan_z(t):
    if t <= 0.40 or t >= 14.50:
        return 1.14
    return 1.14 - 2.16 * min(max((t - 0.50) / 12.70, 0.0), 1.0)


def linear_keys(id_data):
    if not id_data.animation_data or not id_data.animation_data.action:
        return
    for fc in id_data.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


def close_slices():
    """Return A/C to registered positions and hide cut-face materials."""
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


def scan_coords(nt, scan_obj):
    n, link = nt.nodes.new, nt.links.new
    tex = n("ShaderNodeTexCoord")
    tex.object = scan_obj
    sep = n("ShaderNodeSeparateXYZ")
    link(tex.outputs["Object"], sep.inputs[0])
    env = n("ShaderNodeValue")
    env.name = "ScanEnv"
    env.label = "ScanEnv"
    env.outputs[0].default_value = 0.0
    return sep, env


def add_scan_line(mat, scan_obj):
    """Narrow gray-green leading line only — no surface flood."""
    nt = mat.node_tree
    n, link = nt.nodes.new, nt.links.new
    out = next(node for node in nt.nodes if node.type == "OUTPUT_MATERIAL")
    src = out.inputs["Surface"].links[0].from_socket
    sep, env = scan_coords(nt, scan_obj)
    absz = n("ShaderNodeMath")
    absz.operation = "ABSOLUTE"
    link(sep.outputs["Z"], absz.inputs[0])
    band = n("ShaderNodeMapRange")
    band.interpolation_type = "SMOOTHSTEP"
    band.inputs["From Min"].default_value = LINE_INNER
    band.inputs["From Max"].default_value = LINE_OUTER
    band.inputs["To Min"].default_value = 1.0
    band.inputs["To Max"].default_value = 0.0
    link(absz.outputs[0], band.inputs["Value"])
    gated = n("ShaderNodeMath")
    gated.operation = "MULTIPLY"
    link(band.outputs["Result"], gated.inputs[0])
    link(env.outputs[0], gated.inputs[1])
    gain = n("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = 0.38
    link(gated.outputs[0], gain.inputs[0])
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.40, 0.56, 0.48, 1)
    emit.inputs["Strength"].default_value = 0.70
    mix = n("ShaderNodeMixShader")
    link(gain.outputs[0], mix.inputs["Fac"])
    link(src, mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], out.inputs["Surface"])
    return env


def cloud_material(scan_obj):
    """Sparse surface samples, only near the plane, fading faster behind it."""
    mat = bpy.data.materials.new("ScanCloud")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.use_backface_culling = False
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new
    sep, env = scan_coords(nt, scan_obj)
    absz = n("ShaderNodeMath")
    absz.operation = "ABSOLUTE"
    link(sep.outputs["Z"], absz.inputs[0])
    zone = n("ShaderNodeMapRange")
    zone.interpolation_type = "SMOOTHSTEP"
    zone.inputs["From Min"].default_value = 0.010
    zone.inputs["From Max"].default_value = ZONE_OUTER
    zone.inputs["To Min"].default_value = 1.0
    zone.inputs["To Max"].default_value = 0.0
    link(absz.outputs[0], zone.inputs["Value"])
    behind = n("ShaderNodeMapRange")
    behind.interpolation_type = "SMOOTHSTEP"
    behind.inputs["From Min"].default_value = 0.0
    behind.inputs["From Max"].default_value = BEHIND_FADE
    behind.inputs["To Min"].default_value = 1.0
    behind.inputs["To Max"].default_value = 0.12
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
    vor.inputs["Scale"].default_value = 92.0
    tex = n("ShaderNodeTexCoord")
    link(tex.outputs["Object"], vor.inputs["Vector"])
    dots = n("ShaderNodeMath")
    dots.operation = "GREATER_THAN"
    dots.inputs[1].default_value = 0.78
    link(vor.outputs["Distance"], dots.inputs[0])
    fac = n("ShaderNodeMath")
    fac.operation = "MULTIPLY"
    link(gated.outputs[0], fac.inputs[0])
    link(dots.outputs[0], fac.inputs[1])
    gain = n("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = 0.42
    link(fac.outputs[0], gain.inputs[0])
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.46, 0.62, 0.54, 1)
    emit.inputs["Strength"].default_value = 0.80
    trans = n("ShaderNodeBsdfTransparent")
    mix = n("ShaderNodeMixShader")
    link(gain.outputs[0], mix.inputs["Fac"])
    link(trans.outputs[0], mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat, env


def make_torus(name, major, minor, loc, rot, scale_xy, segs=128):
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
    obj.location = loc
    obj.rotation_euler = rot
    obj.scale = (scale_xy[0], scale_xy[1], 1.0)
    obj.visible_shadow = False
    bpy.context.scene.collection.objects.link(obj)
    return obj


def make_arc(name, major, minor, loc, rot, scale_xy, start, end, segs=64):
    mesh = bpy.data.meshes.new(name)
    tubes = 6
    verts, faces = [], []
    span = end - start
    for i in range(segs + 1):
        u = start + span * i / segs
        cx, cy = math.cos(u) * major, math.sin(u) * major
        for j in range(tubes):
            v = 2 * math.pi * j / tubes
            nrm = Vector((math.cos(u) * math.cos(v), math.sin(u) * math.cos(v), math.sin(v)))
            verts.append((cx + nrm.x * minor, cy + nrm.y * minor, nrm.z * minor))
    for i in range(segs):
        i0, i1 = i * tubes, (i + 1) * tubes
        for j in range(tubes):
            j1 = (j + 1) % tubes
            faces.append((i0 + j, i1 + j, i1 + j1, i0 + j1))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    obj.rotation_euler = rot
    obj.scale = (scale_xy[0], scale_xy[1], 1.0)
    obj.visible_shadow = False
    bpy.context.scene.collection.objects.link(obj)
    return obj


def add_ticks(parent, major, count, length=0.028, thick=0.0022):
    tick_mesh = bpy.data.meshes.new(f"{parent.name}_Tick")
    hx, hy, hz = length * 0.5, thick, thick
    tv = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
          (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    tf = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    tick_mesh.from_pydata(tv, [], tf)
    tick_mesh.update()
    objs = []
    for i in range(count):
        a = 2 * math.pi * i / count
        o = bpy.data.objects.new(f"{parent.name}_Tick{i}", tick_mesh)
        o.location = (math.cos(a) * major, math.sin(a) * major, 0.0)
        o.rotation_euler = (0.0, 0.0, a)
        o.visible_shadow = False
        bpy.context.scene.collection.objects.link(o)
        o.parent = parent
        objs.append(o)
    return objs


def add_nodes(parent, major, angles, r=0.007):
    mesh = bpy.data.meshes.new(f"{parent.name}_Node")
    # octahedron
    mv = [(r, 0, 0), (-r, 0, 0), (0, r, 0), (0, -r, 0), (0, 0, r), (0, 0, -r)]
    mf = [(0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2), (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5)]
    mesh.from_pydata(mv, [], mf)
    mesh.update()
    objs = []
    for i, a in enumerate(angles):
        o = bpy.data.objects.new(f"{parent.name}_Node{i}", mesh)
        o.location = (math.cos(a) * major, math.sin(a) * major, 0.0)
        o.visible_shadow = False
        bpy.context.scene.collection.objects.link(o)
        o.parent = parent
        objs.append(o)
    return objs


def apply_pose(root, orbit, gimbal, scan, envs, t):
    yaw, pitch, roll = drift(t)
    root.rotation_euler = (pitch, roll, yaw + torsion(t))
    root.scale = beat_scale(t)
    w = 2 * math.pi * t / DURATION
    orbit.rotation_euler = (orbit.rotation_euler.x, orbit.rotation_euler.y, w)
    gimbal.rotation_euler = (
        gimbal.rotation_euler.x,
        gimbal.rotation_euler.y,
        math.radians(22.0) * math.sin(w),
    )
    scan.location.z = scan_z(t)
    env = scan_env(t)
    for node in envs:
        node.outputs[0].default_value = env


def key_pose(root, orbit, gimbal, scan, envs, t):
    apply_pose(root, orbit, gimbal, scan, envs, t)
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
    print(f"[v4] heart width={width:.3f} height={height:.3f} centre={tuple(round(c, 3) for c in centre)}")

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
    scan.location = Vector((centre.x, centre.y, 1.14))
    scene.collection.objects.link(scan)

    ext = bpy.data.materials["ExteriorCharcoal"]
    env_line = add_scan_line(ext, scan)
    cloud_mat, env_cloud = cloud_material(scan)
    envs = [env_line, env_cloud]
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

    ring_mat = emit_mat("GimbalRing", (0.44, 0.58, 0.52), 0.95, alpha=0.40)
    quiet_mat = emit_mat("GimbalQuiet", (0.44, 0.58, 0.52), 0.57, alpha=0.24)
    tick_mat = emit_mat("GimbalTick", (0.48, 0.62, 0.54), 1.05, alpha=0.50)
    amber_mat = emit_mat("GimbalAmber", (0.72, 0.48, 0.28), 0.85, alpha=0.70)

    major_v = 0.62 * width * 1.18
    major_h = 0.62 * width * 1.22

    orbit_root = bpy.data.objects.new("GimbalOrbit", None)
    orbit_root.location = centre + Vector((-0.03, -0.02, 0.04))
    orbit_root.rotation_euler = (math.radians(80), math.radians(12), math.radians(-10))
    scene.collection.objects.link(orbit_root)
    orbit = make_torus("GimbalOrbitRing", major_v, TUBE, (0, 0, 0), (0, 0, 0), (0.78, 1.14))
    orbit.parent = orbit_root
    orbit.data.materials.append(ring_mat)
    for t in add_ticks(orbit, major_v, 12):
        t.data.materials.append(tick_mat)

    # Complete ellipse on the old V4 arc plane so it reads as a ring, not an edge-on line.
    gimbal_root = bpy.data.objects.new("GimbalSlow", None)
    gimbal_root.location = centre + Vector((-0.04, 0.01, 0.02))
    gimbal_root.rotation_euler = (math.radians(52), math.radians(22), math.radians(-28))
    scene.collection.objects.link(gimbal_root)
    gimbal = make_torus("GimbalSlowRing", major_h, TUBE * 0.92, (0, 0, 0), (0, 0, 0), (0.90, 1.05))
    gimbal.parent = gimbal_root
    gimbal.data.materials.append(quiet_mat)

    marker = add_nodes(orbit, major_v, (0.0,), r=0.011)[0]
    marker.name = "AmberTrackerNode"
    marker.data.materials.clear()
    marker.data.materials.append(amber_mat)

    for i in range(0, END_FRAME + 1, 2):
        key_pose(root, orbit_root, gimbal_root, scan, envs, i / FPS)
    linear_keys(root)
    linear_keys(orbit_root)
    linear_keys(gimbal_root)
    linear_keys(scan)
    linear_keys(ext.node_tree)
    linear_keys(cloud_mat.node_tree)

    scene.frame_start = 0
    scene.frame_end = END_FRAME
    scene.render.fps = FPS
    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    print(f"[v4] rig saved {BLEND_OUT}")
    print(
        f"[v4] yaw 0..+{YAW_PEAK}..+{YAW_HOLD}..0; pitch ±{PITCH_DEG}; roll ±{ROLL_DEG}; "
        f"beat radial {RADIAL:.2%} long {LONGITUDINAL:.2%}; tube {TUBE:.4f}"
    )
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
    out = bpy.data.images.new("v5_sheet", sheet_w, sheet_h, alpha=True)
    out.pixels = pixels
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.filepath_raw = str(dest)
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    print(f"[v5] contact sheet {dest} {sheet_w}x{sheet_h}")


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
        print(f"[v5] frame {f}")
    write_contact_sheet(paths, SHEET_OUT)
    print(f"[v5] storyboard time {time.time() - start:.1f}s")


def main():
    scene = build_rig()
    render_storyboard(scene)


main()
