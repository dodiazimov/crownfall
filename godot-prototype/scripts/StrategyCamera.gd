class_name StrategyCamera
extends Node3D

signal intro_finished

@export var pan_speed: float = 35.0
@export var zoom_speed: float = 6.0
@export var min_zoom: float = 14.0
@export var max_zoom: float = 65.0
@export var bounds_min: Vector2 = Vector2(-50.0, -36.0)
@export var bounds_max: Vector2 = Vector2(50.0, 36.0)

var camera: Camera3D
var current_pan: Vector2 = Vector2(-25.0, 0.0) # Start near Azurehold
var target_pan: Vector2 = Vector2(-25.0, 0.0)
var current_zoom: float = 34.0
var target_zoom: float = 34.0
var is_panning_enabled: bool = true

# Mouse / Touch state
var is_dragging: bool = false
var drag_start_mouse: Vector2 = Vector2.ZERO
var drag_start_pan: Vector2 = Vector2.ZERO
var touch_points: Dictionary = {}
var initial_pinch_dist: float = 0.0
var initial_pinch_zoom: float = 34.0

# Cinematic Intro
var in_intro: bool = true
var intro_time: float = 0.0
const INTRO_DURATION: float = 2.8

func _ready() -> void:
	camera = Camera3D.new()
	camera.fov = 48.0
	camera.current = true
	add_child(camera)

	var vp_size = get_viewport().get_visible_rect().size
	var is_portrait = vp_size.x < vp_size.y
	var default_zoom = 68.0 if is_portrait else 52.0

	# Start cinematic overview showing the entire island realm
	position = Vector3(0, 0, 0)
	current_zoom = default_zoom + 18.0
	current_pan = Vector2(0, 8.0)
	target_pan = Vector2(0.0, 1.0)
	target_zoom = default_zoom
	_update_camera_transform()

func _process(delta: float) -> void:
	if in_intro:
		intro_time += delta
		var t = clamp(intro_time / INTRO_DURATION, 0.0, 1.0)
		# Smooth cubic ease-out
		var ease_t = 1.0 - pow(1.0 - t, 3.0)
		current_pan = Vector2(0, 8.0).lerp(target_pan, ease_t)
		current_zoom = lerp(target_zoom + 18.0, target_zoom, ease_t)
		_update_camera_transform()

		if intro_time >= INTRO_DURATION:
			skip_intro()
		return

	# Handle keyboard pan
	var input_vec = Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		input_vec.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		input_vec.y += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		input_vec.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		input_vec.x += 1.0

	if input_vec.length_squared() > 0.0:
		var speed_factor = (current_zoom / 30.0) * pan_speed
		target_pan += input_vec.normalized() * speed_factor * delta
		_clamp_target_pan()

	# Smooth lerp
	current_pan = current_pan.lerp(target_pan, 12.0 * delta)
	current_zoom = lerp(current_zoom, target_zoom, 10.0 * delta)

	_update_camera_transform()

func _update_camera_transform() -> void:
	position = Vector3(current_pan.x, 0, current_pan.y)
	
	# High-angle bird's-eye perspective (~56 degrees) matching reference/map.png
	var cam_y = current_zoom * 0.82
	var cam_z = current_zoom * 0.56
	camera.position = Vector3(0, cam_y, cam_z)
	camera.look_at(global_position + Vector3(0, 1.2, 0), Vector3.UP)

func skip_intro() -> void:
	if in_intro:
		in_intro = false
		current_pan = target_pan
		current_zoom = target_zoom
		_update_camera_transform()
		emit_signal("intro_finished")

func _clamp_target_pan() -> void:
	target_pan.x = clamp(target_pan.x, bounds_min.x, bounds_max.x)
	target_pan.y = clamp(target_pan.y, bounds_min.y, bounds_max.y)

