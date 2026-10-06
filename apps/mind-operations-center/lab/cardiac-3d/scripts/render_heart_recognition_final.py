"""Render one 1280x720 EEVEE still of the sliced NIH 3D heart (3DPX-002636, A+B+C)
in the registered recognition pose, with the great vessels kept and repaired:
the scan cuts the aorta and SVC flat at the top of its field of view, so simple
charcoal tubes restore the aortic arch, an SVC continuation and the pulmonary
trunk. Transparent background, no amber accent.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_recognition_final.py

Set RECOG_PROBE=1 to dump face samples to /tmp/recog_final_probe.json instead of rendering.
"""

import json
import math
import os
import time
from pathlib import Path

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

LAB = Path(__file__).resolve().parent.parent
SOURCE = LAB / "source"
BLEND_OUT = LAB / "blends" / "heart_recognition_final.blend"
PNG_OUT = LAB / "renders" / "stills" / "heart_recognition_final.png"
PROBE = os.environ.get("RECOG_PROBE") == "1"

SAMPLES = 48
TARGET_SIZE = 2.0
DEBRIS_MAX_VERTS = 1000
GAP_AB = 0.025  # fractions of heart height along each cut normal
GAP_BC = 0.025
CAMERA_AZIMUTH = 20.0  # degrees toward patient left
CAMERA_ELEVATION = 4.0
LENS_MM = 70.0
FRAME_HEIGHT_FRACTION = 0.6
SPIKE_NORMAL_DOT = 0.4
SPIKE_DILATE = 3
RAY_START = 0.012  # skips coincident Whole/slice surfaces (~0.9 mm)
SHELL_OFFSET = 0.006
SHELL_STRENGTH = 0.15
SEAM_BLEND = 0.02
WORLD = (0.003, 0.0035, 0.0035)
EXT, INT, CAP, MASKED = range(4)

# Ragged pulmonary-vein fringe on the patient-left upper back of A (registered, framed units).
CLUMP_CENTRE = Vector((0.184, 0.232, 0.646))
CLUMP_REACH = 0.12
# Flat vessel cut ends: planar patches above the ventricles that are not the A/B cut.
FLAT_DOT = 0.999
FLAT_MIN_AREA = 0.006
FLAT_MIN_Z = 0.3
FLAT_TOLERANCE = 0.002

# Repair tubes: (name, centreline points in registered framed units, start radius, end radius).
# The aorta and SVC stubs are cut at z = 1.0; tubes start inside the stubs at z = 0.82.
AORTA = [(-0.28, 0.00, 0.82), (-0.28, 0.00, 1.02), (-0.25, 0.10, 1.17), (-0.18, 0.25, 1.22),
         (-0.13, 0.39, 1.12), (-0.13, 0.42, 0.95), (-0.13, 0.42, 0.82)]
SVC = [(-0.51, 0.06, 0.82), (-0.51, 0.05, 1.00), (-0.51, 0.04, 1.10)]
# Pulmonary trunk: rises from inside the outflow tract, anterior-left of the aortic root,
# then turns toward the patient's left and back beneath the arch.
# Its root stays >= 0.14 above the A/B cut so the tube never bridges the seam.
PULMONARY = ([(-0.02, -0.22, 0.66), (0.02, -0.30, 0.80), (0.12, -0.16, 0.95), (0.22, 0.02, 0.97)], 0.100, 0.088)
BRANCH_AT = ((0.36, 0.042), (0.48, 0.036), (0.60, 0.036))  # arch fraction, radius
BRANCH_LENGTH = 0.11
TUBE_PAD = 0.008  # tubes sit just outside the stub walls they replace


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
    """Planar cut faces of bm that touch the neighbouring slice, with their centroid."""
    near = [f for f in bm.faces if other_bvh.find_nearest(f.calc_center_median(), 0.003)[0] is not None]
    n = sum((f.normal * f.calc_area() for f in near), Vector()).normalized()
    aligned = [f for f in near if f.normal.dot(n) > 0.95]
    p = sum((f.calc_center_median() * f.calc_area() for f in aligned), Vector()) / sum(f.calc_area() for f in aligned)
    caps = [f for f in bm.faces if f.normal.dot(n) > 0.95 and abs((f.calc_center_median() - p).dot(n)) < 0.003]
    return n, p, caps


def spike_faces(bm, dilate):
    flagged = set()
    for f in bm.faces:
        if f.material_index != EXT:
            continue
        m = sum((g.normal for e in f.edges for g in e.link_faces if g is not f and g.material_index == EXT), Vector())
        if m.length > 0 and f.normal.dot(m.normalized()) < SPIKE_NORMAL_DOT:
            flagged.add(f)
    for _ in range(dilate):
        flagged |= {g for f in flagged for v in f.verts for g in v.link_faces if g.material_index == EXT}
    return flagged


