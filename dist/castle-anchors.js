/* Painted battlefields have no height field. One world transform owns every castle part.
   Modular geometry uses stable bounds and ground anchors across all eras and levels. */
(function(root){
  'use strict';

  function getOrientation(s, c) {
    if (!s || !c) return 'south';
    const authored = root.CrownEngine?.MAPS?.[s.mapIndex || 0];
    if (!authored) return 'south';
    let bestDist = Infinity, bestDir = 'south';
    for (let i = 0; i < authored.length; i++) {
      if (i === c.id) continue;
      const other = authored[i];
      const dx = other[2] - c.x, dy = other[3] - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        if (Math.abs(dx) > Math.abs(dy) * 1.3) {
          bestDir = dx > 0 ? 'east' : 'west';
        } else {
          bestDir = dy < 0 ? 'north' : 'south';
        }
      }
    }
    return bestDir;
  }

  function structure(type, epoch='18th', orient='south') {
    // Modular compounds share a ground origin and gate across eras and ranks.
    // Bounds reserve the complete level-five silhouette; never fit each rank separately.
    const w = type === 'elite' ? 166 : type === 'main' ? 145 : 116, h = w * 1.05;
    const rx = w * .52, ry = Math.max(19, w * .21);
    let gate;
    if (orient === 'north') gate = { x: 0, y: -Math.round(ry * 0.35) };
    else if (orient === 'east') gate = { x: Math.round(rx * 0.42), y: Math.round(ry * 0.15) };
    else if (orient === 'west') gate = { x: -Math.round(rx * 0.42), y: Math.round(ry * 0.15) };
    else gate = { x: 0, y: Math.round(ry * 0.52) };

    return {
      w, h,
      orientation: orient,
      sprite: { x: -w / 2, y: -h * .82 },
      base: { x: 0, y: 0 },
      gate,
      footprint: { rx, ry },
      label: { x: 0, y: Math.max(22, Math.min(56, Math.round(ry + 16))) },
      flag: { x: w * .22, y: -h * .82 + 18 }
    };
  }

  function node(s, c) {
    const authored = root.CrownEngine?.MAPS?.[s.mapIndex || 0]?.[c.id];
    const placement = authored ? { x: authored[2], y: authored[3], height: 0 } : { x: c.x, y: c.y, height: 0 };
    const orient = getOrientation(s, c);
    return { ...structure(c.type, s.epoch, orient), world: { x: c.x, y: c.y }, placement };
  }

  function gate(s, c) {
    const a = node(s, c);
    return { x: a.world.x + a.gate.x, y: a.world.y + a.gate.y };
  }

  function route(s, points, source, target) {
    if (!source || !target || points.length < 2) return points.map(p => ({ ...p }));
    function approach(c, next) {
      const a = node(s, c), g = gate(s, c);
      let front;
      if (a.orientation === 'north') {
        front = { x: g.x, y: c.y - a.footprint.ry - 14 };
      } else if (a.orientation === 'east') {
        front = { x: c.x + a.footprint.rx + 14, y: g.y };
      } else if (a.orientation === 'west') {
        front = { x: c.x - a.footprint.rx - 14, y: g.y };
      } else {
        front = { x: g.x, y: c.y + a.footprint.ry + 13 };
      }
      const out = [g, front];
      if (a.orientation === 'south' && next.y < c.y + a.footprint.ry) {
        const side = next.x < c.x ? -1 : 1;
        out.push({ x: c.x + side * (a.footprint.rx + 16), y: front.y });
        out.push({ x: c.x + side * (a.footprint.rx + 16), y: c.y - a.footprint.ry - 12 });
      } else if (a.orientation === 'north' && next.y > c.y - a.footprint.ry) {
        const side = next.x < c.x ? -1 : 1;
        out.push({ x: c.x + side * (a.footprint.rx + 16), y: front.y });
        out.push({ x: c.x + side * (a.footprint.rx + 16), y: c.y + a.footprint.ry + 12 });
      }
      return out;
    }
    return [...approach(source, points[1]), ...points.slice(1, -1), ...approach(target, points[points.length - 2]).reverse()];
  }

  function path(points, scale = 1) {
    if (!points.length) return '';
    const p = points.map(v => ({ x: v.x * scale, y: v.y * scale }));
    let d = `M${p[0].x} ${p[0].y}`;
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
      if (!l1 || !l2) continue;
      const r = Math.min(24 * scale, l1 * .3, l2 * .3);
      d += `L${b.x + (a.x - b.x) * r / l1} ${b.y + (a.y - b.y) * r / l1}Q${b.x} ${b.y} ${b.x + (c.x - b.x) * r / l2} ${b.y + (c.y - b.y) * r / l2}`;
    }
    return d + `L${p.at(-1).x} ${p.at(-1).y}`;
  }

  root.CrownAnchors = Object.freeze({ structure, node, gate, route, path, getOrientation });
})(typeof window !== 'undefined' ? window : globalThis);
