class_name CastleBuilder
extends RefCounted

# =============================================================================
# CROWNFALL 18TH-CENTURY FORTRESS PRODUCTION KIT
# Assembles authentic, grounded, modular fortifications with PBR materials,
# LOD visibility ranges, territory rings, and foundation plinths.
# =============================================================================

const FortressMaterials = preload("res://scripts/FortressMaterials.gd")

const WALL_SCN = preload("res://assets/models/castles/wall.glb")
const WALL_BLOCK_SCN = preload("res://assets/models/castles/wallBlock.glb")
const WALL_CORNER_SCN = preload("res://assets/models/castles/wallCorner.glb")
const WALL_DOORWAY_SCN = preload("res://assets/models/castles/wallDoorwaySquare.glb")
const WALL_WINDOW_SCN = preload("res://assets/models/castles/wallWindowStone.glb")
const ROOF_GABLE_SCN = preload("res://assets/models/castles/roofGable.glb")
const ROOF_CORNER_SCN = preload("res://assets/models/castles/roofCorner.glb")
const ROOF_HIGH_SCN = preload("res://assets/models/castles/roofHigh.glb")
const ROOF_POINT_SCN = preload("res://assets/models/castles/roofPoint.glb")
const CHIMNEY_SCN = preload("res://assets/models/castles/chimney.glb")
const FENCE_SCN = preload("res://assets/models/castles/fence.glb")
const CART_SCN = preload("res://assets/models/castles/cart.glb")
const LANTERN_SCN = preload("res://assets/models/castles/lantern.glb")
const CANNON_LARGE_SCN = preload("res://assets/models/props/cannonLarge.gltf")

# LOD Visibility Thresholds
const LOD0_MAX: float = 38.0   # Full detail (cannons, carts, lanterns, chimneys)
const LOD1_MAX: float = 135.0  # Fortress silhouette (walls, towers, roofs, gate, flag)
const LOD2_MAX: float = 280.0  # Strategic overview (foundation plinth, keep mass, flag)

static func build_castle_compound(parent: Node3D, castle_type: String, owner_id: String, level: int) -> void:
	FortressMaterials.init_materials()

	for child in parent.get_children():
		if child.name.begins_with("Compound_"):
			child.queue_free()

	var root = Node3D.new()
	root.name = "Compound_" + castle_type
	parent.add_child(root)

	match castle_type:
		"main":
			_build_star_fort(root, owner_id, level)
		"elite":
			_build_citadel(root, owner_id, level)
		"archer":
			_build_ranged_redoubt(root, owner_id, level)
		"knight":
			_build_grenadier_barracks(root, owner_id, level)
		"cavalry":
			_build_cavalry_depot(root, owner_id, level)
		"gold":
			_build_treasury_mint(root, owner_id, level)
		"troop":
			_build_infantry_barracks(root, owner_id, level)
		_:
			_build_standard_keep(root, owner_id, level)

