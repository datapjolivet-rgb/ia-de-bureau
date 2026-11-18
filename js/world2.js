// Décors des donjons 10 à 15 : forge (lave), désert (sables mouvants), citadelle de givre (glace qui glisse),
// jardin du cauchemar (brume du sommeil), faille du néant (îles flottantes), trône de cendres.
(function () {
  const D = G.D, S = G.S, W = G.W, EXT = W.EXT;
  const T = D.TILE, INK = S.ink;

  // ================= Construction =================
  W.STATUE.forge = 'titanstatue'; W.STATUE.desert = 'obelisk'; W.STATUE.ice = 'icestatue';
  W.STATUE.dream = 'hourglass'; W.STATUE.void = 'monolith'; W.STATUE.ash = 'ashstatue';
  Object.assign(W.LIGHT_DECOS, { slag: [70, '#f08a2a'], voidcrystal: [85, '#9b6fe0'], starshard: [55, '#c9b8ff'], dreamflower: [55, '#f0a0e0'] });
  Object.assign(EXT.obsLight, { furnace: [175, '#f08a2a', true, 'brazier'], monolith: [110, '#9b6fe0', false, 'crystal'], ashstatue: [70, '#f08a2a', false, 'crystal'] });

  // flaques (lave) ou plaques (glace) : jamais dans les couloirs, ni sur la croix centrale pour la lave
  function pools(m, r, rng, ctx, tile, n, rMin, rMax, cross) {
    for (let k = 0; k < n; k++) {
      const big = tile === 6;
      const wx = big ? r.x + r.w * (0.25 + rng() * 0.5) : r.x + 2 + rng() * (r.w - 4);
      const wy = big ? r.y + r.h * (0.3 + rng() * 0.45) : r.y + 3 + rng() * (r.h - 5);
      const rad = big ? Math.min(r.w, r.h) * (rMin + rng() * (rMax - rMin)) : rMin + rng() * (rMax - rMin);
      const sx = big ? 1.5 : 1.4;
      for (let y = Math.floor(wy - rad); y <= wy + rad; y++) for (let x = Math.floor(wx - rad * sx); x <= wx + rad * sx; x++) {
        if (((x + 0.5 - wx) / sx) ** 2 + (y + 0.5 - wy) ** 2 > rad * rad) continue;
        if (x <= r.x || y <= r.y + (big ? 0 : 1) || x >= r.x + r.w - 1 || y >= r.y + r.h - 1) continue;
        if (m.corr[y * m.w + x]) continue;
        if (cross && ctx.inCross(x, y, 1, 1)) continue;
        if (W.get(m, x, y) === 1) W.set(m, x, y, tile);
      }
    }
  }
  EXT.feature.lava = (m, r, rng, ctx) => pools(m, r, rng, ctx, 5, 2 + Math.floor(rng() * 2), 1.2, 2.6, true);
  EXT.feature.ice = (m, r, rng, ctx) => pools(m, r, rng, ctx, 6, 1 + Math.floor(rng() * 2), 0.28, 0.42, false);

  // zones posées sur la carte (sables mouvants, brume du sommeil, puits du néant)
  function sinks(kind, nMin, nMax, rMin, rMax) {
    return (m, r, rng) => {
      const n = nMin + Math.floor(rng() * (nMax - nMin + 1));
      for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
        const x = r.x + 3 + rng() * (r.w - 6), y = r.y + 3.5 + rng() * (r.h - 6), rad = (rMin + rng() * (rMax - rMin)) * T;
        if (Math.abs(x - (r.x + r.w / 2)) < 2.6 && Math.abs(y - (r.y + r.h / 2)) < 2.6) continue;
        if (m.sinks.some((o) => Math.hypot(o.x - x * T, o.y - y * T) < o.r + rad + 24)) continue;
        m.sinks.push({ x: x * T, y: y * T, r: rad, kind, room: r.idx });
        k++;
      }
    };
  }
  EXT.feature.quicksand = sinks('sand', 1, 2, 1.8, 2.6);
  EXT.feature.sleepfog = sinks('sleepfog', 1, 2, 2.0, 2.8);
  EXT.feature.rifts = sinks('rift', 1, 2, 1.6, 2.2);

  function scatter(kind, nMin, nMax, size) {
    return (m, r, rng, ctx) => {
      const n = nMin + Math.floor(rng() * (nMax - nMin + 1));
      for (let k = 0, tries = 0; k < n && tries < 90; tries++) {
        const x = r.x + 2 + Math.floor(rng() * (r.w - 3 - size)), y = r.y + 2 + Math.floor(rng() * (r.h - 3 - size));
        if (ctx.ok(x, y, size, size, 2)) { W.placeObs(m, r, x, y, size, size, kind, rng); k++; }
      }
    };
  }
  EXT.feature.furnaces = scatter('furnace', 1, 2, 2);
  EXT.feature.icepillars = scatter('icepillar', 2, 4, 1);
  EXT.feature.dreamtrees = scatter('dreamtree', 3, 5, 1);
  EXT.feature.monoliths = scatter('monolith', 2, 3, 1);
  EXT.feature.bones = scatter('ribs', 1, 2, 2);
  // le trône du Roi Cendré, en haut de la salle
  EXT.feature.throne = (m, r, rng) => { W.placeObs(m, r, Math.floor(r.x + r.w / 2) - 1, r.y + 1, 2, 2, 'throne', rng); };

  // la lave éclaire les salles
  EXT.afterFeatures = function (m) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) === 5 && (x * 7 + y * 13) % 4 === 0) m.lights.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, r: 100, color: '#f07a2a', flick: false, kind: 'lava' });
    }
  };

  // torches et décors muraux
  EXT.wallKind.forge = (k) => (k % 2 ? 'chainwall' : 'torch');
  EXT.wallKind.desert = (k) => (k % 3 === 1 ? 'hieroglyph' : null);
  EXT.wallKind.ice = (k) => (k % 2 ? 'icicles' : 'torch');
  EXT.wallKind.dream = (k) => (k % 2 ? 'clockwall' : 'curtain');
  EXT.wallKind.void = (k) => (k % 2 ? 'voidcrack' : null);
  EXT.wallKind.ash = (k) => (k % 2 ? 'ashbanner' : 'torch');
  EXT.wallLight.voidcrack = [110, '#9b6fe0', false, 'vein'];

  // ================= Cases spéciales : lave et glace =================
  function has(m, v) { for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === v) return true; return false; }
  // contours arrondis : union de disques centrés sur chaque case (plus naturel que des carrés)
  function blobs(g, m, v, r) {
    g.beginPath();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (W.get(m, x, y) === v) { const cx = (x + 0.5) * T, cy = (y + 0.5) * T; g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, G.TAU); }
  }
  EXT.tiles = function (g, m) {
    if (has(m, 5)) {
      const rr = G.seeded(m.w * 17 + 5);
      // bord de roche refroidie, puis la lave
      blobs(g, m, 5, T * 0.86); g.fillStyle = '#2a1410'; g.fill();
      blobs(g, m, 5, T * 0.8); g.fillStyle = '#7a2a14'; g.fill();
      g.save(); blobs(g, m, 5, T * 0.72); g.clip();
      g.fillStyle = '#b8401a'; g.fillRect(0, 0, m.w * T, m.h * T);
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (W.get(m, x, y) !== 5) continue;
        const px = x * T, py = y * T;
        g.fillStyle = rr() < 0.5 ? '#f2a03a' : '#e8762a';
        S.blobPath(g, px + rr() * T, py + rr() * T, 8 + rr() * 8, 5 + rr() * 5, 3); g.fill();
        if (rr() < 0.45) { g.fillStyle = '#ffd36a'; S.blobPath(g, px + rr() * T, py + rr() * T, 3 + rr() * 4, 2 + rr() * 3, 1.5); g.fill(); }
        if (rr() < 0.35) {
          const cx = px + rr() * T, cy = py + rr() * T;
          S.poly(g, [[cx - 9, cy + 2], [cx - 4, cy - 5], [cx + 6, cy - 4], [cx + 9, cy + 3], [cx, cy + 6]], { fill: '#4a2014', fillA: 0.9, w: 0.8, single: true, stroke: 'rgba(30,10,5,0.8)' });
          S.line(g, cx - 5, cy, cx + 5, cy - 1, 0.8, '#ffb04a', 0.5, 1);
        }
      }
      g.restore();
    }
    if (has(m, 6)) {
      const rr = G.seeded(m.w * 19 + 7);
      blobs(g, m, 6, T * 0.8); g.fillStyle = 'rgba(80,120,160,0.45)'; g.fill();
      g.save(); blobs(g, m, 6, T * 0.74); g.clip();
      g.globalAlpha = 0.9; g.fillStyle = '#cfe7f5'; g.fillRect(0, 0, m.w * T, m.h * T); g.globalAlpha = 1;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (W.get(m, x, y) !== 6) continue;
        const px = x * T, py = y * T;
        if (rr() < 0.5) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.4; const ox = px + rr() * T * 0.6, oy = py + T * 0.4 + rr() * T * 0.5; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + 9, oy - 9); g.moveTo(ox + 5, oy + 1); g.lineTo(ox + 10, oy - 4); g.stroke(); }
        if (rr() < 0.25) { const ox = px + rr() * T, oy = py + rr() * T; S.line(g, ox, oy, ox + (rr() - 0.5) * 26, oy + (rr() - 0.5) * 26, 0.8, 'rgba(70,110,150,0.55)', 1, 1); }
        if (rr() < 0.12) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.arc(px + rr() * T, py + rr() * T, 1.5 + rr() * 2, 0, G.TAU); g.stroke(); }
      }
      g.restore();
    }
  };

  // ================= Sols =================
  const crack = (g, px, py, rng, col) => { const ox = px + rng() * T, oy = py + rng() * T; S.line(g, ox, oy, ox + (rng() - 0.5) * 22, oy + (rng() - 0.5) * 22, 0.9, col, 1, 1); };
  const grid = (g, x, y, px, py, col) => {
    if (x % 2 === 0) S.line(g, px, py, px, py + T, 0.9, col, 0.6, 1);
    if (y % 2 === 0) S.line(g, px, py, px + T, py, 0.9, col, 0.6, 1);
  };
  EXT.floor.forge = (g, m, x, y, px, py, r, rng) => {
    if (r < 0.1) {
      S.rect(g, px + 3, py + 3, T - 6, T - 6, { fill: '#8a7a6a', fillA: 0.18, stroke: 'rgba(70,45,30,0.45)', w: 1, single: true, amt: 0.6, over: 1 });
      g.fillStyle = 'rgba(60,40,30,0.55)'; for (const [ox, oy] of [[6, 6], [T - 8, 6], [6, T - 8], [T - 8, T - 8]]) g.fillRect(px + ox, py + oy, 2, 2);
    } else if (r < 0.2) crack(g, px, py, rng, 'rgba(50,30,20,0.45)');
    else if (r < 0.27) { g.globalAlpha = 0.16; g.fillStyle = '#1d100c'; S.blobPath(g, px + rng() * T, py + rng() * T, 9 + rng() * 8, 5 + rng() * 4, 2); g.fill(); g.globalAlpha = 1; }
    else if (r < 0.3) { g.fillStyle = 'rgba(240,140,60,0.75)'; g.fillRect(px + rng() * T, py + rng() * T, 2, 2); }
  };
  EXT.floor.desert = (g, m, x, y, px, py, r, rng) => {
    if (r < 0.35) {
      const ox = px + rng() * T, oy = py + rng() * T;
      g.strokeStyle = 'rgba(150,110,55,0.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(ox - 11, oy); g.quadraticCurveTo(ox - 2, oy - 4, ox + 10, oy + 1); g.stroke();
    } else if (r < 0.41) { g.fillStyle = 'rgba(120,90,50,0.45)'; for (let i = 0; i < 3; i++) g.fillRect(px + rng() * T, py + rng() * T, 2, 2); }
    else if (r < 0.43) { const ox = px + rng() * T, oy = py + rng() * T; S.line(g, ox - 5, oy, ox + 5, oy + 2, 1.6, '#efe7d0', 0.4, 1); }
  };
  EXT.floor.ice = (g, m, x, y, px, py, r, rng) => {
    grid(g, x, y, px, py, 'rgba(90,130,170,0.35)');
    if (r < 0.12) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; const ox = px + rng() * T * 0.6, oy = py + T * 0.4 + rng() * T * 0.5; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + 8, oy - 8); g.stroke(); }
    else if (r < 0.2) { g.globalAlpha = 0.6; g.fillStyle = '#f7fbff'; S.blobPath(g, px + rng() * T, py + rng() * T, 7 + rng() * 6, 3 + rng() * 2, 1.5); g.fill(); g.globalAlpha = 1; }
  };
  EXT.floor.dream = (g, m, x, y, px, py, r, rng) => {
    if ((x + y) % 2 === 0) { g.globalAlpha = 0.1; g.fillStyle = '#4a2f6a'; g.fillRect(px, py, T, T); g.globalAlpha = 1; }
    if (r < 0.07) {
      const ox = px + rng() * T, oy = py + rng() * T;
      g.fillStyle = ['#f0a0e0', '#9fd0f0', '#f2e04a'][Math.floor(rng() * 3)];
      for (let i = 0; i < 5; i++) { const a = (i / 5) * G.TAU; g.beginPath(); g.arc(ox + Math.cos(a) * 2.5, oy + Math.sin(a) * 2.5, 1.6, 0, G.TAU); g.fill(); }
    } else if (r < 0.15) { const ox = px + rng() * T, oy = py + rng() * T; for (let i = 0; i < 3; i++) S.line(g, ox + i * 3, oy, ox + i * 3 + (rng() - 0.5) * 4, oy - 5 - rng() * 4, 0.8, 'rgba(90,60,120,0.5)', 0.6, 1); }
  };
  EXT.floor.void = (g, m, x, y, px, py, r, rng) => {
    grid(g, x, y, px, py, 'rgba(40,30,60,0.32)');
    if (r < 0.05) S.circle(g, px + T / 2, py + T / 2, 9, { ry: 6, stroke: 'rgba(123,63,166,0.45)', w: 1, single: true });
    else if (r < 0.14) crack(g, px, py, rng, 'rgba(40,20,60,0.45)');
    else if (r < 0.19) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(px + rng() * T, py + rng() * T, 1.6, 1.6); }
  };
  EXT.floor.ash = (g, m, x, y, px, py, r, rng) => {
    grid(g, x, y, px, py, 'rgba(40,32,28,0.35)');
    if (r < 0.14) { g.globalAlpha = 0.35; g.fillStyle = '#9a948a'; S.blobPath(g, px + rng() * T, py + rng() * T, 9 + rng() * 8, 4 + rng() * 3, 2); g.fill(); g.globalAlpha = 1; }
    else if (r < 0.2) crack(g, px, py, rng, 'rgba(30,22,18,0.5)');
    else if (r < 0.23) { g.fillStyle = 'rgba(240,130,50,0.8)'; g.fillRect(px + rng() * T, py + rng() * T, 2, 2); }
  };

  // ================= Roche, dunes, vide =================
  EXT.void.forge = (g, m) => {
    g.globalAlpha = 0.95; g.fillStyle = '#24140e'; g.fill(); g.clip(); g.globalAlpha = 1;
    S.hatchArea(g, 0, 0, m.w * T, m.h * T, { sp: 7, ang: -0.9, c: '#0e0705', a: 0.5, w: 1, cross: true });
    const rr = G.seeded(m.w * 23);
    for (let i = 0; i < (m.w * m.h) / 40; i++) {
      const x = rr() * m.w * T, y = rr() * m.h * T, l = 10 + rr() * 22, a = rr() * G.TAU;
      S.line(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 1.4, 'rgba(240,120,40,0.55)', 2, 1);
    }
  };
  EXT.void.desert = (g, m) => {
    g.fillStyle = '#d6b27a'; g.fill(); g.clip();
    const rr = G.seeded(m.w * 29);
    for (let i = 0; i < (m.w * m.h) / 12; i++) {
      const x = rr() * m.w * T, y = rr() * m.h * T, w = 40 + rr() * 60;
      g.globalAlpha = 0.25; g.fillStyle = '#a07a42';
      g.beginPath(); g.moveTo(x - w / 2, y + 6); g.quadraticCurveTo(x, y - 10, x + w / 2, y + 6); g.quadraticCurveTo(x + w * 0.1, y + 2, x - w / 2, y + 6); g.fill();
      g.globalAlpha = 1; g.strokeStyle = 'rgba(140,100,50,0.5)'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x - w / 2, y + 6); g.quadraticCurveTo(x, y - 10, x + w / 2, y + 6); g.stroke();
    }
  };
  EXT.void.ice = (g, m) => {
    g.globalAlpha = 0.95; g.fillStyle = '#1d3048'; g.fill(); g.clip(); g.globalAlpha = 1;
    const rr = G.seeded(m.w * 31);
    for (let i = 0; i < (m.w * m.h) / 10; i++) {
      const x = rr() * m.w * T, y = rr() * m.h * T, l = 10 + rr() * 18;
      g.globalAlpha = 0.25; g.fillStyle = rr() < 0.5 ? '#6f9ac0' : '#9fc4de';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * 0.3); g.lineTo(x + l * 0.4, y + l); g.closePath(); g.fill();
      g.globalAlpha = 0.6; g.fillStyle = '#e8f4fb'; if (rr() < 0.3) g.fillRect(x + 2, y + 2, 1.6, 1.6);
    }
    g.globalAlpha = 1;
  };
  EXT.void.dream = (g, m) => {
    g.globalAlpha = 0.96; g.fillStyle = '#2a1a3a'; g.fill(); g.clip(); g.globalAlpha = 1;
    const rr = G.seeded(m.w * 37);
    for (let i = 0; i < (m.w * m.h) / 4; i++) {
      const x = rr() * m.w * T, y = rr() * m.h * T;
      g.fillStyle = rr() < 0.5 ? '#3e2a56' : '#2f3f3a';
      S.blobPath(g, x, y, 7 + rr() * 6, 5 + rr() * 4, 2, 8); g.fill();
      if (rr() < 0.05) { g.fillStyle = rr() < 0.5 ? '#f0a0e0' : '#f2e04a'; g.beginPath(); g.arc(x, y, 2, 0, G.TAU); g.fill(); }
    }
  };
  EXT.void.void = (g, m) => {
    g.fillStyle = '#07040f'; g.fill(); g.clip();
    const rr = G.seeded(m.w * 41);
    for (let i = 0; i < 12; i++) {
      const x = rr() * m.w * T, y = rr() * m.h * T, r = 90 + rr() * 160;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = rr() < 0.5 ? '123,63,166' : '60,80,170';
      gr.addColorStop(0, `rgba(${c},0.3)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < (m.w * m.h) / 3; i++) {
      const x = rr() * m.w * T, y = rr() * m.h * T, s = rr();
      g.fillStyle = s < 0.15 ? '#c9b8ff' : '#ffffff'; g.globalAlpha = 0.4 + rr() * 0.6;
      g.fillRect(x, y, s < 0.9 ? 1.2 : 2.2, s < 0.9 ? 1.2 : 2.2);
      if (s > 0.985) { g.strokeStyle = '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 4, y + 1); g.lineTo(x + 6, y + 1); g.moveTo(x + 1, y - 4); g.lineTo(x + 1, y + 6); g.stroke(); }
    }
    g.globalAlpha = 1;
  };
  EXT.void.ash = (g, m) => {
    g.globalAlpha = 0.95; g.fillStyle = '#1a1310'; g.fill(); g.clip(); g.globalAlpha = 1;
    S.hatchArea(g, 0, 0, m.w * T, m.h * T, { sp: 7, ang: -0.9, c: '#080504', a: 0.5, w: 1, cross: true });
    const rr = G.seeded(m.w * 43);
    for (let i = 0; i < (m.w * m.h) / 8; i++) { g.fillStyle = rr() < 0.7 ? 'rgba(240,120,40,0.6)' : 'rgba(255,200,90,0.7)'; g.fillRect(rr() * m.w * T, rr() * m.h * T, 1.8, 1.8); }
  };

  // ================= Faces des murs =================
  const bricks = (g, px, py, col, rows) => {
    for (let row = 0; row < rows; row++) {
      const hh = (T - 5) / rows, yy = py + 5 + row * hh;
      S.line(g, px, yy + hh, px + T, yy + hh, 0.9, col, 0.7, 1);
      for (let xx = row % 2 ? T / 2 : 0; xx < T; xx += T / 2) S.line(g, px + xx, yy, px + xx, yy + hh, 0.9, col, 0.5, 1);
    }
  };
  EXT.wallFace.forge = (g, m, th, x, y, px, py, rng) => {
    g.globalAlpha = 0.95; g.fillStyle = '#4a3028'; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
    bricks(g, px, py, 'rgba(20,10,5,0.6)', 2);
    if (rng() < 0.3) S.line(g, px + 6 + rng() * 20, py + 6, px + 4 + rng() * 24, py + T - 2, 1.2, 'rgba(240,130,50,0.85)', 2.5, 1);
  };
  EXT.wallFace.desert = (g, m, th, x, y, px, py, rng) => {
    g.globalAlpha = 0.95; g.fillStyle = '#c9a46a'; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
    bricks(g, px, py, 'rgba(90,60,25,0.55)', 2);
    if (rng() < 0.25) {
      const cx = px + 8 + rng() * 16, cy = py + 14 + rng() * 8;
      g.strokeStyle = 'rgba(90,55,20,0.8)'; g.lineWidth = 1.1;
      g.beginPath(); g.ellipse(cx, cy, 4, 2.4, 0, 0, G.TAU); g.moveTo(cx - 4, cy + 4); g.lineTo(cx + 4, cy + 4); g.stroke();
      g.fillStyle = 'rgba(90,55,20,0.9)'; g.fillRect(cx - 1, cy - 1, 2, 2);
    }
  };
  EXT.wallFace.ice = (g, m, th, x, y, px, py, rng) => {
    g.globalAlpha = 0.92; g.fillStyle = '#a8c8dc'; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
    for (let k = 0; k < 3; k++) S.line(g, px + 4 + k * 11 + rng() * 3, py + 6, px + 2 + k * 11 + rng() * 3, py + T, 0.9, 'rgba(255,255,255,0.75)', 0.6, 1);
    S.line(g, px, py + 6, px + T, py + 6, 1.6, 'rgba(255,255,255,0.9)', 0.4, 1);
    S.line(g, px, py + T - 3, px + T, py + T - 3, 0.9, 'rgba(40,70,100,0.5)', 0.5, 1);
  };
  EXT.wallFace.dream = (g, m, th, x, y, px, py, rng) => {
    g.globalAlpha = 0.95; g.fillStyle = '#3e2a56'; g.fillRect(px, py + 2, T, T - 2); g.globalAlpha = 1;
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#4f3a6a' : '#2f4a3a'; S.blobPath(g, px + 4 + k * 8, py + T - 4, 6, 5, 1.5, 7); g.fill(); g.strokeStyle = 'rgba(20,10,30,0.6)'; g.lineWidth = 0.8; g.stroke(); }
    if (rng() < 0.35) { g.fillStyle = rng() < 0.5 ? '#f0a0e0' : '#f2e04a'; g.beginPath(); g.arc(px + 6 + rng() * 20, py + 10 + rng() * 10, 2.4, 0, G.TAU); g.fill(); }
  };
  EXT.wallFace.void = () => {}; // le vide au-dessus des îles flottantes : rien à dessiner
  EXT.wallFace.ash = (g, m, th, x, y, px, py, rng) => {
    g.globalAlpha = 0.95; g.fillStyle = '#3a3430'; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
    bricks(g, px, py, 'rgba(10,6,4,0.6)', 2);
    if (rng() < 0.2) { g.fillStyle = 'rgba(240,120,40,0.75)'; g.fillRect(px + 4 + rng() * 22, py + 8 + rng() * 18, 2.5, 1.5); }
    S.hatchCircle(g, px + T / 2, py + T / 2 + 4, T / 2, T / 2 - 4, { sp: 5, c: '#0a0605', a: 0.25, w: 0.7 });
  };

  // îles flottantes : falaise sous le bord sud
  EXT.overlay.void = (g, m, rng) => {
    for (let y = 1; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0 || !W.isFloor(m, x, y - 1)) continue;
      const px = x * T, py = y * T, h = T * (0.7 + rng() * 0.8);
      g.fillStyle = '#3a2f50';
      g.beginPath(); g.moveTo(px - 1, py); g.lineTo(px + T + 1, py); g.lineTo(px + T - 4, py + h * 0.7); g.lineTo(px + T * 0.55, py + h); g.lineTo(px + 5, py + h * 0.75); g.closePath(); g.fill();
      S.hatchArea(g, px, py, T, h, { sp: 4, ang: 1.4, c: '#120c1e', a: 0.4, w: 0.7 });
      S.line(g, px + 5, py + h * 0.75, px + T * 0.55, py + h, 1.1, '#120c1e', 0.8, 1);
      S.line(g, px + T * 0.55, py + h, px + T - 4, py + h * 0.7, 1.1, '#120c1e', 0.8, 1);
      if (rng() < 0.25) { g.fillStyle = '#9b6fe0'; g.fillRect(px + 8 + rng() * 14, py + 6 + rng() * h * 0.4, 2, 2); }
    }
  };

  // ================= Obstacles =================
  Object.assign(EXT.obstacle, {
    furnace(g, m, o, x, y, w, h, cx, cy, rr) {
      S.rect(g, x + 2, y - 10, w - 4, h + 6, { fill: '#6b4a3a', w: 2, hatch: { sp: 5, ang: 1.5, c: '#1d100c', a: 0.3, w: 0.7 } });
      S.rect(g, cx - 8, y - 34, 16, 26, { fill: '#5a3a2c', w: 1.6 });
      g.fillStyle = '#2a1410'; g.beginPath(); g.moveTo(cx - 14, y + h - 8); g.lineTo(cx - 14, cy); g.quadraticCurveTo(cx, cy - 16, cx + 14, cy); g.lineTo(cx + 14, y + h - 8); g.closePath(); g.fill();
      g.fillStyle = '#f2a03a'; g.beginPath(); g.moveTo(cx - 10, y + h - 9); g.lineTo(cx - 10, cy + 3); g.quadraticCurveTo(cx, cy - 9, cx + 10, cy + 3); g.lineTo(cx + 10, y + h - 9); g.closePath(); g.fill();
      g.fillStyle = '#ffd36a'; S.blobPath(g, cx, y + h - 14, 7, 4, 1.5); g.fill();
      S.line(g, x + 2, cy + 8, x + w - 2, cy + 8, 1, 'rgba(20,10,5,0.6)', 0.6, 1);
    },
    titanstatue(g, m, o, x, y, w, h, cx, cy) {
      S.rect(g, cx - 13, cy + 2, 26, 12, { fill: '#6b5a50', w: 1.5 });
      S.circle(g, cx, cy - 8, 11, { ry: 12, fill: '#8a7a6e', w: 1.5, hatch: { sp: 4, c: INK, a: 0.25, w: 0.6 } });
      S.circle(g, cx, cy - 26, 7, { fill: '#8a7a6e', w: 1.3 });
      S.line(g, cx + 10, cy - 10, cx + 16, cy - 34, 2.4, '#5a4a40'); S.rect(g, cx + 9, cy - 42, 14, 9, { fill: '#5a5a60', w: 1.2 });
      g.fillStyle = '#f08a2a'; g.fillRect(cx - 3, cy - 28, 2, 2); g.fillRect(cx + 2, cy - 28, 2, 2);
    },
    obelisk(g, m, o, x, y, w, h, cx, cy) {
      S.rect(g, cx - 12, cy + 4, 24, 9, { fill: '#a88a5a', w: 1.4 });
      S.poly(g, [[cx - 8, cy + 5], [cx - 6, cy - 34], [cx, cy - 42], [cx + 6, cy - 34], [cx + 8, cy + 5]], { fill: '#d6b27a', w: 1.6, hatch: { sp: 5, ang: 1.5, c: '#6b4a24', a: 0.25, w: 0.6 } });
      for (let k = 0; k < 3; k++) { const yy = cy - 26 + k * 10; S.circle(g, cx, yy, 2.4, { ry: 1.6, stroke: '#6b4a24', w: 0.9, single: true }); S.line(g, cx - 3, yy + 4, cx + 3, yy + 4, 0.8, '#6b4a24', 0.3, 1); }
    },
    ribs(g, m, o, x, y, w, h, cx, cy) {
      S.line(g, x + 4, cy + 10, x + w - 4, cy + 6, 3, '#e4dcc6', 0.8, 1);
      for (let k = 0; k < 5; k++) {
        const bx = x + 8 + k * (w - 16) / 4;
        g.strokeStyle = INK; g.lineWidth = 4.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx, cy + 8); g.quadraticCurveTo(bx - 10, cy - 22, bx + 2, cy - 34 + Math.abs(k - 2) * 5); g.stroke();
        g.strokeStyle = '#efe7d0'; g.lineWidth = 2.8; g.stroke();
      }
      S.circle(g, x + w - 6, cy + 2, 9, { ry: 7, fill: '#e4dcc6', w: 1.3 });
      g.fillStyle = INK; g.fillRect(x + w - 9, cy, 2.5, 2.5);
    },
    icepillar(g, m, o, x, y, w, h, cx, cy) {
      S.circle(g, cx, cy + 10, 14, { ry: 6, fill: '#9fc0d8', w: 1.4 });
      S.poly(g, [[cx - 10, cy + 10], [cx - 9, cy - 30], [cx - 3, cy - 38], [cx + 5, cy - 36], [cx + 10, cy - 28], [cx + 10, cy + 10]], { fill: '#cfe7f5', fillA: 0.85, w: 1.5 });
      S.line(g, cx - 4, cy + 6, cx - 3, cy - 32, 1.2, 'rgba(255,255,255,0.9)', 0.3, 1);
      S.line(g, cx + 4, cy + 4, cx + 6, cy - 24, 0.8, 'rgba(70,110,150,0.6)', 0.4, 1);
    },
    icestatue(g, m, o, x, y, w, h, cx, cy) {
      S.rect(g, cx - 14, cy - 34, 28, 46, { fill: '#cfe7f5', fillA: 0.75, w: 1.5 });
      S.circle(g, cx, cy - 6, 8, { ry: 10, fill: '#8a9cb0', fillA: 0.6, w: 1, single: true });
      S.circle(g, cx, cy - 22, 6, { fill: '#8a9cb0', fillA: 0.6, w: 1, single: true });
      S.line(g, cx + 8, cy + 6, cx + 8, cy - 28, 1.6, 'rgba(90,110,130,0.7)', 0.4, 1);
      S.line(g, cx - 10, cy - 30, cx - 6, cy + 8, 1, 'rgba(255,255,255,0.9)', 0.4, 1);
    },
    dreamtree(g, m, o, x, y, w, h, cx, cy, rr) {
      g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, cy + 12); g.bezierCurveTo(cx - 10, cy - 2, cx + 10, cy - 14, cx - 2, cy - 26); g.stroke();
      g.strokeStyle = '#5a3a6a'; g.lineWidth = 4; g.stroke();
      for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.7; S.circle(g, cx - 2 + Math.cos(a) * 14, cy - 30 + Math.sin(a) * 8, 10, { fill: k % 2 ? '#9c7cc4' : '#c97ab0', w: 1.3 }); }
      S.circle(g, cx - 2, cy - 30, 5, { fill: '#f7eed7', w: 1 });
      g.fillStyle = INK; g.beginPath(); g.arc(cx - 2 + Math.cos(rr() * 6) * 1.5, cy - 30, 2, 0, G.TAU); g.fill();
    },
    hourglass(g, m, o, x, y, w, h, cx, cy) {
      S.rect(g, cx - 14, cy + 6, 28, 6, { fill: '#8a6236', w: 1.4 }); S.rect(g, cx - 14, cy - 40, 28, 6, { fill: '#8a6236', w: 1.4 });
      S.poly(g, [[cx - 11, cy - 34], [cx + 11, cy - 34], [cx + 2, cy - 14], [cx + 11, cy + 6], [cx - 11, cy + 6], [cx - 2, cy - 14]], { fill: '#e8f0f4', fillA: 0.6, w: 1.4 });
      S.poly(g, [[cx - 9, cy + 5], [cx + 9, cy + 5], [cx, cy - 6]], { fill: '#e4c070', w: 0.8, single: true });
      S.poly(g, [[cx - 6, cy - 30], [cx + 6, cy - 30], [cx, cy - 18]], { fill: '#e4c070', w: 0.8, single: true });
      S.line(g, cx, cy - 16, cx, cy - 4, 0.8, '#c9a227', 0.2, 1);
    },
    monolith(g, m, o, x, y, w, h, cx, cy) {
      S.circle(g, cx, cy + 10, 14, { ry: 5, fill: '#2a1f3a', fillA: 0.5, w: 1, single: true });
      S.poly(g, [[cx - 9, cy + 8], [cx - 10, cy - 30], [cx - 2, cy - 38], [cx + 9, cy - 32], [cx + 9, cy + 8]], { fill: '#241a33', w: 1.6 });
      for (let k = 0; k < 3; k++) S.line(g, cx - 4, cy - 24 + k * 10, cx + 4, cy - 20 + k * 10, 1.4, '#b48ae0', 0.4, 1);
      S.poly(g, [[cx + 12, cy - 40], [cx + 18, cy - 44], [cx + 20, cy - 37]], { fill: '#3a2f50', w: 1 });
    },
    ashstatue(g, m, o, x, y, w, h, cx, cy) {
      S.rect(g, cx - 13, cy + 2, 26, 12, { fill: '#4a4440', w: 1.5 });
      S.circle(g, cx, cy - 6, 10, { ry: 11, fill: '#5a524a', w: 1.4, hatch: { sp: 4, c: '#0a0605', a: 0.35, w: 0.6 } });
      S.circle(g, cx, cy - 22, 7, { fill: '#5a524a', w: 1.3 });
      S.poly(g, [[cx - 7, cy - 27], [cx - 5, cy - 34], [cx, cy - 29], [cx + 5, cy - 34], [cx + 7, cy - 27]], { fill: '#3a3430', w: 1 });
      S.line(g, cx - 12, cy + 2, cx - 12, cy - 30, 2.2, '#3a3430');
      g.fillStyle = '#f08a2a'; g.fillRect(cx - 3, cy - 24, 2, 2); g.fillRect(cx + 2, cy - 24, 2, 2);
    },
    throne(g, m, o, x, y, w, h, cx, cy) {
      S.rect(g, x - 10, y + h - 14, w + 20, 14, { fill: '#3a3430', w: 1.6 });
      S.poly(g, [[x - 2, y + h - 12], [x - 4, y - 34], [cx - 12, y - 50], [cx, y - 58], [cx + 12, y - 50], [x + w + 4, y - 34], [x + w + 2, y + h - 12]], { fill: '#2a2622', w: 2, hatch: { sp: 5, ang: 1.5, c: '#0a0605', a: 0.35, w: 0.7 } });
      S.rect(g, x + 6, y - 22, w - 12, h + 4, { fill: '#5a1a14', w: 1.4 });
      for (const sx of [x - 6, x + w + 6]) { S.rect(g, sx - 5, y + h - 30, 10, 20, { fill: '#3a3430', w: 1.3 }); }
      S.circle(g, cx, y - 40, 7, { fill: '#c9a227', w: 1.2 });
      for (let k = 0; k < 3; k++) S.line(g, cx - 8 + k * 8, y - 48, cx - 6 + k * 6, y - 56 - (k === 1 ? 6 : 0), 1.6, '#f08a2a', 0.6, 1);
    },
    pillar_ash(g, m, o, x, y, w, h, cx) {
      S.circle(g, cx, y + h - 6, w * 0.45, { ry: 9, fill: '#3a3430', w: 1.6 });
      S.rect(g, cx - w * 0.3, y - 18, w * 0.6, h - 6 + 18 - 4, { fill: '#5a524a', w: 1.8, hatch: { sp: 5, ang: 1.5, c: '#0a0605', a: 0.3, w: 0.7 } });
      S.rect(g, cx - w * 0.38, y - 26, w * 0.76, 10, { fill: '#4a4440', w: 1.6 });
      S.line(g, cx + w * 0.1, y - 12, cx - w * 0.05, y + h - 14, 1.1, 'rgba(240,120,40,0.75)', 1.5, 1);
    },
    pillar_forge(g, m, o, x, y, w, h, cx) {
      S.circle(g, cx, y + h - 6, w * 0.45, { ry: 9, fill: '#4a3028', w: 1.6 });
      S.rect(g, cx - w * 0.3, y - 18, w * 0.6, h - 6 + 18 - 4, { fill: '#7a5a48', w: 1.8, hatch: { sp: 5, ang: 1.5, c: '#1d100c', a: 0.3, w: 0.7 } });
      S.rect(g, cx - w * 0.38, y - 26, w * 0.76, 10, { fill: '#5a5a60', w: 1.6 });
      for (let k = 0; k < 2; k++) S.line(g, cx - w * 0.3, y + k * 18, cx + w * 0.3, y + k * 18, 2, '#5a5a60', 0.5, 1);
    },
  });

  // ================= Décors muraux =================
  Object.assign(EXT.wallDeco, {
    chainwall(g, d, x, y) {
      for (const ox of [-8, 8]) for (let k = 0; k < 4; k++) S.circle(g, x + ox, y + 6 + k * 6, 2.4, { ry: 3.4, stroke: '#4a4a50', w: 1.2, single: true });
      S.line(g, x - 12, y + 4, x + 12, y + 4, 2, '#3a2a1a');
    },
    hieroglyph(g, d, x, y) {
      S.rect(g, x - 12, y + 6, 24, 22, { fill: '#b8925a', w: 1.2 });
      g.strokeStyle = '#6b4a24'; g.lineWidth = 1.1;
      g.beginPath(); g.ellipse(x - 5, y + 13, 3.5, 2, 0, 0, G.TAU); g.moveTo(x + 3, y + 10); g.lineTo(x + 3, y + 18); g.moveTo(x + 1, y + 12); g.lineTo(x + 7, y + 12);
      g.moveTo(x - 9, y + 22); g.quadraticCurveTo(x - 5, y + 18, x - 1, y + 22); g.moveTo(x + 2, y + 24); g.lineTo(x + 8, y + 20); g.stroke();
    },
    clockwall(g, d, x, y) {
      S.circle(g, x, y + 16, 10, { fill: '#f7eed7', w: 1.4 });
      const a = (d.seed % 12) / 12 * G.TAU;
      S.line(g, x, y + 16, x + Math.cos(a) * 6, y + 16 + Math.sin(a) * 6, 1.2, INK, 0.2, 1); S.line(g, x, y + 16, x + 3, y + 10, 1, INK, 0.2, 1);
      S.line(g, x + 4, y + 25, x + 6, y + 32, 1.2, '#f7eed7', 0.4, 1);
    },
    curtain(g, d, x, y) {
      S.line(g, x - 14, y + 4, x + 14, y + 4, 2, '#3a2a1a');
      for (const sd of [-1, 1]) S.poly(g, [[x + sd * 2, y + 4], [x + sd * 14, y + 4], [x + sd * 12, y + 30], [x + sd * 6, y + 24]], { fill: '#7a2a5a', w: 1.2 });
    },
    voidcrack(g, d, x, y) {
      g.fillStyle = '#05030c'; g.beginPath(); g.moveTo(x - 2, y + 4); g.lineTo(x + 4, y + 14); g.lineTo(x, y + 20); g.lineTo(x + 3, y + 30); g.lineTo(x - 3, y + 21); g.lineTo(x - 1, y + 13); g.closePath(); g.fill();
      g.strokeStyle = '#b48ae0'; g.lineWidth = 1.2; g.stroke();
    },
    ashbanner(g, d, x, y) {
      S.poly(g, [[x - 10, y + 4], [x + 10, y + 4], [x + 9, y + 22], [x + 4, y + 28], [x, y + 21], [x - 6, y + 29], [x - 10, y + 20]], { fill: '#2a1a14', w: 1.4 });
      S.circle(g, x, y + 13, 4, { fill: '#9b2c20', w: 0.8 });
      S.line(g, x - 12, y + 4, x + 12, y + 4, 2, '#3a2a1a');
    },
  });

  // ================= Décorations au sol =================
  Object.assign(EXT.deco, {
    ingot(g, d, x, y) {
      for (let k = 0; k < 3; k++) S.poly(g, [[x - 8 + (k % 2) * 4, y - k * 4], [x + 6 + (k % 2) * 4, y - k * 4], [x + 8 + (k % 2) * 4, y + 4 - k * 4], [x - 10 + (k % 2) * 4, y + 4 - k * 4]], { fill: k === 2 ? '#d9b52e' : '#8a8c92', w: 1, single: true });
    },
    chain(g, d, x, y) { for (let k = 0; k < 6; k++) S.circle(g, x - 12 + k * 5, y + Math.sin(k) * 3, 2.6, { ry: 2, stroke: '#4a4a50', w: 1.1, single: true }); },
    slag(g, d, x, y, s) {
      S.circle(g, x, y, 9 * s, { ry: 6 * s, fill: '#3a2014', w: 1.2 });
      g.fillStyle = '#f2a03a'; S.blobPath(g, x + 1, y - 1, 4 * s, 2.5 * s, 1); g.fill();
    },
    cactus(g, d, x, y, s) {
      S.rect(g, x - 4 * s, y - 20 * s, 8 * s, 24 * s, { fill: '#5d7a3a', w: 1.3 });
      S.rect(g, x - 12 * s, y - 14 * s, 6 * s, 10 * s, { fill: '#5d7a3a', w: 1.1 }); S.rect(g, x + 6 * s, y - 18 * s, 6 * s, 9 * s, { fill: '#5d7a3a', w: 1.1 });
      for (let k = 0; k < 4; k++) S.line(g, x - 2 + (k % 2) * 4, y - 16 * s + k * 5, x - 4 + (k % 2) * 8, y - 17 * s + k * 5, 0.6, INK, 0.2, 1);
      if (d.seed % 3 === 0) S.circle(g, x, y - 22 * s, 3, { fill: '#e07aa0', w: 0.8 });
    },
    skullbig(g, d, x, y, s) {
      S.circle(g, x, y - 3, 11 * s, { ry: 8 * s, fill: '#efe7d0', w: 1.4 });
      g.fillStyle = INK; g.fillRect(x - 6 * s, y - 5, 3.5, 3); g.fillRect(x + 2 * s, y - 5, 3.5, 3);
      for (const sd of [-1, 1]) { g.strokeStyle = '#d9cba0'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x + sd * 9 * s, y - 7); g.quadraticCurveTo(x + sd * 20 * s, y - 12, x + sd * 18 * s, y - 22); g.stroke(); }
    },
    pot(g, d, x, y, s) {
      S.circle(g, x, y, 8 * s, { ry: 9 * s, fill: '#b5642c', w: 1.4 });
      S.rect(g, x - 4 * s, y - 13 * s, 8 * s, 5 * s, { fill: '#a0582a', w: 1 });
      S.line(g, x - 7 * s, y - 1, x + 7 * s, y - 1, 0.9, '#efe7d0', 0.3, 1);
    },
    icecrystal(g, d, x, y) {
      for (let k = 0; k < 3; k++) S.poly(g, [[x - 7 + k * 6, y + 5], [x - 5 + k * 6, y - 9 - k * 3], [x - 1 + k * 6, y + 5]], { fill: k % 2 ? '#bfe4f4' : '#e8f4fb', w: 0.9, single: true });
    },
    frozenbones(g, d, x, y) {
      S.line(g, x - 8, y - 2, x + 8, y + 3, 2, '#cfc7b4'); S.circle(g, x + 9, y - 5, 4, { fill: '#e4dcc6', w: 1 });
      g.globalAlpha = 0.6; g.fillStyle = '#cfe7f5'; S.blobPath(g, x, y, 13, 7, 2); g.fill(); g.globalAlpha = 1;
    },
    brokenshield(g, d, x, y) {
      S.poly(g, [[x - 9, y - 8], [x + 9, y - 8], [x + 8, y + 2], [x, y + 9], [x - 3, y]], { fill: '#8a9cb0', w: 1.3 });
      S.line(g, x - 3, y, x + 2, y - 8, 1, INK, 0.5, 1);
      g.fillStyle = '#f7fbff'; S.blobPath(g, x + 3, y - 8, 6, 2, 1); g.fill();
    },
    dreamflower(g, d, x, y, s) {
      S.line(g, x, y + 4, x + 2, y - 12 * s, 1.4, '#4f6b2b', 0.6, 1);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * G.TAU; S.circle(g, x + 2 + Math.cos(a) * 5 * s, y - 14 * s + Math.sin(a) * 5 * s, 3.4 * s, { fill: d.seed % 2 ? '#f0a0e0' : '#9fd0f0', w: 0.8, single: true }); }
      S.circle(g, x + 2, y - 14 * s, 2.5 * s, { fill: '#f2e04a', w: 0.6, single: true });
    },
    clock(g, d, x, y) {
      g.save(); g.translate(x, y); g.scale(1, 0.75);
      S.circle(g, 0, 0, 10, { fill: '#f7eed7', w: 1.3 });
      S.line(g, 0, 0, 5, -4, 1, INK, 0.2, 1); S.line(g, 0, 0, -2, 7, 1, INK, 0.2, 1);
      g.restore();
      S.poly(g, [[x + 6, y + 4], [x + 12, y + 10], [x + 8, y + 12]], { fill: '#f7eed7', w: 0.8, single: true });
    },
    cards(g, d, x, y) {
      for (let k = 0; k < 3; k++) {
        g.save(); g.translate(x - 8 + k * 7, y + (k % 2) * 3); g.rotate((k - 1) * 0.5 + (d.seed % 5) * 0.1);
        S.rect(g, -4, -6, 8, 12, { fill: '#f7f2e6', w: 0.8, single: true });
        g.fillStyle = k % 2 ? '#a8321f' : INK; g.fillRect(-1.5, -2, 3, 3);
        g.restore();
      }
    },
    eyeplant(g, d, x, y) {
      const t = G.Game.time || 0;
      S.line(g, x, y + 4, x - 2, y - 14, 1.6, '#4f6b2b', 1, 1);
      S.circle(g, x - 2, y - 18, 6, { fill: '#f7eed7', w: 1.2 });
      g.fillStyle = INK; g.beginPath(); g.arc(x - 2 + Math.sin(t + d.seed) * 2, y - 18, 2.4, 0, G.TAU); g.fill();
      S.poly(g, [[x, y - 2], [x + 8, y - 8], [x + 3, y]], { fill: '#5d7a3a', w: 0.8, single: true });
    },
    teacup(g, d, x, y) {
      S.circle(g, x, y + 2, 9, { ry: 3.5, fill: '#efe3c6', w: 1 });
      S.poly(g, [[x - 6, y - 4], [x + 6, y - 4], [x + 4, y + 2], [x - 4, y + 2]], { fill: '#e8b0c0', w: 1 });
      g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.arc(x + 7, y - 1, 2.6, -1.2, 1.2); g.stroke();
    },
    starshard(g, d, x, y) {
      S.poly(g, [[x, y - 9], [x + 3, y - 2], [x + 9, y], [x + 3, y + 2], [x, y + 8], [x - 3, y + 2], [x - 9, y], [x - 3, y - 2]], { fill: '#e8e0ff', w: 1 });
    },
    floatrock(g, d, x, y) {
      const t = G.Game.time || 0, bob = Math.sin(t * 1.5 + d.seed) * 3;
      g.globalAlpha = 0.25; g.fillStyle = INK; g.beginPath(); g.ellipse(x, y + 6, 8, 3, 0, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      S.poly(g, [[x - 8, y - 10 + bob], [x - 2, y - 15 + bob], [x + 7, y - 11 + bob], [x + 4, y - 4 + bob], [x - 5, y - 5 + bob]], { fill: '#4a3f60', w: 1.1 });
    },
    voidcrystal(g, d, x, y) {
      for (let k = 0; k < 3; k++) S.poly(g, [[x - 6 + k * 5, y + 4], [x - 4 + k * 5, y - 10 - (k % 2) * 4], [x - 1 + k * 5, y + 4]], { fill: k % 2 ? '#9b6fe0' : '#5a3f86', w: 0.9, single: true });
    },
    ashpile(g, d, x, y, s) {
      g.fillStyle = '#9a948a'; S.blobPath(g, x, y, 13 * s, 6 * s, 2, 10); g.fill();
      g.strokeStyle = 'rgba(40,32,28,0.6)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(240,120,40,0.8)'; g.fillRect(x - 2, y - 2, 2, 2);
    },
    brokenbanner(g, d, x, y) {
      S.line(g, x - 10, y + 8, x + 12, y - 16, 2, '#3a2a1a');
      S.poly(g, [[x + 8, y - 12], [x + 18, y - 4], [x + 12, y + 4], [x + 4, y - 2]], { fill: '#5a1a14', w: 1 });
    },
    burntbones(g, d, x, y) {
      S.line(g, x - 8, y - 3, x + 8, y + 3, 2, '#5a524a'); S.line(g, x - 7, y + 4, x + 6, y - 4, 2, '#5a524a');
      S.circle(g, x + 9, y - 6, 4, { fill: '#6a625a', w: 1.1 });
    },
  });
})();
