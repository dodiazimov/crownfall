class_name Main
extends Node3D

const GameData = preload("res://scripts/GameData.gd")
const TerrainBuilder = preload("res://scripts/TerrainBuilder.gd")
const EnvironmentDecor = preload("res://scripts/EnvironmentDecor.gd")
const Castle = preload("res://scripts/Castle.gd")
const Army = preload("res://scripts/Army.gd")
const BattleManager = preload("res://scripts/BattleManager.gd")
const StrategyCamera = preload("res://scripts/StrategyCamera.gd")
const WeatherManager = preload("res://scripts/WeatherManager.gd")
const BotAI = preload("res://scripts/BotAI.gd")
const HUD = preload("res://scripts/HUD.gd")
const AudioController = preload("res://scripts/AudioController.gd")

# Subsystems
var terrain_builder: TerrainBuilder
var env_decor: EnvironmentDecor
var battle_manager: BattleManager
var strategy_camera: StrategyCamera
var weather_manager: WeatherManager
var bot_ai: BotAI
var hud: HUD
var audio_ctrl: AudioController

# Match runtime state (NEVER persisted to browser storage)
var castles: Dictionary = {} # id -> Castle
var armies: Array[Army] = []
var next_army_id: int = 1

var player_gold: int = 150
var bot_gold: int = 150
var match_time: float = 0.0
var game_speed: float = 1.0
var is_game_over: bool = false

# Player selection & Touch Drag state
var selected_source: Castle = null
var selected_target: Castle = null

var is_swiping_castle: bool = false
var drag_source_castle: Castle = null
var drag_start_screen: Vector2 = Vector2.ZERO
var hovered_target_castle: Castle = null

# 3D Tactical Trajectory Arc
var trajectory_mesh: MeshInstance3D
var immediate_mesh: ImmediateMesh
var trajectory_mat: StandardMaterial3D

# Timers
var income_timer: float = 0.0
var recruit_timer: float = 0.0

# Graphics Quality Settings (low, medium, high, auto)
var current_quality: String = "auto"
var effective_quality: String = "high"

func _ready() -> void:
	_init_subsystems()
	_init_trajectory()
	start_fresh_match()
	_parse_web_params()


func _init_subsystems() -> void:
	# Camera
	strategy_camera = StrategyCamera.new()
	strategy_camera.name = "StrategyCamera"
	add_child(strategy_camera)
	strategy_camera.intro_finished.connect(_on_intro_finished)

	# Weather & Lighting
	weather_manager = WeatherManager.new()
	weather_manager.name = "WeatherManager"
	add_child(weather_manager)
	weather_manager.init_weather(strategy_camera)

	# Audio
	audio_ctrl = AudioController.new()
	audio_ctrl.name = "AudioController"
	add_child(audio_ctrl)

	# Terrain
	terrain_builder = TerrainBuilder.new()
	terrain_builder.name = "TerrainBuilder"
	add_child(terrain_builder)
	terrain_builder.build_environment()

	# Environment Decor (Forests, Rocks, Cottages)
	env_decor = EnvironmentDecor.new()
	env_decor.name = "EnvironmentDecor"
	add_child(env_decor)
	env_decor.build_decorations(terrain_builder)

	# Battle Manager
	battle_manager = BattleManager.new()
	battle_manager.name = "BattleManager"
	add_child(battle_manager)
	battle_manager.castle_captured.connect(_on_castle_captured)
	battle_manager.road_battle_resolved.connect(_on_road_battle_resolved)

	# Bot AI
	bot_ai = BotAI.new()
	bot_ai.ai_order.connect(_on_ai_order)

	# HUD
	hud = HUD.new()
	hud.name = "HUD"
	add_child(hud)
	hud.dispatch_requested.connect(_on_dispatch_requested)
	hud.upgrade_requested.connect(_on_upgrade_requested)
	hud.recruit_requested.connect(_on_recruit_requested)
	hud.weather_toggle_requested.connect(func(): weather_manager.toggle_weather())
	hud.quality_changed.connect(apply_quality)
	hud.speed_changed.connect(_on_speed_changed)
	hud.restart_requested.connect(start_fresh_match)


