"""Irium Labs: The Working Model. Original offline Blender authoring.

Run with an isolated --background --factory-startup process. No user scene,
private document, third-party model, external texture, or network is read.
The evaluated authored meshes and cameras are exported for the live renderer.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "narrative-rebuild" / "masters"
SCENES = ("hero", "company", "products", "technology")


def linear(value):
    value = value / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def material(name, web_color, roughness=0.42, metalness=0.0, micro=False):
    color = tuple(linear(int(web_color[i:i+2], 16)) for i in (1, 3, 5))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metalness
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = 0.08
    shader.inputs["Coat Roughness"].default_value = 0.35
    mat["webColor"] = web_color
    mat["webRoughness"] = roughness
    mat["webMetalness"] = metalness
    if micro:
        nodes = mat.node_tree.nodes
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 145
        noise.inputs["Detail"].default_value = 2
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.085
        bump.inputs["Distance"].default_value = 0.008
        mat.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def finish(obj, mat, radius=0.06, role="body"):
    obj.data.materials.append(mat)
    obj["role"] = role
    if role in ("gate", "cover"):
        obj["motionAxis"] = [0.0, 0.0, 1.0]
        obj["motionDistance"] = 0.36 if role == "gate" else 0.48
    if radius:
        bevel = obj.modifiers.new("Soft precision edges", "BEVEL")
        bevel.width = radius
        bevel.segments = 4
        bevel.limit_method = "ANGLE"
        normal = obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
        normal.keep_sharp = True
        normal.weight = 50
    return obj


def box(name, location, dimensions, mat, radius=0.06, role="body", rotation=0, group=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler.z = rotation
    finish(obj, mat, radius, role)
    obj["motionGroup"] = group
    return obj


def curve(name, points, radius, mat=None, role="body", resolution=5):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 18
    data.bevel_depth = radius
    data.bevel_resolution = resolution
    data.use_fill_caps = True
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj["role"] = role
    if mat:
        obj.data.materials.append(mat)
    return obj


def meshify(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def carve(base, name, points, radius, ink, trim=False):
    cutter = meshify(curve(name+" cutter", points, radius, resolution=6))
    bpy.context.view_layer.objects.active = base
    # Bake the generous outer edge before the narrow cuts; later cuts must not
    # globally clamp the base bevel to a tiny radius at their intersection.
    for modifier in list(base.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    cut = base.modifiers.new(name+" recessed channel", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.solver = "EXACT"
    cut.object = cutter
    bpy.ops.object.modifier_apply(modifier=cut.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    # A slightly smaller dark lining sits inside the incision, below its lip.
    lining = [(x, y, z-radius*0.92) for x, y, z in points]
    if trim:
        minimum=[min((base.matrix_world @ vertex.co)[axis] for vertex in base.data.vertices)+0.02 for axis in (0,1)]
        maximum=[max((base.matrix_world @ vertex.co)[axis] for vertex in base.data.vertices)-0.02 for axis in (0,1)]
        lining=[(max(minimum[0],min(maximum[0],x)),max(minimum[1],min(maximum[1],y)),z) for x,y,z in lining]
    return meshify(curve(name+" ink lining", lining, radius*0.80, ink, resolution=5))


def disc(name, location, radius, depth, mat, role="body"):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, min(0.035, depth/4), role)


def tick_row(name, x, y, z, count, mat, axis="x"):
    for i in range(count):
        long = i % 4 == 0
        dx, dy = (i*0.13, 0) if axis == "x" else (0, i*0.13)
        box(name+f" {i+1:02}", (x+dx, y+dy, z), (0.025, 0.11 if long else 0.06, 0.012), mat, 0.004)


def marker(name, position, mat, rotation=0, path=None):
    obj = box(name, position, (0.52, 0.30, 0.15), mat, 0.065, "marker", rotation)
    if path:
        obj["motionPath"] = [coordinate for point in path for coordinate in point]
    return obj


def hero(m):
    base = box("Continuous authored body", (0, 0, 0.47), (6.8, 4.5, 0.84), m["ivory"], 0.20)
    # The route is one readable S, with a short alternative inquiry converging at its gate.
    path = [(-3.55,-1.30,0.91),(-2.35,-1.30,0.91),(-1.30,-0.85,0.91),(-0.85,0.34,0.91),(0.05,0.80,0.91),(1.30,0.80,0.91),(2.15,0.10,0.91),(3.55,0.10,0.91)]
    carve(base, "Primary route", path, 0.31, m["ink"],trim=True)
    carve(base, "Question joins purpose", [(-1.45,2.45,0.91),(-1.45,1.75,0.91),(-0.85,1.05,0.91),(0.05,0.80,0.91)], 0.25, m["ink"],trim=True)
    # Fine chamfers keep the cut edges readable under a broad softbox.
    edge = base.modifiers.new("Carved lip radii", "BEVEL"); edge.width=0.025; edge.segments=3
    box("Deliberate decision gate", (0.55,0.80,1.16), (0.18,0.93,0.49), m["moss"], 0.045, "gate")
    box("Gate lime index", (0.55,0.31,1.27), (0.19,0.018,0.13), m["lime"], 0.007, "gate")
    marker("Input state", (-2.62,-1.30,0.95), m["lime"], path=[(-2.62,-1.30,0.95),(-2.35,-1.30,0.95),(-1.30,-0.85,0.95),(-0.85,0.34,0.95),(0.05,0.80,0.95),(1.30,0.80,0.95),(2.15,0.10,0.95),(2.96,0.10,0.95)])
    marker("Useful output", (2.96,0.10,0.95), m["lime"])
    tick_row("Route datum", 1.90,-0.85,0.903,8,m["steel"])
    for x,y in [(-2.82,1.72),(2.82,1.72),(-2.82,-1.72),(2.82,-1.72)]:
        disc("Flush ceramic registration", (x,y,0.902),0.075,0.018,m["steel"])


def company(m):
    # Three connected disciplines, authored as integral pieces with one surrounding boundary.
    for index,(x,y,w,h) in enumerate([(-2.05,-0.45,2.40,3.80),(0.55,0.72,2.60,2.30),(2.0,-1.35,2.45,1.70)]):
        base=box(f"Independent discipline {index+1}",(x,y,0.41),(w,h,0.72),m["ivory"],0.18)
        if index==0:
            path=[(x,-2.5,0.80),(x,-1.5,0.80),(x,-0.1,0.80),(-0.83,0.72,0.80)]
        elif index==1:
            path=[(-0.84,0.72,0.80),(0.3,0.72,0.80),(1.9,0.72,0.80)]
        else:
            path=[(1.9,0.72,0.80),(2.0,-0.25,0.80),(2.0,-1.3,0.80),(3.5,-1.3,0.80)]
        carve(base,f"Connected discipline route {index+1}",path,0.25,m["ink"])
        marker(f"Owned choice {index+1}",(x,y,0.86),m["lime"],math.pi/2 if index==0 else 0)
    boundary=[(-3.55,-2.65,0.11),(-3.55,2.24,0.11),(-2.6,2.70,0.11),(2.70,2.70,0.11),(3.55,1.9,0.11),(3.55,-2.65,0.11)]
    meshify(curve("One authored boundary",boundary,0.052,m["moss"],resolution=4))
    box("Boundary ownership datum",(-3.55,-1.8,0.15),(0.16,0.55,0.14),m["lime"],0.025)
    tick_row("Independent datum",-1.1,-2.32,0.03,10,m["steel"])


def products(m):
    # An evolving path terminates at an open publication face, not an invented application screen.
    base=box("Long view product body",(0,0,0.45),(7.4,3.65,0.78),m["ivory"],0.22)
    path=[(-3.85,-0.7,0.88),(-2.85,-0.7,0.88),(-1.8,0.5,0.88),(-0.4,0.65,0.88),(0.85,-0.45,0.88),(2.6,-0.45,0.88),(3.85,-0.45,0.88)]
    carve(base,"Product improvement route",path,0.32,m["ink"],trim=True)
    for index,x in enumerate([-2.45,-0.15,2.10]):
        y=-0.20 if index==0 else 0.45 if index==1 else -0.45
        box(f"Purpose registration {index+1}",(x,y,1.10),(0.13,0.98,0.41),m["steel"] if index!=1 else m["moss"],0.035,"gate",group=index)
    marker("Continuing improvement state",(-1.3,0.65,0.92),m["lime"],path=[(-1.3,0.65,0.92),(-0.4,0.65,0.92),(0.85,-0.45,0.92),(2.6,-0.45,0.92),(3.20,-0.45,0.92)])
    # Open output collar is intentionally empty until real products are approved.
    for y in [-0.99,0.09]:
        box("Publication opening edge",(3.21,y,1.32),(0.28,0.20,1.0),m["ivory"],0.07,"cover")
    box("Open publication lintel",(3.21,-0.45,1.85),(0.28,1.28,0.20),m["ivory"],0.07,"cover")
    box("Publication lime datum",(3.37,-0.45,1.84),(0.025,0.75,0.035),m["lime"],0.01,"cover")
    tick_row("Release datum",-3.0,1.14,0.86,12,m["steel"])


def technology(m):
    # A cutaway model shows bounded experiments and explicit control, not a fictional computer.
    base=box("Bounded experiment base",(0,0,0.35),(6.9,4.25,0.6),m["ink"],0.19)
    route=[(-3.55,-0.68,0.69),(-2.3,-0.68,0.69),(-1.25,0.55,0.69),(0.3,0.55,0.69),(1.5,-0.68,0.69),(3.55,-0.68,0.69)]
    carve(base,"Observable route",route,0.29,m["steel"],trim=True)
    for index,x in enumerate([-1.9,0.0,1.9]):
        y=-0.1 if index!=1 else 0.58
        for side in [-1,1]:
            box(f"Experiment boundary {index+1} side",(x,y+side*0.75,1.25),(0.28,0.26,1.25),m["ivory"],0.055,"gate",group=index)
        box(f"Inspection bridge {index+1}",(x,y,1.98+index*0.17),(0.95,1.76,0.25),m["ivory"],0.07,"cover",group=index)
        box(f"Inspection index {index+1}",(x,y-0.90,1.99+index*0.17),(0.50,0.025,0.065),m["lime"],0.012,"cover",group=index)
    marker("Human controlled experiment",(2.75,-0.68,0.74),m["lime"])
    tick_row("Inspectability datum",-2.72,1.63,0.67,13,m["moss"])


def aim(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def area(name,location,target,power,size,size_y):
    data=bpy.data.lights.new(name,"AREA"); data.energy=power; data.shape="RECTANGLE"; data.size=size; data.size_y=size_y
    obj=bpy.data.objects.new(name,data); bpy.context.scene.collection.objects.link(obj); obj.location=location; aim(obj,target)


def configure(name,width,samples,threads):
    scene=bpy.data.scenes.new("Irium Working Model "+name); bpy.context.window.scene=scene
    scene.render.engine="CYCLES"; scene.cycles.device="CPU"; scene.cycles.samples=samples
    scene.cycles.use_adaptive_sampling=True; scene.cycles.adaptive_threshold=0.018; scene.cycles.adaptive_min_samples=12
    scene.cycles.use_denoising=True; scene.cycles.denoiser="OPENIMAGEDENOISE"; scene.cycles.max_bounces=6
    scene.cycles.diffuse_bounces=3; scene.cycles.glossy_bounces=3; scene.cycles.transmission_bounces=2
    scene.render.threads_mode="FIXED"; scene.render.threads=threads
    scene.render.resolution_x=width; scene.render.resolution_y=round(width*9/16); scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"; scene.render.image_settings.color_mode="RGBA"; scene.render.image_settings.color_depth="8"
    scene.render.film_transparent=True
    scene.view_settings.view_transform="AgX"; scene.view_settings.look="AgX - Medium High Contrast"; scene.view_settings.exposure=0.1
    world=bpy.data.worlds.new("Broad neutral studio"); scene.world=world; world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(0.8,0.85,0.82,1); world.node_tree.nodes["Background"].inputs["Strength"].default_value=0.35
    mats={"ivory":material("Porcelain ceramic","#f0f2ef",0.37,0.03,True),"ink":material("Ink composite","#1f2522",0.36,0.20,True),"steel":material("Soft steel","#a4afa5",0.42,0.65),"moss":material("Moss control","#66754d",0.44,0.08),"lime":material("Irium lime","#d8e145",0.30,0.04)}
    # Pigment compensation keeps the supplied lime recognizable under AgX's
    # bright-highlight compression; exported browser color remains #d8e145.
    lime_shader=mats["lime"].node_tree.nodes.get("Principled BSDF")
    lime_shader.inputs["Base Color"].default_value=tuple(linear(v) for v in (177,198,27))+(1,)
    lime_shader.inputs["Coat Weight"].default_value=0
    lime_shader.inputs["Roughness"].default_value=0.43
    ground=box("Stage shadow catcher",(0,0,-0.14),(200,200,0.20),mats["ivory"],0)
    ground.is_shadow_catcher=True; ground["role"]="ground"
    camera_data=bpy.data.cameras.new("Authored camera"); camera=bpy.data.objects.new("Authored camera",camera_data); scene.collection.objects.link(camera)
    scene["aimHeight"] = 0.35 if name=="company" else 0.94 if name=="technology" else 0.67
    target=Vector((0,0,scene["aimHeight"]))
    directions={"hero":(8.8,-12.2,12),"company":(6.0,-11.0,15.2),"products":(9.5,-14.5,8.4),"technology":(9.0,-13.8,10.0)}
    camera.location=target+Vector(directions[name]); aim(camera,target); camera_data.type="ORTHO"; camera_data.ortho_scale=10.8 if name!="company" else 12.6; camera_data.lens=70
    scene.camera=camera
    area("Large neutral key",(-4,-5,9),(0,0,0.4),1100,7,5)
    area("Long edge reflection",(5,1,7),(0,0,0.6),900,5,3)
    area("Quiet frontal fill",(1,-7,4),(0,0,0.6),420,7,3)
    return scene,mats


def y_up(v):
    return [round(v.x,5),round(v.z,5),round(-v.y,5)]


def export_mesh(scene,name,path):
    dependency=bpy.context.evaluated_depsgraph_get()
    objects=[]; materials={}; all_positions=[]
    for obj in scene.objects:
        if obj.type!="MESH" or obj.get("export",True) is False:
            continue
        evaluated=obj.evaluated_get(dependency); mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=dependency)
        try:
            mesh.calc_loop_triangles()
            pivot=obj.matrix_world.translation.copy(); normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
            vertices=[]; normals=[]; indices=[]; dedup={}
            for tri in mesh.loop_triangles:
                for loop_index in tri.loops:
                    vertex=mesh.vertices[mesh.loops[loop_index].vertex_index]
                    normal=normal_matrix @ mesh.corner_normals[loop_index].vector
                    normal.normalize()
                    position=obj.matrix_world @ vertex.co
                    local=y_up(position-pivot); n=y_up(normal)
                    key=tuple(local+n)
                    if key not in dedup:
                        dedup[key]=len(vertices)//3; vertices.extend(local); normals.extend(n)
                        if obj.get("role") != "ground": all_positions.append(y_up(position))
                    indices.append(dedup[key])
            mat=obj.data.materials[0]
            materials[mat.name]={"id":mat.name,"color":mat.get("webColor","#f0f2ef"),"metalness":mat.get("webMetalness",0.0),"roughness":mat.get("webRoughness",0.4)}
            item={"name":obj.name,"material":mat.name,"positions":vertices,"normals":normals,"indices":indices,"pivot":y_up(pivot),"role":obj.get("role","body")}
            if "motionAxis" in obj:
                item["motion"]={"axis":y_up(Vector(obj["motionAxis"])),"distance":obj["motionDistance"],"group":int(obj.get("motionGroup",0))}
            if "motionPath" in obj:
                flat=list(obj["motionPath"])
                item["path"]=[y_up(Vector(flat[i:i+3])) for i in range(0,len(flat),3)]
            objects.append(item)
        finally:
            evaluated.to_mesh_clear()
    camera=scene.camera
    direction=camera.rotation_euler.to_quaternion() @ Vector((0,0,-1))
    target=camera.location+direction*10
    # The true aim target (not the arbitrary point above) keeps camera framing exact.
    target=Vector((0,0,scene["aimHeight"]))
    record={"scene":name,"materials":list(materials.values()),"objects":objects,"camera":{"position":y_up(camera.location),"target":y_up(target),"orthographicScale":camera.data.ortho_scale/(16/9)},"bounds":{"min":[min(p[i] for p in all_positions) for i in range(3)],"max":[max(p[i] for p in all_positions) for i in range(3)]},"triangles":sum(len(o["indices"])//3 for o in objects),"source":"Original authored Blender geometry"}
    path.write_text(json.dumps(record,separators=(",",":"))+"\n",encoding="utf8")
    print("IRIUM_MESH_READY "+name+" "+str(path)+" triangles="+str(record["triangles"]),flush=True)


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--scene",choices=(*SCENES,"all"),default="all"); parser.add_argument("--width",type=int,default=3840); parser.add_argument("--samples",type=int,default=128); parser.add_argument("--threads",type=int,default=4); parser.add_argument("--preview",action="store_true"); parser.add_argument("--mesh-only",action="store_true")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if not 320<=args.width<=7680 or not 1<=args.samples<=1024 or not 1<=args.threads<=8: raise ValueError("Invalid bounded render settings")
    OUT.mkdir(parents=True,exist_ok=True); output=OUT/"previews" if args.preview else OUT; output.mkdir(parents=True,exist_ok=True)
    for name in SCENES if args.scene=="all" else (args.scene,):
        start=time.perf_counter(); scene,mats=configure(name,args.width,args.samples,args.threads); globals()[name](mats)
        export_mesh(scene,name,OUT/(name+"-mesh.json"))
        if args.mesh_only: continue
        scene.render.filepath="//"+name+".png"
        if not args.preview: bpy.ops.wm.save_as_mainfile(filepath=str(output/(name+".blend")),check_existing=False)
        scene.render.filepath=str(output/(name+".png")); print("IRIUM_RENDER_START "+name,flush=True)
        bpy.ops.render.render(write_still=True,scene=scene.name)
        record={"scene":name,"width":args.width,"height":round(args.width*9/16),"engine":"Cycles","samples_max":args.samples,"adaptive_threshold":0.018,"denoiser":"OpenImageDenoise","blender":bpy.app.version_string,"source":"scripts/render-narrative-artwork.py","seconds":round(time.perf_counter()-start,3),"transparent_master":True,"original_procedural_geometry":True}
        (output/(name+".json")).write_text(json.dumps(record,indent=2)+"\n",encoding="utf8")
        print("IRIUM_RENDER_DONE "+json.dumps(record),flush=True)


if __name__=="__main__": main()
