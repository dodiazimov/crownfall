class_name EnvironmentDecor
extends Node3D

# =============================================================================
# SPATIALLY CHUNKED MULTIMESH ENVIRONMENT & VEGETATION SYSTEM
# Divides the world into 5 spatial zones (NW, NE, CENTER, SW, SE)
# Provides tree variants, rock formations, and lightweight local lighting
# =============================================================================

const GameData = preload("res://scripts/GameData.gd")
const TerrainBuilder = preload("res://scripts/TerrainBuilder.gd")

const PINE_TALL_SCN = preload("res://assets/models/nature/tree_pineTallA.glb")
const PINE_DENSE_SCN = preload("res://assets/models/nature/tree_pineTallB.glb")
const PINE_DEFAULT_SCN = preload("res://assets/models/nature/tree_pineDefaultA.glb")
const OAK_SCN = preload("res://assets/models/nature/tree_oak.glb")
const ROCK_LARGE_SCN = preload("res://assets/models/nature/rock_largeA.glb")
const ROCK_TALL_SCN = preload("res://assets/models/nature/rock_tallA.glb")
const CLIFF_DIAG_SCN = preload("res://assets/models/nature/cliff_blockDiagonal_stone.glb")
const CAMPFIRE_SCN = preload("res://assets/models/nature/campfire_stones.glb")

# 5 Spatial Regions
var chunk_nodes: Dictionary = {}

func build_decorations(terrain_builder: TerrainBuilder) -> void:
	_init_chunks()
	_populate_forests(terrain_builder)
	_populate_cliffs_and_rocks(terrain_builder)
	_populate_strategic_campfires(terrain_builder)

func _init_chunks() -> void:
	var names = ["NW", "NE", "CENTER", "SW", "SE"]
	for n in names:
		var cnode = Node3D.new()
		cnode.name = "Chunk_" + n
		add_child(cnode)
		chunk_nodes[n] = cnode

func _get_chunk_name(x: float, z: float) -> String:
	if abs(x) < 14.0 and abs(z) < 14.0:
		return "CENTER"
	elif x < 0.0:
		return "NW" if z < 0.0 else "SW"
	else:
		return "NE" if z < 0.0 else "SE"

func _populate_forests(tb: TerrainBuilder) -> void:
	var pine_tall_mesh = _extract_mesh(PINE_TALL_SCN)
	var pine_dense_mesh = _extract_mesh(PINE_DENSE_SCN)
	var pine_def_mesh = _extract_mesh(PINE_DEFAULT_SCN)
	var oak_mesh = _extract_mesh(OAK_SCN)

	if not pine_tall_mesh or not oak_mesh:
		return

	var rng = RandomNumberGenerator.new()
	rng.seed = 77

	# Group transforms by chunk and tree type
	var chunk_pines: Dictionary = { "NW": [], "NE": [], "CENTER": [], "SW": [], "SE": [] }
	var chunk_oaks: Dictionary = { "NW": [], "NE": [], "CENTER": [], "SW": [], "SE": [] }

	# Strategic forest centers along mountain ridges, ravines, and vales
	var forest_clusters = [
		Vector2(-36.0, -14.0), Vector2(-38.0, 8.0), Vector2(-22.0, -20.0), Vector2(-18.0, 16.0),
		Vector2(36.0, -14.0), Vector2(38.0, 8.0), Vector2(22.0, -20.0), Vector2(18.0, 16.0),
		Vector2(-26.0, 24.0), Vector2(26.0, 24.0), Vector2(-8.0, -24.0), Vector2(8.0, -24.0),
		Vector2(-12.0, 2.0), Vector2(12.0, 2.0), Vector2(-30.0, -4.0), Vector2(30.0, -4.0)
	]

	for fc in forest_clusters:
		var count = rng.randi_range(16, 26)
		for i in range(count):
			var offset = Vector2(rng.randf_range(-7.0, 7.0), rng.randf_range(-7.0, 7.0))
			var pos_2d = fc + offset
			var wx = pos_2d.x
			var wz = pos_2d.y
			var wy = tb.get_height(wx, wz)

			if wy > 0.8 and not _is_near_castle(wx, wz) and not _is_near_road(wx, wz):
				var scale_f = rng.randf_range(1.1, 2.3)
				var rot_y = rng.randf_range(0, TAU)
				var t = Transform3D()
				t = t.scaled(Vector3(scale_f, scale_f, scale_f))
				t = t.rotated(Vector3.UP, rot_y)
				t.origin = Vector3(wx, wy, wz)

				var cname = _get_chunk_name(wx, wz)
				if rng.randf() > 0.30:
					chunk_pines[cname].append(t)
				else:
					chunk_oaks[cname].append(t)

	# Instantiate chunk MultiMeshes
	for cname in chunk_nodes:
		var parent = chunk_nodes[cname] as Node3D
		var p_transforms = chunk_pines[cname] as Array
		var o_transforms = chunk_oaks[cname] as Array

		if p_transforms.size() > 0:
			_create_multimesh(parent, "PineConifers", pine_tall_mesh, p_transforms, 0.0, 160.0)
		if o_transforms.size() > 0:
			_create_multimesh(parent, "OakGroves", oak_mesh, o_transforms, 0.0, 140.0)

