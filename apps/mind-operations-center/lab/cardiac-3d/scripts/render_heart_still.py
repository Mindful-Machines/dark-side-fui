"""Render one 1280x720 EEVEE still of the NIH 3D heart (3DPX-002636).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_still.py
"""

import math
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

LAB = Path(__file__).resolve().parent.parent
SOURCE = LAB / "source" / "ALM0006_Whole_NIH3D.glb"
BLEND_OUT = LAB / "blends" / "heart_still.blend"
PNG_OUT = LAB / "renders" / "stills" / "heart_still.png"

SAMPLES = 48
DECIMATE_RATIO = 0.5
TARGET_SIZE = 2.0  # longest bounding-box edge, Blender units
CAMERA_AZIMUTH = 30.0  # degrees toward patient left from straight anterior
CAMERA_ELEVATION = 8.0
LENS_MM = 70.0


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_heart():
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    heart = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for o in [o for o in bpy.context.scene.objects if o.type != "MESH"]:
        bpy.data.objects.remove(o)
    heart.name = "Heart"
    return heart


def normalize(heart):
    # Source vertices are DICOM patient coordinates (x=left, y=posterior,
    # z=superior), which already match Blender's front view once the glTF
    # importer's Y-up conversion is undone.
    heart.matrix_world = Matrix.Rotation(math.radians(-90), 4, "X") @ heart.matrix_world
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    mesh = heart.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    corners = [Vector(c) for c in heart.bound_box]
    lo = Vector(min(c[i] for c in corners) for i in range(3))
    hi = Vector(max(c[i] for c in corners) for i in range(3))
    scale = TARGET_SIZE / max(hi - lo)
    mesh.transform(Matrix.Scale(scale, 4) @ Matrix.Translation(-(lo + hi) / 2))
    mesh.update()

    dec = heart.modifiers.new("Decimate", "DECIMATE")
    dec.ratio = DECIMATE_RATIO
    bpy.ops.object.modifier_apply(modifier=dec.name)
    bpy.ops.object.shade_smooth()
    print(f"[heart] triangles after decimate: {sum(len(p.vertices) - 2 for p in mesh.polygons)}")
    print(f"[heart] dimensions: {tuple(round(d, 3) for d in heart.dimensions)}")


def scan_material():
    mat = bpy.data.materials.new("DiagnosticTissue")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new

    out = n("ShaderNodeOutputMaterial")

    tissue = n("ShaderNodeBsdfPrincipled")
    tissue.inputs["Base Color"].default_value = (0.030, 0.026, 0.026, 1)
    tissue.inputs["Roughness"].default_value = 0.78
    tissue.inputs["Specular IOR Level"].default_value = 0.25

    facing = n("ShaderNodeLayerWeight")
    facing.inputs["Blend"].default_value = 0.35

    # Deep-red core: strongest where the surface faces the camera.
    core = n("ShaderNodeMath")
    core.operation = "SUBTRACT"
    core.inputs[0].default_value = 1.0
    link(facing.outputs["Facing"], core.inputs[1])
    core_pow = n("ShaderNodeMath")
    core_pow.operation = "POWER"
    core_pow.inputs[1].default_value = 2.5
    link(core.outputs[0], core_pow.inputs[0])
    core_gain = n("ShaderNodeMath")
    core_gain.operation = "MULTIPLY"
    core_gain.inputs[1].default_value = 0.35
    link(core_pow.outputs[0], core_gain.inputs[0])
    red = n("ShaderNodeEmission")
    red.inputs["Color"].default_value = (0.30, 0.012, 0.010, 1)
    link(core_gain.outputs[0], red.inputs["Strength"])

    # Gray-green diagnostic edge.
    edge_pow = n("ShaderNodeMath")
    edge_pow.operation = "POWER"
    edge_pow.inputs[1].default_value = 4.0
    link(facing.outputs["Facing"], edge_pow.inputs[0])
    edge_gain = n("ShaderNodeMath")
    edge_gain.operation = "MULTIPLY"
    edge_gain.inputs[1].default_value = 0.55
    link(edge_pow.outputs[0], edge_gain.inputs[0])

    # Faint horizontal scan lines in object space.
    coords = n("ShaderNodeTexCoord")
    xyz = n("ShaderNodeSeparateXYZ")
    link(coords.outputs["Object"], xyz.inputs[0])
    freq = n("ShaderNodeMath")
    freq.operation = "MULTIPLY"
    freq.inputs[1].default_value = 140.0
    link(xyz.outputs["Z"], freq.inputs[0])
    wave = n("ShaderNodeMath")
    wave.operation = "SINE"
    link(freq.outputs[0], wave.inputs[0])
    lines = n("ShaderNodeMath")
    lines.operation = "GREATER_THAN"
    lines.inputs[1].default_value = 0.96
    link(wave.outputs[0], lines.inputs[0])
    lines_gain = n("ShaderNodeMath")
    lines_gain.operation = "MULTIPLY"
    lines_gain.inputs[1].default_value = 0.06
    link(lines.outputs[0], lines_gain.inputs[0])

    green_strength = n("ShaderNodeMath")
    green_strength.operation = "ADD"
    link(edge_gain.outputs[0], green_strength.inputs[0])
    link(lines_gain.outputs[0], green_strength.inputs[1])
    green = n("ShaderNodeEmission")
    green.inputs["Color"].default_value = (0.42, 0.55, 0.48, 1)
    link(green_strength.outputs[0], green.inputs["Strength"])

    add1 = n("ShaderNodeAddShader")
    link(tissue.outputs[0], add1.inputs[0])
    link(red.outputs[0], add1.inputs[1])
    add2 = n("ShaderNodeAddShader")
    link(add1.outputs[0], add2.inputs[0])
    link(green.outputs[0], add2.inputs[1])
    link(add2.outputs[0], out.inputs["Surface"])
    return mat


