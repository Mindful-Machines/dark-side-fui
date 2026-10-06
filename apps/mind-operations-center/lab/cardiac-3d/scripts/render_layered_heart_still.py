"""Render one 1280x720 EEVEE still of the sliced NIH 3D heart (3DPX-002636, A+B+C).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_layered_heart_still.py
"""

import math
import time
from pathlib import Path

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

LAB = Path(__file__).resolve().parent.parent
SOURCE = LAB / "source"
BLEND_OUT = LAB / "blends" / "heart_layered_still.blend"
PNG_OUT = LAB / "renders" / "stills" / "heart_layered_still.png"

SAMPLES = 48
TARGET_SIZE = 2.0
DEBRIS_MAX_VERTS = 1000
GAP_FRACTION = 0.05  # of heart height along the stack axis, per gap
CAMERA_AZIMUTH = 25.0  # degrees toward patient left
PREFERRED_ELEVATION = 10.0
CAP_VISIBILITY = 0.3  # min cosine between cut-face normal and view direction
LENS_MM = 70.0
FRAME_HEIGHT_FRACTION = 0.6
TOP_FADE = (0.30, 0.05)  # fade band below the top of A, Blender units
SHELL_OFFSET = 0.005
RAY_START = 0.012  # skips coincident Whole/slice surfaces (~0.9 mm)
BACKGROUND = (0.003, 0.0035, 0.0035)
EXT, INT, CAP = range(3)


def load_bmesh(name):
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / f"ALM0006_{name}_NIH3D.glb"))
    obj = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    # Undo the glTF Y-up conversion: DICOM patient axes (x=left,
    # y=posterior, z=superior) then match Blender's front view.
    bm.transform(Matrix.Rotation(math.radians(-90), 4, "X") @ obj.matrix_world)
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    return bm


def remove_debris(bm):
    bm.verts.index_update()
    seen, doomed, islands, kept = set(), [], 0, 0
    for v in bm.verts:
        if v.index in seen:
            continue
        island, i = [v], 0
        seen.add(v.index)
        while i < len(island):
            for e in island[i].link_edges:
                w = e.other_vert(island[i])
                if w.index not in seen:
                    seen.add(w.index)
                    island.append(w)
            i += 1
        if len(island) < DEBRIS_MAX_VERTS:
            islands += 1
            doomed += island
        else:
            kept += 1
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    return islands, len(doomed), kept, len(bm.verts)


def frame_matrix(bm):
    lo = Vector(min(v.co[i] for v in bm.verts) for i in range(3))
    hi = Vector(max(v.co[i] for v in bm.verts) for i in range(3))
    return Matrix.Scale(TARGET_SIZE / max(hi - lo), 4) @ Matrix.Translation(-(lo + hi) / 2)


def enclosed(bvh, face):
    """True when rays leaving the face all hit the uncut Whole (cavity wall)."""
    n = face.normal
    c = face.calc_center_median() + n * RAY_START
    t = n.orthogonal().normalized()
    b = n.cross(t)
    for d in (n, n + t, n - 0.5 * t + 0.866 * b, n - 0.5 * t - 0.866 * b):
        if bvh.ray_cast(c, d.normalized(), 3.0)[0] is None:
            return False
    return True


def find_caps(bm, other_bvh):
    """Planar cut faces of bm that touch the neighbouring slice."""
    near = [f for f in bm.faces if other_bvh.find_nearest(f.calc_center_median(), 0.003)[0] is not None]
    n = sum((f.normal * f.calc_area() for f in near), Vector()).normalized()
    aligned = [f for f in near if f.normal.dot(n) > 0.95]
    p = sum((f.calc_center_median() * f.calc_area() for f in aligned), Vector()) / sum(f.calc_area() for f in aligned)
    caps = [f for f in bm.faces if f.normal.dot(n) > 0.95 and abs((f.calc_center_median() - p).dot(n)) < 0.003]
    return n, caps


def to_object(name, bm, materials):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    for m in materials:
        mesh.materials.append(m)
    mesh.shade_smooth()
    mesh.set_sharp_from_angle(angle=math.radians(45))
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def fade_mix(nt, surface, fade):
    """Blend a surface shader into the background colour toward the top of A."""
    pos = nt.nodes.new("ShaderNodeNewGeometry")
    xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(pos.outputs["Position"], xyz.inputs[0])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.interpolation_type = "SMOOTHSTEP"
    ramp.inputs["From Min"].default_value = fade[0]
    ramp.inputs["From Max"].default_value = fade[1]
    nt.links.new(xyz.outputs["Z"], ramp.inputs["Value"])
    bg = nt.nodes.new("ShaderNodeEmission")
    bg.inputs["Color"].default_value = (*BACKGROUND, 1)
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(ramp.outputs["Result"], mix.inputs["Fac"])
    nt.links.new(surface, mix.inputs[1])
    nt.links.new(bg.outputs[0], mix.inputs[2])
    return ramp, mix.outputs[0]


