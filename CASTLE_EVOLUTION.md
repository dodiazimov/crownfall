# Castle evolution

The browser game's upgrade and era systems are independent. Upgrading changes a node's level from 1 through 5; it never changes the scenario's era. The shared renderer applies to all 11 maps.

## Visual selection

`CrownStructureVisuals.getStructureVisual(era, role, upgradeLevel)` returns an immutable recipe containing its model family, materials, modules, role props, banners, foundation and construction-effect metadata. The registry contains 160 entries: four eras × eight engine roles × five levels. For example, `18C_CAVALRY_L5` and `19C_ECONOMY_L5` are separate recipes. Unknown combinations fail explicitly.

The registry and modular geometry renderer live in `dist/army-art.js`. Era kits, role plans and progression stages are declarative data. The renderer projects shared wall, building, roof, bastion, bunker and prop primitives into shaded SVG assets. Selection is never based on upgrade level alone.

| Era | Architecture and engineering |
| --- | --- |
| 17C | Rough stone, pitched roofs, palisades, pike fittings |
| 18C | Hipped roofs, angular bastions, gun emplacements, formal compounds |
| 19C | Sawtooth roofs, brick chimneys, rail and freight details, blockhouses |
| 20C | Concrete bunkers, slab roofs, radar, barriers, motorized depots |

Economy nodes have warehouses and market/freight props; troop nodes have long barracks; cavalry nodes have stable/depot wings and horses or vehicles; ranged/watch nodes have taller observation buildings; capitals/citadels have larger footprints and command landmarks. Within each era, levels add height, towers, wings, role props, outer reinforcement, banners and a final landmark.

## Gameplay integration

`CrownEngine.MAX_CASTLE_LEVEL` is 5. Upgrade costs are 100, 220, 400 and 650 gold. Existing level-one through level-three production rates remain unchanged; higher-level rates extend the tables. UI previews, AI upgrade eligibility, save validation and authoritative multiplayer commands use the five-level cap. These new high-level economic rates have regression coverage but have not undergone competitive balance playtesting.

Canonical structure bounds and road-gate anchors are fixed across all levels and eras. They reserve the largest silhouette from the start, preventing shrinking, clipping or movement during upgrades. Terrain support remains map-aware, including authored shoreline foundations. Soft contact and directional shadows ground each compound without a large detached halo.

Upgrades trigger a short reinforcement pulse and eight dust puffs. Effects clean themselves up; reduced-motion mode uses a fading pulse without moving particles. Era changes and ownership changes do not trigger upgrade feedback unless the level also increases.

## Optimization

Geometry is assembled only on demand and cached by era, role, level and faction. Each castle uses one SVG image in the live scene, letting the browser reuse/rasterize the asset; individual wall/prop primitives are not added to the live map DOM. Unchanged frames reuse both asset and DOM caches. No external textures, model downloads, per-frame castle rebuilding, or perpetual particle systems were added. Existing map zoom simplification remains in place.

## Verification and screenshots

Run the local server, then `npm run test:castle-evolution`. The test verifies all 160 unclipped stages, 4,620 rendered node/stage combinations and 3,696 real upgrades across all 11 maps and four eras. It also verifies finite income, save round-trips, multiplayer command/snapshot handling, UI purchases and level cap, stable anchors, effect cleanup and reduced motion.

Artifacts are in `artifacts/castle-evolution/`:

- `17th-progression.png`, `18th-progression.png`, `19th-progression.png`, `20th-progression.png`: complete five-stage comparisons for economy, troop, cavalry, ranged and capital roles.
- `gold-level-1.png` through `gold-level-5.png`: the same economy node upgraded in place.
- `troop-level-1.png` through `troop-level-5.png`: the same troop node upgraded in place.
- `main-level-1.png` through `main-level-5.png`: the same capital upgraded in place.
- `upgrade-feedback.png`: construction feedback during an actual upgrade.
- `desktop-all-level-5.png`, `mobile-all-level-5.png`: final-stage map views.
- `validation.json`: measured checks and timing results.

Performance samples use Chromium desktop and mobile-sized viewports on this machine, with 21 level-five castles. They are browser measurements, not measurements from physical phones. The separate Godot prototype is outside this browser implementation.
