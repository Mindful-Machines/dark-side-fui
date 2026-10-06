"""Set up a 15 s / 30 fps loop on the approved final recognition blend
and render five 640x360 diagnostic frames. No video, no geometry repair.

Source: blends/heart_recognition_final.blend (not the polished experiment).
Seam materials only may follow the polished still colours. Clump treatment
is left exactly as in the approved final.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_motion_storyboard.py
"""

import json
import math
import time
from pathlib import Path

import bpy
from mathutils import Vector

LAB = Path(__file__).resolve().parent.parent
SRC_BLEND = LAB / "blends" / "heart_recognition_final.blend"
BLEND_OUT = LAB / "blends" / "heart_motion_storyboard.blend"
OUT_DIR = LAB / "renders" / "motion-storyboard"

FPS = 30
DURATION = 15.0
END_FRAME = 450  # 15.00 s; production encode should use 0–449
SAMPLES = 16
RES = (640, 360)
BEATS = 17
YAW_DEG = 4.0
PITCH_DEG = 1.2
ROLL_DEG = 0.6
RADIAL = 0.012
LONGITUDINAL = 0.015
# Polished seam colours only — no polished geometry.
CUT_COLOR = (0.052, 0.032, 0.028)
CUT_AO = 0.04
CUT_ROUGH = 0.88
CAVITY_COLOR = (0.018, 0.013, 0.012)
CAVITY_AO = 0.05
CAVITY_EMIT = ((0.028, 0.018, 0.016), 0.28)
FRINGE_LOCAL = Vector((0.184, 0.232, 0.646))  # approved clump site on A, mesh space
STAGE = (8, 10, 11)
TIMES = (0.00, 3.75, 7.50, 11.25, 15.00)


def smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def beat_pulse(u):
    """One eased systole in [0, 1). Peak ~1.2% / 1.5% via caller. Zero at u=0."""
    if u >= 0.36 or u < 0:
        return 0.0
    if u < 0.13:
        return smooth(u / 0.13)
    return 1.0 - smooth((u - 0.13) / 0.23)


def drift(t):
    """Zero at 0 s and 15 s. Yaw negative half is softened so the fringe stays posterior."""
    w = 2 * math.pi * t / DURATION
    yaw = math.radians(YAW_DEG) * math.sin(w)
    if yaw < 0:
        yaw *= 0.6
    # 1-cos(w) nods down and back; both ends are 0 without a phase offset.
    pitch = math.radians(PITCH_DEG) * 0.5 * (1.0 - math.cos(w))
    roll = math.radians(ROLL_DEG) * math.sin(w)
    return yaw, pitch, roll


def beat_scale(t):
    u = (BEATS * t / DURATION) % 1.0
    p = beat_pulse(u)
    return 1.0 - RADIAL * p, 1.0 - RADIAL * p, 1.0 - LONGITUDINAL * p


def scan_env(t):
    if t <= 0.35 or t >= 14.65:
        return 0.0
    env = 1.0
    if t < 1.6:
        env = smooth((t - 0.35) / 1.25)
    if t > 13.1:
        env = min(env, 1.0 - smooth((t - 13.1) / 1.55))
    return env


def scan_z(t):
    # Park at the start height whenever the scan is off, so t=15 matches t=0.
    if t <= 0.35 or t >= 14.65:
        return 1.12
    return 1.12 - 2.10 * min(max((t - 0.4) / 12.8, 0.0), 1.0)


def region_strength(t, start, peak, end):
    if t <= start or t >= end:
        return 0.0
    if t < peak:
        return scan_env(t) * smooth((t - start) / max(peak - start, 1e-6))
    return scan_env(t) * (1.0 - smooth((t - peak) / max(end - peak, 1e-6)))


def amber_energy(t):
    return 18.0 * region_strength(t, 5.1, 7.2, 8.8)


def goto(scene, t):
    f = t * FPS
    scene.frame_set(int(f), subframe=f - int(f))
    bpy.context.view_layer.update()


def apply_pose(root, scan, amber, highlights, t):
    yaw, pitch, roll = drift(t)
    root.rotation_euler = (pitch, roll, yaw)
    root.scale = beat_scale(t)
    scan.location.z = scan_z(t)
    scan.data.energy = 42.0 * scan_env(t)
    amber.data.energy = amber_energy(t)
    highlights["A"].outputs[0].default_value = 0.45 * region_strength(t, 1.6, 3.4, 5.6)
    highlights["B"].outputs[0].default_value = 0.40 * region_strength(t, 5.0, 7.3, 9.4)
    highlights["C"].outputs[0].default_value = 0.40 * region_strength(t, 8.6, 10.8, 13.0)