def mask_spikes(bm):
    flagged = spike_faces(bm, SPIKE_DILATE)
    for f in flagged:
        f.material_index = MASKED
    return len(flagged)


def connected(faces, seed):
    ids = {f.index for f in faces}
    seen, stack, comp = {seed.index}, [seed], []
    while stack:
        f = stack.pop()
        comp.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g.index in ids and g.index not in seen:
                    seen.add(g.index)
                    stack.append(g)
    return comp


def face_island(seed, seen):
    seen.add(seed.index)
    stack, island = [seed], []
    while stack:
        f = stack.pop()
        island.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g.index not in seen:
                    seen.add(g.index)
                    stack.append(g)
    return island


def boundary_loops(bm):
    bm.edges.index_update()
    seen, loops = set(), []
    for e in bm.edges:
        if not e.is_boundary or e.index in seen:
            continue
        seen.add(e.index)
        stack, loop = [e], []
        while stack:
            x = stack.pop()
            loop.append(x)
            for v in x.verts:
                for y in v.link_edges:
                    if y.is_boundary and y.index not in seen:
                        seen.add(y.index)
                        stack.append(y)
        loops.append(loop)
    return loops


def remove_clump(bm, whole_bvh):
    """Delete the spike cluster nearest CLUMP_CENTRE and fill the hole; keep only if watertight."""
    for f in bm.faces:
        f.material_index = INT if enclosed(whole_bvh, f) else EXT
    bm.faces.index_update()
    flagged = spike_faces(bm, SPIKE_DILATE)
    near = [f for f in flagged if (f.calc_center_median() - CLUMP_CENTRE).length < CLUMP_REACH]
    if not near:
        return bm, 0, []
    seed = min(near, key=lambda f: (f.calc_center_median() - CLUMP_CENTRE).length)
    comp = [f for f in connected(flagged, seed) if (f.calc_center_median() - CLUMP_CENTRE).length < CLUMP_REACH * 1.5]
    centres = [f.calc_center_median() for f in comp]
    trial = bm.copy()
    trial.faces.ensure_lookup_table()
    bmesh.ops.delete(trial, geom=[trial.faces[f.index] for f in comp], context="FACES")
    # Fragments left floating inside the hole would leave their own small boundary loops.
    trial.faces.index_update()
    seen, islands = set(), []
    for f in trial.faces:
        if f.index not in seen:
            islands.append(face_island(f, seen))
    bmesh.ops.delete(trial, geom=[f for isl in islands if len(isl) < 2000 for f in isl], context="FACES")
    # Boundary loops that touch at a vertex cannot be filled; trim those vertices until every loop is simple.
    for _ in range(20):
        pinched = [v for v in trial.verts if sum(e.is_boundary for e in v.link_edges) > 2 or not v.link_faces]
        if not pinched:
            break
        bmesh.ops.delete(trial, geom=pinched, context="VERTS")
    filled = []
    for loop in boundary_loops(trial):
        filled += bmesh.ops.contextual_create(trial, geom=loop)["faces"]
    poked = bmesh.ops.poke(trial, faces=filled)
    bmesh.ops.recalc_face_normals(trial, faces=trial.faces)
    trial.normal_update()
    for centre in poked["verts"]:
        rim = [e.other_vert(centre) for e in centre.link_edges]
        centre.co += sum((v.normal for v in rim), Vector()).normalized() * 0.012
    patch = poked["faces"]
    bmesh.ops.recalc_face_normals(trial, faces=trial.faces)
    trial.normal_update()
    if any(e.is_boundary for e in trial.edges):
        trial.free()
        print("[final] clump fill left open edges; clump kept")
        return bm, 0, []
    print(f"[final] A: clump hole filled with {len(filled)} patch(es), area {sum(f.calc_area() for f in patch):.4f}; "
          f"net faces removed {len(bm.faces) - len(trial.faces)}")
    bm.free()
    return trial, len(comp), centres


