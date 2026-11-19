// Cartes : donjons (plan fixe), ville de Havre-Gris, camp du tutoriel, rendu crayonné, collisions, chemins, brouillard.
// Cases : 0 = roche/mur, 1 = sol, 2 = grille du boss, 3 = obstacle/bâtiment, 4 = eau peu profonde (ralentit),
// 5 = lave (brûle), 6 = glace (glisse). Les décors des donjons 10 à 15 sont dans world2.js (W.EXT).
(function () {
  const D = G.D, S = G.S;
  const T = D.TILE;
  const W = (G.W = {});
  const STATUE = (W.STATUE = { crypt: 'angel', bastion: 'knight', library: 'bust', mine: 'rockpile', forest: 'tree', swamp: 'deadtree', crystal: 'crystal', peak: 'icerock', temple: 'column' });
  // Extensions de rendu et de construction (remplies par world2.js)
  W.EXT = { floor: {}, void: {}, wallFace: {}, overlay: {}, obstacle: {}, wallDeco: {}, deco: {}, feature: {}, wallKind: {}, wallLight: {}, obsLight: {}, tiles: null, afterFeatures: null };
  const LIGHT_DECOS = (W.LIGHT_DECOS = { candle: [95, '#f2b45a'], lantern: [130, '#f2c46b'], brazier: [165, '#f08a2a'], candelabra: [130, '#f2c46b'], glowshroom: [75, '#9be0b0'], campfire: [190, '#f08a2a'],
    crystalsmall: [80, '#9fd8f0'], runes: [85, '#7fd0e0'] });

  function newMap(w, h, theme) {
    return {
      w, h, theme, tiles: new Uint8Array(w * h), corr: new Uint8Array(w * h), explored: new Uint8Array(w * h),
      rooms: [], gate: [], gateLocked: false, decos: [], obstacles: [], lights: [], npcs: [], buildings: [], chimneys: [], wallDecos: [], sinks: [],
    };
  }
  W.get = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.tiles[y * m.w + x]);
  W.set = (m, x, y, v) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[y * m.w + x] = v; };
  W.isFloor = (m, x, y) => { const t = W.get(m, x, y); return t === 1 || t === 2 || t >= 4; };
  W.isWater = (m, x, y) => W.get(m, x, y) === 4;
  W.lavaAt = (m, px, py) => W.get(m, Math.floor(px / T), Math.floor(py / T)) === 5;
  W.iceAt = (m, px, py) => W.get(m, Math.floor(px / T), Math.floor(py / T)) === 6;
  W.solidTile = (m, x, y) => { const t = W.get(m, x, y); return t === 0 || t === 3 || (t === 2 && m.gateLocked); };
  W.solidAt = (m, px, py) => W.solidTile(m, Math.floor(px / T), Math.floor(py / T));
  W.waterAt = (m, px, py) => W.isWater(m, Math.floor(px / T), Math.floor(py / T));

  function carve(m, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) W.set(m, i, j, 1); }
  function corridor(m, a, b) {
    const ax = Math.floor(a[0] + a[2] / 2), ay = Math.floor(a[1] + a[3] / 2);
    const bx = Math.floor(b[0] + b[2] / 2), by = Math.floor(b[1] + b[3] / 2);
    const mark = (x, y) => { W.set(m, x, y, 1); if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.corr[y * m.w + x] = 1; };
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let d = -1; d <= 1; d++) mark(x, ay + d);
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let d = -1; d <= 1; d++) mark(bx + d, y);
  }

  // "skeleton:3 skelArcher!:1 chest #pillars"
  W.parseSpawns = function (spec) {
    const out = [];
    (spec || '').split(/\s+/).filter(Boolean).forEach((tok) => {
      if (tok[0] === '#') { out.push({ feature: tok.slice(1) }); return; }
      if (tok === 'chest' || tok === 'boss' || tok === 'entry') { out.push({ special: tok }); return; }
      const [name, n] = tok.split(':');
      const elite = name.endsWith('!');
      out.push({ type: elite ? name.slice(0, -1) : name, n: parseInt(n || '1', 10), elite });
    });
    return out;
  };

  // ---------- Obstacles de salle (toujours au même endroit grâce à la graine) ----------
  function placeObs(m, r, x, y, w, h, kind, rng) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) W.set(m, i, j, 3);
    const seed = Math.floor(rng() * 1e6);
    m.obstacles.push({ x, y, w, h, kind, room: r.idx, seed });
    if (kind === 'crystal') m.lights.push({ x: (x + 0.5) * T, y: (y + 0.2) * T, r: 150, color: seed % 2 ? '#8fd8f0' : '#c9a0f0', flick: false, kind: 'crystal' });
    const L = W.EXT.obsLight[kind];
    if (L) m.lights.push({ x: (x + w / 2) * T, y: (y + h * 0.4) * T, r: L[0], color: L[1], flick: !!L[2], kind: L[3] || 'crystal' });
  }
  W.placeObs = placeObs;
  function addFeature(m, r, f, rng) {
    const th = D.THEMES[m.theme];
    const cx = Math.floor(r.x + r.w / 2), cy = Math.floor(r.y + r.h / 2);
    const inCross = (x, y, w, h) => !(x + w - 1 < cx - 1 || x > cx + 1) || !(y + h - 1 < cy - 1 || y > cy + 1);
    const ok = (x, y, w, h, margin) => {
      if (x < r.x + margin || y < r.y + margin || x + w > r.x + r.w - margin || y + h > r.y + r.h - margin) return false;
      if (inCross(x, y, w, h)) return false;
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) {
        if (i < 0 || j < 0 || i >= m.w || j >= m.h || m.corr[j * m.w + i]) return false;
        const t = W.get(m, i, j), inside = i >= x && i < x + w && j >= y && j < y + h;
        if (inside && t !== 1) return false;
        if (!inside && t === 3) return false;
      }
      return true;
    };
    if (f === 'pillars') {
      for (let y = r.y + 3; y + 2 <= r.y + r.h - 3; y += 5) for (let x = r.x + 3; x + 2 <= r.x + r.w - 3; x += 5) if (ok(x, y, 2, 2, 2)) placeObs(m, r, x, y, 2, 2, m.theme === 'mine' ? 'beam' : 'pillar', rng);
    } else if (f === 'shelves') {
      for (let y = r.y + 2; y <= r.y + r.h - 3; y += 3) for (const [a, b] of [[r.x + 2, cx - 2], [cx + 2, r.x + r.w - 3]]) {
        const len = b - a + 1;
        if (len >= 2 && ok(a, y, len, 1, 2)) placeObs(m, r, a, y, len, 1, 'shelf', rng);
      }
    } else if (f === 'water') {
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const wx = r.x + 2 + rng() * (r.w - 4), wy = r.y + 2 + rng() * (r.h - 4), rad = 1.6 + rng() * 2.2;
        for (let y = Math.floor(wy - rad); y <= wy + rad; y++) for (let x = Math.floor(wx - rad * 1.4); x <= wx + rad * 1.4; x++) {
          if (((x + 0.5 - wx) / 1.4) ** 2 + (y + 0.5 - wy) ** 2 > rad * rad) continue;
          if (x <= r.x || y <= r.y || x >= r.x + r.w - 1 || y >= r.y + r.h - 1) continue;
          if (W.get(m, x, y) === 1) W.set(m, x, y, 4);
        }
      }
    } else if (W.EXT.feature[f]) {
      W.EXT.feature[f](m, r, rng, { ok, cx, cy, inCross });
    } else if (f === 'trees' || f === 'statues' || f === 'crystals') {
      const n = f === 'statues' ? 2 + Math.floor(rng() * 3) : 3 + Math.floor(rng() * 3);
      const kind = f === 'trees' ? (th.obstacle === 'deadtree' || th.obstacle === 'pine' ? th.obstacle : 'tree') : f === 'crystals' ? 'crystal' : STATUE[m.theme] || 'angel';
      for (let k = 0, tries = 0; k < n && tries < 80; tries++) {
        const x = r.x + 2 + Math.floor(rng() * (r.w - 4)), y = r.y + 2 + Math.floor(rng() * (r.h - 4));
        if (ok(x, y, 1, 1, 2)) { placeObs(m, r, x, y, 1, 1, kind, rng); k++; }
      }
    }
  }

  function reach(m, sx, sy) {
    const seen = new Uint8Array(m.w * m.h), q = [sy * m.w + sx];
    seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], x = c % m.w, y = (c / m.w) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ox, ny = y + oy, t = W.get(m, nx, ny);
        if (t === 0 || t === 3) continue;
        const ni = ny * m.w + nx;
        if (!seen[ni]) { seen[ni] = 1; q.push(ni); }
      }
    }
    return seen;
  }

  W.buildDungeon = function (def) {
    const m = newMap(def.w, def.h, def.theme);
    m.def = def;
    def.rooms.forEach((r, i) => { carve(m, r[0], r[1], r[2], r[3]); m.rooms.push({ x: r[0], y: r[1], w: r[2], h: r[3], spec: r[4], idx: i }); });
    def.links.forEach(([a, b]) => corridor(m, def.rooms[a], def.rooms[b]));
    const br = m.rooms.find((r) => r.spec.split(/\s+/).includes('boss'));
    m.bossRoom = br;
    for (let x = br.x - 1; x <= br.x + br.w; x++) for (const y of [br.y - 1, br.y + br.h]) if (W.get(m, x, y) === 1) { W.set(m, x, y, 2); m.gate.push([x, y]); }
    for (let y = br.y; y < br.y + br.h; y++) for (const x of [br.x - 1, br.x + br.w]) if (W.get(m, x, y) === 1) { W.set(m, x, y, 2); m.gate.push([x, y]); }
    // éléments de décor qui bloquent ou ralentissent
    const rng = G.seeded(def.id * 977 + 13);
    m.rooms.forEach((r) => W.parseSpawns(r.spec).forEach((sp) => sp.feature && addFeature(m, r, sp.feature, rng)));
    // sécurité : chaque salle doit rester accessible
    const er = m.rooms[0];
    const ex = Math.floor(er.x + er.w / 2), ey = Math.floor(er.y + er.h / 2);
    let seen = reach(m, ex, ey);
    m.rooms.forEach((r) => {
      const cx = Math.floor(r.x + r.w / 2), cy = Math.floor(r.y + r.h / 2);
      if (seen[cy * m.w + cx]) return;
      m.obstacles = m.obstacles.filter((o) => { if (o.room !== r.idx) return true; for (let j = o.y; j < o.y + o.h; j++) for (let i = o.x; i < o.x + o.w; i++) W.set(m, i, j, 1); return false; });
      seen = reach(m, ex, ey);
    });
    if (W.EXT.afterFeatures) W.EXT.afterFeatures(m, rng);
    placeDecos(m, def.id, rng);
    placeWallDecos(m, rng);
    m.spawn = { x: (er.x + er.w / 2) * T, y: (er.y + er.h / 2) * T };
    return m;
  };

  const NO_FLAME = ['glowshroom', 'crystalsmall', 'runes', 'voidcrystal', 'starshard', 'dreamflower'];
  function placeDecos(m, seed, rng) {
    const th = D.THEMES[m.theme];
    m.rooms.forEach((r) => {
      if (r.spec.includes('entry')) return;
      const n = Math.floor((r.w * r.h) / 26);
      for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
        const edge = rng() < 0.7;
        let x, y;
        if (edge) {
          const side = Math.floor(rng() * 4);
          x = side < 2 ? r.x + Math.floor(rng() * r.w) : side === 2 ? r.x : r.x + r.w - 1;
          y = side >= 2 ? r.y + Math.floor(rng() * r.h) : side === 0 ? r.y : r.y + r.h - 1;
        } else { x = r.x + 1 + Math.floor(rng() * (r.w - 2)); y = r.y + 1 + Math.floor(rng() * (r.h - 2)); }
        let kind = th.deco[Math.floor(rng() * th.deco.length)];
        const t = W.get(m, x, y);
        if (kind === 'lily') { if (t !== 4) continue; } else if (t !== 1 || m.corr[y * m.w + x]) continue;
        if (kind === 'mushroom' && rng() < 0.4) kind = 'glowshroom';
        const d = { x: (x + 0.5) * T + (rng() - 0.5) * 10, y: (y + 0.5) * T + (rng() - 0.5) * 10, kind, s: 0.8 + rng() * 0.5, seed: Math.floor(rng() * 1e6) };
        m.decos.push(d);
        const L = LIGHT_DECOS[kind];
        if (L) m.lights.push({ x: d.x, y: d.y - 10, r: L[0], color: L[1], flick: !NO_FLAME.includes(kind), kind });
        i++;
      }
    });
  }

  // Torches, bannières et étagères accrochées aux murs du haut des salles
  function placeWallDecos(m, rng) {
    const th = D.THEMES[m.theme];
    m.rooms.forEach((r, ri) => {
      const y = r.y - 1;
      let k = 0;
      for (let x = r.x + 1 + (ri % 3); x < r.x + r.w - 1; x += 4) {
        if (W.get(m, x, y) !== 0 || !W.isFloor(m, x, y + 1) || m.corr[(y + 1) * m.w + x]) continue;
        let kind;
        if (m.theme === 'bastion') kind = k % 2 ? 'banner' : 'torch';
        else if (m.theme === 'library') kind = k % 2 ? 'wallshelf' : 'torch';
        else if (m.theme === 'crypt') kind = k % 3 === 2 ? 'cobweb' : 'torch';
        else if (m.theme === 'mine') kind = k % 2 ? 'beamwall' : 'torch';
        else if (m.theme === 'swamp') kind = rng() < 0.5 ? 'roots' : 'moss';
        else if (m.theme === 'crystal') kind = k % 2 ? 'vein' : null;
        else if (m.theme === 'peak') kind = 'icicles';
        else if (m.theme === 'temple') kind = k % 2 ? 'seaweedwall' : 'torch';
        else if (W.EXT.wallKind[m.theme]) kind = W.EXT.wallKind[m.theme](k, rng);
        else kind = null;
        k++;
        if (!kind) continue;
        const wd = { x: (x + 0.5) * T, y: y * T, kind, seed: Math.floor(rng() * 1e6) };
        m.wallDecos.push(wd);
        if (kind === 'torch' && th.torch) m.lights.push({ x: wd.x, y: wd.y + 14, r: 165, color: th.blueFire ? '#7fd0e0' : '#f2a03a', flick: true, kind: 'torch', flame: true, blue: !!th.blueFire });
        if (kind === 'vein') m.lights.push({ x: wd.x, y: wd.y + 16, r: 110, color: '#b48ae0', flick: false, kind: 'vein' });
        const WL = W.EXT.wallLight[kind];
        if (WL) m.lights.push({ x: wd.x, y: wd.y + 16, r: WL[0], color: WL[1], flick: !!WL[2], kind: WL[3] || 'vein' });
      }
    });
  }

  // ---------- Ville : Havre-Gris ----------
  W.buildTown = function () {
    const m = newMap(64, 48, 'town');
    m.town = true;
    carve(m, 2, 2, 60, 40);
    carve(m, 29, 42, 6, 2); // porte sud
    carve(m, 2, 44, 60, 3); // prairie hors des murs
    m.buildings = [
      { x: 5, y: 12, w: 10, h: 7, name: 'Forge', roof: '#8c3b2a', npc: 'forge', chimney: true },
      { x: 17, y: 12, w: 10, h: 7, name: 'Académie', roof: '#6a3f86', npc: 'skills' },
      { x: 37, y: 12, w: 10, h: 7, name: 'Boutique', roof: '#2c5f9e', npc: 'shop' },
      { x: 49, y: 12, w: 10, h: 7, name: 'Garnison', roof: '#4f6b2b', npc: 'quests' },
      { x: 40, y: 29, w: 12, h: 7, name: 'Taverne des Guildes', roof: '#9a6b2c', npc: 'guild', chimney: true },
      { x: 5, y: 29, w: 8, h: 6, roof: '#a0522d', chimney: true },
      { x: 16, y: 31, w: 8, h: 6, roof: '#7a5a3a', chimney: true },
      { x: 53, y: 31, w: 7, h: 6, roof: '#8c3b2a' },
    ];
    m.buildings.forEach((b) => {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) W.set(m, x, y, 3);
      if (b.chimney) m.chimneys.push({ x: (b.x + b.w - 2.2) * T, y: (b.y - 0.6) * T });
    });
    const solid = (x, y, w, h, kind) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) W.set(m, i, j, 3); m.obstacles.push({ x, y, w, h, kind, seed: x * 31 + y }); };
    solid(31, 22, 2, 2, 'fountain');
    solid(20, 26, 3, 2, 'stall'); solid(41, 26, 3, 2, 'stall');
    solid(12, 26, 1, 1, 'well');
    [[4, 4], [8, 5], [13, 4], [20, 5], [25, 4], [39, 4], [44, 5], [50, 4], [56, 5], [60, 4], [3, 10], [60, 11], [3, 27], [60, 27], [14, 38], [22, 39], [42, 39], [57, 39], [27, 34], [37, 34]]
      .forEach(([x, y]) => solid(x, y, 1, 1, 'tree'));
    m.npcs = [
      { id: 'forge', name: 'Borin', title: 'Forgeron', x: 10 * T, y: 20.2 * T, look: 'smith', col: '#8c3b2a' },
      { id: 'skills', name: 'Maître Ilian', title: 'Maître des compétences', x: 22 * T, y: 20.2 * T, look: 'sage', col: '#6a3f86' },
      { id: 'shop', name: 'Ysolde', title: 'Marchande', x: 42 * T, y: 20.2 * T, look: 'merchant', col: '#2c5f9e' },
      { id: 'quests', name: 'Capitaine Aldric', title: 'Quêtes', x: 54 * T, y: 20.2 * T, look: 'captain', col: '#4f6b2b' },
      { id: 'portal', name: 'Portail des Donjons', title: 'Choisir un donjon', x: 32 * T, y: 6.5 * T, look: 'portal', col: '#7b3fa6' },
      { id: 'guild', name: 'Tavernière Maëlle', title: 'Guildes (bientôt)', x: 46 * T, y: 37.2 * T, look: 'tavern', col: '#9a6b2c' },
    ];
    m.spawns = { gate: { x: 32 * T, y: 40.2 * T }, portal: { x: 32 * T, y: 9.5 * T }, plaza: { x: 32 * T, y: 26.8 * T } };
    m.spawn = m.spawns.plaza;
    m.dummies = [[26, 39], [38, 39]];
    m.critters = { chickens: [[9, 37], [10, 38], [7, 37]], cat: [44, 38] };
    // points de passage des villageois (rues et place)
    m.paths = [];
    for (let x = 4; x <= 60; x += 4) m.paths.push([x * T, 22.5 * T]);
    for (let y = 4; y <= 40; y += 4) if (y < 20 || y > 25) m.paths.push([32 * T, y * T]);
    m.paths.push([24 * T, 27 * T], [40 * T, 27 * T], [32 * T, 18 * T], [20 * T, 24 * T], [44 * T, 24 * T]);
    const rng = G.seeded(7);
    // décors de la ville
    const add = (x, y, kind, s) => m.decos.push({ x: x * T, y: y * T, kind, s: s || 1, seed: Math.floor(rng() * 1e6) });
    for (let i = 0; i < 46; i++) {
      const x = 3 + rng() * 58, y = 3 + rng() * 38;
      const tx = Math.floor(x), ty = Math.floor(y);
      if (W.get(m, tx, ty) !== 1) continue;
      if (Math.abs(x - 32) < 4.5 || (y > 20 && y < 25.5)) continue; // pas sur les rues
      add(x, y, rng() < 0.65 ? 'flower' : 'bush', 0.7 + rng() * 0.5);
    }
    [[3.6, 19.6, 'anvil'], [6.2, 20.4, 'weapons'], [15.4, 20, 'barrel'], [16.2, 19.8, 'crate'], [27.5, 19.3, 'lamp'], [36.5, 19.3, 'lamp'], [27.5, 26.3, 'lamp'], [36.5, 26.3, 'lamp'],
      [16, 24.8, 'lamp'], [48, 24.8, 'lamp'], [32, 34, 'lamp'], [35.6, 19.8, 'barrel'], [47.6, 19.8, 'crate'], [48.4, 20.5, 'barrel'], [59.4, 20.2, 'board'], [60.3, 21.6, 'weapons'],
      [13.6, 35.8, 'haystack'], [4, 36, 'fence'], [52, 37.6, 'cart'], [39, 36.6, 'barrel'], [24.6, 37.6, 'bench'], [39.4, 37.6, 'bench'], [28.6, 41.5, 'banner'], [35.4, 41.5, 'banner'],
      [14.8, 26.6, 'bucket'], [23.4, 21, 'books'], [25.6, 19.6, 'crystal'], [37.5, 45.8, 'sign'], [10, 45.5, 'haystack'], [52, 45.6, 'fencebit'], [55, 45.6, 'fencebit']].forEach(([x, y, k]) => add(x, y, k));
    for (let i = 0; i < 18; i++) add(3 + rng() * 58, 44.3 + rng() * 2.4, rng() < 0.6 ? 'flower' : 'bush', 0.7 + rng() * 0.4);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * G.TAU + 0.2; add(32 + Math.cos(a) * 2.6, 6.9 + Math.sin(a) * 1.7, 'standing'); }
    return m;
  };

  // ---------- Camp du tutoriel (devant la porte est de Havre-Gris) ----------
  W.buildTuto = function () {
    const m = newMap(64, 24, 'tuto');
    m.tutoMap = true;
    carve(m, 2, 2, 57, 20);
    const solid = (x, y, w, h, kind) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) W.set(m, i, j, 3); m.obstacles.push({ x, y, w, h, kind, seed: x * 31 + y }); };
    solid(3, 3, 3, 3, 'tent'); solid(3, 18, 3, 3, 'tent');
    m.buildings = [{ x: 45, y: 3, w: 9, h: 5, name: 'Réserve', roof: '#7a5a3a' }];
    m.buildings.forEach((b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) W.set(m, x, y, 3); });
    m.spawn = { x: 5 * T, y: 12 * T };
    m.spots = {
      brenna: [9, 11], dummies: [[18, 8], [22, 12], [18, 16]], rune: [37, 12], rats: [[47, 11], [51, 15], [53, 10]], gate: [58.4, 12],
      yard: [20, 12], runeZone: [33, 12], store: [49, 12],
    };
    m.npcs = [{ id: 'gateTuto', name: 'Porte de Havre-Gris', title: 'Entrer en ville', x: 58.4 * T, y: 12 * T, look: 'citygate', col: '#6b4a2c' }];
    const rng = G.seeded(21);
    const add = (x, y, kind, s) => m.decos.push({ x: x * T, y: y * T, kind, s: s || 1, seed: Math.floor(rng() * 1e6) });
    add(8, 15.5, 'campfire'); m.lights.push({ x: 8 * T, y: 15.5 * T, r: 190, color: '#f08a2a', flick: true, kind: 'campfire' });
    add(6.6, 15.8, 'log'); add(9.4, 16.4, 'log'); add(10.5, 4.5, 'crate'); add(11.2, 5.2, 'barrel');
    for (let x = 15; x <= 26; x += 1.5) { add(x, 5.2, 'fencebit'); add(x, 19.2, 'fencebit'); }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * G.TAU; add(37 + Math.cos(a) * 4, 12 + Math.sin(a) * 3.2, 'standing'); }
    add(44, 9.5, 'crate'); add(45.2, 10, 'barrel'); add(54.4, 9, 'crate'); add(55, 15.8, 'barrel'); add(48.6, 17, 'crate'); add(52.5, 18.5, 'haystack');
    for (let i = 0; i < 40; i++) {
      const x = 3 + rng() * 54, y = 3 + rng() * 18;
      if (W.get(m, Math.floor(x), Math.floor(y)) !== 1 || (y > 10 && y < 14)) continue;
      add(x, y, rng() < 0.6 ? 'flower' : 'bush', 0.7 + rng() * 0.5);
    }
    return m;
  };

  // ---------- Collisions ----------
  W.collides = function (m, x, y, r) {
    const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T);
    const y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!W.solidTile(m, tx, ty)) continue;
      const cx = G.clamp(x, tx * T, tx * T + T), cy = G.clamp(y, ty * T, ty * T + T);
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
    return false;
  };
  W.move = function (m, u, dx, dy) {
    const r = u.r * 0.85;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8) || 1;
    let blocked = false;
    for (let s = 0; s < steps; s++) {
      const sx = dx / steps, sy = dy / steps;
      if (!W.collides(m, u.x + sx, u.y, r)) u.x += sx; else blocked = true;
      if (!W.collides(m, u.x, u.y + sy, r)) u.y += sy; else blocked = true;
    }
    return blocked;
  };
  W.los = function (m, x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 12);
    for (let i = 1; i < n; i++) { const t = i / n; if (W.solidAt(m, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; }
    return true;
  };

  // Champ de distance (BFS) vers une case : les monstres contournent les murs et obstacles.
  // F : où ranger le champ (par défaut la carte ; en groupe, un champ par autre héros)
  W.flow = function (m, tx, ty, F) {
    F = F || m;
    const N = m.w * m.h;
    if (!F.dist) F.dist = new Int16Array(N);
    const dist = F.dist; dist.fill(-1);
    const q = new Int32Array(N); let h = 0, t = 0;
    F.flowT = [tx, ty];
    if (W.solidTile(m, tx, ty)) return;
    dist[ty * m.w + tx] = 0; q[t++] = ty * m.w + tx;
    while (h < t) {
      const c = q[h++], cx = c % m.w, cy = (c / m.w) | 0, nd = dist[c] + 1;
      if (nd > 70) continue;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const ni = ny * m.w + nx;
        if (dist[ni] !== -1 || W.solidTile(m, nx, ny)) continue;
        dist[ni] = nd; q[t++] = ni;
      }
    }
    // Deuxième champ pour les grandes créatures : il évite les cases collées aux obstacles
    if (!m.near || F === m) {
      if (!m.near) m.near = new Uint8Array(N);
      const nr = m.near;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        let n = 0;
        for (let oy = -1; oy <= 1 && !n; oy++) for (let ox = -1; ox <= 1; ox++) if (W.solidTile(m, x + ox, y + oy)) { n = 1; break; }
        nr[y * m.w + x] = n;
      }
    }
    const near = m.near;
    if (!F.distBig) F.distBig = new Int16Array(N);
    const db = F.distBig; db.fill(-1);
    h = 0; t = 0;
    db[ty * m.w + tx] = 0; q[t++] = ty * m.w + tx;
    while (h < t) {
      const c = q[h++], cx = c % m.w, cy = (c / m.w) | 0, nd = db[c] + 1;
      if (nd > 90) continue;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const ni = ny * m.w + nx;
        if (db[ni] !== -1 || W.solidTile(m, nx, ny) || near[ni]) continue;
        db[ni] = nd; q[t++] = ni;
      }
    }
  };
  W.flowDir = function (m, x, y, big, F) {
    F = F || m;
    if (!F.dist) return null;
    if (big && F.distBig) { const r = flowDirIn(m, F.distBig, x, y); if (r) return r; }
    return flowDirIn(m, F.dist, x, y);
  };
  function flowDirIn(m, dist, x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    const cur = dist[ty * m.w + tx];
    let best = null, bd = cur < 0 ? 9999 : cur;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      if (ox && oy && (W.solidTile(m, tx + ox, ty) || W.solidTile(m, tx, ty + oy))) continue;
      const d = dist[ny * m.w + nx];
      if (d >= 0 && d < bd) { bd = d; best = [(nx + 0.5) * T, (ny + 0.5) * T]; }
    }
    return best;
  }

  // ---------- Brouillard : la carte se "dessine" en explorant ----------
  W.initFog = function (m) {
    const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
    const g = c.getContext('2d');
    m.fogCanvas = c; m.fogCtx = g;
    m.fogData = g.createImageData(m.w, m.h);
    const d = m.fogData.data;
    for (let i = 0; i < m.w * m.h; i++) { d[i * 4] = 226; d[i * 4 + 1] = 212; d[i * 4 + 2] = 180; d[i * 4 + 3] = 255; }
    g.putImageData(m.fogData, 0, 0);
  };
  W.reveal = function (m, px, py, rad) {
    if (!m.fogData) return;
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    let changed = false;
    const d = m.fogData.data;
    for (let y = ty - rad; y <= ty + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const dd = Math.hypot(x - tx, y - ty);
      if (dd > rad) continue;
      const i = y * m.w + x;
      const a = dd > rad - 1.5 ? 120 : 0;
      if (d[i * 4 + 3] > a) { d[i * 4 + 3] = a; m.explored[i] = 1; changed = true; }
    }
    if (changed) m.fogCtx.putImageData(m.fogData, 0, 0);
  };

  // =====================================================================
  // Rendu de la carte (une seule fois, en image)
  // =====================================================================
  W.render = function (m) {
    const th = D.THEMES[m.theme];
    const c = document.createElement('canvas');
    c.width = m.w * T; c.height = m.h * T;
    const g = c.getContext('2d');
    S.begin(m.w * 31 + m.h, true);
    g.fillStyle = g.createPattern(S.paperPattern('#ece0c4'), 'repeat');
    g.fillRect(0, 0, c.width, c.height);
    const rng = G.seeded(m.w * 131 + (m.def ? m.def.id : m.town ? 99 : 77));

    // sol
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = W.get(m, x, y);
      if (t === 0) continue;
      g.globalAlpha = 0.45; g.fillStyle = rng() < 0.25 ? th.floorAlt : th.floor;
      g.fillRect(x * T, y * T, T, T); g.globalAlpha = 1;
    }
    if (m.town) drawTownGround(g, m, rng);
    else if (m.tutoMap) drawTutoGround(g, m, rng);
    else drawFloorDetails(g, m, th, rng);
    drawCarpets(g, m, th);
    drawWater(g, m, th, rng);
    if (W.EXT.tiles) W.EXT.tiles(g, m, th, rng);
    drawVoid(g, m, th, rng);

    // faces des murs (vue de 3/4)
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (W.get(m, x, y) === 0 && W.isFloor(m, x, y + 1)) drawWallFace(g, m, th, x, y, rng);
    // bordures à l'encre
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0) continue;
      const px = x * T, py = y * T;
      if (W.isFloor(m, x + 1, y)) S.line(g, px + T, py - 1, px + T, py + T + 1, 2, S.ink, 1.2, 1);
      if (W.isFloor(m, x - 1, y)) S.line(g, px, py - 1, px, py + T + 1, 2, S.ink, 1.2, 1);
      if (W.isFloor(m, x, y - 1)) S.line(g, px - 1, py, px + T + 1, py, 2, S.ink, 1.2, 1);
      if (W.isFloor(m, x, y + 1)) S.line(g, px - 1, py + T, px + T + 1, py + T, 2.2, S.ink, 1.2, 1);
    }
    if (m.theme === 'peak') drawCliffs(g, m, rng);
    if (W.EXT.overlay[m.theme]) W.EXT.overlay[m.theme](g, m, rng);
    if (m.theme === 'forest' || m.tutoMap) drawTreeBorder(g, m, rng, m.tutoMap ? 58 : 999);
    if (m.theme === 'swamp') drawReedBorder(g, m, rng);
    if (m.town) drawTownWalls(g, m);
    if (m.tutoMap) drawTutoGate(g, m);
    m.wallDecos.forEach((d) => drawWallDeco(g, d));
    m.obstacles.slice().sort((a, b) => a.y - b.y).forEach((o) => drawObstacle(g, m, o));
    if (m.buildings.length) drawBuildings(g, m);
    m.decos.slice().sort((a, b) => a.y - b.y).forEach((d) => drawDeco(g, d));
    m.img = c;
  };

  function drawFloorDetails(g, m, th, rng) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 1 && W.get(m, x, y) !== 2) continue;
      const px = x * T, py = y * T, r = rng();
      if (W.EXT.floor[m.theme]) { W.EXT.floor[m.theme](g, m, x, y, px, py, r, rng); continue; }
      switch (m.theme) {
        case 'crypt': case 'mine':
          if (r < 0.18) { const w = 10 + rng() * 14, h = 8 + rng() * 10; S.rect(g, px + rng() * (T - w), py + rng() * (T - h), w, h, { stroke: 'rgba(60,45,30,0.35)', w: 1, single: true, amt: 0.8, over: 1 }); }
          else if (r < 0.26) { const ox = px + rng() * T, oy = py + rng() * T; S.line(g, ox, oy, ox + (rng() - 0.5) * 18, oy + (rng() - 0.5) * 18, 0.8, 'rgba(60,45,30,0.4)', 1, 1); }
          else if (r < 0.31 && m.theme === 'mine') { g.fillStyle = 'rgba(60,45,30,0.3)'; for (let i = 0; i < 5; i++) g.fillRect(px + rng() * T, py + rng() * T, 2, 2); }
          break;
        case 'bastion':
          if (x % 2 === 0) S.line(g, px, py, px, py + T, 0.9, 'rgba(60,45,30,0.35)', 0.6, 1);
          if (y % 2 === 0) S.line(g, px, py, px + T, py, 0.9, 'rgba(60,45,30,0.35)', 0.6, 1);
          if (r < 0.08) { const ox = px + rng() * T, oy = py + rng() * T; S.line(g, ox, oy, ox + (rng() - 0.5) * 22, oy + (rng() - 0.5) * 22, 0.9, 'rgba(60,45,30,0.5)', 1, 1); }
          break;
        case 'library':
          for (let k = 0; k < 4; k++) S.line(g, px, py + k * 8, px + T, py + k * 8, 0.7, 'rgba(90,60,30,0.3)', 0.4, 1);
          if ((x + y * 3) % 4 === 0) S.line(g, px + ((y * 13) % T), py, px + ((y * 13) % T), py + 8, 0.7, 'rgba(90,60,30,0.35)', 0.3, 1);
          if (r < 0.05) { g.fillStyle = 'rgba(245,240,225,0.8)'; g.save(); g.translate(px + rng() * T, py + rng() * T); g.rotate(rng() * 3); g.fillRect(-5, -4, 10, 8); g.restore(); }
          break;
        case 'swamp':
          if (r < 0.12) { g.globalAlpha = 0.25; g.fillStyle = '#6b5a3a'; S.blobPath(g, px + rng() * T, py + rng() * T, 8 + rng() * 8, 5 + rng() * 4, 2); g.fill(); g.globalAlpha = 1; }
          else if (r < 0.3) { const ox = px + rng() * T, oy = py + rng() * T; for (let i = 0; i < 3; i++) S.line(g, ox + i * 3, oy, ox + i * 3 + (rng() - 0.5) * 4, oy - 6 - rng() * 4, 0.8, 'rgba(60,80,30,0.55)', 0.6, 1); }
          break;
        case 'crystal':
          if (r < 0.14) { g.fillStyle = 'rgba(40,30,70,0.25)'; for (let i = 0; i < 4; i++) g.fillRect(px + rng() * T, py + rng() * T, 2, 2); }
          else if (r < 0.22) { const ox = px + rng() * T, oy = py + rng() * T; g.strokeStyle = 'rgba(160,220,250,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ox - 3, oy); g.lineTo(ox + 3, oy); g.moveTo(ox, oy - 3); g.lineTo(ox, oy + 3); g.stroke(); }
          else if (r < 0.28) { const ox = px + rng() * T, oy = py + rng() * T; S.line(g, ox, oy, ox + (rng() - 0.5) * 20, oy + (rng() - 0.5) * 20, 0.8, 'rgba(50,40,80,0.45)', 1, 1); }
          break;
        case 'peak':
          if (r < 0.2) { g.globalAlpha = 0.35; g.fillStyle = '#c9d6e2'; S.blobPath(g, px + rng() * T, py + rng() * T, 9 + rng() * 8, 4 + rng() * 3, 2); g.fill(); g.globalAlpha = 1; }
          else if (r < 0.3) { const ox = px + rng() * T, oy = py + rng() * T; S.line(g, ox, oy, ox + 10 + rng() * 10, oy, 0.7, 'rgba(120,140,160,0.45)', 0.4, 1); }
          else if (r < 0.33) S.poly(g, [[px + 8, py + 22], [px + 12, py + 14], [px + 20, py + 15], [px + 23, py + 22]], { fill: '#9a9ea6', w: 1, single: true });
          break;
        case 'temple':
          if (x % 2 === 0) S.line(g, px, py, px, py + T, 0.9, 'rgba(30,60,60,0.35)', 0.6, 1);
          if (y % 2 === 0) S.line(g, px, py, px + T, py, 0.9, 'rgba(30,60,60,0.35)', 0.6, 1);
          if (r < 0.12) { g.globalAlpha = 0.3; g.fillStyle = '#5d8a5a'; S.blobPath(g, px + rng() * T, py + rng() * T, 7 + rng() * 6, 4 + rng() * 3, 2); g.fill(); g.globalAlpha = 1; }
          else if (r < 0.18) { g.fillStyle = 'rgba(220,210,170,0.6)'; for (let i = 0; i < 5; i++) g.fillRect(px + rng() * T, py + rng() * T, 2, 1.5); }
          break;
        default: // forêt
          if (r < 0.3) { const ox = px + rng() * T, oy = py + rng() * T; for (let i = 0; i < 3; i++) S.line(g, ox + i * 3, oy, ox + i * 3 + (rng() - 0.5) * 4, oy - 5 - rng() * 4, 0.8, 'rgba(60,80,30,0.55)', 0.6, 1); }
          else if (r < 0.34) { g.fillStyle = 'rgba(120,90,50,0.35)'; for (let i = 0; i < 3; i++) g.fillRect(px + rng() * T, py + rng() * T, 3, 2); }
      }
    }
  }

  // tapis dans les grandes salles du bastion et de la bibliothèque
  function drawCarpets(g, m, th) {
    if (m.theme !== 'bastion' && m.theme !== 'library' && m.theme !== 'ash') return;
    m.rooms.forEach((r, i) => {
      if (r.spec.includes('entry') || r.w < 14) return;
      if (m.theme === 'ash' && !r.spec.includes('boss')) return;
      const cx = (r.x + r.w / 2) * T, cy = (r.y + r.h / 2) * T;
      const vertical = r.spec.includes('boss') || r.h > r.w;
      const w = vertical ? 2.4 * T : (r.w - 6) * T, h = vertical ? (r.h - 3) * T : 2.4 * T;
      S.begin(900 + i, true);
      const col = m.theme === 'bastion' ? '#8c2a20' : m.theme === 'ash' ? '#5a1a14' : i % 2 ? '#2c4f7a' : '#7a2734';
      S.rect(g, cx - w / 2, cy - h / 2, w, h, { fill: col, fillA: 0.55, w: 1.4, stroke: 'rgba(43,33,24,0.7)' });
      S.rect(g, cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 10, { stroke: '#c9a227', w: 1.2, single: true, amt: 0.6 });
    });
  }

  function drawWater(g, m, th, rng) {
    let any = false;
    for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === 4) { any = true; break; }
    if (!any) return;
    g.save();
    g.beginPath();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (W.get(m, x, y) === 4) g.rect(x * T - 1, y * T - 1, T + 2, T + 2);
    g.clip();
    g.globalAlpha = 0.7; g.fillStyle = th.water || '#7fa89a'; g.fillRect(0, 0, m.w * T, m.h * T); g.globalAlpha = 1;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 4) continue;
      if (rng() < 0.55) { const ox = x * T + rng() * T, oy = y * T + rng() * T; g.strokeStyle = 'rgba(240,250,245,0.55)'; g.lineWidth = 1; g.beginPath(); g.arc(ox, oy, 4 + rng() * 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    }
    g.restore();
    // rivages
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 4) continue;
      const px = x * T, py = y * T, land = (a, b) => { const t = W.get(m, a, b); return t === 1 || t === 2 || t === 3; };
      if (land(x + 1, y)) S.line(g, px + T, py, px + T, py + T, 1.2, 'rgba(43,60,50,0.7)', 1.4, 1);
      if (land(x - 1, y)) S.line(g, px, py, px, py + T, 1.2, 'rgba(43,60,50,0.7)', 1.4, 1);
      if (land(x, y - 1)) S.line(g, px, py, px + T, py, 1.2, 'rgba(43,60,50,0.7)', 1.4, 1);
      if (land(x, y + 1)) S.line(g, px, py + T, px + T, py + T, 1.2, 'rgba(43,60,50,0.7)', 1.4, 1);
    }
  }

  function drawVoid(g, m, th, rng) {
    g.save();
    g.beginPath();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (W.get(m, x, y) === 0) g.rect(x * T, y * T, T, T);
    if (m.theme === 'swamp') {
      g.globalAlpha = 0.92; g.fillStyle = th.deep; g.fill(); g.clip(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(150,200,185,0.35)'; g.lineWidth = 1.2;
      for (let y = 6; y < m.h * T; y += 14) for (let x = (y * 7) % 40; x < m.w * T; x += 40 + ((y * 13) % 20)) { g.beginPath(); g.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    } else if (m.theme === 'temple') {
      g.globalAlpha = 0.94; g.fillStyle = th.deep; g.fill(); g.clip(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(127,208,224,0.25)'; g.lineWidth = 1.2;
      for (let y = 8; y < m.h * T; y += 16) for (let x = (y * 11) % 50; x < m.w * T; x += 46 + ((y * 7) % 24)) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 6, x + 16, y); g.quadraticCurveTo(x + 24, y + 6, x + 32, y); g.stroke(); }
    } else if (m.theme === 'peak') {
      g.globalAlpha = 1; g.fillStyle = '#cfe2f2'; g.fill(); g.clip();
      const rr = G.seeded(m.w * 7);
      for (let i = 0; i < (m.w * m.h) / 30; i++) {
        const cx = rr() * m.w * T, cy = rr() * m.h * T, w = 30 + rr() * 50;
        g.globalAlpha = 0.85; g.fillStyle = '#f7fbff';
        g.beginPath(); g.ellipse(cx, cy, w, w * 0.35, 0, 0, G.TAU); g.ellipse(cx + w * 0.5, cy - 6, w * 0.6, w * 0.3, 0, 0, G.TAU); g.fill();
        g.globalAlpha = 0.5; g.strokeStyle = '#9fb4c8'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, w, w * 0.35, 0, 0.2, 2.9); g.stroke();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const bx = rr() * m.w * T, by = rr() * m.h * T; S.line(g, bx - 6, by - 3, bx, by, 1.2, '#5a6f86', 0.5, 1); S.line(g, bx, by, bx + 6, by - 3, 1.2, '#5a6f86', 0.5, 1); }
    } else if (W.EXT.void[m.theme]) {
      W.EXT.void[m.theme](g, m, th, rng);
    } else if (m.town) {
      g.globalAlpha = 0.95; g.fillStyle = '#9a9488'; g.fill(); g.clip(); g.globalAlpha = 1;
      for (let y = 0; y < m.h * T; y += 12) for (let x = ((y / 12) % 2) * 12; x < m.w * T; x += 24) { g.strokeStyle = 'rgba(43,33,24,0.25)'; g.lineWidth = 0.8; g.strokeRect(x, y, 24, 12); }
    } else {
      g.globalAlpha = 0.85; g.fillStyle = th.wallDark; g.fill(); g.clip(); g.globalAlpha = 1;
      S.hatchArea(g, 0, 0, m.w * T, m.h * T, { sp: 7, ang: -0.9, c: '#120e0a', a: 0.45, w: 1, cross: true });
      if (m.theme === 'crystal') {
        const rr = G.seeded(m.w * 13);
        for (let i = 0; i < (m.w * m.h) / 14; i++) {
          const x = rr() * m.w * T, y = rr() * m.h * T, a = rr() * 3, l = 5 + rr() * 9;
          g.fillStyle = rr() < 0.5 ? 'rgba(143,216,240,0.55)' : 'rgba(180,138,224,0.55)';
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.lineTo(x + Math.cos(a + 0.4) * l * 0.4, y + Math.sin(a + 0.4) * l * 0.4); g.closePath(); g.fill();
        }
      }
    }
    g.restore();
  }

  function drawWallFace(g, m, th, x, y, rng) {
    const px = x * T, py = y * T;
    if (m.theme === 'forest' || m.tutoMap) return;
    if (W.EXT.wallFace[m.theme]) { W.EXT.wallFace[m.theme](g, m, th, x, y, px, py, rng); return; }
    if (m.theme === 'peak') {
      // rebord rocheux couvert de neige
      g.fillStyle = '#8a8e96'; g.fillRect(px, py + 12, T, T - 12);
      S.hatchArea(g, px, py + 12, T, T - 12, { sp: 5, ang: 1.2, c: '#3a3e46', a: 0.3, w: 0.7 });
      g.fillStyle = '#f7fbff'; S.blobPath(g, px + T / 2, py + 13, T * 0.62, 6, 2, 10); g.fill();
      return;
    }
    if (m.theme === 'crystal') {
      g.globalAlpha = 0.95; g.fillStyle = th.wall; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
      S.hatchArea(g, px, py + 4, T, T - 4, { sp: 5, ang: -1, c: '#120e22', a: 0.3, w: 0.7 });
      if (rng() < 0.35) { g.fillStyle = rng() < 0.5 ? '#8fd8f0' : '#c9a0f0'; g.beginPath(); g.moveTo(px + 10, py + T); g.lineTo(px + 14, py + 10); g.lineTo(px + 19, py + T); g.closePath(); g.fill(); g.strokeStyle = S.ink; g.lineWidth = 0.8; g.stroke(); }
      return;
    }
    if (m.theme === 'temple') {
      g.globalAlpha = 0.95; g.fillStyle = th.wall; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
      for (let row = 0; row < 2; row++) { const yy = py + 5 + row * 13; S.line(g, px, yy + 13, px + T, yy + 13, 0.9, 'rgba(10,30,30,0.5)', 0.7, 1); for (let xx = row % 2 ? T / 2 : 0; xx < T; xx += T / 2) S.line(g, px + xx, yy, px + xx, yy + 13, 0.9, 'rgba(10,30,30,0.5)', 0.5, 1); }
      if (rng() < 0.4) { g.fillStyle = 'rgba(93,138,90,0.7)'; S.blobPath(g, px + rng() * T, py + T - 5, 8, 4, 2); g.fill(); }
      return;
    }
    if (m.theme === 'swamp') {
      g.globalAlpha = 0.9; g.fillStyle = th.wall; g.fillRect(px, py + 10, T, T - 10); g.globalAlpha = 1;
      S.line(g, px, py + 10, px + T, py + 10, 1, 'rgba(20,30,20,0.5)', 1.2, 1);
      if (rng() < 0.5) { g.fillStyle = 'rgba(110,150,80,0.6)'; S.blobPath(g, px + rng() * T, py + T - 4, 7, 4, 2); g.fill(); }
      return;
    }
    const wallCol = m.town ? '#b5ad9c' : th.wall;
    g.globalAlpha = 0.95; g.fillStyle = wallCol; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
    const line = 'rgba(30,22,15,0.5)';
    if (m.theme === 'library') {
      for (let k = 0; k < 3; k++) S.line(g, px + 2 + k * 10, py + 6, px + 2 + k * 10, py + T, 0.8, line, 0.4, 1);
      S.line(g, px, py + 18, px + T, py + 18, 1.4, 'rgba(30,22,15,0.6)', 0.5, 1);
    } else if (m.theme === 'bastion' || m.town) {
      for (let row = 0; row < 2; row++) {
        const yy = py + 5 + row * 13;
        S.line(g, px, yy + 13, px + T, yy + 13, 0.9, line, 0.7, 1);
        const off = row % 2 ? T / 2 : 0;
        for (let xx = off; xx < T; xx += T / 2) S.line(g, px + xx, yy, px + xx, yy + 13, 0.9, line, 0.5, 1);
      }
    } else {
      for (let row = 0; row < 3; row++) {
        const yy = py + 6 + row * 9;
        S.line(g, px, yy + 8, px + T, yy + 8, 0.8, line, 0.8, 1);
        const off = row % 2 ? T / 2 : 0;
        for (let xx = off; xx < T; xx += T / 2) S.line(g, px + xx, yy, px + xx, yy + 8, 0.8, line, 0.6, 1);
      }
    }
    S.hatchCircle(g, px + T / 2, py + T / 2 + 4, T / 2, T / 2 - 4, { sp: 5, c: '#1d1610', a: 0.22, w: 0.7 });
  }

  function drawTreeBorder(g, m, rng, maxX) {
    const trees = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < Math.min(m.w, maxX); x++) {
      if (W.get(m, x, y) !== 0) continue;
      let near = false;
      for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (W.isFloor(m, x + ox, y + oy)) { near = true; break; }
      if (near && rng() < 0.75) trees.push([(x + 0.5) * T + (rng() - 0.5) * 12, (y + 0.5) * T + (rng() - 0.5) * 12, 14 + rng() * 10]);
    }
    trees.sort((a, b) => a[1] - b[1]);
    trees.forEach(([x, y, r]) => tree(g, x, y, r, rng));
  }
  function tree(g, x, y, r, rng) {
    S.line(g, x, y + r * 0.4, x, y + r * 1.1, 3, '#5a4030');
    S.circle(g, x, y, r, { fill: rng() < 0.5 ? '#4f6a34' : '#5d7a3a', fillA: 0.95, w: 1.6 });
    S.circle(g, x - r * 0.35, y - r * 0.3, r * 0.55, { fill: '#6b8a44', fillA: 0.8, w: 1, single: true });
    S.hatchCircle(g, x + r * 0.2, y + r * 0.25, r * 0.8, r * 0.7, { sp: 4, c: '#1d2a12', a: 0.35, w: 0.7 });
    S.line(g, x - r * 0.4, y - r * 0.2, x - r * 0.1, y - r * 0.5, 1, 'rgba(255,255,220,0.5)', 1, 1);
  }
  // Pic des Harpies : parois rocheuses qui plongent vers le vide sous chaque rebord
  function drawCliffs(g, m, rng) {
    for (let y = 1; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0 || !W.isFloor(m, x, y - 1)) continue;
      const px = x * T, py = y * T, h = T * (0.6 + rng() * 0.5);
      g.fillStyle = '#7a7e86';
      g.beginPath(); g.moveTo(px - 1, py); g.lineTo(px + T + 1, py); g.lineTo(px + T - 2, py + h); g.lineTo(px + 3, py + h * 0.85); g.closePath(); g.fill();
      S.hatchArea(g, px, py, T, h, { sp: 4, ang: 1.4, c: '#2f333a', a: 0.35, w: 0.7 });
      S.line(g, px + 3, py + h * 0.85, px + T - 2, py + h, 1.2, S.ink, 0.8, 1);
      g.fillStyle = '#f7fbff'; g.fillRect(px - 1, py - 1, T + 2, 4);
    }
  }

  function drawReedBorder(g, m, rng) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0 || !W.isFloor(m, x, y + 1) && !W.isFloor(m, x, y - 1) && !W.isFloor(m, x + 1, y) && !W.isFloor(m, x - 1, y)) continue;
      if (rng() < 0.5) continue;
      const bx = (x + 0.5) * T + (rng() - 0.5) * 16, by = (y + 0.8) * T;
      for (let i = 0; i < 4; i++) { const h = 12 + rng() * 14; S.line(g, bx + i * 3, by, bx + i * 3 + (rng() - 0.5) * 6, by - h, 1, '#4f6a34', 0.8, 1); if (rng() < 0.4) S.circle(g, bx + i * 3, by - h, 2, { ry: 4, fill: '#6b4a2c', w: 0.6, single: true }); }
    }
  }

  // ---------- Ville ----------
  function drawTownGround(g, m, rng) {
    const cx = 32 * T, cy = 23 * T;
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, 8.5 * T, 6 * T, 0, 0, G.TAU);
    g.rect(29 * T, 3 * T, 6 * T, 45 * T); g.rect(3 * T, 20.5 * T, 58 * T, 4 * T);
    g.ellipse(32 * T, 6.5 * T, 4.5 * T, 3 * T, 0, 0, G.TAU);
    g.clip();
    g.globalAlpha = 0.6; g.fillStyle = '#d6c7a3'; g.fillRect(0, 0, m.w * T, m.h * T); g.globalAlpha = 1;
    for (let y = 2 * T; y < 44 * T; y += 14) for (let x = 2 * T + ((y / 14) % 2) * 9; x < 62 * T; x += 18) S.circle(g, x + rng() * 3, y + rng() * 3, 7, { ry: 5.5, stroke: 'rgba(70,55,35,0.42)', w: 0.9, single: true, amt: 1 });
    g.restore();
    S.circle(g, cx, cy, 8.5 * T, { ry: 6 * T, stroke: 'rgba(43,33,24,0.55)', w: 1.6 });
    // jardins et parterres
    [[3, 3, 24, 7], [37, 3, 24, 7], [3, 25, 24, 4], [37, 25, 24, 3]].forEach(([x, y, w, h]) => {
      g.globalAlpha = 0.18; g.fillStyle = '#7a9a48'; g.fillRect(x * T, y * T, w * T, h * T); g.globalAlpha = 1;
    });
  }

  function drawTownWalls(g, m) {
    S.begin(4242, true);
    // créneaux le long du bord intérieur
    for (let x = 2; x < 62; x++) {
      if (x >= 29 && x <= 34) continue;
      S.rect(g, x * T + 4, 41.9 * T + 4, T - 8, 10, { fill: '#c9c1af', w: 1.1, single: true });
    }
    for (let x = 2; x < 62; x += 1) S.rect(g, x * T + 4, 1.1 * T, T - 8, 10, { fill: '#c9c1af', w: 1.1, single: true });
    // tours d'angle
    for (const [x, y] of [[1.5, 1.5], [62.5, 1.5], [1.5, 42.5], [62.5, 42.5], [27.5, 42.6], [36.5, 42.6]]) {
      S.circle(g, x * T, y * T, 30, { fill: '#b5ad9c', w: 2, hatch: { sp: 6, c: '#2b2118', a: 0.25, w: 0.7 } });
      S.circle(g, x * T, y * T - 4, 20, { stroke: 'rgba(43,33,24,0.6)', w: 1.2, single: true });
    }
    // arche de la porte sud
    const gx = 29 * T, gy = 41.6 * T;
    S.rect(g, gx - 8, gy, 8, 2.4 * T, { fill: '#9a9488', w: 1.8 }); S.rect(g, gx + 6 * T, gy, 8, 2.4 * T, { fill: '#9a9488', w: 1.8 });
    g.strokeStyle = '#2b2118'; g.lineWidth = 2.2; g.beginPath(); g.arc(gx + 3 * T, gy + 10, 3 * T + 4, Math.PI, 0); g.stroke();
    S.text(g, 'Porte Sud', gx + 3 * T, gy - 34, 20, '#2b2118', 'center', 'rgba(236,224,196,0.9)');
  }

  function drawBuildings(g, m) {
    m.buildings.forEach((b, i) => {
      S.begin(500 + i, true);
      const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
      const wallTop = y + h * 0.48;
      S.rect(g, x + 4, wallTop, w - 8, h - (wallTop - y) - 2, { fill: '#d9c9a2', fillA: 1, w: 2 });
      for (let k = 1; k < 4; k++) S.line(g, x + 4, wallTop + k * 14, x + w - 4, wallTop + k * 14, 0.7, 'rgba(60,45,30,0.4)', 1, 1);
      for (let k = 0; k <= 3; k++) { const xx = x + 6 + (k * (w - 12)) / 3; S.line(g, xx, wallTop, xx, y + h - 2, 2.2, '#4a3524', 1, 1); }
      // fenêtres
      for (const fx of [x + w * 0.2, x + w * 0.8]) {
        S.rect(g, fx - 9, wallTop + 18, 18, 16, { fill: '#e8d9a8', w: 1.4 });
        S.line(g, fx, wallTop + 18, fx, wallTop + 34, 1, S.ink, 0.4, 1); S.line(g, fx - 9, wallTop + 26, fx + 9, wallTop + 26, 1, S.ink, 0.4, 1);
        S.rect(g, fx - 11, wallTop + 34, 22, 5, { fill: '#7a9a48', w: 1, single: true });
        g.fillStyle = '#c4661a'; g.fillRect(fx - 6, wallTop + 33, 3, 3); g.fillStyle = '#a8321f'; g.fillRect(fx + 3, wallTop + 33, 3, 3);
      }
      // toit en tuiles
      S.poly(g, [[x - 6, wallTop + 4], [x + w / 2, y - 14], [x + w + 6, wallTop + 4]], { fill: b.roof, fillA: 0.9, w: 2.2, hatch: { sp: 5, c: '#1a120c', a: 0.3, w: 0.8 } });
      for (let k = 1; k < 4; k++) { const t = k / 4; S.line(g, x - 6 + (w / 2 + 6) * t, wallTop + 4 - (wallTop + 18 - y) * t, x + w + 6 - (w / 2 + 6) * t, wallTop + 4 - (wallTop + 18 - y) * t, 0.8, 'rgba(26,18,12,0.5)', 1, 1); }
      // porte
      const dx = x + w / 2 - 14, dy = y + h - 34;
      S.rect(g, dx, dy, 28, 32, { fill: '#6b4a2c', fillA: 1, w: 1.8 });
      S.line(g, dx + 14, dy, dx + 14, dy + 32, 1, S.ink, 0.4, 1);
      S.circle(g, dx + 22, dy + 18, 2, { fill: '#c9a227', w: 1 });
      if (b.name) {
        S.rect(g, x + w / 2 - 60, wallTop - 8, 120, 26, { fill: '#efe3c6', fillA: 1, w: 1.6 });
        S.text(g, b.name, x + w / 2, wallTop + 5, b.name.length > 12 ? 16 : 22, '#2b2118');
      }
      if (b.chimney) S.rect(g, x + w - 2.2 * T - 8, y - 6, 16, 30, { fill: '#7d7366', w: 1.6 });
    });
  }

  // ---------- Camp du tutoriel ----------
  function drawTutoGround(g, m, rng) {
    g.save();
    g.beginPath(); g.rect(2 * T, 10.4 * T, 57 * T, 3.4 * T); g.clip();
    g.globalAlpha = 0.45; g.fillStyle = '#b89c6a'; g.fillRect(0, 0, m.w * T, m.h * T); g.globalAlpha = 1;
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(90,65,35,0.35)'; g.fillRect(2 * T + rng() * 57 * T, 10.4 * T + rng() * 3.4 * T, 2, 2); }
    g.restore();
    S.line(g, 2 * T, 10.4 * T, 59 * T, 10.4 * T, 1, 'rgba(90,65,35,0.5)', 2, 1);
    S.line(g, 2 * T, 13.8 * T, 59 * T, 13.8 * T, 1, 'rgba(90,65,35,0.5)', 2, 1);
    // cercle de la pierre runique
    S.circle(g, 37 * T, 12 * T, 4.4 * T, { ry: 3.6 * T, stroke: 'rgba(123,63,166,0.5)', w: 1.6 });
    for (let i = 0; i < 260; i++) { const x = 2 * T + rng() * 57 * T, y = 2 * T + rng() * 20 * T; if (y > 10.4 * T && y < 13.8 * T) continue; S.line(g, x, y, x + (rng() - 0.5) * 4, y - 5 - rng() * 4, 0.8, 'rgba(60,80,30,0.5)', 0.6, 1); }
  }
  function drawTutoGate(g, m) {
    S.begin(3131, true);
    const x = 59 * T, y0 = 2 * T, y1 = 22 * T;
    S.rect(g, x, y0, 2.6 * T, y1 - y0, { fill: '#b5ad9c', w: 2.2, hatch: { sp: 7, c: '#2b2118', a: 0.2, w: 0.7 } });
    for (let yy = y0; yy < y1; yy += 14) S.line(g, x, yy, x + 2.6 * T, yy, 0.8, 'rgba(43,33,24,0.35)', 0.5, 1);
    S.rect(g, x - 6, 9.6 * T, 22, 5 * T, { fill: '#6b4a2c', w: 2 });
    for (let k = 0; k < 4; k++) S.line(g, x - 6, 10 * T + k * 30, x + 16, 10 * T + k * 30, 1.2, '#3a2a1a', 0.5, 1);
    S.circle(g, x + 8, 12 * T, 4, { fill: '#c9a227', w: 1 });
    for (const yy of [8.6, 15.4]) S.circle(g, x + T, yy * T, 26, { fill: '#b5ad9c', w: 2 });
    S.text(g, 'Havre-Gris', x + 1.3 * T, 7.2 * T, 22, '#2b2118', 'center', 'rgba(236,224,196,0.9)');
  }

  // ---------- Obstacles ----------
  function drawObstacle(g, m, o) {
    S.begin(o.seed, true);
    const x = o.x * T, y = o.y * T, w = o.w * T, h = o.h * T, cx = x + w / 2, cy = y + h / 2;
    const rr = G.seeded(o.seed + 1);
    switch (o.kind) {
      case 'pillar': {
        const tl = m.theme === 'temple';
        if (W.EXT.obstacle['pillar_' + m.theme]) { W.EXT.obstacle['pillar_' + m.theme](g, m, o, x, y, w, h, cx, cy, rr); break; }
        S.circle(g, cx, y + h - 6, w * 0.45, { ry: 9, fill: tl ? '#6f9a96' : '#9a9488', w: 1.6 });
        S.rect(g, cx - w * 0.3, y - 18, w * 0.6, h - 6 + 18 - 4, { fill: tl ? '#9fc4be' : '#c9c1af', w: 1.8, hatch: { sp: 5, ang: 1.5, c: '#2b2118', a: 0.2, w: 0.7 } });
        S.rect(g, cx - w * 0.38, y - 26, w * 0.76, 10, { fill: tl ? '#86b0aa' : '#b5ad9c', w: 1.6 });
        S.line(g, cx - w * 0.18, y - 14, cx - w * 0.18, y + h - 12, 0.8, 'rgba(255,255,240,0.6)', 0.5, 1);
        if (tl) for (let k = 0; k < 3; k++) S.line(g, cx - w * 0.3 + k * 6, y + h - 10, cx - w * 0.3 + k * 6 + 4, y + h - 30 - k * 6, 1.6, '#4f7a3d', 1.2, 1);
        break;
      }
      case 'crystal': {
        const cols = rr() < 0.5 ? ['#8fd8f0', '#5fb0d8'] : ['#c9a0f0', '#9b6fe0'];
        for (let k = 0; k < 4; k++) {
          const bx = cx - 12 + k * 8 + (rr() - 0.5) * 4, hh = 18 + rr() * 22, ww = 5 + rr() * 4, lean = (k - 1.5) * 4;
          S.poly(g, [[bx - ww, cy + 10], [bx - ww * 0.6 + lean, cy + 10 - hh], [bx + lean, cy + 4 - hh - 6], [bx + ww * 0.6 + lean, cy + 10 - hh], [bx + ww, cy + 10]], { fill: cols[k % 2], fillA: 0.9, w: 1.3 });
          S.line(g, bx + lean * 0.5, cy + 8, bx + lean, cy + 2 - hh, 0.8, 'rgba(255,255,255,0.8)', 0.3, 1);
        }
        break;
      }
      case 'pine': {
        S.line(g, cx, cy + 14, cx, cy - 4, 3, '#5a4030');
        for (let k = 0; k < 3; k++) S.poly(g, [[cx - 18 + k * 4, cy + 6 - k * 12], [cx, cy - 18 - k * 12], [cx + 18 - k * 4, cy + 6 - k * 12]], { fill: '#3e5a3a', w: 1.4 });
        for (let k = 0; k < 3; k++) { g.fillStyle = '#f7fbff'; S.blobPath(g, cx, cy - 10 - k * 12, 9 - k * 2, 3, 1.5, 8); g.fill(); }
        break;
      }
      case 'icerock': {
        S.poly(g, [[cx - 15, cy + 10], [cx - 11, cy - 10], [cx + 2, cy - 16], [cx + 14, cy - 6], [cx + 15, cy + 10]], { fill: '#9aa6b4', w: 1.6, hatch: { sp: 5, c: '#2f333a', a: 0.25, w: 0.6 } });
        g.fillStyle = '#f7fbff'; S.blobPath(g, cx - 2, cy - 12, 11, 4, 2, 8); g.fill();
        S.poly(g, [[cx + 6, cy + 10], [cx + 9, cy - 2], [cx + 13, cy + 10]], { fill: '#bfe4f4', w: 1, single: true });
        break;
      }
      case 'column': {
        S.circle(g, cx, cy + 10, 14, { ry: 6, fill: '#6f9a96', w: 1.5 });
        S.rect(g, cx - 9, cy - 30, 18, 40, { fill: '#9fc4be', w: 1.6, hatch: { sp: 4, ang: 1.5, c: '#1d3a3a', a: 0.25, w: 0.6 } });
        S.rect(g, cx - 12, cy - 36, 24, 8, { fill: '#86b0aa', w: 1.4 });
        S.line(g, cx - 4, cy + 8, cx + 2, cy - 22, 1.6, '#4f7a3d', 1.4, 1);
        break;
      }
      case 'beam': {
        S.rect(g, cx - 7, y - 20, 14, h + 14, { fill: '#7a5a3a', w: 1.6 });
        S.rect(g, x - 2, y - 24, w + 4, 10, { fill: '#6b4a2c', w: 1.6 });
        S.line(g, cx - 7, y + h - 14, cx + 7, y - 10, 1, S.ink, 0.6, 1);
        break;
      }
      case 'shelf': {
        S.rect(g, x + 1, y - 14, w - 2, h + 8, { fill: '#6b4a2c', w: 1.8 });
        let bx = x + 4;
        while (bx < x + w - 6) {
          const bw = 4 + rr() * 5, bh = 14 + rr() * 8;
          g.fillStyle = G.pick(['#7a2734', '#2c4f7a', '#4f6b2b', '#a0703a', '#3b3346', '#b8862b']);
          g.fillRect(bx, y + 10 - bh, bw, bh);
          g.strokeStyle = 'rgba(29,22,16,0.6)'; g.lineWidth = 0.7; g.strokeRect(bx, y + 10 - bh, bw, bh);
          bx += bw + 1;
        }
        S.line(g, x + 1, y + 10, x + w - 1, y + 10, 2, '#3a2a1a', 0.5, 1);
        break;
      }
      case 'tree': tree(g, cx, cy - 6, 18 + rr() * 6, rr); break;
      case 'deadtree': {
        S.line(g, cx, cy + 12, cx - 2, cy - 22, 4, '#4a3a2a');
        S.line(g, cx - 1, cy - 8, cx - 14, cy - 20, 2.4, '#4a3a2a'); S.line(g, cx - 1, cy - 14, cx + 12, cy - 30, 2.2, '#4a3a2a');
        S.line(g, cx - 12, cy - 19, cx - 18, cy - 16, 1.4, '#4a3a2a'); S.line(g, cx + 10, cy - 27, cx + 16, cy - 26, 1.4, '#4a3a2a');
        S.line(g, cx - 2, cy + 12, cx - 12, cy + 16, 1.6, '#4a3a2a'); S.line(g, cx + 1, cy + 12, cx + 10, cy + 15, 1.6, '#4a3a2a');
        g.fillStyle = 'rgba(110,150,80,0.5)'; g.fillRect(cx - 8, cy - 2, 6, 3);
        break;
      }
      case 'angel': {
        S.rect(g, cx - 12, cy + 2, 24, 12, { fill: '#9a9488', w: 1.5 });
        S.poly(g, [[cx - 8, cy + 3], [cx - 6, cy - 16], [cx + 6, cy - 16], [cx + 8, cy + 3]], { fill: '#c9c1af', w: 1.4 });
        S.circle(g, cx, cy - 21, 6, { fill: '#c9c1af', w: 1.3 });
        S.poly(g, [[cx - 6, cy - 12], [cx - 18, cy - 24], [cx - 14, cy - 6]], { fill: '#d6cfbd', w: 1.2 });
        S.poly(g, [[cx + 6, cy - 12], [cx + 18, cy - 24], [cx + 14, cy - 6]], { fill: '#d6cfbd', w: 1.2 });
        break;
      }
      case 'knight': {
        S.rect(g, cx - 13, cy + 2, 26, 12, { fill: '#9a9488', w: 1.5 });
        S.circle(g, cx, cy - 8, 9, { ry: 11, fill: '#a6a8ad', w: 1.4 });
        S.rect(g, cx - 6, cy - 28, 12, 12, { fill: '#a6a8ad', w: 1.3 });
        S.line(g, cx - 4, cy - 22, cx + 4, cy - 22, 1.2);
        S.line(g, cx + 12, cy + 4, cx + 12, cy - 30, 2.4, '#c9ccd1'); S.line(g, cx + 7, cy - 14, cx + 17, cy - 14, 2, S.ink);
        break;
      }
      case 'bust': {
        S.rect(g, cx - 8, cy - 4, 16, 18, { fill: '#9a9488', w: 1.4 });
        S.circle(g, cx, cy - 12, 9, { ry: 7, fill: '#d6cfbd', w: 1.3 });
        S.circle(g, cx, cy - 22, 7, { fill: '#d6cfbd', w: 1.3 });
        break;
      }
      case 'rockpile': {
        S.poly(g, [[cx - 14, cy + 10], [cx - 10, cy - 8], [cx + 2, cy - 14], [cx + 14, cy - 4], [cx + 13, cy + 10]], { fill: '#6d6d75', w: 1.6, hatch: { sp: 5, c: '#2b2118', a: 0.3, w: 0.7 } });
        break;
      }
      case 'fountain': {
        S.circle(g, cx, cy, 46, { ry: 36, fill: '#9fb4c0', fillA: 0.9, w: 2 });
        S.circle(g, cx, cy, 28, { ry: 21, fill: '#7f9aa8', fillA: 0.9, w: 1.4 });
        S.rect(g, cx - 6, cy - 30, 12, 26, { fill: '#cfc7b4', w: 1.4 });
        S.circle(g, cx, cy - 32, 9, { ry: 6, fill: '#cfc7b4', w: 1.3 });
        break;
      }
      case 'stall': {
        S.rect(g, x + 4, y + 18, w - 8, h - 22, { fill: '#a0703a', w: 1.6 });
        for (let k = 0; k < 5; k++) S.circle(g, x + 14 + k * 16, y + 26, 5, { fill: G.pick(['#a8321f', '#c4661a', '#e2c043', '#4f6b2b']), w: 0.9 });
        const stripes = 6;
        for (let k = 0; k < stripes; k++) S.poly(g, [[x + (k * w) / stripes, y], [x + ((k + 1) * w) / stripes, y], [x + ((k + 1) * w) / stripes, y + 14], [x + (k * w) / stripes, y + 14]], { fill: k % 2 ? '#efe7d0' : '#a8321f', w: 1, single: true });
        S.line(g, x + 4, y, x + 4, y + h - 4, 2, '#4a3524'); S.line(g, x + w - 4, y, x + w - 4, y + h - 4, 2, '#4a3524');
        break;
      }
      case 'well': {
        S.circle(g, cx, cy + 4, 15, { ry: 11, fill: '#9a9488', w: 1.8 });
        S.circle(g, cx, cy + 4, 9, { ry: 6, fill: '#2f4d47', w: 1.2 });
        S.line(g, cx - 14, cy + 2, cx - 14, cy - 24, 2, '#4a3524'); S.line(g, cx + 14, cy + 2, cx + 14, cy - 24, 2, '#4a3524');
        S.poly(g, [[cx - 20, cy - 22], [cx, cy - 34], [cx + 20, cy - 22]], { fill: '#8c3b2a', w: 1.4 });
        break;
      }
      case 'tent': {
        S.poly(g, [[x + 2, y + h - 2], [cx, y - 10], [x + w - 2, y + h - 2]], { fill: '#c9b78a', w: 2, hatch: { sp: 6, c: '#2b2118', a: 0.2, w: 0.7 } });
        S.poly(g, [[cx - 10, y + h - 2], [cx, y + 22], [cx + 10, y + h - 2]], { fill: '#4a3524', w: 1.4 });
        S.line(g, cx, y - 10, cx, y - 22, 1.5, '#4a3524'); S.poly(g, [[cx, y - 22], [cx + 12, y - 18], [cx, y - 14]], { fill: '#a8321f', w: 1 });
        break;
      }
      default:
        if (W.EXT.obstacle[o.kind]) W.EXT.obstacle[o.kind](g, m, o, x, y, w, h, cx, cy, rr);
    }
  }

  function drawWallDeco(g, d) {
    S.begin(d.seed, true);
    const x = d.x, y = d.y;
    switch (d.kind) {
      case 'torch':
        S.line(g, x, y + 26, x, y + 14, 3, '#4a3524');
        S.rect(g, x - 5, y + 10, 10, 6, { fill: '#5a5a60', w: 1 });
        break;
      case 'banner':
        S.poly(g, [[x - 10, y + 4], [x + 10, y + 4], [x + 10, y + 30], [x, y + 24], [x - 10, y + 30]], { fill: '#8c2a20', w: 1.4 });
        S.circle(g, x, y + 14, 4, { fill: '#c9a227', w: 0.8 });
        S.line(g, x - 12, y + 4, x + 12, y + 4, 2, '#4a3524');
        break;
      case 'wallshelf': {
        S.rect(g, x - 15, y + 6, 30, 20, { fill: '#5a3d24', w: 1.4 });
        for (let k = 0; k < 6; k++) { g.fillStyle = G.pick(['#7a2734', '#2c4f7a', '#4f6b2b', '#b8862b']); g.fillRect(x - 13 + k * 4.5, y + 9, 3.5, 13); }
        break;
      }
      case 'cobweb':
        for (let i = 0; i < 5; i++) { const a = Math.PI * 0.5 + (i / 4) * Math.PI * 0.5; S.line(g, x - 14, y + 4, x - 14 + Math.cos(a - Math.PI / 2) * 22, y + 4 + Math.sin(a - Math.PI / 2 + Math.PI) * -22, 0.6, 'rgba(60,60,60,0.6)', 0.6, 1); }
        break;
      case 'beamwall':
        S.rect(g, x - 16, y + 2, 32, 7, { fill: '#7a5a3a', w: 1.3 });
        S.line(g, x - 13, y + 9, x - 13, y + 30, 3, '#6b4a2c'); S.line(g, x + 13, y + 9, x + 13, y + 30, 3, '#6b4a2c');
        break;
      case 'roots':
        for (let i = 0; i < 3; i++) S.line(g, x - 8 + i * 8, y + 4, x - 10 + i * 9, y + 28, 1.4, '#4a3a2a', 1.4, 1);
        break;
      case 'moss':
        g.fillStyle = 'rgba(110,150,80,0.6)'; S.blobPath(g, x, y + 20, 12, 6, 3); g.fill();
        break;
      case 'vein':
        for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#c9a0f0' : '#8fd8f0'; g.beginPath(); g.moveTo(x - 10 + k * 9, y + 30); g.lineTo(x - 7 + k * 9, y + 10 + k * 3); g.lineTo(x - 3 + k * 9, y + 30); g.closePath(); g.fill(); g.strokeStyle = S.ink; g.lineWidth = 0.8; g.stroke(); }
        break;
      case 'icicles':
        for (let k = 0; k < 4; k++) { const ix = x - 13 + k * 8, l = 8 + ((d.seed >> k) % 10); g.fillStyle = '#e8f4fb'; g.beginPath(); g.moveTo(ix - 3, y + 30); g.lineTo(ix + 3, y + 30); g.lineTo(ix, y + 30 + l); g.closePath(); g.fill(); g.strokeStyle = '#7f9ab0'; g.lineWidth = 0.7; g.stroke(); }
        break;
      case 'seaweedwall':
        for (let k = 0; k < 3; k++) { g.strokeStyle = '#4f7a3d'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 8 + k * 8, y + 32); g.quadraticCurveTo(x - 14 + k * 8, y + 18, x - 6 + k * 8, y + 6); g.stroke(); }
        break;
      default:
        if (W.EXT.wallDeco[d.kind]) W.EXT.wallDeco[d.kind](g, d, x, y);
    }
  }

  // ---------- Décorations ----------
  function drawDeco(g, d) {
    S.begin(d.seed, true);
    const x = d.x, y = d.y, s = d.s || 1;
    switch (d.kind) {
      case 'tomb':
        S.poly(g, [[x - 9 * s, y + 8 * s], [x - 9 * s, y - 6 * s], [x - 5 * s, y - 11 * s], [x + 5 * s, y - 11 * s], [x + 9 * s, y - 6 * s], [x + 9 * s, y + 8 * s]], { fill: '#a39a8a', w: 1.5 });
        S.line(g, x, y - 7 * s, x, y + 2 * s, 1.2); S.line(g, x - 4 * s, y - 3 * s, x + 4 * s, y - 3 * s, 1.2);
        break;
      case 'candle':
        S.rect(g, x - 2.5, y - 8, 5, 12, { fill: '#efe7d0', w: 1.1 });
        S.circle(g, x, y - 12, 3, { ry: 4.5, fill: '#e8a33a', w: 0.8 });
        break;
      case 'bones':
        S.line(g, x - 8 * s, y - 3 * s, x + 8 * s, y + 3 * s, 2, '#cfc7b4'); S.line(g, x - 7 * s, y + 4 * s, x + 6 * s, y - 4 * s, 2, '#cfc7b4');
        S.circle(g, x + 9 * s, y - 6 * s, 4 * s, { fill: '#e4dcc6', w: 1.1 });
        break;
      case 'skullpile':
        for (const [ox, oy] of [[-6, 2], [6, 2], [0, -5]]) { S.circle(g, x + ox * s, y + oy * s, 5 * s, { fill: '#e4dcc6', w: 1 }); g.fillStyle = S.ink; g.fillRect(x + ox * s - 2, y + oy * s - 1, 1.6, 1.6); g.fillRect(x + ox * s + 1, y + oy * s - 1, 1.6, 1.6); }
        break;
      case 'urn':
        S.circle(g, x, y, 7 * s, { ry: 9 * s, fill: '#9b6b45', w: 1.4 });
        S.line(g, x - 6 * s, y - 2 * s, x + 6 * s, y - 2 * s, 0.8);
        break;
      case 'cobweb':
        for (let i = 0; i < 6; i++) { const a = (i / 6) * G.TAU; S.line(g, x, y, x + Math.cos(a) * 14 * s, y + Math.sin(a) * 14 * s, 0.6, 'rgba(60,60,60,0.55)', 0.6, 1); }
        S.circle(g, x, y, 7 * s, { stroke: 'rgba(60,60,60,0.45)', w: 0.6, single: true });
        break;
      case 'mushroom': case 'glowshroom':
        S.rect(g, x - 2 * s, y - 2 * s, 4 * s, 8 * s, { fill: '#efe7d0', w: 1 });
        S.circle(g, x, y - 4 * s, 8 * s, { ry: 5 * s, fill: d.kind === 'glowshroom' ? '#7fd0a0' : '#a8321f', w: 1.3 });
        g.fillStyle = '#fff'; g.fillRect(x - 3 * s, y - 6 * s, 2, 2); g.fillRect(x + 2 * s, y - 5 * s, 2, 2);
        break;
      case 'bush':
        S.circle(g, x - 6 * s, y, 8 * s, { fill: '#6b8a3e', w: 1.2 }); S.circle(g, x + 6 * s, y, 8 * s, { fill: '#5d7a3a', w: 1.2 }); S.circle(g, x, y - 5 * s, 9 * s, { fill: '#7a9a48', w: 1.2 });
        break;
      case 'fern':
        for (let i = -2; i <= 2; i++) S.line(g, x, y + 4, x + i * 6 * s, y - 10 * s + Math.abs(i) * 3, 1.2, '#4f6b2b', 0.8, 1);
        break;
      case 'rock':
        S.poly(g, [[x - 9 * s, y + 5 * s], [x - 6 * s, y - 5 * s], [x + 5 * s, y - 6 * s], [x + 9 * s, y + 5 * s]], { fill: '#9a9488', w: 1.3 });
        break;
      case 'stump':
        S.circle(g, x, y, 11 * s, { ry: 8 * s, fill: '#8a6a45', w: 1.5 }); S.circle(g, x, y, 6 * s, { ry: 4 * s, stroke: 'rgba(43,33,24,0.6)', w: 0.8, single: true });
        break;
      case 'web':
        for (let i = 0; i < 6; i++) { const a = (i / 6) * G.TAU; S.line(g, x, y, x + Math.cos(a) * 16 * s, y + Math.sin(a) * 16 * s, 0.6, 'rgba(60,60,60,0.6)', 0.6, 1); }
        S.circle(g, x, y, 8 * s, { stroke: 'rgba(60,60,60,0.5)', w: 0.6, single: true }); S.circle(g, x, y, 14 * s, { stroke: 'rgba(60,60,60,0.4)', w: 0.6, single: true });
        break;
      case 'crate':
        S.rect(g, x - 10 * s, y - 10 * s, 20 * s, 20 * s, { fill: '#a07a4a', w: 1.5 });
        S.line(g, x - 10 * s, y - 10 * s, x + 10 * s, y + 10 * s, 1); S.line(g, x + 10 * s, y - 10 * s, x - 10 * s, y + 10 * s, 1);
        break;
      case 'barrel':
        S.circle(g, x, y, 9 * s, { ry: 11 * s, fill: '#8a6236', w: 1.5 });
        S.line(g, x - 9 * s, y - 4 * s, x + 9 * s, y - 4 * s, 1); S.line(g, x - 9 * s, y + 4 * s, x + 9 * s, y + 4 * s, 1);
        break;
      case 'rail':
        S.line(g, x - 16, y - 4, x + 16, y - 4, 1.4, '#4a4a4a'); S.line(g, x - 16, y + 4, x + 16, y + 4, 1.4, '#4a4a4a');
        for (let i = -12; i <= 12; i += 8) S.line(g, x + i, y - 7, x + i, y + 7, 2, '#6b4a2c');
        break;
      case 'ore':
        S.poly(g, [[x - 8 * s, y + 6 * s], [x - 4 * s, y - 7 * s], [x + 6 * s, y - 5 * s], [x + 9 * s, y + 6 * s]], { fill: '#6d6d75', w: 1.3 });
        g.fillStyle = '#e2c043'; g.fillRect(x - 2, y - 2, 3, 3); g.fillRect(x + 3, y + 1, 2, 2);
        break;
      case 'lantern':
        S.line(g, x, y + 8, x, y - 18, 2, '#4a3524');
        S.rect(g, x - 5, y - 16, 10, 12, { fill: '#e8a33a', w: 1.2 });
        break;
      case 'pickaxe':
        S.line(g, x - 8, y + 8, x + 8, y - 8, 2, '#6b4a2c'); S.line(g, x + 2, y - 12, x + 14, y - 2, 2.4, '#8a8c92');
        break;
      case 'reeds':
        for (let i = 0; i < 5; i++) { const h = 10 + ((d.seed >> i) % 9); S.line(g, x - 6 + i * 3, y + 4, x - 6 + i * 3 + ((i % 2) * 2 - 1) * 2, y - h, 1, '#4f6b2b', 0.6, 1); }
        S.circle(g, x - 3, y - 14, 1.8, { ry: 4, fill: '#6b4a2c', w: 0.5, single: true });
        break;
      case 'lily':
        S.circle(g, x, y, 8 * s, { ry: 5 * s, fill: '#5d8a3a', w: 1 });
        S.line(g, x, y, x + 7 * s, y - 2 * s, 0.8, S.ink, 0.3, 1);
        if (d.seed % 3 === 0) S.circle(g, x - 2, y - 2, 2.5, { fill: '#e8b0c0', w: 0.6 });
        break;
      case 'log':
        S.rect(g, x - 14 * s, y - 5 * s, 28 * s, 10 * s, { fill: '#7a5a3a', w: 1.3 }); S.circle(g, x + 14 * s, y, 5 * s, { fill: '#a07a4a', w: 1 });
        break;
      case 'armor':
        S.line(g, x, y + 10, x, y - 8, 1.6, '#4a3524');
        S.circle(g, x, y - 10, 9, { ry: 10, fill: '#a6a8ad', w: 1.3 }); S.circle(g, x, y - 24, 6, { fill: '#a6a8ad', w: 1.2 });
        break;
      case 'brazier':
        S.line(g, x - 7, y + 8, x, y - 2, 1.6); S.line(g, x + 7, y + 8, x, y - 2, 1.6);
        S.circle(g, x, y - 4, 10, { ry: 5, fill: '#4a4a50', w: 1.4 });
        break;
      case 'rubble':
        for (let i = 0; i < 4; i++) S.poly(g, [[x - 6 + i * 4, y + 3], [x - 4 + i * 4, y - 3], [x + i * 4, y - 2], [x + 1 + i * 4, y + 3]], { fill: '#b5ad9c', w: 1, single: true });
        break;
      case 'weapons':
        S.line(g, x - 12, y - 2, x + 12, y - 2, 2, '#6b4a2c');
        for (let i = -1; i <= 1; i++) S.line(g, x + i * 7, y + 8, x + i * 7, y - 20, 1.8, '#c9ccd1');
        break;
      case 'shieldwall':
        S.circle(g, x, y - 6, 9, { fill: '#8c2a20', w: 1.4 }); S.line(g, x - 6, y - 6, x + 6, y - 6, 1.4, '#c9a227'); S.line(g, x, y - 12, x, y, 1.4, '#c9a227');
        break;
      case 'books':
        for (let i = 0; i < 4; i++) S.rect(g, x - 9 + (i % 2) * 2, y - i * 5, 18, 5, { fill: G.pick(['#7a2734', '#2c4f7a', '#4f6b2b', '#a0703a']), w: 0.9, single: true });
        break;
      case 'papers':
        for (let i = 0; i < 3; i++) { g.save(); g.translate(x + i * 6 - 6, y + (i % 2) * 4); g.rotate(i - 1); S.rect(g, -6, -4, 12, 9, { fill: '#f5f0e1', w: 0.7, single: true }); g.restore(); }
        break;
      case 'globe':
        S.line(g, x, y + 10, x, y - 2, 1.6, '#6b4a2c'); S.circle(g, x, y - 12, 9, { fill: '#9fb4c0', w: 1.3 });
        S.line(g, x - 9, y - 12, x + 9, y - 12, 0.8, S.ink, 0.4, 1);
        break;
      case 'candelabra':
        S.line(g, x, y + 10, x, y - 10, 1.8, '#b8862b'); S.line(g, x - 9, y - 10, x + 9, y - 10, 1.6, '#b8862b');
        for (const ox of [-9, 0, 9]) { S.rect(g, x + ox - 1.5, y - 17, 3, 7, { fill: '#efe7d0', w: 0.6, single: true }); S.circle(g, x + ox, y - 20, 2, { ry: 3, fill: '#e8a33a', w: 0.5, single: true }); }
        break;
      case 'scroll':
        S.rect(g, x - 9, y - 3, 18, 6, { fill: '#efe3c6', w: 1 }); S.circle(g, x - 9, y, 3, { fill: '#d9c9a2', w: 0.8 }); S.circle(g, x + 9, y, 3, { fill: '#d9c9a2', w: 0.8 });
        break;
      case 'flower':
        S.line(g, x, y, x, y - 7 * s, 0.9, '#4f6b2b');
        S.circle(g, x, y - 8 * s, 3 * s, { fill: ['#c4661a', '#a8321f', '#e2c043', '#7b3fa6'][d.seed % 4], w: 0.8 });
        break;
      case 'anvil':
        S.poly(g, [[x - 14, y - 8], [x + 16, y - 8], [x + 10, y - 2], [x + 6, y + 8], [x - 6, y + 8], [x - 10, y - 2]], { fill: '#4a4a50', w: 1.6 });
        break;
      case 'lamp':
        S.line(g, x, y + 6, x, y - 34, 2.2, '#3a3a40');
        S.rect(g, x - 6, y - 46, 12, 13, { fill: '#e8c060', w: 1.3 });
        S.poly(g, [[x - 8, y - 46], [x, y - 54], [x + 8, y - 46]], { fill: '#3a3a40', w: 1 });
        break;
      case 'board':
        S.line(g, x - 14, y + 8, x - 14, y - 22, 2, '#4a3524'); S.line(g, x + 14, y + 8, x + 14, y - 22, 2, '#4a3524');
        S.rect(g, x - 17, y - 30, 34, 22, { fill: '#a07a4a', w: 1.5 });
        for (let i = 0; i < 3; i++) S.rect(g, x - 13 + i * 9, y - 27 + (i % 2) * 3, 8, 10, { fill: '#f5f0e1', w: 0.7, single: true });
        break;
      case 'haystack':
        S.circle(g, x, y, 18, { ry: 12, fill: '#d9b552', w: 1.5, hatch: { sp: 4, ang: 1.2, c: '#8a6a2a', a: 0.4, w: 0.7 } });
        break;
      case 'fence':
        for (let i = 0; i < 4; i++) S.line(g, x + i * 16, y + 8, x + i * 16, y - 10, 2, '#6b4a2c');
        S.line(g, x - 2, y - 6, x + 50, y - 6, 1.6, '#6b4a2c'); S.line(g, x - 2, y + 2, x + 50, y + 2, 1.6, '#6b4a2c');
        break;
      case 'fencebit':
        S.line(g, x, y + 8, x, y - 10, 2, '#6b4a2c'); S.line(g, x - 24, y - 4, x + 24, y - 4, 1.4, '#6b4a2c');
        break;
      case 'cart':
        S.rect(g, x - 22, y - 12, 40, 18, { fill: '#8a6236', w: 1.6 });
        S.circle(g, x - 12, y + 8, 8, { stroke: S.ink, w: 1.6 }); S.circle(g, x + 10, y + 8, 8, { stroke: S.ink, w: 1.6 });
        S.line(g, x + 18, y - 4, x + 36, y - 2, 2, '#6b4a2c');
        break;
      case 'bench':
        S.rect(g, x - 16, y - 6, 32, 6, { fill: '#8a6236', w: 1.3 }); S.line(g, x - 12, y, x - 12, y + 6, 1.6); S.line(g, x + 12, y, x + 12, y + 6, 1.6);
        break;
      case 'banner':
        S.line(g, x, y + 10, x, y - 40, 2, '#4a3524');
        S.poly(g, [[x, y - 40], [x + 22, y - 36], [x, y - 28]], { fill: '#8c2a20', w: 1.2 });
        break;
      case 'bucket':
        S.circle(g, x, y, 6, { ry: 7, fill: '#8a8c92', w: 1.1 });
        break;
      case 'crystal':
        S.poly(g, [[x - 6, y + 6], [x - 3, y - 14], [x + 4, y - 18], [x + 7, y + 6]], { fill: '#b48ae0', w: 1.2 });
        break;
      case 'sign':
        S.line(g, x, y + 10, x, y - 30, 2.4, '#4a3524');
        S.poly(g, [[x - 34, y - 40], [x + 30, y - 40], [x + 40, y - 30], [x + 30, y - 20], [x - 34, y - 20]], { fill: '#a07a4a', w: 1.5 });
        S.text(g, 'Camp des recrues', x + 2, y - 30, 13, '#2b2118');
        break;
      case 'campfire':
        for (let i = 0; i < 7; i++) { const a = (i / 7) * G.TAU; S.circle(g, x + Math.cos(a) * 14, y + Math.sin(a) * 9, 4.5, { fill: '#8a8478', w: 1 }); }
        S.line(g, x - 9, y + 4, x + 9, y - 4, 2.5, '#5a4030'); S.line(g, x - 9, y - 4, x + 9, y + 4, 2.5, '#5a4030');
        break;
      case 'crystalsmall':
        for (let k = 0; k < 3; k++) S.poly(g, [[x - 6 + k * 5, y + 4], [x - 4 + k * 5, y - 8 - k * 2], [x - 1 + k * 5, y + 4]], { fill: k % 2 ? '#c9a0f0' : '#8fd8f0', w: 0.9, single: true });
        break;
      case 'geodeRock':
        S.circle(g, x, y, 10 * s, { ry: 8 * s, fill: '#6d6878', w: 1.4 });
        S.circle(g, x + 2, y - 1, 5 * s, { ry: 4 * s, fill: '#b48ae0', w: 0.8, single: true });
        break;
      case 'snowpile':
        g.fillStyle = '#f7fbff'; S.blobPath(g, x, y, 14 * s, 6 * s, 2, 10); g.fill(); g.strokeStyle = '#9fb4c8'; g.lineWidth = 1; g.stroke();
        break;
      case 'icicle':
        S.poly(g, [[x - 7, y + 5], [x - 2, y - 14], [x + 3, y + 5]], { fill: '#bfe4f4', w: 1 }); S.poly(g, [[x + 2, y + 5], [x + 6, y - 7], [x + 9, y + 5]], { fill: '#d6eef8', w: 0.9 });
        break;
      case 'nest':
        S.circle(g, x, y, 13 * s, { ry: 7 * s, fill: '#8a6a45', w: 1.4, hatch: { sp: 3, ang: 0.4, c: '#3a2a1a', a: 0.4, w: 0.6 } });
        S.circle(g, x - 3, y - 2, 3.5, { ry: 4.5, fill: '#efe7d0', w: 0.8 }); S.circle(g, x + 4, y - 1, 3.5, { ry: 4.5, fill: '#efe7d0', w: 0.8 });
        break;
      case 'feather':
        S.line(g, x - 8, y + 4, x + 8, y - 4, 1, '#3a2a1a', 0.4, 1);
        g.fillStyle = '#8a5a3a'; g.beginPath(); g.ellipse(x, y, 9, 3, -0.45, 0, G.TAU); g.fill();
        break;
      case 'coral':
        for (let k = -1; k <= 1; k++) S.line(g, x, y + 6, x + k * 7, y - 10 - Math.abs(k) * 2, 2.2, ['#e07a6a', '#e8a06a', '#c96a9a'][(d.seed + k + 1) % 3], 1, 1);
        S.circle(g, x, y + 5, 5, { ry: 3, fill: '#c9b48a', w: 0.8 });
        break;
      case 'seaweed':
        for (let k = 0; k < 3; k++) { g.strokeStyle = '#4f7a3d'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x - 4 + k * 4, y + 6); g.quadraticCurveTo(x - 9 + k * 5, y - 6, x - 2 + k * 4, y - 16); g.stroke(); }
        break;
      case 'shell':
        S.circle(g, x, y, 6 * s, { ry: 4.5 * s, fill: '#efd9c0', w: 1 });
        for (let k = -2; k <= 2; k++) S.line(g, x, y + 4, x + k * 2.4, y - 3, 0.6, 'rgba(43,33,24,0.6)', 0.2, 1);
        break;
      case 'runes':
        S.circle(g, x, y, 13, { ry: 8, stroke: '#7fd0e0', w: 1.4, single: true });
        S.line(g, x - 6, y - 2, x, y + 3, 1.2, '#7fd0e0', 0.3, 1); S.line(g, x, y + 3, x + 6, y - 3, 1.2, '#7fd0e0', 0.3, 1);
        break;
      case 'standing':
        S.rect(g, x - 6, y - 26, 12, 30, { fill: '#8a8478', w: 1.5, hatch: { sp: 5, c: '#2b2118', a: 0.25, w: 0.6 } });
        S.line(g, x - 3, y - 18, x + 3, y - 12, 1, '#7b3fa6', 0.4, 1);
        break;
      default:
        if (W.EXT.deco[d.kind]) W.EXT.deco[d.kind](g, d, x, y, s);
    }
  }
})();
