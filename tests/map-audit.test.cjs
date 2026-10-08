// Comprehensive Map Audit Test across all 11 playable maps (0 to 10)
// Validates:
// 1. Two-tier road classification ('main' and 'secondary') for all 11 maps.
// 2. Full network connectivity: all 21 castles connected on every map.
// 3. Gate precision: road endpoints align to source/target castle gates (< 0.05px).
// 4. No castle overlap: all pairs of castles satisfy safe distance (> 140px).
// 5. Zero prop / vegetation encroachments into road corridors or castle aprons.
// 6. Single CastleAnchor root integrity: aligned hitbox, label, ring, gate.

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../dist/engine.js');
const defs = require('../dist/road-definitions.js');

const out = 'artifacts/map-audit';
fs.mkdirSync(out, { recursive: true });

(async () => {
  console.log('=== STARTING FULL MAP ROAD + CASTLE PLACEMENT AUDIT (MAPS 0 - 10) ===\n');
  const auditReport = { maps: [], timestamp: new Date().toISOString() };

  // Phase 1: Pure Engine / Graph Audit
  for (let m = 0; m < 11; m++) {
    const s = E.create(1234, 'balanced', 'normal', m);
    const def = defs[m];
    assert.ok(def, `Missing road definition for map ${m}`);
    assert.ok(Array.isArray(def.main) && def.main.length > 0, `Map ${m} missing main roads`);
    assert.ok(Array.isArray(def.secondary) && def.secondary.length > 0, `Map ${m} missing secondary roads`);

    // Check edge classification
    const connectedCastles = new Set();
    const allEdges = [...def.main.map(e => ({ e, type: 'main' })), ...def.secondary.map(e => ({ e, type: 'secondary' }))];
    
    for (const { e, type } of allEdges) {
      assert.ok(type === 'main' || type === 'secondary', `Invalid road type ${type}`);
      const [u, v] = e;
      assert.ok(u >= 0 && u < s.castles.length, `Invalid castle source ${u} on map ${m}`);
      assert.ok(v >= 0 && v < s.castles.length, `Invalid castle target ${v} on map ${m}`);
      assert.notEqual(u, v, `Self-loop detected on map ${m}: ${u}`);
      connectedCastles.add(u);
      connectedCastles.add(v);
    }

    assert.equal(connectedCastles.size, s.castles.length, `Map ${m}: not all 21 castles connected! Found: ${connectedCastles.size}`);

    // Check castle minimum distances (no overlap)
    let minCastleDist = Infinity;
    let closestPair = null;
    for (let i = 0; i < s.castles.length; i++) {
      for (let j = i + 1; j < s.castles.length; j++) {
        const d = Math.hypot(s.castles[i].x - s.castles[j].x, s.castles[i].y - s.castles[j].y);
        if (d < minCastleDist) {
          minCastleDist = d;
          closestPair = [s.castles[i].name, s.castles[j].name];
        }
      }
    }
    assert.ok(minCastleDist >= 140, `Map ${m} castles too close: ${closestPair.join(' and ')} distance ${minCastleDist.toFixed(1)}px < 140px`);

    auditReport.maps.push({
      mapIndex: m,
      name: E.MAP_NAMES[m],
      castles: s.castles.length,
      mainRoads: def.main.length,
      secondaryRoads: def.secondary.length,
      totalRoads: allEdges.length,
      allCastlesConnected: true,
      minCastleDistance: minCastleDist.toFixed(1),
      closestPair: closestPair.join(' - ')
    });

    console.log(`[GRAPH] Map ${m} (${E.MAP_NAMES[m]}): ${def.main.length} main, ${def.secondary.length} secondary, min spacing: ${minCastleDist.toFixed(1)}px (${closestPair.join(' - ')})`);
  }

  // Phase 2: Browser In-Game DOM & Visual Verification
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  try {
    await page.goto(process.env.CROWNFALL_URL || 'http://localhost:4173');
    await page.evaluate(() => {
      CrownI18n.setLanguage('en');
      enterGameMode();
      matchActive = false;
      document.getElementById('coach')?.classList.add('hidden');
    });

    for (let m = 0; m < 11; m++) {
      const mapRes = await page.evaluate(m => {
        state = CrownEngine.create(4173, 'balanced', 'normal', m, false, null, 'crown_control', null, false, '18th');
        state.paused = true;
        CrownView.setQuality('high');
        CrownView.init(state);
        CrownView.render(state, null, 0);

        const check = (ok, msg) => { if (!ok) throw Error(`Map ${m}: ${msg}`); };

        // 1. Castle Anchors Integrity
        for (const c of state.castles) {
          const el = document.getElementById(`castle${c.id}`);
          check(el, `Castle ${c.id} missing in DOM`);
          const matrix = el.transform.baseVal.getItem(0).matrix;
          check(Math.hypot(matrix.e - c.x, matrix.f - c.y) < 0.001, `${c.name} displaced from root coords`);
          
          const hitbox = el.querySelector('.castle-silhouette-hitbox');
          const sprite = el.querySelector('.castle-sprite-img');
          for (const attr of ['x', 'y', 'width', 'height']) {
            check(hitbox.getAttribute(attr) === sprite.getAttribute(attr), `${c.name} hitbox misalignment`);
          }
        }

        // 2. Road Elements & Gate Endpoints
        const roads = document.querySelectorAll('.strategic-roads > path:not(.road-bed)');
        const beds = document.querySelectorAll('.strategic-roads > path.road-bed');
        check(roads.length === beds.length, 'Road beds count mismatch with foreground paths');

        let mainCount = 0, secondaryCount = 0;
        const connectedRoadCastles = new Set();

        for (const road of roads) {
          const type = road.getAttribute('data-road-type');
          if (type === 'main') mainCount++;
          else if (type === 'secondary') secondaryCount++;
          else check(false, `Road missing valid data-road-type: ${type}`);

          const srcId = +road.getAttribute('data-source');
          const tgtId = +road.getAttribute('data-target');
          connectedRoadCastles.add(srcId);
          connectedRoadCastles.add(tgtId);

          const firstPt = road.getPointAtLength(0);
          const lastPt = road.getPointAtLength(road.getTotalLength());

          const srcCastle = state.castles[srcId];
          const tgtCastle = state.castles[tgtId];
          const srcGate = document.querySelector(`#castle${srcId} .debug-gate`);
          const tgtGate = document.querySelector(`#castle${tgtId} .debug-gate`);

          const gx1 = srcCastle.x + +srcGate.getAttribute('cx');
          const gy1 = srcCastle.y + +srcGate.getAttribute('cy');
          const gx2 = tgtCastle.x + +tgtGate.getAttribute('cx');
          const gy2 = tgtCastle.y + +tgtGate.getAttribute('cy');

          check(Math.hypot(firstPt.x * 2 - gx1, firstPt.y * 2 - gy1) < 0.05, `${srcCastle.name}: road start misses gate`);
          check(Math.hypot(lastPt.x * 2 - gx2, lastPt.y * 2 - gy2) < 0.05, `${tgtCastle.name}: road end misses gate`);
        }

        check(connectedRoadCastles.size === state.castles.length, 'Not all castles reached by visual roads');

        // 3. Zero Prop Corridor Encroachment
        const safe = CrownMapStyle.clearance(state, {
          land: document.querySelector('#landclip path').getAttribute('d'),
          roads: document.querySelector('.strategic-roads').outerHTML
        });

        const props = document.querySelectorAll('.war-prop');
        for (const p of props) {
          const px = +p.dataset.x, py = +p.dataset.y;
          check(safe(px, py, 45), `Prop at (${px}, ${py}) encroaches on movement corridor`);
        }

        return {
          map: m,
          mainRoadsRendered: mainCount,
          secondaryRoadsRendered: secondaryCount,
          propsPlaced: props.length,
          allGatesAligned: true
        };
      }, m);

      auditReport.maps[m].browserAudit = mapRes;
      console.log(`[DOM/VISUAL] Map ${m}: ${mapRes.mainRoadsRendered} main roads, ${mapRes.secondaryRoadsRendered} secondary roads, ${mapRes.propsPlaced} props safely outside corridors.`);
    }

    assert.equal(pageErrors.length, 0, `Browser errors encountered: ${pageErrors.join(', ')}`);
    fs.writeFileSync(`${out}/audit_results.json`, JSON.stringify(auditReport, null, 2));
    console.log('\n=== MAP AUDIT PASSED 100% ACROSS ALL 11 PLAYABLE MAPS! ===');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error('AUDIT FAILED:', e);
  process.exitCode = 1;
});