def key_pose(root, scan, amber, highlights, t):
    apply_pose(root, scan, amber, highlights, t)
    f = t * FPS
    root.keyframe_insert("rotation_euler", frame=f)
    root.keyframe_insert("scale", frame=f)
    scan.keyframe_insert("location", frame=f)
    scan.data.keyframe_insert("energy", frame=f)
    amber.data.keyframe_insert("energy", frame=f)
    for node in highlights.values():
        node.outputs[0].keyframe_insert("default_value", frame=f)


def linear_keys(id_data):
    if not id_data.animation_data or not id_data.animation_data.action:
        return
    for fc in id_data.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


def set_ao(mat, color, distance=None):
    for n in mat.node_tree.nodes:
        if n.type == "AMBIENT_OCCLUSION":
            n.inputs["Color"].default_value = (*color, 1)
            if distance is not None:
                n.inputs["Distance"].default_value = distance


def add_highlight(mat):
    """Duplicate-safe: mix a gray-green emission driven by a Value node named Highlight."""
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    src = out.inputs["Surface"].links[0].from_socket
    mix = nt.nodes.new("ShaderNodeMixShader")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.52, 0.70, 0.62, 1)
    emit.inputs["Strength"].default_value = 0.8
    val = nt.nodes.new("ShaderNodeValue")
    val.name = "Highlight"
    val.label = "Highlight"
    val.outputs[0].default_value = 0.0
    fac = nt.nodes.new("ShaderNodeMath")
    fac.operation = "MULTIPLY"
    fac.inputs[1].default_value = 0.28
    nt.links.new(val.outputs[0], fac.inputs[0])
    nt.links.new(fac.outputs[0], mix.inputs["Fac"])
    nt.links.new(src, mix.inputs[1])
    nt.links.new(emit.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return val


def snapshot(root, scan, amber, highlights, cam, fringe_obj):
    bpy.context.view_layer.update()
    fw = fringe_obj.matrix_world @ FRINGE_LOCAL
    ndc = bpy_extras_world_to_camera(cam, fw)
    return {
        "rot": [round(a, 6) for a in root.rotation_euler],
        "rot_deg": [round(math.degrees(a), 3) for a in root.rotation_euler],
        "scale": [round(s, 6) for s in root.scale],
        "scan_z": round(scan.location.z, 4),
        "scan_energy": round(scan.data.energy, 4),
        "amber_energy": round(amber.data.energy, 4),
        "hi_A": round(highlights["A"].outputs[0].default_value, 4),
        "hi_B": round(highlights["B"].outputs[0].default_value, 4),
        "hi_C": round(highlights["C"].outputs[0].default_value, 4),
        "fringe_world": [round(c, 4) for c in fw],
        "fringe_ndc": [round(c, 4) for c in ndc],
    }


def bpy_extras_world_to_camera(cam, world):
    from bpy_extras.object_utils import world_to_camera_view
    return world_to_camera_view(bpy.context.scene, cam, world)


def main():
    if not SRC_BLEND.exists():
        raise SystemExit(f"missing approved blend: {SRC_BLEND}")
    bpy.ops.wm.open_mainfile(filepath=str(SRC_BLEND))
    scene = bpy.context.scene
    cam = scene.camera

    # Seam materials only. Do not touch geometry or MaskedSpikes.
    cut = bpy.data.materials["CutSurface"]
    cav = bpy.data.materials["CavityInterior"]
    set_ao(cut, CUT_COLOR, CUT_AO)
    set_ao(cav, CAVITY_COLOR, CAVITY_AO)
    for n in cut.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            n.inputs["Roughness"].default_value = CUT_ROUGH
            n.inputs["Specular IOR Level"].default_value = 0.14
    for n in cav.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            n.inputs["Emission Color"].default_value = (*CAVITY_EMIT[0], 1)
            n.inputs["Emission Strength"].default_value = CAVITY_EMIT[1]

    ext = bpy.data.materials["ExteriorCharcoal"]
    highlights = {}
    for name in "ABC":
        mat = ext.copy()
        mat.name = f"Exterior{name}"
        bpy.data.objects[name].material_slots[0].material = mat
        highlights[name] = add_highlight(mat)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    pts = []
    for o in meshes:
        for corner in o.bound_box:
            pts.append(o.matrix_world @ Vector(corner))
    centre = sum(pts, Vector()) / len(pts)

    root = bpy.data.objects.new("HeartRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = centre
    scene.collection.objects.link(root)
    bpy.context.view_layer.update()
    for o in meshes:
        world = o.matrix_world.copy()
        o.parent = root
        o.matrix_world = world

    scan = bpy.data.lights.new("ScanLight", "AREA")
    scan.color = (0.58, 0.74, 0.66)
    scan.energy = 0.0
    scan.size = 1.4
    scan.shape = "DISK"
    scan_obj = bpy.data.objects.new("ScanLight", scan)
    scan_obj.location = centre + Vector((0.15, -0.8, 1.12))
    scan_obj.rotation_euler = (math.radians(72), 0, math.radians(10))
    scene.collection.objects.link(scan_obj)

    amber = bpy.data.lights.new("AmberAccent", "SPOT")
    amber.color = (1.0, 0.56, 0.28)
    amber.energy = 0.0
    amber.spot_size = math.radians(9)
    amber.spot_blend = 0.7
    amber.shadow_soft_size = 0.15
    amber_obj = bpy.data.objects.new("AmberAccent", amber)
    amber_obj.location = centre + Vector((0.9, -1.6, 0.05))
    track = (centre + Vector((0.05, -0.15, 0.05)) - amber_obj.location).to_track_quat("-Z", "Y")
    amber_obj.rotation_euler = track.to_euler()
    scene.collection.objects.link(amber_obj)

    # Dense linear keys so the .blend holds a complete 15 s loop.
    for i in range(0, END_FRAME + 1, 5):
        key_pose(root, scan_obj, amber_obj, highlights, i / FPS)
    for id_data in (root, scan_obj, scan_obj.data, amber_obj, amber_obj.data):
        linear_keys(id_data)
    for mat_name in ("ExteriorA", "ExteriorB", "ExteriorC"):
        linear_keys(bpy.data.materials[mat_name].node_tree)

    scene.frame_start = 0
    scene.frame_end = END_FRAME
    scene.render.fps = FPS
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))

    states = {}
    times_log = []
    for t in TIMES:
        goto(scene, t)
        # Drivers/keys already set; re-apply so subframe values are exact.
        apply_pose(root, scan_obj, amber_obj, highlights, t)
        bpy.context.view_layer.update()
        frame_id = int(round(t * FPS))
        path = OUT_DIR / f"frame_{frame_id:03d}.png"
        scene.render.filepath = str(path)
        start = time.time()
        bpy.ops.render.render(write_still=True)
        elapsed = time.time() - start
        times_log.append((t, frame_id, elapsed, str(path)))
        states[t] = snapshot(root, scan_obj, amber_obj, highlights, cam, bpy.data.objects["A"])
        print(f"[story] t={t:.2f}s frame {frame_id} {elapsed:.2f}s -> {path}")
        print(f"[story]   state {json.dumps(states[t])}")

    s0, s1 = states[0.0], states[15.0]
    print("[story] loop numeric match", s0 == s1)
    if s0 != s1:
        print("[story] t0", json.dumps(s0))
        print("[story] t15", json.dumps(s1))

    yaw_min = yaw_max = 0.0
    pitch_min = pitch_max = 0.0
    roll_min = roll_max = 0.0
    for i in range(END_FRAME + 1):
        y, p, r = drift(i / FPS)
        yaw_min, yaw_max = min(yaw_min, y), max(yaw_max, y)
        pitch_min, pitch_max = min(pitch_min, p), max(pitch_max, p)
        roll_min, roll_max = min(roll_min, r), max(roll_max, r)
    print(f"[story] yaw {math.degrees(yaw_min):.2f}..{math.degrees(yaw_max):.2f} deg "
          f"pitch {math.degrees(pitch_min):.2f}..{math.degrees(pitch_max):.2f} "
          f"roll {math.degrees(roll_min):.2f}..{math.degrees(roll_max):.2f}")
    print(f"[story] beat radial {RADIAL:.3%} long {LONGITUDINAL:.3%}  {BEATS} cycles / {DURATION}s")
    print(f"[story] render times s {json.dumps([round(t[2], 2) for t in times_log])}")
    print(f"[story] saved blend {BLEND_OUT}")


main()
