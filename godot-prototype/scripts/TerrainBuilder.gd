class_name TerrainBuilder
extends Node3D

const GameData = preload("res://scripts/GameData.gd")

const TERRAIN_TEX = preload("res://assets/terrain_0.png")
const BRIDGE_STONE_SCN = preload("res://assets/models/nature/bridge_stone.glb")
const SHIP_SCN = preload("res://assets/models/props/ship_dark.gltf")
const ROCK_FORMATION_SCN = preload("res://assets/models/props/formationLarge_stone.gltf")
const ROCK_TALL_SCN = preload("res://assets/models/nature/rock_tallA.glb")

var terrain_mesh_instance: MeshInstance3D
var road_mesh_instance: MeshInstance3D
var bridge_parent: Node3D
var ocean_instance: MeshInstance3D
var sea_decor_parent: Node3D

const GRID_W: int = 140
const GRID_D: int = 100
const MIN_X: float = -55.0
const MAX_X: float = 55.0
const MIN_Z: float = -37.5
const MAX_Z: float = 37.5
const WATER_Y: float = -0.02

func build_environment() -> void:
	_create_dark_ocean()
	_create_terrain_mesh()
	_create_roads_and_bridges()
	_create_outer_sea_elements()

func _create_dark_ocean() -> void:
	# Vast, deep, stormy ocean plane extending seamlessly beyond terrain_0.png (360x260m)
	ocean_instance = MeshInstance3D.new()
	ocean_instance.name = "StormyOcean"

	var plane = PlaneMesh.new()
	plane.size = Vector2(360.0, 260.0)
	plane.subdivide_width = 48
	plane.subdivide_depth = 36
	ocean_instance.mesh = plane
	ocean_instance.position = Vector3(0, WATER_Y, 0)

	var mat = StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	# Exact matching dark navy-slate edge color of terrain_0.png
	mat.albedo_color = Color(0.098, 0.150, 0.207)
	mat.metallic = 0.35
	mat.roughness = 0.25

	ocean_instance.material_override = mat
	add_child(ocean_instance)

# Computes 3D height at any world (x, z) coordinate
func get_height(x: float, z: float) -> float:
	# Flatten near castle foundations to exact terrace height
	for c in GameData.CASTLE_DEFS:
		var cpos = GameData.to_world_pos(c.orig, c.y)
		var dist = Vector2(x - cpos.x, z - cpos.z).length()
		if dist < 3.2:
			return c.y
		elif dist < 4.8:
			var t = (dist - 3.2) / 1.6
			var base_h = _raw_landscape_height(x, z)
			return lerp(c.y, base_h, t)

	return _raw_landscape_height(x, z)

func _raw_landscape_height(x: float, z: float) -> float:
	var rad_x = x / 44.0
	var rad_z = z / 29.0
	var island_dist = sqrt(rad_x * rad_x + rad_z * rad_z)

	# Anything outside the island perimeter is sea level (0.0), showing the stormy ocean on terrain_0.png
	if island_dist > 1.02:
		return 0.0

	# Central promontory / hill (The Violet Crown at x=0, z=5.0)
	var vc_dist = Vector2(x - 0.0, z - 5.0).length()
	if vc_dist < 7.5:
		var vc_h = 5.0 - (vc_dist / 7.5) * 3.8
		return max(0.3, vc_h)

	# Base landmass elevation
	var base_h = 1.4
	# Northern mountain ridges
	if z < -10.0:
		var north_t = clamp((-z - 10.0) / 18.0, 0.0, 1.0)
		base_h += north_t * 1.6

	# Subtle rolling landscape topography
	base_h += sin(x * 0.25) * cos(z * 0.30) * 0.35

	# Central river gorge (smoothly depressed bed, never below sea level)
	var abs_x = abs(x)
	if abs_x < 4.2 and z > -22.0:
		var river_t = clamp(abs_x / 4.2, 0.0, 1.0)
		var bed_h = 0.35
		if z > 26.0:
			# South coastal waterfall descending into sea
			var fall_t = clamp((z - 26.0) / 4.0, 0.0, 1.0)
			bed_h = lerp(0.35, 0.0, fall_t)
		base_h = lerp(bed_h, base_h, river_t)

	# Steep coastal cliff drop-off into the sea
	if island_dist > 0.82:
		var cliff_t = clamp((island_dist - 0.82) / 0.20, 0.0, 1.0)
		return max(0.0, lerp(base_h, 0.0, cliff_t))

	return base_h

