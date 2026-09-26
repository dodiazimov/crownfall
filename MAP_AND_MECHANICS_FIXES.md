# Map, interface and mechanics fixes — 2026-09-17

## Changes

- The camera starts in a full-map view. Reset fits the whole realm and coastline, including the artwork extending below the old 1400-unit boundary. Zoom and pan remain available.
- The battlefield uses the space between the HUD and the command deck. A ResizeObserver updates the camera when the usable area changes. Small screens reserve a separate strip for the map name and zoom controls.
- Fixed the invalid group inside the SVG clipping path. Rivers, bridges, territory ownership and terrain now render instead of disappearing inside the clipped layer.
- Added deterministic forests, mountain ridges, farm plots, a compass and a subtle map grid. Low graphics mode retains a smaller set of static details.
- Refined HUD and command deck materials, highlighted the primary attack action, and repaired mobile action wrapping and command-panel clipping.
- Road combat now updates unit composition after casualties, so defeated units cannot retain combat power or return as reinforcements. Survivor allocation conserves integer troop counts, including mixed-unit dragon casualties and castle captures.
- Fixed non-finite combat effect coordinates, Vanguard survivor calculations, siege survivor scaling and changing counter denominators during simultaneous combat.
- Recall respects paused/finished matches. Dragon strikes reject invalid coordinates and cannot overwrite another pending strike or charge a second player for a discarded strike.

## Validation

- Engine: 69 tests.
- Interface: 38 tests.
- Camera: 5 viewport tests.
- Career: 4 tests.
- Server: 4 tests.
- Real Chromium gameplay checks: desktop, tablet, mobile and small mobile; tactics, reserves, dispatch, upgrades, restore, two-client multiplayer, reconnect, forfeit and matchmaking.
- Additional map checks cover 1440×900, 768×1024, 390×844, 320×568 and 844×390. Screenshots: `scratch/map-fixed-*.png`.

The test environment has no default system font configuration. Browser checks use
`FONTCONFIG_FILE=/tmp/crownfall-browser-libs/fonts.conf` and the existing Playwright
installation at `/tmp/crownfall-tools/browser/node_modules/playwright`.

A running Node server must be restarted to load engine changes for multiplayer.
Static clients receive changes on reload.

## Unit visibility — follow-up

- Marching formations now use separate infantry, bow, shield and mounted figures. Mixed armies show every surviving type; low graphics retains static type figures and composition badges.
- Castle labels and selected source/target cards show local unit counts instead of requiring inference from realm totals.
- Road battles show live composition for each side, with a readable panel naming their origin castles.
- Enemy armies can be inspected by click or keyboard; recall remains restricted to owned armies. Open inspection counts update after casualties.
- Validation: 40 interface tests; existing five map viewport checks; mixed garrisons, formations, battles and enemy inspection in Chromium at 1440×900, 390×844, 320×568 and 844×390. Screenshots: `scratch/unit-types-*.png`.
