class_name AudioController
extends Node

var players: Dictionary = {}

func _ready() -> void:
	_create_procedural_sounds()

func _create_procedural_sounds() -> void:
	# 1. Marching Drum Cadence
	_register_sound("march", _gen_drum_beat(0.2, 120.0))
	# 2. Cavalry Gallop Hoof Clop
	_register_sound("hooves", _gen_hoof_clop(0.18))
	# 3. Musket Fire Volley
	_register_sound("musket", _gen_musket_shot(0.35))
	# 4. Sword / Bayonet Clash
	_register_sound("clash", _gen_clash(0.25))
	# 5. Castle Capture Trumpet Fanfare
	_register_sound("capture", _gen_trumpet_fanfare(1.0))
	# 6. Gold Chime
	_register_sound("coin", _gen_coin_chime(0.25))
	# 7. Upgrade Fanfare
	_register_sound("upgrade", _gen_upgrade_fanfare(0.6))

func _register_sound(sname: String, stream: AudioStreamWAV) -> void:
	var player = AudioStreamPlayer.new()
	player.name = "Audio_" + sname
	player.stream = stream
	player.volume_db = -6.0
	add_child(player)
	players[sname] = player

func play_sfx(sname: String) -> void:
	if players.has(sname):
		var p = players[sname] as AudioStreamPlayer
		if p and not p.playing:
			p.play()

# Procedural 8-bit / 16-bit PCM WAV generation
func _gen_drum_beat(duration: float, freq: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var env = exp(-t * 22.0)
		var noise = (randf() * 2.0 - 1.0) * 0.4
		var tone = sin(t * freq * TAU) * 0.6
		var val = clamp((tone + noise) * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream

func _gen_hoof_clop(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var env = exp(-t * 30.0)
		var tone = sin(t * 320.0 * TAU) * 0.7 + sin(t * 180.0 * TAU) * 0.3
		var val = clamp(tone * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream

func _gen_musket_shot(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var env = exp(-t * 14.0)
		var noise = (randf() * 2.0 - 1.0)
		var val = clamp(noise * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream

func _gen_clash(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var env = exp(-t * 18.0)
		var metal = sin(t * 1850.0 * TAU) * 0.5 + sin(t * 2420.0 * TAU) * 0.4 + (randf() * 2.0 - 1.0) * 0.2
		var val = clamp(metal * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream

func _gen_trumpet_fanfare(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var freq = 440.0 # A4
		if t > 0.6: freq = 659.25 # E5
		elif t > 0.3: freq = 554.37 # C#5

		var env = clamp(1.0 - (t / duration) * 0.6, 0.0, 1.0)
		var brass = sin(t * freq * TAU) * 0.6 + sin(t * freq * 2.0 * TAU) * 0.3
		var val = clamp(brass * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream

func _gen_coin_chime(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var env = exp(-t * 14.0)
		var chime = sin(t * 1975.5 * TAU) * 0.6 + sin(t * 3951.0 * TAU) * 0.3
		var val = clamp(chime * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream

func _gen_upgrade_fanfare(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(samples * 2)

	for i in range(samples):
		var t = float(i) / float(sample_rate)
		var freq = 523.25 # C5
		if t > 0.4: freq = 1046.5 # C6
		elif t > 0.2: freq = 783.99 # G5
		elif t > 0.1: freq = 659.25 # E5

		var env = clamp(1.0 - (t / duration) * 0.5, 0.0, 1.0) * exp(-t * 2.0)
		var tone = sin(t * freq * TAU) * 0.7 + sin(t * freq * 2.0 * TAU) * 0.2
		var val = clamp(tone * env, -1.0, 1.0)
		var val_16 = int(val * 32767.0)
		data.encode_s16(i * 2, val_16)

	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.data = data
	return stream
