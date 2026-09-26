class_name FortressMaterials
extends RefCounted

# Shared PBR Master Materials for Crownfall 18th-Century Architecture
# Minimizes draw calls via shared materials with Albedo, Normal, and Roughness maps

static var stone_wall: StandardMaterial3D
static var stone_foundation: StandardMaterial3D
static var slate_roof: StandardMaterial3D
static var slate_roof_blue: StandardMaterial3D
static var slate_roof_red: StandardMaterial3D
static var slate_roof_purple: StandardMaterial3D
static var wood_timber: StandardMaterial3D
static var iron_metal: StandardMaterial3D
static var courtyard_dirt: StandardMaterial3D
static var flag_blue: StandardMaterial3D
static var flag_red: StandardMaterial3D
static var flag_purple: StandardMaterial3D
static var flag_neutral: StandardMaterial3D

static var _initialized: bool = false

static func init_materials() -> void:
	if _initialized:
		return
	_initialized = true

	var stone_tex = load("res://assets/textures/pbr/stone_diff_512.webp") as Texture2D
	var stone_nor = load("res://assets/textures/pbr/stone_nor_512.webp") as Texture2D
	var stone_rough = load("res://assets/textures/pbr/stone_rough_512.webp") as Texture2D

	var slate_tex = load("res://assets/textures/pbr/slate_diff_512.webp") as Texture2D
	var slate_nor = load("res://assets/textures/pbr/slate_nor_512.webp") as Texture2D
	var slate_rough = load("res://assets/textures/pbr/slate_rough_512.webp") as Texture2D

	# 1. Stone Wall PBR
	stone_wall = StandardMaterial3D.new()
	stone_wall.albedo_texture = stone_tex
	stone_wall.normal_enabled = true
	stone_wall.normal_texture = stone_nor
	stone_wall.roughness_texture = stone_rough
	stone_wall.uv1_scale = Vector3(1.8, 1.8, 1.8)

	# 2. Dark Foundation Stone
	stone_foundation = StandardMaterial3D.new()
	stone_foundation.albedo_texture = stone_tex
	stone_foundation.albedo_color = Color(0.48, 0.46, 0.44)
	stone_foundation.normal_enabled = true
	stone_foundation.normal_texture = stone_nor
	stone_foundation.roughness_texture = stone_rough
	stone_foundation.uv1_scale = Vector3(2.2, 1.2, 2.2)

	# 3. Slate Roofs
	slate_roof = StandardMaterial3D.new()
	slate_roof.albedo_texture = slate_tex
	slate_roof.normal_enabled = true
	slate_roof.normal_texture = slate_nor
	slate_roof.roughness_texture = slate_rough
	slate_roof.uv1_scale = Vector3(2.4, 2.4, 2.4)

	# Faction Slate Tinted Roofs
	slate_roof_blue = StandardMaterial3D.new()
	slate_roof_blue.albedo_texture = slate_tex
	slate_roof_blue.albedo_color = Color(0.55, 0.72, 0.95)
	slate_roof_blue.normal_enabled = true
	slate_roof_blue.normal_texture = slate_nor
	slate_roof_blue.roughness_texture = slate_rough
	slate_roof_blue.uv1_scale = Vector3(2.4, 2.4, 2.4)

	slate_roof_red = StandardMaterial3D.new()
	slate_roof_red.albedo_texture = slate_tex
	slate_roof_red.albedo_color = Color(0.92, 0.48, 0.48)
	slate_roof_red.normal_enabled = true
	slate_roof_red.normal_texture = slate_nor
	slate_roof_red.roughness_texture = slate_rough
	slate_roof_red.uv1_scale = Vector3(2.4, 2.4, 2.4)

	slate_roof_purple = StandardMaterial3D.new()
	slate_roof_purple.albedo_texture = slate_tex
	slate_roof_purple.albedo_color = Color(0.78, 0.52, 0.95)
	slate_roof_purple.normal_enabled = true
	slate_roof_purple.normal_texture = slate_nor
	slate_roof_purple.roughness_texture = slate_rough
	slate_roof_purple.uv1_scale = Vector3(2.4, 2.4, 2.4)

	# 4. Timber Wood
	wood_timber = StandardMaterial3D.new()
	wood_timber.albedo_color = Color(0.26, 0.18, 0.12)
	wood_timber.roughness = 0.82

	# 5. Iron Metal
	iron_metal = StandardMaterial3D.new()
	iron_metal.albedo_color = Color(0.18, 0.19, 0.22)
	iron_metal.metallic = 0.80
	iron_metal.roughness = 0.35

	# 6. Courtyard Packed Earth / Cobblestone
	courtyard_dirt = StandardMaterial3D.new()
	courtyard_dirt.albedo_texture = stone_tex
	courtyard_dirt.albedo_color = Color(0.38, 0.35, 0.30)
	courtyard_dirt.uv1_scale = Vector3(3.0, 3.0, 3.0)
	courtyard_dirt.roughness = 0.95

	# 7. Flags
	flag_blue = _create_flag_mat(Color(0.18, 0.52, 0.95))
	flag_red = _create_flag_mat(Color(0.90, 0.20, 0.20))
	flag_purple = _create_flag_mat(Color(0.72, 0.28, 0.94))
	flag_neutral = _create_flag_mat(Color(0.55, 0.50, 0.44))

static func _create_flag_mat(col: Color) -> StandardMaterial3D:
	var m = StandardMaterial3D.new()
	m.albedo_color = col
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.75
	return m

static func get_roof_mat(faction: String) -> StandardMaterial3D:
	init_materials()
	match faction:
		"blue": return slate_roof_blue
		"red": return slate_roof_red
		"purple": return slate_roof_purple
		_: return slate_roof

static func get_flag_mat(faction: String) -> StandardMaterial3D:
	init_materials()
	match faction:
		"blue": return flag_blue
		"red": return flag_red
		"purple": return flag_purple
		_: return flag_neutral
