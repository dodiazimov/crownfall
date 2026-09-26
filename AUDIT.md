# Crownfall audit — 2026-09-16

## Baseline and priorities (before implementation)

The shipped version is a local-garrison RTS: 21 castles, nine maps, 2–4 factions,
420 starting troops and 200 Gold, one-for-one combat, production at each owned
castle, Gold-funded levels/specializations, reserves, supply and synchronized
marches. Every target is reachable. The old README describes a different game.

**CRITICAL**
- Fresh startup and restored startup throw `enterMenuMode/enterGameMode is not defined`;
  the functions are scoped inside event setup. Confirmed by running interface tests.
- Multiplayer runs independent simulations and applies incomplete castle-only
  snapshots. Gold, armies, orders, tactics and outcomes diverge; clients can submit
  arbitrary snapshots. Establish one authoritative room simulation and validated commands.

**HIGH**
- Map/player-count mismatches give extra factions resource castles and incorrect totals.
- Target inspection spends troops; drag cancellation can dispatch; Tab traps focus.
- Mobile CSS hides all upgrades, routing and reserves.
- No usable forecast or production/upgrade preview; specialty selector has no effect.
- Sound settings and sound playback have separate enable states.
- Save validation permits nonexistent factions, invalid routes and cyclic supply.
- Difficulty badge starts a new game instead of changing difficulty; menu transitions
  retain multiplayer role/state; leaving a match can resurrect a save via autosave.
- Missing visibility pause; results incorrectly claim all castles captured after elimination.
- Existing DOM tests target removed controls and omit shipped scripts.

**MEDIUM**
- Duplicate AI implementation has an invalid upgrade sort comparator and underestimates
  enemy growth when combining distant sources.
- Random maps can remove the sole Elite objective; multi-faction randomization is not
  geographically symmetric. Preserve Elite; document remaining fairness testing.
- Weak class identity: Archer/Knight/Elite produce ordinary troops, with no power bonus.
- Main menu advertises unmeasured online population and capacity.
- Three-way battle semantics, late-game snowballing and route/terrain alignment need
  explicit documentation and playtesting.

**LOW**
- Mixed legacy/localized strings, hidden compatibility markup and presentation duplication.
- Further visual polish and additional strategic systems.

## Implementation and verification plan

1. Repair startup; verify the real script order in DOM and browser tests.
2. Repair engine setup, validation and AI; add behavioral regression cases.
3. Establish authoritative multiplayer with integration tests for commands/snapshots.
4. Make selection safe and add localized military/economy previews, accessible controls,
   mobile tactics, functional specialization and sound feedback.
5. Run engine, DOM, server and real-browser desktop/mobile checks; update documentation.

No broad rebuild or class-power rewrite. Keep starting troops (420), neutral Elite
defense (450), production rates and upgrade prices (100/220): the opening army already
loses a direct Elite attack, and upgrades create growth choices. Preserve these values
until measured matches justify tuning. Correct unequal starting castles as a setup bug.

## Verification & Final Audit Results (Completed)

All 5 phases of the implementation plan have been executed and verified:

1. **Engine Test Suite (`tests/engine.test.js`)**:
   - 47/47 tests passed (100%).
   - Verified: start conditions, movement, reachability, road combat (including 3-way), neutral castles, castle specializations, automatic supply chains, coordinated orders, cancelled orders, save/restore validation, order reconciliation after troop loss.

2. **Interface Test Suite (`tests/interface.test.mjs`)**:
   - 20/20 tests passed (100%).
   - Verified: startup script order, responsive layout, target selection without spending troops, dispatch validations, upgrade preview and specialization, keyboard navigation (Tab/C), difficulty settings, background pause, autosave clean exit, full room snapshots.

3. **Server Test Suite (`tests/server.test.js`)**:
   - 4/4 tests passed (100%).
   - Verified: authoritative room commands, production clock, AI bot backfill, disconnect grace period, and client state synchronization.

4. **Real-Browser Multi-Viewport Regression Suite (`tests/browser.test.cjs`)**:
   - Passed across all target viewports:
     - 1440×900 (Desktop)
     - 768×1024 (Tablet)
     - 390×844 (Mobile Phone)
     - 320×568 (Small Mobile)
   - Two-browser multiplayer order execution, castle upgrades, disconnect/auto-reconnect, and forfeit passed.
   - Quick matchmaking AI fallback passed.

5. **Post-Audit Strategic Enhancements (Implemented & Verified)**:
   - **Castle Type & Specialty Indicators**: Distinct SVG role banners (`MAIN`, `GOLD`, `TROOP`, `ARCHER`, `KNIGHT`, `ELITE`, `WATCH`) and dynamic specialty aura/badges (`military` battle halo, `economy` treasury glow).
   - **Real-Time Trajectory Preview**: Animated dashed route preview (`#routePreview`) dynamically displaying the exact march route (Fast Bridge vs Coastal Detour) prior to dispatch.
   - **Universal Live Territory Dominance Strip**: Sleek edge-strip on all viewports (mobile, tablet, desktop) tracking active territory dominance in real time.
   - **Post-Match Analytics Breakdown**: Structured grid in the victory/defeat modal showing captured castles, dispatched forces, recruitments, and casualty breakdown.

6. **UI/UX Audit & Premium Overhaul (Phase 6 Completed & Verified)**:
   - **Hero Pick (War Council) Screen**:
     - Redesigned into a full-scale strategy game character selection interface with high-resolution portraits, role emblems, and active playstyle badges.
     - Live side preview panel providing real-time passive ability stats and strategic recommendations.
     - Explicit, high-visibility selection states (`aria-pressed`, golden glowing frame, `✓ Selected` badge) and context-aware action button (`Play as [Commander]`).
     - Full keyboard navigation (Arrow keys, Space, Enter, Escape) and touch-first responsive grid.
   - **In-Game Command Deck & HUD Polish**:
     - Consolidated desktop HUD at 1366×768 (laptop) to eliminate overlapping panels and clipped text.
     - Responsive command drawer (`#moreCommandsBtn`) on mobile and small landscape viewports (844×390, 667×375, 390×844, 320×568) ensuring the primary `ATTACK` button is never pushed off-screen.
     - Clear battle forecast calculating defensive volleys, reinforcements, and expected casualty ratios before dispatch.
     - Native modal dialogs with escape handling, backdrop click-outside safety, and accessible confirmation dialogs (`actionConfirmDialog`).
   - **Typography & True Offline Styling**:
     - Migrated from external Google Fonts to self-hosted fonts (`dist/fonts.css`, Cinzel & Outfit with OFL licenses) ensuring complete offline functionality.
     - Unified color system, consistent border radius, and accessible contrast ratios across all dialogs, tooltips, and badges.
   - **Automated Multi-Resolution Verification**:
     - Both `tests/ui-audit.test.cjs` and `tests/browser.test.cjs` pass across all 9 target viewports with zero uncaught runtime errors.
     - Two-client live multiplayer commands, room lobby hero sync, auto-reconnect, and forfeit confirmed working smoothly.
