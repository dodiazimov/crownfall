class_name GameData
extends RefCounted

# Epoch: 18th Century
# Units definition
const UNITS = {
	"soldier": {
		"id": "soldier",
		"name": "Line Infantry",
		"role_18c": "Musketeer",
		"power": 1.0,
		"hp": 100.0,
		"damage": 24.0,
		"crit_chance": 0.06,
		"crit_mult": 1.5,
		"speed": 6.0,
		"armor": 0.05,
		"cost": 10,
		"color": Color(0.25, 0.45, 0.85)
	},
	"archer": {
		"id": "archer",
		"name": "Skirmisher",
		"role_18c": "Rifleman",
		"power": 1.4,
		"hp": 75.0,
		"damage": 34.0,
		"crit_chance": 0.22,
		"crit_mult": 2.0,
		"speed": 5.8,
		"armor": 0.0,
		"cost": 18,
		"color": Color(0.2, 0.7, 0.5)
	},
	"knight": {
		"id": "knight",
		"name": "Grenadier",
		"role_18c": "Heavy Guard",
		"power": 2.0,
		"hp": 190.0,
		"damage": 50.0,
		"crit_chance": 0.12,
		"crit_mult": 1.6,
		"speed": 5.2,
		"armor": 0.25,
		"cost": 35,
		"color": Color(0.85, 0.3, 0.35)
	},
	"cavalry": {
		"id": "cavalry",
		"name": "Hussar Cavalry",
		"role_18c": "Mounted Dragoon",
		"power": 1.8,
		"hp": 140.0,
		"damage": 44.0,
		"crit_chance": 0.18,
		"crit_mult": 1.8,
		"speed": 9.5, # 1.35x - 1.5x faster march!
		"charge_bonus": 1.5,
		"armor": 0.12,
		"cost": 30,
		"color": Color(0.95, 0.65, 0.2)
	}
}

const CASTLE_TYPES = {
	"main": { "name": "Star Fortress", "def": 420, "income": 4, "role": "Headquarters", "color": Color(0.2, 0.55, 0.95) },
	"gold": { "name": "Treasury Vault", "def": 100, "income": 8, "role": "Economy", "color": Color(0.95, 0.75, 0.2) },
	"troop": { "name": "Fortified Garrison", "def": 120, "income": 2, "role": "Infantry Barracks", "color": Color(0.35, 0.7, 0.4) },
	"archer": { "name": "Marksman Battery", "def": 150, "income": 2, "role": "Ranged Redoubt", "color": Color(0.3, 0.8, 0.75) },
	"knight": { "name": "Grenadier Bastion", "def": 220, "income": 2, "role": "Heavy Citadel", "color": Color(0.85, 0.35, 0.4) },
	"elite": { "name": "The Grand Citadel", "def": 450, "income": 6, "role": "Imperial Star-Fort", "color": Color(0.7, 0.4, 0.9) },
	"small": { "name": "Watch Redoubt", "def": 60, "income": 1, "role": "Outpost", "color": Color(0.7, 0.75, 0.7) },
	"cavalry": { "name": "Cavalry Stables", "def": 180, "income": 3, "role": "Mounted Stables", "color": Color(0.95, 0.55, 0.2) }
}

