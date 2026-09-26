class_name BotAI
extends RefCounted

const GameData = preload("res://scripts/GameData.gd")
const Castle = preload("res://scripts/Castle.gd")

signal ai_order(source_id: int, target_id: int, percent: float)

var think_timer: float = 0.0
const THINK_INTERVAL: float = 2.4

func update_ai(delta: float, castles_map: Dictionary) -> void:
	think_timer += delta
	if think_timer < THINK_INTERVAL:
		return
	think_timer = 0.0

	_evaluate_and_act(castles_map)

func _evaluate_and_act(castles: Dictionary) -> void:
	# Find all red owned castles
	var my_castles: Array[Castle] = []
	for cid in castles:
		var c = castles[cid] as Castle
		if c.owner_id == "red" and c.troops > 40:
			my_castles.append(c)

	if my_castles.is_empty():
		return

	# Sort red castles by troop count descending
	my_castles.sort_custom(func(a, b): return a.troops > b.troops)
	var best_source = my_castles[0]

	# Find valid connected neighbors via ROAD_EDGES
	var neighbors = _get_connected_castle_ids(best_source.castle_id)
	
	var candidate_target: Castle = null
	var best_score: float = -999.0

	for nid in neighbors:
		if not castles.has(nid):
			continue
		var target = castles[nid] as Castle

		if target.owner_id == "red":
			# Potential reinforcement if under attack or weak
			if target.troops < 50 and best_source.troops > 120:
				var score = 40.0 - float(target.troops)
				if score > best_score:
					best_score = score
					candidate_target = target
			continue

		# Target is Neutral or Player (Blue)
		var avail_troops = int(best_source.troops * 0.6) # Safe dispatch fraction
		var needed = target.troops

		# Only attack if we have military advantage (no suicidal attacks)
		if avail_troops > needed:
			var score = 100.0 - float(target.troops) * 0.5

			# Strategic role weighting
			match target.castle_type:
				"gold": score += 60.0 # High value economy
				"cavalry": score += 50.0 # High value cavalry
				"troop": score += 35.0
				"archer": score += 30.0
				"knight": score += 25.0
				"elite": score += 40.0
				"main": score += 80.0 if target.owner_id == "blue" else 0.0

			# Extra priority to capture neutral nodes first
			if target.owner_id == "":
				score += 25.0

			if score > best_score:
				best_score = score
				candidate_target = target

	if candidate_target != null:
		# Determine dispatch percent
		var percent = 0.5
		if candidate_target.troops > 120:
			percent = 0.75
		elif candidate_target.troops < 40:
			percent = 0.35

		emit_signal("ai_order", best_source.castle_id, candidate_target.castle_id, percent)

func _get_connected_castle_ids(src_id: int) -> Array[int]:
	var result: Array[int] = []
	for edge in GameData.ROAD_EDGES:
		if edge[0] == src_id:
			result.append(edge[1])
		elif edge[1] == src_id:
			result.append(edge[0])
	return result