func _populate_cliffs_and_rocks(tb: TerrainBuilder) -> void:
	var rock_mesh = _extract_mesh(ROCK_LARGE_SCN)
	var tall_rock_mesh = _extract_mesh(ROCK_TALL_SCN)
	var cliff_mesh = _extract_mesh(CLIFF_DIAG_SCN)

	if not rock_mesh:
		return

	var rng = RandomNumberGenerator.new()
	rng.seed = 101

	var chunk_rocks: Dictionary = { "NW": [], "NE": [], "CENTER": [], "SW": [], "SE": [] }
	var chunk_cliffs: Dictionary = { "NW": [], "NE": [], "CENTER": [], "SW": [], "SE": [] }

	# 1. Coastal Cliff Formations
	for i in range(35):
		var side = -1.0 if rng.randf() > 0.5 else 1.0
		var wx = side * rng.randf_range(4.0, 8.5)
		var wz = rng.randf_range(-26.0, 26.0)
		var wy = tb.get_height(wx, wz)

		if wy > 0.2 and wy < 3.2:
			var s = rng.randf_range(1.2, 2.4)
			var t = Transform3D()
			t = t.scaled(Vector3(s, s * 0.8, s))
			t = t.rotated(Vector3.UP, rng.randf_range(0, TAU))
			t.origin = Vector3(wx, wy, wz)
			var cname = _get_chunk_name(wx, wz)
			chunk_rocks[cname].append(t)

	# 2. Mountain Spire Outcrops
	var spire_positions = [
		Vector3(-42.0, 0, -16.0), Vector3(-44.0, 0, 10.0), Vector3(-40.0, 0, 22.0),
		Vector3(42.0, 0, -16.0), Vector3(44.0, 0, 10.0), Vector3(40.0, 0, 22.0),
		Vector3(-20.0, 0, -28.0), Vector3(20.0, 0, -28.0), Vector3(-14.0, 0, 28.0),
		Vector3(14.0, 0, 28.0)
	]
	for spos in spire_positions:
		var wy = tb.get_height(spos.x, spos.z)
		var s = rng.randf_range(1.8, 3.2)
		var t = Transform3D()
		t = t.scaled(Vector3(s, s * 1.3, s))
		t = t.rotated(Vector3.UP, rng.randf_range(0, TAU))
		t.origin = Vector3(spos.x, wy, spos.z)
		var cname = _get_chunk_name(spos.x, spos.z)
		chunk_cliffs[cname].append(t)

	for cname in chunk_nodes:
		var parent = chunk_nodes[cname] as Node3D
		var r_transforms = chunk_rocks[cname] as Array
		var c_transforms = chunk_cliffs[cname] as Array

		if r_transforms.size() > 0:
			_create_multimesh(parent, "GorgeRocks", rock_mesh, r_transforms, 0.0, 140.0)
		if c_transforms.size() > 0 and cliff_mesh:
			_create_multimesh(parent, "CliffOutcrops", cliff_mesh, c_transforms, 0.0, 180.0)

