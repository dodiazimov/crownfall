class_name BattleManager
extends Node3D

const GameData = preload("res://scripts/GameData.gd")
const Army = preload("res://scripts/Army.gd")
const Castle = preload("res://scripts/Castle.gd")

signal castle_captured(castle: Castle, new_owner: String)
signal road_battle_resolved(winner: Army, loser: Army)

var active_battles: Array[Dictionary] = []
var combat_tick_timer: float = 0.0
const COMBAT_TICK_INTERVAL: float = 0.55 # Progressive combat tick

# Visual battle FX
var battle_fx_parent: Node3D

func _ready() -> void:
	battle_fx_parent = Node3D.new()
	battle_fx_parent.name = "BattleFX"
	add_child(battle_fx_parent)

func start_road_battle(army1: Army, army2: Army) -> void:
	# Both armies halt and engage
	army1.in_battle = true
	army2.in_battle = true
	army1.engaged_with = army2
	army2.engaged_with = army1

	# Orient them facing each other
	var dir1 = (army2.position - army1.position).normalized()
	army1.rotation.y = atan2(dir1.x, dir1.z)
	army2.rotation.y = atan2(-dir1.x, -dir1.z)

	var clash_pos = (army1.position + army2.position) * 0.5
	var fx = _create_battle_smoke(clash_pos)

	var battle_entry = {
		"type": "road",
		"army1": army1,
		"army2": army2,
		"pos": clash_pos,
		"fx": fx
	}
	active_battles.append(battle_entry)

func start_castle_siege(army: Army, castle: Castle) -> void:
	army.in_battle = true
	castle.set_under_attack(true)

	var fx = _create_battle_smoke(castle.position + Vector3(0, 1.2, 0))

	var battle_entry = {
		"type": "siege",
		"army": army,
		"castle": castle,
		"pos": castle.position,
		"fx": fx
	}
	active_battles.append(battle_entry)

func update_battles(delta: float) -> void:
	combat_tick_timer += delta
	if combat_tick_timer >= COMBAT_TICK_INTERVAL:
		combat_tick_timer = 0.0
		_process_combat_tick()

func _process_combat_tick() -> void:
	var finished_battles: Array[Dictionary] = []

	for b in active_battles:
		if b["type"] == "road":
			var a1 = b["army1"] as Army
			var a2 = b["army2"] as Army

			if not is_instance_valid(a1) or not is_instance_valid(a2):
				finished_battles.append(b)
				continue

			# Calculate progressive combat damage for both sides
			var dmg1 = _calc_army_damage(a1)
			var dmg2 = _calc_army_damage(a2)

			# Convert damage to casualties based on unit HP (never one-shot wipe)
			var cas_for_a2 = max(1, int(dmg1 / 65.0))
			var cas_for_a1 = max(1, int(dmg2 / 65.0))

			a1.take_casualties(cas_for_a1)
			a2.take_casualties(cas_for_a2)

			# Trigger battle animations
			a1.trigger_attack_anim()
			a2.trigger_attack_anim()

			# Check if one or both sides eliminated
			if a1.total_troops <= 0 or a2.total_troops <= 0:
				finished_battles.append(b)
				_resolve_road_battle(a1, a2)

		elif b["type"] == "siege":
			var army = b["army"] as Army
			var castle = b["castle"] as Castle

			if not is_instance_valid(army) or not is_instance_valid(castle):
				finished_battles.append(b)
				continue

			# Castle siege combat
			var army_dmg = _calc_army_damage(army)
			var castle_dmg = float(castle.troops) * 18.0 * 0.25 # garrison counter-fire

			var cas_castle = max(1, int(army_dmg / 70.0))
			var cas_army = max(1, int(castle_dmg / 65.0))

			castle.set_troops(castle.troops - cas_castle)
			army.take_casualties(cas_army)
			army.trigger_attack_anim()

			if castle.troops <= 0:
				# Castle captured by attacking army!
				finished_battles.append(b)
				_resolve_castle_capture(army, castle)
			elif army.total_troops <= 0:
				# Siege repelled by garrison
				finished_battles.append(b)
				castle.set_under_attack(false)
				army.queue_free()

	for fb in finished_battles:
		if is_instance_valid(fb["fx"]):
			fb["fx"].queue_free()
		active_battles.erase(fb)

func _calc_army_damage(army: Army) -> float:
	var total_dmg = 0.0
	for u in army.units_count:
		var count = army.units_count[u]
		var stat = GameData.UNITS[u]
		var base = float(count) * stat["damage"] * 0.22
		# Critical strike chance
		if randf() < stat["crit_chance"]:
			base *= stat["crit_mult"]
		total_dmg += base
	return total_dmg

func _resolve_road_battle(a1: Army, a2: Army) -> void:
	if a1.total_troops <= 0 and a2.total_troops <= 0:
		# Mutual destruction
		emit_signal("road_battle_resolved", null, a1)
		a1.queue_free()
		a2.queue_free()
	elif a1.total_troops > 0:
		# Army 1 victorious!
		a1.in_battle = false
		a1.engaged_with = null
		emit_signal("road_battle_resolved", a1, a2)
		a2.queue_free()
	else:
		# Army 2 victorious!
		a2.in_battle = false
		a2.engaged_with = null
		emit_signal("road_battle_resolved", a2, a1)
		a1.queue_free()

func _resolve_castle_capture(army: Army, castle: Castle) -> void:
	castle.set_under_attack(false)
	var new_faction = army.faction
	castle.change_owner(new_faction)
	
	# Remaining army garrison becomes the castle garrison
	castle.set_troops(max(15, army.total_troops))
	emit_signal("castle_captured", castle, new_faction)
	army.queue_free()

func _create_battle_smoke(pos: Vector3) -> CPUParticles3D:
	var fx = CPUParticles3D.new()
	var qm = QuadMesh.new()
	qm.size = Vector2(0.5, 0.5)
	fx.mesh = qm
	fx.amount = 28
	fx.lifetime = 1.2
	fx.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	fx.emission_sphere_radius = 1.0
	fx.gravity = Vector3(0, 1.2, 0)
	fx.initial_velocity_min = 1.0
	fx.initial_velocity_max = 2.5
	fx.color = Color(0.4, 0.4, 0.4, 0.65)
	fx.scale_amount_min = 0.3
	fx.scale_amount_max = 0.8
	fx.position = pos
	battle_fx_parent.add_child(fx)
	return fx
