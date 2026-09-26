class_name WeatherManager
extends Node3D

signal weather_changed(weather_id: String)

@export var current_weather: String = "clear" # "clear" or "rain"

var sun_light: DirectionalLight3D
var world_env: WorldEnvironment
var rain_particles: CPUParticles3D
var lightning_timer: float = 0.0

var camera_ref: Node3D

func init_weather(cam: Node3D) -> void:
	camera_ref = cam
	_setup_lighting()
	_setup_environment()
	_setup_rain_particles()
	apply_weather(current_weather)

func _setup_lighting() -> void:
	sun_light = DirectionalLight3D.new()
	sun_light.name = "SunLight"
	# Low-angle chiaroscuro historical lighting casting dramatic long shadows across cliffs
	sun_light.rotation_degrees = Vector3(-42.0, 48.0, 0.0)
	sun_light.light_energy = 1.55
	sun_light.light_color = Color(0.98, 0.88, 0.74) # Warm golden-amber sunbeam
	sun_light.shadow_enabled = true
	sun_light.directional_shadow_max_distance = 140.0
	sun_light.shadow_bias = 0.05
	add_child(sun_light)

func _setup_environment() -> void:
	world_env = WorldEnvironment.new()
	world_env.name = "WorldEnvironment"

	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	# Deep stormy midnight atmosphere matching reference/map.png
	env.background_color = Color(0.015, 0.030, 0.052)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.10, 0.15, 0.22) # Cool deep navy ambient fill
	env.ambient_light_energy = 0.85

	# Brooding distance sea fog encircling the outer ocean
	env.fog_enabled = true
	env.fog_light_color = Color(0.045, 0.080, 0.125)
	env.fog_density = 0.005
	env.fog_sky_affect = 0.8
	env.fog_depth_begin = 52.0
	env.fog_depth_end = 130.0

	world_env.environment = env
	add_child(world_env)

func _setup_rain_particles() -> void:
	rain_particles = CPUParticles3D.new()
	rain_particles.name = "RainParticles"
	rain_particles.emitting = false
	rain_particles.amount = 450
	rain_particles.lifetime = 1.1
	rain_particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	rain_particles.emission_box_extents = Vector3(45.0, 1.0, 35.0)
	rain_particles.direction = Vector3(-0.35, -1.0, 0.15).normalized()
	rain_particles.spread = 4.0
	rain_particles.initial_velocity_min = 32.0
	rain_particles.initial_velocity_max = 42.0
	rain_particles.gravity = Vector3(0, -9.8, 0)

	var drop_mesh = BoxMesh.new()
	drop_mesh.size = Vector3(0.035, 0.85, 0.035)
	var drop_mat = StandardMaterial3D.new()
	drop_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	drop_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	drop_mat.albedo_color = Color(0.70, 0.82, 0.95, 0.40)
	drop_mesh.material = drop_mat
	rain_particles.mesh = drop_mesh
	add_child(rain_particles)

func _process(delta: float) -> void:
	if camera_ref and rain_particles and rain_particles.emitting:
		rain_particles.position = Vector3(camera_ref.position.x, 24.0, camera_ref.position.z)

		# Occasional lightning flash in heavy rain
		lightning_timer -= delta
		if lightning_timer <= 0.0:
			lightning_timer = randf_range(6.0, 14.0)
			_trigger_lightning()

func _trigger_lightning() -> void:
	if not sun_light or current_weather != "rain":
		return
	var orig_energy = sun_light.light_energy
	var tw = create_tween()
	tw.tween_property(sun_light, "light_energy", 3.2, 0.08)
	tw.tween_property(sun_light, "light_energy", 0.4, 0.08)
	tw.tween_property(sun_light, "light_energy", 2.2, 0.06)
	tw.tween_property(sun_light, "light_energy", orig_energy, 0.15)

func toggle_weather() -> void:
	if current_weather == "clear":
		apply_weather("rain")
	else:
		apply_weather("clear")

func apply_weather(w_type: String) -> void:
	current_weather = w_type
	if not sun_light or not world_env:
		return

	var env = world_env.environment

	if current_weather == "rain":
		# Heavy Storm: dark, moody, downpour
		sun_light.light_energy = 0.50
		sun_light.light_color = Color(0.68, 0.74, 0.82)
		if env:
			env.background_color = Color(0.008, 0.016, 0.028)
			env.ambient_light_color = Color(0.04, 0.07, 0.12)
			env.ambient_light_energy = 0.55
			env.fog_density = 0.014
			env.fog_light_color = Color(0.015, 0.03, 0.05)
		rain_particles.emitting = true
	else:
		# Grim Medieval Clear: moody chiaroscuro sunlight
		sun_light.light_energy = 1.65
		sun_light.light_color = Color(0.98, 0.88, 0.74)
		if env:
			env.background_color = Color(0.015, 0.032, 0.058)
			env.ambient_light_color = Color(0.08, 0.13, 0.20)
			env.ambient_light_energy = 0.75
			env.fog_density = 0.007
			env.fog_light_color = Color(0.025, 0.052, 0.092)
		rain_particles.emitting = false

	emit_signal("weather_changed", current_weather)

func get_march_speed_mod() -> float:
	if current_weather == "rain":
		return 0.75 # Muddy roads (-25% speed)
	return 1.0

func set_quality(q: String) -> void:
	if not sun_light:
		return
	var env = world_env.environment if world_env else null
	if q == "low":
		sun_light.shadow_enabled = false
		if env:
			env.fog_enabled = false
		if rain_particles:
			rain_particles.amount = 120
	elif q == "medium":
		sun_light.shadow_enabled = true
		sun_light.directional_shadow_max_distance = 100.0
		if env:
			env.fog_enabled = true
			env.fog_density = 0.005
		if rain_particles:
			rain_particles.amount = 260
	elif q == "high":
		sun_light.shadow_enabled = true
		sun_light.directional_shadow_max_distance = 150.0
		if env:
			env.fog_enabled = true
			env.fog_density = 0.007
		if rain_particles:
			rain_particles.amount = 450

