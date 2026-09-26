# Third-Party 3D Assets & Licenses

This document tracks all external 3D models, rigs, animations, and textures used in the Crownfall Godot 3D Production Vertical Slice.

---

## 1. Unit Models & Animations

### 1.1 Line Infantry / Soldier
- **Asset Name**: `soldier.glb`
- **Author**: Mixamo / Adobe (Sample model maintained in Three.js distribution)
- **Source URL**: `https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb`
- **License**: CC0 / Royalty-Free Game Asset (Standard Mixamo WebGL Distribution)
- **Where Used**: `res://assets/models/units/soldier.glb`
- **Purpose**: Real animated 3D humanoid infantry, riflemen, grenadiers, and cavalry riders with skeletal animations (Idle, Walk, Run).

### 1.2 Warhorse / Cavalry Mount
- **Asset Name**: `horse.glb`
- **Author**: Mirada / North Kingdom / Google Ro.me Project (Three.js distribution)
- **Source URL**: `https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Horse.glb`
- **License**: Apache License 2.0 / CC-BY (Ro.me WebGL project)
- **Where Used**: `res://assets/models/units/horse.glb`
- **Purpose**: Real animated 3D galloping cavalry mounts with trot, charge, and idle movement.

---

## 2. 18th-Century Architecture & Castles

### 2.1 Fantasy Town & Fort Modular Kit
- **Asset Names**:
  - `wall.glb`, `wallArch.glb`, `wallBlock.glb`, `wallCorner.glb`, `wallDoor.glb`, `wallDoorwaySquare.glb`, `wallWindowStone.glb`
  - `roof.glb`, `roofCorner.glb`, `roofGable.glb`, `roofHigh.glb`, `roofPoint.glb`
  - `pillarStone.glb`, `chimney.glb`, `fence.glb`, `cart.glb`, `lantern.glb`, `road.glb`, `roadBend.glb`, `roadCorner.glb`
- **Author**: Kenney (Kenney.nl)
- **Source URL**: `https://kenney.nl/assets/fantasy-town-kit` (via `https://github.com/ETdoFresh/kenney.nl`)
- **License**: CC0 1.0 Universal (Public Domain)
- **Where Used**: `res://assets/models/castles/`
- **Purpose**: Modular stone bastions, curtain walls, gatehouses, headquarters, barracks, cavalry stables, and economy mint depots.

---

## 3. Artillery, Coastal Props & Naval Warships

### 3.1 Pirate & Maritime Kit
- **Asset Names**:
  - `cannon.gltf` + `cannon.bin`, `cannonLarge.gltf` + `cannonLarge.bin`
  - `formationLarge_stone.gltf`, `formation_rock.gltf`
  - `ship_dark.gltf` + `ship_dark.bin`
- **Author**: Kenney (Kenney.nl)
- **Source URL**: `https://kenney.nl/assets/pirate-kit`
- **License**: CC0 1.0 Universal (Public Domain)
- **Where Used**: `res://assets/models/props/`
- **Purpose**: 18th-century bastion fortress cannons, coastal rock spires, and outer bay Galleon warships.

---

## 4. Nature & Terrain Environment

### 4.1 Nature Kit 2.1
- **Asset Names**:
  - `tree_pineTallA.glb`, `tree_pineTallB.glb`, `tree_pineDefaultA.glb`, `tree_oak.glb`
  - `rock_largeA.glb`, `rock_largeB.glb`, `rock_tallA.glb`, `rock_smallFlatA.glb`
  - `bridge_stone.glb`, `bridge_wood.glb`, `campfire_stones.glb`, `cliff_blockDiagonal_rock.glb`
- **Author**: Kenney (Kenney.nl)
- **Source URL**: `https://kenney.nl/assets/nature-kit`
- **License**: CC0 1.0 Universal (Public Domain)
- **Where Used**: `res://assets/models/nature/`
- **Purpose**: MultiMesh conifer pine forests, coastal sea stack rocks, river bridges, and terrain boulders.

---

## 5. PBR Surface Textures

### 5.1 Old Stone Wall (Castle Walls & Foundations)
- **Asset Name**: `stone_diff_512.webp`, `stone_nor_512.webp`, `stone_rough_512.webp`
- **Author**: Poly Haven / Rob Tuytel
- **Source URL**: `https://polyhaven.com/a/old_stone_wall_02`
- **License**: CC0 1.0 Universal (Public Domain)
- **Where Used**: `res://assets/textures/pbr/` via `res://scripts/FortressMaterials.gd`
- **Purpose**: High-fidelity masonry stone walls, plinths, and stepped foundations for all 7 fortress architectures.

### 5.2 Slate Roofing (Spires & Roof Slates)
- **Asset Name**: `slate_diff_512.webp`, `slate_nor_512.webp`, `slate_rough_512.webp`
- **Author**: Poly Haven / Rob Tuytel
- **Source URL**: `https://polyhaven.com/a/roof_slates_02`
- **License**: CC0 1.0 Universal (Public Domain)
- **Where Used**: `res://assets/textures/pbr/` via `res://scripts/FortressMaterials.gd`
- **Purpose**: Realistic weathered slate roof shingles for citadel spires, keeps, towers, and barracks, dynamically tinted by faction.