def aim(obj, target=Vector((0, 0, 0))):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name, location, color, power, size):
    data = bpy.data.lights.new(name, "AREA")
    data.color = color
    data.energy = power
    data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    aim(obj)


def setup_lights():
    add_area_light("RimGreenLeft", (-3.0, 4.0, 2.5), (0.62, 0.78, 0.70), 320, 1.5)
    add_area_light("RimGreenRight", (3.5, 3.5, 0.5), (0.55, 0.70, 0.62), 200, 1.5)
    add_area_light("KeyAmber", (2.5, -4.0, 3.0), (1.0, 0.55, 0.25), 60, 2.0)
    add_area_light("FillRedLow", (-1.0, -3.0, -3.0), (0.60, 0.05, 0.03), 40, 2.5)


def setup_camera():
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = LENS_MM
    cam_data.clip_start = 0.1
    cam_data.clip_end = 100
    vfov_half = math.atan((cam_data.sensor_width * 9 / 16) / 2 / LENS_MM)
    dist = (TARGET_SIZE / 2 / 0.8) / math.tan(vfov_half)
    az, el = math.radians(CAMERA_AZIMUTH), math.radians(CAMERA_ELEVATION)
    cam = bpy.data.objects.new("Camera", cam_data)
    cam.location = (
        dist * math.sin(az) * math.cos(el),
        -dist * math.cos(az) * math.cos(el),
        dist * math.sin(el),
    )
    bpy.context.scene.collection.objects.link(cam)
    aim(cam)
    cam_data.dof.use_dof = True
    cam_data.dof.focus_distance = dist
    cam_data.dof.aperture_fstop = 4.0
    bpy.context.scene.camera = cam


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    if hasattr(scene.eevee, "use_raytracing"):
        scene.eevee.use_raytracing = False
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = str(PNG_OUT)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.004, 0.005, 0.005, 1)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing model: {SOURCE} (see ATTRIBUTION.md)")
    reset_scene()
    heart = import_heart()
    normalize(heart)
    heart.data.materials.clear()
    heart.data.materials.append(scan_material())
    setup_lights()
    setup_camera()
    setup_render()

    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    PNG_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))

    start = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[heart] render time: {time.time() - start:.1f}s -> {PNG_OUT}")


main()