func _unhandled_input(event: InputEvent) -> void:
	if in_intro and (event is InputEventMouseButton or event is InputEventKey):
		if event.is_pressed():
			skip_intro()
			return

	# Mouse wheel zoom
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			target_zoom = clamp(target_zoom - zoom_speed, min_zoom, max_zoom)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			target_zoom = clamp(target_zoom + zoom_speed, min_zoom, max_zoom)
		elif event.button_index in [MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_RIGHT]:
			if event.pressed:
				is_dragging = true
				drag_start_mouse = event.position
				drag_start_pan = target_pan
			else:
				is_dragging = false

	# Mouse drag pan
	elif event is InputEventMouseMotion and is_dragging:
		if is_panning_enabled:
			var delta_px = event.position - drag_start_mouse
			var factor = (current_zoom / 650.0)
			target_pan = drag_start_pan - Vector2(delta_px.x, delta_px.y) * factor
			_clamp_target_pan()

	# Mobile Touch Pan & Pinch-to-zoom
	elif event is InputEventScreenTouch:
		if event.pressed:
			touch_points[event.index] = event.position
			if touch_points.size() == 1:
				drag_start_mouse = event.position
				drag_start_pan = target_pan
			elif touch_points.size() == 2:
				var pts = touch_points.values()
				initial_pinch_dist = pts[0].distance_to(pts[1])
				initial_pinch_zoom = target_zoom
		else:
			touch_points.erase(event.index)

	elif event is InputEventScreenDrag:
		touch_points[event.index] = event.position
		if touch_points.size() == 1:
			if is_panning_enabled:
				var delta_px = event.position - drag_start_mouse
				var factor = (current_zoom / 650.0)
				target_pan = drag_start_pan - Vector2(delta_px.x, delta_px.y) * factor
				_clamp_target_pan()
		elif touch_points.size() == 2:
			var pts = touch_points.values()
			var cur_dist = pts[0].distance_to(pts[1])
			if initial_pinch_dist > 5.0:
				var scale_ratio = initial_pinch_dist / cur_dist
				target_zoom = clamp(initial_pinch_zoom * scale_ratio, min_zoom, max_zoom)

func focus_on_pos(pos: Vector3, zoom_level: float = 24.0) -> void:
	target_pan = Vector2(pos.x, pos.z)
	target_zoom = clamp(zoom_level, min_zoom, max_zoom)
	_clamp_target_pan()

# Raycast to ground plane at mouse position
func get_ground_click_pos(mouse_pos: Vector2) -> Vector3:
	if not camera:
		return Vector3.ZERO
	var from = camera.project_ray_origin(mouse_pos)
	var dir = camera.project_ray_normal(mouse_pos)
	var plane = Plane(Vector3.UP, 0.0)
	var hit = plane.intersects_ray(from, dir)
	return hit if hit != null else Vector3.ZERO

func set_camera_preset(preset: String) -> void:
	in_intro = false
	match preset:
		"overview":
			target_pan = Vector2(0.0, 3.5)
			target_zoom = 48.0
		"azurehold":
			target_pan = Vector2(-40.5, -0.2)
			target_zoom = 22.0
		"citadel", "violet_crown":
			target_pan = Vector2(0.0, 5.0)
			target_zoom = 22.0
		"standard_fort":
			target_pan = Vector2(-25.5, 2.0)
			target_zoom = 18.0
		"cavalry_stable":
			target_pan = Vector2(-26.5, 26.0)
			target_zoom = 18.0
		"ranged_fort":
			target_pan = Vector2(-19.5, 14.5)
			target_zoom = 18.0
		"infantry":
			target_pan = Vector2(-33.3, 0.85)
			target_zoom = 14.0
		"cavalry":
			target_pan = Vector2(-20.6, 23.5)
			target_zoom = 14.0
		"battle":
			target_pan = Vector2(-13.8, 3.4)
			target_zoom = 14.0
		"capture":
			target_pan = Vector2(-32.0, -15.5)
			target_zoom = 18.0
	current_pan = target_pan
	current_zoom = target_zoom
	_update_camera_transform()