func _init_trajectory() -> void:
	immediate_mesh = ImmediateMesh.new()
	trajectory_mesh = MeshInstance3D.new()
	trajectory_mesh.name = "TrajectoryMesh"
	trajectory_mesh.mesh = immediate_mesh

	trajectory_mat = StandardMaterial3D.new()
	trajectory_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	trajectory_mat.albedo_color = Color(1.0, 0.85, 0.25, 0.92) # Radiant Gold
	trajectory_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	trajectory_mesh.material_override = trajectory_mat
	add_child(trajectory_mesh)
	trajectory_mesh.visible = false

func _draw_trajectory(start_pos: Vector3, end_pos: Vector3) -> void:
	if not immediate_mesh:
		return
	immediate_mesh.clear_surfaces()
	immediate_mesh.surface_begin(Mesh.PRIMITIVE_LINE_STRIP)

	var p_start = start_pos + Vector3(0, 2.2, 0)
	var p_end = end_pos + Vector3(0, 1.6, 0)
	var dist = p_start.distance_to(p_end)
	var arc_height = clamp(dist * 0.22, 1.2, 6.0)

	var steps = 22
	for i in range(steps + 1):
		var t = float(i) / float(steps)
		var p = p_start.lerp(p_end, t)
		p.y += sin(t * PI) * arc_height
		immediate_mesh.surface_add_vertex(p)
	immediate_mesh.surface_end()
	trajectory_mesh.visible = true

func _hide_trajectory() -> void:
	if trajectory_mesh:
		trajectory_mesh.visible = false

func spawn_floating_text(pos: Vector3, text: String, color: Color) -> void:
	var lbl = Label3D.new()
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.font_size = 40
	lbl.outline_size = 10
	lbl.outline_modulate = Color(0.04, 0.04, 0.08, 0.95)
	lbl.modulate = color
	lbl.text = text
	lbl.position = pos + Vector3(0, 4.5, 0)
	add_child(lbl)

	var tw = create_tween()
	tw.set_parallel(true)
	tw.tween_property(lbl, "position:y", lbl.position.y + 2.2, 1.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(lbl, "modulate:a", 0.0, 1.2).set_delay(0.3)
	tw.chain().tween_callback(lbl.queue_free)

func start_fresh_match() -> void:
	# Clean up any existing entities (EVERY RELOAD = NEW MATCH)
	for a in armies:
		if is_instance_valid(a):
			a.queue_free()
	armies.clear()

	for cid in castles:
		if is_instance_valid(castles[cid]):
			castles[cid].queue_free()
	castles.clear()

	player_gold = 150
	bot_gold = 150
	match_time = 0.0
	game_speed = 1.0
	is_game_over = false
	selected_source = null
	selected_target = null
	is_swiping_castle = false
	drag_source_castle = null
	hovered_target_castle = null
	_hide_trajectory()

	# Spawn all 21 castles for The Verdant Isles
	var castles_parent = get_node_or_null("Castles")
	if not castles_parent:
		castles_parent = Node3D.new()
		castles_parent.name = "Castles"
		add_child(castles_parent)

	for def in GameData.CASTLE_DEFS:
		var c = Castle.new()
		c.name = "Castle_" + str(def["id"])
		castles_parent.add_child(c)
		c.init_castle(def)
		castles[def["id"]] = c

	# Auto-select Player starting capital (Azurehold)
	if castles.has(0):
		_select_source_castle(castles[0])

	hud.update_top_hud(player_gold, 12, 420, 420, weather_manager.current_weather, 0.0)

func _process(delta: float) -> void:
	if is_game_over:
		return

	var dt = delta * game_speed
	match_time += dt

	# Check army collisions
	_check_road_army_collisions()

	# Update battles
	battle_manager.update_battles(dt)

	# Economy & Recruitment Ticks
	income_timer += dt
	if income_timer >= 1.0:
		income_timer = 0.0
		_process_income()

	recruit_timer += dt
	if recruit_timer >= 3.0:
		recruit_timer = 0.0
		_process_recruitment()

	# Bot AI update
	bot_ai.update_ai(dt, castles)

	# Update HUD
	_update_hud_status()

	# Check Victory / Defeat
	_check_match_result()

	if OS.has_feature("web"):
		var cam_req = str(JavaScriptBridge.eval("window.__godot_cam || ''"))
		if cam_req != "":
			JavaScriptBridge.eval("window.__godot_cam = '';")
			strategy_camera.set_camera_preset(cam_req)

		var ord_req = JavaScriptBridge.eval("window.__godot_order || null")
		if ord_req:
			var team = str(JavaScriptBridge.eval("window.__godot_order[0]"))
			var src = int(JavaScriptBridge.eval("window.__godot_order[1]"))
			var dst = int(JavaScriptBridge.eval("window.__godot_order[2]"))
			var pct = float(JavaScriptBridge.eval("window.__godot_order[3]"))
			JavaScriptBridge.eval("window.__godot_order = null;")
			dispatch_army(team, src, dst, pct)

		var w_req = bool(JavaScriptBridge.eval("window.__godot_weather || false"))
		if w_req:
			JavaScriptBridge.eval("window.__godot_weather = false;")
			weather_manager.toggle_weather()

		var q_req = str(JavaScriptBridge.eval("window.__godot_quality || ''"))
		if q_req != "":
			JavaScriptBridge.eval("window.__godot_quality = '';")
			apply_quality(q_req)


		# Performance Telemetry
		var metrics_json = JSON.stringify({
			"fps": Performance.get_monitor(Performance.TIME_FPS),
			"process_time_ms": Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0,
			"draw_calls": Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),
			"objects": Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME),
			"primitives": Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME),
			"video_mem_mb": Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / (1024.0 * 1024.0),
			"node_count": get_tree().get_node_count()
		})
		JavaScriptBridge.eval("window.__godot_metrics = " + metrics_json + ";")