# =============================================================================
# 1. PLAYER / ENEMY CAPITAL STAR-FORTRESS (Azurehold / Dreadhold)
# =============================================================================
static func _build_star_fort(root: Node3D, owner_id: String, level: int) -> void:
	# Grounding foundation
	_add_foundation(root, 3.1, 0.22, owner_id)


	# 4 Angled Star-Bastion Towers with slate roofs
	var towers = [
		Vector3(-2.1, 0, -2.1), Vector3(2.1, 0, -2.1),
		Vector3(-2.1, 0, 2.0),  Vector3(2.1, 0, 2.0)
	]
	for tpos in towers:
		_add_bastion_tower(root, tpos, Vector3(1.3, 2.4, 1.3), owner_id)

	# Stone Curtain Walls
	_add_stone_wall(root, Vector3(0, 0, -2.1), Vector3(2.8, 1.4, 0.5), 0.0)
	_add_stone_wall(root, Vector3(-2.1, 0, 0), Vector3(0.5, 1.4, 2.8), 0.0)
	_add_stone_wall(root, Vector3(2.1, 0, 0), Vector3(0.5, 1.4, 2.8), 0.0)

	# Arched Gatehouse
	_add_gatehouse(root, Vector3(0, 0, 2.0), Vector3(1.6, 1.8, 1.5))
	_add_lantern(root, Vector3(-0.9, 1.4, 2.1))
	_add_lantern(root, Vector3(0.9, 1.4, 2.1))

	# Central Sovereign Command Palace Keep
	_add_keep_hall(root, Vector3(0, 0, -0.3), Vector3(2.0, 2.2, 1.6), owner_id)

	# 2 Heavy Artillery Cannons at front bastions pointing outward
	_add_cannon(root, Vector3(-2.1, 0.25, 2.2), 0.75 * PI)
	_add_cannon(root, Vector3(2.1, 0.25, 2.2), -0.75 * PI)

	# Courtyard supply cart (LOD0 only)
	_add_prop_lod0(root, CART_SCN, Vector3(-0.9, 0.1, 0.7), Vector3(1.1, 1.1, 1.1), 0.45)

	# High Flagpole with cloth banner
	_add_flagpole(root, Vector3(0, 3.4, -0.3), owner_id, level)

# =============================================================================
# 2. ELITE CENTRAL CITADEL (The Violet Crown)
# =============================================================================
static func _build_citadel(root: Node3D, owner_id: String, level: int) -> void:
	# 2-Tiered Stepped Grand Foundation
	_add_foundation(root, 3.4, 0.24, owner_id)
	_add_terrace(root, 2.3, 0.18)

	# 4 Monumental Spires / Bastion Towers
	var towers = [
		Vector3(-2.5, 0, -2.3), Vector3(2.5, 0, -2.3),
		Vector3(-2.5, 0, 2.0),  Vector3(2.5, 0, 2.0)
	]
	for tpos in towers:
		_add_bastion_tower(root, tpos, Vector3(1.5, 3.4, 1.5), owner_id)

	# Thick curtain walls
	_add_stone_wall(root, Vector3(0, 0, -2.3), Vector3(3.4, 1.8, 0.6), 0.0)
	_add_stone_wall(root, Vector3(-2.5, 0, 0), Vector3(0.6, 1.8, 3.2), 0.0)
	_add_stone_wall(root, Vector3(2.5, 0, 0), Vector3(0.6, 1.8, 3.2), 0.0)

	# Grand Imperial Gatehouse
	_add_gatehouse(root, Vector3(0, 0, 2.0), Vector3(2.0, 2.2, 1.8))
	_add_lantern(root, Vector3(-1.2, 1.6, 2.2))
	_add_lantern(root, Vector3(1.2, 1.6, 2.2))

	# Grand Imperial Palace (2 tiers rising 7 meters)
	_add_keep_hall(root, Vector3(0, 0.4, -0.2), Vector3(2.4, 2.6, 1.8), owner_id)
	var spire = WALL_BLOCK_SCN.instantiate()
	spire.position = Vector3(0, 3.0, -0.2)
	spire.scale = Vector3(1.2, 1.8, 1.2)
	_set_mat(spire, FortressMaterials.stone_wall)
	_set_lod(spire, 0.0, LOD1_MAX)
	root.add_child(spire)

	var s_roof = ROOF_POINT_SCN.instantiate()
	s_roof.position = Vector3(0, 4.8, -0.2)
	s_roof.scale = Vector3(1.4, 2.0, 1.4)
	_set_mat(s_roof, FortressMaterials.get_roof_mat(owner_id))
	_set_lod(s_roof, 0.0, LOD1_MAX)
	root.add_child(s_roof)

	# 4 Heavy Defense Cannons
	_add_cannon(root, Vector3(-2.5, 0.25, 2.2), 0.75 * PI)
	_add_cannon(root, Vector3(2.5, 0.25, 2.2), -0.75 * PI)
	_add_cannon(root, Vector3(-2.5, 0.25, -2.4), 0.25 * PI)
	_add_cannon(root, Vector3(2.5, 0.25, -2.4), -0.25 * PI)

	# Imperial Purple Standard on highest spire
	_add_flagpole(root, Vector3(0, 6.4, -0.2), owner_id, level)

