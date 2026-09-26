class_name HUD
extends CanvasLayer

const GameData = preload("res://scripts/GameData.gd")
const Castle = preload("res://scripts/Castle.gd")

signal dispatch_requested(percent: float)
signal upgrade_requested
signal recruit_requested
signal weather_toggle_requested
signal quality_changed(quality_mode: String)
signal speed_changed(speed_mult: float)
signal restart_requested

# UI Elements
var top_bar: PanelContainer
var lbl_gold: Label
var lbl_power: Label
var bar_power_player: ProgressBar
var lbl_commander: Label
var btn_weather: Button
var btn_quality: Button
var current_quality: String = "AUTO"
var btn_speed_1x: Button
var btn_speed_2x: Button
var btn_pause: Button
var lbl_time: Label

var bottom_dock: PanelContainer
var card_selected: VBoxContainer
var lbl_sel_name: Label
var lbl_sel_type: Label
var lbl_sel_garrison: Label
var lbl_sel_comp: Label

var btn_upgrade: Button
var btn_recruit: Button

var card_target: VBoxContainer
var lbl_tar_name: Label
var lbl_tar_garrison: Label
var lbl_tar_odds: Label

var btn_p25: Button
var btn_p50: Button
var btn_p75: Button
var btn_p100: Button
var btn_attack: Button

var selected_percent: float = 0.5
var current_source_castle: Castle = null
var current_target_castle: Castle = null
var current_player_gold: int = 150

# End match modal
var modal_end: PanelContainer
var lbl_end_title: Label
var lbl_end_desc: Label
var btn_play_again: Button

# Intro hint
var lbl_intro_hint: Label

func _ready() -> void:
	_create_ui_layout()
	_apply_styling()
	get_viewport().size_changed.connect(_on_viewport_resized)
	_on_viewport_resized()

func _on_viewport_resized() -> void:
	var vp_size = get_viewport().get_visible_rect().size
	if vp_size.x < 768.0:
		# Compact Mobile Layout
		top_bar.offset_left = 6.0
		top_bar.offset_right = -6.0
		top_bar.offset_top = 6.0
		top_bar.offset_bottom = 54.0

		bottom_dock.anchor_left = 0.0
		bottom_dock.anchor_right = 1.0
		bottom_dock.offset_left = 6.0
		bottom_dock.offset_right = -6.0
		bottom_dock.offset_top = -140.0
		bottom_dock.offset_bottom = -8.0

		lbl_commander.visible = false
	else:
		# Desktop / Tablet Landscape Layout
		top_bar.offset_left = 16.0
		top_bar.offset_right = -16.0
		top_bar.offset_top = 10.0
		top_bar.offset_bottom = 60.0

		bottom_dock.anchor_left = 0.5
		bottom_dock.anchor_right = 0.5
		bottom_dock.offset_left = -480.0
		bottom_dock.offset_right = 480.0
		bottom_dock.offset_top = -128.0
		bottom_dock.offset_bottom = -12.0

		lbl_commander.visible = true