func _update_hud_status() -> void:
	var blue_income = 0
	var blue_troops = 0
	var red_troops = 0

	for cid in castles:
		var c = castles[cid] as Castle
		if c.owner_id == "blue":
			var t_info = GameData.CASTLE_TYPES.get(c.castle_type, {})
			var base_inc = int(t_info.get("income", 2))
			if c.level >= 2: base_inc = int(base_inc * 1.5)
			blue_income += base_inc
			blue_troops += c.troops
		elif c.owner_id == "red":
			red_troops += c.troops

	for a in armies:
		if is_instance_valid(a):
			if a.faction == "blue":
				blue_troops += a.total_troops
			elif a.faction == "red":
				red_troops += a.total_troops

	hud.update_top_hud(player_gold, blue_income, blue_troops, red_troops, weather_manager.current_weather, match_time)

func _process_income() -> void:
	for cid in castles:
		var c = castles[cid] as Castle
		var t_info = GameData.CASTLE_TYPES.get(c.castle_type, {})
		var inc = int(t_info.get("income", 2))
		if c.level == 2: inc = int(inc * 1.5)
		elif c.level == 3: inc = int(inc * 2.0)

		if c.owner_id == "blue":
			player_gold += inc
		elif c.owner_id == "red":
			bot_gold += inc

func _process_recruitment() -> void:
	# Natural garrison reinforcement over time, scaled by castle level
	for cid in castles:
		var c = castles[cid] as Castle
		if c.owner_id != "" and not c.is_under_attack:
			var recruit_amount = 3
			if c.castle_type == "troop": recruit_amount = 6
			elif c.castle_type == "main": recruit_amount = 5
			elif c.castle_type == "cavalry": recruit_amount = 4

			if c.level == 2: recruit_amount = int(recruit_amount * 1.5)
			elif c.level == 3: recruit_amount = int(recruit_amount * 2.0)

			c.set_troops(min(c.troops + recruit_amount, c.max_troops))

func _check_road_army_collisions() -> void:
	var n = armies.size()
	for i in range(n):
		var a1 = armies[i]
		if not is_instance_valid(a1) or a1.in_battle:
			continue
		for j in range(i + 1, n):
			var a2 = armies[j]
			if not is_instance_valid(a2) or a2.in_battle:
				continue
			if a1.faction != a2.faction:
				if a1.position.distance_to(a2.position) < 2.0:
					audio_ctrl.play_sfx("musket")
					audio_ctrl.play_sfx("clash")
					battle_manager.start_road_battle(a1, a2)
					break

