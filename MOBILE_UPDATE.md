# Browser mobile update — 2026-09-21

- Starting and home camera views include a nearby target, with space for the map controls.
- Rotating the phone preserves castle touch-target scale; overview continues to fit the map.
- Compact landscape controls now apply from 480px wide. Castle names remain readable above their action buttons.
- Menu shortcuts have 44px touch targets. Small landscape screens place the profile above the title to prevent overlap.
- The hidden menu particle canvas no longer creates an animation loop or draws frames.

Validation: five Chromium touch viewports (320×568, 390×844, 568×320, 667×375, 844×390), including selection, dispatch, pan, pinch, rotation, overview, management and overflow checks. All 42 interface tests and five camera tests pass. The interface test's obsolete 3.5× zoom expectation now matches the existing 5× limit.

Run `npm run test:mobile` with the game server on port 4173. Screenshots are in `artifacts/ui-mobile-refresh/`.

These checks use browser mobile emulation; physical-phone frame rates have not been measured.
