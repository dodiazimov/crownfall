class_name TroopUnit
extends Node3D

# 18th-Century Rigged 3D Character & Cavalry Unit with Real Skeletal Animations

const SOLDIER_SCN = preload("res://assets/models/units/soldier.glb")
const HORSE_SCN = preload("res://assets/models/units/horse.glb")

var unit_type: String = "soldier" # "soldier", "archer", "knight", "cavalry"
var faction: String = "blue"     # "blue" or "red"
var anim_state: String = "march" # "march", "attack", "idle", "death"

var root_visual: Node3D
var soldier_instance: Node3D
var soldier_anim: AnimationPlayer

var horse_instance: Node3D
var horse_anim: AnimationPlayer

var muzzle_flash: CPUParticles3D
var contact_shadow: MeshInstance3D

var attack_timer: float = 0.0
var walk_speed_factor: float = 1.0

func init_unit(type: String, team: String) -> void:
	unit_type = type
	faction = team

	root_visual = Node3D.new()
	root_visual.name = "Visual"
	add_child(root_visual)

	_build_contact_shadow()
	_build_muzzle_flash()

	if unit_type == "cavalry":
		_build_cavalry()
	else:
		_build_infantry()

	# Small speed variation so rank-and-file steps are organic
	walk_speed_factor = randf_range(0.92, 1.08)
	set_state("march")

func _build_contact_shadow() -> void:
	contact_shadow = MeshInstance3D.new()
	var cm = CylinderMesh.new()
	cm.top_radius = 0.45 if unit_type == "cavalry" else 0.28
	cm.bottom_radius = 0.50 if unit_type == "cavalry" else 0.32
	cm.height = 0.02
	contact_shadow.mesh = cm
	contact_shadow.position = Vector3(0, 0.02, 0)
	
	var sm = StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.albedo_color = Color(0.01, 0.02, 0.04, 0.55)
	contact_shadow.material_override = sm
	add_child(contact_shadow)

func _build_infantry() -> void:
	soldier_instance = SOLDIER_SCN.instantiate()
	soldier_instance.name = "SoldierRig"
	soldier_instance.scale = Vector3(0.52, 0.52, 0.52)
	root_visual.add_child(soldier_instance)

	soldier_anim = _find_animation_player(soldier_instance)
	_apply_faction_uniform(soldier_instance)

	# Attached flintlock musket / skirmisher rifle
	var musket = _create_musket()
	musket.position = Vector3(0.18, 0.55, 0.08)
	musket.rotation = Vector3(0.2, 0.1, -0.2)
	root_visual.add_child(musket)

func _build_cavalry() -> void:
	# 1. Rigged Warhorse
	horse_instance = HORSE_SCN.instantiate()
	horse_instance.name = "HorseRig"
	horse_instance.scale = Vector3(0.68, 0.68, 0.68)
	root_visual.add_child(horse_instance)

	horse_anim = _find_animation_player(horse_instance)

	# 2. Mounted Dragoon / Hussar Rider
	soldier_instance = SOLDIER_SCN.instantiate()
	soldier_instance.name = "DragoonRider"
	soldier_instance.scale = Vector3(0.46, 0.46, 0.46)
	soldier_instance.position = Vector3(0, 0.76, -0.12)
	root_visual.add_child(soldier_instance)

	soldier_anim = _find_animation_player(soldier_instance)
	_apply_faction_uniform(soldier_instance)

	# Cavalry Dragoon Saber
	var saber = _create_saber()
	saber.position = Vector3(0.22, 0.85, 0.1)
	saber.rotation = Vector3(0.5, 0.0, -0.3)
	root_visual.add_child(saber)

func _build_muzzle_flash() -> void:
	muzzle_flash = CPUParticles3D.new()
	muzzle_flash.name = "MuzzleSmoke"
	muzzle_flash.emitting = false
	muzzle_flash.one_shot = true
	muzzle_flash.explosiveness = 0.95
	muzzle_flash.amount = 14
	muzzle_flash.lifetime = 0.6
	muzzle_flash.direction = Vector3(0, 0.3, 1.0).normalized()
	muzzle_flash.spread = 22.0
	muzzle_flash.initial_velocity_min = 2.5
	muzzle_flash.initial_velocity_max = 4.8
	muzzle_flash.gravity = Vector3(0, 0.8, 0)
	
	var qm = QuadMesh.new()
	qm.size = Vector2(0.25, 0.25)
	muzzle_flash.mesh = qm
	
	var pmat = StandardMaterial3D.new()
	pmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	pmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pmat.albedo_color = Color(0.92, 0.88, 0.82, 0.75)
	muzzle_flash.material_override = pmat
	
	muzzle_flash.position = Vector3(0.18, 0.72, 0.75)
	root_visual.add_child(muzzle_flash)

