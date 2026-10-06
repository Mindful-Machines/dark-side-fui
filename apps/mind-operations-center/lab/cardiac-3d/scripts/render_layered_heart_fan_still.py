"""Render one 1280x720 EEVEE still of the fanned, sliced NIH 3D heart (3DPX-002636, A+B+C).

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_layered_heart_fan_still.py
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
BLEND_OUT = LAB / "blends" / "heart_layered_fan_still.blend"
PNG_OUT = LAB / "renders" / "stills" / "heart_layered_fan_still.png"

SAMPLES = 48
TARGET_SIZE = 2.0
DEBRIS_MAX_VERTS = 1000
GAP_FRACTION = 0.11  # of heart height along the stack axis, per gap
FAN_DEGREES = 7.0  # A and C hinge open toward the camera by this much
CAMERA_AZIMUTH = 30.0  # degrees toward patient left
CAMERA_ELEVATION = -4.0
LENS_MM = 70.0
FRAME_HEIGHT_FRACTION = 0.6
TOP_FADE = (0.55, 0.15)  # fade band below the top of A, Blender units
SPIKE_NORMAL_DOT = 0.4  # exterior faces deviating this far from neighbours
RAY_START = 0.012  # skips coincident Whole/slice surfaces (~0.9 mm)
BACKGROUND = (0.003, 0.0035, 0.0035)
EXT, INT, CAP, MASKED = range(4)


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


def mask_spikes(bm):
    """Flag thin attached spikes: exterior faces that disagree with their neighbours."""
    flagged = set()
    for f in bm.faces:
        if f.material_index != EXT:
            continue
        m = sum((g.normal for e in f.edges for g in e.link_faces if g is not f and g.material_index == EXT), Vector())
        if m.length > 0 and f.normal.dot(m.normalized()) < SPIKE_NORMAL_DOT:
            flagged.add(f)
    for _ in range(2):
        flagged |= {g for f in flagged for v in f.verts for g in v.link_faces if g.material_index == EXT}
    for f in flagged:
        f.material_index = MASKED
    return len(flagged)


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
    return mix.outputs[0]


def tissue(name, base, roughness, fade, sheen=0.0, emission=None, ao_distance=0.15):
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
    ao.inputs["Distance"].default_value = ao_distance
    nt.links.new(ao.outputs["Color"], bsdf.inputs["Base Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(fade_mix(nt, bsdf.outputs[0], fade), out.inputs["Surface"])
    return mat


def view_dir(az_deg, el_deg):
    az, el = math.radians(az_deg), math.radians(el_deg)
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


def setup_camera(scene, target, d, points):
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = LENS_MM
    cam_data.clip_start, cam_data.clip_end = 0.1, 200
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

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
    print(f"[fan] camera distance {hi:.2f}, frame x {x[0]:.3f}-{x[1]:.3f}, y {y[0]:.3f}-{y[1]:.3f}")
    return cam


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.resolution_percentage = 100

    bms = {n: load_bmesh(n) for n in ("Whole", "A", "B", "C")}
    for name, bm in bms.items():
        islands, verts, kept, left = remove_debris(bm)
        print(f"[fan] {name}: removed {islands} islands / {verts} verts; kept {kept} part(s), {left} verts")
    frame = frame_matrix(bms["Whole"])
    for bm in bms.values():
        bm.transform(frame)
        bm.normal_update()

    whole_bvh = BVHTree.FromBMesh(bms["Whole"])
    bvh = {n: BVHTree.FromBMesh(bms[n]) for n in "ABC"}
    for name in "ABC":
        for f in bms[name].faces:
            f.material_index = INT if enclosed(whole_bvh, f) else EXT

    n_ab, caps_a = find_caps(bms["A"], bvh["B"])
    _, caps_ba = find_caps(bms["B"], bvh["A"])
    n_bc, caps_bc = find_caps(bms["B"], bvh["C"])
    n_cb, caps_c = find_caps(bms["C"], bvh["B"])
    for f in caps_a + caps_ba + caps_bc + caps_c:
        f.material_index = CAP
    for name in "ABC":
        print(f"[fan] {name}: masked {mask_spikes(bms[name])} spike faces")

    axis = (n_cb - n_ab).normalized()
    heights = [v.co.dot(axis) for v in bms["Whole"].verts]
    height = max(heights) - min(heights)
    gap = GAP_FRACTION * height

    # Hinge each outer slice at the back edge of its cut so the fan opens toward the camera.
    d = view_dir(CAMERA_AZIMUTH, CAMERA_ELEVATION)
    front = (d - d.dot(axis) * axis).normalized()
    hinge = axis.cross(front).normalized()
    fan = math.radians(FAN_DEGREES)

    def placement(caps, offset, angle):
        back = min((f.calc_center_median() for f in caps), key=lambda c: c.dot(front)) + offset
        return (Matrix.Translation(back) @ Matrix.Rotation(angle, 4, hinge)
                @ Matrix.Translation(-back) @ Matrix.Translation(offset))

    matrices = {
        "A": placement(caps_a, -gap * n_ab, -fan),
        "B": Matrix.Identity(4),
        "C": placement(caps_c, -gap * n_cb, fan),
    }
    print(f"[fan] heart height {height:.3f}, gap {gap:.3f} each ({GAP_FRACTION:.0%}), fan +/-{FAN_DEGREES} deg about {tuple(round(c, 3) for c in hinge)}")
    print(f"[fan] B bottom-cut visibility {n_bc.dot(d):.2f} (angle {math.degrees(math.acos(n_bc.dot(d))):.1f} deg)")

    points = []
    for n in "ABC":
        bms[n].verts.ensure_lookup_table()
        points += [matrices[n] @ bms[n].verts[i].co for i in range(0, len(bms[n].verts), 40)]
    lo = Vector(min(p[i] for p in points) for i in range(3))
    hi = Vector(max(p[i] for p in points) for i in range(3))
    target = (lo + hi) / 2
    top = max((matrices["A"] @ v.co).z for v in bms["A"].verts)
    fade = (top - TOP_FADE[0], top - TOP_FADE[1])

    ext = tissue("ExteriorTissue", (0.025, 0.030, 0.028), 0.7, fade, sheen=0.6)
    masked = tissue("MaskedExterior", (0.008, 0.009, 0.009), 0.85, fade, sheen=0.1)
    looks = {
        "A": ((0.060, 0.022, 0.018), (0.100, 0.036, 0.028), ((0.06, 0.020, 0.016), 0.22)),
        "B": ((0.090, 0.028, 0.020), (0.130, 0.040, 0.028), ((0.07, 0.022, 0.017), 0.35)),
        "C": ((0.060, 0.022, 0.018), (0.100, 0.036, 0.028), ((0.06, 0.020, 0.016), 0.22)),
    }
    for name in "ABC":
        inner, cut, glow = looks[name]
        obj = to_object(name, bms[name], [
            ext,
            tissue(f"Interior{name}", inner, 0.8, fade, emission=glow, ao_distance=0.08),
            tissue(f"Cut{name}", cut, 0.85, fade),
            masked,
        ])
        obj.matrix_world = matrices[name]

    b_cut = sum((f.calc_center_median() for f in caps_bc), Vector()) / len(caps_bc)
    add_light("SUN", "RimGreenLeft", target + Vector((-3, 5, 3)), target, (0.60, 0.76, 0.68), 3.5, angle=math.radians(10))
    add_light("SUN", "RimGreenRight", target + Vector((4, 4, 0.5)), target, (0.55, 0.70, 0.62), 2.5, angle=math.radians(10))
    add_light("SUN", "FillLow", target + Vector((-1.0, -5, -1.5)), target, (0.80, 0.85, 0.85), 1.0, angle=math.radians(15))
    add_light("SUN", "CavityFill", target + d * 5, target, (0.85, 0.88, 0.88), 0.3, use_shadow=False)
    add_light("SPOT", "AmberAccent", b_cut + Vector((2.8, -3.5, -1.0)), b_cut + front * 0.35,
              (1.0, 0.52, 0.20), 220, spot_size=math.radians(14), spot_blend=0.7, shadow_soft_size=0.2)

    setup_camera(scene, target, d, points)

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
    print(f"[fan] render time: {time.time() - start:.1f}s -> {PNG_OUT}")


main()