func _create_ui_layout() -> void:
	# ================= Dark Moody Cinematic Vignette =================
	var vignette = TextureRect.new()
	vignette.name = "VignetteOverlay"
	vignette.anchor_left = 0.0
	vignette.anchor_right = 1.0
	vignette.anchor_top = 0.0
	vignette.anchor_bottom = 1.0
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vignette.expand_mode = TextureRect.EXPAND_IGNORE_SIZE

	var grad_tex = GradientTexture2D.new()
	grad_tex.width = 512
	grad_tex.height = 512
	grad_tex.fill = GradientTexture2D.FILL_RADIAL
	grad_tex.fill_from = Vector2(0.5, 0.5)
	grad_tex.fill_to = Vector2(0.95, 0.95)
	var grad = Gradient.new()
	grad.set_color(0, Color(0.0, 0.0, 0.0, 0.0))
	grad.set_color(1, Color(0.012, 0.024, 0.042, 0.65))
	grad_tex.gradient = grad
	vignette.texture = grad_tex
	add_child(vignette)

	# ================= Top HUD Bar =================
	top_bar = PanelContainer.new()
	top_bar.anchor_left = 0.0
	top_bar.anchor_right = 1.0
	top_bar.anchor_top = 0.0
	top_bar.anchor_bottom = 0.0
	top_bar.offset_left = 16.0
	top_bar.offset_right = -16.0
	top_bar.offset_top = 10.0
	top_bar.offset_bottom = 60.0
	add_child(top_bar)

	var top_h = HBoxContainer.new()
	top_h.alignment = BoxContainer.ALIGNMENT_CENTER
	top_h.add_theme_constant_override("separation", 16)
	top_bar.add_child(top_h)

	# Faction / Commander
	var comm_v = VBoxContainer.new()
	var comm_title = Label.new()
	comm_title.text = "BLUE FACTION"
	comm_title.add_theme_font_size_override("font_size", 9)
	comm_title.add_theme_color_override("font_color", Color(0.5, 0.7, 0.95))
	comm_v.add_child(comm_title)

	lbl_commander = Label.new()
	lbl_commander.text = "Archduke of Azurehold"
	lbl_commander.add_theme_font_size_override("font_size", 14)
	lbl_commander.add_theme_color_override("font_color", Color(0.93, 0.90, 0.84))
	comm_v.add_child(lbl_commander)
	top_h.add_child(comm_v)

	# Gold
	var gold_v = VBoxContainer.new()
	var gold_title = Label.new()
	gold_title.text = "TREASURY"
	gold_title.add_theme_font_size_override("font_size", 9)
	gold_title.add_theme_color_override("font_color", Color(0.95, 0.8, 0.3))
	gold_v.add_child(gold_title)

	lbl_gold = Label.new()
	lbl_gold.text = "OLTIN: 150 (+12/s)"
	lbl_gold.add_theme_font_size_override("font_size", 15)
	lbl_gold.add_theme_color_override("font_color", Color(1.0, 0.9, 0.4))
	gold_v.add_child(lbl_gold)
	top_h.add_child(gold_v)

	# Military Balance Bar
	var power_v = VBoxContainer.new()
	power_v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	power_v.custom_minimum_size = Vector2(160, 0)
	lbl_power = Label.new()
	lbl_power.text = "BLUE 420 vs 420 RED"
	lbl_power.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_power.add_theme_font_size_override("font_size", 10)
	lbl_power.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	power_v.add_child(lbl_power)

	bar_power_player = ProgressBar.new()
	bar_power_player.min_value = 0.0
	bar_power_player.max_value = 100.0
	bar_power_player.value = 50.0
	bar_power_player.show_percentage = false
	bar_power_player.custom_minimum_size = Vector2(0, 8)
	power_v.add_child(bar_power_player)
	top_h.add_child(power_v)

	# Weather Toggle
	btn_weather = Button.new()
	btn_weather.text = "HAVO: OCHIQ"
	btn_weather.custom_minimum_size = Vector2(95, 32)
	btn_weather.pressed.connect(func(): emit_signal("weather_toggle_requested"))
	top_h.add_child(btn_weather)

	# Graphics Quality (LOW, MED, HIGH, AUTO)
	btn_quality = Button.new()
	btn_quality.text = "SIFAT: AUTO"
	btn_quality.custom_minimum_size = Vector2(90, 32)
	btn_quality.pressed.connect(_on_quality_button_pressed)
	top_h.add_child(btn_quality)



	# Time / Speed controls
	var speed_h = HBoxContainer.new()
	speed_h.add_theme_constant_override("separation", 4)

	btn_speed_1x = Button.new()
	btn_speed_1x.text = "1x"
	btn_speed_1x.custom_minimum_size = Vector2(34, 32)
	btn_speed_1x.pressed.connect(func(): emit_signal("speed_changed", 1.0))
	speed_h.add_child(btn_speed_1x)

	btn_speed_2x = Button.new()
	btn_speed_2x.text = "2x"
	btn_speed_2x.custom_minimum_size = Vector2(34, 32)
	btn_speed_2x.pressed.connect(func(): emit_signal("speed_changed", 2.0))
	speed_h.add_child(btn_speed_2x)

	btn_pause = Button.new()
	btn_pause.text = "||"
	btn_pause.custom_minimum_size = Vector2(30, 32)
	btn_pause.pressed.connect(func(): emit_signal("speed_changed", 0.0))
	speed_h.add_child(btn_pause)

	lbl_time = Label.new()
	lbl_time.text = "00:00"
	lbl_time.add_theme_font_size_override("font_size", 13)
	speed_h.add_child(lbl_time)
	top_h.add_child(speed_h)

	# ================= Bottom Command Dock =================
	bottom_dock = PanelContainer.new()
	bottom_dock.anchor_left = 0.5
	bottom_dock.anchor_right = 0.5
	bottom_dock.anchor_top = 1.0
	bottom_dock.anchor_bottom = 1.0
	bottom_dock.offset_left = -480.0
	bottom_dock.offset_right = 480.0
	bottom_dock.offset_top = -128.0
	bottom_dock.offset_bottom = -12.0
	add_child(bottom_dock)

	var dock_h = HBoxContainer.new()
	dock_h.alignment = BoxContainer.ALIGNMENT_CENTER
	dock_h.add_theme_constant_override("separation", 14)
	bottom_dock.add_child(dock_h)

	# Selected Castle Card + Quick Actions (Upgrade & Recruit)
	card_selected = VBoxContainer.new()
	card_selected.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_selected.custom_minimum_size = Vector2(180, 0)

	var sel_header_h = HBoxContainer.new()
	lbl_sel_name = Label.new()
	lbl_sel_name.text = "Qal'ani tanlang"
	lbl_sel_name.add_theme_font_size_override("font_size", 15)
	lbl_sel_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sel_header_h.add_child(lbl_sel_name)

	lbl_sel_garrison = Label.new()
	lbl_sel_garrison.text = "--"
	lbl_sel_garrison.add_theme_font_size_override("font_size", 14)
	lbl_sel_garrison.add_theme_color_override("font_color", Color(0.4, 0.85, 1.0))
	sel_header_h.add_child(lbl_sel_garrison)
	card_selected.add_child(sel_header_h)

	lbl_sel_type = Label.new()
	lbl_sel_type.text = "O'z qal'angizni bosing yoki suring"
	lbl_sel_type.add_theme_font_size_override("font_size", 11)
	lbl_sel_type.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	card_selected.add_child(lbl_sel_type)

	# Action buttons row: Upgrade + Recruit
	var action_h = HBoxContainer.new()
	action_h.add_theme_constant_override("separation", 6)

	btn_upgrade = Button.new()
	btn_upgrade.text = "KUCHAYTIRISH"
	btn_upgrade.custom_minimum_size = Vector2(110, 36)
	btn_upgrade.disabled = true
	btn_upgrade.pressed.connect(func(): emit_signal("upgrade_requested"))
	action_h.add_child(btn_upgrade)

	btn_recruit = Button.new()
	btn_recruit.text = "+25 ASKAR (40g)"
	btn_recruit.custom_minimum_size = Vector2(120, 36)
	btn_recruit.disabled = true
	btn_recruit.pressed.connect(func(): emit_signal("recruit_requested"))
	action_h.add_child(btn_recruit)

	card_selected.add_child(action_h)
	dock_h.add_child(card_selected)

	# Dispatch Percent Buttons (25%, 50%, 75%, 100%)
	var frac_v = VBoxContainer.new()
	var frac_title = Label.new()
	frac_title.text = "MIQDOR (FOIZ)"
	frac_title.add_theme_font_size_override("font_size", 9)
	frac_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	frac_title.add_theme_color_override("font_color", Color(0.8, 0.75, 0.6))
	frac_v.add_child(frac_title)

	var frac_h = HBoxContainer.new()
	frac_h.add_theme_constant_override("separation", 4)

	btn_p25 = Button.new()
	btn_p25.text = "25%"
	btn_p25.custom_minimum_size = Vector2(44, 38)
	btn_p25.pressed.connect(func(): _set_percent(0.25))
	frac_h.add_child(btn_p25)

	btn_p50 = Button.new()
	btn_p50.text = "50%"
	btn_p50.custom_minimum_size = Vector2(44, 38)
	btn_p50.pressed.connect(func(): _set_percent(0.50))
	frac_h.add_child(btn_p50)

	btn_p75 = Button.new()
	btn_p75.text = "75%"
	btn_p75.custom_minimum_size = Vector2(44, 38)
	btn_p75.pressed.connect(func(): _set_percent(0.75))
	frac_h.add_child(btn_p75)

	btn_p100 = Button.new()
	btn_p100.text = "MAX"
	btn_p100.custom_minimum_size = Vector2(48, 38)
	btn_p100.pressed.connect(func(): _set_percent(1.00))
	frac_h.add_child(btn_p100)
	frac_v.add_child(frac_h)
	dock_h.add_child(frac_v)

	# Target Castle Card & Dispatch CTA
	card_target = VBoxContainer.new()
	card_target.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_target.custom_minimum_size = Vector2(170, 0)

	lbl_tar_name = Label.new()
	lbl_tar_name.text = "Nishon: Tanlanmagan"
	lbl_tar_name.add_theme_font_size_override("font_size", 14)
	card_target.add_child(lbl_tar_name)

	lbl_tar_odds = Label.new()
	lbl_tar_odds.text = "Boshqa qal'aga suring yoki bosing"
	lbl_tar_odds.add_theme_font_size_override("font_size", 11)
	lbl_tar_odds.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	card_target.add_child(lbl_tar_odds)

	# Action Button [ MARCH / ATTACK ]
	btn_attack = Button.new()
	btn_attack.text = "YUBORISH (50%)"
	btn_attack.custom_minimum_size = Vector2(160, 40)
	btn_attack.disabled = true
	btn_attack.pressed.connect(func(): emit_signal("dispatch_requested", selected_percent))
	card_target.add_child(btn_attack)

	dock_h.add_child(card_target)

	# Intro Hint
	lbl_intro_hint = Label.new()
	lbl_intro_hint.text = "VERDANT ISLES — 3D MOBIL PROTOTIP\nQal'angizni bosing va nishonga suring (Swipe/Drag)"
	lbl_intro_hint.anchor_left = 0.5
	lbl_intro_hint.anchor_right = 0.5
	lbl_intro_hint.anchor_top = 0.74
	lbl_intro_hint.anchor_bottom = 0.74
	lbl_intro_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_intro_hint.add_theme_font_size_override("font_size", 15)
	lbl_intro_hint.add_theme_color_override("font_color", Color(0.95, 0.92, 0.85))
	add_child(lbl_intro_hint)

	# ================= Victory / Defeat Modal =================
	modal_end = PanelContainer.new()
	modal_end.anchor_left = 0.5
	modal_end.anchor_right = 0.5
	modal_end.anchor_top = 0.5
	modal_end.anchor_bottom = 0.5
	modal_end.offset_left = -220.0
	modal_end.offset_right = 220.0
	modal_end.offset_top = -140.0
	modal_end.offset_bottom = 140.0
	modal_end.visible = false
	add_child(modal_end)

	var modal_v = VBoxContainer.new()
	modal_v.alignment = BoxContainer.ALIGNMENT_CENTER
	modal_v.add_theme_constant_override("separation", 16)
	modal_end.add_child(modal_v)

	lbl_end_title = Label.new()
	lbl_end_title.text = "G'ALABA!"
	lbl_end_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_end_title.add_theme_font_size_override("font_size", 32)
	modal_v.add_child(lbl_end_title)

	lbl_end_desc = Label.new()
	lbl_end_desc.text = "The Verdant Isles to'liq sizning toj hukumronligingiz ostiga o'tdi!"
	lbl_end_desc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_end_desc.autowrap_mode = TextServer.AUTOWRAP_WORD
	modal_v.add_child(lbl_end_desc)

	btn_play_again = Button.new()
	btn_play_again.text = "QAYTA O'YNASH"
	btn_play_again.custom_minimum_size = Vector2(160, 46)
	btn_play_again.pressed.connect(func(): emit_signal("restart_requested"))
	modal_v.add_child(btn_play_again)

