# Validation results

- 16 automated gameplay regression tests passed using Node.js.
- All three JavaScript files passed syntax checks.
- All HTML asset references resolve to local files. No network assets or runtime dependencies.
- Browser preview served successfully on localhost; no JavaScript console errors observed.
- Tested an explicit 300-troop dispatch, moving troop count, main-castle upgrade, income change, pause, and AI expansion/captures.
- Desktop layout inspected at 1440 × 1000; phone layout inspected at 390 × 844. Phone content width equals viewport width, with no horizontal overflow.
- Phone castle selector successfully targeted the Elite Citadel with dispatch enabled from the opening army.
- Optional WebMCP read/dispatch tools registered; a valid dispatch succeeded and an invalid amount was rejected.
- Direct file-URL launch could not be browser-automated because the browser tool blocks file URLs. The game uses classic local scripts and relative assets specifically to support double-click launch; localhost play was verified.

The artwork is original SVG art inspired by the supplied reference, not a reproduction of its 3D rendering.

## Visual refinement pass

- Core engine SHA-256 unchanged: `1ACAFA9BA78B470D1787FD7D8DFB346664899E7DF0A4D5D3D4C98E2D9BA896A0`.
- Rebuilt original SVG castle art with stone shading, battlements, roof facets, flags, gates, level markers, and type-specific details.
- Reworked coastline, ground texture, trees, rocks, river and bridges without changing castle coordinates or path timing.
- Stronger blue/red territory gradients and borders; reduced default label clutter.
- Persistent SVG army nodes, route animation, marching formations, ETA and progress indicators; army movement remains driven by the existing engine's time and positions.
- Restyled resource HUD, castle details, selection states, unit portraits and mobile layout. Pausing also pauses decorative route animation; reduced-motion preferences are respected.
- Verified a 300-troop capture, returning survivors, gold-castle upgrade, unrestricted Elite attack, and paused marching armies in the browser.
- Desktop 1440 × 1000 and phone 390 × 844 inspected. No horizontal overflow or browser JavaScript errors observed.
- All 16 gameplay regression tests passed again.


## Mobile game pass — 2026-09-15

- All 16 engine tests passed; engine bytes match the pre-change copy.
- All 16 new interface tests passed in Happy DOM. These cover initialization, mobile tabs, tutorial progression, dispatch/global troops, capture/survivors, upgrades/art changes, zoom clamping, synthetic two-finger pinch, mocked audio generation, effect quality, incoming-main-castle alerts, unrestricted Elite attacks, pause, victory and restart.
- Every JavaScript entrypoint passes Node syntax validation.
- All linked scripts/styles/assets are local and present. The localhost server responds successfully.
- Current visual browser QA and physical-device audio/touch checks could not be completed: the browser launcher returned EPERM and the native Computer Use pipe was unavailable. Earlier desktop/mobile visual inspections above apply to the previous visual pass, not this new command-deck layout.
- Test dependencies are development-only; the dist folder remains fully self-contained for offline play.