func dispatch_army(faction: String, src_id: int, dst_id: int, percent: float) -> void:
	if not castles.has(src_id) or not castles.has(dst_id):
		return

	var src = castles[src_id] as Castle
	var send_amount = int(float(src.troops) * percent)
	if send_amount < 5 or src.troops <= 10:
		return

	src.set_troops(src.troops - send_amount)

	# Determine composition based on castle specialization
	var comp: Dictionary = { "soldier": 0, "archer": 0, "knight": 0, "cavalry": 0 }
	if src.castle_type == "cavalry":
		comp["cavalry"] = int(send_amount * 0.7)
		comp["soldier"] = send_amount - comp["cavalry"]
	elif src.castle_type == "archer":
		comp["archer"] = int(send_amount * 0.55)
		comp["soldier"] = send_amount - comp["archer"]
	elif src.castle_type == "knight":
		comp["knight"] = int(send_amount * 0.55)
		comp["soldier"] = send_amount - comp["knight"]
	else:
		comp["soldier"] = int(send_amount * 0.8)
		comp["archer"] = send_amount - comp["soldier"]

	var path = terrain_builder.get_path_between(src_id, dst_id)

	var army = Army.new()
	army.name = "Army_" + str(next_army_id)
	next_army_id += 1
	add_child(army)
	army.init_army(next_army_id, faction, src_id, dst_id, comp, path, terrain_builder)
	army.army_arrived.connect(_on_army_arrived)
	armies.append(army)

	if faction == "blue":
		spawn_floating_text(src.position, "-" + str(send_amount), Color(0.7, 0.85, 1.0))

	if comp["cavalry"] > 0:
		audio_ctrl.play_sfx("hooves")
	else:
		audio_ctrl.play_sfx("march")

func _on_army_arrived(army: Army, target_id: int) -> void:
	if not castles.has(target_id):
		army.queue_free()
		return

	var target = castles[target_id] as Castle
	if target.owner_id == army.faction:
		target.set_troops(min(target.troops + army.total_troops, target.max_troops))
		if army.faction == "blue":
			spawn_floating_text(target.position, "+" + str(army.total_troops), Color(0.4, 0.9, 0.4))
		army.queue_free()
	else:
		audio_ctrl.play_sfx("musket")
		battle_manager.start_castle_siege(army, target)

func _on_castle_captured(castle: Castle, new_owner: String) -> void:
	audio_ctrl.play_sfx("capture")
	var cap_color = Color(0.4, 0.8, 1.0) if new_owner == "blue" else Color(1.0, 0.35, 0.35)
	var cap_title = "EGALLANDI!" if new_owner == "blue" else "BOY BERILDI!"
	spawn_floating_text(castle.position, cap_title, cap_color)

	if selected_source == castle:
		hud.update_selected_castle(castle, player_gold)
	if selected_target == castle:
		hud.update_target_castle(castle, selected_source)

func _on_road_battle_resolved(winner: Army, _loser: Army) -> void:
	if winner != null:
		audio_ctrl.play_sfx("march")

func _on_ai_order(src_id: int, dst_id: int, percent: float) -> void:
	dispatch_army("red", src_id, dst_id, percent)

func _on_dispatch_requested(percent: float) -> void:
	if selected_source != null and selected_target != null:
		dispatch_army("blue", selected_source.castle_id, selected_target.castle_id, percent)
		hud.update_selected_castle(selected_source, player_gold)
		hud.update_target_castle(selected_target, selected_source)

func _on_upgrade_requested() -> void:
	if selected_source == null or selected_source.owner_id != "blue":
		return
	var cost = selected_source.get_upgrade_cost()
	if cost <= 0 or player_gold < cost:
		return

	player_gold -= cost
	selected_source.upgrade_castle()
	audio_ctrl.play_sfx("upgrade")
	spawn_floating_text(selected_source.position, "LEVEL UP!", Color(1.0, 0.85, 0.15))
	hud.update_selected_castle(selected_source, player_gold)

func _on_recruit_requested() -> void:
	if selected_source == null or selected_source.owner_id != "blue":
		return
	if player_gold < 40:
		return

	player_gold -= 40
	selected_source.set_troops(min(selected_source.troops + 25, selected_source.max_troops))
	audio_ctrl.play_sfx("coin")
	spawn_floating_text(selected_source.position, "+25 ASKAR", Color(0.35, 0.95, 0.45))
	hud.update_selected_castle(selected_source, player_gold)

func _on_speed_changed(mult: float) -> void:
	game_speed = mult

func _on_intro_finished() -> void:
	hud.hide_intro_hint()