func _set_percent(pct: float) -> void:
	selected_percent = pct
	btn_p25.modulate = Color(0.65, 0.65, 0.65)
	btn_p50.modulate = Color(0.65, 0.65, 0.65)
	btn_p75.modulate = Color(0.65, 0.65, 0.65)
	btn_p100.modulate = Color(0.65, 0.65, 0.65)

	if pct == 0.25: btn_p25.modulate = Color(1.3, 1.2, 0.5)
	elif pct == 0.50: btn_p50.modulate = Color(1.3, 1.2, 0.5)
	elif pct == 0.75: btn_p75.modulate = Color(1.3, 1.2, 0.5)
	elif pct == 1.00: btn_p100.modulate = Color(1.3, 1.2, 0.5)

	var pct_str = str(int(selected_percent * 100)) + "%"
	if current_target_castle != null and current_source_castle != null:
		if current_target_castle.owner_id == "blue":
			btn_attack.text = "KUCHAYTIRISH (" + pct_str + ")"
		else:
			btn_attack.text = "YUBORISH (" + pct_str + ")"
	else:
		btn_attack.text = "YUBORISH (" + pct_str + ")"


func _apply_styling() -> void:
	var style_panel = StyleBoxFlat.new()
	style_panel.bg_color = Color(0.04, 0.08, 0.12, 0.94)
	style_panel.border_color = Color(0.72, 0.60, 0.38, 0.85) # Aged brass border
	style_panel.set_border_width_all(1)
	style_panel.set_corner_radius_all(6)
	style_panel.content_margin_left = 14
	style_panel.content_margin_right = 14
	style_panel.content_margin_top = 8
	style_panel.content_margin_bottom = 8

	top_bar.add_theme_stylebox_override("panel", style_panel)
	bottom_dock.add_theme_stylebox_override("panel", style_panel)
	modal_end.add_theme_stylebox_override("panel", style_panel)

	# Progress bar colors (Blue vs Red)
	var bar_bg = StyleBoxFlat.new()
	bar_bg.bg_color = Color(0.75, 0.20, 0.20) # Red
	bar_bg.set_corner_radius_all(2)
	var bar_fill = StyleBoxFlat.new()
	bar_fill.bg_color = Color(0.20, 0.45, 0.85) # Blue
	bar_fill.set_corner_radius_all(2)
	bar_power_player.add_theme_stylebox_override("background", bar_bg)
	bar_power_player.add_theme_stylebox_override("fill", bar_fill)

	# Button styles
	var btn_gold_style = StyleBoxFlat.new()
	btn_gold_style.bg_color = Color(0.18, 0.14, 0.08, 0.9)
	btn_gold_style.border_color = Color(0.85, 0.70, 0.35)
	btn_gold_style.set_border_width_all(1)
	btn_gold_style.set_corner_radius_all(4)
	btn_upgrade.add_theme_stylebox_override("normal", btn_gold_style)
	btn_recruit.add_theme_stylebox_override("normal", btn_gold_style)

	_set_percent(0.50)