def flat_ends(bm, cut_normal):
    """Group near-perfectly planar patches above the ventricles (vessel cut ends)."""
    bm.faces.index_update()
    done, ends = set(), []
    for f in bm.faces:
        if f.index in done or f.calc_center_median().z < FLAT_MIN_Z or abs(f.normal.dot(cut_normal)) > 0.95:
            continue
        n0 = f.normal.copy()
        stack, comp = [f], []
        done.add(f.index)
        while stack:
            x = stack.pop()
            comp.append(x)
            for e in x.edges:
                for y in e.link_faces:
                    if y.index not in done and y.normal.dot(n0) > FLAT_DOT:
                        done.add(y.index)
                        stack.append(y)
        area = sum(x.calc_area() for x in comp)
        if area < FLAT_MIN_AREA:
            continue
        c = sum((x.calc_center_median() * x.calc_area() for x in comp), Vector()) / area
        if max(abs((x.calc_center_median() - c).dot(n0)) for x in comp) < FLAT_TOLERANCE:
            ends.append((comp, c, n0, area))
    return ends


def catmull(points, step=0.01):
    pts = [Vector(p) for p in points]
    pts = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1:i + 3]
        n = max(2, int((p2 - p1).length / step))
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    out.append(pts[-2])
    return out


def tube(points, r0, r1, segments=40):
    """Swept tube with a fan-capped start and a domed end; returns (bmesh, centreline, radii)."""
    path = catmull(points)
    lengths = [0.0]
    for a, b in zip(path, path[1:]):
        lengths.append(lengths[-1] + (b - a).length)
    radii = [r0 + (r1 - r0) * s / lengths[-1] for s in lengths]
    tangent = (path[-1] - path[-2]).normalized()
    for k in range(1, 9):
        d = r1 * k / 9
        path.append(path[-1] + tangent * (r1 / 9))
        radii.append(math.sqrt(max(r1 * r1 - d * d, 0.0)))
    bm = bmesh.new()
    t = (path[1] - path[0]).normalized()
    normal = t.orthogonal().normalized()
    rings = []
    for i, p in enumerate(path):
        nt = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        normal = (normal - nt * normal.dot(nt)).normalized()
        binormal = nt.cross(normal)
        rings.append([bm.verts.new(p + (normal * math.cos(a) + binormal * math.sin(a)) * radii[i])
                      for a in (2 * math.pi * j / segments for j in range(segments))])
    for ra, rb in zip(rings, rings[1:]):
        for j in range(segments):
            bm.faces.new((ra[j], ra[(j + 1) % segments], rb[(j + 1) % segments], rb[j]))
    tip = bm.verts.new(path[-1] + tangent * (r1 / 9))
    for j in range(segments):
        bm.faces.new((rings[-1][j], rings[-1][(j + 1) % segments], tip))
    base = bm.verts.new(path[0])
    for j in range(segments):
        bm.faces.new((rings[0][(j + 1) % segments], rings[0][j], base))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    return bm, path, radii


def unmask_over_tissue(eye, bms, matrices, objects, extra_trees):
    """Return spike-mask faces to exterior tissue unless the camera sees background behind them.

    The mask material is a holdout, so over tissue (or repair tubes) it would read as a hole.
    """
    trees = {n: BVHTree.FromBMesh(bms[n]) for n in "ABC"}
    inverse = {n: matrices[n].inverted() for n in "ABC"}
    for name in "ABC":
        polygons = objects[name].data.polygons
        restored = kept = 0
        for i, f in enumerate(bms[name].faces):
            if f.material_index != MASKED:
                continue
            centre = matrices[name] @ f.calc_center_median()
            ray = (centre - eye).normalized()
            start = centre + ray * 0.005
            behind = any(
                trees[n].ray_cast(inverse[n] @ start, (inverse[n].to_3x3() @ ray).normalized())[0] is not None
                for n in "ABC"
            ) or any(t.ray_cast(start, ray)[0] is not None for t in extra_trees)
            if behind:
                polygons[i].material_index = EXT
                restored += 1
            else:
                kept += 1
        print(f"[final] {name}: spike mask restored to tissue {restored}, kept against background {kept}")


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