# =============================================================================
# 3. MARKSMAN REDOUBT (Archer Watchtowers)
# =============================================================================
static func _build_ranged_redoubt(root: Node3D, owner_id: String, level: int) -> void:
	_add_foundation(root, 2.4, 0.20, owner_id)

	# Twin High Sniper Watchtowers rising 3.8m
	_add_bastion_tower(root, Vector3(-1.6, 0, -1.4), Vector3(1.2, 3.2, 1.2), owner_id)
	_add_bastion_tower(root, Vector3(1.6, 0, -1.4), Vector3(1.2, 3.2, 1.2), owner_id)

	# Low parapet archery walls
	_add_stone_wall(root, Vector3(0, 0, -1.4), Vector3(2.0, 1.1, 0.4), 0.0)
	_add_stone_wall(root, Vector3(-1.6, 0, 0.2), Vector3(0.4, 1.1, 2.0), 0.0)
	_add_stone_wall(root, Vector3(1.6, 0, 0.2), Vector3(0.4, 1.1, 2.0), 0.0)

	_add_gatehouse(root, Vector3(0, 0, 1.5), Vector3(1.4, 1.6, 1.4))
	_add_lantern(root, Vector3(-0.9, 1.3, 1.6))
	_add_keep_hall(root, Vector3(0, 0, -0.2), Vector3(1.4, 1.7, 1.2), owner_id)
	_add_flagpole(root, Vector3(1.6, 4.2, -1.4), owner_id, level)

# =============================================================================
# 4. GRENADIER BARRACKS (Heavy Fortified Garrison)
# =============================================================================
static func _build_grenadier_barracks(root: Node3D, owner_id: String, level: int) -> void:
	_add_foundation(root, 2.5, 0.20, owner_id)

	_add_bastion_tower(root, Vector3(-1.7, 0, -1.5), Vector3(1.3, 2.4, 1.3), owner_id)
	_add_bastion_tower(root, Vector3(1.7, 0, -1.5), Vector3(1.3, 2.4, 1.3), owner_id)


	# Heavy Barracks Hall
	_add_keep_hall(root, Vector3(0, 0, -0.3), Vector3(2.0, 2.0, 1.5), owner_id)

	_add_gatehouse(root, Vector3(0, 0, 1.5), Vector3(1.5, 1.6, 1.4))
	_add_lantern(root, Vector3(-0.9, 1.3, 1.6))
	_add_cannon(root, Vector3(1.5, 0.2, 1.5), -0.70 * PI)
	_add_flagpole(root, Vector3(-1.7, 3.4, -1.5), owner_id, level)

# =============================================================================
# 5. CAVALRY STABLE (Lodge, Paddock & Wagons)
# =============================================================================
static func _build_cavalry_depot(root: Node3D, owner_id: String, level: int) -> void:
	_add_foundation(root, 2.5, 0.20, owner_id)

	# Stable Lodge
	_add_keep_hall(root, Vector3(-0.9, 0, -0.7), Vector3(1.6, 1.7, 1.4), owner_id)
	_add_bastion_tower(root, Vector3(1.6, 0, -1.4), Vector3(1.2, 2.6, 1.2), owner_id)

	# Wooden Fences for Horse Paddock (LOD0/LOD1)
	var f1 = FENCE_SCN.instantiate()
	f1.position = Vector3(1.3, 0.1, 0.4)
	f1.scale = Vector3(1.4, 1.2, 1.4)
	_set_lod(f1, 0.0, LOD1_MAX)
	root.add_child(f1)

	var f2 = FENCE_SCN.instantiate()
	f2.position = Vector3(1.3, 0.1, 1.5)
	f2.rotation.y = 0.5 * PI
	f2.scale = Vector3(1.4, 1.2, 1.4)
	_set_lod(f2, 0.0, LOD1_MAX)
	root.add_child(f2)

	# Hay supply cart
	_add_prop_lod0(root, CART_SCN, Vector3(-1.1, 0.1, 0.8), Vector3(1.1, 1.1, 1.1), -0.4)

	_add_gatehouse(root, Vector3(0, 0, 1.5), Vector3(1.4, 1.5, 1.3))
	_add_lantern(root, Vector3(-0.9, 1.2, 1.6))
	_add_flagpole(root, Vector3(1.6, 3.4, -1.4), owner_id, level)

