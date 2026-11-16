// Apparences supplémentaires : monstres des donjons 4 à 6, boss, tutoriel, habitants et animaux de Havre-Gris.
(function () {
  const S = G.S, R = G.R;
  const INK = S.ink;
  const H = R.humanoid, Wp = R.weapon;
  const t = () => G.Game.time;
  const eyes = (g, x, y, col, gap, size) => { g.fillStyle = col; g.fillRect(x - gap - size / 2, y, size, size); g.fillRect(x + gap - size / 2, y, size, size); };

  Object.assign(R.MON, {
    // ----- Marais -----
    drowned(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#5d7a6e', skin: '#9fb3a2', eyes: '#d8f0e0', legs: '#3e5248', s });
      for (let i = -1; i <= 1; i++) S.line(g, a.hx + i * 4, a.hy - 6, a.hx + i * 5, a.hy + 8, 1.4, '#3e5622', 0.8, 1);
      for (let i = 0; i < 2; i++) S.line(g, a.x - 6 + i * 10, a.y + 2, a.x - 6 + i * 10, a.y + 9 + Math.sin(t() * 4 + i) * 2, 1, '#6fb1d9', 0.4, 1);
      Wp(g, a, u, 8, 'claw');
    },
    toad(g, u) {
      const s = u.r / 14, x = u.x, hop = Math.abs(Math.sin(u.walk || 0)) * 4, y = u.y - 8 * s - hop;
      S.line(g, x - 12 * s, y + 6 * s, x - 18 * s, y + 12 * s + hop, 2.6, '#4f5e2a'); S.line(g, x + 12 * s, y + 6 * s, x + 18 * s, y + 12 * s + hop, 2.6, '#4f5e2a');
      S.circle(g, x, y, 16 * s, { ry: 12 * s, fill: '#6b7a3a', w: 1.7 });
      g.fillStyle = 'rgba(60,70,30,0.6)'; for (const [ox, oy] of [[-7, -3], [5, -5], [2, 4], [-3, 6], [9, 2]]) g.fillRect(x + ox * s, y + oy * s, 3, 3);
      S.circle(g, x - 7 * s, y - 10 * s, 5 * s, { fill: '#c9b04a', w: 1.2 }); S.circle(g, x + 7 * s, y - 10 * s, 5 * s, { fill: '#c9b04a', w: 1.2 });
      g.fillStyle = INK; g.fillRect(x - 8 * s, y - 11 * s, 2.5, 3); g.fillRect(x + 6 * s, y - 11 * s, 2.5, 3);
      S.line(g, x - 10 * s, y + 2 * s, x + 10 * s, y + 2 * s, 1.4, INK, 1.2, 1);
      if (u.cast) S.circle(g, x + u.facing * 10 * s, y + 3 * s, 4 * s, { fill: '#a8c04a', w: 0.8 });
    },
    wisp(g, u) {
      const x = u.x, y = u.y - 16 + Math.sin(t() * 5 + u.id) * 4, pulse = 0.6 + 0.4 * Math.sin(t() * 9 + u.id);
      g.globalAlpha = 0.25 * pulse; g.fillStyle = '#9be0d0'; g.beginPath(); g.arc(x, y, 22, 0, G.TAU); g.fill();
      g.globalAlpha = 0.9;
      S.poly(g, [[x - 6, y + 2], [x - Math.cos(u.aim) * 18, y - Math.sin(u.aim) * 10 + 8], [x + 6, y + 2]], { fill: '#bdf0e4', w: 1, single: true });
      S.circle(g, x, y, 8, { fill: '#e8fff8', w: 1.2 });
      g.fillStyle = '#2f4d47'; g.fillRect(x - 3, y - 2, 2, 2); g.fillRect(x + 2, y - 2, 2, 2);
      g.globalAlpha = 1;
      if (u.cast) { g.globalAlpha = 0.5; S.circle(g, x, y, 12 + Math.sin(t() * 30) * 3, { stroke: '#e04030', w: 2, single: true }); g.globalAlpha = 1; }
    },
    troll(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#5d7a4e', skin: '#7a9a5e', eyes: '#e8d24a', legs: '#3e5622', belt: '#6b4a2c', s });
      S.line(g, a.hx - 4 * s, a.hy + 4 * s, a.hx - 5 * s, a.hy, 1.6, '#efe7d0'); S.line(g, a.hx + 4 * s, a.hy + 4 * s, a.hx + 5 * s, a.hy, 1.6, '#efe7d0');
      for (let i = 0; i < 3; i++) S.line(g, a.x - 8 * s + i * 8 * s, a.y - 6 * s, a.x - 6 * s + i * 8 * s, a.y + 4 * s, 1, 'rgba(110,150,80,0.8)', 0.6, 1);
      Wp(g, a, u, 26, 'mace', '#6b5a4a');
    },
    gloumbra(g, u) {
      const s = u.r / 14, x = u.x, y = u.y - 4 * s, tt = t();
      for (let i = 0; i < 3; i++) { g.globalAlpha = 0.35; S.circle(g, x, y + 10 * s, 26 * s + i * 8 + Math.sin(tt * 3 + i) * 3, { ry: 9 * s + i * 4, stroke: '#2f4d47', w: 1.4, single: true }); }
      g.globalAlpha = 1;
      S.circle(g, x, y + 4 * s, 22 * s, { ry: 13 * s, fill: '#4d6b5a', w: 2, hatch: { sp: 6, c: INK, a: 0.3, w: 0.8 } });
      [-1, 0, 1].forEach((k, i) => {
        const sway = Math.sin(tt * 2.2 + i * 2) * 8 * s + (u.cast ? Math.sin(tt * 14 + i) * 4 : 0);
        const hx = x + k * 18 * s + sway + Math.cos(u.aim) * 8 * s, hy = y - 30 * s - (k === 0 ? 10 * s : 0);
        g.strokeStyle = INK; g.lineWidth = 9 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x + k * 10 * s, y); g.quadraticCurveTo(x + k * 24 * s, y - 14 * s, hx, hy); g.stroke();
        g.strokeStyle = '#5d7a6e'; g.lineWidth = 6.5 * s;
        g.beginPath(); g.moveTo(x + k * 10 * s, y); g.quadraticCurveTo(x + k * 24 * s, y - 14 * s, hx, hy); g.stroke();
        S.circle(g, hx, hy, 8 * s, { ry: 6.5 * s, fill: '#6b8a6e', w: 1.5 });
        S.line(g, hx + u.facing * 2 * s, hy + 3 * s, hx + u.facing * 9 * s, hy + 3 * s, 1.4, INK, 0.5, 1);
        eyes(g, hx, hy - 3 * s, '#e8d24a', 3 * s, 2.5);
      });
    },
    // ----- Bastion -----
    fallen(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#7d7d84', skin: '#3a3a40', eyes: '#9fd0ff', belt: '#5a2a20', legs: '#5a5a60', s });
      S.poly(g, [[a.hx - 8 * s, a.hy + 2 * s], [a.hx - 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy - 8 * s], [a.hx + 8 * s, a.hy + 2 * s]], { fill: '#8a8c92', w: 1.3 });
      S.line(g, a.hx - 5 * s, a.hy - 2 * s, a.hx + 5 * s, a.hy - 2 * s, 1.6, '#9fd0ff', 0.4, 1);
      S.poly(g, [[a.x - 6 * s, a.y - 4 * s], [a.x + 6 * s, a.y - 4 * s], [a.x + 5 * s, a.y + 10 * s], [a.x - 5 * s, a.y + 10 * s]], { fill: '#6b2a20', fillA: 0.8, w: 1, single: true });
      Wp(g, a, u, 20, 'sword', '#a6a8ad');
    },
    crossbow(g, u) {
      const s = u.r / 13;
      g.globalAlpha = 0.85;
      const a = H(g, u, { body: '#8fa3b0', robe: true, skin: '#c8dce6', eyes: '#2c4f7a', s });
      S.poly(g, [[a.hx - 9, a.hy + 4], [a.hx - 8, a.hy - 6], [a.hx, a.hy - 12], [a.hx + 8, a.hy - 6], [a.hx + 9, a.hy + 4]], { fill: '#6f8794', w: 1.2 });
      const ang = u.aim, hx = a.hand.x, hy = a.hand.y;
      S.line(g, hx - Math.cos(ang) * 4, hy - Math.sin(ang) * 4, hx + Math.cos(ang) * 16, hy + Math.sin(ang) * 16, 3, '#5a4030');
      const px = -Math.sin(ang), py = Math.cos(ang), bx = hx + Math.cos(ang) * 14, by = hy + Math.sin(ang) * 14;
      S.line(g, bx + px * 10, by + py * 10, bx - px * 10, by - py * 10, 2, '#6b4a2c');
      g.globalAlpha = 1;
    },
    warhound(g, u) {
      R.MON.wolf(g, Object.assign({}, u, { col: '#5a4a3e' }));
      const s = u.r / 13, f = u.facing, x = u.x, y = u.y - 6 * s;
      S.line(g, x + f * 8 * s, y - 6 * s, x + f * 10 * s, y + 2 * s, 3, '#9b2c20');
      for (let i = 0; i < 3; i++) S.line(g, x + f * (7 + i) * s, y - 4 * s + i * 3, x + f * (12 + i) * s, y - 6 * s + i * 3, 1, '#c9ccd1', 0.3, 1);
      S.rect(g, x - 9 * s, y - 6 * s, 14 * s, 8 * s, { fill: '#7d7d84', fillA: 0.85, w: 1, single: true });
    },
    priest(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#6a5a2a', robe: true, belt: '#3a2a1a', skin: '#c9b79a', eyes: '#e04030', s });
      S.poly(g, [[a.hx - 7, a.hy - 4], [a.hx, a.hy - 20], [a.hx + 7, a.hy - 4]], { fill: '#efe7d0', w: 1.3 });
      S.line(g, a.hx, a.hy - 17, a.hx, a.hy - 8, 1.2, '#7a2734', 0.3, 1);
      g.globalAlpha = 0.25 + 0.1 * Math.sin(t() * 4); g.fillStyle = '#3b3346'; g.beginPath(); g.arc(a.x, a.y, 20, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      Wp(g, a, u, 24, 'staff', '#e2c043');
      if (u.cast && u.cast.atk.t === 'heal') { g.globalAlpha = 0.6; S.circle(g, a.x, a.y - 30, 7 + Math.sin(t() * 20) * 2, { fill: '#7fd07a', w: 1 }); g.globalAlpha = 1; }
    },
    champion(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#6d6d75', skin: '#2a2a30', eyes: '#ff8a2a', cape: '#5a2a20', belt: '#3a2a1a', legs: '#4a4a50', s });
      S.poly(g, [[a.hx - 9 * s, a.hy + 2], [a.hx - 9 * s, a.hy - 9 * s], [a.hx + 9 * s, a.hy - 9 * s], [a.hx + 9 * s, a.hy + 2]], { fill: '#5a5a60', w: 1.4 });
      S.line(g, a.hx - 9 * s, a.hy - 7 * s, a.hx - 15 * s, a.hy - 17 * s, 2.4, '#efe7d0'); S.line(g, a.hx + 9 * s, a.hy - 7 * s, a.hx + 15 * s, a.hy - 17 * s, 2.4, '#efe7d0');
      Wp(g, a, u, 30, 'sword', '#b0b3ba');
    },
    halvard(g, u) {
      const s = u.r / 13, tt = t();
      const a = H(g, u, { body: '#8a7a4a', skin: '#2a2a30', eyes: '#ff5a2a', cape: '#6b1a14', belt: '#3a2a1a', legs: '#5a5040', s });
      S.poly(g, [[a.hx - 9 * s, a.hy + 3], [a.hx - 9 * s, a.hy - 9 * s], [a.x, a.hy - 13 * s], [a.hx + 9 * s, a.hy - 9 * s], [a.hx + 9 * s, a.hy + 3]], { fill: '#a08a4a', w: 1.6 });
      eyes(g, a.hx, a.hy - 3 * s, '#ff5a2a', 3.5 * s, 3);
      // auréole brisée
      g.strokeStyle = '#c9a227'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(a.hx, a.hy - 16 * s, 11 * s, 3.5 * s, 0, 0.2, 2.6); g.stroke();
      g.beginPath(); g.ellipse(a.hx, a.hy - 16 * s, 11 * s, 3.5 * s, 0, 3.0, 5.6); g.stroke();
      S.circle(g, a.x - u.facing * 13 * s, a.y + 2 * s, 9 * s, { ry: 11 * s, fill: '#5a5a60', w: 1.6 });
      S.line(g, a.x - u.facing * 13 * s, a.y - 6 * s, a.x - u.facing * 13 * s, a.y + 10 * s, 1.6, '#c9a227', 0.4, 1);
      g.globalAlpha = 0.25 + 0.1 * Math.sin(tt * 3); g.fillStyle = '#ff5a2a'; g.beginPath(); g.arc(a.hx, a.hy, 14 * s, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      Wp(g, a, u, 34, 'sword', '#c9ccd1');
    },
    // ----- Bibliothèque -----
    book(g, u) {
      const x = u.x, y = u.y - 18 + Math.sin(t() * 7 + u.id) * 3, flap = Math.abs(Math.sin(t() * 12 + u.id)) * 0.9 + 0.2;
      g.save(); g.translate(x, y); g.rotate(Math.sin(t() * 3 + u.id) * 0.15);
      S.poly(g, [[0, 0], [-14, -12 * flap], [-14, 6 - 12 * flap], [0, 8]], { fill: u.col || '#7a2734', w: 1.3 });
      S.poly(g, [[0, 0], [14, -12 * flap], [14, 6 - 12 * flap], [0, 8]], { fill: u.col || '#7a2734', w: 1.3 });
      S.poly(g, [[0, 2], [-10, -6 * flap], [10, -6 * flap]], { fill: '#f5f0e1', w: 0.8, single: true });
      for (let i = -3; i <= 3; i++) S.line(g, i * 2.5, 1, i * 2.5 + 1.2, -3, 0.8, INK, 0.2, 1);
      g.restore();
    },
    apprentice(g, u) {
      const s = u.r / 13;
      const a = H(g, u, { body: '#4a2f6a', robe: true, skin: '#d9c4a8', eyes: '#c9a0f0', s });
      S.poly(g, [[a.hx - 9, a.hy + 4], [a.hx - 8, a.hy - 6], [a.hx + u.facing * 2, a.hy - 14], [a.hx + 8, a.hy - 6], [a.hx + 9, a.hy + 4]], { fill: '#3b2456', w: 1.2 });
      const bx = a.x - u.facing * 16, by = a.y - 18 + Math.sin(t() * 3) * 3;
      S.rect(g, bx - 7, by - 5, 14, 10, { fill: '#7a2734', w: 1 });
      g.globalAlpha = 0.5; S.circle(g, a.hand.x, a.hand.y, 5 + Math.sin(t() * 10) * 1.5, { fill: '#b48ae0', w: 0.8, single: true }); g.globalAlpha = 1;
    },
    inkslime(g, u) {
      const s = u.r / 15, x = u.x, wob = Math.sin((u.walk || 0) * 1.4) * 2, y = u.y - 8 * s;
      S.circle(g, x, y, 15 * s + wob, { ry: 11 * s - wob * 0.5, fill: '#1d1610', fillA: 0.95, w: 1.6 });
      for (let i = 0; i < 3; i++) S.line(g, x - 8 * s + i * 8 * s, y + 8 * s, x - 8 * s + i * 8 * s, y + 13 * s + Math.sin(t() * 3 + i) * 2, 2, '#1d1610', 0.4, 1);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - 5 * s, y - 5 * s, 4 * s, 2 * s, -0.5, 0, G.TAU); g.fill();
      eyes(g, x + u.facing * 3 * s, y - 2 * s, '#f5f0e1', 4 * s, 3);
    },
    inkling(g, u) {
      const s = u.r / 9, x = u.x, y = u.y - 5 * s;
      S.circle(g, x, y, 9 * s, { ry: 7 * s, fill: '#1d1610', fillA: 0.95, w: 1.2 });
      eyes(g, x + u.facing * 2 * s, y - 1 * s, '#f5f0e1', 2.5 * s, 2);
    },
    gargoyle(g, u) {
      const s = u.r / 17, x = u.x, y = u.y - 18 * s - Math.sin(t() * 4 + u.id) * 3, flap = Math.sin(t() * 9 + u.id) * 6 * s;
      S.poly(g, [[x - 8 * s, y - 4 * s], [x - 30 * s, y - 16 * s - flap], [x - 22 * s, y + 4 * s], [x - 8 * s, y + 6 * s]], { fill: '#6d6d75', w: 1.4 });
      S.poly(g, [[x + 8 * s, y - 4 * s], [x + 30 * s, y - 16 * s - flap], [x + 22 * s, y + 4 * s], [x + 8 * s, y + 6 * s]], { fill: '#6d6d75', w: 1.4 });
      S.circle(g, x, y + 4 * s, 12 * s, { ry: 14 * s, fill: '#8a8a92', w: 1.6, hatch: { sp: 5, c: INK, a: 0.3, w: 0.6 } });
      S.circle(g, x + u.facing * 2 * s, y - 12 * s, 8 * s, { fill: '#9a9aa2', w: 1.4 });
      S.line(g, x - 5 * s, y - 18 * s, x - 9 * s, y - 25 * s, 1.8); S.line(g, x + 5 * s, y - 18 * s, x + 9 * s, y - 25 * s, 1.8);
      eyes(g, x + u.facing * 3 * s, y - 13 * s, '#ff8a2a', 3 * s, 2.5);
    },
    archiviste(g, u) {
      const s = u.r / 13, tt = t();
      for (let i = 0; i < 5; i++) {
        const a = tt * 1.2 + (i / 5) * G.TAU, bx = u.x + Math.cos(a) * 34 * s, by = u.y - 20 * s + Math.sin(a) * 14 * s;
        S.rect(g, bx - 6, by - 4, 12, 8, { fill: ['#7a2734', '#2c4f7a', '#4f6b2b', '#a0703a', '#3b3346'][i], w: 1 });
      }
      const a = H(g, u, { body: '#3b3346', robe: true, skin: '#c9bfae', noEyes: true, s });
      S.line(g, a.hx - 8 * s, a.hy - 1 * s, a.hx + 8 * s, a.hy - 1 * s, 4 * s, '#efe7d0', 0.4, 1);
      S.poly(g, [[a.hx - 10 * s, a.hy + 5 * s], [a.hx - 9 * s, a.hy - 7 * s], [a.hx, a.hy - 14 * s], [a.hx + 9 * s, a.hy - 7 * s], [a.hx + 10 * s, a.hy + 5 * s]], { fill: '#2a2433', fillA: 0.85, w: 1.4 });
      Wp(g, a, u, 30, 'staff', '#b48ae0');
    },
    // ----- Tutoriel -----
    dummy(g, u) {
      const sway = u.hitT > 0 ? Math.sin(t() * 40) * 3 : 0, x = u.x + sway, y = u.y;
      S.line(g, u.x, y + 6, x, y - 34, 3.2, '#6b4a2c');
      S.line(g, x - 16, y - 22, x + 16, y - 22, 2.6, '#6b4a2c');
      S.circle(g, x, y - 16, 11, { ry: 13, fill: '#d9b552', w: 1.6, hatch: { sp: 4, ang: 1.2, c: '#8a6a2a', a: 0.35, w: 0.6 } });
      S.circle(g, x, y - 16, 6, { ry: 7, stroke: '#a8321f', w: 1.6, single: true }); S.circle(g, x, y - 16, 2, { fill: '#a8321f', w: 0.8 });
      S.circle(g, x, y - 36, 7, { fill: '#c9a46a', w: 1.4 });
      if (u.dps != null && u.dpsShow > 0) S.text(g, 'DPS : ' + Math.round(u.dps), u.x, u.y - 58, 17, '#7a2734', 'center', 'rgba(236,224,196,0.9)');
    },
    runeStone(g, u) {
      const tt = t(), pulse = 0.5 + 0.5 * Math.sin(tt * 3);
      g.globalAlpha = 0.2 + 0.2 * pulse; g.fillStyle = '#b48ae0'; g.beginPath(); g.arc(u.x, u.y - 24, 36, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      S.poly(g, [[u.x - 14, u.y + 6], [u.x - 16, u.y - 34], [u.x - 4, u.y - 50], [u.x + 12, u.y - 40], [u.x + 14, u.y + 6]], { fill: '#8a8478', w: 2, hatch: { sp: 6, c: INK, a: 0.25, w: 0.6 } });
      g.strokeStyle = `rgba(160,110,220,${0.5 + 0.5 * pulse})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(u.x - 6, u.y - 34); g.lineTo(u.x + 2, u.y - 26); g.lineTo(u.x - 4, u.y - 16); g.lineTo(u.x + 4, u.y - 8); g.stroke();
      g.beginPath(); g.arc(u.x + 3, u.y - 38, 3, 0, G.TAU); g.stroke();
    },
    rat(g, u) {
      const s = u.r / 9, f = u.facing, x = u.x, y = u.y - 4 * s, w = Math.sin(u.walk || 0) * 2;
      g.strokeStyle = '#a07a6a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - f * 8 * s, y + 1); g.quadraticCurveTo(x - f * 16 * s, y - 6 * s + w, x - f * 20 * s, y + 2 * s); g.stroke();
      S.circle(g, x, y, 9 * s, { ry: 5.5 * s, fill: '#6b5a4a', w: 1.3 });
      S.circle(g, x + f * 8 * s, y - 1, 4 * s, { ry: 3.5 * s, fill: '#7a6a5a', w: 1.1 });
      S.circle(g, x + f * 6 * s, y - 5 * s, 2.5 * s, { fill: '#c9a0a0', w: 0.8 });
      g.fillStyle = '#e07a8a'; g.fillRect(x + f * 12 * s - 1, y - 1, 2.5, 2.5);
      g.fillStyle = INK; g.fillRect(x + f * 9 * s - 1, y - 3, 1.8, 1.8);
    },
  });

  Object.assign(R.NPC, {
    villager(g, n) {
      const a = H(g, n, { body: n.body || '#a0703a', belt: '#6b4a2c' });
      if (n.hat) S.circle(g, a.hx, a.hy - 6, 9, { ry: 3.5, fill: n.hat, w: 1.2 });
      if (n.carry === 'basket') S.circle(g, a.hand.x, a.hand.y + 2, 6, { ry: 4, fill: '#c9a46a', w: 1 });
      if (n.carry === 'bread') S.rect(g, a.hand.x - 5, a.hand.y - 3, 10, 5, { fill: '#d9a35a', w: 0.8 });
    },
    brenna(g, n) {
      const a = H(g, n, { body: '#8c3b2a', belt: '#3a2a1a', cape: '#4f6b2b' });
      S.line(g, a.hx - u_face(n) * 6, a.hy - 4, a.hx - u_face(n) * 14, a.hy + 10, 3, '#b5461d', 1, 1);
      S.poly(g, [[a.hx - 8, a.hy - 2], [a.hx - 7, a.hy - 8], [a.hx + 7, a.hy - 8], [a.hx + 8, a.hy - 2]], { fill: '#9a9ca3', w: 1.2 });
      const sx = a.x + n.facing * 12;
      S.line(g, sx, a.y + 16, sx, a.y - 34, 2, '#6b4a2c');
      S.poly(g, [[sx - 3, a.y - 34], [sx, a.y - 44], [sx + 3, a.y - 34]], { fill: '#c9ccd1', w: 1 });
    },
    chicken(g, n) {
      const x = n.x, peck = n.peck > 0 ? 4 : 0, y = n.y - 6, f = n.facing;
      S.line(g, x - 2, y + 4, x - 2, y + 8, 1, '#c9a227'); S.line(g, x + 2, y + 4, x + 2, y + 8, 1, '#c9a227');
      S.circle(g, x, y, 7, { ry: 5.5, fill: '#f5f0e1', w: 1.1 });
      S.circle(g, x + f * 6, y - 5 + peck, 3.5, { fill: '#f5f0e1', w: 1 });
      g.fillStyle = '#a8321f'; g.fillRect(x + f * 5.5 - 1, y - 10 + peck, 3, 2.5);
      g.fillStyle = '#e2a020'; g.fillRect(x + f * 9 - (f < 0 ? 3 : 0), y - 5 + peck, 3, 2);
      S.line(g, x - f * 6, y - 2, x - f * 9, y - 6, 1.2, '#efe7d0');
    },
    cat(g, n) {
      const x = n.x, y = n.y - 5, f = n.facing, sit = n.sit;
      g.strokeStyle = '#c4661a'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - f * 7, y + 2); g.quadraticCurveTo(x - f * 16, y - 4 + Math.sin(t() * 3) * 3, x - f * 13, y - 12); g.stroke();
      S.circle(g, x, y, sit ? 6 : 9, { ry: sit ? 7 : 5, fill: '#d9884a', w: 1.2 });
      const hx = x + f * (sit ? 2 : 8), hy = y - (sit ? 9 : 4);
      S.circle(g, hx, hy, 4.5, { fill: '#d9884a', w: 1.1 });
      S.poly(g, [[hx - 4, hy - 2], [hx - 3, hy - 7], [hx - 1, hy - 3]], { fill: '#d9884a', w: 0.8, single: true });
      S.poly(g, [[hx + 4, hy - 2], [hx + 3, hy - 7], [hx + 1, hy - 3]], { fill: '#d9884a', w: 0.8, single: true });
      g.fillStyle = INK; g.fillRect(hx + f * 1.5 - 1, hy - 1, 1.6, 1.6);
    },
    citygate() {},
  });
  function u_face(n) { return n.facing || 1; }
})();
