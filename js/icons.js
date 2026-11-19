// Icônes d'objets dessinées au crayon (générées une fois puis mises en cache).
// Chaque modèle d'objet a sa forme. La matière dépend du niveau de l'objet (fer, acier, acier noirci, mithril, orichalque),
// la pierre sertie prend la couleur de son bonus principal (rouge puissance, vert vitalité, bleu armure, jaune critique,
// turquoise hâte) et l'éclat celle de sa rareté.
(function () {
  const S = G.S, D = G.D, INK = S.ink;
  const urls = {}, canvases = {};
  const METALS = ['#a39d93', '#bcc1c8', '#808a96', '#c6dcea', '#dcae4c'];
  const DMETALS = ['#6d675e', '#7d838b', '#4c535c', '#7f9db2', '#9a6f1c'];
  const WOODS = ['#9a7650', '#80593a', '#5e4330', '#ad8a60', '#4a3128'];
  const LEATHERS = ['#a07850', '#86603a', '#664a30', '#a98252', '#5c3428'];
  const CLOTHS = ['#ab9d80', '#94886c', '#77705f', '#bcb092', '#62554c'];
  const GOLD = '#d6a92e', BONE = '#e8dfc8', SKIN = '#e8c9a0', WHITE = '#fffaf0';
  const ACCENT = { pow: '#c8402e', vit: '#3f9c3e', arm: '#5a86b8', crit: '#e5ab1a', haste: '#20aebd' };
  const NORM = { pow: (l) => 1.5 + l * 0.8, vit: (l) => 2 + l * 0.9, arm: (l) => 2 + l * 0.9, crit: (l) => 0.012 + l * 0.0012, haste: (l) => 0.012 + l * 0.0012 };

  const tierOf = (it) => (it.ilvl ? Math.max(0, Math.min(4, Math.floor((it.ilvl - 1) / 12))) : 1);
  // bonus principal : la statistique la plus renforcée par les affixes de l'objet
  function accentOf(it) {
    if (!it.stats || !it.rarity || !G.I || !G.I.baseStats) return null;
    const lvl = it.ilvl || 1, base = G.I.baseStats(it.slot, lvl, D.RARITY[it.rarity].mult);
    let best = null, bv = 0.35;
    for (const k in it.stats) {
      if (!NORM[k]) continue;
      const v = (it.stats[k] - (base[k] || 0)) / NORM[k](lvl);
      if (v > bv) { bv = v; best = k; }
    }
    return best;
  }
  const keyOf = (it) => [it.base || it.slot, it.rarity | 0, tierOf(it), accentOf(it) || '-'].join('|');

  G.Icons = {
    // image (adresse data:) pour l'interface
    item(it) { const k = keyOf(it); if (!urls[k]) urls[k] = canvasFor(it, k).toDataURL(); return urls[k]; },
    // toile prête à dessiner (objets au sol)
    canvas(it) { return canvasFor(it, keyOf(it)); },
    accentOf,
  };
  function canvasFor(it, k) { if (!canvases[k]) canvases[k] = draw(it); return canvases[k]; }

  // ================= Outils de dessin =================
  let g = null;
  const jj = (a) => S.j(a);
  function path(pts, closed) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (closed) g.closePath();
  }
  // contour à l'encre en deux passes légèrement décalées
  function inkPath(pts, w, closed) {
    g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
    for (let p = 0; p < 2; p++) {
      g.lineWidth = p ? w * 0.45 : w;
      g.beginPath();
      pts.forEach(([x, y], i) => { const a = p ? jj(0.55) : 0, b = p ? jj(0.55) : 0; i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b); });
      if (closed) g.closePath();
      g.stroke();
    }
  }
  // forme pleine cernée d'encre, avec un peu d'ombre hachurée
  function shape(pts, fill, o) {
    o = o || {};
    if (fill) { path(pts, true); g.fillStyle = fill; g.fill(); }
    if (o.shade !== false && fill) shade(pts, o.shadeA || 0.22);
    inkPath(pts, o.w || 1.3, true);
  }
  function shade(pts, a) {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    pts.forEach(([x, y]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); });
    g.save();
    path(pts, true); g.clip();
    // ombre du côté droit et du bas
    g.beginPath(); g.rect((minx + maxx) / 2 + (maxx - minx) * 0.15, miny, maxx, maxy - miny); g.clip();
    S.hatchArea(g, minx, miny, maxx - minx, maxy - miny, { sp: 2.6, ang: -0.9, c: INK, a, w: 0.6 });
    g.restore();
  }
  // trait épais cerné d'encre (manches, lames courbes, cordes)
  function bar(x1, y1, x2, y2, w, col, cx, cy) {
    const go = () => { g.beginPath(); g.moveTo(x1, y1); if (cx != null) g.quadraticCurveTo(cx, cy, x2, y2); else g.lineTo(x2, y2); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    go(); g.strokeStyle = INK; g.lineWidth = w + 2.2; g.stroke();
    go(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
  }
  function line(x1, y1, x2, y2, w, col, a) {
    g.globalAlpha = a == null ? 1 : a;
    g.strokeStyle = col || INK; g.lineWidth = w || 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.globalAlpha = 1;
  }
  function curve(x1, y1, cx, cy, x2, y2, w, col, a) {
    g.globalAlpha = a == null ? 1 : a;
    g.strokeStyle = col || INK; g.lineWidth = w || 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.stroke();
    g.globalAlpha = 1;
  }
  function disc(x, y, r, col, o) {
    o = o || {};
    g.beginPath(); g.ellipse(x, y, r, o.ry || r, 0, 0, G.TAU);
    if (col) { g.fillStyle = col; g.fill(); }
    if (o.ink !== false) { g.strokeStyle = INK; g.lineWidth = o.w || 1.1; g.stroke(); }
  }
  const shine = (x1, y1, x2, y2, w) => line(x1, y1, x2, y2, w || 1, WHITE, 0.75);
  // pierre taillée
  function gem(x, y, r, col) {
    if (!col) return;
    const pts = [[x, y - r], [x + r * 0.9, y - r * 0.2], [x + r * 0.55, y + r], [x - r * 0.55, y + r], [x - r * 0.9, y - r * 0.2]];
    path(pts, true); g.fillStyle = col; g.fill();
    g.globalAlpha = 0.3; path([[x - r * 0.9, y - r * 0.2], [x + r * 0.9, y - r * 0.2], [x + r * 0.55, y + r], [x - r * 0.55, y + r]], true); g.fillStyle = INK; g.fill(); g.globalAlpha = 1;
    inkPath(pts, 0.9, true);
    disc(x - r * 0.3, y - r * 0.35, Math.max(0.6, r * 0.22), WHITE, { ink: false });
  }
  // dessin dans un repère tourné (x le long de l'objet)
  function frame(x, y, ang, fn) { g.save(); g.translate(x, y); g.rotate(ang); fn(); g.restore(); }
  function glow(col, a) {
    const gr = g.createRadialGradient(24, 24, 2, 24, 24, 25);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, 0, 48, 48); g.globalAlpha = 1;
  }
  function sparkle(x, y, r, col) {
    g.fillStyle = col;
    path([[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25], [x, y + r], [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]], true);
    g.fill();
  }
  const UP = -Math.PI / 4; // diagonale bas-gauche → haut-droite

  // ================= Pièces réutilisables =================
  // épée, dague : repère à la garde, lame vers +x
  function blade(len, w, K, o) {
    o = o || {};
    const wavy = o.wavy;
    let pts;
    if (wavy) {
      pts = [[0, -w / 2]];
      const n = 5;
      for (let i = 1; i <= n; i++) pts.push([(len - w) * (i / n), -w / 2 + (i % 2 ? -1.2 : 1.2)]);
      pts.push([len, 0]);
      for (let i = n; i >= 1; i--) pts.push([(len - w) * (i / n), w / 2 + (i % 2 ? -1.2 : 1.2)]);
      pts.push([0, w / 2]);
    } else pts = [[0, -w / 2], [len - w * 1.1, -w / 2], [len, 0], [len - w * 1.1, w / 2], [0, w / 2]];
    shape(pts, K.metal, { shadeA: 0.15 });
    if (!wavy) line(1.5, 0, len - w * 1.4, 0, 0.9, K.dmetal, 0.9);
    shine(1.5, -w / 2 + 0.9, len - w * 1.5, -w / 2 + 0.9, 0.9);
  }
  function hilt(guard, grip, K, o) {
    o = o || {};
    const gc = K.rare >= 2 ? K.trim : K.dmetal;
    if (o.quillons) shape([[-1.6, -guard / 2], [1.6, -guard / 2 + 1.5], [1.6, guard / 2 - 1.5], [-1.6, guard / 2], [-3.4, guard / 2 - 1], [-1.2, 0], [-3.4, -guard / 2 + 1]], gc, { shade: false });
    else shape([[-1.6, -guard / 2], [1.6, -guard / 2], [1.6, guard / 2], [-1.6, guard / 2]], gc, { shade: false });
    shape([[-1.6 - grip, -1.8], [-1.6, -1.8], [-1.6, 1.8], [-1.6 - grip, 1.8]], K.leather, { shade: false });
    for (let i = 1; i < grip / 2.2; i++) line(-1.6 - i * 2.2, -1.8, -1.6 - i * 2.2 + 1.2, 1.8, 0.7, INK, 0.7);
    disc(-grip - 3.6, 0, o.pommel || 2.6, o.pommelCol || GOLD);
    if (K.gem) gem(0, 0, o.gemR || 1.9, K.gem);
  }
  // tête de hache : repère au haut du manche, x le long du manche, la lame part vers +y
  function axeHead(K, size, double, back) {
    const s = size;
    const side = (sg) => [[-4 * s, 1.6 * sg], [-7 * s, 5 * s * sg], [-9 * s, 10 * s * sg], [-6 * s, 13 * s * sg], [0, 13.5 * s * sg], [6 * s, 13 * s * sg], [9 * s, 10 * s * sg], [7 * s, 5 * s * sg], [4 * s, 1.6 * sg]];
    shape(side(1), K.metal, { shadeA: 0.15 });
    curve(-6.5 * s, 12 * s, 0, 15 * s, 6.5 * s, 12 * s, 1, WHITE, 0.8);
    if (double) { shape(side(-1), K.metal, { shadeA: 0.15 }); curve(-6.5 * s, -12 * s, 0, -15 * s, 6.5 * s, -12 * s, 1, WHITE, 0.8); }
    else if (back) shape([[-2.2, -1.6], [0, -6.5], [2.2, -1.6]], K.dmetal, { shade: false });
    disc(0, 0, 2.4, K.rare >= 2 ? K.trim : K.dmetal);
    if (K.gem) gem(0, double ? 0 : 7 * s, 1.8, K.gem);
  }
  function arrow(x1, y1, x2, y2, K) {
    bar(x1, y1, x2, y2, 1.4, K.wood);
    const a = Math.atan2(y2 - y1, x2 - x1);
    frame(x2, y2, a, () => shape([[-1, -2.6], [4.5, 0], [-1, 2.6]], K.metal, { shade: false, w: 1 }));
    frame(x1, y1, a, () => { shape([[0, 0], [5, -3], [7, -3], [3, 0]], K.cloth, { shade: false, w: 0.8 }); shape([[0, 0], [5, 3], [7, 3], [3, 0]], K.cloth, { shade: false, w: 0.8 }); });
  }
  function chainCurve(x1, y1, cx, cy, x2, y2, col) {
    curve(x1, y1, cx, cy, x2, y2, 2.2, INK);
    curve(x1, y1, cx, cy, x2, y2, 1.1, col);
  }
  function torso(pts, fill, K) { shape(pts, fill); return pts; }

  // ================= Les modèles =================
  const SHAPES = {
    // ----- épées -----
    'Épée longue'(K) { frame(14, 34, UP, () => { blade(27, 5, K); hilt(14, 7, K); }); },
    Claymore(K) { frame(13, 35, UP, () => { blade(31, 6.6, K); hilt(19, 9, K, { quillons: true, pommel: 3.2, gemR: 2.3 }); }); },
    // ----- katanas -----
    Katana(K) { katana(K, 30, 8); },
    Nodachi(K) { katana(K, 37, 10); },
    Wakizashi(K) { katana(K, 21, 7); },
    // ----- haches -----
    'Hache de guerre'(K) { bar(10, 45, 32, 11, 3.2, K.wood); line(12, 42, 14.5, 38.5, 3.6, K.leather); frame(28, 16, UP, () => axeHead(K, 0.95, false, true)); },
    'Grande hache'(K) { bar(10, 46, 33, 9, 3.2, K.wood); line(12, 43, 15, 39, 3.6, K.leather); frame(28, 16, UP, () => axeHead(K, 0.85, true)); },
    Hachoir(K) {
      bar(8, 42, 19, 30, 3.4, K.wood);
      frame(20, 29, UP, () => { shape([[0, -2], [21, -3], [22, 12], [3, 14], [-1, 8]], K.metal, { shadeA: 0.15 }); disc(5, 2.5, 1.6, '#f3ead8'); shine(2, 12.5, 20, 11); if (K.gem) gem(12, 4, 2, K.gem); });
    },
    'Haches jumelles'(K) {
      for (const mirror of [true, false]) {
        g.save();
        if (mirror) { g.translate(48, 0); g.scale(-1, 1); }
        bar(10, 44, 28, 14, 2.8, K.wood);
        line(11.5, 41.5, 13.5, 38, 3.2, K.leather);
        frame(26, 17, UP, () => axeHead(Object.assign({}, K, { gem: mirror ? null : K.gem }), 0.72, false, false));
        g.restore();
      }
    },
    // ----- bâtons et sceptres -----
    'Bâton'(K) {
      bar(9, 45, 34, 11, 3.4, K.wood);
      disc(20, 30, 1.5, K.dmetal, { ink: false }); disc(26, 22, 1.2, K.dmetal, { ink: false });
      for (const a of [-0.9, 0.2, 1.3]) curve(34, 11, 34 + Math.cos(a - 1.6) * 7, 11 + Math.sin(a - 1.6) * 7, 37 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1.4, K.wood);
      glowDot(38, 8, 7, K.gem || K.cloth);
      disc(38, 8, 5, K.gem || K.cloth); shine(36, 6, 37.5, 5, 1.2);
    },
    'Bâton de pèlerin'(K) {
      bar(10, 45, 31, 12, 3.2, K.wood);
      bar(31, 12, 38, 14, 3.2, K.wood, 32, 2);
      shape([[28, 16], [32, 16], [31, 27], [29, 24], [27, 27]], K.cloth, { shade: false, w: 1 });
      if (K.gem) gem(31, 12, 2.2, K.gem); else disc(31, 12, 2, K.dmetal);
    },
    "Bâton d'os"(K) {
      bar(10, 45, 31, 15, 3.4, BONE);
      for (const t of [0.25, 0.55]) disc(10 + 21 * t, 45 - 30 * t, 2.6, BONE);
      disc(33, 11, 7, BONE, { ry: 6.4 });
      disc(30.5, 11, 1.8, K.gem || INK, { w: 0.8 }); disc(35.5, 11, 1.8, K.gem || INK, { w: 0.8 });
      line(31.5, 15.5, 34.5, 15.5, 0.9); line(33, 14.5, 33, 16.5, 0.9);
    },
    'Sceptre arcanique'(K) {
      bar(13, 42, 29, 19, 3, K.dmetal);
      for (const t of [0.3, 0.7]) disc(13 + 16 * t, 42 - 23 * t, 2.1, K.rare >= 2 ? K.trim : GOLD);
      const c = K.gem || '#8a6ad8';
      glowDot(33, 12, 9, c);
      frame(33, 12, UP, () => { shape([[-8, 0], [0, -4.5], [8, 0], [0, 4.5]], c, { shade: false }); line(-8, 0, 8, 0, 0.7, INK, 0.6); shine(-4, -2, 0, -3.6); });
      for (const a of [0.5, 2.1, 3.7, 5.2]) line(33 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, 33 + Math.cos(a) * 12.5, 12 + Math.sin(a) * 12.5, 1.1, c);
    },
    'Sceptre sacré'(K) {
      bar(13, 43, 29, 18, 3, K.tier >= 3 ? GOLD : K.metal);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * G.TAU; line(32 + Math.cos(a) * 7, 13 + Math.sin(a) * 7, 32 + Math.cos(a) * 10.5, 13 + Math.sin(a) * 10.5, 1.6, GOLD); }
      disc(32, 13, 6.5, GOLD);
      if (K.gem) gem(32, 13, 3, K.gem); else disc(32, 13, 2.5, '#fff1c0');
    },
    Baguette(K) {
      bar(12, 41, 31, 16, 2.2, K.wood);
      line(14, 38, 17, 34, 2.4, K.rare >= 2 ? K.trim : K.dmetal);
      const c = K.gem || GOLD;
      glowDot(34, 12, 7, c);
      g.fillStyle = c; star(34, 12, 6, 2.6); g.fill(); inkPath(starPts(34, 12, 6, 2.6), 1, true);
      sparkle(40, 20, 2, c); sparkle(26, 8, 1.6, c);
    },
    // ----- arcs -----
    'Arc long'(K) { bow(K, 13, 3, 13, 45, 36, 2.9); arrow(6, 26, 41, 22, K); },
    'Arc court'(K) { bow(K, 15, 10, 15, 38, 31, 2.6); arrow(10, 25, 36, 23, K); },
    'Arc composite'(K) {
      const pts = [[16, 5], [20, 7], [21, 11], [24, 16], [26, 24], [24, 32], [21, 37], [20, 41], [16, 43]];
      g.lineJoin = 'round';
      path(pts, false); g.strokeStyle = INK; g.lineWidth = 5.4; g.stroke();
      path(pts, false); g.strokeStyle = K.wood; g.lineWidth = 3.2; g.stroke();
      bar(16, 5, 13, 3, 2.4, K.rare >= 2 ? K.trim : BONE); bar(16, 43, 13, 45, 2.4, K.rare >= 2 ? K.trim : BONE);
      line(16, 5, 16, 43, 0.8);
      disc(25.5, 24, 2.4, K.leather);
      arrow(8, 25, 40, 23, K);
      if (K.gem) gem(25.5, 24, 1.8, K.gem);
    },
    // ----- armes contondantes -----
    Masse(K) {
      bar(12, 43, 28, 19, 3.2, K.wood);
      line(13.5, 40, 16, 36.5, 3.6, K.leather);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * G.TAU; shape([[31 + Math.cos(a - 0.25) * 6.5, 15 + Math.sin(a - 0.25) * 6.5], [31 + Math.cos(a) * 10, 15 + Math.sin(a) * 10], [31 + Math.cos(a + 0.25) * 6.5, 15 + Math.sin(a + 0.25) * 6.5]], K.dmetal, { shade: false, w: 0.9 }); }
      disc(31, 15, 7, K.metal); shine(28, 12, 30, 10.5, 1.2);
      if (K.gem) gem(31, 15, 2.3, K.gem);
    },
    "Masse d'armes"(K) {
      bar(11, 44, 28, 20, 3, K.dmetal);
      line(12.5, 41, 15, 37.5, 3.4, K.leather);
      frame(30, 17, UP, () => {
        for (const sg of [-1, 1]) for (const [a, b] of [[-5, 1], [1.5, 7.5]]) shape([[a, 2.6 * sg], [(a + b) / 2, 9 * sg], [b, 2.6 * sg]], K.metal, { shadeA: 0.15, w: 1.1 });
        shape([[-6, -2.8], [9, -2.8], [13, 0], [9, 2.8], [-6, 2.8]], K.dmetal, { shade: false });
        shine(-4, -1.6, 8, -1.6, 0.9);
        disc(1.5, 0, 2.2, K.rare >= 2 ? K.trim : K.metal, { w: 0.9 });
        if (K.gem) gem(1.5, 0, 1.7, K.gem);
      });
    },
    'Fléau'(K) {
      bar(9, 44, 21, 29, 3.2, K.wood);
      line(10, 42, 12.5, 38.5, 3.6, K.leather);
      disc(21, 29, 1.8, K.dmetal);
      for (let i = 1; i <= 4; i++) disc(21 + i * 2.6, 29 - i * 3.1, 1.3, null, { w: 1.1 });
      const bx = 35, by = 12;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * G.TAU; line(bx + Math.cos(a) * 5, by + Math.sin(a) * 5, bx + Math.cos(a) * 9, by + Math.sin(a) * 9, 1.6, INK); }
      disc(bx, by, 6.2, K.metal); shine(bx - 3, by - 3, bx - 1, by - 4.5, 1.1);
      if (K.gem) gem(bx, by, 2, K.gem);
    },
    Marteau(K) {
      bar(12, 44, 28, 17, 3.4, K.wood);
      line(13.5, 41, 16, 37, 3.8, K.leather);
      frame(29, 15, UP, () => {
        shape([[-5, -11], [6, -11], [6, 11], [-5, 11]], K.metal, { shadeA: 0.18 });
        shape([[-6, -12], [7, -12], [7, -8], [-6, -8]], K.dmetal, { shade: false, w: 1 });
        shape([[-6, 8], [7, 8], [7, 12], [-6, 12]], K.dmetal, { shade: false, w: 1 });
        shape([[6, -3], [12, 0], [6, 3]], K.dmetal, { shade: false, w: 1 });
        if (K.gem) gem(0.5, 0, 2.4, K.gem); else disc(0.5, 0, 2, K.rare >= 2 ? K.trim : K.dmetal);
      });
    },
    Faux(K) {
      bar(11, 46, 31, 5, 2.8, K.wood);
      line(19, 30, 24, 31, 2.6, K.wood);
      shape([[31, 5], [24, 3], [15, 4], [7, 8], [3, 14], [10, 11], [18, 9], [27, 9], [31, 10]], K.metal, { shadeA: 0.15 });
      curve(5, 13, 14, 7, 27, 8, 1, WHITE, 0.8);
      if (K.gem) gem(30, 7.5, 1.8, K.gem);
    },
    'Grimoire maudit'(K) {
      const cover = K.rare ? shadeOf(K.cloth, 0.55) : '#4a2236';
      shape([[11, 9], [36, 7], [39, 40], [13, 42]], '#e9dfc6', { shade: false });
      shape([[9, 8], [34, 6], [37, 39], [11, 41]], cover, { shadeA: 0.25 });
      for (const [x, y] of [[9, 8], [34, 6], [37, 39], [11, 41]]) disc(x + (x < 20 ? 2 : -2), y + (y < 20 ? 2 : -2), 1.6, K.dmetal, { w: 0.8 });
      disc(23, 23, 7, null, { w: 1.2 });
      disc(23, 23, 5.5, '#efe3c6', { ry: 3.6 });
      disc(23, 23, 2.3, K.gem || '#c8402e', { w: 0.8 });
      shape([[35, 20], [40, 19], [40, 26], [35.5, 26]], K.dmetal, { shade: false, w: 0.9 });
    },
    // ----- dagues -----
    Dagues(K) {
      frame(12, 36, UP, () => { blade(17, 3.6, K); hilt(8, 5, Object.assign({}, K, { gem: null }), { pommel: 2 }); });
      frame(36, 36, -Math.PI - UP, () => { g.scale(1, -1); blade(17, 3.6, K); hilt(8, 5, K, { pommel: 2, gemR: 1.5 }); });
    },
    'Lames jumelles'(K) {
      for (const sg of [-1, 1]) {
        const x0 = sg < 0 ? 12 : 36;
        g.save(); g.translate(x0, 38); if (sg > 0) g.scale(-1, 1); g.rotate(UP);
        const pts = [[0, -2], [8, -4.5], [16, -4], [22, -1], [18, -0.6], [10, -0.6], [3, 2]];
        shape(pts, K.metal, { shadeA: 0.12 }); curve(2, -2.5, 12, -5.5, 21, -1.6, 0.9, WHITE, 0.8);
        shape([[-1.6, -4], [1.4, -4], [1.4, 4], [-1.6, 4]], K.rare >= 2 ? K.trim : K.dmetal, { shade: false, w: 1 });
        shape([[-7, -1.6], [-1.6, -1.6], [-1.6, 1.6], [-7, 1.6]], K.leather, { shade: false, w: 1 });
        g.restore();
      }
      if (K.gem) gem(24, 30, 1.9, K.gem);
    },
    Kriss(K) { frame(13, 35, UP, () => { blade(26, 4.6, K, { wavy: true }); hilt(9, 6, K, { pommel: 2.6, pommelCol: K.dmetal }); }); },
    // ----- instruments -----
    Luth(K) {
      bar(26, 22, 40, 7, 3.4, shadeOf(K.wood, 0.75));
      frame(41, 6, UP, () => shape([[-1, -2.5], [5, -3], [5, 3], [-1, 2.5]], shadeOf(K.wood, 0.7), { shade: false, w: 1 }));
      disc(20, 29, 11.5, K.wood, { ry: 10 }); shade([[9, 19], [31, 19], [31, 39], [9, 39]], 0.12);
      disc(21, 27, 3.1, '#3a2a1e');
      disc(21, 27, 4.6, null, { w: 0.8 });
      for (let i = -1; i <= 1; i++) line(15 + i, 33 + i, 39.5 + i, 8 + i, 0.5, '#f5ecd6', 0.9);
      shape([[13, 32], [17, 36], [16, 37], [12, 33]], K.rare >= 2 ? K.trim : '#3a2a1e', { shade: false, w: 0.8 });
      if (K.gem) gem(33, 15, 1.7, K.gem);
    },
    Harpe(K) {
      const col = K.tier >= 3 ? GOLD : K.wood;
      for (let i = 0; i < 6; i++) line(15 + i * 3.2, 13 + i * 0.6, 15 + i * 3.2, 39, 0.7, '#f5ecd6', 0.95);
      bar(12, 42, 12, 10, 3.6, col, 6, 24);
      bar(12, 10, 35, 10, 3, col, 24, 2);
      bar(35, 10, 33, 42, 3.4, shadeOf(col, 0.8));
      bar(12, 42, 33, 42, 3, shadeOf(col, 0.8));
      if (K.gem) gem(12, 10, 2.1, K.gem); else disc(12, 10, 2, K.dmetal);
    },
    'Flûte de guerre'(K) {
      bar(6, 40, 40, 9, 4.4, K.wood);
      for (let i = 0; i < 5; i++) disc(15 + i * 4.3, 32 - i * 3.9, 1.1, '#2b2118', { ink: false });
      line(8, 38, 10, 36.2, 5, K.rare >= 2 ? K.trim : K.dmetal); line(37.5, 11.3, 39.5, 9.5, 5, K.rare >= 2 ? K.trim : K.dmetal);
      shape([[9, 37], [6, 44], [9, 43], [11, 46], [12, 39]], K.cloth, { shade: false, w: 0.9 });
      if (K.gem) gem(36, 15, 1.7, K.gem);
    },
    // ----- tête -----
    Casque(K) {
      shape([[10, 33], [10, 21], [14, 12], [24, 8], [34, 12], [38, 21], [38, 33], [32, 34], [31, 24], [17, 24], [16, 34]], K.metal);
      shape([[22.5, 20], [25.5, 20], [25.5, 35], [22.5, 35]], K.dmetal, { shade: false, w: 1 });
      shape([[9.5, 20], [38.5, 20], [38.5, 24], [9.5, 24]], K.rare >= 2 ? K.trim : K.dmetal, { shade: false, w: 1 });
      for (const x of [13, 18, 30, 35]) disc(x, 22, 0.8, INK, { ink: false });
      shine(15, 15, 21, 11, 1.2);
      if (K.gem) gem(24, 14, 2.2, K.gem);
    },
    Heaume(K) {
      curve(24, 8, 34, -1, 42, 9, 4, INK); curve(24, 8, 34, -1, 42, 9, 2.6, K.cloth);
      shape([[11, 41], [11, 17], [15, 10], [24, 7], [33, 10], [37, 17], [37, 41]], K.metal);
      shape([[13, 21], [35, 21], [35, 24.5], [13, 24.5]], '#2b2118', { shade: false, w: 0.9 });
      shape([[22.5, 9], [25.5, 9], [25.5, 41], [22.5, 41]], K.rare >= 2 ? K.trim : K.dmetal, { shade: false, w: 0.9 });
      for (let i = 0; i < 3; i++) for (const x of [17, 31]) disc(x, 30 + i * 3.3, 0.8, INK, { ink: false });
      shine(14, 15, 19, 11, 1.2);
      if (K.gem) gem(24, 15, 2, K.gem);
    },
    Capuche(K) {
      shape([[8, 43], [10, 23], [15, 11], [24, 5], [33, 11], [38, 23], [40, 43], [32, 41], [24, 33], [16, 41]], K.cloth);
      disc(24, 26, 7.5, '#2b2118', { ry: 9 });
      disc(21, 25, 0.9, K.gem || '#f2e2b8', { ink: false }); disc(27, 25, 0.9, K.gem || '#f2e2b8', { ink: false });
      curve(10, 41, 24, 31, 38, 41, 1.6, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7));
    },
    Couronne(K) {
      const col = K.tier <= 1 ? K.metal : GOLD;
      shape([[8, 35], [8, 15], [15, 25], [20, 11], [24, 22], [28, 11], [33, 25], [40, 15], [40, 35]], col);
      shape([[7.5, 30], [40.5, 30], [40.5, 36], [7.5, 36]], shadeOf(col, 0.8), { shade: false, w: 1 });
      for (const [x, y] of [[8, 14], [20, 10], [28, 10], [40, 14]]) disc(x, y, 1.8, col, { w: 0.9 });
      gem(24, 26, 3, K.gem || '#c8402e');
      gem(14, 33, 1.4, K.rare >= 2 ? K.trim : '#5a86b8'); gem(34, 33, 1.4, K.rare >= 2 ? K.trim : '#5a86b8');
    },
    Masque(K) {
      const col = [BONE, K.wood, K.metal, '#d8e6ee', GOLD][K.tier];
      shape([[11, 12], [24, 8], [37, 12], [38, 24], [33, 36], [24, 41], [15, 36], [10, 24]], col);
      shape([[14.5, 19], [21.5, 18.5], [20.5, 23], [15, 22.5]], '#2b2118', { shade: false, w: 0.9 });
      shape([[26.5, 18.5], [33.5, 19], [33, 22.5], [27.5, 23]], '#2b2118', { shade: false, w: 0.9 });
      line(19, 33, 29, 33, 1.3);
      curve(13, 14, 24, 8, 35, 14, 1.4, K.rare >= 2 ? K.trim : '#8c3b2a');
      line(24, 25, 24, 30, 1, INK, 0.6);
      if (K.gem) gem(24, 13.5, 1.9, K.gem);
    },
    // ----- torse -----
    Plastron(K) {
      disc(10, 13, 5.5, K.dmetal); disc(38, 13, 5.5, K.dmetal);
      shape([[11, 11], [19, 9], [24, 13], [29, 9], [37, 11], [38, 23], [35, 41], [13, 41], [10, 23]], K.metal);
      line(24, 14, 24, 40, 1.1, K.dmetal);
      curve(13, 26, 18, 30, 24, 28, 1, INK, 0.8); curve(35, 26, 30, 30, 24, 28, 1, INK, 0.8);
      shape([[12, 36], [36, 36], [35, 41], [13, 41]], K.rare >= 2 ? K.trim : K.dmetal, { shade: false, w: 1 });
      shine(15, 14, 15, 24, 1.2);
      if (K.gem) gem(24, 21, 2.4, K.gem);
    },
    Cuirasse(K) {
      shape([[11, 10], [19, 8], [24, 12], [29, 8], [37, 10], [38, 24], [35, 41], [13, 41], [10, 24]], K.leather);
      g.save(); path([[11, 10], [19, 8], [24, 12], [29, 8], [37, 10], [38, 24], [35, 41], [13, 41], [10, 24]], true); g.clip();
      for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
        const x = 10 + col * 4.4 + (row % 2) * 2.2, y = 13 + row * 3.7;
        g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI); g.fillStyle = K.metal; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.6; g.stroke();
      }
      g.restore();
      inkPath([[11, 10], [19, 8], [24, 12], [29, 8], [37, 10], [38, 24], [35, 41], [13, 41], [10, 24]], 1.3, true);
      if (K.gem) gem(24, 17, 2.2, K.gem);
    },
    Robe(K) {
      shape([[17, 7], [31, 7], [35, 16], [44, 30], [38, 32], [36, 26], [40, 43], [8, 43], [12, 26], [10, 32], [4, 30], [13, 16]], K.cloth);
      shape([[17, 7], [24, 15], [31, 7]], shadeOf(K.cloth, 0.7), { shade: false, w: 1 });
      shape([[13, 24], [35, 24], [35, 27.5], [13, 27.5]], K.rare >= 2 ? K.trim : K.leather, { shade: false, w: 1 });
      line(10, 40, 38, 40, 1.4, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7));
      if (K.gem) gem(24, 25.7, 2, K.gem);
    },
    Tunique(K) {
      shape([[15, 8], [33, 8], [42, 15], [38, 22], [34, 19], [35, 38], [13, 38], [14, 19], [10, 22], [6, 15]], K.cloth);
      shape([[18, 8], [24, 14], [30, 8]], shadeOf(K.cloth, 0.75), { shade: false, w: 1 });
      shape([[13, 27], [35, 27], [35, 31], [13, 31]], K.leather, { shade: false, w: 1 });
      shape([[22, 26.5], [26, 26.5], [26, 31.5], [22, 31.5]], K.metal, { shade: false, w: 0.9 });
      line(14, 36, 34, 36, 1.2, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7));
      if (K.gem) gem(24, 29, 1.6, K.gem);
    },
    Brigandine(K) {
      shape([[12, 9], [19, 8], [24, 16], [29, 8], [36, 9], [38, 22], [36, 41], [12, 41], [10, 22]], K.leather);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const x = 13.5 + c * 4.3, y = 20 + r * 3.7; if (Math.abs(x - 24) < 2 && y < 24) continue; disc(x, y, 0.9, K.tier >= 3 ? GOLD : K.metal, { w: 0.5 }); }
      line(24, 17, 24, 41, 1.1, shadeOf(K.leather, 0.7));
      shape([[11, 36], [37, 36], [36, 41], [12, 41]], K.rare >= 2 ? K.trim : shadeOf(K.leather, 0.75), { shade: false, w: 1 });
      if (K.gem) gem(24, 13.5, 1.9, K.gem);
    },
    // ----- mains -----
    Gantelets(K) {
      shape([[12, 44], [12, 30], [36, 30], [36, 44]], K.dmetal);
      shape([[12, 31], [11, 19], [14, 17], [17, 19], [17, 11], [20, 9], [23, 11], [24, 9], [27, 11], [28, 9.5], [31, 11], [32, 15], [36, 18], [37, 22], [36, 31]], K.metal);
      for (const x of [17, 23.5, 30]) { line(x - 2.5, 16, x + 2.5, 16, 0.8, INK, 0.8); line(x - 2.5, 20, x + 2.5, 20, 0.8, INK, 0.8); }
      shape([[12, 25], [36, 25], [36, 29], [12, 29]], K.rare >= 2 ? K.trim : K.dmetal, { shade: false, w: 1 });
      for (const x of [17, 23.5, 30]) shape([[x - 1.5, 25], [x, 22.5], [x + 1.5, 25]], K.dmetal, { shade: false, w: 0.7 });
      if (K.gem) gem(24, 37, 2.2, K.gem);
    },
    Gants(K) {
      shape([[14, 44], [14, 31], [34, 31], [34, 44]], shadeOf(K.leather, 0.85));
      shape([[14, 32], [12, 20], [15, 19], [17, 24], [17, 10], [20, 9], [22, 11], [23, 8], [26, 8], [27, 11], [29, 9.5], [32, 11], [32, 16], [35, 15], [37, 20], [34, 32]], K.leather);
      for (const x of [20, 25, 30]) line(x, 13, x, 22, 0.6, INK, 0.5);
      line(14, 36, 34, 36, 0.8, INK, 0.5);
      if (K.gem) gem(24, 39.5, 1.8, K.gem);
    },
    Poignes(K) {
      shape([[10, 14], [38, 10], [40, 34], [12, 38]], K.leather);
      shape([[15, 15], [33, 12.5], [35, 31], [17, 33.5]], K.metal, { shadeA: 0.15 });
      for (const t of [0.15, 0.85]) { const y1 = 14 + 24 * t, y2 = 10 + 24 * t; shape([[10, y1 - 1.6], [38, y2 - 1.6], [38, y2 + 1.6], [10, y1 + 1.6]], shadeOf(K.leather, 0.7), { shade: false, w: 0.8 }); }
      shape([[37, 13], [41, 12.5], [41.5, 17], [37.5, 17.5]], K.rare >= 2 ? K.trim : GOLD, { shade: false, w: 0.9 });
      if (K.gem) gem(25, 22.5, 2.6, K.gem); else line(18, 22, 32, 20, 1, K.dmetal);
    },
    Mitaines(K) {
      shape([[14, 44], [14, 30], [34, 30], [34, 44]], shadeOf(K.cloth, 0.85));
      for (const [x, h] of [[17, 7], [22, 9], [27, 8.5], [31.5, 6.5]]) shape([[x - 2, 19], [x - 2, 19 - h], [x + 2, 19 - h], [x + 2, 19]], SKIN, { shade: false, w: 0.9 });
      shape([[13, 31], [12, 22], [15, 19], [34, 18], [36, 23], [34, 31]], K.cloth);
      shape([[34, 24], [39, 19], [41, 21], [36, 28]], SKIN, { shade: false, w: 0.9 });
      line(14, 35, 34, 35, 1, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7));
      if (K.gem) gem(24, 39.5, 1.8, K.gem);
    },
    // ----- jambes -----
    'Jambières'(K) {
      shape([[11, 7], [37, 7], [37, 13], [11, 13]], K.leather, { shade: false });
      shape([[11, 13], [23, 13], [22, 44], [13, 44]], K.metal);
      shape([[25, 13], [37, 13], [35, 44], [26, 44]], K.metal);
      disc(17.5, 27, 3.5, K.dmetal); disc(30.5, 27, 3.5, K.dmetal);
      shine(13.5, 16, 14.5, 23, 1.1);
      if (K.gem) gem(24, 10, 2, K.gem);
    },
    'Grèves'(K) {
      for (const x of [16, 32]) {
        shape([[x - 6, 9], [x + 6, 9], [x + 5, 41], [x, 44], [x - 5, 41]], K.metal);
        for (const y of [17, 33]) shape([[x - 6.5, y - 1.4], [x + 6.5, y - 1.4], [x + 6.5, y + 1.4], [x - 6.5, y + 1.4]], K.leather, { shade: false, w: 0.8 });
        line(x, 11, x, 41, 0.9, K.dmetal);
      }
      if (K.gem) { gem(16, 25, 1.7, K.gem); gem(32, 25, 1.7, K.gem); }
    },
    Pantalon(K) {
      shape([[11, 7], [37, 7], [39, 43], [28, 43], [24, 18], [20, 43], [9, 43]], K.cloth);
      shape([[11, 7], [37, 7], [37, 12], [11, 12]], K.leather, { shade: false, w: 1 });
      shape([[22, 6.5], [26, 6.5], [26, 12.5], [22, 12.5]], K.metal, { shade: false, w: 0.9 });
      line(10, 40, 20, 40, 1.2, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7)); line(28, 40, 38.5, 40, 1.2, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7));
      if (K.gem) gem(24, 9.5, 1.5, K.gem);
    },
    Cuissards(K) {
      shape([[10, 6], [38, 6], [38, 11], [10, 11]], K.leather, { shade: false });
      for (const x of [17, 31]) {
        shape([[x - 7, 11], [x + 7, 11], [x + 6, 28], [x - 6, 28]], K.metal);
        disc(x, 32, 5, K.dmetal); shine(x - 3, 30, x - 1, 28.5, 1);
        shape([[x - 4, 36], [x + 4, 36], [x + 3, 44], [x - 3, 44]], K.leather, { shade: false, w: 1 });
      }
      if (K.gem) { gem(17, 32, 1.8, K.gem); gem(31, 32, 1.8, K.gem); }
    },
    // ----- pieds -----
    Bottes(K) {
      shape([[13, 5], [28, 5], [28, 29], [40, 34], [41, 43], [12, 43], [14, 28]], K.leather);
      shape([[12, 5], [29, 5], [29.5, 11], [11.5, 11]], shadeOf(K.leather, 0.75), { shade: false, w: 1 });
      shape([[11, 41], [42, 41], [42, 44], [11, 44]], '#3a2a1e', { shade: false, w: 0.9 });
      for (let i = 0; i < 4; i++) line(17, 15 + i * 4, 24, 17 + i * 4, 0.8, K.rare >= 2 ? K.trim : '#efe3c6', 0.95);
      if (K.gem) gem(20.5, 8, 1.7, K.gem);
    },
    Sandales(K) {
      for (const [x, d] of [[16, -1], [32, 1]]) {
        disc(x, 26, 7, shadeOf(K.leather, 0.85), { ry: 17 });
        for (const y of [17, 25, 33]) shape([[x - 7.5, y - 1.4 + d], [x + 7.5, y - 1.4 - d], [x + 7.5, y + 1.4 - d], [x - 7.5, y + 1.4 + d]], K.rare >= 2 ? K.trim : K.leather, { shade: false, w: 0.8 });
      }
      if (K.gem) gem(24, 10, 1.7, K.gem);
    },
    Solerets(K) {
      shape([[13, 9], [27, 9], [28, 27], [37, 31], [44, 39], [41, 43], [12, 43], [13, 27]], K.metal);
      for (const t of [0.25, 0.5, 0.75]) line(13 + 15 * t, 27 + 4 * t, 13 + 15 * t, 42, 0.9, K.dmetal);
      curve(28, 27, 34, 30, 41, 36, 0.9, K.dmetal);
      shape([[12, 9], [28, 9], [28, 14], [12, 14]], K.rare >= 2 ? K.trim : K.dmetal, { shade: false, w: 1 });
      shine(15, 16, 15, 25, 1.1);
      if (K.gem) gem(20, 20, 2, K.gem);
    },
    Chausses(K) {
      for (const x of [8, 25]) {
        shape([[x, 30], [x + 4, 22], [x + 10, 21], [x + 13, 26], [x + 16, 33], [x + 15, 38], [x, 38]], K.cloth);
        shape([[x - 0.5, 36], [x + 16, 36], [x + 16, 39], [x - 0.5, 39]], K.leather, { shade: false, w: 0.8 });
        line(x + 4, 25, x + 10, 24, 1, K.rare >= 2 ? K.trim : shadeOf(K.cloth, 0.7));
      }
      if (K.gem) gem(24, 14, 1.7, K.gem);
    },
    // ----- anneaux -----
    Anneau(K) { ring(K, 3.6); setGem(K, 24, 15, 4.5); },
    'Chevalière'(K) {
      ring(K, 4.6);
      disc(24, 15, 8, K.band, { ry: 6.2 });
      disc(24, 15, 5.6, shadeOf(K.band, 0.85), { ry: 4.2, w: 0.8 });
      line(21, 15, 27, 15, 1.1, INK, 0.8); line(24, 12, 24, 18, 1.1, INK, 0.8);
      if (K.gem) gem(24, 15, 1.6, K.gem);
    },
    Bague(K) {
      ring(K, 2.2);
      const c = K.gem || '#c8402e';
      for (const [dx, dy] of [[-5.5, 1], [5.5, 1], [0, -5], [0, 6]]) gem(24 + dx, 15 + dy, 2, K.rare >= 2 ? K.trim : '#e9e3d6');
      gem(24, 15.5, 4.6, c);
    },
    Sceau(K) {
      ring(K, 3.8);
      disc(24, 14, 8.5, K.band);
      disc(24, 14, 6.4, '#3a2a1e', { w: 0.8 });
      const rc = K.gem || GOLD;
      line(24, 9.5, 24, 18.5, 1.3, rc); line(20, 12, 28, 16, 1.3, rc); line(20, 16, 28, 12, 1.3, rc);
    },
    // ----- amulettes -----
    Amulette(K) {
      chainCurve(10, 5, 24, 30, 38, 5, K.band);
      shape([[24, 21], [33, 31], [24, 44], [15, 31]], K.band);
      gem(24, 31.5, 5.2, K.gem || '#8a6ad8');
    },
    Pendentif(K) {
      chainCurve(11, 4, 24, 26, 37, 4, K.band);
      disc(24, 21, 2, K.band);
      const c = K.gem || '#5a86b8';
      path([[24, 23], [30, 33], [29, 39], [24, 43], [19, 39], [18, 33]], true); g.fillStyle = c; g.fill();
      g.globalAlpha = 0.28; path([[24, 33], [30, 33], [29, 39], [24, 43]], true); g.fillStyle = INK; g.fill(); g.globalAlpha = 1;
      inkPath([[24, 23], [30, 33], [29, 39], [24, 43], [19, 39], [18, 33]], 1.1, true);
      disc(21.5, 31, 1.2, WHITE, { ink: false });
    },
    Talisman(K) {
      chainCurve(11, 4, 24, 24, 37, 4, K.leather);
      shape([[17, 21], [30, 19], [33, 32], [26, 42], [15, 37]], ['#9aa59a', '#8e8a7c', '#6a6f78', '#a8c4cc', '#7a5a8e'][K.tier]);
      const rc = K.gem || '#2b2118';
      line(24, 24, 24, 37, 1.5, rc); line(24, 28, 29, 25, 1.3, rc); line(24, 32, 19.5, 29, 1.3, rc);
      for (const [x, y, a] of [[13, 30, 0.5], [35, 28, -0.5]]) frame(x, y, a, () => shape([[0, -1.2], [7, -2.5], [9, 0], [7, 2.5], [0, 1.2]], K.cloth, { shade: false, w: 0.8 }));
    },
    'Médaillon'(K) {
      chainCurve(10, 4, 24, 24, 38, 4, K.band);
      disc(24, 21.5, 2.2, K.band);
      disc(24, 33, 9.5, K.band); disc(24, 33, 7, shadeOf(K.band, 0.85), { w: 0.8 });
      g.fillStyle = K.gem || INK; star(24, 33, 5, 2.1); g.fill();
      shine(18.5, 29, 20.5, 26.5, 1.2);
    },
  };
  const SLOT_DEFAULT = { arme: 'Épée longue', tete: 'Casque', torse: 'Plastron', mains: 'Gants', jambes: 'Pantalon', pieds: 'Bottes', anneau: 'Anneau', amulette: 'Amulette' };

  // ----- pièces partagées -----
  function katana(K, len, grip) {
    frame(48 - (48 - len) / 2 - len * 0.72, 48 - (48 - len) / 2 - 2, UP - 0.12, () => {
      const pts = [[0, -2], [len * 0.5, -3.6], [len, -1.2], [len * 0.95, 0.4], [len * 0.5, -0.9], [0, 2]];
      shape(pts, '#d9dee4', { shadeA: 0.1 });
      curve(2, 0.6, len * 0.5, -1.6, len * 0.92, -0.2, 0.9, '#f4f6f8', 0.9);
      disc(-1, 0, 3.5, K.rare >= 2 ? K.trim : GOLD, { ry: 4.2 });
      shape([[-1.5 - grip, -1.9], [-1.5, -1.9], [-1.5, 1.9], [-1.5 - grip, 1.9]], '#2a2433', { shade: false, w: 1 });
      for (let i = 0; i < grip / 2.3; i++) { line(-2 - i * 2.3, -1.6, -3.2 - i * 2.3, 1.6, 0.8, K.cloth); line(-3.2 - i * 2.3, -1.6, -2 - i * 2.3, 1.6, 0.8, K.cloth); }
      disc(-grip - 2.2, 0, 1.8, K.dmetal, { ry: 2.2 });
      if (K.gem) gem(-1, 0, 1.6, K.gem);
    });
  }
  function bow(K, x1, y1, x2, y2, cx, w) {
    bar(x1, y1, x2, y2, w, K.wood, cx, (y1 + y2) / 2);
    line(x1, y1, x2, y2, 0.8);
    const mx = (x1 + 2 * cx + x2) / 4, my = (y1 + y2) / 2;
    disc(mx - 0.5, my, 2.5, K.leather, { ry: 3.6 });
    if (K.gem) gem(mx - 0.5, my, 1.6, K.gem);
    if (K.rare >= 2) { disc(x1 + 1, y1 + 1, 1.3, K.trim, { w: 0.7 }); disc(x2 + 1, y2 - 1, 1.3, K.trim, { w: 0.7 }); }
  }
  function ring(K, w) {
    g.beginPath(); g.ellipse(24, 30, 12, 9.5, 0, 0, G.TAU);
    g.strokeStyle = INK; g.lineWidth = w + 2.2; g.stroke();
    g.strokeStyle = K.band; g.lineWidth = w; g.stroke();
    g.globalAlpha = 0.7; g.strokeStyle = WHITE; g.lineWidth = 0.9; g.beginPath(); g.ellipse(24, 30, 12, 9.5, 0, 3.6, 4.4); g.stroke(); g.globalAlpha = 1;
  }
  function setGem(K, x, y, r) {
    shape([[x - r - 1.6, y + 2], [x - r, y - r + 1], [x + r, y - r + 1], [x + r + 1.6, y + 2], [x, y + r + 1]], K.band, { shade: false, w: 1 });
    gem(x, y - 0.6, r, K.gem || (K.rare ? D.RARITY[K.rare].color : '#9a9488'));
  }
  function glowDot(x, y, r, col) {
    const gr = g.createRadialGradient(x, y, 1, x, y, r * 1.8);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 0.45; g.fillStyle = gr; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); g.globalAlpha = 1;
  }
  function starPts(x, y, R, r) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * G.TAU, rr = i % 2 ? r : R; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return pts; }
  function star(x, y, R, r) { path(starPts(x, y, R, r), true); }
  // assombrit une couleur #rrggbb
  function shadeOf(hex, k) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + ((1 << 24) + (f(r) << 16) + (f(gg) << 8) + f(b)).toString(16).slice(1);
  }
  function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function draw(it) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    g = c.getContext('2d');
    g.scale(2, 2);
    const base = it.base || SLOT_DEFAULT[it.slot] || 'Épée longue', rarity = it.rarity | 0, tier = tierOf(it), acc = accentOf(it);
    S.begin(hash(base) + rarity * 13 + tier * 7, true);
    const R = D.RARITY[rarity];
    const K = {
      tier, rare: rarity,
      metal: METALS[tier], dmetal: DMETALS[tier], wood: WOODS[tier], leather: LEATHERS[tier],
      cloth: rarity ? R.color : CLOTHS[tier],
      trim: rarity >= 4 ? '#e8a23c' : R.color,
      band: tier >= 2 || rarity >= 3 ? GOLD : METALS[tier],
      gem: acc ? ACCENT[acc] : null,
    };
    if (rarity >= 2) glow(R.color, rarity >= 4 ? 0.6 : rarity === 3 ? 0.45 : 0.25);
    const fn = SHAPES[base] || SHAPES[SLOT_DEFAULT[it.slot]] || SHAPES['Épée longue'];
    try { fn(K); } catch (e) { console.error(e); }
    if (rarity >= 4) { sparkle(41, 7, 3, '#fff3c4'); sparkle(7, 40, 2.4, '#fff3c4'); sparkle(42, 41, 1.8, '#ffe08a'); }
    else if (rarity === 3) sparkle(41, 7, 2.2, '#f1e4ff');
    g = null;
    return c;
  }
})();