# =============================================================================
# 6. ECONOMY TREASURY MINT (Stone Vault & Gold Wagons)
# =============================================================================
static func _build_treasury_mint(root: Node3D, owner_id: String, level: int) -> void:
	_add_foundation(root, 2.4, 0.20, owner_id)

	# Heavy Stone Vault
	_add_keep_hall(root, Vector3(0, 0, -0.4), Vector3(1.8, 1.9, 1.4), owner_id)
	_add_bastion_tower(root, Vector3(-1.6, 0, -1.3), Vector3(1.2, 2.8, 1.2), owner_id)

	# Gold Transport Wagons
	_add_prop_lod0(root, CART_SCN, Vector3(1.0, 0.1, 0.7), Vector3(1.1, 1.1, 1.1), 0.55)

	_add_gatehouse(root, Vector3(0, 0, 1.4), Vector3(1.4, 1.5, 1.3))
	_add_lantern(root, Vector3(-0.9, 1.2, 1.5))
	_add_flagpole(root, Vector3(-1.6, 3.6, -1.3), owner_id, level)

# =============================================================================
# 7. INFANTRY BARRACKS (Fortified Garrison)
# =============================================================================
static func _build_infantry_barracks(root: Node3D, owner_id: String, level: int) -> void:
	_add_foundation(root, 2.5, 0.20, owner_id)

	_add_keep_hall(root, Vector3(0, 0, -0.3), Vector3(1.8, 1.8, 1.4), owner_id)
	_add_bastion_tower(root, Vector3(-1.5, 0, -1.2), Vector3(1.1, 2.3, 1.1), owner_id)
	_add_bastion_tower(root, Vector3(1.5, 0, -1.2), Vector3(1.1, 2.3, 1.1), owner_id)
	_add_stone_wall(root, Vector3(0, 0, -1.2), Vector3(1.8, 1.2, 0.4), 0.0)

	_add_gatehouse(root, Vector3(0, 0, 1.3), Vector3(1.3, 1.5, 1.2))
	_add_lantern(root, Vector3(-0.8, 1.2, 1.4))
	_add_flagpole(root, Vector3(-1.5, 3.2, -1.2), owner_id, level)

# =============================================================================
# 8. STANDARD FRONTIER KEEP
# =============================================================================
static func _build_standard_keep(root: Node3D, owner_id: String, level: int) -> void:
	_add_foundation(root, 2.1, 0.18, owner_id)

	_add_keep_hall(root, Vector3(0, 0, -0.3), Vector3(1.5, 1.7, 1.3), owner_id)
	_add_bastion_tower(root, Vector3(1.5, 0, -1.3), Vector3(1.1, 2.4, 1.1), owner_id)

	_add_gatehouse(root, Vector3(0, 0, 1.3), Vector3(1.3, 1.5, 1.3))
	_add_lantern(root, Vector3(-0.8, 1.2, 1.4))
	_add_flagpole(root, Vector3(1.5, 3.2, -1.3), owner_id, level)

# =============================================================================
# MODULAR CONSTRUCTION UTILITIES WITH LOD & PBR
# =============================================================================

