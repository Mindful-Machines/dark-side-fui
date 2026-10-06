"""Render neutral 2x2 model-selection sheets for the NIH 3D heart (3DPX-002636).

Run one sheet per invocation:
  Blender -b --factory-startup -P scripts/render_diagnostic_sheets.py -- orientation
  Blender -b --factory-startup -P scripts/render_diagnostic_sheets.py -- components
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

LAB = Path(__file__).resolve().parent.parent
SOURCE = LAB / "source"
STILLS = LAB / "renders" / "stills"
BLENDS = LAB / "blends"

SAMPLES = 16
TARGET_SIZE = 2.0
CELL_W, CELL_H = 4.62, 2.6  # 16:9 cells; the full frame is 2x2 cells
CELLS = [(-1, 1), (1, 1), (-1, -1), (1, -1)]  # top-left, top-right, bottom-left, bottom-right


def load_mesh(name):
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / f"ALM0006_{name}_NIH3D.glb"))
    obj = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    mesh = obj.data
    # Undo the glTF Y-up conversion so DICOM patient axes (x=left,
    # y=posterior, z=superior) line up with Blender's front view.
    mesh.transform(Matrix.Rotation(math.radians(-90), 4, "X") @ obj.matrix_world)
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)
    mesh.name = name
    return mesh


def frame_from(mesh):
    """Center/scale matrix derived from one mesh, reused for all parts."""
    co = [v.co for v in mesh.vertices]
    lo = Vector(min(c[i] for c in co) for i in range(3))
    hi = Vector(max(c[i] for c in co) for i in range(3))
    return Matrix.Scale(TARGET_SIZE / max(hi - lo), 4) @ Matrix.Translation(-(lo + hi) / 2)


def gray(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = 0.6
    return mat


def place(mesh, cell, label, spin_deg=0.0):
    cx, cz = cell[0] * CELL_W / 2, cell[1] * CELL_H / 2
    obj = bpy.data.objects.new(label, mesh)
    obj.location = (cx, 0, cz - 0.12)
    obj.rotation_euler = (0, 0, math.radians(spin_deg))
    bpy.context.scene.collection.objects.link(obj)

    text = bpy.data.curves.new(f"{label}_text", "FONT")
    text.body = label
    text.size = 0.17
    t = bpy.data.objects.new(f"{label}_label", text)
    t.location = (cx - CELL_W / 2 + 0.15, -1.5, cz + CELL_H / 2 - 0.3)
    t.rotation_euler = (math.radians(90), 0, 0)
    text.materials.append(label_mat)
    bpy.context.scene.collection.objects.link(t)
    return obj


def sun(name, location, strength):
    data = bpy.data.lights.new(name, "SUN")
    data.energy = strength
    data.angle = math.radians(8)
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = (-Vector(location)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(obj)


def setup_scene(sheet):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    if hasattr(scene.eevee, "use_raytracing"):
        scene.eevee.use_raytracing = False
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = str(STILLS / f"heart_{sheet}_sheet.png")
    scene.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.06, 0.06, 0.06, 1)
    scene.world = world

    sun("Key", (-4, -6, 5), 3.0)
    sun("Fill", (5, -4, 0), 1.0)
    sun("Back", (0, 6, 3), 1.2)

    cam_data = bpy.data.cameras.new("Camera")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CELL_W * 2
    cam = bpy.data.objects.new("Camera", cam_data)
    cam.location = (0, -10, 0)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.collection.objects.link(cam)
    scene.camera = cam


def orientation_sheet():
    whole = load_mesh("Whole")
    whole.transform(frame_from(whole))
    whole.materials.append(gray("Whole", (0.5, 0.5, 0.5)))
    # Spinning the model +90 deg about Z turns patient right toward the camera.
    views = [("FRONT  (anterior)", 0), ("RIGHT SIDE  (patient right)", 90),
             ("REAR  (posterior)", 180), ("LEFT SIDE  (patient left)", -90)]
    for cell, (label, spin) in zip(CELLS, views):
        place(whole, cell, label, spin)


def components_sheet():
    meshes = {n: load_mesh(n) for n in ("Whole", "A", "B", "C")}
    frame = frame_from(meshes["Whole"])
    tints = {"Whole": (0.50, 0.50, 0.50), "A": (0.56, 0.48, 0.46),
             "B": (0.46, 0.50, 0.57), "C": (0.48, 0.55, 0.48)}
    for cell, (name, mesh) in zip(CELLS, meshes.items()):
        mesh.transform(frame)
        mesh.materials.append(gray(name, tints[name]))
        tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
        place(mesh, cell, f"{name.upper()}  -  front view, shared frame  -  {tris:,} tris")


def main():
    sheet = sys.argv[sys.argv.index("--") + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    global label_mat
    label_mat = bpy.data.materials.new("Label")
    label_mat.use_nodes = True
    label_mat.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 1, 1, 1)
    label_mat.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.9
    {"orientation": orientation_sheet, "components": components_sheet}[sheet]()
    setup_scene(sheet)
    BLENDS.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLENDS / f"heart_{sheet}_sheet.blend"))
    bpy.ops.render.render(write_still=True)


main()
