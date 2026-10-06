"""V2 15 s diagnostic-scan preview from the approved final recognition blend.

Does not overwrite V1 preview files or the storyboard blend. Geometry is
unchanged; only materials (seam colour + scan band), a heart controller,
measurement rings, and animation are added.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_motion_v2.py
  PREVIEW_PHASE=encode ...  # encode composited PNGs to the V2 MP4
"""

import array
import math
import os
import time
from pathlib import Path

import bpy
from mathutils import Vector

PHASE = os.environ.get("PREVIEW_PHASE", "render")

LAB = Path(__file__).resolve().parent.parent
SRC_BLEND = LAB / "blends" / "heart_recognition_final.blend"
BLEND_OUT = LAB / "blends" / "heart_motion_v2.blend"
PNG_DIR = LAB / "renders" / "motion-preview-v2"
MP4_OUT = LAB / "exports" / "heart_motion_preview_v2_640x360_15s.mp4"

FPS = 30
DURATION = 15.0
END_FRAME = 450
FIRST, LAST = 0, 449
SAMPLES = 16
RES = (640, 360)
BEATS = 17
RADIAL = 0.019
LONGITUDINAL = 0.010
TORSION = math.radians(0.28)
CUT_COLOR = (0.052, 0.032, 0.028)
CUT_AO = 0.04
CUT_ROUGH = 0.88
CAVITY_COLOR = (0.018, 0.013, 0.012)
CAVITY_AO = 0.05
CAVITY_EMIT = ((0.028, 0.018, 0.016), 0.28)
BAND_INNER = 0.035
BAND_OUTER = 0.095  # ~8% of framed heart height (~2.2)


def smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease_cos(u):
    return 0.5 - 0.5 * math.cos(math.pi * min(max(u, 0.0), 1.0))


def drift(t):
    """Safe-side yaw only: 0 → +7.8° → +2.8° → 0. Pitch/roll stay under 1.5°."""
    u = t / DURATION
    if u <= 0:
        yaw = 0.0
    elif u < 0.32:
        yaw = 7.8 * ease_cos(u / 0.32)
    elif u < 0.64:
        yaw = 7.8 + (2.8 - 7.8) * ease_cos((u - 0.32) / 0.32)
    else:
        yaw = 2.8 + (0.0 - 2.8) * ease_cos((u - 0.64) / 0.36)
    w = 2 * math.pi * u
    pitch = 1.15 * 0.5 * (1.0 - math.cos(w))
    roll = 0.40 * 0.5 * (1.0 - math.cos(2 * w))
    return math.radians(yaw), math.radians(pitch), math.radians(roll)


def beat_pulse(u):
    """Contraction 1 at peak; slight negative = recovery overshoot. 0 at u=0."""
    if u < 0.11:
        return smooth(u / 0.11)
    if u < 0.36:
        return 1.0 + (-0.16 - 1.0) * smooth((u - 0.11) / 0.25)
    if u < 0.48:
        return -0.16 * (1.0 - smooth((u - 0.36) / 0.12))
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
    if t < 1.20:
        env = smooth((t - 0.40) / 0.80)
    if t > 13.20:
        env = min(env, 1.0 - smooth((t - 13.20) / 1.30))
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


def set_ao(mat, color, distance=None):
    for n in mat.node_tree.nodes:
        if n.type == "AMBIENT_OCCLUSION":
            n.inputs["Color"].default_value = (*color, 1)
            if distance is not None:
                n.inputs["Distance"].default_value = distance