func _check_match_result() -> void:
	var blue_castles = 0
	var red_castles = 0
	var red_main_alive = false
	var blue_main_alive = false

	for cid in castles:
		var c = castles[cid] as Castle
		if c.owner_id == "blue":
			blue_castles += 1
			if c.castle_id == 0: blue_main_alive = true
		elif c.owner_id == "red":
			red_castles += 1
			if c.castle_id == 1: red_main_alive = true

	if not red_main_alive or red_castles == 0:
		is_game_over = true
		hud.show_game_over(true)
	elif not blue_main_alive or blue_castles == 0:
		is_game_over = true
		hud.show_game_over(false)

# ================= Touch & Gesture Interaction =================
func _unhandled_input(event: InputEvent) -> void:
	# Touch Start / Mouse Down
	if (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed) or (event is InputEventScreenTouch and event.pressed):
		var screen_pos = event.position
		var c = _find_castle_near_screen(screen_pos, 65.0)
		if c != null and c.owner_id == "blue":
			is_swiping_castle = true
			drag_source_castle = c
			drag_start_screen = screen_pos
			strategy_camera.is_panning_enabled = false
			_select_source_castle(c)
			_draw_trajectory(c.position, c.position)
		elif c != null:
			_select_target_castle(c)

	# Touch Drag / Mouse Motion
	elif (event is InputEventMouseMotion and is_swiping_castle) or (event is InputEventScreenDrag and is_swiping_castle):
		var screen_pos = event.position
		if drag_source_castle != null:
			var target_c = _find_castle_near_screen(screen_pos, 65.0)
			if target_c != null and target_c != drag_source_castle:
				hovered_target_castle = target_c
				_draw_trajectory(drag_source_castle.position, target_c.position)
				hud.update_target_castle(target_c, drag_source_castle)
				target_c.set_targeted(true)
			else:
				if hovered_target_castle != null and hovered_target_castle != selected_target:
					hovered_target_castle.set_targeted(false)
					hovered_target_castle = null
				var ground_pos = strategy_camera.get_ground_click_pos(screen_pos)
				_draw_trajectory(drag_source_castle.position, ground_pos)

	# Touch Release / Mouse Up
	elif (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed) or (event is InputEventScreenTouch and not event.pressed):
		if is_swiping_castle:
			var screen_pos = event.position
			var drag_dist = drag_start_screen.distance_to(screen_pos)
			if drag_dist > 22.0:
				var target_c = _find_castle_near_screen(screen_pos, 70.0)
				if target_c != null and target_c != drag_source_castle:
					dispatch_army("blue", drag_source_castle.castle_id, target_c.castle_id, hud.selected_percent)
					_select_target_castle(target_c)
					audio_ctrl.play_sfx("march")
			else:
				_select_source_castle(drag_source_castle)

			is_swiping_castle = false
			drag_source_castle = null
			if hovered_target_castle != null and hovered_target_castle != selected_target:
				hovered_target_castle.set_targeted(false)
				hovered_target_castle = null

			strategy_camera.is_panning_enabled = true
			_hide_trajectory()

	# Keyboard Hotkeys
	elif event is InputEventKey and event.pressed:
		if event.keycode == KEY_SPACE or event.keycode == KEY_ENTER:
			if selected_source != null and selected_target != null:
				_on_dispatch_requested(hud.selected_percent)
		elif event.keycode == KEY_U:
			_on_upgrade_requested()
		elif event.keycode == KEY_T:
			_on_recruit_requested()
		elif event.keycode == KEY_R:
			weather_manager.toggle_weather()
		elif event.keycode == KEY_1:
			hud._set_percent(0.25)
		elif event.keycode == KEY_2:
			hud._set_percent(0.50)
		elif event.keycode == KEY_3:
			hud._set_percent(0.75)
		elif event.keycode == KEY_4:
			hud._set_percent(1.00)

func _find_castle_near_screen(screen_pos: Vector2, max_dist: float = 65.0) -> Castle:
	var cam = strategy_camera.camera
	if not cam:
		return null
	var closest: Castle = null
	var min_dist = max_dist

	for cid in castles:
		var c = castles[cid] as Castle
		if not cam.is_position_behind(c.position):
			var sp = cam.unproject_position(c.position + Vector3(0, 1.8, 0))
			var d = screen_pos.distance_to(sp)
			if d < min_dist:
				min_dist = d
				closest = c
	return closest