func _create_musket() -> Node3D:
	var node = Node3D.new()
	node.name = "Musket"
	
	var stock = MeshInstance3D.new()
	var sm = BoxMesh.new()
	sm.size = Vector3(0.05, 0.85, 0.06)
	stock.mesh = sm
	var wmat = StandardMaterial3D.new()
	wmat.albedo_color = Color(0.28, 0.16, 0.08)
	stock.material_override = wmat
	node.add_child(stock)

	var barrel = MeshInstance3D.new()
	var bm = CylinderMesh.new()
	bm.top_radius = 0.018
	bm.bottom_radius = 0.02
	bm.height = 0.65
	barrel.mesh = bm
	barrel.position = Vector3(0, 0.35, 0)
	var mmat = StandardMaterial3D.new()
	mmat.albedo_color = Color(0.72, 0.74, 0.76)
	mmat.metallic = 0.85
	mmat.roughness = 0.25
	barrel.material_override = mmat
	node.add_child(barrel)

	return node

func _create_saber() -> Node3D:
	var node = Node3D.new()
	node.name = "Saber"
	
	var blade = MeshInstance3D.new()
	var bm = BoxMesh.new()
	bm.size = Vector3(0.03, 0.68, 0.05)
	blade.mesh = bm
	var smat = StandardMaterial3D.new()
	smat.albedo_color = Color(0.85, 0.86, 0.90)
	smat.metallic = 0.9
	smat.roughness = 0.2
	blade.material_override = smat
	node.add_child(blade)
	
	return node

func _apply_faction_uniform(root_node: Node) -> void:
	var uniform_mat = StandardMaterial3D.new()
	uniform_mat.roughness = 0.75

	match faction:
		"blue":
			if unit_type == "archer":
				uniform_mat.albedo_color = Color(0.18, 0.48, 0.35) # Light Infantry green
			elif unit_type == "knight":
				uniform_mat.albedo_color = Color(0.12, 0.22, 0.44) # Heavy Grenadier dark navy
			else:
				uniform_mat.albedo_color = Color(0.20, 0.44, 0.82) # Royal Azure Line Infantry
		"red":
			if unit_type == "archer":
				uniform_mat.albedo_color = Color(0.48, 0.32, 0.18) # Jaeger rifleman buff/brown
			elif unit_type == "knight":
				uniform_mat.albedo_color = Color(0.55, 0.12, 0.12) # Imperial Crimson Grenadier
			else:
				uniform_mat.albedo_color = Color(0.82, 0.20, 0.20) # British Redcoat Line Infantry

	_recursively_apply_material(root_node, uniform_mat)

func _recursively_apply_material(node: Node, mat: StandardMaterial3D) -> void:
	if node is MeshInstance3D:
		node.material_override = mat
	for child in node.get_children():
		_recursively_apply_material(child, mat)

func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node
	for child in node.get_children():
		var ap = _find_animation_player(child)
		if ap != null:
			return ap
	return null

func set_state(new_state: String) -> void:
	anim_state = new_state

	match anim_state:
		"march":
			if soldier_anim:
				soldier_anim.play("Walk", -1, walk_speed_factor * 1.1)
			if horse_anim:
				horse_anim.play("horse_A_", -1, 1.25)
		"idle":
			if soldier_anim:
				soldier_anim.play("Idle", -1, 1.0)
			if horse_anim:
				horse_anim.pause()
		"attack":
			if soldier_anim:
				soldier_anim.play("Run", -1, 1.35)
			if horse_anim:
				horse_anim.play("horse_A_", -1, 1.6)
		"death":
			_play_death_animation()

func trigger_musket_volley() -> void:
	if muzzle_flash:
		muzzle_flash.restart()
		muzzle_flash.emitting = true

	# Subtle recoil tween
	if root_visual:
		var tw = create_tween()
		tw.tween_property(root_visual, "position:z", -0.15, 0.06)
		tw.tween_property(root_visual, "position:z", 0.0, 0.14)

func _play_death_animation() -> void:
	if root_visual:
		var tw = create_tween()
		tw.set_parallel(true)
		tw.tween_property(root_visual, "rotation:x", 0.5 * PI, 0.35)
		tw.tween_property(root_visual, "position:y", -0.3, 0.35)
		tw.chain().tween_property(root_visual, "scale", Vector3.ZERO, 0.4)
		tw.chain().tween_callback(queue_free)

func _process(delta: float) -> void:
	if anim_state == "attack":
		attack_timer -= delta
		if attack_timer <= 0.0:
			attack_timer = randf_range(1.2, 2.4)
			trigger_musket_volley()