def add_scan_band(mat, scan_obj, color, strength=0.55, amber_lead=False):
    """Narrow gray-green (or amber-lead) response from ScanBand object Z."""
    nt = mat.node_tree
    n, link = nt.nodes.new, nt.links.new
    out = next(node for node in nt.nodes if node.type == "OUTPUT_MATERIAL")
    src = out.inputs["Surface"].links[0].from_socket
    tex = n("ShaderNodeTexCoord")
    tex.object = scan_obj
    sep = n("ShaderNodeSeparateXYZ")
    link(tex.outputs["Object"], sep.inputs[0])
    absz = n("ShaderNodeMath")
    absz.operation = "ABSOLUTE"
    link(sep.outputs["Z"], absz.inputs[0])
    band = n("ShaderNodeMapRange")
    band.interpolation_type = "SMOOTHSTEP"
    band.inputs["From Min"].default_value = BAND_INNER
    band.inputs["From Max"].default_value = BAND_OUTER
    band.inputs["To Min"].default_value = 1.0
    band.inputs["To Max"].default_value = 0.0
    link(absz.outputs[0], band.inputs["Value"])
    env = n("ShaderNodeValue")
    env.name = "ScanEnv"
    env.label = "ScanEnv"
    env.outputs[0].default_value = 0.0
    gated = n("ShaderNodeMath")
    gated.operation = "MULTIPLY"
    link(band.outputs["Result"], gated.inputs[0])
    link(env.outputs[0], gated.inputs[1])
    weight = n("ShaderNodeLayerWeight")
    weight.inputs["Blend"].default_value = 0.40
    inv = n("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    link(weight.outputs["Facing"], inv.inputs[1])
    rim = n("ShaderNodeMath")
    rim.operation = "MULTIPLY_ADD"
    rim.inputs[1].default_value = 0.70
    rim.inputs[2].default_value = 0.22
    link(inv.outputs[0], rim.inputs[0])
    fac = n("ShaderNodeMath")
    fac.operation = "MULTIPLY"
    link(gated.outputs[0], fac.inputs[0])
    link(rim.outputs[0], fac.inputs[1])
    gain = n("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = 0.42
    link(fac.outputs[0], gain.inputs[0])
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (*color, 1)
    emit.inputs["Strength"].default_value = strength
    if amber_lead:
        # Thin leading edge on the downhill side (object Z < 0 while the band travels -Z).
        lead = n("ShaderNodeMapRange")
        lead.interpolation_type = "SMOOTHSTEP"
        lead.inputs["From Min"].default_value = -0.11
        lead.inputs["From Max"].default_value = -0.045
        lead.inputs["To Min"].default_value = 0.0
        lead.inputs["To Max"].default_value = 1.0
        link(sep.outputs["Z"], lead.inputs["Value"])
        lead2 = n("ShaderNodeMapRange")
        lead2.interpolation_type = "SMOOTHSTEP"
        lead2.inputs["From Min"].default_value = -0.045
        lead2.inputs["From Max"].default_value = -0.015
        lead2.inputs["To Min"].default_value = 1.0
        lead2.inputs["To Max"].default_value = 0.0
        link(sep.outputs["Z"], lead2.inputs["Value"])
        leadm = n("ShaderNodeMath")
        leadm.operation = "MULTIPLY"
        link(lead.outputs["Result"], leadm.inputs[0])
        link(lead2.outputs["Result"], leadm.inputs[1])
        leadg = n("ShaderNodeMath")
        leadg.operation = "MULTIPLY"
        link(leadm.outputs[0], leadg.inputs[0])
        link(env.outputs[0], leadg.inputs[1])
        amber = n("ShaderNodeEmission")
        amber.inputs["Color"].default_value = (0.72, 0.48, 0.28, 1)
        amber.inputs["Strength"].default_value = 0.35
        lead_mix = n("ShaderNodeMixShader")
        leadf = n("ShaderNodeMath")
        leadf.operation = "MULTIPLY"
        leadf.inputs[1].default_value = 0.22
        link(leadg.outputs[0], leadf.inputs[0])
        link(leadf.outputs[0], lead_mix.inputs["Fac"])
        link(src, lead_mix.inputs[1])
        link(amber.outputs[0], lead_mix.inputs[2])
        src = lead_mix.outputs[0]
    mix = n("ShaderNodeMixShader")
    link(gain.outputs[0], mix.inputs["Fac"])
    link(src, mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], out.inputs["Surface"])
    return env


def ring_material():
    mat = bpy.data.materials.new("MeasRing")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.use_backface_culling = True
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new
    uv = n("ShaderNodeTexCoord")
    sep = n("ShaderNodeSeparateXYZ")
    link(uv.outputs["UV"], sep.inputs[0])
    mul = n("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 36.0
    link(sep.outputs["X"], mul.inputs[0])
    fr = n("ShaderNodeMath")
    fr.operation = "FRACT"
    link(mul.outputs[0], fr.inputs[0])
    dash = n("ShaderNodeMath")
    dash.operation = "LESS_THAN"
    dash.inputs[1].default_value = 0.62
    link(fr.outputs[0], dash.inputs[0])
    emit = n("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (0.38, 0.52, 0.46, 1)
    emit.inputs["Strength"].default_value = 0.45
    trans = n("ShaderNodeBsdfTransparent")
    mix = n("ShaderNodeMixShader")
    fac = n("ShaderNodeMath")
    fac.operation = "MULTIPLY"
    fac.inputs[1].default_value = 0.22
    link(dash.outputs[0], fac.inputs[0])
    link(fac.outputs[0], mix.inputs["Fac"])
    link(trans.outputs[0], mix.inputs[1])
    link(emit.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def make_ring(name, major, minor, loc, rot, scale_xy):
    mesh = bpy.data.meshes.new(name)
    # Build a thin torus in Python so we don't depend on ops context.
    segs, tubes = 96, 8
    verts, faces = [], []
    for i in range(segs):
        u = 2 * math.pi * i / segs
        cx, cy = math.cos(u) * major, math.sin(u) * major
        for j in range(tubes):
            v = 2 * math.pi * j / tubes
            nrm = Vector((math.cos(u) * math.cos(v), math.sin(u) * math.cos(v), math.sin(v)))
            verts.append((cx + nrm.x * minor, cy + nrm.y * minor, nrm.z * minor))
        i0 = i * tubes
        i1 = ((i + 1) % segs) * tubes
        for j in range(tubes):
            j1 = (j + 1) % tubes
            faces.append((i0 + j, i1 + j, i1 + j1, i0 + j1))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    # Simple UV along the major ring for dashes.
    mesh.uv_layers.new(name="UVMap")
    uv = mesh.uv_layers.active.data
    vi = array.array("i", [0] * len(mesh.loops))
    mesh.loops.foreach_get("vertex_index", vi)
    for li, vidx in enumerate(vi):
        u = (vidx // tubes) / segs
        v = (vidx % tubes) / tubes
        uv[li].uv = (u, v)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    obj.rotation_euler = rot
    obj.scale = (scale_xy[0], scale_xy[1], 1.0)
    obj.visible_shadow = False
    bpy.context.scene.collection.objects.link(obj)
    return obj


def apply_pose(root, spin, scan, envs, t):
    yaw, pitch, roll = drift(t)
    root.rotation_euler = (pitch, roll, yaw + torsion(t))
    root.scale = beat_scale(t)
    spin.rotation_euler = (spin.rotation_euler.x, spin.rotation_euler.y, 2 * math.pi * t / DURATION)
    scan.location.z = scan_z(t)
    env = scan_env(t)
    for node in envs:
        node.outputs[0].default_value = env


def key_pose(root, spin, scan, envs, t):
    apply_pose(root, spin, scan, envs, t)
    f = t * FPS
    root.keyframe_insert("rotation_euler", frame=f)
    root.keyframe_insert("scale", frame=f)
    spin.keyframe_insert("rotation_euler", frame=f)
    scan.keyframe_insert("location", frame=f)
    for node in envs:
        node.outputs[0].keyframe_insert("default_value", frame=f)


def build_rig():
    bpy.ops.wm.open_mainfile(filepath=str(SRC_BLEND))
    scene = bpy.context.scene

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

    scan = bpy.data.objects.new("ScanBand", None)
    scan.empty_display_type = "PLAIN_AXES"
    scan.location = Vector((centre.x, centre.y, 1.14))
    scene.collection.objects.link(scan)

    ext = bpy.data.materials["ExteriorCharcoal"]
    env_ext = add_scan_band(ext, scan, (0.42, 0.58, 0.50), strength=0.50, amber_lead=True)
    env_cut = add_scan_band(cut, scan, (0.62, 0.40, 0.26), strength=0.40, amber_lead=False)
    envs = [env_ext, env_cut]
    if "WholeShell" in bpy.data.materials:
        envs.append(add_scan_band(bpy.data.materials["WholeShell"], scan, (0.40, 0.54, 0.48), strength=0.35))

    ring_mat = ring_material()
    hold = make_ring("MeasRingHold", 0.78, 0.0055, centre + Vector((-0.04, 0.02, 0.06)),
                     (math.radians(72), math.radians(8), math.radians(-18)), (1.18, 0.88))
    spin = make_ring("MeasRingSpin", 0.92, 0.0050, centre + Vector((-0.06, -0.04, -0.02)),
                     (math.radians(102), math.radians(-6), math.radians(12)), (1.05, 0.78))
    hold.data.materials.append(ring_mat)
    spin.data.materials.append(ring_mat)
    # Rest pose stored on spin so 360° at t=15 matches t=0.
    spin.rotation_mode = "XYZ"

    for i in range(0, END_FRAME + 1, 2):
        key_pose(root, spin, scan, envs, i / FPS)
    linear_keys(root)
    linear_keys(spin)
    linear_keys(scan)
    for mat in (ext, cut, bpy.data.materials.get("WholeShell")):
        if mat:
            linear_keys(mat.node_tree)

    scene.frame_start = 0
    scene.frame_end = END_FRAME
    scene.render.fps = FPS
    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    print(f"[v2] rig saved {BLEND_OUT}")
    print(f"[v2] yaw 0..+7.8..+2.8..0; pitch 0..1.15; roll 0..0.40; "
          f"beat radial {RADIAL:.1%} long {LONGITUDINAL:.1%}")
    return scene


def render_pngs(scene):
    scene.frame_start = FIRST
    scene.frame_end = LAST
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.use_overwrite = True
    scene.render.use_file_extension = True
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(PNG_DIR / "frame_")
    print(f"[v2] render frames {FIRST}-{LAST} -> {PNG_DIR}")
    start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[v2] 3D render time {time.time() - start:.1f}s")


def encode_mp4():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.sequence_editor_create()
    first = str(PNG_DIR / f"comp_{FIRST:04d}.png")
    strip = scene.sequence_editor.sequences.new_image("preview", first, 1, 1)
    for i in range(FIRST + 1, LAST + 1):
        strip.elements.append(f"comp_{i:04d}.png")
    strip.frame_final_duration = LAST - FIRST + 1
    scene.frame_start = 1
    scene.frame_end = LAST - FIRST + 1
    scene.render.fps = FPS
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.use_sequencer = True
    scene.view_settings.view_transform = "Standard"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "NONE"
    scene.render.ffmpeg.ffmpeg_preset = "BEST"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.ffmpeg.gopsize = FPS
    scene.render.ffmpeg.video_bitrate = 5000
    scene.render.ffmpeg.maxrate = 6000
    scene.render.ffmpeg.minrate = 3000
    scene.render.ffmpeg.buffersize = 8000
    if hasattr(scene.render.ffmpeg, "pixel_format"):
        scene.render.ffmpeg.pixel_format = "YUV420P"
    MP4_OUT.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(MP4_OUT)
    print(f"[v2] encode {scene.frame_end} frames @ ~5 Mbps -> {MP4_OUT}")
    start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[v2] encode time {time.time() - start:.1f}s")


def main():
    if PHASE == "encode":
        encode_mp4()
        return
    scene = build_rig()
    render_pngs(scene)


main()