def tissue(name, base, roughness, fade, sheen=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = 0.3
    bsdf.inputs["Sheen Weight"].default_value = sheen
    bsdf.inputs["Sheen Roughness"].default_value = 0.5
    bsdf.inputs["Sheen Tint"].default_value = (0.50, 0.66, 0.58, 1)
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission[0], 1)
        bsdf.inputs["Emission Strength"].default_value = emission[1]
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Color"].default_value = (*base, 1)
    ao.inputs["Distance"].default_value = 0.15
    nt.links.new(ao.outputs["Color"], bsdf.inputs["Base Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(fade_mix(nt, bsdf.outputs[0], fade)[1], out.inputs["Surface"])
    return mat


def shell_material(fade):
    mat = bpy.data.materials.new("WholeShell")
    mat.use_nodes = True
    mat.use_backface_culling = True
    nt = mat.node_tree
    nt.nodes.clear()
    n, link = nt.nodes.new, nt.links.new
    weight = n("ShaderNodeLayerWeight")
    weight.inputs["Blend"].default_value = 0.5
    edge = n("ShaderNodeMath")
    edge.operation = "POWER"
    edge.inputs[1].default_value = 4.0
    link(weight.outputs["Facing"], edge.inputs[0])
    ramp, _ = fade_mix(nt, n("ShaderNodeEmission").outputs[0], fade)
    visible = n("ShaderNodeMath")
    visible.operation = "SUBTRACT"
    visible.inputs[0].default_value = 1.0
    link(ramp.outputs["Result"], visible.inputs[1])
    alpha = n("ShaderNodeMath")
    alpha.operation = "MULTIPLY"
    link(edge.outputs[0], alpha.inputs[0])
    link(visible.outputs[0], alpha.inputs[1])
    alpha_gain = n("ShaderNodeMath")
    alpha_gain.operation = "MULTIPLY"
    alpha_gain.inputs[1].default_value = 0.14
    link(alpha.outputs[0], alpha_gain.inputs[0])
    glow = n("ShaderNodeEmission")
    glow.inputs["Color"].default_value = (0.40, 0.52, 0.46, 1)
    glow.inputs["Strength"].default_value = 0.5
    mix = n("ShaderNodeMixShader")
    link(alpha_gain.outputs[0], mix.inputs["Fac"])
    link(n("ShaderNodeBsdfTransparent").outputs[0], mix.inputs[1])
    link(glow.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def view_dir(el_deg):
    az, el = math.radians(CAMERA_AZIMUTH), math.radians(el_deg)
    return Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))


def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_light(kind, name, location, target, color, energy, **extra):
    data = bpy.data.lights.new(name, kind)
    data.color = color
    data.energy = energy
    for k, v in extra.items():
        setattr(data, k, v)
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    aim(obj, target)
    bpy.context.scene.collection.objects.link(obj)


def setup_camera(scene, target, elevation, points):
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = LENS_MM
    cam_data.clip_start, cam_data.clip_end = 0.1, 200
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    d = view_dir(elevation)

    def ndc_bounds(dist):
        cam.location = target + d * dist
        aim(cam, target)
        bpy.context.view_layer.update()
        ndc = [world_to_camera_view(scene, cam, p) for p in points]
        return [min(c.x for c in ndc), max(c.x for c in ndc)], [min(c.y for c in ndc), max(c.y for c in ndc)]

    lo, hi = 2.0, 60.0
    for _ in range(30):
        mid = (lo + hi) / 2
        y = ndc_bounds(mid)[1]
        lo, hi = (mid, hi) if y[1] - y[0] > FRAME_HEIGHT_FRACTION else (lo, mid)
    x, y = ndc_bounds(hi)
    cam_data.shift_x = (x[0] + x[1]) / 2 - 0.5
    cam_data.shift_y = ((y[0] + y[1]) / 2 - 0.5) * 720 / 1280
    x, y = ndc_bounds(hi)
    print(f"[layered] camera distance {hi:.2f}, frame x {x[0]:.3f}-{x[1]:.3f}, y {y[0]:.3f}-{y[1]:.3f}")
    return cam


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.resolution_percentage = 100

    bms = {n: load_bmesh(n) for n in ("Whole", "A", "B", "C")}
    for name, bm in bms.items():
        islands, verts, kept, left = remove_debris(bm)
        print(f"[layered] {name}: removed {islands} islands / {verts} verts; kept {kept} part(s), {left} verts")
    frame = frame_matrix(bms["Whole"])
    for bm in bms.values():
        bm.transform(frame)
        bm.normal_update()

    whole_bvh = BVHTree.FromBMesh(bms["Whole"])
    bvh = {n: BVHTree.FromBMesh(bms[n]) for n in "ABC"}
    for name in "ABC":
        bm = bms[name]
        interior = 0
        for f in bm.faces:
            f.material_index = INT if enclosed(whole_bvh, f) else EXT
            interior += f.material_index == INT
        print(f"[layered] {name}: interior faces {interior}/{len(bm.faces)}")

    n_ab, caps_a = find_caps(bms["A"], bvh["B"])
    n_ba, caps_ba = find_caps(bms["B"], bvh["A"])
    n_bc, caps_bc = find_caps(bms["B"], bvh["C"])
    n_cb, caps_c = find_caps(bms["C"], bvh["B"])
    for f in caps_a + caps_ba + caps_bc + caps_c:
        f.material_index = CAP
    print(f"[layered] cap faces A {len(caps_a)}, B-top {len(caps_ba)}, B-bottom {len(caps_bc)}, C {len(caps_c)}")
    print(f"[layered] cut normals A->B {tuple(round(c, 3) for c in n_ab)}, C->B {tuple(round(c, 3) for c in n_cb)}")

    shell = bms["Whole"]
    bmesh.ops.delete(shell, geom=[f for f in shell.faces if enclosed(whole_bvh, f)], context="FACES")
    shell.normal_update()
    for v in shell.verts:
        v.co += v.normal * SHELL_OFFSET

    axis = (n_cb - n_ab).normalized()
    heights = [v.co.dot(axis) for v in bms["Whole"].verts]
    gap = GAP_FRACTION * (max(heights) - min(heights))
    offsets = {"A": -gap * n_ab, "B": Vector(), "C": -gap * n_cb}
    print(f"[layered] stack axis {tuple(round(c, 3) for c in axis)}, gap {gap:.3f} units each")

    elevations = range(-15, 36)
    score = {e: min(n_ab.dot(view_dir(e)), n_bc.dot(view_dir(e))) for e in elevations}
    ok = [e for e in elevations if score[e] >= CAP_VISIBILITY]
    elevation = min(ok, key=lambda e: abs(e - PREFERRED_ELEVATION)) if ok else max(score, key=score.get)
    print(f"[layered] elevation {elevation} deg, cut-face visibility {score[elevation]:.2f}")

    points = []
    for n in "ABC":
        bms[n].verts.ensure_lookup_table()
        points += [bms[n].verts[i].co + offsets[n] for i in range(0, len(bms[n].verts), 40)]
    lo = Vector(min(p[i] for p in points) for i in range(3))
    hi = Vector(max(p[i] for p in points) for i in range(3))
    target = (lo + hi) / 2
    top = max(v.co.z for v in bms["A"].verts) + offsets["A"].z
    fade = (top - TOP_FADE[0], top - TOP_FADE[1])

    ext = tissue("ExteriorTissue", (0.024, 0.028, 0.026), 0.7, fade, sheen=0.6)
    looks = {
        "A": ((0.060, 0.022, 0.018), (0.100, 0.036, 0.028), 0.15),
        "B": ((0.075, 0.022, 0.016), (0.120, 0.038, 0.027), 0.25),
        "C": ((0.060, 0.022, 0.018), (0.100, 0.036, 0.028), 0.15),
    }
    for name in "ABC":
        inner, cut, glow = looks[name]
        obj = to_object(name, bms[name], [
            ext,
            tissue(f"Interior{name}", inner, 0.8, fade, emission=((0.06, 0.012, 0.009), glow)),
            tissue(f"Cut{name}", cut, 0.85, fade),
        ])
        obj.location = offsets[name]
    shell_obj = to_object("WholeShell", shell, [shell_material(fade)])
    shell_obj.visible_shadow = False

    b_center = sum((v.co for v in bms["B"].verts), Vector()) / len(bms["B"].verts)
    d = view_dir(elevation)
    add_light("SUN", "RimGreenLeft", target + Vector((-3, 5, 3)), target, (0.60, 0.76, 0.68), 3.5, angle=math.radians(10))
    add_light("SUN", "RimGreenRight", target + Vector((4, 4, 0.5)), target, (0.55, 0.70, 0.62), 2.5, angle=math.radians(10))
    add_light("SUN", "FillLow", target + Vector((-1.0, -5, -1.5)), target, (0.80, 0.85, 0.85), 1.2, angle=math.radians(15))
    add_light("SPOT", "AmberAccent", b_center + Vector((2.8, -3.5, -1.0)), b_center + d * 0.4,
              (1.0, 0.52, 0.20), 120, spot_size=math.radians(14), spot_blend=0.7, shadow_soft_size=0.2)

    setup_camera(scene, target, elevation, points)

    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = str(PNG_OUT)
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (*BACKGROUND, 1)
    scene.world = world

    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    start = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[layered] render time: {time.time() - start:.1f}s -> {PNG_OUT}")


main()