func _create_terrain_mesh() -> void:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	var dx = (MAX_X - MIN_X) / float(GRID_W)
	var dz = (MAX_Z - MIN_Z) / float(GRID_D)

	var heights: Array = []
	for iz in range(GRID_D + 1):
		var row: Array = []
		var z = MIN_Z + iz * dz
		for ix in range(GRID_W + 1):
			var x = MIN_X + ix * dx
			row.append(get_height(x, z))
		heights.append(row)

	for iz in range(GRID_D):
		var z0 = MIN_Z + iz * dz
		var z1 = z0 + dz
		for ix in range(GRID_W):
			var x0 = MIN_X + ix * dx
			var x1 = x0 + dx

			var y00 = heights[iz][ix]
			var y10 = heights[iz][ix + 1]
			var y01 = heights[iz + 1][ix]
			var y11 = heights[iz + 1][ix + 1]

			var v00 = Vector3(x0, y00, z0)
			var v10 = Vector3(x1, y10, z0)
			var v01 = Vector3(x0, y01, z1)
			var v11 = Vector3(x1, y11, z1)

			var n1 = (v10 - v00).cross(v01 - v00).normalized()
			var n2 = (v01 - v11).cross(v10 - v11).normalized()

			_add_vertex_textured(st, v00, n1)
			_add_vertex_textured(st, v10, n1)
			_add_vertex_textured(st, v01, n1)

			_add_vertex_textured(st, v10, n2)
			_add_vertex_textured(st, v11, n2)
			_add_vertex_textured(st, v01, n2)

	st.generate_normals()
	var mesh = st.commit()

	terrain_mesh_instance = MeshInstance3D.new()
	terrain_mesh_instance.name = "TexturedIslandTerrain"
	terrain_mesh_instance.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	mat.albedo_texture = TERRAIN_TEX
	mat.roughness = 0.85
	mat.metallic = 0.05
	mat.cull_mode = BaseMaterial3D.CULL_BACK
	terrain_mesh_instance.material_override = mat

	add_child(terrain_mesh_instance)

func _add_vertex_textured(st: SurfaceTool, pos: Vector3, normal: Vector3) -> void:
	# Calculate precise UV coordinate matching 2200x1500 coordinate space of terrain_0.png
	var u = clamp((pos.x - MIN_X) / (MAX_X - MIN_X), 0.0, 1.0)
	var v = clamp((pos.z - MIN_Z) / (MAX_Z - MIN_Z), 0.0, 1.0)
	st.set_uv(Vector2(u, v))
	st.set_normal(normal)
	st.add_vertex(pos)

func _create_roads_and_bridges() -> void:
	bridge_parent = Node3D.new()
	bridge_parent.name = "Bridges"
	add_child(bridge_parent)

	# 3 Real 3D Stone Military Bridges crossing the river gorge
	var bridge_locations = [
		{ "pos": Vector3(0.0, 1.1, -21.0), "rot": 0.5 * PI, "scale": Vector3(1.6, 1.3, 2.0) }, # North span
		{ "pos": Vector3(0.0, 1.7, -6.8),  "rot": 0.5 * PI, "scale": Vector3(1.8, 1.4, 2.4) }, # Central Crown Bridge
		{ "pos": Vector3(0.0, 0.8, 18.2),  "rot": 0.5 * PI, "scale": Vector3(1.5, 1.2, 2.0) }  # South causeway
	]

	for bdata in bridge_locations:
		var bridge = BRIDGE_STONE_SCN.instantiate()
		bridge.position = bdata["pos"]
		bridge.rotation.y = bdata["rot"]
		bridge.scale = bdata["scale"]
		bridge_parent.add_child(bridge)

		# Warm bridge lantern
		var lantern = OmniLight3D.new()
		lantern.light_color = Color(1.0, 0.70, 0.24)
		lantern.light_energy = 1.4
		lantern.omni_range = 7.0
		lantern.position = bdata["pos"] + Vector3(0, 1.2, 0)
		bridge_parent.add_child(lantern)

