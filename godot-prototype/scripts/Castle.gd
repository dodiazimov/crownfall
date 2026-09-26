class_name Castle
extends Node3D

const GameData = preload("res://scripts/GameData.gd")

const TEXTURES = {
	"main": preload("res://assets/castle_main.png"),
	"elite": preload("res://assets/castle_elite.png"),
	"troop": preload("res://assets/castle_troop.png"),
	"archer": preload("res://assets/castle_archer.png"),
	"knight": preload("res://assets/castle_knight.png"),
	"cavalry": preload("res://assets/castle_cavalry.png"),
	"gold": preload("res://assets/castle_gold.png"),
	"small": preload("res://assets/castle_small.png")
}

@export var castle_id: int = 0
@export var castle_name: String = ""
@export var castle_type: String = "troop"
@export var owner_id: String = "" # "blue", "red", or "" (neutral)
@export var troops: int = 100
@export var max_troops: int = 500
@export var level: int = 1

var is_selected: bool = false
var is_targeted: bool = false
var is_under_attack: bool = false

# Visual nodes
var foundation_node: Node3D
var castle_sprite: Sprite3D
var territory_ring: MeshInstance3D
var select_ring: MeshInstance3D
var torch_light: OmniLight3D
var flag_mesh: MeshInstance3D
var label_name: Label3D
var label_troops: Label3D
var attack_particles: CPUParticles3D
var upgrade_particles: CPUParticles3D

# Materials
var territory_mat: StandardMaterial3D
var select_mat: StandardMaterial3D
var flag_mat: StandardMaterial3D

var torch_base_energy: float = 1.6

const CastleBuilder = preload("res://scripts/CastleBuilder.gd")

func init_castle(data: Dictionary) -> void:
	castle_id = data["id"]
	castle_name = data["name"]
	castle_type = data["type"]
	owner_id = data["owner"]
	troops = data["troops"]

	var world_pos = GameData.to_world_pos(data["orig"], data["y"])
	position = world_pos

	_setup_materials()
	_build_territory_ring()
	CastleBuilder.build_castle_compound(self, castle_type, owner_id, level)
	_build_torch_light()
	_build_labels()
	_build_particles()
	update_visuals()

func _setup_materials() -> void:
	territory_mat = StandardMaterial3D.new()
	territory_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	territory_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	select_mat = StandardMaterial3D.new()
	select_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	select_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	select_mat.albedo_color = Color(1.0, 0.88, 0.25, 0.95) # Radiant Gold highlight

	flag_mat = StandardMaterial3D.new()
	flag_mat.roughness = 0.55
	flag_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

func _build_territory_ring() -> void:
	var r = 3.2 if (castle_type == "main" or castle_type == "elite") else 2.5
	territory_ring = MeshInstance3D.new()
	territory_ring.name = "TerritoryAura"
	var torus = TorusMesh.new()
	torus.inner_radius = r - 0.10
	torus.outer_radius = r + 0.18
	torus.rings = 32
	torus.ring_segments = 10
	territory_ring.mesh = torus
	territory_ring.position = Vector3(0, 0.05, 0)
	territory_ring.material_override = territory_mat
	add_child(territory_ring)

	# Selection / Targeting Halo
	select_ring = MeshInstance3D.new()
	select_ring.name = "SelectRing"
	var sel_torus = TorusMesh.new()
	sel_torus.inner_radius = r + 0.22
	sel_torus.outer_radius = r + 0.45
	sel_torus.rings = 32
	sel_torus.ring_segments = 10
	select_ring.mesh = sel_torus
	select_ring.position = Vector3(0, 0.08, 0)
	select_ring.material_override = select_mat
	select_ring.visible = false
	add_child(select_ring)

func _build_torch_light() -> void:
	torch_light = OmniLight3D.new()
	torch_light.name = "TorchLight"
	torch_light.light_color = Color(1.0, 0.68, 0.26) # Warm flickering medieval torchfire
	torch_light.light_energy = torch_base_energy
	torch_light.omni_range = 8.5
	torch_light.omni_attenuation = 1.3
	torch_light.shadow_enabled = false
	torch_light.position = Vector3(0, 1.8, 0.8)
	add_child(torch_light)

func _build_labels() -> void:
	var badge = Node3D.new()
	badge.name = "Badge"
	badge.position = Vector3(0, 4.4, 0.4)
	add_child(badge)

	label_troops = Label3D.new()
	label_troops.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label_troops.no_depth_test = true
	label_troops.render_priority = 20
	label_troops.pixel_size = 0.032
	label_troops.font_size = 48
	label_troops.outline_size = 14
	label_troops.outline_modulate = Color(0.01, 0.03, 0.06, 0.98)
	label_troops.modulate = Color(1.0, 0.95, 0.65)
	label_troops.text = str(troops)
	label_troops.position = Vector3(0, 0.85, 0)
	badge.add_child(label_troops)

	label_name = Label3D.new()
	label_name.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label_name.no_depth_test = true
	label_name.render_priority = 20
	label_name.pixel_size = 0.022
	label_name.font_size = 32
	label_name.outline_size = 10
	label_name.outline_modulate = Color(0.01, 0.03, 0.06, 0.98)
	label_name.modulate = Color(0.92, 0.88, 0.82)
	label_name.text = castle_name
	label_name.position = Vector3(0, 0.0, 0)
	badge.add_child(label_name)

