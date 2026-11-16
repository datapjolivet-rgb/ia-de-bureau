// Apparences des donjons 7 à 9 : Cavernes de Cristal, Pic des Harpies, Temple Englouti.
(function () {
  const S = G.S, R = G.R;
  const INK = S.ink;
  const H = R.humanoid, Wp = R.weapon;
  const t = () => G.Game.time;
  const eyes = (g, x, y, col, gap, size) => { g.fillStyle = col; g.fillRect(x - gap - size / 2, y, size, size); g.fillRect(x + gap - size / 2, y, size, size); };
  // éclat de cristal (losange allongé)
  function shard(g, x, y, w, h, ang, col) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pts = [[0, -h], [w, 0], [0, h * 0.5], [-w, 0]].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
    S.poly(g, pts, { fill: col, fillA: 0.9, w: 1.2, over: 1 });
    S.line(g, pts[0][0], pts[0][1], pts[2][0], pts[2][1], 0.7, 'rgba(255,255,255,0.75)', 0.2, 1);
  }

  Object.assign(R.MON, {
    // ----- Cavernes de Cristal -----
    shardling(g, u) {
      const x = u.x, y = u.y - 10 + Math.sin(t() * 9 + u.id) * 2;
      shard(g, x, y, 7, 12, Math.sin(t() * 6 + u.id) * 0.3, '#8fd8f0');
      shard(g, x + u.facing * 6, y + 4, 4, 7, 0.6, '#c9a0f0');
      g.fillStyle = INK; g.fillRect(x - 3, y - 3, 2, 2); g.fillRect(x + 1, y - 3, 2, 2);
    },
    crystalSpider(g, u) {
      const s = u.r / 13, x = u.x, y = u.y - 6 * s, tt = u.walk || 0;
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
        const ky = y - 5 * s + i * 4 * s, wob = Math.sin(tt + i * 1.7 + sd) * 3;
        g.strokeStyle = '#4a5a8a'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x + sd * 6 * s, ky); g.quadraticCurveTo(x + sd * 15 * s, ky - 9 * s + wob, x + sd * 19 * s, ky + 6 * s + wob); g.stroke();
      }
      S.circle(g, x, y + 5 * s, 10 * s, { ry: 8 * s, fill: '#6f8fd0', w: 1.5 });
      shard(g, x - 4 * s, y + 1 * s, 3, 7, -0.3, '#8fd8f0'); shard(g, x + 4 * s, y + 2 * s, 3, 6, 0.3, '#c9a0f0');
      S.circle(g, x, y - 6 * s, 6 * s, { fill: '#4a5a8a', w: 1.2 });
      g.fillStyle = '#bff0ff'; for (const ex of [-3, -1, 1, 3]) g.fillRect(x + ex * s - 1, y - 8 * s, 1.8, 1.8);
    },
    geode(g, u) {
      const s = u.r / 16, x = u.x, y = u.y - 10 * s, roll = u.dash ? t() * 20 : 0;
      S.circle(g, x, y, 16 * s, { ry: 13 * s, fill: '#6d6878', w: 1.8, hatch: { sp: 5, c: INK, a: 0.3, w: 0.7 } });
      g.save(); g.translate(x, y); g.rotate(roll);
      g.fillStyle = '#2a2433'; g.beginPath(); g.ellipse(0, -2, 9 * s, 6 * s, 0, 0, G.TAU); g.fill();
      for (let k = 0; k < 5; k++) shard(g, -7 * s + k * 3.5 * s, -2, 2.4, 5, (k - 2) * 0.35, k % 2 ? '#b48ae0' : '#8fd8f0');
      g.restore();
      eyes(g, x + u.facing * 4 * s, y - 9 * s, '#e8d24a', 3 * s, 2.5);
    },
    luminant(g, u) {
      const s = u.r / 13, x = u.x, y = u.y - 18 * s + Math.sin(t() * 3 + u.id) * 3, pulse = 0.5 + 0.5 * Math.sin(t() * 5 + u.id);
      g.globalAlpha = 0.25 + 0.2 * pulse; g.fillStyle = '#b48ae0'; g.beginPath(); g.arc(x, y, 20 * s, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      S.poly(g, [[x - 9 * s, y + 4 * s], [x, y - 14 * s], [x + 9 * s, y + 4 * s], [x, y + 16 * s]], { fill: '#d6c0f4', fillA: 0.9, w: 1.4 });
      S.circle(g, x, y, 4 * s, { fill: '#ffffff', w: 0.8 });
      for (let k = 0; k < 3; k++) { const a = t() * 2 + (k * G.TAU) / 3; shard(g, x + Math.cos(a) * 16 * s, y + Math.sin(a) * 9 * s, 2.5, 5, a, '#9b6fe0'); }
    },
    crystalGolem(g, u) {
      const s = u.r / 22, x = u.x, y = u.y - 18 * s, w = Math.sin(u.walk || 0) * 3;
      S.rect(g, x - 13 * s, y + 12 * s, 9 * s, 14 * s + w, { fill: '#5a5470', w: 1.5 }); S.rect(g, x + 4 * s, y + 12 * s, 9 * s, 14 * s - w, { fill: '#5a5470', w: 1.5 });
      S.poly(g, [[x - 18 * s, y + 14 * s], [x - 20 * s, y - 8 * s], [x - 6 * s, y - 16 * s], [x + 8 * s, y - 16 * s], [x + 20 * s, y - 8 * s], [x + 18 * s, y + 14 * s]], { fill: '#6d6878', w: 2, hatch: { sp: 5, c: INK, a: 0.3, w: 0.7 } });
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 12 : 0;
      shard(g, x - 26 * s, y + 2 * s + sw, 6 * s, 14 * s, 0.3, '#8fd8f0'); shard(g, x + 26 * s, y + 2 * s - sw, 6 * s, 14 * s, -0.3, '#8fd8f0');
      for (let k = 0; k < 4; k++) shard(g, x - 12 * s + k * 8 * s, y - 18 * s, 3.5 * s, 10 * s, (k - 1.5) * 0.3, k % 2 ? '#c9a0f0' : '#8fd8f0');
      g.fillStyle = '#bff0ff'; g.fillRect(x - 6 * s, y - 6 * s, 4, 3); g.fillRect(x + 3 * s, y - 6 * s, 4, 3);
    },
    prism(g, u) {
      const x = u.x, y = u.y - 20, pulse = 0.5 + 0.5 * Math.sin(t() * 4 + u.id);
      g.globalAlpha = 0.2 + 0.25 * pulse; g.fillStyle = '#8fd8f0'; g.beginPath(); g.arc(x, y, 24, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      S.poly(g, [[x - 10, y + 18], [x - 12, y - 6], [x, y - 24], [x + 12, y - 6], [x + 10, y + 18]], { fill: '#bfe8f8', fillA: 0.9, w: 1.6 });
      S.line(g, x, y - 22, x, y + 16, 0.8, 'rgba(255,255,255,0.9)', 0.2, 1);
      if (u.cast) { g.globalAlpha = 0.8; S.circle(g, x, y, 8 + Math.sin(t() * 30) * 2, { stroke: '#5fc0e0', w: 2, single: true }); g.globalAlpha = 1; }
    },
    prismatrix(g, u) {
      const s = u.r / 13, x = u.x, y = u.y - 22 * s + Math.sin(t() * 1.5) * 3, tt = t();
      g.globalAlpha = 0.25; g.fillStyle = '#b48ae0'; g.beginPath(); g.arc(x, y, 34 * s, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      for (let k = 0; k < 6; k++) { const a = tt * 0.8 + (k * G.TAU) / 6; shard(g, x + Math.cos(a) * 30 * s, y + Math.sin(a) * 16 * s, 3 * s, 8 * s, a + 1.57, k % 2 ? '#c9a0f0' : '#8fd8f0'); }
      S.poly(g, [[x - 14 * s, y + 4 * s], [x - 9 * s, y - 14 * s], [x, y - 22 * s], [x + 9 * s, y - 14 * s], [x + 14 * s, y + 4 * s], [x + 6 * s, y + 20 * s], [x - 6 * s, y + 20 * s]], { fill: '#8a6fd0', fillA: 0.92, w: 2 });
      S.poly(g, [[x - 8 * s, y - 2 * s], [x, y - 14 * s], [x + 8 * s, y - 2 * s], [x, y + 12 * s]], { fill: '#c9b4f4', fillA: 0.9, w: 1.3 });
      const core = 0.6 + 0.4 * Math.sin(tt * 6);
      g.globalAlpha = core; S.circle(g, x, y - 1 * s, 4 * s, { fill: '#ffffff', w: 0.8 }); g.globalAlpha = 1;
      shard(g, x - 20 * s, y + 8 * s, 4 * s, 11 * s, 0.5, '#8fd8f0'); shard(g, x + 20 * s, y + 8 * s, 4 * s, 11 * s, -0.5, '#8fd8f0');
    },
    // ----- Pic des Harpies -----
    harpy(g, u) {
      const s = u.r / 12, x = u.x, y = u.y - 16 * s - Math.sin(t() * 4 + u.id) * 3, flap = Math.sin(t() * 12 + u.id) * 7 * s;
      S.poly(g, [[x - 5 * s, y - 2 * s], [x - 24 * s, y - 12 * s - flap], [x - 18 * s, y + 2 * s], [x - 6 * s, y + 6 * s]], { fill: '#8a5a3a', w: 1.3 });
      S.poly(g, [[x + 5 * s, y - 2 * s], [x + 24 * s, y - 12 * s - flap], [x + 18 * s, y + 2 * s], [x + 6 * s, y + 6 * s]], { fill: '#8a5a3a', w: 1.3 });
      S.circle(g, x, y + 3 * s, 8 * s, { ry: 10 * s, fill: '#a0703a', w: 1.4 });
      S.line(g, x - 3 * s, y + 12 * s, x - 5 * s, y + 18 * s, 1.4, '#c9a227'); S.line(g, x + 3 * s, y + 12 * s, x + 5 * s, y + 18 * s, 1.4, '#c9a227');
      S.circle(g, x + u.facing * 1 * s, y - 9 * s, 6 * s, { fill: '#d9b28a', w: 1.2 });
      S.line(g, x - 5 * s, y - 13 * s, x + 4 * s, y - 15 * s, 2.4, '#3a2a1a', 0.6, 1);
      eyes(g, x + u.facing * 2 * s, y - 10 * s, '#c0281b', 2 * s, 2);
    },
    yeti(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#eef1f4', skin: '#9fb4c8', eyes: '#2c4f7a', legs: '#c9d6e2', s });
      for (let i = 0; i < 4; i++) S.line(g, a.x - 7 * s + i * 4 * s, a.y - 6 * s, a.x - 8 * s + i * 4 * s, a.y + 2 * s, 0.8, 'rgba(120,140,160,0.8)', 0.4, 1);
      S.line(g, a.hx - 4 * s, a.hy + 4 * s, a.hx - 5 * s, a.hy + 8 * s, 1.6, '#ffffff'); S.line(g, a.hx + 4 * s, a.hy + 4 * s, a.hx + 5 * s, a.hy + 8 * s, 1.6, '#ffffff');
      Wp(g, a, u, 10, 'claw');
      if (u.cast && u.cast.atk.t === 'shoot') S.circle(g, a.hand.x, a.hand.y - 4, 6, { fill: '#ffffff', w: 1 });
    },
    iceShaman(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#4f6f8a', robe: true, skin: '#c9d6e2', eyes: '#9fd0f0', belt: '#c9a227', s });
      S.poly(g, [[a.hx - 10, a.hy + 2], [a.hx - 9, a.hy - 8], [a.hx, a.hy - 13], [a.hx + 9, a.hy - 8], [a.hx + 10, a.hy + 2]], { fill: '#eef1f4', w: 1.2 });
      for (let k = -1; k <= 1; k++) S.line(g, a.hx + k * 5, a.hy - 10, a.hx + k * 7, a.hy - 20, 1.6, '#6fb1d9');
      Wp(g, a, u, 24, 'staff', '#9fd0f0');
    },
    sycorax(g, u) {
      const s = u.r / 13, x = u.x, y = u.y - 18 * s - Math.sin(t() * 2.5) * 4, flap = Math.sin(t() * 7) * 10 * s;
      for (const sd of [-1, 1]) {
        S.poly(g, [[x + sd * 6 * s, y - 6 * s], [x + sd * 34 * s, y - 24 * s - flap], [x + sd * 40 * s, y - 6 * s - flap * 0.5], [x + sd * 30 * s, y + 8 * s], [x + sd * 8 * s, y + 8 * s]], { fill: '#6b4a2c', w: 1.8, hatch: { sp: 5, ang: sd, c: INK, a: 0.3, w: 0.6 } });
        for (let k = 0; k < 4; k++) S.line(g, x + sd * (14 + k * 6) * s, y - 4 * s, x + sd * (18 + k * 6) * s, y + 10 * s, 1, '#3a2a1a', 0.5, 1);
      }
      S.circle(g, x, y + 4 * s, 10 * s, { ry: 13 * s, fill: '#a0703a', w: 1.8 });
      S.line(g, x - 4 * s, y + 16 * s, x - 7 * s, y + 24 * s, 2, '#c9a227'); S.line(g, x + 4 * s, y + 16 * s, x + 7 * s, y + 24 * s, 2, '#c9a227');
      S.circle(g, x, y - 12 * s, 7.5 * s, { fill: '#e0b892', w: 1.5 });
      S.poly(g, [[x - 7 * s, y - 17 * s], [x - 5 * s, y - 25 * s], [x - 2 * s, y - 19 * s], [x, y - 27 * s], [x + 2 * s, y - 19 * s], [x + 5 * s, y - 25 * s], [x + 7 * s, y - 17 * s]], { fill: '#c9a227', w: 1.2 });
      for (let k = 0; k < 5; k++) S.line(g, x - 7 * s + k * 3.5 * s, y - 8 * s, x - 9 * s + k * 4 * s, y + 4 * s, 1.6, '#3a2a1a', 0.8, 1);
      eyes(g, x + u.facing * 2 * s, y - 13 * s, '#c0281b', 2.4 * s, 2.5);
    },
    // ----- Temple Englouti -----
    merfolk(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#4f8a86', skin: '#7fb0a8', eyes: '#e8d24a', legs: '#2f5d6a', belt: '#c9a227', s });
      S.poly(g, [[a.hx - 7 * s, a.hy - 4 * s], [a.hx, a.hy - 14 * s], [a.hx + 7 * s, a.hy - 4 * s]], { fill: '#5f9fa6', w: 1.1 });
      const ang = u.aim + (u.swingT > 0 ? (u.swingT - 0.5) * 0.4 : 0), hx = a.hand.x, hy = a.hand.y;
      S.line(g, hx - Math.cos(ang) * 14, hy - Math.sin(ang) * 14, hx + Math.cos(ang) * 30 * s, hy + Math.sin(ang) * 30 * s, 2, '#6b4a2c');
      const ex = hx + Math.cos(ang) * 30 * s, ey = hy + Math.sin(ang) * 30 * s, px = -Math.sin(ang), py = Math.cos(ang);
      for (const k of [-1, 0, 1]) S.line(g, ex + px * k * 4, ey + py * k * 4, ex + px * k * 4 + Math.cos(ang) * 7, ey + py * k * 4 + Math.sin(ang) * 7, 1.6, '#c9ccd1', 0.3, 1);
    },
    siren(g, u) {
      const s = u.r / 13, x = u.x, y = u.y - 10 * s + Math.sin(t() * 2 + u.id) * 2;
      g.strokeStyle = '#2f6f86'; g.lineWidth = 7 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - u.facing * 14 * s, y + 10 * s, x - u.facing * 6 * s, y + 18 * s); g.stroke();
      S.poly(g, [[x - u.facing * 6 * s, y + 18 * s], [x - u.facing * 16 * s, y + 22 * s], [x - u.facing * 2 * s, y + 25 * s]], { fill: '#5f9fa6', w: 1 });
      S.circle(g, x, y - 4 * s, 7 * s, { ry: 9 * s, fill: '#7fb0a8', w: 1.4 });
      S.circle(g, x, y - 16 * s, 6 * s, { fill: '#cfe0dc', w: 1.3 });
      for (let k = 0; k < 4; k++) S.line(g, x - 5 * s + k * 3 * s, y - 20 * s, x - 9 * s + k * 4 * s - u.facing * 4, y - 4 * s, 1.6, '#c96a9a', 1, 1);
      eyes(g, x + u.facing * 2 * s, y - 17 * s, '#2c4f7a', 2 * s, 2);
      if (u.cast) for (let k = 0; k < 2; k++) S.text(g, '♪', x + u.facing * (14 + k * 8), y - 22 - k * 8 + Math.sin(t() * 8 + k) * 3, 16, '#2f6f86');
    },
    crab(g, u) {
      const s = u.r / 17, x = u.x, y = u.y - 8 * s, w = Math.sin(u.walk || 0) * 3;
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) S.line(g, x + sd * 8 * s, y + 2 * s + i * 3, x + sd * (20 + i * 2) * s, y + 10 * s + i * 4 + (sd > 0 ? w : -w), 2, '#7a2a14');
      S.circle(g, x, y, 17 * s, { ry: 11 * s, fill: '#b5461d', w: 1.8, hatch: { sp: 5, c: INK, a: 0.3, w: 0.7 } });
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 8 : 0;
      for (const sd of [-1, 1]) {
        const cx = x + sd * 18 * s + u.facing * 6 * s, cy = y - 8 * s + (sd > 0 ? sw : -sw);
        S.circle(g, cx, cy, 7 * s, { ry: 5 * s, fill: '#c9582a', w: 1.4 });
        S.line(g, cx + u.facing * 4 * s, cy - 2, cx + u.facing * 9 * s, cy - 5 * s, 1.6, INK);
      }
      S.line(g, x - 4 * s, y - 9 * s, x - 5 * s, y - 15 * s, 1.2); S.line(g, x + 4 * s, y - 9 * s, x + 5 * s, y - 15 * s, 1.2);
      g.fillStyle = INK; g.fillRect(x - 6 * s, y - 17 * s, 2.5, 2.5); g.fillRect(x + 4 * s, y - 17 * s, 2.5, 2.5);
    },
    eel(g, u) {
      const s = u.r / 11, x = u.x, y = u.y - 8 * s, tt = t() * 6 + u.id;
      g.strokeStyle = '#3e5a4a'; g.lineWidth = 7 * s; g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i <= 10; i++) { const f = i / 10, px = x - u.facing * f * 30 * s, py = y + Math.sin(tt - f * 5) * 5 * s; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      g.strokeStyle = '#e8e070'; g.lineWidth = 1.2; g.stroke();
      S.circle(g, x + u.facing * 3 * s, y, 5.5 * s, { ry: 4.5 * s, fill: '#4f6a5a', w: 1.2 });
      g.fillStyle = '#e8e070'; g.fillRect(x + u.facing * 5 * s - 1, y - 2, 2.4, 2.4);
      if (u.dash || u.cast) for (let k = 0; k < 3; k++) S.line(g, x - 8 + k * 8, y - 12, x - 4 + k * 8, y - 18, 1.2, '#f2e04a', 1.5, 1);
    },
    deepOne(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#2f5d6a', skin: '#4f8a86', eyes: '#7fd0e0', legs: '#1d3a46', belt: '#c9a227', s, cape: '#1d3a46' });
      S.poly(g, [[a.hx - 9 * s, a.hy], [a.hx - 14 * s, a.hy - 10 * s], [a.hx - 6 * s, a.hy - 6 * s]], { fill: '#5f9fa6', w: 1.1 });
      S.poly(g, [[a.hx + 9 * s, a.hy], [a.hx + 14 * s, a.hy - 10 * s], [a.hx + 6 * s, a.hy - 6 * s]], { fill: '#5f9fa6', w: 1.1 });
      for (let k = 0; k < 4; k++) S.line(g, a.hx - 5 * s + k * 3.5 * s, a.hy + 5 * s, a.hx - 6 * s + k * 4 * s, a.hy + 12 * s + Math.sin(t() * 3 + k) * 2, 1.6, '#4f7a6a', 0.6, 1);
      Wp(g, a, u, 30, 'sword', '#9fc4be');
    },
    leviathe(g, u) {
      const s = u.r / 14, x = u.x, y = u.y - 6 * s, tt = t();
      for (let i = 0; i < 3; i++) { g.globalAlpha = 0.35; S.circle(g, x, y + 10 * s, 30 * s + i * 10 + Math.sin(tt * 2 + i) * 3, { ry: 10 * s + i * 4, stroke: '#7fd0e0', w: 1.4, single: true }); }
      g.globalAlpha = 1;
      // anneaux du corps qui sortent de l'eau
      for (let k = 0; k < 3; k++) {
        const bx = x - u.facing * (24 + k * 20) * s, by = y + 8 * s;
        g.strokeStyle = INK; g.lineWidth = 12 * s; g.lineCap = 'round';
        g.beginPath(); g.arc(bx, by, 10 * s - k * 1.5 * s, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        g.strokeStyle = '#2f6f86'; g.lineWidth = 9 * s; g.stroke();
      }
      const sway = Math.sin(tt * 1.6) * 6 * s + (u.cast ? Math.sin(tt * 18) * 3 : 0);
      g.strokeStyle = INK; g.lineWidth = 16 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y + 10 * s); g.quadraticCurveTo(x + u.facing * 6 * s, y - 14 * s, x + u.facing * 4 * s + sway, y - 34 * s); g.stroke();
      g.strokeStyle = '#2f6f86'; g.lineWidth = 12.5 * s; g.stroke();
      const hx = x + u.facing * 6 * s + sway, hy = y - 38 * s;
      S.circle(g, hx, hy, 12 * s, { ry: 9 * s, fill: '#3f8aa0', w: 1.8 });
      S.poly(g, [[hx - 6 * s, hy - 6 * s], [hx - 14 * s, hy - 20 * s], [hx - 2 * s, hy - 10 * s]], { fill: '#7fd0e0', w: 1.2 });
      S.poly(g, [[hx + 6 * s, hy - 6 * s], [hx + 14 * s, hy - 20 * s], [hx + 2 * s, hy - 10 * s]], { fill: '#7fd0e0', w: 1.2 });
      S.line(g, hx + u.facing * 2 * s, hy + 5 * s, hx + u.facing * 13 * s, hy + 4 * s, 1.6, INK, 0.4, 1);
      eyes(g, hx + u.facing * 3 * s, hy - 3 * s, '#f2e04a', 4 * s, 3);
    },
  });
})();
