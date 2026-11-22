"""Original Irium artwork. Run only in an isolated Blender --background --factory-startup process.

Example: blender --background --factory-startup --python scripts/render-artwork.py -- --scene all
All geometry is procedural. No imported images, user scenes, network access, or logo alterations.
"""
from __future__ import annotations

import argparse
import json
import math
import struct
import sys
import time
from pathlib import Path

import bpy
import bmesh
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "artifacts" / "transformation" / "masters"
TAU = math.tau
SCENES = ("hero", "company", "research", "engineering", "closing")


def material(name, color, metal=0.0, roughness=0.3):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = 0.18
    shader.inputs["Coat Roughness"].default_value = 0.24
    if "Anisotropic IOR Level" in shader.inputs:
        shader.inputs["Anisotropic IOR Level"].default_value = 0.22
    return mat


def mesh_object(scene, name, vertices, faces, mat, smooth=True, bevel=0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = smooth
    if bevel:
        modifier = obj.modifiers.new("Machined edge radii", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
        modifier = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        modifier.keep_sharp = True
        modifier.weight = 50
    return obj


def swept(scene, name, function, mat, width=0.42, thickness=0.18, rows=240, columns=16, start=0, end=TAU, closed=True, twist=0):
    # Parallel transport remains smooth through zero curvature; a Frenet frame can flip there.
    parameters = [start + (end - start) * i / rows for i in range(rows + 1)]
    centers = [Vector(function(t)) for t in parameters]
    tangents = [(Vector(function(t + 0.005)) - Vector(function(t - 0.005))).normalized() for t in parameters]
    reference = Vector((0, 0, 1)) if abs(tangents[0].z) < 0.9 else Vector((1, 0, 0))
    normals = [(reference - tangents[0] * reference.dot(tangents[0])).normalized()]
    for i in range(1, rows + 1):
        normal = tangents[i - 1].rotation_difference(tangents[i]) @ normals[-1]
        normals.append((normal - tangents[i] * normal.dot(tangents[i])).normalized())
    correction = math.atan2(tangents[0].dot(normals[-1].cross(normals[0])), normals[-1].dot(normals[0])) if closed else 0
    vertices = []
    for i in range(rows + (0 if closed else 1)):
        t, center, tangent = parameters[i], centers[i], tangents[i]
        normal = Quaternion(tangent, correction * i / rows) @ normals[i]
        binormal = tangent.cross(normal).normalized()
        angle = twist * t + 0.16 * math.sin(3 * t)
        wide = normal * math.cos(angle) + binormal * math.sin(angle)
        thin = -normal * math.sin(angle) + binormal * math.cos(angle)
        for j in range(columns):
            theta = TAU * j / columns
            vertices.append(tuple(center + wide * width * math.cos(theta) + thin * thickness * math.sin(theta)))
    ring_count = rows if closed else rows + 1
    faces = []
    for i in range(rows):
        for j in range(columns):
            next_i = (i + 1) % ring_count
            next_j = (j + 1) % columns
            faces.append((i * columns + j, i * columns + next_j, next_i * columns + next_j, next_i * columns + j))
    if not closed:
        faces.append(tuple(reversed(range(columns))))
        faces.append(tuple(rows * columns + j for j in range(columns)))
    return mesh_object(scene, name, vertices, faces, mat)


def line(scene, name, points, radius, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 24
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1)
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def box(scene, name, location, scale, mat, bevel=0.04):
    vertices = [(x * scale[0] / 2, y * scale[1] / 2, z * scale[2] / 2) for x, y, z in [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    obj = mesh_object(scene, name, vertices, faces, mat, False, bevel)
    obj.location = location
    return obj


def ring_plate(scene, name, z, mat, depth=0.17, rotation=0, outer=2.3, inner=0.86):
    count = 144
    vertices = []
    for height, outside in [(z - depth / 2, True), (z - depth / 2, False), (z + depth / 2, True), (z + depth / 2, False)]:
        for i in range(count):
            t = TAU * i / count
            radius = outer + 0.30 * math.cos(3 * t) if outside else inner + 0.075 * math.cos(3 * t)
            vertices.append((radius * math.cos(t + rotation), radius * math.sin(t + rotation), height))
    faces = []
    for i in range(count):
        j = (i + 1) % count
        faces.extend([(i, j, count + j, count + i), (2 * count + i, 3 * count + i, 3 * count + j, 2 * count + j), (i, 2 * count + i, 2 * count + j, j), (count + i, count + j, 3 * count + j, 3 * count + i)])
    return mesh_object(scene, name, vertices, faces, mat, False, 0.035 if depth > 0.08 else 0.008)


def make_hero(scene, mats):
    def knot(t):
        return (math.sin(t) + 2 * math.sin(2 * t), -1.10 * math.sin(3 * t), 3.12 + math.cos(t) - 2 * math.cos(2 * t))
    obj = swept(scene, "Continuous titanium ribbon", knot, mats["titanium"], width=0.52, thickness=0.205, rows=384, columns=24, twist=1)
    obj.rotation_euler.z = -0.20
    obj.data.materials.append(mats["indigo"])
    for polygon in obj.data.polygons:
        if polygon.index % 24 in (13, 14, 15, 16, 17):
            polygon.material_index = 1
    points = []
    for i in range(25, 170):
        center = Vector(knot(TAU * i / 384))
        surface = obj.data.vertices[i * 24 + 2].co
        points.append(tuple(center + (surface - center) * 1.012))
    inlay = line(scene, "Lime datum inlay", points, 0.012, mats["lime"])
    inlay.rotation_euler.z = -0.20


def make_company(scene, mats):
    for index in range(11):
        y = -2.15 + index * 0.43
        scale = 1 - abs(index - 5) * 0.025
        def arch(t, y=y, scale=scale):
            x = 2.35 * math.sin(t) * scale
            z = 0.18 + 4.9 * (max(0.0001, (math.cos(t) - 0.05) / 0.95) ** 0.85) * scale
            return (x + 0.20 * math.sin(y), y + 0.18 * math.cos(t), z)
        swept(scene, f"Folded structural rib {index + 1:02}", arch, mats["titanium"] if index % 3 != 1 else mats["indigo"], width=0.115, thickness=0.22, rows=140, columns=12, start=-1.52, end=1.52, closed=False)
    for side in (-1, 1):
        box(scene, "Precision foundation", (side * 2.32, 0, 0.13), (0.46, 5.05, 0.22), mats["indigo"], 0.055)
        line(scene, "Recessed foundation datum", [(side * 2.32, -2.43, 0.255), (side * 2.32, 2.43, 0.255)], 0.012, mats["lime"])
    for level in range(3):
        ring_plate(scene, "Suspended threefold diaphragm", 0.65 + level * 0.21, mats["titanium"], depth=0.055, outer=1.65, inner=1.3)


def make_research(scene, mats):
    # A true gyroid implicit surface, polygonized with marching tetrahedra. No external libraries.
    n = 48
    limit = 2 * math.pi
    points = []
    values = []
    for k in range(n + 1):
        z = -limit + 2 * limit * k / n
        for j in range(n + 1):
            y = -limit + 2 * limit * j / n
            for i in range(n + 1):
                x = -limit + 2 * limit * i / n
                points.append(Vector((x, y, z)))
                values.append(math.sin(x) * math.cos(y) + math.sin(y) * math.cos(z) + math.sin(z) * math.cos(x))
    stride = n + 1
    index = lambda i, j, k: k * stride * stride + j * stride + i
    tetrahedra = ((0, 5, 1, 6), (0, 1, 2, 6), (0, 2, 3, 6), (0, 3, 7, 6), (0, 7, 4, 6), (0, 4, 5, 6))
    vertices, faces, cache = [], [], {}
    def vertex(a, b):
        key = tuple(sorted((a, b)))
        if key not in cache:
            mix = values[a] / (values[a] - values[b])
            p = points[a].lerp(points[b], mix)
            cache[key] = len(vertices)
            vertices.append((p.x * 0.335, p.y * 0.335, p.z * 0.335 + 2.52))
        return cache[key]
    for k in range(n):
        for j in range(n):
            for i in range(n):
                cube = (index(i, j, k), index(i + 1, j, k), index(i + 1, j + 1, k), index(i, j + 1, k), index(i, j, k + 1), index(i + 1, j, k + 1), index(i + 1, j + 1, k + 1), index(i, j + 1, k + 1))
                for tetra in tetrahedra:
                    inside = [cube[q] for q in tetra if values[cube[q]] < 0]
                    outside = [cube[q] for q in tetra if values[cube[q]] >= 0]
                    if not inside or not outside:
                        continue
                    if len(inside) == 1:
                        faces.append(tuple(vertex(inside[0], b) for b in outside))
                    elif len(outside) == 1:
                        faces.append(tuple(reversed([vertex(outside[0], a) for a in inside])))
                    else:
                        a, b = inside
                        c, d = outside
                        ac, ad, bc, bd = vertex(a, c), vertex(a, d), vertex(b, c), vertex(b, d)
                        faces.extend(((ac, bc, bd), (ac, bd, ad)))
    lattice_material = mats["titanium"].copy()
    lattice_material.name = "Microblasted titanium lattice"
    lattice_shader = lattice_material.node_tree.nodes.get("Principled BSDF")
    lattice_shader.inputs["Roughness"].default_value = 0.52
    lattice_shader.inputs["Coat Weight"].default_value = 0.05
    obj = mesh_object(scene, "Bounded gyroid research specimen", vertices, faces, lattice_material)
    topology = bmesh.new()
    topology.from_mesh(obj.data)
    bmesh.ops.remove_doubles(topology, verts=list(topology.verts), dist=0.00001)
    bmesh.ops.dissolve_degenerate(topology, edges=list(topology.edges), dist=0.000001)
    bmesh.ops.recalc_face_normals(topology, faces=list(topology.faces))
    def field_normal(position):
        x, y, z = position.x / 0.335, position.y / 0.335, (position.z - 2.52) / 0.335
        return Vector((math.cos(x) * math.cos(y) - math.sin(z) * math.sin(x), -math.sin(x) * math.sin(y) + math.cos(y) * math.cos(z), -math.sin(y) * math.sin(z) + math.cos(z) * math.cos(x))).normalized()
    for face in topology.faces:
        if face.normal.dot(field_normal(face.calc_center_median())) < 0:
            face.normal_flip()
    topology.to_mesh(obj.data)
    topology.free()
    # Analytic gyroid normals avoid triangulation-induced ripples in metallic reflections.
    obj.data.normals_split_custom_set_from_vertices([tuple(field_normal(vertex.co)) for vertex in obj.data.vertices])
    obj.rotation_euler.z = 0.21
    solid = obj.modifiers.new("Finite membrane thickness", "SOLIDIFY")
    solid.thickness = 0.045
    solid.offset = 0
    solid.use_even_offset = True
    for i in range(3):
        t = i * TAU / 3 + 0.35
        x, y = 2.58 * math.cos(t), 2.58 * math.sin(t)
        box(scene, "Specimen calibration foot", (x, y, 0.21), (0.34, 0.34, 0.38), mats["indigo"], 0.055)
        line(scene, "Lime calibration index", [(x - 0.11, y - 0.17, 0.41), (x + 0.11, y - 0.17, 0.41)], 0.016, mats["lime"])


def make_engineering(scene, mats):
    for i, z in enumerate((0.52, 1.22, 1.94, 2.70, 3.50)):
        ring_plate(scene, f"Exploded structural layer {i + 1}", z, mats["indigo"] if i in (1, 3) else mats["titanium"], rotation=0.04 * i)
        if i == 2:
            ring_plate(scene, "Lime interface gasket", z + 0.105, mats["lime"], depth=0.025, rotation=0.04 * i, outer=2.26, inner=0.88)
    for i in range(3):
        t = TAU * i / 3 + 0.22
        x, y = 1.72 * math.cos(t), 1.72 * math.sin(t)
        line(scene, "Registration spindle", [(x, y, 0.22), (x, y, 4.04)], 0.052, mats["titanium"])
        for z in (0.36, 3.88):
            box(scene, "Machined registration collar", (x, y, z), (0.21, 0.21, 0.19), mats["indigo"], 0.04)


def make_closing(scene, mats):
    for segment in range(3):
        start = segment * TAU / 3 + 0.13
        end = (segment + 1) * TAU / 3 - 0.13
        def aperture(t):
            radius = 2.38 + 0.34 * math.cos(3 * (t - math.pi / 2))
            return (radius * math.cos(t), 0.40 * math.sin(2 * t), 2.48 + radius * math.sin(t))
        swept(scene, "Open cantilever segment", aperture, mats["titanium"] if segment != 2 else mats["indigo"], width=0.36, thickness=0.18, rows=128, columns=20, start=start, end=end, closed=False, twist=0.28)
    box(scene, "Cantilever mounting plane", (0, 0.1, 0.10), (3.5, 1.45, 0.16), mats["indigo"], 0.06)
    line(scene, "Open structure reference edge", [(0.52, -0.64, 0.20), (1.63, -0.64, 0.20)], 0.018, mats["lime"])


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(scene, name, location, target, color, power, size, size_y):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "RECTANGLE"
    data.size = size
    data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)


def configure(name, width, samples, engine):
    scene = bpy.data.scenes.new("Irium original " + name)
    bpy.context.window.scene = scene
    scene.render.engine = engine
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width * 9 / 16)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 8
    scene.render.use_file_extension = True
    if engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = samples
        scene.cycles.use_adaptive_sampling = True
        scene.cycles.adaptive_threshold = 0.025
        scene.cycles.adaptive_min_samples = 8
        scene.cycles.use_denoising = True
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
        scene.cycles.max_bounces = 6
        scene.cycles.diffuse_bounces = 2
        scene.cycles.glossy_bounces = 4
        scene.cycles.transmission_bounces = 2
        scene.cycles.use_light_tree = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.45
    world = bpy.data.worlds.new("Graphite studio")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.10, 0.13, 0.20, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.26
    mats = {
        "titanium": material("Satin titanium", (0.57, 0.61, 0.69), 0.96, 0.34),
        "indigo": material("Indigo ceramic", (0.033, 0.049, 0.11), 0.58, 0.26),
        "lime": material("Irium lime inlay", (0.47, 0.68, 0.055), 0.25, 0.29),
        "stage": material("Graphite ground", (0.009, 0.012, 0.019), 0.20, 0.39),
    }
    box(scene, "Continuous graphite stage", (0, 0, -0.20), (200, 200, 0.30), mats["stage"], 0)
    camera_data = bpy.data.cameras.new("Editorial camera")
    camera = bpy.data.objects.new("Editorial camera", camera_data)
    scene.collection.objects.link(camera)
    target = Vector((-2.40, 0, 2.45))
    camera.location = target + Vector((7.2, -14.0, 7.0))
    aim(camera, target)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 13.3 if name != "hero" else 14.4
    camera_data.lens = 75
    scene.camera = camera
    area(scene, "Large neutral key", (-3.8, -5.2, 8.4), (0, 0, 2.1), (0.88, 0.93, 1.0), 1750, 6.0, 5.0)
    area(scene, "Long frontal reflection", (1.0, -9.0, 4.6), (0, 0, 2.4), (1.0, 0.96, 0.89), 1450, 8.0, 2.7)
    area(scene, "Indigo edge softbox", (4.0, 3.8, 7.2), (0, 0, 2.4), (0.43, 0.52, 1.0), 2100, 4.0, 3.0)
    area(scene, "Overhead silver strip", (0, 1, 9), (0, 0, 1.6), (0.91, 0.96, 1.0), 1250, 3.8, 1.4)
    area(scene, "Quiet lime bounce", (-3, 3, 1.8), (0, 0, 1.5), (0.65, 0.88, 0.30), 22, 2.0, 2.0)
    return scene, mats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", choices=(*SCENES, "all"), default="all")
    parser.add_argument("--width", type=int, default=3840)
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--engine", choices=("CYCLES", "BLENDER_EEVEE"), default="CYCLES")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.width < 320 or args.width > 7680 or args.samples < 1:
        raise ValueError("Invalid bounded render settings")
    output = MASTER_ROOT / "previews" if args.preview else MASTER_ROOT
    output.mkdir(parents=True, exist_ok=True)
    names = SCENES if args.scene == "all" else (args.scene,)
    for name in names:
        if args.skip_existing and not args.preview:
            png, blend, metadata = output / (name + ".png"), output / (name + ".blend"), output / (name + ".json")
            if png.is_file() and blend.is_file() and metadata.is_file():
                with png.open("rb") as native:
                    header = native.read(24)
                record = json.loads(metadata.read_text(encoding="utf8"))
                if header[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", header[16:24]) == (args.width, round(args.width * 9 / 16)) and record.get("scene") == name:
                    print("IRIUM_RETAIN_COMPLETE " + name, flush=True)
                    continue
        begin = time.perf_counter()
        scene, mats = configure(name, args.width, args.samples, args.engine)
        globals()["make_" + name](scene, mats)
        scene.render.filepath = str(output / (name + ".png"))
        # Scene files store only project-relative render paths, never the user's absolute path.
        scene.render.filepath = "//" + name + ".png"
        if not args.preview:
            bpy.ops.wm.save_as_mainfile(filepath=str(output / (name + ".blend")), check_existing=False)
        scene.render.filepath = str(output / (name + ".png"))
        print("IRIUM_RENDER_START " + name, flush=True)
        render_begin = time.perf_counter()
        bpy.ops.render.render(write_still=True, scene=scene.name)
        scene.render.filepath = "//" + name + ".png"
        record = {"scene": name, "width": scene.render.resolution_x, "height": scene.render.resolution_y, "engine": args.engine, "samples_max": args.samples, "adaptive_threshold": scene.cycles.adaptive_threshold if args.engine == "CYCLES" else None, "adaptive_min_samples": scene.cycles.adaptive_min_samples if args.engine == "CYCLES" else None, "denoiser": "OpenImageDenoise" if args.engine == "CYCLES" else None, "setup_seconds": round(render_begin - begin, 3), "render_seconds": round(time.perf_counter() - render_begin, 3), "blender": bpy.app.version_string, "source": "scripts/render-artwork.py", "original_procedural_geometry": True}
        (output / (name + ".json")).write_text(json.dumps(record, indent=2) + "\n", encoding="utf8")
        print("IRIUM_RENDER_DONE " + json.dumps(record), flush=True)


if __name__ == "__main__":
    main()