def tissue(name, base, roughness, sheen=0.0, specular=0.3, emission=None, ao_distance=0.15):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = specular
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
    nt.links.new(bsdf.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def shell_material():
    """Transparent body; a faint gray-green rim only where the Whole turns away from the camera."""
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
    gain = n("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    gain.inputs[1].default_value = SHELL_STRENGTH
    link(edge.outputs[0], gain.inputs[0])
    glow = n("ShaderNodeEmission")
    glow.inputs["Color"].default_value = (0.42, 0.55, 0.48, 1)
    glow.inputs["Strength"].default_value = 0.7
    mix = n("ShaderNodeMixShader")
    link(gain.outputs[0], mix.inputs["Fac"])
    link(n("ShaderNodeBsdfTransparent").outputs[0], mix.inputs[1])
    link(glow.outputs[0], mix.inputs[2])
    link(mix.outputs[0], n("ShaderNodeOutputMaterial").inputs["Surface"])
    return mat


def holdout_material():
    mat = bpy.data.materials.new("MaskedSpikes")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    nt.links.new(nt.nodes.new("ShaderNodeHoldout").outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
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
    print(f"[final] camera distance {hi:.2f}, frame x {x[0]:.3f}-{x[1]:.3f}, y {y[0]:.3f}-{y[1]:.3f}")
    return cam


def smoothstep(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def near_path(p, path, radii, pad):
    return any((p - c).length < r + pad for c, r in zip(path[::3], radii[::3]))


def dump_probe(objects, tubes, path):
    rows = []
    for name, obj in objects.items():
        mw = obj.matrix_world
        for i, poly in enumerate(obj.data.polygons):
            if i % 3 and poly.material_index == EXT:
                continue
            c = mw @ poly.center
            n = (mw.to_3x3() @ poly.normal).normalized()
            rows.append([round(c.x, 3), round(c.y, 3), round(c.z, 3), round(n.x, 2), round(n.y, 2), round(n.z, 2),
                         f"{name}:{poly.material_index}"])
    for name, bm in tubes.items():
        for f in bm.faces:
            c = f.calc_center_median()
            rows.append([round(c.x, 3), round(c.y, 3), round(c.z, 3), round(f.normal.x, 2), round(f.normal.y, 2),
                         round(f.normal.z, 2), f"tube:{name}"])
    json.dump(rows, open(path, "w"))
    print(f"[final] probe wrote {len(rows)} samples to {path}")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.resolution_percentage = 100

    bms = {n: load_bmesh(n) for n in ("Whole", "A", "B", "C")}
    for name, bm in bms.items():
        islands, verts, kept, left = remove_debris(bm)
        print(f"[final] {name}: removed {islands} islands / {verts} verts; kept {kept} part(s), {left} verts")
    frame = frame_matrix(bms["Whole"])
    for bm in bms.values():
        bm.transform(frame)
        bm.normal_update()

    whole_bvh = BVHTree.FromBMesh(bms["Whole"])
    bms["A"], removed, clump_centres = remove_clump(bms["A"], whole_bvh)
    print(f"[final] A: ragged clump faces removed {removed}")

    bvh = {n: BVHTree.FromBMesh(bms[n]) for n in "ABC"}
    for name in "ABC":
        for f in bms[name].faces:
            f.material_index = INT if enclosed(whole_bvh, f) else EXT

    n_ab, p_ab, caps_a = find_caps(bms["A"], bvh["B"])
    _, _, caps_ba = find_caps(bms["B"], bvh["A"])
    _, _, caps_bc = find_caps(bms["B"], bvh["C"])
    n_cb, p_cb, caps_c = find_caps(bms["C"], bvh["B"])
    for f in caps_a + caps_ba + caps_bc + caps_c:
        f.material_index = CAP
    # Only A carries vessel stubs; B's planar-looking patches are smooth anterior wall.
    for comp, c, n0, area in flat_ends(bms["A"], n_ab):
        for f in comp:
            f.material_index = INT
        print(f"[final] A: flat end area {area:.4f} centre {tuple(round(v, 3) for v in c)} "
              f"normal {tuple(round(v, 3) for v in n0)} -> dark")
    for name in "ABC":
        print(f"[final] {name}: masked {mask_spikes(bms[name])} spike faces")

    axis = (n_cb - n_ab).normalized()
    heights = [v.co.dot(axis) for v in bms["Whole"].verts]
    height = max(heights) - min(heights)
    d = view_dir(CAMERA_AZIMUTH, CAMERA_ELEVATION)

    off_a = -GAP_AB * height * n_ab
    off_c = -GAP_BC * height * n_cb
    matrices = {"A": Matrix.Translation(off_a), "B": Matrix.Identity(4), "C": Matrix.Translation(off_c)}
    print(f"[final] heart height {height:.3f}; A/B gap {GAP_AB * height:.4f} ({GAP_AB:.1%}), "
          f"B/C gap {GAP_BC * height:.4f} ({GAP_BC:.1%}); rotations 0 deg")

    # Repair tubes ride with A (all vessel stubs belong to the top slice).
    specs = {"Aorta": (AORTA, 0.130 + TUBE_PAD, 0.110 + TUBE_PAD), "SVC": (SVC, 0.105 + TUBE_PAD, 0.100 + TUBE_PAD)}
    if PULMONARY:
        specs["PulmonaryTrunk"] = PULMONARY
    tubes, paths = {}, {}
    for name, (pts, r0, r1) in specs.items():
        tubes[name], path, radii = tube(pts, r0, r1)
        paths[name] = (path, radii)
    arch, arch_r = paths["Aorta"]
    for k, (frac, r) in enumerate(BRANCH_AT):
        i = int(frac * (len(arch) - 9))
        out = (arch[i] - (arch[0] + arch[-10]) / 2)
        out.z = max(out.z, 0.0)
        direction = (out.normalized() + Vector((0, 0, 1.5))).normalized()
        start = arch[i]
        tubes[f"Branch{k + 1}"], path, radii = tube(
            [start, start + direction * (arch_r[i] + BRANCH_LENGTH * 0.5), start + direction * (arch_r[i] + BRANCH_LENGTH)],
            r, r * 0.9)
        paths[f"Branch{k + 1}"] = (path, radii)

    # Shell: outer Whole surface stretched across each seam; drop the flat cut tops, the clump and anything
    # inside a repair tube so the rim does not draw old cut edges.
    shell = bms["Whole"]
    clump_tree = KDTree(len(clump_centres))
    for i, c in enumerate(clump_centres):
        clump_tree.insert(c, i)
    clump_tree.balance()
    doomed = []
    for f in shell.faces:
        c = f.calc_center_median()
        if enclosed(whole_bvh, f) or (f.normal.z > 0.97 and c.z > 0.95):
            doomed.append(f)
        elif clump_centres and clump_tree.find(c)[2] < 0.015:
            doomed.append(f)
        elif c.z > 0.6 and any(near_path(c, p, r, 0.02) for p, r in paths.values()):
            doomed.append(f)
    bmesh.ops.delete(shell, geom=doomed, context="FACES")
    shell.normal_update()
    for v in shell.verts:
        a = smoothstep(((v.co - p_ab).dot(-n_ab) + SEAM_BLEND) / (2 * SEAM_BLEND))
        c = smoothstep(((v.co - p_cb).dot(-n_cb) + SEAM_BLEND) / (2 * SEAM_BLEND))
        v.co += v.normal * SHELL_OFFSET + off_a * a + off_c * c
    for bm in tubes.values():
        bm.transform(matrices["A"])

    points = []
    for n in "ABC":
        bms[n].verts.ensure_lookup_table()
        points += [matrices[n] @ bms[n].verts[i].co for i in range(0, len(bms[n].verts), 40)]
    lo = Vector(min(p[i] for p in points) for i in range(3))
    hi = Vector(max(p[i] for p in points) for i in range(3))
    target = (lo + hi) / 2

    ext = tissue("ExteriorCharcoal", (0.022, 0.025, 0.023), 0.68, sheen=0.6)
    interior = tissue("CavityInterior", (0.009, 0.007, 0.007), 0.9, emission=((0.018, 0.013, 0.012), 0.2), ao_distance=0.08)
    cut = tissue("CutSurface", (0.026, 0.016, 0.014), 0.94, specular=0.1)
    masked = holdout_material()
    objects = {}
    for name in "ABC":
        obj = objects[name] = to_object(name, bms[name], [ext, interior, cut, masked])
        obj.matrix_world = matrices[name]
    for name, bm in tubes.items():
        to_object(name, bm, [ext])
    shell_obj = to_object("WholeShell", shell, [shell_material()])
    shell_obj.visible_shadow = False

    add_light("SUN", "RimGreenLeft", target + Vector((-3, 5, 3)), target, (0.60, 0.76, 0.68), 4.4, angle=math.radians(10))
    add_light("SUN", "RimGreenRight", target + Vector((4, 4, 0.5)), target, (0.55, 0.70, 0.62), 3.2, angle=math.radians(10))
    add_light("SUN", "ApexRim", target + Vector((2.5, 3, -4)), target, (0.55, 0.70, 0.62), 2.6, angle=math.radians(10))
    add_light("SUN", "FillLow", target + Vector((-1.0, -5, -1.5)), target, (0.80, 0.85, 0.85), 1.1, angle=math.radians(15))
    add_light("SUN", "KeySoft", target + Vector((-2, -4, 3)), target, (0.80, 0.86, 0.84), 0.9, angle=math.radians(20))
    add_light("SUN", "CavityFill", target + d * 5, target, (0.85, 0.88, 0.88), 0.35, use_shadow=False)

    cam = setup_camera(scene, target, d, points)
    unmask_over_tissue(cam.matrix_world.translation, bms, matrices, objects,
                       [BVHTree.FromBMesh(bm) for bm in tubes.values()])
    if PROBE:
        dump_probe(objects, tubes, "/tmp/recog_final_probe.json")
        return

    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = str(PNG_OUT)
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (*WORLD, 1)
    scene.world = world

    BLEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT))
    start = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[final] render time: {time.time() - start:.1f}s -> {PNG_OUT}")


main()
