// Cartes : construction des donjons (plan fixe), de la ville, rendu crayonné, collisions, chemins, brouillard.
(function () {
  const D = G.D, S = G.S;
  const T = D.TILE;
  const W = (G.W = {});

  function newMap(w, h, theme) {
    return { w, h, theme, tiles: new Uint8Array(w * h), rooms: [], gate: [], gateLocked: false, decos: [], explored: new Uint8Array(w * h), objects: [] };
  }
  W.get = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.tiles[y * m.w + x]);
  W.set = (m, x, y, v) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[y * m.w + x] = v; };
  W.isFloor = (m, x, y) => { const t = W.get(m, x, y); return t === 1 || t === 2; };
  W.solidTile = (m, x, y) => { const t = W.get(m, x, y); return t === 0 || t === 3 || (t === 2 && m.gateLocked); };
  W.solidAt = (m, px, py) => W.solidTile(m, Math.floor(px / T), Math.floor(py / T));

  function carve(m, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) W.set(m, i, j, 1); }
  function corridor(m, a, b) {
    const ax = Math.floor(a[0] + a[2] / 2), ay = Math.floor(a[1] + a[3] / 2);
    const bx = Math.floor(b[0] + b[2] / 2), by = Math.floor(b[1] + b[3] / 2);
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
    for (let x = x0; x <= x1; x++) for (let d = -1; d <= 1; d++) W.set(m, x, ay + d, 1);
    const y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    for (let y = y0; y <= y1; y++) for (let d = -1; d <= 1; d++) W.set(m, bx + d, y, 1);
  }

  // Analyse "skeleton:3 skelArcher!:1 chest"
  W.parseSpawns = function (spec) {
    const out = [];
    (spec || '').split(/\s+/).filter(Boolean).forEach((tok) => {
      if (tok === 'chest' || tok === 'boss' || tok === 'entry') { out.push({ special: tok }); return; }
      const [name, n] = tok.split(':');
      const elite = name.endsWith('!');
      out.push({ type: elite ? name.slice(0, -1) : name, n: parseInt(n || '1', 10), elite });
    });
    return out;
  };

  W.buildDungeon = function (def) {
    const m = newMap(def.w, def.h, def.theme);
    m.def = def;
    def.rooms.forEach((r, i) => { carve(m, r[0], r[1], r[2], r[3]); m.rooms.push({ x: r[0], y: r[1], w: r[2], h: r[3], spec: r[4], idx: i }); });
    def.links.forEach(([a, b]) => corridor(m, def.rooms[a], def.rooms[b]));
    // Grille d'entrée de la salle du boss
    const br = m.rooms.find((r) => r.spec === 'boss');
    m.bossRoom = br;
    for (let x = br.x - 1; x <= br.x + br.w; x++) for (const y of [br.y - 1, br.y + br.h]) if (W.get(m, x, y) === 1) { W.set(m, x, y, 2); m.gate.push([x, y]); }
    for (let y = br.y; y < br.y + br.h; y++) for (const x of [br.x - 1, br.x + br.w]) if (W.get(m, x, y) === 1) { W.set(m, x, y, 2); m.gate.push([x, y]); }
    // Décorations (positions fixes grâce à une graine)
    const rng = G.seeded(def.id * 977 + 13);
    const th = D.THEMES[def.theme];
    m.rooms.forEach((r) => {
      if (r.spec === 'entry') return;
      const n = Math.floor(r.w * r.h / 30);
      for (let i = 0; i < n; i++) {
        const edge = rng() < 0.7;
        let x, y;
        if (edge) {
          const side = Math.floor(rng() * 4);
          x = side < 2 ? r.x + Math.floor(rng() * r.w) : side === 2 ? r.x : r.x + r.w - 1;
          y = side >= 2 ? r.y + Math.floor(rng() * r.h) : side === 0 ? r.y : r.y + r.h - 1;
        } else { x = r.x + 1 + Math.floor(rng() * (r.w - 2)); y = r.y + 1 + Math.floor(rng() * (r.h - 2)); }
        m.decos.push({ x: (x + 0.5) * T + (rng() - 0.5) * 10, y: (y + 0.5) * T + (rng() - 0.5) * 10, kind: th.deco[Math.floor(rng() * th.deco.length)], s: 0.8 + rng() * 0.5, seed: Math.floor(rng() * 1e6) });
      }
    });
    const er = m.rooms[0];
    m.spawn = { x: (er.x + er.w / 2) * T, y: (er.y + er.h / 2) * T };
    return m;
  };

  // ---------- Ville : Havre-Gris ----------
  W.buildTown = function () {
    const m = newMap(48, 32, 'town');
    m.town = true;
    carve(m, 2, 2, 44, 28);
    m.buildings = [
      { x: 5, y: 3, w: 9, h: 6, name: 'Forge', roof: '#8c3b2a', npc: 'forge' },
      { x: 34, y: 3, w: 9, h: 6, name: 'Boutique', roof: '#2c5f9e', npc: 'shop' },
      { x: 5, y: 21, w: 9, h: 6, name: 'Académie', roof: '#6a3f86', npc: 'skills' },
      { x: 34, y: 21, w: 9, h: 6, name: 'Garnison', roof: '#4f6b2b', npc: 'quests' },
      { x: 18, y: 26, w: 12, h: 4, name: 'Taverne des Guildes', roof: '#9a6b2c', npc: 'guild' },
    ];
    m.buildings.forEach((b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) W.set(m, x, y, 3); });
    // Fontaine
    for (let y = 15; y < 17; y++) for (let x = 23; x < 25; x++) W.set(m, x, y, 3);
    m.npcs = [
      { id: 'forge', name: 'Borin', title: 'Forgeron', x: 9.5 * T, y: 10.2 * T, look: 'smith', col: '#8c3b2a' },
      { id: 'shop', name: 'Ysolde', title: 'Marchande', x: 38.5 * T, y: 10.2 * T, look: 'merchant', col: '#2c5f9e' },
      { id: 'skills', name: 'Maître Ilian', title: 'Maître des compétences', x: 9.5 * T, y: 19.8 * T, look: 'sage', col: '#6a3f86' },
      { id: 'quests', name: 'Capitaine Aldric', title: 'Quêtes', x: 38.5 * T, y: 19.8 * T, look: 'captain', col: '#4f6b2b' },
      { id: 'portal', name: 'Portail des Donjons', title: 'Choisir un donjon', x: 24 * T, y: 5.5 * T, look: 'portal', col: '#7b3fa6' },
      { id: 'guild', name: 'Tavernière Maëlle', title: 'Guildes (bientôt)', x: 24 * T, y: 24.8 * T, look: 'tavern', col: '#9a6b2c' },
    ];
    m.spawn = { x: 24 * T, y: 20 * T };
    const rng = G.seeded(7);
    for (let i = 0; i < 26; i++) {
      const x = 3 + rng() * 42, y = 3 + rng() * 26;
      if (Math.hypot(x - 24, y - 16) < 9) continue;
      if (W.get(m, Math.floor(x), Math.floor(y)) !== 1) continue;
      m.decos.push({ x: x * T, y: y * T, kind: rng() < 0.6 ? 'flower' : 'bush', s: 0.7 + rng() * 0.5, seed: Math.floor(rng() * 1e6) });
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

  // Champ de distance (BFS) vers une case : utilisé par les monstres pour contourner les murs
  W.flow = function (m, tx, ty) {
    const N = m.w * m.h;
    if (!m.dist) m.dist = new Int16Array(N);
    const dist = m.dist; dist.fill(-1);
    const q = new Int32Array(N); let h = 0, t = 0;
    if (W.solidTile(m, tx, ty)) return;
    dist[ty * m.w + tx] = 0; q[t++] = ty * m.w + tx;
    while (h < t) {
      const c = q[h++], cx = c % m.w, cy = (c / m.w) | 0, nd = dist[c] + 1;
      if (nd > 60) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [ox, oy] of nb) {
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const ni = ny * m.w + nx;
        if (dist[ni] !== -1 || W.solidTile(m, nx, ny)) continue;
        dist[ni] = nd; q[t++] = ni;
      }
    }
    m.flowT = [tx, ty];
  };
  W.flowDir = function (m, x, y) {
    if (!m.dist) return null;
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    const cur = m.dist[ty * m.w + tx];
    let best = null, bd = cur < 0 ? 9999 : cur;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      if (ox && oy && (W.solidTile(m, tx + ox, ty) || W.solidTile(m, tx, ty + oy))) continue;
      const d = m.dist[ny * m.w + nx];
      if (d >= 0 && d < bd) { bd = d; best = [(nx + 0.5) * T, (ny + 0.5) * T]; }
    }
    return best;
  };

  // ---------- Brouillard (la carte se "dessine" en explorant) ----------
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

  // ---------- Rendu de la carte (une seule fois, en image) ----------
  W.render = function (m) {
    const th = D.THEMES[m.theme];
    const c = document.createElement('canvas');
    c.width = m.w * T; c.height = m.h * T;
    const g = c.getContext('2d');
    S.begin(m.w * 31 + m.h, true);
    g.fillStyle = g.createPattern(S.paperPattern('#ece0c4'), 'repeat');
    g.fillRect(0, 0, c.width, c.height);
    const rng = G.seeded(m.w * 131 + (m.def ? m.def.id : 99));

    // Sol
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!W.isFloor(m, x, y) && W.get(m, x, y) !== 3) continue;
      g.globalAlpha = 0.45; g.fillStyle = rng() < 0.25 ? th.floorAlt : th.floor;
      g.fillRect(x * T, y * T, T, T); g.globalAlpha = 1;
    }
    if (m.town) drawTownGround(g, m, rng);
    else drawFloorDetails(g, m, th, rng);

    // Vide (roche / forêt dense)
    g.save();
    g.beginPath();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (W.get(m, x, y) === 0) g.rect(x * T, y * T, T, T);
    g.globalAlpha = 0.85; g.fillStyle = th.wallDark; g.fill();
    g.clip();
    g.globalAlpha = 1;
    S.hatchArea(g, 0, 0, c.width, c.height, { sp: 7, ang: -0.9, c: '#120e0a', a: 0.45, w: 1, cross: true });
    g.restore();

    // Faces des murs (vue de 3/4) et bordures à l'encre
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0) continue;
      if (W.isFloor(m, x, y + 1)) drawWallFace(g, m, th, x, y, rng);
    }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0) continue;
      const px = x * T, py = y * T;
      if (W.isFloor(m, x + 1, y)) S.line(g, px + T, py - 1, px + T, py + T + 1, 2, S.ink, 1.2, 1);
      if (W.isFloor(m, x - 1, y)) S.line(g, px, py - 1, px, py + T + 1, 2, S.ink, 1.2, 1);
      if (W.isFloor(m, x, y - 1)) S.line(g, px - 1, py, px + T + 1, py, 2, S.ink, 1.2, 1);
      if (W.isFloor(m, x, y + 1)) S.line(g, px - 1, py + T, px + T + 1, py + T, 2.2, S.ink, 1.2, 1);
    }
    if (m.theme === 'forest' || m.town) drawTreeBorder(g, m, rng);
    if (m.town) drawTownBuildings(g, m);

    // Décorations
    m.decos.forEach((d) => drawDeco(g, d));
    m.img = c;
  };

  function drawFloorDetails(g, m, th, rng) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!W.isFloor(m, x, y)) continue;
      const px = x * T, py = y * T, r = rng();
      if (m.theme === 'crypt' || m.theme === 'mine') {
        if (r < 0.18) { // dalle / pierre
          const w = 10 + rng() * 14, h = 8 + rng() * 10, ox = rng() * (T - w), oy = rng() * (T - h);
          S.rect(g, px + ox, py + oy, w, h, { stroke: 'rgba(60,45,30,0.35)', w: 1, single: true, amt: 0.8, over: 1 });
        } else if (r < 0.26) {
          const ox = px + rng() * T, oy = py + rng() * T;
          S.line(g, ox, oy, ox + (rng() - 0.5) * 18, oy + (rng() - 0.5) * 18, 0.8, 'rgba(60,45,30,0.4)', 1, 1);
        } else if (r < 0.3 && m.theme === 'mine') {
          g.fillStyle = 'rgba(60,45,30,0.25)';
          for (let i = 0; i < 4; i++) g.fillRect(px + rng() * T, py + rng() * T, 2, 2);
        }
      } else {
        if (r < 0.3) { // brins d'herbe
          const ox = px + rng() * T, oy = py + rng() * T;
          for (let i = 0; i < 3; i++) S.line(g, ox + i * 3, oy, ox + i * 3 + (rng() - 0.5) * 4, oy - 5 - rng() * 4, 0.8, 'rgba(60,80,30,0.55)', 0.6, 1);
        }
      }
    }
  }

  function drawWallFace(g, m, th, x, y, rng) {
    const px = x * T, py = y * T;
    g.globalAlpha = 0.95; g.fillStyle = th.wall; g.fillRect(px, py + 4, T, T - 4); g.globalAlpha = 1;
    if (m.theme === 'forest') return;
    // briques
    g.strokeStyle = 'rgba(30,22,15,0.55)'; g.lineWidth = 1;
    for (let row = 0; row < 3; row++) {
      const yy = py + 6 + row * 9;
      S.line(g, px, yy + 8, px + T, yy + 8, 0.8, 'rgba(30,22,15,0.5)', 0.8, 1);
      const off = row % 2 ? T / 2 : 0;
      for (let xx = off; xx < T; xx += T / 2) S.line(g, px + xx, yy, px + xx, yy + 8, 0.8, 'rgba(30,22,15,0.5)', 0.6, 1);
    }
    S.hatchCircle(g, px + T / 2, py + T / 2 + 4, T / 2, T / 2 - 4, { sp: 5, c: '#1d1610', a: 0.25, w: 0.7 });
  }

  function drawTreeBorder(g, m, rng) {
    // Les cases solides au bord du sol deviennent des arbres dessinés
    const trees = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (W.get(m, x, y) !== 0) continue;
      let near = false;
      for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (W.isFloor(m, x + ox, y + oy)) { near = true; break; }
      if (near && rng() < 0.7) trees.push([(x + 0.5) * T + (rng() - 0.5) * 12, (y + 0.5) * T + (rng() - 0.5) * 12, 14 + rng() * 10]);
    }
    trees.sort((a, b) => a[1] - b[1]);
    trees.forEach(([x, y, r]) => {
      S.circle(g, x, y, r, { fill: rng() < 0.5 ? '#4f6a34' : '#5d7a3a', fillA: 0.95, w: 1.6 });
      S.hatchCircle(g, x + r * 0.2, y + r * 0.25, r * 0.8, r * 0.7, { sp: 4, c: '#1d2a12', a: 0.35, w: 0.7 });
      S.line(g, x - r * 0.4, y - r * 0.2, x - r * 0.1, y - r * 0.5, 1, 'rgba(255,255,220,0.5)', 1, 1);
    });
  }

  function drawTownGround(g, m, rng) {
    // Place pavée et chemins
    const cx = 24 * T, cy = 16 * T;
    g.save();
    g.beginPath(); g.ellipse(cx, cy, 8 * T, 6.5 * T, 0, 0, G.TAU);
    g.rect(22 * T, 3 * T, 4 * T, 26 * T); g.rect(3 * T, 14.5 * T, 42 * T, 3 * T);
    g.clip();
    g.globalAlpha = 0.6; g.fillStyle = '#d6c7a3'; g.fillRect(0, 0, m.w * T, m.h * T); g.globalAlpha = 1;
    for (let y = 2 * T; y < 30 * T; y += 14) for (let x = 2 * T + ((y / 14) % 2) * 9; x < 46 * T; x += 18) {
      S.circle(g, x + rng() * 3, y + rng() * 3, 7, { ry: 5.5, stroke: 'rgba(70,55,35,0.45)', w: 0.9, single: true, amt: 1 });
    }
    g.restore();
    S.circle(g, cx, cy, 8 * T, { ry: 6.5 * T, stroke: 'rgba(43,33,24,0.6)', w: 1.6 });
    // Fontaine
    S.circle(g, cx, cy, 44, { ry: 34, fill: '#9fb4c0', fillA: 0.9, w: 2 });
    S.circle(g, cx, cy, 26, { ry: 20, fill: '#7f9aa8', fillA: 0.9, w: 1.4 });
    S.circle(g, cx, cy - 4, 8, { fill: '#cfc7b4', w: 1.4 });
    for (let i = 0; i < 6; i++) S.line(g, cx - 18 + i * 7, cy + 6, cx - 16 + i * 7, cy + 10, 0.8, '#2f5d8a', 1, 1);
  }

  function drawTownBuildings(g, m) {
    m.buildings.forEach((b, i) => {
      S.begin(500 + i, true);
      const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
      const wallTop = y + h * 0.48;
      // mur avant
      S.rect(g, x + 4, wallTop, w - 8, h - (wallTop - y) - 2, { fill: '#d9c9a2', fillA: 1, w: 2 });
      for (let k = 1; k < 4; k++) S.line(g, x + 4, wallTop + k * 14, x + w - 4, wallTop + k * 14, 0.7, 'rgba(60,45,30,0.4)', 1, 1);
      // poutres
      for (let k = 0; k <= 3; k++) { const xx = x + 6 + (k * (w - 12)) / 3; S.line(g, xx, wallTop, xx, y + h - 2, 2.2, '#4a3524', 1, 1); }
      // toit
      S.poly(g, [[x - 6, wallTop + 4], [x + w / 2, y - 14], [x + w + 6, wallTop + 4]], { fill: b.roof, fillA: 0.9, w: 2.2, hatch: { sp: 5, c: '#1a120c', a: 0.35, w: 0.8 } });
      // porte
      const dx = x + w / 2 - 14, dy = y + h - 34;
      S.rect(g, dx, dy, 28, 32, { fill: '#6b4a2c', fillA: 1, w: 1.8 });
      S.circle(g, dx + 22, dy + 18, 2, { fill: '#c9a227', w: 1 });
      // enseigne
      S.rect(g, x + w / 2 - 52, wallTop - 8, 104, 26, { fill: '#efe3c6', fillA: 1, w: 1.6 });
      S.text(g, b.name, x + w / 2, wallTop + 5, b.name.length > 12 ? 17 : 22, '#2b2118');
      if (b.npc === 'forge') { // cheminée fumante
        S.rect(g, x + w - 40, y - 4, 16, 34, { fill: '#7d7366', w: 1.6 });
        for (let k = 0; k < 3; k++) S.circle(g, x + w - 30 + k * 6, y - 16 - k * 14, 7 + k * 3, { stroke: 'rgba(60,50,40,0.45)', w: 1.2, single: true });
      }
    });
    // Cercle de pierres du portail
    const px = 24 * T, py = 5.5 * T;
    S.circle(g, px, py, 70, { ry: 46, stroke: 'rgba(43,33,24,0.5)', w: 1.2, single: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * G.TAU;
      const sx = px + Math.cos(a) * 70, sy = py + Math.sin(a) * 46;
      S.rect(g, sx - 6, sy - 22, 12, 24, { fill: '#8a8478', fillA: 1, w: 1.5 });
    }
  }

  function drawDeco(g, d) {
    S.begin(d.seed, true);
    const x = d.x, y = d.y, s = d.s;
    switch (d.kind) {
      case 'tomb':
        S.poly(g, [[x - 9 * s, y + 8 * s], [x - 9 * s, y - 6 * s], [x - 5 * s, y - 11 * s], [x + 5 * s, y - 11 * s], [x + 9 * s, y - 6 * s], [x + 9 * s, y + 8 * s]], { fill: '#a39a8a', w: 1.5 });
        S.line(g, x, y - 7 * s, x, y + 2 * s, 1.2); S.line(g, x - 4 * s, y - 3 * s, x + 4 * s, y - 3 * s, 1.2);
        break;
      case 'candle':
        S.rect(g, x - 2.5, y - 8, 5, 12, { fill: '#efe7d0', w: 1.1 });
        S.circle(g, x, y - 12, 3, { ry: 4.5, fill: '#e8a33a', w: 0.8 });
        g.globalAlpha = 0.18; g.fillStyle = '#f2c46b'; g.beginPath(); g.arc(x, y - 10, 22, 0, G.TAU); g.fill(); g.globalAlpha = 1;
        break;
      case 'bones':
        S.line(g, x - 8 * s, y - 3 * s, x + 8 * s, y + 3 * s, 2, '#cfc7b4'); S.line(g, x - 7 * s, y + 4 * s, x + 6 * s, y - 4 * s, 2, '#cfc7b4');
        S.circle(g, x + 9 * s, y - 6 * s, 4 * s, { fill: '#e4dcc6', w: 1.1 });
        break;
      case 'urn':
        S.circle(g, x, y, 7 * s, { ry: 9 * s, fill: '#9b6b45', w: 1.4 });
        S.line(g, x - 6 * s, y - 2 * s, x + 6 * s, y - 2 * s, 0.8);
        break;
      case 'mushroom':
        S.rect(g, x - 2 * s, y - 2 * s, 4 * s, 8 * s, { fill: '#efe7d0', w: 1 });
        S.circle(g, x, y - 4 * s, 8 * s, { ry: 5 * s, fill: '#a8321f', w: 1.3 });
        g.fillStyle = '#fff'; g.fillRect(x - 3 * s, y - 6 * s, 2, 2); g.fillRect(x + 2 * s, y - 5 * s, 2, 2);
        break;
      case 'bush':
        S.circle(g, x - 6 * s, y, 8 * s, { fill: '#6b8a3e', w: 1.2 }); S.circle(g, x + 6 * s, y, 8 * s, { fill: '#5d7a3a', w: 1.2 }); S.circle(g, x, y - 5 * s, 9 * s, { fill: '#7a9a48', w: 1.2 });
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
      case 'flower':
        S.line(g, x, y, x, y - 7 * s, 0.9, '#4f6b2b');
        S.circle(g, x, y - 8 * s, 3 * s, { fill: G.pick(['#c4661a', '#a8321f', '#e2c043', '#7b3fa6']), w: 0.8 });
        break;
    }
  }
})();