# Grounding Foundation Plinth (submerged stone masonry terrace)
static func _add_foundation(root: Node3D, radius: float, height: float, _owner_id: String) -> void:
	var plinth = MeshInstance3D.new()
	var cyl = CylinderMesh.new()
	cyl.top_radius = radius
	cyl.bottom_radius = radius + 0.15
	cyl.height = height
	cyl.radial_segments = 24
	plinth.mesh = cyl
	plinth.position = Vector3(0, -0.04, 0)
	plinth.material_override = FortressMaterials.stone_foundation
	_set_lod(plinth, 0.0, LOD2_MAX)
	root.add_child(plinth)

	# Courtyard Cobblestone / Dirt Base
	var court = MeshInstance3D.new()
	var disc = CylinderMesh.new()
	disc.top_radius = radius - 0.06
	disc.bottom_radius = radius - 0.06
	disc.height = 0.02
	disc.radial_segments = 24
	court.mesh = disc
	court.position = Vector3(0, height * 0.5 - 0.02, 0)
	court.material_override = FortressMaterials.courtyard_dirt
	_set_lod(court, 0.0, LOD1_MAX)
	root.add_child(court)

# Secondary Terrace for Multi-Tier Citadel
static func _add_terrace(root: Node3D, radius: float, height: float) -> void:
	var t = MeshInstance3D.new()
	var cyl = CylinderMesh.new()
	cyl.top_radius = radius
	cyl.bottom_radius = radius + 0.15
	cyl.height = height
	cyl.radial_segments = 20
	t.mesh = cyl
	t.position = Vector3(0, 0.20, 0)
	t.material_override = FortressMaterials.stone_foundation
	_set_lod(t, 0.0, LOD1_MAX)
	root.add_child(t)


# Solid Masonry Bastion Tower (LOD0 & LOD1)
static func _add_bastion_tower(root: Node3D, pos: Vector3, sc: Vector3, owner_id: String) -> void:
	var tower = WALL_BLOCK_SCN.instantiate()
	tower.position = pos
	tower.scale = sc
	_set_mat(tower, FortressMaterials.stone_wall)
	_set_lod(tower, 0.0, LOD1_MAX)
	root.add_child(tower)

	var roof = ROOF_POINT_SCN.instantiate()
	roof.position = pos + Vector3(0, sc.y, 0)
	roof.scale = Vector3(sc.x * 1.15, sc.x * 1.15, sc.z * 1.15)
	_set_mat(roof, FortressMaterials.get_roof_mat(owner_id))
	_set_lod(roof, 0.0, LOD1_MAX)
	root.add_child(roof)

# Solid Stone Curtain Wall
static func _add_stone_wall(root: Node3D, pos: Vector3, sc: Vector3, rot_y: float) -> void:
	var w = WALL_BLOCK_SCN.instantiate()
	w.position = pos
	w.scale = sc
	w.rotation.y = rot_y
	_set_mat(w, FortressMaterials.stone_wall)
	_set_lod(w, 0.0, LOD1_MAX)
	root.add_child(w)

# Fortified Gatehouse
static func _add_gatehouse(root: Node3D, pos: Vector3, sc: Vector3) -> void:
	var g = WALL_DOORWAY_SCN.instantiate()
	g.position = pos
	g.scale = sc
	_set_mat(g, FortressMaterials.stone_wall)
	_set_lod(g, 0.0, LOD1_MAX)
	root.add_child(g)

# Central Keep Palace Hall
static func _add_keep_hall(root: Node3D, pos: Vector3, sc: Vector3, owner_id: String) -> void:
	var house = WALL_BLOCK_SCN.instantiate()
	house.position = pos
	house.scale = sc
	_set_mat(house, FortressMaterials.stone_wall)
	_set_lod(house, 0.0, LOD2_MAX)
	root.add_child(house)

	var roof = ROOF_HIGH_SCN.instantiate()
	roof.position = pos + Vector3(0, sc.y, 0)
	roof.scale = Vector3(sc.x * 1.08, sc.y * 0.72, sc.z * 1.08)
	_set_mat(roof, FortressMaterials.get_roof_mat(owner_id))
	_set_lod(roof, 0.0, LOD2_MAX)
	root.add_child(roof)

	var chim = CHIMNEY_SCN.instantiate()
	chim.position = pos + Vector3(sc.x * 0.35, sc.y + 0.6, 0)
	chim.scale = Vector3(1.1, 1.1, 1.1)
	_set_lod(chim, 0.0, LOD0_MAX)
	root.add_child(chim)