func _create_outer_sea_elements() -> void:
	sea_decor_parent = Node3D.new()
	sea_decor_parent.name = "OuterSeaAtmosphere"
	add_child(sea_decor_parent)

	# 1. 18th-Century Naval Galleon Warships in outer bay
	var ships = [
		{ "pos": Vector3(43.5, 0.0, 27.5), "rot": -0.35, "scale": Vector3(1.3, 1.3, 1.3) },
		{ "pos": Vector3(48.0, 0.0, 31.5), "rot": -0.15, "scale": Vector3(1.05, 1.05, 1.05) },
		{ "pos": Vector3(-46.0, 0.0, -28.0), "rot": 1.25, "scale": Vector3(1.15, 1.15, 1.15) }
	]

	for sdata in ships:
		var ship = SHIP_SCN.instantiate()
		ship.position = sdata["pos"]
		ship.rotation.y = sdata["rot"]
		ship.scale = sdata["scale"]
		sea_decor_parent.add_child(ship)

		var lantern = OmniLight3D.new()
		lantern.light_color = Color(1.0, 0.68, 0.22)
		lantern.light_energy = 1.8
		lantern.omni_range = 9.0
		lantern.omni_attenuation = 1.2
		lantern.position = sdata["pos"] + Vector3(0, 2.2, 0)
		sea_decor_parent.add_child(lantern)

	# 2. Real 3D Coastal Basalt Spire Formations along cliffs
	var rock_spires = [
		Vector3(-46.0, 0.0, -18.0), Vector3(-48.0, 0.0, 8.0), Vector3(-45.0, 0.0, 22.0),
		Vector3(45.0, 0.0, -16.0), Vector3(47.0, 0.0, 6.0), Vector3(44.0, 0.0, 20.0),
		Vector3(-22.0, 0.0, -32.0), Vector3(20.0, 0.0, -32.0), Vector3(-16.0, 0.0, 32.0),
		Vector3(18.0, 0.0, 32.0)
	]

	for rpos in rock_spires:
		var rock = ROCK_TALL_SCN.instantiate()
		rock.position = rpos
		rock.scale = Vector3(randf_range(1.4, 2.4), randf_range(1.6, 2.8), randf_range(1.4, 2.4))
		rock.rotation.y = randf() * TAU
		sea_decor_parent.add_child(rock)

func get_path_between(c1_id: int, c2_id: int) -> Array[Vector3]:
	var c1 = GameData.CASTLE_DEFS[c1_id]
	var c2 = GameData.CASTLE_DEFS[c2_id]
	var p1 = GameData.to_world_pos(c1.orig, c1.y)
	var p2 = GameData.to_world_pos(c2.orig, c2.y)

	var path: Array[Vector3] = []
	path.append(p1)

	# Crossing central water channel via hubs
	if (p1.x < -5.0 and p2.x > 5.0) or (p1.x > 5.0 and p2.x < -5.0):
		var bridge_mid = Vector3(0.0, 5.2, 5.0) # Violet Crown central hub
		if (p1.z > 12.0 and p2.z > 12.0):
			bridge_mid = Vector3(0.0, 2.2, 20.0) # South causeway
		elif (p1.z < -10.0 and p2.z < -10.0):
			bridge_mid = Vector3(0.0, 4.2, -20.3) # North arch

		path.append(bridge_mid)

	path.append(p2)
	return path