func _build_particles() -> void:
	attack_particles = CPUParticles3D.new()
	attack_particles.name = "AttackParticles"
	var qm = QuadMesh.new()
	qm.size = Vector2(0.35, 0.35)
	attack_particles.mesh = qm
	attack_particles.emitting = false
	attack_particles.amount = 24
	attack_particles.lifetime = 1.4
	attack_particles.direction = Vector3.UP
	attack_particles.spread = 45.0
	attack_particles.initial_velocity_min = 1.5
	attack_particles.initial_velocity_max = 3.5
	attack_particles.gravity = Vector3(0, 0.5, 0)
	attack_particles.color = Color(0.35, 0.35, 0.35, 0.7)
	attack_particles.position = Vector3(0, 2.5, 0)
	add_child(attack_particles)

func _process(_delta: float) -> void:
	# Subtle procedural torch flicker
	if torch_light:
		var flicker = sin(Time.get_ticks_msec() * 0.009 + float(castle_id * 17)) * 0.25
		torch_light.light_energy = torch_base_energy + flicker

func set_selected(sel: bool) -> void:
	is_selected = sel
	select_ring.visible = is_selected or is_targeted
	if is_selected:
		select_mat.albedo_color = Color(1.0, 0.88, 0.22, 0.95) # Gold
	elif is_targeted:
		select_mat.albedo_color = Color(1.0, 0.25, 0.25, 0.95) # Red pulse

func set_targeted(tar: bool) -> void:
	is_targeted = tar
	select_ring.visible = is_selected or is_targeted
	if is_selected:
		select_mat.albedo_color = Color(1.0, 0.88, 0.22, 0.95)
	elif is_targeted:
		select_mat.albedo_color = Color(1.0, 0.25, 0.25, 0.95)

func set_under_attack(ua: bool) -> void:
	is_under_attack = ua
	attack_particles.emitting = ua

func change_owner(new_owner: String) -> void:
	owner_id = new_owner
	update_visuals()

func set_troops(val: int) -> void:
	troops = max(0, val)
	if label_troops:
		label_troops.text = str(troops)

func get_upgrade_cost() -> int:
	if level == 1:
		return 100
	elif level == 2:
		return 220
	return -1 # Max level

func can_upgrade(player_gold: int) -> bool:
	var cost = get_upgrade_cost()
	return cost > 0 and player_gold >= cost

func upgrade_castle() -> bool:
	if level >= 3:
		return false
	level += 1
	if level == 2:
		max_troops = 800
	elif level == 3:
		max_troops = 1250

	# Smooth scale up of authentic castle artwork
	if castle_sprite:
		var target_scale = Vector3(1.15, 1.15, 1.15) if level == 2 else Vector3(1.30, 1.30, 1.30)
		var tw = create_tween()
		tw.tween_property(castle_sprite, "scale", target_scale, 0.45).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

	_trigger_upgrade_particles()
	update_visuals()
	return true

func _trigger_upgrade_particles() -> void:
	if not upgrade_particles:
		upgrade_particles = CPUParticles3D.new()
		var qm = QuadMesh.new()
		qm.size = Vector2(0.4, 0.4)
		upgrade_particles.mesh = qm
		upgrade_particles.amount = 36
		upgrade_particles.lifetime = 1.3
		upgrade_particles.one_shot = true
		upgrade_particles.explosiveness = 0.85
		upgrade_particles.direction = Vector3.UP
		upgrade_particles.spread = 55.0
		upgrade_particles.initial_velocity_min = 3.0
		upgrade_particles.initial_velocity_max = 6.5
		upgrade_particles.color = Color(1.0, 0.86, 0.15, 0.95)
		upgrade_particles.position = Vector3(0, 3.2, 0)
		add_child(upgrade_particles)
	upgrade_particles.restart()
	upgrade_particles.emitting = true

func update_visuals() -> void:
	if not territory_mat:
		return

	CastleBuilder.build_castle_compound(self, castle_type, owner_id, level)

	match owner_id:
		"blue":
			# Royal Azure Blue Aura & Flag
			territory_ring.visible = true
			territory_mat.albedo_color = Color(0.20, 0.58, 1.0, 0.90)
			flag_mat.albedo_color = Color(0.18, 0.50, 0.95)
			torch_base_energy = 1.9
			if label_troops:
				label_troops.modulate = Color(0.55, 0.85, 1.0)
		"red":
			# Crimson Redcoat Aura & Flag
			territory_ring.visible = true
			territory_mat.albedo_color = Color(0.95, 0.22, 0.22, 0.90)
			flag_mat.albedo_color = Color(0.88, 0.18, 0.18)
			torch_base_energy = 1.9
			if label_troops:
				label_troops.modulate = Color(1.0, 0.60, 0.60)
		_:
			# Neutral / Independent keeps
			if castle_type == "elite":
				territory_ring.visible = true
				territory_mat.albedo_color = Color(0.75, 0.40, 0.98, 0.88) # The Violet Crown
				flag_mat.albedo_color = Color(0.70, 0.35, 0.92)
				if label_troops: label_troops.modulate = Color(0.92, 0.78, 1.0)
			else:
				# Clean natural stone on painted terrain with no artificial ring
				territory_ring.visible = false
				flag_mat.albedo_color = Color(0.45, 0.42, 0.38)
				if label_troops: label_troops.modulate = Color(0.95, 0.92, 0.85)
			torch_base_energy = 1.4

	var star_prefix = ""
	if level == 2: star_prefix = "[Lv.2] "
	elif level == 3: star_prefix = "[Lv.3] "


	if label_name:
		label_name.text = star_prefix + castle_name
	if label_troops:
		label_troops.text = str(troops)
