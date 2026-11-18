// Apparences des donjons 10 à 15 : forge, désert, citadelle de givre, jardin du cauchemar, faille du néant, trône de cendres.
(function () {
  const S = G.S, R = G.R;
  const INK = S.ink;
  const H = R.humanoid, Wp = R.weapon;
  const t = () => G.Game.time;
  const eyes = (g, x, y, col, gap, size) => { g.fillStyle = col; g.fillRect(x - gap - size / 2, y, size, size); g.fillRect(x + gap - size / 2, y, size, size); };
  const glow = (g, x, y, r, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, G.TAU); g.fill(); g.globalAlpha = 1; };
  // petite flamme dessinée
  function flame(g, x, y, s, seed) {
    const f = 1 + 0.18 * Math.sin(t() * 15 + seed);
    g.fillStyle = '#e8762a'; g.beginPath(); g.ellipse(x, y - 5 * s * f, 4 * s, 8 * s * f, Math.sin(t() * 6 + seed) * 0.2, 0, G.TAU); g.fill();
    g.fillStyle = '#ffd36a'; g.beginPath(); g.ellipse(x, y - 3 * s * f, 2 * s, 4.5 * s * f, 0, 0, G.TAU); g.fill();
  }
  function wings(g, x, y, s, col, flap) {
    for (const sd of [-1, 1]) S.poly(g, [[x + sd * 4 * s, y], [x + sd * 16 * s, y - 10 * s - flap], [x + sd * 13 * s, y + 2 * s], [x + sd * 18 * s, y + 4 * s - flap * 0.5], [x + sd * 6 * s, y + 6 * s]], { fill: col, w: 1.1 * s });
  }

  Object.assign(R.MON, {
    // ================= Forge des Titans =================
    emberImp(g, u) {
      const s = u.r / 10, x = u.x, y = u.y - 22 * s + Math.sin(t() * 7 + u.id) * 3, flap = Math.sin(t() * 18 + u.id) * 5;
      wings(g, x, y, s, '#5a2a1a', flap);
      S.line(g, x - u.facing * 6 * s, y + 6 * s, x - u.facing * 14 * s, y + 12 * s, 1.4, '#7a2a1a', 0.6, 1);
      flame(g, x - u.facing * 15 * s, y + 13 * s, 0.6, u.id);
      S.circle(g, x, y + 2 * s, 7 * s, { fill: '#c4461d', w: 1.3 });
      S.circle(g, x + u.facing * 1 * s, y - 6 * s, 5.5 * s, { fill: '#d0571b', w: 1.2 });
      for (const sd of [-1, 1]) S.line(g, x + sd * 3 * s, y - 10 * s, x + sd * 6 * s, y - 15 * s, 1.4, '#2b2118', 0.4, 1);
      eyes(g, x + u.facing * 2 * s, y - 7 * s, '#ffd36a', 2 * s, 2);
    },
    salamander(g, u) {
      const s = u.r / 14, f = u.facing, x = u.x, y = u.y - 6 * s, w = Math.sin(u.walk || 0) * 3;
      for (const lx of [-9, 7]) for (const sd of [-1, 1]) S.line(g, x + lx * s, y + 2 * s, x + lx * s + sd * 6 * s + w * sd, y + 8 * s, 2 * s, INK, 0.6, 1);
      g.strokeStyle = INK; g.lineWidth = 7 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - f * 10 * s, y); g.quadraticCurveTo(x - f * 22 * s, y - 2 * s + w, x - f * 28 * s, y + 4 * s); g.stroke();
      g.strokeStyle = '#d0571b'; g.lineWidth = 5 * s; g.stroke();
      flame(g, x - f * 28 * s, y + 4 * s, 0.7, u.id);
      S.circle(g, x, y, 14 * s, { ry: 6.5 * s, fill: '#d0571b', w: 1.5 });
      g.fillStyle = '#5a2a1a'; for (let k = -2; k <= 2; k++) g.fillRect(x + k * 5 * s - 1.5, y - 3 * s + (k % 2) * 2, 3, 3);
      const hx = x + f * 15 * s, hy = y - 2 * s;
      S.circle(g, hx, hy, 6 * s, { ry: 4.5 * s, fill: '#e8762a', w: 1.3 });
      eyes(g, hx + f * 2 * s, hy - 2 * s, '#ffd36a', 1.6 * s, 2);
    },
    forgeGuard(g, u) {
      const s = u.r / 14;
      const a = H(g, u, { body: '#6d5d55', skin: '#7a6a62', noEyes: true, legs: '#4a3a32', belt: '#3a2a22', s });
      S.rect(g, a.hx - 7 * s, a.hy - 7 * s, 14 * s, 13 * s, { fill: '#5a4a42', w: 1.4 });
      g.fillStyle = '#f08a2a'; g.fillRect(a.hx - 5 * s, a.hy - 1 * s, 10 * s, 2.4 * s);
      S.circle(g, a.x, a.y - 2 * s, 4 * s, { fill: '#f2a03a', w: 0.8 });
      for (const sd of [-1, 1]) S.rect(g, a.x + sd * 9 * s - 4 * s, a.y - 9 * s, 8 * s, 6 * s, { fill: '#5a4a42', w: 1.1 });
      Wp(g, a, u, 24, 'hammer', '#5a5a60');
    },
    magmaSlime(g, u) {
      const s = u.r / 16, x = u.x, y = u.y - 10 * s, wob = Math.sin(t() * 4 + u.id) * 1.5;
      S.circle(g, x, y, (16 + wob) * s, { ry: (12 - wob) * s, fill: '#3a2014', w: 1.8 });
      g.strokeStyle = '#f08a2a'; g.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) { const a = k * 1.6 + u.id; g.beginPath(); g.moveTo(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 3 * s); g.lineTo(x + Math.cos(a + 0.3) * 13 * s, y + Math.sin(a + 0.3) * 9 * s); g.stroke(); }
      glow(g, x, y - 2 * s, 7 * s, '#f2a03a', 0.5);
      eyes(g, x + u.facing * 3 * s, y - 6 * s, '#ffd36a', 4 * s, 3);
    },
    cinder(g, u) {
      const s = u.r / 9, x = u.x, y = u.y - 8 * s + Math.sin(t() * 10 + u.id) * 1.5;
      flame(g, x, y - 4 * s, 0.9 * s, u.id);
      S.circle(g, x, y, 7 * s, { fill: '#c4461d', w: 1.2 });
      glow(g, x, y, 5 * s, '#ffd36a', 0.6);
      eyes(g, x + u.facing * 1.5 * s, y - 2 * s, '#2b2118', 2 * s, 2);
    },
    titanSpawn(g, u) {
      const s = u.r / 23, x = u.x, y = u.y - 18 * s, w = Math.sin(u.walk || 0) * 3;
      S.rect(g, x - 14 * s, y + 12 * s, 10 * s, 14 * s + w, { fill: '#4a3028', w: 1.5 }); S.rect(g, x + 4 * s, y + 12 * s, 10 * s, 14 * s - w, { fill: '#4a3028', w: 1.5 });
      S.poly(g, [[x - 20 * s, y + 14 * s], [x - 22 * s, y - 8 * s], [x - 8 * s, y - 18 * s], [x + 8 * s, y - 18 * s], [x + 22 * s, y - 8 * s], [x + 20 * s, y + 14 * s]], { fill: '#5a4038', w: 2, hatch: { sp: 5, c: INK, a: 0.3, w: 0.7 } });
      g.strokeStyle = '#f08a2a'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(x - 10 * s, y - 10 * s); g.lineTo(x - 4 * s, y); g.lineTo(x - 9 * s, y + 10 * s); g.moveTo(x + 8 * s, y - 12 * s); g.lineTo(x + 3 * s, y + 2 * s); g.stroke();
      glow(g, x, y - 2 * s, 8 * s, '#f2a03a', 0.45);
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 14 : 0;
      S.circle(g, x - 26 * s, y + 2 * s + sw, 8 * s, { fill: '#4a3028', w: 1.5 }); S.circle(g, x + 26 * s, y + 2 * s - sw, 8 * s, { fill: '#4a3028', w: 1.5 });
      S.circle(g, x, y - 24 * s, 9 * s, { fill: '#5a4038', w: 1.5 });
      for (const sd of [-1, 1]) S.poly(g, [[x + sd * 6 * s, y - 30 * s], [x + sd * 14 * s, y - 40 * s], [x + sd * 9 * s, y - 27 * s]], { fill: '#2b2118', w: 1 });
      eyes(g, x + u.facing * 2 * s, y - 26 * s, '#ffd36a', 3.5 * s, 3);
    },
    brasier(g, u) {
      const s = u.r / 14;
      const a = H(g, u, { body: '#7a4a3a', skin: '#c4461d', eyes: '#ffd36a', belt: '#3a2a1a', legs: '#4a3028', s });
      S.poly(g, [[a.x - 7 * s, a.y - 4 * s], [a.x + 7 * s, a.y - 4 * s], [a.x + 9 * s, a.y + 13 * s], [a.x - 9 * s, a.y + 13 * s]], { fill: '#6b4a2c', w: 1.6 });
      // barbe de feu sous le visage, cornes, flamme sur le crâne
      for (let k = 0; k < 4; k++) flame(g, a.hx - 4.5 * s + k * 3 * s, a.hy + 12 * s, 0.45 * s * (k % 2 ? 0.8 : 1.05), u.id + k);
      for (const sd of [-1, 1]) S.poly(g, [[a.hx + sd * 5 * s, a.hy - 5 * s], [a.hx + sd * 12 * s, a.hy - 16 * s], [a.hx + sd * 8 * s, a.hy - 3 * s]], { fill: '#2b2118', w: 1.2 });
      flame(g, a.hx, a.hy - 7 * s, 0.6 * s, u.id + 9);
      eyes(g, a.hx + u.facing * 2.5 * s, a.hy - 1.5 * s, '#ffd36a', 2.4 * s, 2.6 * s);
      glow(g, a.x, a.y, 14 * s, '#f2a03a', 0.25);
      Wp(g, a, u, 30, 'hammer', '#4a4a50');
    },

    // ================= Désert des Os =================
    scarab(g, u) {
      const s = u.r / 9, x = u.x, y = u.y - 5 * s, w = Math.sin(u.walk || 0) * 2;
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) S.line(g, x + (i - 1) * 4 * s, y, x + (i - 1) * 5 * s + sd * w, y + sd * 7 * s, 1.2, INK, 0.4, 1);
      S.circle(g, x, y, 8 * s, { ry: 6 * s, fill: u.col || '#3a5a6a', w: 1.3 });
      S.line(g, x - u.facing * 7 * s, y, x + u.facing * 4 * s, y, 0.9, '#9fd0c0', 0.3, 1);
      S.circle(g, x + u.facing * 8 * s, y - 1, 3.5 * s, { fill: '#2a3a44', w: 1 });
      for (const sd of [-1, 1]) S.line(g, x + u.facing * 10 * s, y - 1 + sd * 1.5, x + u.facing * 14 * s, y - 1 + sd * 3, 1, INK, 0.3, 1);
    },
    mummy(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#d9cba0', skin: '#e4d8b0', eyes: '#6fd04a', legs: '#c9b98a', s });
      for (let k = -2; k <= 2; k++) S.line(g, a.x - 9 * s, a.y + k * 4 * s, a.x + 9 * s, a.y + k * 4 * s + 2, 0.9, 'rgba(90,70,40,0.7)', 0.6, 1);
      S.line(g, a.hx - 7 * s, a.hy - 3 * s, a.hx + 7 * s, a.hy - 1 * s, 0.9, 'rgba(90,70,40,0.7)', 0.5, 1);
      S.line(g, a.hx - 7 * s, a.hy + 3 * s, a.hx + 7 * s, a.hy + 4 * s, 0.9, 'rgba(90,70,40,0.7)', 0.5, 1);
      S.line(g, a.x, a.y - 2 * s, a.hand.x + Math.cos(u.aim) * 8 * s, a.hand.y + Math.sin(u.aim) * 5 * s, 3 * s, '#d9cba0', 0.6, 1);
      S.line(g, a.hand.x + Math.cos(u.aim) * 8 * s, a.hand.y + 6, a.hand.x + Math.cos(u.aim) * 14 * s, a.hand.y + 14, 1.2, '#c9b98a', 1, 1);
    },
    sandWorm(g, u) {
      const s = u.r / 18, x = u.x, y = u.y, sway = Math.sin(t() * 2 + u.id) * 4 * s;
      g.fillStyle = '#c9a46a'; S.blobPath(g, x, y + 2, 22 * s, 8 * s, 2); g.fill(); g.strokeStyle = 'rgba(90,60,25,0.7)'; g.lineWidth = 1.2; g.stroke();
      for (let k = 0; k < 4; k++) {
        const f = k / 3, sx = x + sway * f + u.facing * f * 6 * s, sy = y - 6 * s - k * 9 * s;
        S.circle(g, sx, sy, (11 - k * 1.2) * s, { ry: (8 - k) * s, fill: k % 2 ? '#b08a52' : '#c49a5e', w: 1.4 });
      }
      const hx = x + sway + u.facing * 6 * s, hy = y - 38 * s;
      S.circle(g, hx, hy, 9 * s, { ry: 7 * s, fill: '#7a2a1a', w: 1.5 });
      g.fillStyle = '#efe7d0'; for (let k = 0; k < 6; k++) { const a = (k / 6) * G.TAU + t(); g.beginPath(); g.moveTo(hx + Math.cos(a) * 7 * s, hy + Math.sin(a) * 5 * s); g.lineTo(hx + Math.cos(a) * 3 * s, hy + Math.sin(a) * 2 * s); g.lineTo(hx + Math.cos(a + 0.3) * 7 * s, hy + Math.sin(a + 0.3) * 5 * s); g.fill(); }
    },
    sandWraith(g, u) {
      const s = u.r / 13, x = u.x, y = u.y - 14 * s + Math.sin(t() * 3 + u.id) * 3;
      g.globalAlpha *= 0.9;
      S.poly(g, [[x - 9 * s, y - 8 * s], [x + 9 * s, y - 8 * s], [x + 12 * s, y + 12 * s], [x + 5 * s, y + 8 * s], [x, y + 16 * s], [x - 5 * s, y + 8 * s], [x - 12 * s, y + 12 * s]], { fill: '#c9a25a', w: 1.4 });
      S.poly(g, [[x - 8 * s, y - 6 * s], [x - 7 * s, y - 18 * s], [x, y - 24 * s], [x + 7 * s, y - 18 * s], [x + 8 * s, y - 6 * s]], { fill: '#a07a42', w: 1.3 });
      g.fillStyle = '#2b2118'; g.beginPath(); g.ellipse(x, y - 13 * s, 5 * s, 5 * s, 0, 0, G.TAU); g.fill();
      eyes(g, x + u.facing * 1 * s, y - 14 * s, '#f2e04a', 2 * s, 2);
      for (let k = 0; k < 3; k++) { const ph = (t() * 0.8 + k / 3) % 1; g.fillStyle = 'rgba(201,162,90,' + (1 - ph) + ')'; g.fillRect(x - 8 * s + k * 7 * s, y + 14 * s + ph * 10, 2, 2); }
    },
    scorpion(g, u) {
      const s = u.r / 19, f = u.facing, x = u.x, y = u.y - 8 * s, w = Math.sin(u.walk || 0) * 3;
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) S.line(g, x + (i - 1) * 6 * s, y + 2 * s, x + (i - 1) * 8 * s + w * sd, y + sd * 10 * s + 4, 1.8, INK, 0.5, 1);
      S.circle(g, x, y, 14 * s, { ry: 8 * s, fill: '#7a3a1a', w: 1.6, hatch: { sp: 4, c: INK, a: 0.25, w: 0.6 } });
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 8 : 0;
      for (const sd of [-1, 1]) {
        const cx = x + f * 18 * s, cy = y + sd * 7 * s + sw * sd;
        S.line(g, x + f * 10 * s, y + sd * 3 * s, cx, cy, 2.4, '#6a3018', 0.5, 1);
        S.poly(g, [[cx, cy - 4 * s], [cx + f * 9 * s, cy - 2 * s], [cx + f * 3 * s, cy], [cx + f * 9 * s, cy + 3 * s], [cx, cy + 4 * s]], { fill: '#8a4a22', w: 1.2 });
      }
      g.strokeStyle = INK; g.lineWidth = 6 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - f * 12 * s, y); g.quadraticCurveTo(x - f * 26 * s, y - 20 * s, x - f * 8 * s, y - 30 * s); g.stroke();
      g.strokeStyle = '#7a3a1a'; g.lineWidth = 4 * s; g.stroke();
      S.poly(g, [[x - f * 8 * s, y - 30 * s], [x + f * 2 * s, y - 26 * s], [x - f * 4 * s, y - 22 * s]], { fill: '#6b8f2a', w: 1 });
      eyes(g, x + f * 8 * s, y - 5 * s, '#e04030', 2 * s, 2);
    },
    sekhar(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#d9cba0', skin: '#e4d8b0', eyes: '#6fd04a', legs: '#c9b98a', belt: '#c9a227', s });
      for (let k = -2; k <= 1; k++) S.line(g, a.x - 9 * s, a.y + k * 4 * s, a.x + 9 * s, a.y + k * 4 * s + 2, 0.9, 'rgba(90,70,40,0.7)', 0.6, 1);
      S.poly(g, [[a.hx - 10 * s, a.hy + 8 * s], [a.hx - 9 * s, a.hy - 6 * s], [a.hx, a.hy - 10 * s], [a.hx + 9 * s, a.hy - 6 * s], [a.hx + 10 * s, a.hy + 8 * s], [a.hx + 6 * s, a.hy + 2 * s], [a.hx - 6 * s, a.hy + 2 * s]], { fill: '#2c5f9e', w: 1.5 });
      for (let k = 0; k < 4; k++) S.line(g, a.hx - 9 * s + k * 1 * s, a.hy - 4 * s + k * 3 * s, a.hx - 7 * s, a.hy - 2 * s + k * 3 * s, 2, '#c9a227', 0.3, 1);
      S.circle(g, a.x, a.y - 6 * s, 9 * s, { ry: 4 * s, fill: '#c9a227', w: 1.2 });
      S.circle(g, a.hx + u.facing * 1 * s, a.hy - 1 * s, 4.5 * s, { ry: 3 * s, fill: '#e4d8b0', w: 0.8, single: true });
      eyes(g, a.hx + u.facing * 2 * s, a.hy - 2 * s, '#6fd04a', 2.2 * s, 2.5);
      Wp(g, a, u, 28, 'staff', '#c9a227');
      const ex = a.hand.x + Math.cos(u.aim) * 28 * s, ey = a.hand.y + Math.sin(u.aim) * 28 * s;
      S.circle(g, ex, ey - 4 * s, 4 * s, { stroke: '#c9a227', w: 2, single: true });
      glow(g, ex, ey - 4 * s, 10 * s, '#e8c070', 0.35);
    },

    // ================= Citadelle de Givre =================
    iceSprite(g, u) {
      const s = u.r / 10, x = u.x, y = u.y - 22 * s + Math.sin(t() * 5 + u.id) * 3, rot = t() * 1.5 + u.id;
      glow(g, x, y, 14 * s, '#bfe4f4', 0.3);
      for (let k = 0; k < 6; k++) { const a = rot + (k / 6) * G.TAU; S.line(g, x, y, x + Math.cos(a) * 11 * s, y + Math.sin(a) * 11 * s, 1.6, '#9fd0f0', 0.3, 1); S.line(g, x + Math.cos(a) * 7 * s, y + Math.sin(a) * 7 * s, x + Math.cos(a + 0.4) * 9 * s, y + Math.sin(a + 0.4) * 9 * s, 1, '#e8f4fb', 0.2, 1); }
      S.circle(g, x, y, 5 * s, { fill: '#e8f4fb', w: 1.1 });
      eyes(g, x + u.facing * 1 * s, y - 1.5 * s, '#2f5d8a', 1.6 * s, 1.8);
    },
    frostKnight(g, u) {
      const s = u.r / 14;
      const a = H(g, u, { body: '#9fb4c8', skin: '#cfe2f2', noEyes: true, belt: '#4a6f9a', legs: '#6f8aa6', s, cape: '#4a6f9a' });
      S.poly(g, [[a.hx - 8 * s, a.hy + 2 * s], [a.hx - 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy + 2 * s]], { fill: '#bfd2e2', w: 1.3 });
      g.fillStyle = '#2f5d8a'; g.fillRect(a.hx - 5 * s, a.hy - 3 * s, 10 * s, 2 * s);
      for (const sd of [-1, 1]) S.poly(g, [[a.hx + sd * 5 * s, a.hy - 8 * s], [a.hx + sd * 8 * s, a.hy - 17 * s], [a.hx + sd * 2 * s, a.hy - 9 * s]], { fill: '#e8f4fb', w: 1 });
      Wp(g, a, u, 24, 'sword', '#bfe4f4');
    },
    iceArcher(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#e8f0f4', skin: '#e8c9a0', cape: '#6fb1d9', s });
      S.poly(g, [[a.hx - 8 * s, a.hy + 2 * s], [a.hx - 7 * s, a.hy - 7 * s], [a.hx - u.facing * 3 * s, a.hy - 13 * s], [a.hx + 7 * s, a.hy - 7 * s], [a.hx + 8 * s, a.hy + 2 * s]], { fill: '#6fb1d9', w: 1.2, fillA: 0.85 });
      Wp(g, a, u, 20, 'bow');
    },
    frostMage(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#4a6f9a', robe: true, skin: '#dfe8ee', eyes: '#2f5d8a', s });
      for (let k = 0; k < 5; k++) S.poly(g, [[a.hx - 7 * s + k * 3.5 * s, a.hy - 6 * s], [a.hx - 5.5 * s + k * 3.5 * s, a.hy - (12 + (k % 2) * 4) * s], [a.hx - 4 * s + k * 3.5 * s, a.hy - 6 * s]], { fill: '#bfe4f4', w: 0.8, single: true });
      Wp(g, a, u, 24, 'staff', '#9fd0f0');
      const ex = a.hand.x + Math.cos(u.aim) * 24 * s, ey = a.hand.y + Math.sin(u.aim) * 24 * s;
      glow(g, ex, ey, 7 * s, '#bfe4f4', 0.5);
    },
    iceGiant(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#9fb4c8', skin: '#cfe2f2', eyes: '#2f5d8a', legs: '#6f8aa6', belt: '#4a5a6a', s });
      for (let k = 0; k < 4; k++) S.poly(g, [[a.hx - 5 * s + k * 3.4 * s, a.hy + 3 * s], [a.hx - 4 * s + k * 3.4 * s, a.hy + (10 + (k % 2) * 3) * s], [a.hx - 2.5 * s + k * 3.4 * s, a.hy + 3 * s]], { fill: '#e8f4fb', w: 0.8, single: true });
      S.circle(g, a.hx, a.hy - 6 * s, 7 * s, { ry: 3 * s, fill: '#f7fbff', w: 0.8, single: true });
      Wp(g, a, u, 22, 'mace', '#bfe4f4');
    },
    hivernia(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#e8f4fb', robe: true, skin: '#cfe2f2', eyes: '#2f5d8a', cape: '#6fb1d9', s });
      S.poly(g, [[a.x - 11 * s, a.y + 14 * s], [a.x + 11 * s, a.y + 14 * s], [a.x + 15 * s, a.y + 18 * s], [a.x - 15 * s, a.y + 18 * s]], { fill: '#bfe4f4', w: 1.2 });
      for (let k = 0; k < 5; k++) S.poly(g, [[a.hx - 8 * s + k * 4 * s, a.hy - 6 * s], [a.hx - 6 * s + k * 4 * s, a.hy - (14 + (k === 2 ? 8 : (k % 2) * 4)) * s], [a.hx - 4 * s + k * 4 * s, a.hy - 6 * s]], { fill: '#bfe4f4', w: 1, single: true });
      S.line(g, a.hx - 8 * s, a.hy - 2 * s, a.hx - 9 * s, a.hy + 14 * s, 2.4 * s, '#f7fbff', 0.6, 1); S.line(g, a.hx + 8 * s, a.hy - 2 * s, a.hx + 9 * s, a.hy + 14 * s, 2.4 * s, '#f7fbff', 0.6, 1);
      Wp(g, a, u, 30, 'staff', '#9fd0f0');
      const ex = a.hand.x + Math.cos(u.aim) * 30 * s, ey = a.hand.y + Math.sin(u.aim) * 30 * s;
      S.poly(g, [[ex, ey - 8 * s], [ex + 4 * s, ey], [ex, ey + 6 * s], [ex - 4 * s, ey]], { fill: '#e8f4fb', w: 1 });
      for (let k = 0; k < 6; k++) { const ang = t() * 0.8 + k, rr = (26 + (k % 3) * 6) * s; g.fillStyle = '#ffffff'; g.fillRect(a.x + Math.cos(ang) * rr, a.y - 10 * s + Math.sin(ang) * rr * 0.5, 2.2, 2.2); }
    },

    // ================= Jardin du Cauchemar =================
    puppet(g, u) {
      const s = u.r / 12;
      const a = H(g, u, { body: '#c9a46a', skin: '#e4c89a', eyes: '#2b2118', legs: '#8a6a3a', belt: '#a8321f', s });
      g.fillStyle = '#a8321f'; g.fillRect(a.hx - 3 * s, a.hy + 3 * s, 6 * s, 1.5 * s);
      for (const ox of [-6, 0, 6]) S.line(g, a.x + ox * s, a.y - (ox ? 0 : 22) * s, a.x + ox * s + Math.sin(t() * 3 + ox) * 3, a.y - 60 * s, 0.6, 'rgba(43,33,24,0.55)', 0.2, 1);
      S.line(g, a.x - 12 * s, a.y - 60 * s, a.x + 12 * s, a.y - 60 * s, 2, '#6b4a2c', 0.4, 1);
      Wp(g, a, u, 10, 'claw');
    },
    nightSheep(g, u) {
      const s = u.r / 14, f = u.facing, x = u.x, y = u.y - 10 * s, w = Math.sin(u.walk || 0) * 3;
      for (const lx of [-8, -3, 4, 9]) S.line(g, x + lx * s, y + 6 * s, x + lx * s + (lx % 2 ? w : -w), y + 14 * s, 2 * s, INK, 0.5, 1);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * G.TAU; S.circle(g, x + Math.cos(a) * 9 * s, y + Math.sin(a) * 5 * s, 7 * s, { fill: '#3b3346', w: 1.1 }); }
      S.circle(g, x, y, 10 * s, { ry: 7 * s, fill: '#4a3f58', w: 0.8, single: true });
      const hx = x + f * 14 * s, hy = y - 2 * s;
      S.circle(g, hx, hy, 6 * s, { ry: 5 * s, fill: '#1d1610', w: 1.2 });
      for (const sd of [-1, 1]) { g.strokeStyle = '#c9b98a'; g.lineWidth = 2; g.beginPath(); g.arc(hx - f * 2 * s, hy - 3 * s + sd * 1, 4 * s, f > 0 ? Math.PI : 0, f > 0 ? Math.PI * 1.9 : Math.PI * 0.9); g.stroke(); }
      eyes(g, hx + f * 2 * s, hy - 1 * s, '#e04030', 1.8 * s, 2.2);
    },
    dreamEye(g, u) {
      const s = u.r / 12, x = u.x, y = u.y - 22 * s + Math.sin(t() * 2.5 + u.id) * 3;
      for (let k = 0; k < 3; k++) { g.strokeStyle = '#b04ab0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4 * s + k * 4 * s, y + 8 * s); g.quadraticCurveTo(x - 8 * s + k * 5 * s + Math.sin(t() * 4 + k) * 4, y + 16 * s, x - 4 * s + k * 4 * s, y + 24 * s); g.stroke(); }
      S.circle(g, x, y, 12 * s, { ry: 9 * s, fill: '#f7eed7', w: 1.6 });
      const blink = (t() + u.id) % 4 < 0.15;
      if (blink) { S.line(g, x - 11 * s, y, x + 11 * s, y, 2, INK, 0.4, 1); }
      else {
        S.circle(g, x + Math.cos(u.aim) * 4 * s, y + Math.sin(u.aim) * 2.5 * s, 5 * s, { fill: '#d07ad0', w: 1 });
        g.fillStyle = INK; g.beginPath(); g.arc(x + Math.cos(u.aim) * 5 * s, y + Math.sin(u.aim) * 3 * s, 2.4 * s, 0, G.TAU); g.fill();
      }
      for (let k = -2; k <= 2; k++) S.line(g, x + k * 4 * s, y - 8 * s, x + k * 5 * s, y - 12 * s, 1, INK, 0.3, 1);
    },
    jester(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#a8321f', skin: '#f7f2e6', eyes: '#2b2118', legs: '#2b2118', s });
      S.poly(g, [[a.x, a.y - 8 * s], [a.x + 5 * s, a.y], [a.x, a.y + 8 * s], [a.x - 5 * s, a.y]], { fill: '#2b2118', w: 0.8, single: true });
      for (const sd of [-1, 1]) {
        S.poly(g, [[a.hx, a.hy - 6 * s], [a.hx + sd * 14 * s, a.hy - 16 * s], [a.hx + sd * 4 * s, a.hy - 5 * s]], { fill: sd > 0 ? '#a8321f' : '#2b2118', w: 1.1 });
        S.circle(g, a.hx + sd * 14 * s, a.hy - 16 * s, 2.4 * s, { fill: '#e2c043', w: 0.8 });
      }
      g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.arc(a.hx + u.facing * 2 * s, a.hy + 2 * s, 3.5 * s, 0.2, Math.PI - 0.2); g.stroke();
    },
    nightmare(g, u) {
      const s = u.r / 22, f = u.facing, x = u.x, y = u.y - 16 * s, w = Math.sin(u.walk || 0) * 5;
      for (const lx of [-12, -6, 6, 12]) S.line(g, x + lx * s, y + 6 * s, x + lx * s + (lx % 12 ? w : -w), y + 18 * s, 2.6 * s, '#1d1430', 0.6, 1);
      S.circle(g, x, y, 18 * s, { ry: 10 * s, fill: '#1d1430', w: 1.6 });
      S.line(g, x + f * 12 * s, y - 4 * s, x + f * 20 * s, y - 18 * s, 7 * s, '#1d1430', 0.6, 1);
      const hx = x + f * 24 * s, hy = y - 20 * s;
      S.poly(g, [[hx - f * 6 * s, hy - 6 * s], [hx + f * 8 * s, hy - 2 * s], [hx + f * 10 * s, hy + 4 * s], [hx - f * 4 * s, hy + 5 * s]], { fill: '#2a1f3a', w: 1.3 });
      for (let k = 0; k < 5; k++) { const mx = x + f * (16 - k * 4) * s, my = y - (16 - k * 2) * s; g.fillStyle = k % 2 ? '#9b6fe0' : '#7b3fa6'; g.beginPath(); g.ellipse(mx - f * 3 * s, my - 4 * s + Math.sin(t() * 8 + k) * 2, 3 * s, 6 * s, -f * 0.6, 0, G.TAU); g.fill(); }
      S.line(g, x - f * 18 * s, y - 2 * s, x - f * 28 * s, y + 6 * s + Math.sin(t() * 6) * 3, 3 * s, '#7b3fa6', 1, 1);
      eyes(g, hx + f * 2 * s, hy - 2 * s, '#e0a0f0', 0.1, 3);
    },
    sandman(g, u) {
      const s = u.r / 13, il = u.def && u.def.illusion;
      if (il) g.globalAlpha *= 0.62 + 0.15 * Math.sin(t() * 5 + u.id);
      const a = H(g, u, { body: '#3b2f5a', robe: true, skin: '#efe7f7', noEyes: true, s, cape: '#2a1f3a' });
      S.rect(g, a.hx - 8 * s, a.hy - 22 * s, 16 * s, 14 * s, { fill: '#1d1430', w: 1.4 });
      S.rect(g, a.hx - 12 * s, a.hy - 9 * s, 24 * s, 3 * s, { fill: '#1d1430', w: 1.2 });
      g.fillStyle = '#c9a0f0'; g.fillRect(a.hx - 8 * s, a.hy - 12 * s, 16 * s, 2 * s);
      eyes(g, a.hx + u.facing * 2 * s, a.hy - 2 * s, '#f2e04a', 2.4 * s, 2.5);
      g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.arc(a.hx + u.facing * 2 * s, a.hy + 2 * s, 3 * s, 0.3, Math.PI - 0.3); g.stroke();
      for (let k = -1; k <= 1; k++) S.line(g, a.hx + u.facing * 2 * s + k * 2 * s, a.hy + 4 * s, a.hx + u.facing * 2 * s + k * 2 * s, a.hy + 6 * s, 0.8, INK, 0.2, 1);
      S.circle(g, a.x - u.facing * 12 * s, a.y - 6 * s, 8 * s, { ry: 9 * s, fill: '#8a6a3a', w: 1.3 });
      S.line(g, a.x - u.facing * 12 * s - 3 * s, a.y - 14 * s, a.x - u.facing * 12 * s + 3 * s, a.y - 14 * s, 1.6, '#e2c043', 0.3, 1);
      for (let k = 0; k < 6; k++) { const ph = (t() * 0.7 + k / 6) % 1; g.fillStyle = 'rgba(226,192,67,' + (1 - ph).toFixed(2) + ')'; g.fillRect(a.hand.x + Math.sin(k * 2 + t()) * 4, a.hand.y + ph * 26, 2, 2); }
    },

    // ================= Faille du Néant =================
    voidling(g, u) {
      const s = u.r / 11, x = u.x, y = u.y - 9 * s;
      for (let k = 0; k < 5; k++) { const a = Math.PI * 0.15 + (k / 4) * Math.PI * 0.7, wob = Math.sin(t() * 6 + k + u.id) * 3; g.strokeStyle = '#2a1f3a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 10 * s + wob, y + Math.sin(a) * 8 * s, x + Math.cos(a) * 14 * s, y + Math.sin(a) * 12 * s + 2); g.stroke(); }
      S.circle(g, x, y, 9 * s, { ry: 8 * s, fill: '#2a1f3a', w: 1.4 });
      S.circle(g, x + u.facing * 1.5 * s, y - 2 * s, 3.6 * s, { fill: '#c9a0f0', w: 0.8 });
      g.fillStyle = INK; g.beginPath(); g.arc(x + u.facing * 2 * s, y - 2 * s, 1.6 * s, 0, G.TAU); g.fill();
    },
    voidMaw(g, u) {
      const s = u.r / 18, x = u.x, y = u.y - 24 * s + Math.sin(t() * 2 + u.id) * 3, open = 0.4 + 0.35 * Math.max(0, Math.sin(t() * 3 + u.id)) + (u.swingT > 0 ? 0.4 : 0);
      g.strokeStyle = '#7b3fa6'; g.lineWidth = 1.2;
      for (let k = 0; k < 2; k++) { g.globalAlpha = 0.5; g.beginPath(); g.arc(x, y, (20 + k * 6) * s, t() * 2 + k, t() * 2 + k + 4); g.stroke(); }
      g.globalAlpha = 1;
      S.circle(g, x, y, 17 * s, { fill: '#1d1430', w: 1.8 });
      g.fillStyle = '#07040f'; g.beginPath(); g.ellipse(x + u.facing * 3 * s, y + 2 * s, 11 * s, 8 * s * open, 0, 0, G.TAU); g.fill();
      g.fillStyle = '#efe7f7';
      for (let k = 0; k < 7; k++) {
        const ax = x + u.facing * 3 * s - 10 * s + k * 3.3 * s;
        g.beginPath(); g.moveTo(ax, y + 2 * s - 8 * s * open); g.lineTo(ax + 1.6 * s, y + 2 * s - 8 * s * open + 4 * s); g.lineTo(ax + 3.2 * s, y + 2 * s - 8 * s * open); g.fill();
        g.beginPath(); g.moveTo(ax, y + 2 * s + 8 * s * open); g.lineTo(ax + 1.6 * s, y + 2 * s + 8 * s * open - 4 * s); g.lineTo(ax + 3.2 * s, y + 2 * s + 8 * s * open); g.fill();
      }
      eyes(g, x + u.facing * 2 * s, y - 11 * s, '#c9a0f0', 5 * s, 3);
    },
    riftMage(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#4a2f6a', robe: true, skin: '#07040f', noEyes: true, s });
      S.poly(g, [[a.hx - 9 * s, a.hy + 5 * s], [a.hx - 8 * s, a.hy - 6 * s], [a.hx, a.hy - 13 * s], [a.hx + 8 * s, a.hy - 6 * s], [a.hx + 9 * s, a.hy + 5 * s]], { fill: '#3a2050', w: 1.3 });
      g.fillStyle = '#07040f'; g.beginPath(); g.ellipse(a.hx, a.hy, 5.5 * s, 6 * s, 0, 0, G.TAU); g.fill();
      g.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) g.fillRect(a.hx - 3 * s + ((k * 37) % 6) * s, a.hy - 3 * s + ((k * 23) % 6) * s, 1.4, 1.4);
      g.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 5; k++) g.fillRect(a.x - 6 * s + ((k * 41) % 12) * s, a.y - 4 * s + ((k * 29) % 16) * s, 1.4, 1.4);
      Wp(g, a, u, 24, 'staff', '#9b6fe0');
    },
    shade(g, u) {
      const s = u.r / 12;
      const a = H(g, u, { body: '#1d1610', skin: '#1d1610', noEyes: true, legs: '#1d1610', s });
      for (let k = 0; k < 4; k++) { const ph = (t() * 1.2 + k / 4) % 1; g.globalAlpha *= 1; g.fillStyle = 'rgba(29,22,16,' + (0.5 * (1 - ph)).toFixed(2) + ')'; g.beginPath(); g.arc(a.x - u.facing * (6 + ph * 14) * s, a.y - 4 * s + k * 3 * s, (4 - ph * 2) * s, 0, G.TAU); g.fill(); }
      eyes(g, a.hx + u.facing * 2 * s, a.hy - 1 * s, '#f7f2e6', 2 * s, 2.2);
      Wp(g, a, u, 12, 'dagger');
    },
    voidTitan(g, u) {
      const s = u.r / 24, x = u.x, y = u.y - 18 * s, w = Math.sin(u.walk || 0) * 3;
      for (let k = 0; k < 4; k++) { const a = t() * 0.9 + (k * G.TAU) / 4; S.poly(g, [[x + Math.cos(a) * 34 * s - 4, y - 10 * s + Math.sin(a) * 14 * s], [x + Math.cos(a) * 34 * s + 3, y - 14 * s + Math.sin(a) * 14 * s], [x + Math.cos(a) * 34 * s + 5, y - 6 * s + Math.sin(a) * 14 * s]], { fill: '#3a2f50', w: 1 }); }
      S.rect(g, x - 14 * s, y + 12 * s, 10 * s, 14 * s + w, { fill: '#2a1f3a', w: 1.5 }); S.rect(g, x + 4 * s, y + 12 * s, 10 * s, 14 * s - w, { fill: '#2a1f3a', w: 1.5 });
      S.poly(g, [[x - 20 * s, y + 14 * s], [x - 22 * s, y - 8 * s], [x - 8 * s, y - 18 * s], [x + 8 * s, y - 18 * s], [x + 22 * s, y - 8 * s], [x + 20 * s, y + 14 * s]], { fill: '#2a1f3a', w: 2 });
      g.strokeStyle = '#9b6fe0'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(x - 12 * s, y - 12 * s); g.lineTo(x - 4 * s, y - 2 * s); g.lineTo(x - 10 * s, y + 10 * s); g.moveTo(x + 10 * s, y - 10 * s); g.lineTo(x + 2 * s, y + 4 * s); g.lineTo(x + 8 * s, y + 12 * s); g.stroke();
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 14 : 0;
      S.circle(g, x - 27 * s, y + 2 * s + sw, 8 * s, { fill: '#2a1f3a', w: 1.5 }); S.circle(g, x + 27 * s, y + 2 * s - sw, 8 * s, { fill: '#2a1f3a', w: 1.5 });
      S.circle(g, x, y - 24 * s, 9 * s, { fill: '#2a1f3a', w: 1.5 });
      eyes(g, x + u.facing * 2 * s, y - 26 * s, '#c9a0f0', 3.5 * s, 3);
    },
    eclipse(g, u) {
      const s = u.r / 36, x = u.x, y = u.y - 40 * s + Math.sin(t() * 1.5) * 4, tt = t();
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * 0.1 + (k / 6) * Math.PI * 0.8, wob = Math.sin(tt * 3 + k) * 8 * s;
        g.strokeStyle = '#140c1e'; g.lineWidth = 7 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x + Math.cos(a) * 20 * s, y + Math.sin(a) * 20 * s); g.quadraticCurveTo(x + Math.cos(a) * 40 * s + wob, y + Math.sin(a) * 34 * s, x + Math.cos(a) * 46 * s - wob, y + 44 * s); g.stroke();
      }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * G.TAU + tt * 0.4, l = (38 + 8 * Math.sin(tt * 4 + k * 1.7)) * s;
        g.strokeStyle = k % 2 ? '#e8c070' : '#f2a03a'; g.lineWidth = 2.4 * s;
        g.beginPath(); g.moveTo(x + Math.cos(a) * 30 * s, y + Math.sin(a) * 30 * s); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      glow(g, x, y, 40 * s, '#e8c070', 0.25);
      S.circle(g, x, y, 30 * s, { fill: '#07040f', w: 2.4 });
      g.strokeStyle = '#e8c070'; g.lineWidth = 2 * s; g.beginPath(); g.arc(x, y, 31 * s, 0, G.TAU); g.stroke();
      const ex = x + Math.cos(u.aim) * 6 * s, ey = y + Math.sin(u.aim) * 4 * s;
      S.circle(g, ex, ey, 9 * s, { ry: 6 * s, fill: '#e8c070', w: 1.2 });
      g.fillStyle = '#07040f'; g.beginPath(); g.ellipse(ex + Math.cos(u.aim) * 2 * s, ey, 2 * s, 5 * s, 0, 0, G.TAU); g.fill();
    },

    // ================= Trône de Cendres =================
    ashSoldier(g, u) {
      const s = u.r / 14;
      const a = H(g, u, { body: '#5a524a', skin: '#8a847a', noEyes: true, belt: '#3a2a1a', legs: '#3a3430', s, cape: '#3a1a14' });
      S.poly(g, [[a.hx - 8 * s, a.hy + 2 * s], [a.hx - 8 * s, a.hy - 8 * s], [a.hx, a.hy - 12 * s], [a.hx + 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy + 2 * s]], { fill: '#4a4440', w: 1.3 });
      g.fillStyle = '#f08a2a'; g.fillRect(a.hx - 4 * s + u.facing * 2 * s, a.hy - 2 * s, 8 * s, 1.8 * s);
      Wp(g, a, u, 26, 'sword', '#8a847a');
    },
    ashHound(g, u) {
      R.MON.wolf(g, u);
      const s = u.r / 13, f = u.facing, x = u.x, y = u.y - 6 * s;
      g.strokeStyle = '#f08a2a'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x - 8 * s, y - 2 * s); g.lineTo(x - 2 * s, y + 2 * s); g.lineTo(x + 4 * s, y - 3 * s); g.moveTo(x + 2 * s, y + 3 * s); g.lineTo(x + 8 * s, y + 1 * s); g.stroke();
      glow(g, x + f * 14 * s, y - 5 * s, 6 * s, '#f2a03a', 0.3);
      flame(g, x - f * 22 * s, y - 8 * s, 0.6, u.id);
    },
    pyromancer(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#5a2a1a', robe: true, skin: '#2a1a14', eyes: '#f08a2a', s });
      S.poly(g, [[a.hx - 9 * s, a.hy + 5 * s], [a.hx - 8 * s, a.hy - 6 * s], [a.hx, a.hy - 14 * s], [a.hx + 8 * s, a.hy - 6 * s], [a.hx + 9 * s, a.hy + 5 * s]], { fill: '#3a1a10', w: 1.3 });
      flame(g, a.hand.x, a.hand.y, 1.1 * s, u.id);
      flame(g, a.x - u.facing * 10 * s, a.y + 2 * s, 0.8 * s, u.id + 3);
    },
    ashPriest(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#4a4440', robe: true, skin: '#c9c1af', noEyes: true, belt: '#9b2c20', s });
      S.circle(g, a.hx, a.hy, 6.5 * s, { fill: '#d6d0c6', w: 1.2 });
      eyes(g, a.hx + u.facing * 2 * s, a.hy - 1 * s, '#2b2118', 2 * s, 2);
      S.poly(g, [[a.hx - 7 * s, a.hy - 4 * s], [a.hx, a.hy - 16 * s], [a.hx + 7 * s, a.hy - 4 * s]], { fill: '#9b2c20', w: 1.2 });
      const cx = a.hand.x, cy = a.hand.y + 8 * s;
      S.line(g, a.hand.x, a.hand.y, cx, cy, 1, '#4a4a50', 0.3, 1);
      S.circle(g, cx, cy + 3 * s, 4 * s, { fill: '#5a5a60', w: 1 });
      for (let k = 0; k < 3; k++) { const ph = (t() * 0.6 + k / 3) % 1; g.fillStyle = 'rgba(150,140,130,' + (0.5 * (1 - ph)).toFixed(2) + ')'; g.beginPath(); g.arc(cx + Math.sin(ph * 6) * 3, cy - ph * 22, 2 + ph * 4, 0, G.TAU); g.fill(); }
    },
    ashKnight(g, u) {
      const s = u.r / 14;
      const a = H(g, u, { body: '#2a2622', skin: '#3a3430', noEyes: true, belt: '#9b2c20', legs: '#1d1915', s, cape: '#5a1a14' });
      S.poly(g, [[a.hx - 8 * s, a.hy + 3 * s], [a.hx - 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy + 3 * s]], { fill: '#3a3430', w: 1.4 });
      for (const sd of [-1, 1]) S.poly(g, [[a.hx + sd * 6 * s, a.hy - 8 * s], [a.hx + sd * 13 * s, a.hy - 18 * s], [a.hx + sd * 4 * s, a.hy - 9 * s]], { fill: '#1d1915', w: 1.1 });
      g.fillStyle = '#f08a2a'; g.fillRect(a.hx - 5 * s, a.hy - 3 * s, 10 * s, 2 * s);
      Wp(g, a, u, 28, 'sword', '#3a3430');
      const ex = a.hand.x + Math.cos(u.aim) * 18 * s, ey = a.hand.y + Math.sin(u.aim) * 18 * s;
      flame(g, ex, ey, 0.8 * s, u.id);
    },
    malgrith(g, u) {
      const s = u.r / 13, tt = t();
      // les fragments du Sceau brisé tournent autour de lui
      for (let k = 0; k < 5; k++) {
        const a = tt * 0.7 + (k * G.TAU) / 5, rx = u.x + Math.cos(a) * 34 * s, ry = u.y - 14 * s + Math.sin(a) * 12 * s;
        S.poly(g, [[rx, ry - 6], [rx + 4, ry], [rx, ry + 5], [rx - 4, ry]], { fill: '#c9a227', w: 1 });
        glow(g, rx, ry, 7, '#f2c46b', 0.35);
      }
      const a = H(g, u, { body: '#2a2622', skin: '#5a524a', noEyes: true, belt: '#c9a227', legs: '#1d1915', s, cape: '#3a1a14' });
      S.poly(g, [[a.x - 11 * s, a.y - 8 * s], [a.x + 11 * s, a.y - 8 * s], [a.x + 15 * s, a.y + 16 * s], [a.x - 15 * s, a.y + 16 * s]], { fill: '#1d1915', fillA: 0.6, w: 1 });
      for (const sd of [-1, 1]) S.circle(g, a.x + sd * 10 * s, a.y - 7 * s, 5 * s, { ry: 4 * s, fill: '#3a3430', w: 1.2 });
      S.poly(g, [[a.hx - 8 * s, a.hy + 3 * s], [a.hx - 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy + 3 * s]], { fill: '#3a3430', w: 1.5 });
      g.fillStyle = '#ffb04a'; g.fillRect(a.hx - 5 * s + u.facing * 1.5 * s, a.hy - 2.5 * s, 3 * s, 2 * s); g.fillRect(a.hx + 1 * s + u.facing * 1.5 * s, a.hy - 2.5 * s, 3 * s, 2 * s);
      // couronne de flammes
      for (let k = 0; k < 5; k++) flame(g, a.hx - 6 * s + k * 3 * s, a.hy - 8 * s, (k === 2 ? 1.2 : 0.8) * s, u.id + k);
      S.line(g, a.hx - 8 * s, a.hy - 8 * s, a.hx + 8 * s, a.hy - 8 * s, 2.2 * s, '#c9a227', 0.3, 1);
      Wp(g, a, u, 34, 'sword', '#3a3430');
      const ex = a.hand.x + Math.cos(u.aim) * 22 * s, ey = a.hand.y + Math.sin(u.aim) * 22 * s;
      flame(g, ex, ey, 1.1 * s, u.id + 7);
      glow(g, a.x, a.y - 6 * s, 26 * s, '#f08a2a', 0.15);
    },
  });
})();
