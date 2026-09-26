class_name Army
extends Node3D

const GameData = preload("res://scripts/GameData.gd")
const TroopUnit = preload("res://scripts/TroopUnit.gd")
const TerrainBuilder = preload("res://scripts/TerrainBuilder.gd")

signal army_arrived(army: Army, target_id: int)
signal army_clashed(army1: Army, army2: Army)

@export var army_id: int = 0
@export var faction: String = "blue"
@export var source_id: int = 0
@export var target_id: int = 0

var units_count: Dictionary = {
	"soldier": 0,
	"archer": 0,
	"knight": 0,
	"cavalry": 0
}
var total_troops: int = 0

var path_waypoints: Array[Vector3] = []
var current_waypoint_idx: int = 0
var move_speed: float = 6.0
var in_battle: bool = false
var engaged_with: Army = null
var terrain_ref: TerrainBuilder = null

# 3D Visuals
var representative_units: Array[TroopUnit] = []
var banner_node: Node3D
var label_count: Label3D
var dust_particles: CPUParticles3D

func init_army(id: int, team: String, src: int, dst: int, composition: Dictionary, path: Array[Vector3], tb: TerrainBuilder) -> void:
	army_id = id
	faction = team
	source_id = src
	target_id = dst
	units_count = composition.duplicate()
	path_waypoints = path
	terrain_ref = tb
	current_waypoint_idx = 0
	in_battle = false

	# Calculate total troops
	total_troops = 0
	for u in units_count:
		total_troops += int(units_count[u])

	# Position at start of path
	if path_waypoints.size() > 0:
		position = path_waypoints[0]

	_calculate_speed()
	_spawn_representative_units()
	_build_banner()
	_build_badge()
	_build_dust()

func _calculate_speed() -> void:
	# Cavalry ratio speeds up army movement
	var cav_ratio = float(units_count.get("cavalry", 0)) / max(1.0, float(total_troops))
	move_speed = lerp(6.2, 9.8, cav_ratio)

func _spawn_representative_units() -> void:
	# Render 8 to 14 representative 3D models organized into 18th-century tactical ranks
	var max_vis = clamp(int(total_troops / 18) + 5, 6, 14)
	
	# Determine unit distribution
	var types_to_spawn: Array[String] = []
	for u in ["cavalry", "knight", "archer", "soldier"]:
		var cnt = units_count.get(u, 0)
		if cnt > 0:
			var vis_cnt = max(1, int(float(cnt) / float(total_troops) * float(max_vis)))
			for i in range(vis_cnt):
				if types_to_spawn.size() < max_vis:
					types_to_spawn.append(u)

	while types_to_spawn.size() < max_vis:
		types_to_spawn.append("soldier")

	# Arrange into disciplined tactical column (frontline infantry, rear skirmishers, flanking cavalry)
	var cols = 3
	for i in range(types_to_spawn.size()):
		var u_type = types_to_spawn[i]
		var unit = TroopUnit.new()
		unit.init_unit(u_type, faction)

		var row = int(i / cols)
		var col = i % cols
		var offset_x = (float(col) - 1.0) * 0.8
		var offset_z = -float(row) * 1.0

		# Cavalry positioned on outer flanks or vanguard
		if u_type == "cavalry":
			offset_x = (1.5 if col > 0 else -1.5)

		unit.position = Vector3(offset_x, 0, offset_z)
		add_child(unit)
		representative_units.append(unit)