# Artillery Cannon (LOD0 & LOD1)
static func _add_cannon(root: Node3D, pos: Vector3, rot_y: float) -> void:
	var c = CANNON_LARGE_SCN.instantiate()
	c.position = pos
	c.scale = Vector3(0.9, 0.9, 0.9)
	c.rotation.y = rot_y
	_set_lod(c, 0.0, LOD1_MAX)
	root.add_child(c)

# Cheap Non-Shadow Local Lantern (LOD0 only!)
static func _add_lantern(root: Node3D, pos: Vector3) -> void:
	var lant = LANTERN_SCN.instantiate()
	lant.position = pos
	lant.scale = Vector3(1.2, 1.2, 1.2)
	_set_lod(lant, 0.0, LOD0_MAX)
	root.add_child(lant)

	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 0.72, 0.25)
	light.light_energy = 1.4
	light.omni_range = 5.0
	light.omni_attenuation = 1.4
	light.shadow_enabled = false # ZERO shadow-casting cost!
	light.position = pos + Vector3(0, 0.15, 0)
	light.distance_fade_enabled = true
	light.distance_fade_begin = 20.0
	light.distance_fade_length = 8.0
	root.add_child(light)

# Small Prop (Carts, etc.) visible only in close zoom (LOD0)
static func _add_prop_lod0(root: Node3D, scn: PackedScene, pos: Vector3, sc: Vector3, rot_y: float) -> void:
	var prop = scn.instantiate()
	prop.position = pos
	prop.scale = sc
	prop.rotation.y = rot_y
	_set_lod(prop, 0.0, LOD0_MAX)
	root.add_child(prop)

# Tall Flagpole with Faction Banner
static func _add_flagpole(root: Node3D, pos: Vector3, owner_id: String, level: int) -> void:
	var pole = MeshInstance3D.new()
	var cyl = CylinderMesh.new()
	cyl.top_radius = 0.035
	cyl.bottom_radius = 0.06
	cyl.height = 3.4 + float(level - 1) * 0.7
	pole.mesh = cyl
	pole.position = pos + Vector3(0, cyl.height * 0.5, 0)
	pole.material_override = FortressMaterials.wood_timber
	_set_lod(pole, 0.0, LOD2_MAX)
	root.add_child(pole)

	var banner = MeshInstance3D.new()
	var q = QuadMesh.new()
	q.size = Vector2(1.3 + float(level - 1) * 0.3, 0.8 + float(level - 1) * 0.2)
	banner.mesh = q
	banner.position = pos + Vector3(0.68, cyl.height - 0.45, 0)
	banner.rotation.y = 0.5 * PI
	banner.material_override = FortressMaterials.get_flag_mat(owner_id)
	_set_lod(banner, 0.0, LOD2_MAX)
	root.add_child(banner)

# Helper: Set material on node and all its mesh descendants

static func _set_mat(node: Node, mat: StandardMaterial3D) -> void:
	if node is MeshInstance3D:
		node.material_override = mat
	for c in node.get_children():
		_set_mat(c, mat)

# Helper: Set Godot native visibility range (LOD) on all geometry instances
static func _set_lod(node: Node, begin_dist: float, end_dist: float) -> void:
	if node is GeometryInstance3D:
		node.visibility_range_begin = begin_dist
		node.visibility_range_end = end_dist
	for c in node.get_children():
		_set_lod(c, begin_dist, end_dist)