func _select_source_castle(c: Castle) -> void:
	if selected_source != null:
		selected_source.set_selected(false)
	selected_source = c
	selected_source.set_selected(true)
	hud.update_selected_castle(selected_source, player_gold)
	hud.update_target_castle(selected_target, selected_source)

func _select_target_castle(c: Castle) -> void:
	if selected_target != null and selected_target != selected_source:
		selected_target.set_targeted(false)
	selected_target = c
	selected_target.set_targeted(true)
	hud.update_target_castle(selected_target, selected_source)

func _parse_web_params() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("""
			window.godotSetCam = function(name) { window.__godot_cam = name; };
			window.godotDispatch = function(team, src, dst, pct) { window.__godot_order = [team, src, dst, pct]; };
			window.godotToggleWeather = function() { window.__godot_weather = true; };
			window.godotSetQuality = function(q) { window.__godot_quality = q; };
		""")
		var search_str = str(JavaScriptBridge.eval("window.location.search || ''"))
		if "quality=low" in search_str:
			apply_quality("low")
		elif "quality=med" in search_str:
			apply_quality("medium")
		elif "quality=high" in search_str:
			apply_quality("high")
		else:
			apply_quality("auto")

		if "skipintro=1" in search_str:
			strategy_camera.skip_intro()
		if "weather=rain" in search_str:
			weather_manager.apply_weather("rain")
		if "speed=2" in search_str:
			_on_speed_changed(2.0)
		if "cam=" in search_str:
			for c in ["overview", "azurehold", "violet_crown", "citadel", "standard_fort", "cavalry_stable", "ranged_fort", "infantry", "cavalry", "battle", "capture"]:
				if "cam=" + c in search_str:
					strategy_camera.set_camera_preset(c)

		if "demo_infantry=1" in search_str:
			dispatch_army("blue", 0, 6, 0.5)
			if armies.size() > 0:
				var a = armies.back()
				if a.path_waypoints.size() >= 2:
					var p1 = a.path_waypoints[0]
					var p2 = a.path_waypoints[1]
					a.position = p1.lerp(p2, 0.48)
					a.look_at(p2, Vector3.UP)
		elif "demo_cavalry=1" in search_str:
			dispatch_army("blue", 19, 14, 0.8)
			if armies.size() > 0:
				var a = armies.back()
				if a.path_waypoints.size() >= 2:
					var p1 = a.path_waypoints[0]
					var p2 = a.path_waypoints[1]
					a.position = p1.lerp(p2, 0.42)
					a.look_at(p2, Vector3.UP)
		elif "demo_battle=1" in search_str:
			dispatch_army("blue", 6, 15, 0.7)
			dispatch_army("red", 7, 15, 0.7)
			if armies.size() >= 2:
				var a1 = armies[armies.size() - 2]
				var a2 = armies[armies.size() - 1]
				if a1.path_waypoints.size() >= 2:
					var p1 = a1.path_waypoints[0]
					var p2 = a1.path_waypoints[a1.path_waypoints.size() - 1]
					a1.position = p1.lerp(p2, 0.46)
					a2.position = a1.position + Vector3(1.4, 0, 0.2)
					a1.look_at(a2.position, Vector3.UP)
					a2.look_at(a1.position, Vector3.UP)
				battle_manager.start_road_battle(a1, a2)

		elif "demo_capture=1" in search_str:
			dispatch_army("blue", 0, 2, 0.9)
		elif "demo=1" in search_str:
			dispatch_army("blue", 0, 6, 0.5)
			dispatch_army("blue", 19, 14, 0.7)
			dispatch_army("red", 1, 7, 0.5)


func apply_quality(quality_mode: String) -> void:
	current_quality = quality_mode.to_lower()
	if current_quality == "auto":
		var vp_width = get_viewport().get_visible_rect().size.x
		if vp_width < 768.0:
			effective_quality = "medium"
		else:
			effective_quality = "high"
	else:
		effective_quality = current_quality

	if weather_manager:
		weather_manager.set_quality(effective_quality)
	if env_decor:
		env_decor.set_quality(effective_quality)
	if hud:
		hud.update_quality_display(current_quality)

