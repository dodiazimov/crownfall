# Crownfall — Medieval Real-Time Strategy (RTS)

**Crownfall** is a competitive, real-time multiplayer and single-player medieval strategy game built with pure web technologies (HTML5, SVG, CSS3, JavaScript, Web Audio API, and Node.js WebSockets). Zero heavyweight dependencies or external asset downloads required.

---

## ⚔️ Core Gameplay & Strategic Mechanics

- **Local Garrison RTS:** Every castle generates and maintains its own independent troop garrison and gold income. Troops are dispatched directly from chosen source castles rather than an abstract global pool.
- **9 Handcrafted Battlefields (2–4 Factions):**
  - **2-Player Realms:** *The Verdant Isles*, *Crossroads of Kings*, *Archipelago of Three Bridges*, *The Iron Gorge*, *The Sunken Atoll*.
  - **3-Player Triangles:** *Tri-Island Caldera*, *Delta of Three Warlords*.
  - **4-Player Continents:** *Crossroads of Four Kings*, *Four Realms Atoll*.
- **Fair Play Guarantee:** 100% symmetric generation with identical travel distances, neutral garrisons, and resource distribution. AI bots play under identical economy and visibility rules without artificial bonuses.
- **Castle Specialization:** Players can specialize their castles into:
  - **Balanced:** Standard troops and gold generation.
  - **Military:** +50% troop production rate, -50% gold yield.
  - **Economy:** 2× gold yield, -50% troop production rate.
  - *Specialization can be selected upon upgrade or dynamically switched anytime for 50 Gold.*
- **Castle Passive Abilities:**
  - **Archer Tower (`archer`):** *Volley Defense* — Defensive archers fire into approaching hostile armies before melee clash, inflicting casualties (15% per tower level).
  - **Knight Castle (`knight`):** *Swift March* — Armies departing from owned knight castles march with a +25% speed bonus (106 px/s Fast, 81 px/s Flank).
  - **Watch Keep (`small`):** Expanded surveillance horizon and early threat warning.
  - **Elite Citadel (`elite`):** +1 troop/s imperial aura and acts as the strategic anchor for Crown Control.
- **Anti-Snowball Stabilization Period:** Newly captured castles undergo a 7-second stabilization period where production runs at 50% efficiency, preventing instant cascading steamrolls.
- **Dual Victory Conditions:**
  - **Total Conquest / Elimination:** Capture 100% of castles or eliminate all opposing factions.
  - **Crown Control:** Seize at least 14 castles (≥66.7% of the realm) **AND** the Elite Citadel to initiate a 30-second victory countdown. If contested or lost, the timer resets.
- **Tactical Routes & Road Clashes:** Choose between the Main Route (85 px/s, direct) and Flank Detour (65 px/s, avoids head-on clashes). Hostile armies meeting on the road engage in continuous mathematical combat; survivors continue their original march.
- **Defensive Reserves & Automated Supply Lines:** Dedicate non-deployable garrison reserves to secure vulnerable fronts, and designate automatic supply lines to feed forward positions every 5 seconds.

---

## 🌐 Multiplayer Architecture

- **Authoritative Server:** Pure Node.js WebSocket backend (`server.js` + `multiplayer.js`). All game ticks, commands, and victory calculations run authoritatively on the server.
- **Anti-Cheat & Rate Limiting:**
  - Client actions are strictly parsed as player intents (`dispatch`, `coordinate`, `upgrade`, `specialize`, `tactics`). State forgery attempts are rejected.
  - Per-IP rate limiting on authentication endpoints (max 12 requests/min).
  - Per-socket frame rate limiting (max 40 messages/s) to mitigate DoS and flood attacks.
- **Instant Rematch:** Both players can trigger an instant rematch without leaving the room or re-entering lobby codes.
- **Reconnection & Grace Periods:** Disconnected players receive a grace window to reconnect via secure session tokens. If expired, an intelligent AI bot takes over to ensure uninterrupted matches for remaining players.

---

## 🎧 Audio & Visual Systems

- **Procedural Synthesizer:** Web Audio API sound generator providing clicks, marching footsteps, impacts, alert horns, fanfares, and ambient medieval chords. Zero MP3/WAV files required.
- **Independent Audio Controls:** Separate SFX Volume (0–100%) and Ambient Music Volume (0–100%) sliders with local persistence.
- **Scalable Vector Graphics (SVG):** Responsive high-DPI rendering with adaptive graphics quality (`auto`, `low`, `medium`, `high`) delivering smooth 60 FPS performance across desktop, tablet, and mobile devices.

---

## 🚀 Running the Game

### Offline / Static Mode
Simply open `dist/index.html` in any modern web browser.

### Full Dedicated Server & Multiplayer Mode
Run the Node.js production server:

```sh
node server.js
```

Default port is `3000` (configurable via `PORT` environment variable). Open your browser at `http://localhost:3000`.

---

## 🧪 Automated Test Suites

Crownfall includes 80 comprehensive automated regression tests:

```sh
# Core engine tests (simulation, combat, economy, passives, victory modes)
node tests/engine.test.js

# Career progression and achievement tests
node tests/career.test.js

# UI, DOM, and viewport integration tests
node tests/interface.test.mjs

# Authoritative server, WebSocket, security, and rematch tests
node --test tests/server.test.js

# Run all suites in sequence
npm run test:all
```