func hide_intro_hint() -> void:
	if lbl_intro_hint:
		lbl_intro_hint.visible = false

func update_top_hud(gold: int, income: int, blue_troops: int, red_troops: int, weather_name: String, time_sec: float) -> void:
	current_player_gold = gold
	lbl_gold.text = "OLTIN: " + str(gold) + " (+" + str(income) + "/s)"
	var total = max(1, blue_troops + red_troops)
	var pct = float(blue_troops) / float(total) * 100.0
	bar_power_player.value = pct
	lbl_power.text = "BLUE " + str(blue_troops) + " vs " + str(red_troops) + " RED"

	var m = int(time_sec / 60.0)
	var s = int(time_sec) % 60
	lbl_time.text = "%02d:%02d" % [m, s]

	btn_weather.text = "HAVO: YOMG'IR" if weather_name == "rain" else "HAVO: OCHIQ"

	# Refresh upgrade & recruit button disabled states with live gold
	if current_source_castle != null and current_source_castle.owner_id == "blue":
		var up_cost = current_source_castle.get_upgrade_cost()
		if up_cost > 0:
			btn_upgrade.text = "KUCHAYTIRISH\n(%dg)" % up_cost
			btn_upgrade.disabled = (gold < up_cost)
		else:
			btn_upgrade.text = "MAX DARAJA"
			btn_upgrade.disabled = true
		btn_recruit.disabled = (gold < 40)

