// Rendu : carte, unités, éclairage des donjons, flammes, ambiance (poussière, lucioles, braises, pages),
// taches d'encre au sol, vie de la ville (fumée, oiseaux, fontaine) et flèche d'objectif.
(function () {
  const D = G.D, S = G.S, R = G.R, Game = G.Game;
  const T = D.TILE;
  const FX = (G.FX = {});
  let vignette = null, lightCanvas = null, lightCtx = null;

  // ================= Ambiance (mise à jour) =================
  FX.update = function (sc, dt) {
    const th = D.THEMES[sc.map.theme], cam = Game.cam;
    sc.fxT = (sc.fxT || 0) + dt;
    const amb = sc.ambient;
    const kind = sc.kind === 'town' || sc.kind === 'tuto' ? 'leaf' : th.ambient;
    const max = kind === 'leaf' ? 14 : kind === 'snow' ? 90 : kind === 'sand' ? 60 : kind === 'ash' ? 70 : 40;
    const rate = kind === 'leaf' ? 3 : kind === 'snow' ? 45 : kind === 'sand' ? 24 : kind === 'ash' ? 26 : 14;
    for (let n = 0; n < (kind === 'snow' ? 2 : 1); n++) if (kind && amb.filter((a) => a.kind === kind).length < max && Math.random() < dt * rate) {
      const x = cam.x + Math.random() * Game.W, y = cam.y + Math.random() * Game.H;
      const a = { kind, x, y, t: 0, life: 4 + Math.random() * 4, seed: Math.random() * 100 };
      if (kind === 'dust') { a.vx = G.rnd(-6, 6); a.vy = G.rnd(-4, 4); }
      else if (kind === 'firefly') { a.vx = G.rnd(-15, 15); a.vy = G.rnd(-15, 15); }
      else if (kind === 'ember') { a.vx = G.rnd(-8, 8); a.vy = G.rnd(-40, -18); a.life = 2 + Math.random() * 2; }
      else if (kind === 'page') { a.y = cam.y - 10; a.vx = G.rnd(-12, 12); a.vy = G.rnd(18, 30); a.rot = Math.random() * 6; a.life = 8; }
      else if (kind === 'leaf') { a.y = cam.y - 10; a.vx = G.rnd(10, 30); a.vy = G.rnd(20, 34); a.rot = Math.random() * 6; a.life = 9; a.col = G.pick(['#7a9a48', '#c4661a', '#b8862b']); }
      else if (kind === 'sparkle') { a.vx = 0; a.vy = -4; a.life = 1.2 + Math.random() * 1.6; a.col = Math.random() < 0.5 ? '#bff0ff' : '#e4c8ff'; }
      else if (kind === 'snow') { a.y = cam.y - 10; a.x = cam.x - 100 + Math.random() * (Game.W + 200); a.vx = G.rnd(-12, 12); a.vy = G.rnd(40, 70); a.life = 14; a.r = 1 + Math.random() * 1.8; }
      else if (kind === 'bubble') { a.vx = G.rnd(-4, 4); a.vy = G.rnd(-32, -18); a.life = 3 + Math.random() * 2; a.r = 1.5 + Math.random() * 2.5; }
      else if (kind === 'sand') { a.x = cam.x - 20 + Math.random() * (Game.W + 40); a.vx = G.rnd(40, 90); a.vy = G.rnd(-6, 10); a.life = 3 + Math.random() * 2; a.l = 3 + Math.random() * 6; }
      else if (kind === 'frost') { a.vx = G.rnd(-6, 6); a.vy = G.rnd(4, 12); a.life = 2 + Math.random() * 2; a.col = Math.random() < 0.5 ? '#ffffff' : '#bfe4f4'; }
      else if (kind === 'dreamdust') { a.vx = G.rnd(-8, 8); a.vy = G.rnd(-14, -4); a.life = 4 + Math.random() * 3; a.col = G.pick(['#f0a0e0', '#9fd0f0', '#f2e04a', '#c9a0f0']); }
      else if (kind === 'voidmote') { a.vx = G.rnd(-5, 5); a.vy = G.rnd(-22, -8); a.life = 3 + Math.random() * 3; a.star = Math.random() < 0.3; }
      else if (kind === 'ash') { a.y = cam.y - 10; a.x = cam.x - 60 + Math.random() * (Game.W + 120); a.vx = G.rnd(-10, 14); a.vy = G.rnd(22, 40); a.life = 16; a.rot = Math.random() * 6; a.ember = Math.random() < 0.18; }
      amb.push(a);
    }
    // fumée des cheminées et fontaine
    if (sc.kind === 'town') {
      sc.smokeT = (sc.smokeT || 0) - dt;
      if (sc.smokeT <= 0) {
        sc.smokeT = 0.45;
        sc.map.chimneys.forEach((c) => amb.push({ kind: 'smoke', x: c.x + G.rnd(-3, 3), y: c.y, vx: G.rnd(4, 10), vy: G.rnd(-22, -14), t: 0, life: 3, seed: Math.random() * 100 }));
      }
      sc.fountT = (sc.fountT || 0) - dt;
      if (sc.fountT <= 0) { sc.fountT = 0.9; Game.ring(32 * T + G.rnd(-14, 14), 23 * T + G.rnd(-8, 8), 18, '#e8f4f0', 1.2); }
      // oiseaux
      if (sc.birds.length === 0 && Math.random() < dt * 0.08) {
        const y0 = cam.y + G.rnd(40, Game.H * 0.6), dir = Math.random() < 0.5 ? 1 : -1;
        const n = G.rint(3, 5);
        for (let i = 0; i < n; i++) sc.birds.push({ x: (dir > 0 ? cam.x - 40 : cam.x + Game.W + 40) - dir * i * 26, y: y0 + (i % 2) * 18 + i * 6, vx: dir * G.rnd(110, 140), ph: Math.random() * 6 });
      }
      sc.birds.forEach((b) => { b.x += b.vx * dt; b.ph += dt * 10; });
      sc.birds = sc.birds.filter((b) => b.x > cam.x - 200 && b.x < cam.x + Game.W + 200);
    }
    // bulles de lave
    if (sc.kind === 'dungeon') {
      if (sc.map.hasLava == null) { sc.map.hasLava = false; for (let i = 0; i < sc.map.tiles.length; i++) if (sc.map.tiles[i] === 5) { sc.map.hasLava = true; break; } }
      if (sc.map.hasLava) for (let n = 0; n < 3; n++) {
        const x = cam.x + Math.random() * Game.W, y = cam.y + Math.random() * Game.H;
        if (G.W.lavaAt(sc.map, x, y) && Math.random() < dt * 30) amb.push({ kind: 'lavapop', x, y, vx: 0, vy: -6, t: 0, life: 0.7, seed: Math.random() * 100 });
      }
    }
    const w = sc.wind && sc.wind.t >= 0 ? sc.wind : null;
    const sandy = th.ambient === 'sand';
    if (w && Math.random() < dt * (sandy ? 60 : 30)) amb.push({ kind: 'gust', x: cam.x + Math.random() * Game.W, y: cam.y + Math.random() * Game.H, vx: Math.cos(w.ang) * 600, vy: Math.sin(w.ang) * 600, t: 0, life: 0.35, seed: 0, col: sandy ? '#b8925a' : null });
    if (sc.storm && Math.random() < dt * 40) amb.push({ kind: 'sand', x: cam.x + Math.random() * Game.W, y: cam.y + Math.random() * Game.H, vx: G.rnd(120, 220) * (w ? Math.sign(Math.cos(w.ang)) || 1 : 1), vy: w ? Math.sin(w.ang) * 160 : 0, t: 0, life: 1.4, l: 6 + Math.random() * 8, seed: 0 });
    for (const a of amb) {
      a.t += dt;
      if (w && (a.kind === 'snow' || a.kind === 'leaf' || a.kind === 'sand' || a.kind === 'ash')) { a.vx += Math.cos(w.ang) * 220 * dt; a.vy += Math.sin(w.ang) * 220 * dt; }
      if (a.kind === 'ash') { a.rot += dt * 1.5; a.vx += Math.sin(a.t * 1.3 + a.seed) * 10 * dt; }
      if (a.kind === 'dreamdust' || a.kind === 'voidmote') a.vx += Math.sin(a.t * 2 + a.seed) * 6 * dt;
      if (a.kind === 'bubble') a.vx = Math.sin(a.t * 4 + a.seed) * 8;
      if (a.kind === 'firefly') { a.vx += G.rnd(-40, 40) * dt; a.vy += G.rnd(-40, 40) * dt; a.vx *= 0.98; a.vy *= 0.98; }
      if (a.kind === 'page' || a.kind === 'leaf') { a.rot += dt * 2; a.vx += Math.sin(a.t * 2 + a.seed) * 12 * dt; }
      a.x += a.vx * dt; a.y += a.vy * dt;
    }
    sc.ambient = amb.filter((a) => a.t < a.life);
  };

  // ================= Rendu principal =================
  Game.render = function (g) {
    const sc = Game.scene;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#1d1915'; g.fillRect(0, 0, Game.W, Game.H);
    if (!sc) return;
    const m = sc.map, cam = Game.cam, th = D.THEMES[m.theme], t = Game.time;
    const sx = Math.round(cam.x + (cam.shake ? G.rnd(-cam.shake, cam.shake) : 0)), sy = Math.round(cam.y + (cam.shake ? G.rnd(-cam.shake, cam.shake) : 0));
    const vw = Math.min(Game.W, m.img.width - Math.max(0, sx)), vh = Math.min(Game.H, m.img.height - Math.max(0, sy));
    g.drawImage(m.img, Math.max(0, sx), Math.max(0, sy), vw, vh, Math.max(0, -sx), Math.max(0, -sy), vw, vh);
    g.save();
    g.translate(-sx, -sy);
    const vis = (x, y, pad) => x > sx - pad && x < sx + Game.W + pad && y > sy - pad && y < sy + Game.H + pad;
    // taches d'encre et brûlures au sol
    sc.decals.forEach((d) => vis(d.x, d.y, 40) && drawDecal(g, d));
    R.gate(g, m);
    sc.zones.forEach((z) => vis(z.x, z.y, z.r) && R.zone(g, z));
    sc.hazards.forEach((h) => R.hazard(g, h));
    sc.corpses.forEach((c) => vis(c.x, c.y, 40) && R.corpse(g, c));
    sc.portals.forEach((pt) => vis(pt.x, pt.y, 60) && R.portalExit(g, pt, t));
    sc.chests.forEach((c) => vis(c.x, c.y, 40) && R.chest(g, c));
    sc.drops.forEach((d) => vis(d.x, d.y, 30) && R.drop(g, d, t));
    // flammes (torches, braseros, feu de camp)
    m.lights.forEach((L) => { if (L.flick && L.kind !== 'lantern' && vis(L.x, L.y, 30)) flame(g, L.x, L.y, L.kind === 'campfire' ? 1.8 : L.kind === 'brazier' ? 1.3 : L.kind === 'torch' ? 1 : 0.55, t, L.x, L.blue); });
    // annonce d'une rafale : flèche autour du joueur
    if (sc.wind && sc.wind.t < 0 && Game.player) {
      const p = Game.player, a = sc.wind.ang, c = Math.cos(a), si = Math.sin(a), bx = p.x + c * 70, by = p.y - 10 + si * 56;
      g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 16);
      S.begin(17); S.poly(g, [[bx + c * 22, by + si * 22], [bx - si * 12 - c * 6, by + c * 12 - si * 6], [bx - si * 4 - c * 6, by + c * 4 - si * 6], [bx - si * 4 - c * 26, by + c * 4 - si * 26], [bx + si * 4 - c * 26, by - c * 4 - si * 26], [bx + si * 4 - c * 6, by - c * 4 - si * 6], [bx + si * 12 - c * 6, by - c * 12 - si * 6]], { fill: '#cfe2f2', fillA: 0.95, w: 1.6, over: 1 });
      S.text(g, 'Rafale !', p.x, p.y - 64, 20, '#3a4a5a', 'center', 'rgba(236,240,244,0.9)');
      g.globalAlpha = 1;
    }
    // objectif du tutoriel : cercle pulsant
    const obj = Game.objective();
    if (obj && sc.kind === 'tuto' && vis(obj.x, obj.y, 60)) {
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); S.begin(5);
      S.circle(g, obj.x, obj.y + 4, 30 + Math.sin(t * 5) * 4, { ry: 14, stroke: '#c9a227', w: 2.4, single: true }); g.globalAlpha = 1;
    }
    const list = sc.units.filter((u) => !u.dead && vis(u.x, u.y, 80)).concat(sc.npcs.filter((n) => vis(n.x, n.y, 80)));
    list.sort((a, b) => a.y - b.y);
    list.forEach((u) => (sc.npcs.includes(u) ? R.npc(g, u) : R.unit(g, u)));
    if (G.Net) G.Net.drawOverlay(g, sc, vis); // noms des autres héros
    sc.units.forEach((u) => !u.dead && !u.isPlayer && !u.dormant && !u.hidden && vis(u.x, u.y, 40) && R.hpBar(g, u));
    sc.projs.forEach((p) => R.proj(g, p));
    drawParts(g, sc);
    sc.ambient.forEach((a) => (a.kind === 'dust' || a.kind === 'page' || a.kind === 'leaf' || a.kind === 'smoke' || a.kind === 'bubble' || a.kind === 'snow' || a.kind === 'gust' || a.kind === 'sand' || a.kind === 'ash') && drawAmbient(g, a));
    g.restore();

    // ----- éclairage, puis brouillard d'exploration (le papier non dessiné reste clair) -----
    // éclipse : la lumière s'éteint (même si l'éclairage est désactivé, c'est un piège)
    const ecl = sc.eclipse ? Math.max(0, Math.min(1, sc.eclipse.t * 2, (sc.eclipse.dur - sc.eclipse.t) * 2)) : 0;
    const dark = Math.max(th.dark, th.dark + (0.94 - th.dark) * ecl);
    if ((dark > 0 && G.opt('light')) || ecl > 0) light(g, sc, sx, sy, dark, t, ecl);
    g.save();
    g.translate(-sx, -sy);
    sc.ambient.forEach((a) => (a.kind === 'firefly' || a.kind === 'ember' || a.kind === 'sparkle' || a.kind === 'frost' || a.kind === 'dreamdust' || a.kind === 'voidmote' || a.kind === 'lavapop') && drawAmbient(g, a));
    if (m.fogCanvas) {
      g.imageSmoothingEnabled = true;
      const fx = Math.max(0, Math.floor(sx / T) - 1), fy = Math.max(0, Math.floor(sy / T) - 1);
      const fw = Math.min(m.w - fx, Math.ceil(Game.W / T) + 3), fh = Math.min(m.h - fy, Math.ceil(Game.H / T) + 3);
      g.drawImage(m.fogCanvas, fx, fy, fw, fh, fx * T, fy * T, fw * T, fh * T);
    }
    if (sc.kind === 'town') sc.birds.forEach((b) => drawBird(g, b));
    sc.texts.forEach((tx) => {
      const a = 1 - Math.max(0, (tx.t - tx.life * 0.6) / (tx.life * 0.4));
      g.globalAlpha = a; S.text(g, tx.s, tx.x, tx.y, tx.size, tx.color, 'center', 'rgba(236,224,196,0.85)'); g.globalAlpha = 1;
    });
    const p = Game.player;
    if (obj && p && Game.mode === 'play' && G.opt('arrow')) drawArrow(g, p, obj, t);
    if (sc.prompt && Game.mode === 'play') {
      S.begin(3);
      const label = G.Input.shortLabel('interact') + ' — ' + sc.prompt.label;
      g.font = '700 19px Caveat, cursive';
      const w = g.measureText(label).width + 24;
      S.rect(g, p.x - w / 2, p.y + 18, w, 26, { fill: '#efe3c6', fillA: 0.95, w: 1.4 });
      S.text(g, label, p.x, p.y + 31, 19, '#2b2118');
    }
    g.restore();
    if (!vignette) {
      vignette = document.createElement('canvas'); vignette.width = Game.W; vignette.height = Game.H;
      const vg = vignette.getContext('2d');
      const gr = vg.createRadialGradient(Game.W / 2, Game.H / 2, Game.H * 0.35, Game.W / 2, Game.H / 2, Game.W * 0.65);
      gr.addColorStop(0, 'rgba(60,40,20,0)'); gr.addColorStop(1, 'rgba(45,28,12,0.5)');
      vg.fillStyle = gr; vg.fillRect(0, 0, Game.W, Game.H);
    }
    g.drawImage(vignette, 0, 0);
    // tempête de sable : voile jaune
    if (sc.storm) { const k = Math.min(1, sc.storm.t * 1.5, (sc.storm.dur - sc.storm.t) * 1.5); g.globalAlpha = 0.28 * k; g.fillStyle = '#d6b27a'; g.fillRect(0, 0, Game.W, Game.H); g.globalAlpha = 1; }
    // cauchemar : commandes inversées
    if (sc.invert && p) {
      const warnT = sc.invert.t < 0, k = warnT ? 0.5 + 0.5 * Math.sin(t * 14) : Math.min(1, (sc.invert.dur - sc.invert.t) * 2);
      g.globalAlpha = 0.35 * k; g.strokeStyle = '#7b3fa6'; g.lineWidth = 46; g.strokeRect(0, 0, Game.W, Game.H); g.globalAlpha = 1;
      S.begin(9);
      S.text(g, warnT ? 'Cauchemar… vos commandes vont s\'inverser !' : 'Commandes inversées : ' + Math.ceil(sc.invert.dur - sc.invert.t) + ' s', Game.W / 2, 92, 26, '#5a2a7a', 'center', 'rgba(236,224,196,0.9)');
    }
    if (p && !p.dead && p.hp / p.maxHp < 0.3 && sc.kind === 'dungeon') {
      g.globalAlpha = (0.3 - p.hp / p.maxHp) * 1.6 * (0.7 + 0.3 * Math.sin(t * 6));
      g.strokeStyle = '#9b2c20'; g.lineWidth = 40; g.strokeRect(0, 0, Game.W, Game.H); g.globalAlpha = 1;
    }
  };

  // ================= Lumière =================
  // Éclairage léger : un seul dégradé d'obscurité centré sur le joueur, puis des halos chauds additifs
  // (aucune toile intermédiaire : rapide même sans carte graphique)
  const SOFT = ['crystal', 'vein', 'crystalsmall', 'runes', 'glowshroom', 'lava', 'voidcrystal', 'starshard', 'dreamflower'];
  function light(g, sc, sx, sy, dark, t, ecl) {
    ecl = ecl || 0;
    const lights = [];
    const add = (x, y, r, i, color) => { if (x > sx - r && x < sx + Game.W + r && y > sy - r && y < sy + Game.H + r) lights.push([x - sx, y - sy, r, i, color]); };
    const p = Game.focus ? Game.focus() : Game.player, m = sc.map;
    const px = p ? p.x - sx : Game.W / 2, py = p ? p.y - 10 - sy : Game.H / 2;
    const gr = g.createRadialGradient(px, py, 70 * (1 - 0.35 * ecl), px, py, 560 * (1 - 0.5 * ecl));
    gr.addColorStop(0, 'rgba(14,9,5,0)');
    gr.addColorStop(0.4, `rgba(14,9,5,${(dark * 0.45).toFixed(3)})`);
    gr.addColorStop(1, `rgba(14,9,5,${dark.toFixed(3)})`);
    g.fillStyle = gr; g.fillRect(0, 0, Game.W, Game.H);
    m.lights.forEach((L) => {
      const f = L.flick ? 0.9 + 0.07 * Math.sin(t * 11 + L.x) + 0.05 * Math.sin(t * 23 + L.y) : L.kind === 'lava' ? 0.88 + 0.12 * Math.sin(t * 1.7 + L.x * 0.05) : 1;
      const soft = SOFT.includes(L.kind);
      add(L.x, L.y, L.r * f * (soft ? 0.8 : 1), (soft ? 0.38 : 1) * (1 - 0.65 * ecl), L.color || '#f2c46b');
    });
    sc.units.forEach((u) => { if (!u.dead && !u.hidden && u.def && u.def.glow) add(u.x, u.y - 16, u.boss ? 180 : 110, 0.9, u.def.glow); });
    sc.units.forEach((u) => { if (u.minion && !u.dead) add(u.x, u.y - 10, 80, 0.6, '#5bd04a'); });
    sc.projs.forEach((pr) => add(pr.x, pr.y, 60, 0.7, pr.color || '#f2c46b'));
    sc.parts.forEach((q) => { if (q.kind === 'ring' && q.r > 40) add(q.x, q.y, q.r * 1.2, 0.8 * (1 - q.t / q.life), q.color); });
    sc.portals.forEach((pt) => add(pt.x, pt.y, 160, 0.9, pt.victory ? '#c9a227' : '#7b3fa6'));
    sc.zones.forEach((z) => { if (z.kind !== 'sand' && z.kind !== 'void') add(z.x, z.y, z.r * 1.1, z.kind === 'sleep' ? 0.3 : 0.5, z.color || '#c9a227'); });
    sc.drops.forEach((d) => { if (d.kind === 'item' && d.item.rarity >= 3) add(d.x, d.y, 70, 0.6, D.RARITY[d.item.rarity].color); });
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, r, i, color] of lights) {
      g.globalAlpha = Math.min(1, i);
      g.drawImage(stampColor(color), x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  let holeStamp = null;
  const colorStamps = {};
  function stampHole() {
    if (holeStamp) return holeStamp;
    holeStamp = document.createElement('canvas'); holeStamp.width = holeStamp.height = 128;
    const c = holeStamp.getContext('2d'), gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    return holeStamp;
  }
  function stampColor(color) {
    if (colorStamps[color]) return colorStamps[color];
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const c = cv.getContext('2d'), gr = c.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, hexA(color, 0.32)); gr.addColorStop(0.5, hexA(color, 0.12)); gr.addColorStop(1, hexA(color, 0));
    c.fillStyle = gr; c.fillRect(0, 0, 96, 96);
    return (colorStamps[color] = cv);
  }
  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
  }

  function flame(g, x, y, s, t, seed, blue) {
    const f = 1 + 0.15 * Math.sin(t * 17 + seed) + 0.1 * Math.sin(t * 29 + seed * 2);
    g.fillStyle = blue ? '#3fa0c0' : '#e8762a';
    g.beginPath(); g.ellipse(x, y - 4 * s * f, 5 * s, 9 * s * f, Math.sin(t * 7 + seed) * 0.15, 0, G.TAU); g.fill();
    g.fillStyle = blue ? '#c8f4ff' : '#ffd36a';
    g.beginPath(); g.ellipse(x, y - 2 * s * f, 2.6 * s, 5 * s * f, 0, 0, G.TAU); g.fill();
    g.strokeStyle = 'rgba(43,33,24,0.6)'; g.lineWidth = 0.8;
    g.beginPath(); g.ellipse(x, y - 4 * s * f, 5 * s, 9 * s * f, Math.sin(t * 7 + seed) * 0.15, 0, G.TAU); g.stroke();
  }

  // ================= Décors dynamiques =================
  function drawDecal(g, d) {
    S.begin(d.seed, true);
    if (d.kind === 'scorch') {
      g.globalAlpha = 0.22; g.fillStyle = '#1d1610';
      S.blobPath(g, d.x, d.y, d.r * 1.2, d.r * 0.8, d.r * 0.4, 12); g.fill();
      g.globalAlpha = 0.3;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * G.TAU + d.seed; S.line(g, d.x, d.y, d.x + Math.cos(a) * d.r * 1.6, d.y + Math.sin(a) * d.r * 1.0, 0.8, '#1d1610', 1, 1); }
    } else if (d.kind === 'crack') {
      g.globalAlpha = 0.4;
      for (let i = 0; i < 7; i++) { const a = (i / 7) * G.TAU + d.seed; S.line(g, d.x, d.y, d.x + Math.cos(a) * d.r * 1.6, d.y + Math.sin(a) * d.r, 1, '#3a2a1a', 1.2, 1); }
    } else {
      g.globalAlpha = 0.3; g.fillStyle = d.color;
      S.blobPath(g, d.x, d.y, d.r, d.r * 0.6, d.r * 0.5, 10); g.fill();
      for (let i = 0; i < 4; i++) { const a = d.seed * 1.7 + i * 1.6, rr = d.r * (1.3 + (i % 2) * 0.5); g.beginPath(); g.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.6, 1.5 + (i % 3), 0, G.TAU); g.fill(); }
    }
    g.globalAlpha = 1;
  }

  function drawAmbient(g, a) {
    const life = Math.min(1, a.t * 2, (a.life - a.t) * 1.5);
    switch (a.kind) {
      case 'dust': g.globalAlpha = 0.35 * life; g.fillStyle = '#f5ecd2'; g.fillRect(a.x, a.y, 2, 2); break;
      case 'firefly': {
        const blink = 0.5 + 0.5 * Math.sin(a.t * 4 + a.seed);
        g.globalAlpha = 0.25 * life * blink; g.fillStyle = '#e8f07a'; g.beginPath(); g.arc(a.x, a.y, 6, 0, G.TAU); g.fill();
        g.globalAlpha = life * blink; g.fillStyle = '#f8ffb0'; g.fillRect(a.x - 1.2, a.y - 1.2, 2.4, 2.4);
        break;
      }
      case 'ember': g.globalAlpha = life; g.fillStyle = a.t % 0.3 < 0.15 ? '#ffb04a' : '#f0782a'; g.fillRect(a.x, a.y, 2.2, 2.2); break;
      case 'sparkle': {
        const k = Math.sin((a.t / a.life) * Math.PI), l = 2 + k * 4;
        g.globalAlpha = k; g.strokeStyle = a.col; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(a.x - l, a.y); g.lineTo(a.x + l, a.y); g.moveTo(a.x, a.y - l); g.lineTo(a.x, a.y + l); g.stroke();
        break;
      }
      case 'snow': g.globalAlpha = 0.9 * life; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(a.x, a.y, a.r, 0, G.TAU); g.fill(); g.strokeStyle = 'rgba(120,140,160,0.5)'; g.lineWidth = 0.5; g.stroke(); break;
      case 'bubble': g.globalAlpha = 0.7 * life; g.strokeStyle = '#d8f4f8'; g.lineWidth = 1; g.beginPath(); g.arc(a.x, a.y, a.r, 0, G.TAU); g.stroke(); break;
      case 'gust': {
        const k = a.t / a.life;
        g.globalAlpha = 0.55 * (1 - k); g.strokeStyle = a.col || '#8fa6bc'; g.lineWidth = 1.4;
        const dx = a.vx * 0.06, dy = a.vy * 0.06;
        g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(a.x + dx * 0.5 - dy * 0.1, a.y + dy * 0.5 + dx * 0.1, a.x + dx, a.y + dy); g.stroke();
        break;
      }
      case 'page': case 'leaf':
        g.save(); g.translate(a.x, a.y); g.rotate(a.rot); g.globalAlpha = 0.85 * life;
        if (a.kind === 'page') { g.fillStyle = '#f5f0e1'; g.fillRect(-5, -4, 10, 8); g.strokeStyle = 'rgba(43,33,24,0.6)'; g.lineWidth = 0.6; g.strokeRect(-5, -4, 10, 8); g.beginPath(); g.moveTo(-3, -1); g.lineTo(3, -1); g.moveTo(-3, 1.5); g.lineTo(2, 1.5); g.stroke(); }
        else { g.fillStyle = a.col; g.beginPath(); g.ellipse(0, 0, 4, 2, 0, 0, G.TAU); g.fill(); }
        g.restore();
        break;
      case 'sand': g.globalAlpha = 0.55 * life; g.strokeStyle = '#a07a42'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.l, a.y - (a.vy / (Math.abs(a.vx) + 1)) * a.l); g.stroke(); break;
      case 'frost': {
        const k = Math.sin((a.t / a.life) * Math.PI);
        g.globalAlpha = 0.8 * k; g.fillStyle = a.col; g.fillRect(a.x - 1, a.y - 1, 2, 2);
        if (k > 0.8) { g.strokeStyle = a.col; g.lineWidth = 0.8; g.beginPath(); g.moveTo(a.x - 3, a.y); g.lineTo(a.x + 3, a.y); g.moveTo(a.x, a.y - 3); g.lineTo(a.x, a.y + 3); g.stroke(); }
        break;
      }
      case 'dreamdust': {
        const k = Math.sin((a.t / a.life) * Math.PI);
        g.globalAlpha = 0.3 * k; g.fillStyle = a.col; g.beginPath(); g.arc(a.x, a.y, 5, 0, G.TAU); g.fill();
        g.globalAlpha = 0.9 * k; g.fillRect(a.x - 1.2, a.y - 1.2, 2.4, 2.4);
        break;
      }
      case 'voidmote': {
        const k = Math.sin((a.t / a.life) * Math.PI);
        if (a.star) { g.globalAlpha = k; g.fillStyle = '#ffffff'; g.fillRect(a.x - 0.8, a.y - 0.8, 1.6, 1.6); }
        else { g.globalAlpha = 0.6 * k; g.fillStyle = '#2a1f3a'; g.beginPath(); g.arc(a.x, a.y, 2.2, 0, G.TAU); g.fill(); g.strokeStyle = '#9b6fe0'; g.lineWidth = 0.6; g.stroke(); }
        break;
      }
      case 'ash':
        g.save(); g.translate(a.x, a.y); g.rotate(a.rot); g.globalAlpha = 0.75 * life;
        if (a.ember) { g.fillStyle = a.t % 0.4 < 0.2 ? '#ffb04a' : '#f0782a'; g.fillRect(-1.2, -1.2, 2.4, 2.4); }
        else { g.fillStyle = '#8a847a'; g.beginPath(); g.ellipse(0, 0, 2.6, 1.4, 0, 0, G.TAU); g.fill(); }
        g.restore();
        break;
      case 'lavapop': {
        const k = a.t / a.life;
        g.globalAlpha = 1 - k; g.strokeStyle = '#ffd36a'; g.lineWidth = 1.2;
        g.beginPath(); g.arc(a.x, a.y, 1.5 + k * 5, Math.PI, G.TAU); g.stroke();
        if (k > 0.5) { g.fillStyle = '#ffb04a'; g.fillRect(a.x - 3 - k * 4, a.y - k * 8, 1.6, 1.6); g.fillRect(a.x + 2 + k * 4, a.y - k * 7, 1.6, 1.6); }
        break;
      }
      case 'smoke': {
        const k = a.t / a.life;
        g.globalAlpha = 0.35 * (1 - k); S.begin(Math.floor(a.seed * 1000));
        S.circle(g, a.x, a.y, 6 + k * 16, { stroke: 'rgba(80,70,60,0.8)', w: 1.2, single: true, fill: 'rgba(200,192,180,0.6)', fillA: 0.5 });
        break;
      }
    }
    g.globalAlpha = 1;
  }

  function drawBird(g, b) {
    const flap = Math.sin(b.ph) * 5, d = Math.sign(b.vx);
    g.strokeStyle = '#2b2118'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(b.x - 8, b.y - flap); g.quadraticCurveTo(b.x - 4, b.y - 3, b.x, b.y); g.quadraticCurveTo(b.x + 4, b.y - 3, b.x + 8, b.y - flap); g.stroke();
    g.globalAlpha = 0.15; g.fillStyle = '#2b2118'; g.beginPath(); g.ellipse(b.x + d * 20, b.y + 90, 6, 2, 0, 0, G.TAU); g.fill(); g.globalAlpha = 1;
  }

  // Flèche qui indique le prochain objectif
  function drawArrow(g, p, obj, t) {
    const dx = obj.x - p.x, dy = obj.y - p.y, d = Math.hypot(dx, dy);
    if (d < 150) return;
    const a = Math.atan2(dy, dx), r = 62 + Math.sin(t * 4) * 4;
    const x = p.x + Math.cos(a) * r, y = p.y - 10 + Math.sin(a) * r * 0.8;
    const c = Math.cos(a), s = Math.sin(a);
    S.begin(9);
    S.poly(g, [[x + c * 16, y + s * 16], [x - s * 9 - c * 4, y + c * 9 - s * 4], [x - c * 1, y - s * 1], [x + s * 9 - c * 4, y - c * 9 - s * 4]], { fill: '#e2c043', fillA: 0.95, w: 1.6, over: 1 });
    const offscreen = obj.x < Game.cam.x || obj.x > Game.cam.x + Game.W || obj.y < Game.cam.y || obj.y > Game.cam.y + Game.H;
    if (offscreen && obj.label) S.text(g, obj.label, x + c * 34, y + s * 26 - 4, 16, '#7a5a1a', 'center', 'rgba(236,224,196,0.9)');
  }

  function drawParts(g, sc) {
    for (const q of sc.parts) {
      const a = 1 - q.t / q.life;
      g.globalAlpha = Math.max(0, a);
      if (q.kind === 'ring') {
        const r = q.r0 + (q.r - q.r0) * Math.min(1, (q.t / q.life) * 1.4);
        S.begin(q.r * 13 + (q.x | 0));
        S.circle(g, q.x, q.y, r, { ry: r * 0.75, stroke: q.color, w: 2, single: true });
      } else if (q.kind === 'slash') {
        g.strokeStyle = q.color; g.lineWidth = 3 * a + 1;
        const pr = q.t / q.life;
        g.beginPath(); g.arc(q.x, q.y, q.r * (0.6 + 0.4 * pr), q.ang - q.arc / 2, q.ang + q.arc / 2); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.arc(q.x, q.y, q.r * (0.45 + 0.4 * pr), q.ang - q.arc / 2 + 0.1, q.ang + q.arc / 2 - 0.1); g.stroke();
      } else if (q.kind === 'puff') {
        g.strokeStyle = q.color; g.lineWidth = 1;
        g.beginPath(); g.arc(q.x, q.y, q.r * 2 + q.t * 20, 0, G.TAU); g.stroke();
      } else if (q.kind === 'spark') {
        g.fillStyle = q.color; g.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r);
      } else if (q.kind === 'lob') {
        const k = q.t / q.life, x = G.lerp(q.x0, q.x, k), y = G.lerp(q.y0, q.y, k) - Math.sin(k * Math.PI) * 80;
        g.globalAlpha = 1; S.begin(5); S.circle(g, x, y, 5, { fill: '#2b2118', w: 1 });
      } else if (q.kind === 'beam') {
        g.strokeStyle = q.color; g.lineWidth = 6 * a; g.globalAlpha = 0.5 * a;
        g.beginPath(); g.moveTo(q.x0, q.y0); g.lineTo(q.x, q.y); g.stroke();
        g.lineWidth = 2; g.globalAlpha = a; g.stroke();
      } else {
        g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.r * a + 0.5, 0, G.TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
})();