func _populate_strategic_campfires(tb: TerrainBuilder) -> void:
	var camp_sites = [
		Vector3(-22.0, 0, -6.0), Vector3(-32.0, 0, 16.0),
		Vector3(22.0, 0, -6.0), Vector3(32.0, 0, 16.0),
		Vector3(-14.0, 0, 8.0), Vector3(14.0, 0, 8.0)
	]

	for pos in camp_sites:
		var wy = tb.get_height(pos.x, pos.z)
		if wy > 0.1:
			var cname = _get_chunk_name(pos.x, pos.z)
			var parent = chunk_nodes[cname] as Node3D

			var fire = CAMPFIRE_SCN.instantiate()
			fire.position = Vector3(pos.x, wy, pos.z)
			fire.scale = Vector3(1.3, 1.3, 1.3)
			parent.add_child(fire)

			# Cheap non-shadowed local glow (distance faded)
			var light = OmniLight3D.new()
			light.light_color = Color(1.0, 0.65, 0.22)
			light.light_energy = 1.6
			light.omni_range = 7.0
			light.omni_attenuation = 1.3
			light.shadow_enabled = false
			light.distance_fade_enabled = true
			light.distance_fade_begin = 25.0
			light.distance_fade_length = 10.0
			light.position = Vector3(pos.x, wy + 0.5, pos.z)
			parent.add_child(light)

func _create_multimesh(parent: Node3D, node_name: String, mesh: Mesh, transforms: Array, lod_begin: float, lod_end: float) -> void:
	var mmi = MultiMeshInstance3D.new()
	mmi.name = node_name
	mmi.visibility_range_begin = lod_begin
	mmi.visibility_range_end = lod_end

	var mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = mesh
	mm.instance_count = transforms.size()
	for i in range(transforms.size()):
		mm.set_instance_transform(i, transforms[i])

	mmi.multimesh = mm
	parent.add_child(mmi)

func _is_near_castle(x: float, z: float) -> bool:
	for c in GameData.CASTLE_DEFS:
		var cpos = GameData.to_world_pos(c.orig, c.y)
		if Vector2(x - cpos.x, z - cpos.z).length() < 7.0:
			return true
	return false

func _is_near_road(x: float, z: float) -> bool:
	for edge in GameData.ROAD_EDGES:
		var c1 = GameData.CASTLE_DEFS[edge[0]]
		var c2 = GameData.CASTLE_DEFS[edge[1]]
		var p1 = GameData.to_world_pos(c1.orig, c1.y)
		var p2 = GameData.to_world_pos(c2.orig, c2.y)

		var v = Vector2(p2.x - p1.x, p2.z - p1.z)
		var w = Vector2(x - p1.x, z - p1.z)
		var c1_dot = w.dot(v)
		if c1_dot <= 0.0:
			continue
		var c2_dot = v.dot(v)
		if c2_dot <= c1_dot:
			continue
		var b = c1_dot / c2_dot
		var pb = Vector2(p1.x, p1.z) + b * v
		if Vector2(x - pb.x, z - pb.y).length() < 2.8:
			return true
	return false

func _extract_mesh(scn: PackedScene) -> Mesh:
	if not scn:
		return null
	var inst = scn.instantiate()
	var mesh = _find_mesh(inst)
	inst.queue_free()
	return mesh

func _find_mesh(node: Node) -> Mesh:
	if node is MeshInstance3D and node.mesh != null:
		return node.mesh
	for child in node.get_children():
		var m = _find_mesh(child)
		if m != null:
			return m
	return null

func set_quality(q: String) -> void:
	var factor = 1.0
	if q == "low":
		factor = 0.55
	elif q == "medium":
		factor = 0.8
	elif q == "high":
		factor = 1.25

	for cname in chunk_nodes:
		var parent = chunk_nodes[cname] as Node3D
		if not parent:
			continue
		for child in parent.get_children():
			if child is MultiMeshInstance3D:
				if child.name == "PineConifers":
					child.visibility_range_end = 160.0 * factor
				elif child.name == "OakGroves":
					child.visibility_range_end = 140.0 * factor
				elif child.name == "GorgeRocks":
					child.visibility_range_end = 140.0 * factor
				elif child.name == "CliffOutcrops":
					child.visibility_range_end = 180.0 * factor

