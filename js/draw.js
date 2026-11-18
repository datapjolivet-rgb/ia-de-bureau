// Dessin des personnages, monstres, PNJ, projectiles et effets (style crayonné).
(function () {
  const S = G.S;
  const R = (G.R = {});
  const INK = S.ink;
  const SKIN = '#e8c9a0';

  function shadow(g, x, y, r) {
    g.globalAlpha = 0.22; g.fillStyle = '#2b2118';
    g.beginPath(); g.ellipse(x, y, r, r * 0.38, 0, 0, G.TAU); g.fill(); g.globalAlpha = 1;
  }

  // Silhouette humanoïde de base. Renvoie les points d'ancrage (main, tête).
  function humanoid(g, u, o) {
    const s = o.s || 1;
    const walk = Math.sin(u.walk || 0) * 4 * s;
    const bob = Math.abs(Math.sin(u.walk || 0)) * 1.5 * s;
    const x = u.x, y = u.y - 8 * s - bob;
    // jambes
    S.line(g, x - 4 * s, y + 8 * s, x - 5 * s + walk, y + 17 * s + bob, 2.4 * s, o.legs || INK);
    S.line(g, x + 4 * s, y + 8 * s, x + 5 * s - walk, y + 17 * s + bob, 2.4 * s, o.legs || INK);
    // cape éventuelle
    if (o.cape) S.poly(g, [[x - 8 * s, y - 6 * s], [x + 8 * s, y - 6 * s], [x + 11 * s - u.facing * 3, y + 12 * s], [x - 11 * s - u.facing * 3, y + 12 * s]], { fill: o.cape, w: 1.2 * s, amt: 0.9 });
    // corps
    if (o.robe) S.poly(g, [[x - 7 * s, y - 7 * s], [x + 7 * s, y - 7 * s], [x + 11 * s, y + 14 * s], [x - 11 * s, y + 14 * s]], { fill: o.body, w: 1.6 * s, amt: 1 });
    else S.circle(g, x, y, 9.5 * s, { ry: 10.5 * s, fill: o.body, w: 1.7 * s });
    if (o.belt) S.line(g, x - 8 * s, y + 3 * s, x + 8 * s, y + 3 * s, 2 * s, o.belt);
    // tête
    const hx = x + u.facing * 1 * s, hy = y - 15 * s;
    S.circle(g, hx, hy, 7.5 * s, { fill: o.skin || SKIN, w: 1.5 * s });
    if (!o.noEyes) {
      g.fillStyle = o.eyes || INK;
      g.fillRect(hx + u.facing * 2.5 * s - 1, hy - 1 * s, 2 * s, 2.4 * s);
      g.fillRect(hx + u.facing * 5.5 * s - 1, hy - 1 * s, 1.6 * s, 2.4 * s);
    }
    return { x, y, hx, hy, s, hand: { x: x + Math.cos(u.aim) * 9 * s, y: y + 2 * s + Math.sin(u.aim) * 5 * s } };
  }

  // Arme orientée selon la visée, avec animation de coup
  function weapon(g, a, u, len, kind, color) {
    const s = a.s;
    let ang = u.aim;
    if (u.swingT > 0) ang += (u.swingT - 0.5) * 2.4 * (u.swingDir || 1);
    const hx = a.hand.x, hy = a.hand.y;
    const ex = hx + Math.cos(ang) * len * s, ey = hy + Math.sin(ang) * len * s;
    switch (kind) {
      case 'sword': case 'katana':
        S.line(g, hx, hy, ex, ey, kind === 'katana' ? 2 * s : 3 * s, color || '#c9ccd1', 0.8);
        S.line(g, hx, hy, ex, ey, 1, INK, 0.8, 1);
        S.line(g, hx - Math.sin(ang) * 5 * s, hy + Math.cos(ang) * 5 * s, hx + Math.sin(ang) * 5 * s, hy - Math.cos(ang) * 5 * s, 2 * s, INK);
        break;
      case 'staff':
        S.line(g, hx - Math.cos(ang) * 6, hy - Math.sin(ang) * 6, ex, ey, 2.4 * s, '#6b4a2c');
        S.circle(g, ex, ey, 4.5 * s, { fill: color || '#7b5fd0', w: 1.2 });
        g.globalAlpha = 0.25; g.fillStyle = color || '#7b5fd0'; g.beginPath(); g.arc(ex, ey, 10 * s, 0, G.TAU); g.fill(); g.globalAlpha = 1;
        break;
      case 'hammer': case 'axe': case 'mace': {
        S.line(g, hx, hy, ex, ey, 2.4 * s, '#6b4a2c');
        const px = -Math.sin(ang), py = Math.cos(ang);
        if (kind === 'axe') S.poly(g, [[ex, ey], [ex + px * 8 * s - Math.cos(ang) * 4, ey + py * 8 * s - Math.sin(ang) * 4], [ex + px * 7 * s + Math.cos(ang) * 4, ey + py * 7 * s + Math.sin(ang) * 4]], { fill: '#c9ccd1', w: 1.3 });
        else S.rect(g, ex - 5 * s, ey - 5 * s, 10 * s, 10 * s, { fill: color || '#9a9ca3', w: 1.4 });
        break;
      }
      case 'bow': {
        const px = -Math.sin(ang), py = Math.cos(ang);
        const bx = hx + Math.cos(ang) * 8 * s, by = hy + Math.sin(ang) * 8 * s;
        g.strokeStyle = '#6b4a2c'; g.lineWidth = 2.4 * s;
        g.beginPath(); g.moveTo(bx + px * 12 * s, by + py * 12 * s); g.quadraticCurveTo(bx + Math.cos(ang) * 10 * s, by + Math.sin(ang) * 10 * s, bx - px * 12 * s, by - py * 12 * s); g.stroke();
        S.line(g, bx + px * 12 * s, by + py * 12 * s, bx - px * 12 * s, by - py * 12 * s, 0.7, INK, 0.3, 1);
        break;
      }
      case 'dagger':
        S.line(g, hx, hy, hx + Math.cos(ang) * 11 * s, hy + Math.sin(ang) * 11 * s, 2 * s, '#c9ccd1');
        S.line(g, a.x - u.facing * 8 * s, hy + 3, a.x - u.facing * 8 * s + Math.cos(ang) * 9 * s, hy + 3 + Math.sin(ang) * 9 * s, 2 * s, '#c9ccd1');
        break;
      case 'scythe': {
        S.line(g, hx - Math.cos(ang) * 8, hy - Math.sin(ang) * 8, ex, ey, 2.2 * s, '#4a3524');
        const px = -Math.sin(ang), py = Math.cos(ang);
        g.strokeStyle = '#c9ccd1'; g.lineWidth = 2.6 * s;
        g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo(ex + px * 12 * s, ey + py * 12 * s, ex - Math.cos(ang) * 10 * s + px * 14 * s, ey - Math.sin(ang) * 10 * s + py * 14 * s); g.stroke();
        S.circle(g, ex, ey, 3.5 * s, { fill: '#e4dcc6', w: 1 });
        break;
      }
      case 'lute':
        S.circle(g, hx + Math.cos(ang) * 4, hy + Math.sin(ang) * 4, 6.5 * s, { ry: 5 * s, fill: '#a0703a', w: 1.3 });
        S.line(g, hx + Math.cos(ang) * 6, hy + Math.sin(ang) * 6, ex, ey, 2 * s, '#6b4a2c');
        break;
      case 'pick':
        S.line(g, hx, hy, ex, ey, 2.2 * s, '#6b4a2c');
        S.line(g, ex - Math.sin(ang) * 8 * s, ey + Math.cos(ang) * 8 * s, ex + Math.sin(ang) * 8 * s, ey - Math.cos(ang) * 8 * s, 2.4 * s, '#8a8c92');
        break;
      case 'claw':
        for (let i = -1; i <= 1; i++) S.line(g, hx, hy, hx + Math.cos(ang + i * 0.3) * 9 * s, hy + Math.sin(ang + i * 0.3) * 9 * s, 1.2, INK);
        break;
      case 'shovel':
        S.line(g, hx - Math.cos(ang) * 10, hy - Math.sin(ang) * 10, ex, ey, 2.6 * s, '#5a4030');
        S.circle(g, ex + Math.cos(ang) * 5 * s, ey + Math.sin(ang) * 5 * s, 6 * s, { ry: 4.5 * s, fill: '#8a8c92', w: 1.4 });
        break;
    }
  }

  // ---------- Classes jouables ----------
  const CLASS_LOOK = {
    guerrier(g, u) {
      const a = humanoid(g, u, { body: '#8c3b2a', belt: '#4a3524' });
      S.poly(g, [[a.hx - 8, a.hy - 1], [a.hx - 7, a.hy - 9], [a.hx + 7, a.hy - 9], [a.hx + 8, a.hy - 1]], { fill: '#9a9ca3', w: 1.3 });
      S.line(g, a.hx - 8, a.hy - 6, a.hx - 13, a.hy - 13, 2, '#efe7d0'); S.line(g, a.hx + 8, a.hy - 6, a.hx + 13, a.hy - 13, 2, '#efe7d0');
      weapon(g, a, u, 22, 'sword');
    },
    mage(g, u) {
      const a = humanoid(g, u, { body: '#2f5d8a', robe: true });
      S.poly(g, [[a.hx - 10, a.hy - 3], [a.hx + 10, a.hy - 3], [a.hx + 2 - u.facing * 4, a.hy - 24]], { fill: '#2f4f7a', w: 1.4 });
      S.circle(g, a.hx + 2 - u.facing * 4, a.hy - 24, 1.8, { fill: '#e2c043', w: 0.8 });
      weapon(g, a, u, 24, 'staff', '#9c7cf0');
    },
    samourai(g, u) {
      const a = humanoid(g, u, { body: '#7a2734', belt: '#1d1610' });
      S.poly(g, [[a.hx - 14, a.hy - 3], [a.hx, a.hy - 13], [a.hx + 14, a.hy - 3]], { fill: '#c9a46a', w: 1.4 });
      weapon(g, a, u, 24, 'katana', '#dfe3e8');
    },
    archer(g, u) {
      const a = humanoid(g, u, { body: '#4f6b2b', cape: '#3e5622' });
      S.poly(g, [[a.hx - 8, a.hy + 2], [a.hx - 7, a.hy - 7], [a.hx - u.facing * 3, a.hy - 13], [a.hx + 7, a.hy - 7], [a.hx + 8, a.hy + 2]], { fill: '#3e5622', w: 1.2, fillA: 0.7 });
      weapon(g, a, u, 20, 'bow');
    },
    soigneur(g, u) {
      const a = humanoid(g, u, { body: '#efe7d0', robe: true, belt: '#b39b3c' });
      S.line(g, a.x, a.y - 4, a.x, a.y + 8, 2, '#b39b3c'); S.line(g, a.x - 4, a.y, a.x + 4, a.y, 2, '#b39b3c');
      S.circle(g, a.hx, a.hy - 12, 8, { ry: 2.5, stroke: '#d9b52e', w: 1.6, single: true });
      weapon(g, a, u, 18, 'mace', '#e2c043');
    },
    paladin(g, u) {
      const a = humanoid(g, u, { body: '#c48a2c', cape: '#efe7d0', belt: '#6b4a2c' });
      S.poly(g, [[a.hx - 8, a.hy + 1], [a.hx - 8, a.hy - 8], [a.hx + 8, a.hy - 8], [a.hx + 8, a.hy + 1]], { fill: '#d9b52e', w: 1.3 });
      S.line(g, a.hx - 5, a.hy - 2, a.hx + 5, a.hy - 2, 1.6, INK);
      S.circle(g, a.x - u.facing * 9, a.y + 2, 6.5, { fill: '#9a9ca3', w: 1.4 });
      weapon(g, a, u, 20, 'hammer', '#d9b52e');
    },
    necromancien(g, u) {
      const a = humanoid(g, u, { body: '#2f3a2c', robe: true, skin: '#cfd6c4', eyes: '#6fd04a' });
      S.poly(g, [[a.hx - 9, a.hy + 4], [a.hx - 8, a.hy - 6], [a.hx, a.hy - 12], [a.hx + 8, a.hy - 6], [a.hx + 9, a.hy + 4]], { fill: '#1d2a1a', fillA: 0.8, w: 1.3 });
      weapon(g, a, u, 26, 'scythe');
    },
    assassin(g, u) {
      const a = humanoid(g, u, { body: '#3b3346', belt: '#7a2734' });
      S.poly(g, [[a.hx - 8, a.hy + 1], [a.hx - 7, a.hy - 7], [a.hx, a.hy - 11], [a.hx + 7, a.hy - 7], [a.hx + 8, a.hy + 1]], { fill: '#2a2433', fillA: 0.9, w: 1.2 });
      S.line(g, a.hx - 7, a.hy + 2, a.hx + 7, a.hy + 2, 3, '#2a2433');
      weapon(g, a, u, 12, 'dagger');
    },
    berserker(g, u) {
      const a = humanoid(g, u, { body: '#d29a6c', belt: '#4a3524', legs: '#4a3524' });
      S.line(g, a.x - 6, a.y - 6, a.x + 6, a.y + 6, 2.5, '#7a2734');
      for (let i = -2; i <= 2; i++) S.line(g, a.hx + i * 3, a.hy - 6, a.hx + i * 4, a.hy - 12 - Math.abs(i), 1.8, '#b5461d');
      weapon(g, a, u, 18, 'axe');
    },
    barde(g, u) {
      const a = humanoid(g, u, { body: '#6a3f86', belt: '#c9a227', cape: '#8a5aa8' });
      S.poly(g, [[a.hx - 9, a.hy - 4], [a.hx + 9, a.hy - 4], [a.hx + 6, a.hy - 10], [a.hx - 6, a.hy - 10]], { fill: '#4f2e66', w: 1.2 });
      S.line(g, a.hx + u.facing * 4, a.hy - 9, a.hx + u.facing * 14, a.hy - 20, 1.6, '#a8321f');
      weapon(g, a, u, 14, 'lute');
    },
  };

  // ---------- Monstres ----------
  const MON_LOOK = {
    skeleton(g, u) {
      const a = humanoid(g, u, { body: '#e4dcc6', skin: '#efe7d0', eyes: '#1d1610', legs: '#cfc7b4', s: u.r / 13 });
      for (let i = -1; i <= 1; i++) S.line(g, a.x - 6, a.y + i * 4, a.x + 6, a.y + i * 4, 0.9, INK);
      g.fillStyle = INK; g.fillRect(a.hx - 4, a.hy - 2, 3, 3); g.fillRect(a.hx + 1, a.hy - 2, 3, 3);
      weapon(g, a, u, 18, 'sword', '#9a9ca3');
    },
    skelArcher(g, u) {
      const a = humanoid(g, u, { body: '#e4dcc6', skin: '#efe7d0', legs: '#cfc7b4', s: u.r / 13 });
      for (let i = -1; i <= 1; i++) S.line(g, a.x - 6, a.y + i * 4, a.x + 6, a.y + i * 4, 0.9, INK);
      g.fillStyle = INK; g.fillRect(a.hx - 4, a.hy - 2, 3, 3); g.fillRect(a.hx + 1, a.hy - 2, 3, 3);
      weapon(g, a, u, 16, 'bow');
    },
    ghoul(g, u) {
      const a = humanoid(g, u, { body: '#7f8c6c', skin: '#9aa585', eyes: '#c0281b', s: u.r / 13 });
      S.line(g, a.x - 7, a.y - 4, a.x + 7, a.y - 2, 1, INK);
      weapon(g, a, u, 6, 'claw');
    },
    cultist(g, u) {
      const a = humanoid(g, u, { body: '#4a3b4e', robe: true, skin: '#2a2230', eyes: '#f08a2a', s: u.r / 13 });
      S.poly(g, [[a.hx - 9, a.hy + 5], [a.hx - 8, a.hy - 6], [a.hx, a.hy - 13], [a.hx + 8, a.hy - 6], [a.hx + 9, a.hy + 5]], { fill: '#3a2e3e', w: 1.3 });
      weapon(g, a, u, 22, 'staff', '#f08a2a');
    },
    wolf(g, u) {
      const s = u.r / 13, f = u.facing, x = u.x, y = u.y - 6 * s, w = Math.sin(u.walk || 0) * 4;
      for (const lx of [-8, -3, 4, 9]) S.line(g, x + lx * s, y + 4 * s, x + lx * s + (lx % 2 ? w : -w), y + 13 * s, 2 * s, INK);
      S.line(g, x - f * 13 * s, y - 2 * s, x - f * 22 * s, y - 8 * s, 2.5 * s, '#6e6458');
      S.circle(g, x, y, 14 * s, { ry: 8 * s, fill: u.col || '#6e6458', w: 1.6 });
      S.hatchCircle(g, x, y + 2, 12 * s, 6 * s, { sp: 4, c: INK, a: 0.25, w: 0.7 });
      const hx = x + f * 14 * s, hy = y - 5 * s;
      S.circle(g, hx, hy, 7 * s, { ry: 6 * s, fill: '#7a7064', w: 1.4 });
      S.poly(g, [[hx - 5 * s, hy - 4 * s], [hx - 2 * s, hy - 12 * s], [hx + 1 * s, hy - 4 * s]], { fill: '#5a5248', w: 1 });
      S.line(g, hx + f * 5 * s, hy + 1, hx + f * 11 * s, hy + 3, 3 * s, '#5a5248');
      g.fillStyle = '#c0281b'; g.fillRect(hx + f * 3 * s, hy - 2 * s, 2.5, 2.5);
    },
    spider(g, u) {
      const s = u.r / 12, x = u.x, y = u.y - 6 * s, t = (u.walk || 0);
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
        const ky = y - 6 * s + i * 4 * s, wob = Math.sin(t + i * 1.7 + (sd > 0 ? 1 : 0)) * 3;
        g.strokeStyle = INK; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x + sd * 6 * s, ky); g.quadraticCurveTo(x + sd * 14 * s, ky - 8 * s + wob, x + sd * 18 * s, ky + 6 * s + wob); g.stroke();
      }
      S.circle(g, x, y + 5 * s, 10 * s, { ry: 9 * s, fill: u.col || '#3e3a2f', w: 1.5 });
      S.line(g, x - 4 * s, y + 2 * s, x + 4 * s, y + 8 * s, 1.5, '#a8321f'); S.line(g, x + 4 * s, y + 2 * s, x - 4 * s, y + 8 * s, 1.5, '#a8321f');
      S.circle(g, x, y - 6 * s, 6 * s, { fill: '#2b2720', w: 1.2 });
      g.fillStyle = '#e04030'; for (const ex of [-3, -1, 1, 3]) g.fillRect(x + ex * s - 1, y - 8 * s, 1.8, 1.8);
    },
    treant(g, u) {
      const s = u.r / 20, x = u.x, y = u.y - 14 * s;
      S.line(g, x - 8 * s, y + 14 * s, x - 14 * s, y + 24 * s, 4 * s, '#5a4030'); S.line(g, x + 8 * s, y + 14 * s, x + 14 * s, y + 24 * s, 4 * s, '#5a4030');
      S.rect(g, x - 10 * s, y - 8 * s, 20 * s, 24 * s, { fill: '#7a5a3a', w: 1.8, hatch: { sp: 4, ang: 1.5, c: INK, a: 0.3, w: 0.7 } });
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 10 : 0;
      S.line(g, x - 10 * s, y - 2 * s, x - 24 * s, y - 10 * s + sw, 3.5 * s, '#5a4030'); S.line(g, x + 10 * s, y - 2 * s, x + 24 * s, y - 10 * s - sw, 3.5 * s, '#5a4030');
      S.circle(g, x - 8 * s, y - 16 * s, 12 * s, { fill: '#5d6b37', w: 1.5 }); S.circle(g, x + 8 * s, y - 16 * s, 12 * s, { fill: '#4f5e2c', w: 1.5 }); S.circle(g, x, y - 24 * s, 12 * s, { fill: '#6b7a40', w: 1.5 });
      g.fillStyle = '#e8d24a'; g.fillRect(x - 5 * s, y, 3, 3); g.fillRect(x + 3 * s, y, 3, 3);
    },
    goblin(g, u) {
      const a = humanoid(g, u, { body: '#7c6a52', skin: '#7fa04a', eyes: '#e8d24a', s: u.r / 13 });
      S.poly(g, [[a.hx - 6, a.hy - 2], [a.hx - 15, a.hy - 6], [a.hx - 6, a.hy + 2]], { fill: '#7fa04a', w: 1 });
      S.poly(g, [[a.hx + 6, a.hy - 2], [a.hx + 15, a.hy - 6], [a.hx + 6, a.hy + 2]], { fill: '#7fa04a', w: 1 });
      weapon(g, a, u, 16, 'pick');
    },
    bomber(g, u) {
      const a = humanoid(g, u, { body: '#8a3b2a', skin: '#7fa04a', eyes: '#e8d24a', s: u.r / 13 });
      S.poly(g, [[a.hx - 6, a.hy - 2], [a.hx - 15, a.hy - 6], [a.hx - 6, a.hy + 2]], { fill: '#7fa04a', w: 1 });
      S.poly(g, [[a.hx + 6, a.hy - 2], [a.hx + 15, a.hy - 6], [a.hx + 6, a.hy + 2]], { fill: '#7fa04a', w: 1 });
      S.circle(g, a.hand.x, a.hand.y, 5, { fill: '#2b2118', w: 1 });
      if ((S.boil & 1) === 0) S.circle(g, a.hand.x + 3, a.hand.y - 7, 2.2, { fill: '#f0a020', w: 0.6 });
    },
    miner(g, u) {
      const a = humanoid(g, u, { body: '#7c6a52', skin: '#6f8f3a', eyes: '#e8d24a', belt: '#3a2a1a', s: u.r / 13 });
      S.circle(g, a.hx, a.hy - 6, 8, { ry: 5, fill: '#c9a227', w: 1.3 });
      S.circle(g, a.hx + u.facing * 4, a.hy - 7, 2, { fill: '#fff7c0', w: 0.7 });
      weapon(g, a, u, 20, 'pick');
    },
    golem(g, u) {
      const s = u.r / 21, x = u.x, y = u.y - 16 * s, w = Math.sin(u.walk || 0) * 3;
      S.rect(g, x - 12 * s, y + 12 * s, 9 * s, 12 * s + w, { fill: '#56565c', w: 1.5 }); S.rect(g, x + 3 * s, y + 12 * s, 9 * s, 12 * s - w, { fill: '#56565c', w: 1.5 });
      S.rect(g, x - 16 * s, y - 10 * s, 32 * s, 24 * s, { fill: '#6d6d75', w: 2, hatch: { sp: 5, c: INK, a: 0.3, w: 0.7 } });
      const sw = u.swingT > 0 ? (u.swingT - 0.5) * 12 : 0;
      S.rect(g, x - 26 * s, y - 6 * s + sw, 10 * s, 18 * s, { fill: '#5d5d65', w: 1.6 }); S.rect(g, x + 16 * s, y - 6 * s - sw, 10 * s, 18 * s, { fill: '#5d5d65', w: 1.6 });
      S.rect(g, x - 8 * s, y - 22 * s, 16 * s, 13 * s, { fill: '#7a7a82', w: 1.6 });
      g.fillStyle = '#ff8a2a'; g.fillRect(x - 5 * s, y - 17 * s, 3.5, 3); g.fillRect(x + 2 * s, y - 17 * s, 3.5, 3);
      g.fillStyle = 'rgba(255,138,42,0.6)'; g.fillRect(x - 3 * s, y - 2 * s, 6 * s, 6 * s);
    },
    varok(g, u) {
      const s = u.r / 13;
      const a = humanoid(g, u, { body: '#4a4038', robe: true, skin: '#bdb39c', eyes: '#e04030', s, cape: '#2f2a24' });
      S.poly(g, [[a.hx - 9 * s, a.hy + 3 * s], [a.hx - 8 * s, a.hy - 6 * s], [a.hx, a.hy - 12 * s], [a.hx + 8 * s, a.hy - 6 * s], [a.hx + 9 * s, a.hy + 3 * s]], { fill: '#2f2a24', w: 2 });
      g.fillStyle = '#e04030'; g.fillRect(a.hx - 4 * s, a.hy - 2 * s, 3 * s, 3 * s); g.fillRect(a.hx + 1 * s, a.hy - 2 * s, 3 * s, 3 * s);
      // lanterne
      const lx = a.x - u.facing * 12 * s, ly = a.y + 4 * s;
      S.line(g, lx, ly - 8, lx, ly - 2, 1.2);
      S.rect(g, lx - 4 * s, ly, 8 * s, 9 * s, { fill: '#e8a33a', w: 1.3 });
      g.globalAlpha = 0.2; g.fillStyle = '#f2c46b'; g.beginPath(); g.arc(lx, ly + 4, 40, 0, G.TAU); g.fill(); g.globalAlpha = 1;
      weapon(g, a, u, 26, 'shovel');
    },
    mereRonce(g, u) {
      const s = u.r / 14, x = u.x, y = u.y - 10 * s, t = (u.walk || 0) + G.Game.time * 2;
      for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) {
        const ky = y - 8 * s + i * 4.5 * s, wob = Math.sin(t + i * 1.3 + sd) * 4;
        g.strokeStyle = '#3d4a20'; g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(x + sd * 8 * s, ky); g.quadraticCurveTo(x + sd * 20 * s, ky - 12 * s + wob, x + sd * 26 * s, ky + 9 * s + wob); g.stroke();
        S.line(g, x + sd * 20 * s, ky - 6 * s + wob, x + sd * 23 * s, ky - 10 * s + wob, 1.2, INK, 0.6, 1);
      }
      S.circle(g, x, y + 6 * s, 15 * s, { ry: 13 * s, fill: '#4c5e2a', w: 2, hatch: { sp: 5, c: INK, a: 0.35, w: 0.8 } });
      for (let i = 0; i < 7; i++) { const aa = (i / 7) * G.TAU + 0.3; S.line(g, x + Math.cos(aa) * 13 * s, y + 6 * s + Math.sin(aa) * 11 * s, x + Math.cos(aa) * 19 * s, y + 6 * s + Math.sin(aa) * 16 * s, 1.6, INK); }
      S.circle(g, x, y - 10 * s, 9 * s, { fill: '#6b3a4a', w: 1.6 });
      S.circle(g, x - 3 * s, y - 20 * s, 4 * s, { fill: '#c4661a', w: 1 }); S.circle(g, x + 4 * s, y - 19 * s, 3.5 * s, { fill: '#a8321f', w: 1 });
      g.fillStyle = '#f2e04a'; for (const ex of [-4, -1.5, 1.5, 4]) g.fillRect(x + ex * s - 1, y - 12 * s, 2.4, 2.4);
    },
    grizzak(g, u) {
      const s = u.r / 13;
      const a = humanoid(g, u, { body: '#6b4a2c', skin: '#6f8f3a', eyes: '#f2e04a', belt: '#a8321f', s });
      S.poly(g, [[a.hx - 6 * s, a.hy - 2 * s], [a.hx - 16 * s, a.hy - 7 * s], [a.hx - 6 * s, a.hy + 2 * s]], { fill: '#6f8f3a', w: 1.2 });
      S.poly(g, [[a.hx + 6 * s, a.hy - 2 * s], [a.hx + 16 * s, a.hy - 7 * s], [a.hx + 6 * s, a.hy + 2 * s]], { fill: '#6f8f3a', w: 1.2 });
      S.circle(g, a.hx, a.hy - 6 * s, 8.5 * s, { ry: 5 * s, fill: '#c9a227', w: 1.5 });
      S.circle(g, a.hx + u.facing * 4 * s, a.hy - 7 * s, 2.5 * s, { fill: '#fff7c0', w: 0.8 });
      for (let i = -2; i <= 2; i++) S.rect(g, a.x + i * 4 * s - 1.5 * s, a.y - 2 * s, 3 * s, 8 * s, { fill: '#a8321f', w: 0.8, single: true });
      weapon(g, a, u, 24, 'pick');
    },
  };

  // ---------- PNJ de la ville ----------
  const NPC_LOOK = {
    smith: (g, u) => { const a = humanoid(g, u, { body: '#6b4a2c', belt: '#3a2a1a' }); S.rect(g, a.x - 6, a.y - 4, 12, 14, { fill: '#4a3524', w: 1 }); S.line(g, a.hx - 6, a.hy + 5, a.hx + 6, a.hy + 5, 3, '#a0703a'); weapon(g, a, u, 16, 'hammer'); },
    merchant: (g, u) => { const a = humanoid(g, u, { body: '#2c5f9e', robe: true, belt: '#c9a227' }); S.circle(g, a.hx, a.hy - 7, 10, { ry: 3.5, fill: '#8a3b2a', w: 1.3 }); S.circle(g, a.x + 11, a.y + 6, 5, { fill: '#a0703a', w: 1.2 }); },
    sage: (g, u) => { const a = humanoid(g, u, { body: '#6a3f86', robe: true }); S.poly(g, [[a.hx - 5, a.hy + 3], [a.hx + 5, a.hy + 3], [a.hx, a.hy + 16]], { fill: '#efe7d0', w: 1.2 }); weapon(g, a, u, 24, 'staff', '#e2c043'); },
    captain: (g, u) => { const a = humanoid(g, u, { body: '#7a7d84', cape: '#4f6b2b', belt: '#6b4a2c' }); S.circle(g, a.hx, a.hy - 5, 8, { ry: 5, fill: '#9a9ca3', w: 1.3 }); S.line(g, a.hx, a.hy - 10, a.hx - 4, a.hy - 18, 2, '#a8321f'); weapon(g, a, u, 20, 'sword'); },
    tavern: (g, u) => { const a = humanoid(g, u, { body: '#9a6b2c', belt: '#efe7d0' }); S.rect(g, a.hand.x - 4, a.hand.y - 6, 8, 10, { fill: '#e8c060', w: 1.2 }); },
    portal: (g, u) => {
      const t = G.Game.time;
      for (let i = 0; i < 4; i++) {
        g.globalAlpha = 0.5 - i * 0.1;
        S.circle(g, u.x, u.y, 30 - i * 6 + Math.sin(t * 3 + i) * 2, { ry: 18 - i * 3, fill: i === 0 ? '#7b3fa6' : null, fillA: 0.5, stroke: '#4a2066', w: 1.6 });
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const a = t * 1.5 + i; g.fillStyle = '#c9a0f0'; g.fillRect(u.x + Math.cos(a) * 24, u.y + Math.sin(a) * 14 - 6, 2, 2); }
    },
  };

  R.humanoid = humanoid; R.weapon = weapon; R.shadow = shadow;
  R.CLS = CLASS_LOOK; R.MON = MON_LOOK; R.NPC = NPC_LOOK;

  // Bulle de dialogue dessinée
  R.bubble = function (g, x, y, text, alpha) {
    const words = String(text).split(' '), lines = [];
    let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > 30) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; });
    if (cur.trim()) lines.push(cur.trim());
    g.font = "17px 'Patrick Hand', 'Comic Sans MS', cursive";
    const wMax = Math.max(...lines.map((l) => g.measureText(l).width)) + 22, h = lines.length * 19 + 12;
    const bx = x - wMax / 2, by = y - h - 12;
    g.globalAlpha = alpha == null ? 1 : alpha;
    S.begin(Math.floor(x + y), true);
    S.poly(g, [[bx, by], [bx + wMax, by], [bx + wMax, by + h], [x + 8, by + h], [x - 2, by + h + 11], [x - 4, by + h], [bx, by + h]], { fill: '#f7eed7', fillA: 0.97, w: 1.5, over: 1 });
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, x, by + 12 + i * 19));
    g.globalAlpha = 1;
  };

  // ---------- Dessin d'une unité ----------
  R.unit = function (g, u) {
    S.begin(u.id);
    if (u.hidden) {
      const t = G.Game.time;
      for (let i = 0; i < 3; i++) { g.globalAlpha = 0.5 - i * 0.12; S.circle(g, u.x, u.y, 14 + i * 9 + Math.sin(t * 6 + i) * 3, { ry: 6 + i * 4, stroke: '#2f4d47', w: 1.5, single: true }); }
      g.globalAlpha = 1;
      return;
    }
    const isBoss = u.boss;
    shadow(g, u.x, u.y + 2, u.r * (isBoss ? 1.1 : 1));
    let alpha = 1;
    if (u.stealth) alpha = 0.35;
    if (u.minion) alpha = 0.85;
    if (u.def && u.def.shade && !u.minion && G.Game.player) { const d = G.dist(u, G.Game.player); alpha = d > 170 ? 0.14 : d > 110 ? 0.45 : 0.85; }
    g.globalAlpha = alpha;
    if (u.elite && !u.minion) {
      g.globalAlpha = 0.5 * alpha; S.circle(g, u.x, u.y + 2, u.r + 8, { ry: (u.r + 8) * 0.4, stroke: '#c9a227', w: 2, single: true }); g.globalAlpha = alpha;
    }
    if (u.minion) {
      g.globalAlpha = 0.45; S.circle(g, u.x, u.y + 2, u.r + 6, { ry: (u.r + 6) * 0.4, stroke: '#5bd04a', w: 2, single: true }); g.globalAlpha = alpha;
    }
    const prevAlpha = alpha;
    const look = (u.isPlayer || u.isAlly ? CLASS_LOOK[u.look] : null) || MON_LOOK[u.look] || NPC_LOOK[u.look];
    g.save(); g.globalAlpha = prevAlpha;
    if (look) look(g, u);
    else S.circle(g, u.x, u.y, u.r, { fill: u.col || '#999' });
    g.restore();
    // éclair blanc quand touché
    if (u.hitT > 0) {
      g.globalAlpha = Math.min(0.6, u.hitT * 4); g.fillStyle = '#fff6e0';
      g.beginPath(); g.ellipse(u.x, u.y - u.r * 0.7, u.r * 0.9, u.r * 1.3, 0, 0, G.TAU); g.fill();
      g.globalAlpha = 1;
    }
    if (u.stunT > 0) {
      const t = G.Game.time * 4;
      for (let i = 0; i < 3; i++) S.text(g, u.sleep ? 'z' : '*', u.x + Math.cos(t + i * 2.1) * 10, u.y - u.r * 2.1 + Math.sin(t + i * 2.1) * 3, 16, '#c9a227', 'center', '#2b2118');
    }
    if (u.shield > 0) { g.globalAlpha = 0.35; S.circle(g, u.x, u.y - 8, u.r + 10, { stroke: '#6fb1d9', w: 2.5, single: true }); g.globalAlpha = 1; }
    if (u.frozenT > 0 && u.stunT > 0) {
      g.globalAlpha = 0.55; S.rect(g, u.x - u.r - 5, u.y - u.r * 2.6, u.r * 2 + 10, u.r * 2.9, { fill: '#cfe7f5', fillA: 0.8, stroke: '#6f9ac0', w: 1.6 });
      S.line(g, u.x - u.r, u.y - u.r * 2.2, u.x - u.r + 8, u.y - u.r * 2.2 + 10, 1.2, '#ffffff', 0.3, 1); g.globalAlpha = 1;
    }
    if (u.shielded) {
      const t = G.Game.time;
      g.globalAlpha = 0.18 + 0.08 * Math.sin(t * 5); g.fillStyle = '#e2c043';
      g.beginPath(); g.ellipse(u.x, u.y - u.r * 0.6, u.r + 22, u.r + 26, 0, 0, G.TAU); g.fill();
      g.globalAlpha = 0.8; S.circle(g, u.x, u.y - u.r * 0.6, u.r + 22, { ry: u.r + 26, stroke: '#c9a227', w: 2.2 });
      g.globalAlpha = 1;
    }
    if (u.def && u.def.guard && !u.minion && !u.cast && !(u.stunT > 0)) {
      const sx = u.x + Math.cos(u.aim) * u.r * 0.9, sy = u.y - u.r * 0.7 + Math.sin(u.aim) * u.r * 0.5;
      S.poly(g, [[sx - 8, sy - 10], [sx + 8, sy - 10], [sx + 8, sy + 2], [sx, sy + 12], [sx - 8, sy + 2]], { fill: '#8a8c92', w: 1.4 });
      S.line(g, sx, sy - 8, sx, sy + 8, 1.2, '#c9a227', 0.4, 1);
    }
    if (u.enraged) { g.globalAlpha = 0.35 + 0.15 * Math.sin(G.Game.time * 8); S.circle(g, u.x, u.y, u.r + 14, { ry: (u.r + 14) * 0.45, stroke: '#9b2c20', w: 3, single: true }); g.globalAlpha = 1; }
    if (u.bubble && u.bubble.t > 0) R.bubble(g, u.x, u.y - u.r * 2.6 - 6, u.bubble.text, Math.min(1, u.bubble.t * 2));
    if (u.invulnFx) { g.globalAlpha = 0.5; S.circle(g, u.x, u.y - 8, u.r + 12, { stroke: '#e2c043', w: 3, single: true }); g.globalAlpha = 1; }
    g.globalAlpha = 1;
  };

  R.npc = function (g, n) {
    S.begin(n.id || 7);
    if (!n.noShadow && n.look !== 'portal' && n.look !== 'citygate') shadow(g, n.x, n.y + 2, n.small ? 7 : 13);
    if (NPC_LOOK[n.look]) NPC_LOOK[n.look](g, n);
    if (n.title) {
      S.text(g, n.name, n.x, n.y - (n.look === 'portal' ? 34 : n.look === 'citygate' ? 60 : 40), 19, '#2b2118', 'center', 'rgba(236,224,196,0.9)');
      S.text(g, n.title, n.x, n.y - (n.look === 'portal' ? 18 : n.look === 'citygate' ? 44 : 25), 14, n.col, 'center', 'rgba(236,224,196,0.9)');
    } else if (n.showName) S.text(g, n.name, n.x, n.y - 38, 15, '#5a4a3a', 'center', 'rgba(236,224,196,0.8)');
    if (n.bubble && n.bubble.t > 0) R.bubble(g, n.x, n.y - (n.small ? 18 : 46), n.bubble.text, Math.min(1, n.bubble.t * 2));
  };

  // Barre de vie au-dessus des ennemis
  R.hpBar = function (g, u) {
    if (u.boss || u.dummyUnit || (u.hp >= u.maxHp && !(u.elite && !u.minion && u.aggro))) return;
    const w = Math.max(26, u.r * 2.4), x = u.x - w / 2, y = u.y - u.r * 2 - 14;
    g.fillStyle = 'rgba(43,33,24,0.25)'; g.fillRect(x, y, w, 4);
    g.fillStyle = u.faction === 'p' ? '#4f8a2a' : '#9b2c20';
    g.fillRect(x, y, w * Math.max(0, u.hp / u.maxHp), 4);
    g.strokeStyle = INK; g.lineWidth = 0.8; g.strokeRect(x, y, w, 4);
    if (u.elite && !u.minion) {
      S.text(g, '★', x - 7, y + 2, 12, '#c9a227');
      if (u.affixText) S.text(g, u.affixText, u.x, y - 9, 14, '#7a2734', 'center', 'rgba(236,224,196,0.85)');
    }
  };

  // ---------- Projectiles ----------
  R.proj = function (g, p) {
    S.begin(p.id);
    const ang = Math.atan2(p.vy, p.vx);
    switch (p.look) {
      case 'arrow':
        S.line(g, p.x - Math.cos(ang) * 14, p.y - Math.sin(ang) * 14, p.x, p.y, 1.6, '#5b4a33', 0.5, 1);
        S.poly(g, [[p.x + Math.cos(ang) * 4, p.y + Math.sin(ang) * 4], [p.x - Math.sin(ang) * 3, p.y + Math.cos(ang) * 3], [p.x + Math.sin(ang) * 3, p.y - Math.cos(ang) * 3]], { fill: '#2b2118', w: 0.8, single: true });
        break;
      case 'wave':
        g.strokeStyle = p.color; g.lineWidth = 3;
        g.beginPath(); g.arc(p.x - Math.cos(ang) * 6, p.y - Math.sin(ang) * 6, 14, ang - 1.1, ang + 1.1); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
        break;
      case 'note':
        S.circle(g, p.x, p.y, 4, { ry: 3, fill: p.color, w: 1 });
        S.line(g, p.x + 4, p.y, p.x + 4, p.y - 11, 1.4, INK, 0.4, 1); S.line(g, p.x + 4, p.y - 11, p.x + 9, p.y - 7, 1.4, INK, 0.4, 1);
        break;
      case 'hammer':
        g.save(); g.translate(p.x, p.y); g.rotate(G.Game.time * 14);
        S.rect(g, -6, -4, 12, 8, { fill: p.color, w: 1.2 }); S.line(g, 0, 4, 0, 12, 2, '#6b4a2c');
        g.restore();
        break;
      case 'fire':
        S.circle(g, p.x, p.y, p.r + 2, { fill: '#e8a33a', w: 1.2 });
        S.circle(g, p.x - Math.cos(ang) * 4, p.y - Math.sin(ang) * 4, p.r * 0.6, { fill: '#a8321f', w: 0.8, single: true });
        break;
      case 'bomb':
        S.circle(g, p.x, p.y, 6, { fill: '#2b2118', w: 1 });
        break;
      case 'card':
        g.save(); g.translate(p.x, p.y); g.rotate(G.Game.time * 12 + p.id);
        S.rect(g, -5, -7, 10, 14, { fill: '#f7f2e6', w: 1 });
        g.fillStyle = p.color; g.beginPath(); g.moveTo(0, -4); g.lineTo(3, 0); g.lineTo(0, 4); g.lineTo(-3, 0); g.closePath(); g.fill();
        g.restore();
        break;
      default:
        g.globalAlpha = 0.3; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.r * 2, 0, G.TAU); g.fill(); g.globalAlpha = 1;
        S.circle(g, p.x, p.y, p.r, { fill: p.color, w: 1.1 });
    }
  };

  // ---------- Zones de danger (télégraphes) ----------
  R.hazard = function (g, h) {
    S.begin(h.id);
    const p = Math.min(1, h.t / h.delay);
    const enemy = h.faction === 'e';
    const col = h.color || (enemy ? '#b3261e' : '#e2c043');
    g.save();
    g.beginPath();
    if (h.shape === 'circle') g.ellipse(h.x, h.y, h.r, h.r * 0.75, 0, 0, G.TAU);
    else if (h.shape === 'cone') { g.moveTo(h.x, h.y); g.arc(h.x, h.y, h.r, h.ang - h.arc / 2, h.ang + h.arc / 2); g.closePath(); }
    else if (h.shape === 'line') {
      const c = Math.cos(h.ang), s = Math.sin(h.ang), px = -s * h.width / 2, py = c * h.width / 2;
      g.moveTo(h.x + px, h.y + py); g.lineTo(h.x + c * h.len + px, h.y + s * h.len + py); g.lineTo(h.x + c * h.len - px, h.y + s * h.len - py); g.lineTo(h.x - px, h.y - py); g.closePath();
    }
    g.globalAlpha = enemy ? 0.12 : 0.1; g.fillStyle = col; g.fill();
    g.globalAlpha = enemy ? 0.75 : 0.6; g.strokeStyle = col; g.lineWidth = 1.8; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]);
    g.clip();
    // remplissage progressif hachuré
    if (!h.warnOnly || true) {
      g.globalAlpha = 1;
      if (h.shape === 'circle') {
        g.beginPath(); g.ellipse(h.x, h.y, h.r * p, h.r * p * 0.75, 0, 0, G.TAU); g.clip();
        S.hatchArea(g, h.x - h.r, h.y - h.r, h.r * 2, h.r * 2, { sp: 6, c: col, a: enemy ? 0.55 : 0.45, w: 1.4 });
      } else if (h.shape === 'cone') {
        g.beginPath(); g.moveTo(h.x, h.y); g.arc(h.x, h.y, h.r * p, h.ang - h.arc / 2, h.ang + h.arc / 2); g.closePath(); g.clip();
        S.hatchArea(g, h.x - h.r, h.y - h.r, h.r * 2, h.r * 2, { sp: 6, c: col, a: 0.55, w: 1.4 });
      } else {
        const c = Math.cos(h.ang), s = Math.sin(h.ang);
        const L = h.len * p, px = -s * h.width / 2, py = c * h.width / 2;
        g.beginPath(); g.moveTo(h.x + px, h.y + py); g.lineTo(h.x + c * L + px, h.y + s * L + py); g.lineTo(h.x + c * L - px, h.y + s * L - py); g.lineTo(h.x - px, h.y - py); g.closePath(); g.clip();
        const mx = h.x + c * h.len / 2, my = h.y + s * h.len / 2;
        S.hatchArea(g, mx - h.len / 2 - h.width, my - h.len / 2 - h.width, h.len + h.width * 2, h.len + h.width * 2, { sp: 6, c: col, a: h.warnOnly ? 0.3 : 0.55, w: 1.4 });
      }
    }
    g.restore();
    g.globalAlpha = 1;
    if (h.drop && p < 1) dropFx(g, h, p);
  };
  // stalactite, météore ou braise qui tombe du ciel sur la zone annoncée
  function dropFx(g, h, p) {
    const k = p * p, y = h.y - (1 - k) * 260, x = h.x + (1 - k) * 30, s = 0.6 + k * 0.6;
    g.globalAlpha = 0.25 + 0.4 * k; g.fillStyle = '#1d1610';
    g.beginPath(); g.ellipse(h.x, h.y, h.r * 0.35 * (0.4 + k), h.r * 0.2 * (0.4 + k), 0, 0, G.TAU); g.fill();
    g.globalAlpha = 1;
    if (h.drop === 'icicle') {
      S.poly(g, [[x - 7 * s, y - 26 * s], [x + 7 * s, y - 26 * s], [x, y]], { fill: '#cfe7f5', w: 1.3, over: 1 });
      S.line(g, x - 2 * s, y - 24 * s, x, y - 6 * s, 1, '#ffffff', 0.3, 1);
    } else {
      const ash = h.drop === 'ash';
      g.globalAlpha = 0.5; g.strokeStyle = ash ? '#9a948a' : '#f2a03a'; g.lineWidth = 4 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + 14 * s, y - 34 * s); g.lineTo(x, y); g.stroke(); g.globalAlpha = 1;
      S.circle(g, x, y, (ash ? 6 : 9) * s, { fill: ash ? '#5a524a' : '#c4461d', w: 1.2 });
      S.circle(g, x - 2 * s, y - 2 * s, (ash ? 2.5 : 4) * s, { fill: '#ffb04a', w: 0.6, single: true });
    }
  }

  R.zone = function (g, z) {
    S.begin(z.id);
    if (z.kind === 'tornado' || z.kind === 'whirl') {
      const t = G.Game.time, warm = z.warm && z.t < z.warm ? 0.35 : 1;
      const a = Math.min(1, z.t * 3, (z.dur - z.t) * 3) * warm;
      g.save();
      g.globalAlpha = 0.16 * a; g.fillStyle = z.color;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, G.TAU); g.fill();
      g.strokeStyle = z.color; g.lineWidth = 2;
      const dir = z.kind === 'whirl' ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        g.globalAlpha = 0.75 * a;
        g.beginPath();
        for (let i = 0; i <= 26; i++) {
          const f = i / 26, rad = z.r * (1 - f * 0.85), ang = dir * (t * (z.kind === 'whirl' ? 2.4 : 5) + f * 5.5) + (k * G.TAU) / 3;
          const px = z.x + Math.cos(ang) * rad, py = z.y + Math.sin(ang) * rad * 0.75 - (z.kind === 'tornado' ? f * 46 : 0);
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
      }
      g.globalAlpha = 0.8 * a; S.circle(g, z.x, z.y, z.r, { ry: z.r * 0.75, stroke: z.color, w: 1.4, single: true });
      g.restore(); g.globalAlpha = 1;
      return;
    }
    if (ZONE_LOOK[z.kind]) { ZONE_LOOK[z.kind](g, z); return; }
    const a = Math.min(1, z.t * 3, (z.dur - z.t) * 3);
    g.save();
    g.globalAlpha = 0.18 * a; g.fillStyle = z.color;
    g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, G.TAU); g.fill();
    g.globalAlpha = 0.7 * a;
    S.circle(g, z.x, z.y, z.r, { ry: z.r * 0.75, stroke: z.color, w: 1.6, single: true });
    g.clip();
    g.globalAlpha = 0.35 * a;
    S.hatchArea(g, z.x - z.r, z.y - z.r, z.r * 2, z.r * 2, { sp: 9, ang: 0.6, c: z.color, a: 0.5, w: 1 });
    g.restore(); g.globalAlpha = 1;
  };

  const zoneAlpha = (z) => Math.min(1, z.t * 3, (z.dur - z.t) * 3) * (z.warm && z.t < z.warm ? 0.4 : 1);
  const ZONE_LOOK = {
    lava(g, z) {
      const a = zoneAlpha(z), t = G.Game.time;
      g.save();
      g.globalAlpha = 0.75 * a; g.fillStyle = '#c4461d';
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, G.TAU); g.fill();
      g.globalAlpha = 0.85 * a; g.fillStyle = '#f2a03a'; S.blobPath(g, z.x, z.y, z.r * 0.62, z.r * 0.42, 3); g.fill();
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.9 + i * 0.37 + z.id * 0.13) % 1, bx = z.x + Math.cos(i * 2.1 + z.id) * z.r * 0.45, by = z.y + Math.sin(i * 2.1 + z.id) * z.r * 0.3;
        g.globalAlpha = a * (1 - ph); g.strokeStyle = '#ffd36a'; g.lineWidth = 1.2; g.beginPath(); g.arc(bx, by, 2 + ph * 5, 0, G.TAU); g.stroke();
      }
      g.globalAlpha = 0.9 * a; S.circle(g, z.x, z.y, z.r, { ry: z.r * 0.72, stroke: '#4a2014', w: 1.6, single: true });
      g.restore(); g.globalAlpha = 1;
    },
    sand(g, z) {
      const a = zoneAlpha(z), t = G.Game.time;
      g.save();
      g.globalAlpha = 0.28 * a; g.fillStyle = '#a07a42';
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, G.TAU); g.fill();
      g.strokeStyle = '#7a5a2a'; g.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        g.globalAlpha = 0.6 * a; g.setLineDash([3, 5]); g.beginPath();
        for (let i = 0; i <= 22; i++) {
          const f = i / 22, rad = z.r * (1 - f * 0.9), ang = t * 1.4 + f * 5 + (k * G.TAU) / 3;
          const px = z.x + Math.cos(ang) * rad, py = z.y + Math.sin(ang) * rad * 0.72;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
      }
      g.setLineDash([]);
      g.globalAlpha = 0.7 * a; S.circle(g, z.x, z.y, z.r, { ry: z.r * 0.72, stroke: '#7a5a2a', w: 1.3, single: true });
      g.restore(); g.globalAlpha = 1;
    },
    sleep(g, z) {
      const a = zoneAlpha(z), t = G.Game.time;
      g.save();
      for (let k = 0; k < 4; k++) {
        const ox = Math.cos(t * 0.6 + k * 1.7 + z.id) * z.r * 0.25, oy = Math.sin(t * 0.5 + k * 2.3) * z.r * 0.15;
        g.globalAlpha = 0.13 * a; g.fillStyle = k % 2 ? '#9c7cc4' : '#c9a0f0';
        g.beginPath(); g.ellipse(z.x + ox, z.y + oy, z.r * (0.75 + 0.1 * k), z.r * 0.55, 0, 0, G.TAU); g.fill();
      }
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.4 + i / 3 + z.id * 0.1) % 1;
        g.globalAlpha = a * Math.sin(ph * Math.PI);
        S.text(g, 'z', z.x + Math.cos(i * 2.2 + z.id) * z.r * 0.4 + ph * 10, z.y - ph * 40, 14 + i * 3, '#6a3f86');
      }
      g.globalAlpha = 0.45 * a; g.setLineDash([4, 6]); g.strokeStyle = '#7b3fa6'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, G.TAU); g.stroke(); g.setLineDash([]);
      g.restore(); g.globalAlpha = 1;
    },
    void(g, z) {
      const a = zoneAlpha(z), t = G.Game.time;
      g.save();
      g.globalAlpha = 0.85 * a; g.fillStyle = '#07040f';
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, G.TAU); g.fill();
      g.strokeStyle = '#9b6fe0'; g.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) {
        g.globalAlpha = 0.6 * a; g.beginPath();
        for (let i = 0; i <= 20; i++) {
          const f = i / 20, rad = z.r * (1 - f * 0.85), ang = -t * 2 + f * 4.5 + (k * G.TAU) / 3;
          const px = z.x + Math.cos(ang) * rad, py = z.y + Math.sin(ang) * rad * 0.72;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
      }
      g.globalAlpha = 0.9 * a; S.circle(g, z.x, z.y, z.r, { ry: z.r * 0.72, stroke: '#b48ae0', w: 1.8, single: true });
      g.globalAlpha = a; g.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) { const ang = t * 1.5 + i * 1.6 + z.id, rad = z.r * (0.3 + 0.15 * i); g.fillRect(z.x + Math.cos(ang) * rad, z.y + Math.sin(ang) * rad * 0.72, 1.6, 1.6); }
      g.restore(); g.globalAlpha = 1;
    },
  };

  R.drop = function (g, d, t) {
    S.begin(d.id);
    const bob = Math.sin(t * 4 + d.id) * 2;
    if (d.kind === 'gold') {
      S.circle(g, d.x, d.y - 4 + bob, 5, { fill: '#d9b52e', w: 1.1 });
      S.circle(g, d.x + 4, d.y - 1 + bob, 4, { fill: '#c9a227', w: 1 });
    } else if (d.kind === 'item') {
      const col = G.D.RARITY[d.item.rarity].color;
      if (d.item.rarity >= 2) { g.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5); g.fillStyle = col; g.beginPath(); g.arc(d.x, d.y - 6, 18, 0, G.TAU); g.fill(); g.globalAlpha = 1; }
      S.poly(g, [[d.x - 8, d.y + 2 + bob], [d.x - 6, d.y - 10 + bob], [d.x + 6, d.y - 10 + bob], [d.x + 8, d.y + 2 + bob]], { fill: col, w: 1.4 });
      S.line(g, d.x - 5, d.y - 10 + bob, d.x + 5, d.y - 10 + bob, 2.2, '#4a3524');
      if (d.item.rarity >= 3) for (let i = 0; i < 2; i++) { const a = t * 2 + i * 3; g.fillStyle = col; g.fillRect(d.x + Math.cos(a) * 14, d.y - 8 + Math.sin(a) * 8, 2.5, 2.5); }
    } else if (d.kind === 'potion') {
      S.circle(g, d.x, d.y - 4 + bob, 6, { fill: '#a8321f', w: 1.2 });
      S.rect(g, d.x - 2, d.y - 14 + bob, 4, 5, { fill: '#cfc7b4', w: 0.8 });
    }
  };

  R.chest = function (g, c) {
    S.begin(c.id, true);
    const x = c.x, y = c.y;
    shadow(g, x, y + 8, 16);
    S.rect(g, x - 15, y - 8, 30, 18, { fill: '#8a6236', w: 1.8 });
    if (c.opened) S.poly(g, [[x - 15, y - 8], [x - 12, y - 22], [x + 18, y - 22], [x + 15, y - 8]], { fill: '#6b4a2c', w: 1.6 });
    else S.rect(g, x - 16, y - 14, 32, 8, { fill: '#6b4a2c', w: 1.6 });
    S.line(g, x - 15, y + 1, x + 15, y + 1, 1.4, '#c9a227');
    S.rect(g, x - 3, y - 6, 6, 7, { fill: '#c9a227', w: 1 });
  };

  R.corpse = function (g, c) {
    S.begin(c.id, true);
    g.globalAlpha = Math.min(1, c.t / 2) * 0.7;
    const s = c.r / 13;
    S.circle(g, c.x, c.y, 11 * s, { ry: 5 * s, fill: c.boss ? '#5a2a2a' : '#6b5a4a', w: 1.2 });
    S.line(g, c.x - 9 * s, c.y - 2, c.x + 9 * s, c.y + 2, 1.2);
    if (!c.tried && G.Game.player && G.Game.player.cls === 'necromancien') {
      g.globalAlpha = 0.5 + 0.3 * Math.sin(G.Game.time * 5);
      S.circle(g, c.x, c.y, 16 * s, { ry: 7 * s, stroke: '#5bd04a', w: 1.2, single: true });
    }
    g.globalAlpha = 1;
  };

  R.gate = function (g, m) {
    if (!m.gateLocked) return;
    const T = G.D.TILE;
    S.begin(77);
    m.gate.forEach(([x, y]) => {
      const px = x * T, py = y * T;
      S.rect(g, px + 2, py + 2, T - 4, T - 4, { fill: '#3b342d', fillA: 0.5, w: 1.4 });
      for (let i = 1; i < 4; i++) S.line(g, px + i * 8, py, px + i * 8, py + T, 2.2, '#4a4a50', 0.6, 1);
    });
  };

  R.portalExit = function (g, p, t) {
    S.begin(p.id);
    const col = p.victory ? '#c9a227' : '#7b3fa6';
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = 0.6 - i * 0.12;
      S.circle(g, p.x, p.y, 28 - i * 6 + Math.sin(t * 3 + i) * 2, { ry: 17 - i * 3, fill: i === 0 ? col : null, fillA: 0.45, stroke: col, w: 1.6 });
    }
    g.globalAlpha = 1;
    S.text(g, p.victory ? 'Retour à Havre-Gris' : 'Sortie', p.x, p.y - 30, 18, '#2b2118', 'center', 'rgba(236,224,196,0.85)');
  };
})();