func update_selected_castle(castle: Castle, gold: int = -1) -> void:
	current_source_castle = castle
	if gold >= 0:
		current_player_gold = gold

	if castle == null:
		lbl_sel_name.text = "Qal'ani tanlang"
		lbl_sel_type.text = "O'z qal'angizni bosing yoki suring"
		lbl_sel_garrison.text = "--"
		btn_upgrade.disabled = true
		btn_recruit.disabled = true
		btn_upgrade.visible = false
		btn_recruit.visible = false
		btn_attack.disabled = true
		return

	var role_info = GameData.CASTLE_TYPES.get(castle.castle_type, {})
	var prefix = ""
	if castle.level == 2: prefix = "[Lv.2] "
	elif castle.level == 3: prefix = "[Lv.3] "

	lbl_sel_name.text = prefix + castle.castle_name
	lbl_sel_type.text = str(role_info.get("name", "Garrison")) + " · " + str(role_info.get("role", "Military"))
	lbl_sel_garrison.text = "Garnizon: " + str(castle.troops) + "/" + str(castle.max_troops)

	if castle.owner_id == "blue":
		btn_upgrade.visible = true
		btn_recruit.visible = true
		var cost = castle.get_upgrade_cost()
		if cost > 0:
			btn_upgrade.text = "KUCHAYTIRISH\n(%dg)" % cost
			btn_upgrade.disabled = (current_player_gold < cost)
		else:
			btn_upgrade.text = "MAX DARAJA"
			btn_upgrade.disabled = true

		btn_recruit.text = "+25 ASKAR\n(40g)"
		btn_recruit.disabled = (current_player_gold < 40)
	else:
		btn_upgrade.visible = false
		btn_recruit.visible = false

	_check_attack_button()