func _build_banner() -> void:
	banner_node = Node3D.new()
	banner_node.position = Vector3(0, 0, 0.2)
	add_child(banner_node)

	var pole = MeshInstance3D.new()
	var p_m = CylinderMesh.new()
	p_m.top_radius = 0.03
	p_m.bottom_radius = 0.05
	p_m.height = 2.6
	pole.mesh = p_m
	pole.position = Vector3(0, 1.3, 0)
	var pole_mat = StandardMaterial3D.new()
	pole_mat.albedo_color = Color(0.24, 0.16, 0.10)
	pole.material_override = pole_mat
	banner_node.add_child(pole)

	var flag = MeshInstance3D.new()
	var f_m = QuadMesh.new()
	f_m.size = Vector2(0.9, 0.55)
	flag.mesh = f_m
	flag.position = Vector3(0.45, 2.25, 0)
	flag.rotation.y = 0.5 * PI
	var f_mat = StandardMaterial3D.new()
	f_mat.albedo_color = Color(0.18, 0.50, 0.95) if faction == "blue" else Color(0.88, 0.18, 0.18)
	f_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	flag.material_override = f_mat
	banner_node.add_child(flag)

func _build_badge() -> void:
	label_count = Label3D.new()
	label_count.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label_count.no_depth_test = true
	label_count.render_priority = 25
	label_count.pixel_size = 0.028
	label_count.font_size = 38
	label_count.outline_size = 10
	label_count.outline_modulate = Color(0.02, 0.04, 0.06, 0.98)
	label_count.modulate = Color(0.65, 0.88, 1.0) if faction == "blue" else Color(1.0, 0.68, 0.68)
	label_count.text = str(total_troops)
	label_count.position = Vector3(0, 3.2, 0)
	add_child(label_count)

func _build_dust() -> void:
	dust_particles = CPUParticles3D.new()
	var qm = QuadMesh.new()
	qm.size = Vector2(0.28, 0.28)
	dust_particles.mesh = qm
	dust_particles.emitting = true
	dust_particles.amount = 14
	dust_particles.lifetime = 0.7
	dust_particles.gravity = Vector3(0, 0.3, 0)
	dust_particles.initial_velocity_min = 0.4
	dust_particles.initial_velocity_max = 1.0
	dust_particles.color = Color(0.42, 0.39, 0.35, 0.35)
	dust_particles.scale_amount_min = 0.2
	dust_particles.scale_amount_max = 0.45
	dust_particles.position = Vector3(0, 0.1, -1.2)
	add_child(dust_particles)

func update_army(delta: float, weather_speed_mod: float) -> void:
	if in_battle:
		dust_particles.emitting = false
		for u in representative_units:
			if u.anim_state != "attack":
				u.set_state("attack")
		return

	if path_waypoints.is_empty() or current_waypoint_idx >= path_waypoints.size():
		return

	dust_particles.emitting = true
	var target_pt = path_waypoints[current_waypoint_idx]
	var dir = target_pt - position
	var dist = dir.length()

	if dist < 0.8:
		current_waypoint_idx += 1
		if current_waypoint_idx >= path_waypoints.size():
			emit_signal("army_arrived", self, target_id)
			return
		target_pt = path_waypoints[current_waypoint_idx]
		dir = target_pt - position

	var move_dir = dir.normalized()
	var step = move_speed * weather_speed_mod * delta
	position += move_dir * min(step, dist)

	# Conform to terrain height smoothly
	if terrain_ref:
		var ground_y = terrain_ref.get_height(position.x, position.z)
		position.y = ground_y + 0.05

	# Smooth rotation facing march direction
	if move_dir.length_squared() > 0.001:
		var target_yaw = atan2(move_dir.x, move_dir.z)
		rotation.y = lerp_angle(rotation.y, target_yaw, 12.0 * delta)

	for u in representative_units:
		if u.anim_state != "march":
			u.set_state("march")

func take_casualties(amount: int) -> void:
	total_troops = max(0, total_troops - amount)
	label_count.text = str(total_troops)

	# Trigger battle attack actions
	for u in representative_units:
		u.trigger_musket_volley()

	# Remove visual units as casualties fall
	var expected_vis = clamp(int(total_troops / 18) + 2, 2, 14)
	while representative_units.size() > expected_vis and representative_units.size() > 2:
		var u_to_remove = representative_units.pop_back()
		u_to_remove.set_state("death")

func set_in_battle(b: bool) -> void:
	in_battle = b
	for u in representative_units:
		u.set_state("attack" if b else "march")