# The 21 Castles of The Verdant Isles
# Raw 2D engine coordinates mapped to 3D world space:
# world_x = (orig_x - 1100.0) * 0.05
# world_z = (orig_y - 750.0) * 0.05
# world_y = custom elevation height
const CASTLE_DEFS = [
	{ "id": 0, "name": "Azurehold", "type": "main", "owner": "blue", "orig": Vector2(290, 746), "y": 2.2, "troops": 420 },
	{ "id": 1, "name": "Crimson Keep", "type": "main", "owner": "red", "orig": Vector2(1910, 746), "y": 2.2, "troops": 420 },
	{ "id": 2, "name": "Amber Mine", "type": "gold", "owner": "", "orig": Vector2(460, 440), "y": 2.8, "troops": 100 },
	{ "id": 3, "name": "Ember Bank", "type": "gold", "owner": "", "orig": Vector2(1740, 440), "y": 2.8, "troops": 100 },
	{ "id": 4, "name": "Sunstone", "type": "gold", "owner": "", "orig": Vector2(850, 344), "y": 4.2, "troops": 110 },
	{ "id": 5, "name": "Kingsgilt", "type": "gold", "owner": "", "orig": Vector2(1350, 344), "y": 4.2, "troops": 110 },
	{ "id": 6, "name": "Greenwatch", "type": "troop", "owner": "", "orig": Vector2(590, 790), "y": 2.4, "troops": 130 },
	{ "id": 7, "name": "Briar Fort", "type": "troop", "owner": "", "orig": Vector2(1610, 790), "y": 2.4, "troops": 130 },
	{ "id": 8, "name": "Westreach", "type": "small", "owner": "", "orig": Vector2(350, 1054), "y": 2.0, "troops": 60 },
	{ "id": 9, "name": "Eastwatch", "type": "small", "owner": "", "orig": Vector2(1850, 1054), "y": 2.0, "troops": 60 },
	{ "id": 10, "name": "Willow Spire", "type": "archer", "owner": "", "orig": Vector2(710, 1040), "y": 2.6, "troops": 150 },
	{ "id": 11, "name": "Thorn Spire", "type": "archer", "owner": "", "orig": Vector2(1490, 1040), "y": 2.6, "troops": 150 },
	{ "id": 12, "name": "Moonstone", "type": "knight", "owner": "", "orig": Vector2(880, 580), "y": 3.6, "troops": 220 },
	{ "id": 13, "name": "Ironcrest", "type": "knight", "owner": "", "orig": Vector2(1320, 580), "y": 3.6, "troops": 220 },
	{ "id": 14, "name": "Mossguard", "type": "troop", "owner": "", "orig": Vector2(850, 1150), "y": 2.2, "troops": 130 },
	{ "id": 15, "name": "The Violet Crown", "type": "elite", "owner": "", "orig": Vector2(1100, 850), "y": 5.2, "troops": 450 },
	{ "id": 16, "name": "Oakheart", "type": "troop", "owner": "", "orig": Vector2(1350, 1150), "y": 2.2, "troops": 130 },
	{ "id": 17, "name": "Northpass", "type": "small", "owner": "", "orig": Vector2(660, 284), "y": 4.5, "troops": 70 },
	{ "id": 18, "name": "Stonewatch", "type": "small", "owner": "", "orig": Vector2(1540, 284), "y": 4.5, "troops": 70 },
	{ "id": 19, "name": "Royal Stables", "type": "cavalry", "owner": "", "orig": Vector2(570, 1270), "y": 1.8, "troops": 180 },
	{ "id": 20, "name": "Windrider Stables", "type": "cavalry", "owner": "", "orig": Vector2(1630, 1270), "y": 1.8, "troops": 180 }
]

# Road Network Edges: connections between castle IDs
const ROAD_EDGES = [
	# West Island Core
	[0, 2], [0, 6], [0, 8],
	[2, 17], [2, 12],
	[17, 4],
	[4, 12],
	[6, 12], [6, 10],
	[8, 10], [8, 19],
	[10, 14], [10, 19],
	[14, 19],

	# East Island Core (Symmetric)
	[1, 3], [1, 7], [1, 9],
	[3, 18], [3, 13],
	[18, 5],
	[5, 13],
	[7, 13], [7, 11],
	[9, 11], [9, 20],
	[11, 16], [11, 20],
	[16, 20],

	# Central Connections & Bridges to The Violet Crown / Across Channel
	[12, 15], # Moonstone to Violet Crown
	[13, 15], # Ironcrest to Violet Crown
	[6, 15],  # Greenwatch to Violet Crown (Central Bridge)
	[7, 15],  # Briar Fort to Violet Crown (Central Bridge)
	[14, 15], # Mossguard to Violet Crown
	[16, 15], # Oakheart to Violet Crown
	[4, 5],   # Northern Highlands Pass (Sunstone to Kingsgilt)
	[14, 16]  # Southern Great Causeway / Bridge (Mossguard to Oakheart)
]

# Bridge locations across the central water sound
const BRIDGES = [
	{ "name": "High Northern Arch", "p1": Vector3(-12.5, 4.2, -20.3), "p2": Vector3(12.5, 4.2, -20.3) },
	{ "name": "Grand Citadel Causeway West", "p1": Vector3(-11.0, 3.6, -8.5), "p2": Vector3(0.0, 5.2, 5.0) },
	{ "name": "Grand Citadel Causeway East", "p1": Vector3(11.0, 3.6, -8.5), "p2": Vector3(0.0, 5.2, 5.0) },
	{ "name": "Central Sound Span West", "p1": Vector3(-25.5, 2.4, 2.0), "p2": Vector3(0.0, 5.2, 5.0) },
	{ "name": "Central Sound Span East", "p1": Vector3(25.5, 2.4, 2.0), "p2": Vector3(0.0, 5.2, 5.0) },
	{ "name": "Southern Tidal Causeway", "p1": Vector3(-12.5, 2.2, 20.0), "p2": Vector3(12.5, 2.2, 20.0) }
]

static func to_world_pos(orig: Vector2, height: float = 2.0) -> Vector3:
	var wx = (orig.x - 1100.0) * 0.05
	var wz = (orig.y - 750.0) * 0.05
	return Vector3(wx, height, wz)