func update_target_castle(target: Castle, source: Castle) -> void:
	current_target_castle = target
	if target == null:
		lbl_tar_name.text = "Nishon: Tanlanmagan"
		lbl_tar_odds.text = "Boshqa qal'aga suring yoki bosing"
		btn_attack.disabled = true
		return

	lbl_tar_name.text = "Nishon: " + target.castle_name
	var target_owner_label = "Dushman" if target.owner_id == "red" else ("O'zingizniki" if target.owner_id == "blue" else "Neytral")
	lbl_tar_odds.text = target_owner_label + " · Garnizon: " + str(target.troops)

	var pct_str = str(int(selected_percent * 100)) + "%"
	if source != null and source.owner_id == "blue":
		var send_cnt = int(float(source.troops) * selected_percent)
		if target.owner_id == "blue":
			btn_attack.text = "KUCHAYTIRISH (" + str(send_cnt) + ")"
			lbl_tar_odds.add_theme_color_override("font_color", Color(0.4, 0.85, 1.0))
		else:
			btn_attack.text = "YUBORISH (" + str(send_cnt) + ")"
			var ratio = float(send_cnt) / max(1.0, float(target.troops))
			if ratio > 1.4:
				lbl_tar_odds.add_theme_color_override("font_color", Color(0.4, 0.9, 0.4))
			elif ratio > 0.85:
				lbl_tar_odds.add_theme_color_override("font_color", Color(0.95, 0.8, 0.3))
			else:
				lbl_tar_odds.add_theme_color_override("font_color", Color(0.95, 0.35, 0.35))

	_check_attack_button()

func _check_attack_button() -> void:
	btn_attack.disabled = (current_source_castle == null or current_target_castle == null or current_source_castle == current_target_castle or current_source_castle.owner_id != "blue")

func _on_quality_button_pressed() -> void:
	if current_quality == "AUTO":
		current_quality = "HIGH"
	elif current_quality == "HIGH":
		current_quality = "MED"
	elif current_quality == "MED":
		current_quality = "LOW"
	else:
		current_quality = "AUTO"
	update_quality_display(current_quality)
	emit_signal("quality_changed", current_quality.to_lower())

func update_quality_display(q_str: String) -> void:
	current_quality = q_str.to_upper()
	if btn_quality:
		btn_quality.text = "SIFAT: " + current_quality


