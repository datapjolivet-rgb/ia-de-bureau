// Cœur du jeu : scènes, combat, IA des monstres, sorts, butin, mort, quêtes, vie de la ville.
// Le rendu (dessin, lumière, ambiance) est dans fx.js.
(function () {
  const D = G.D, W = G.W, I = G.I, S = G.S;
  const T = D.TILE;
  const DEG = Math.PI / 180;

  const Game = (G.Game = {
    W: 1280, H: 720, time: 0, mode: 'title', paused: false,
    keys: {}, mouse: { x: 640, y: 360, wx: 0, wy: 0, down: false },
    cam: { x: 0, y: 0, shake: 0 }, scene: null, player: null, char: null,
  });
  const mapCache = {};
  const tuto = (ev, data) => { if (G.Tuto && Game.scene && Game.scene.kind === 'tuto') G.Tuto.event(ev, data); };

  // ================= Personnage =================
  Game.newChar = function (name, cls, skipTuto, hardcore) {
    return {
      name, cls, lvl: 1, xp: 0, gold: 40, potions: 3,
      equip: { arme: I.make({ cls, slot: 'arme', rarity: 0, ilvl: 1 }), torse: I.make({ cls, slot: 'torse', rarity: 0, ilvl: 1 }) },
      bag: [], abil: { 1: 1, 2: 1 }, talents: {}, quests: {}, cleared: 0, boundBoss: null, deaths: 0, kills: {}, shop: null,
      tuto: skipTuto ? 'done' : 'todo', hardcore: !!hardcore, time: 0, created: Date.now(),
    };
  };

  Game.start = function (char) {
    Game.char = char;
    if (!char.shop) Game.refreshShop();
    if (char.tuto === 'todo') Game.enterTuto();
    else Game.enterTown('plaza');
  };

  Game.refreshStats = function () {
    const p = Game.player, ch = Game.char;
    if (!p) return;
    const ratio = p.maxHp ? p.hp / p.maxHp : 1;
    p.st = I.charStats(ch);
    p.maxHp = p.st.maxHp;
    p.hp = Math.min(p.maxHp, Math.max(1, ratio * p.maxHp));
    p.resMax = p.st.resMax;
    p.res = Math.min(p.res, p.resMax);
  };

  function makePlayer(ch) {
    const C = D.CLASSES[ch.cls];
    const p = {
      id: G.uid(), isPlayer: true, faction: 'p', cls: ch.cls, look: ch.cls, name: ch.name, x: 0, y: 0, r: 13,
      hp: 1, maxHp: 1, res: 0, resMax: 100, cds: {}, cdMax: {}, buffs: [], hots: [], dots: [], shield: 0, shieldT: 0,
      aim: 0, facing: 1, walk: 0, swingT: 0, swingDir: 1, stunT: 0, slowT: 0, slowAmt: 0, combatT: 99, potionCd: 0, invulnT: 0, hitT: 0,
      vx: 0, vy: 0, stepT: 0,
    };
    Game.player = p;
    Game.refreshStats();
    p.hp = p.maxHp;
    p.res = D.RES[C.res].start ? p.resMax : 0;
    return p;
  }

  // ================= Scènes =================
  function newScene(map, kind) {
    return {
      map, kind, units: [], projs: [], hazards: [], zones: [], drops: [], corpses: [], texts: [], parts: [], chests: [], portals: [],
      timers: [], npcs: [], emitters: [], decals: [], ambient: [], birds: [], boss: null, run: null, prompt: null, t0: Game.time,
    };
  }

  function snapCam() {
    const p = Game.player, m = Game.scene.map;
    Game.cam.x = G.clamp(p.x - Game.W / 2, 0, Math.max(0, m.w * T - Game.W));
    Game.cam.y = G.clamp(p.y - 10 - Game.H / 2, 0, Math.max(0, m.h * T - Game.H));
  }

  Game.enterTown = function (where) {
    const m = mapCache.town || W.buildTown();
    if (!m.img) W.render(m);
    mapCache.town = m;
    const sc = newScene(m, 'town');
    sc.npcs = m.npcs.map((n) => Object.assign({}, n, { role: n.id, id: G.uid(), facing: 1, aim: Math.PI / 2, walk: 0, swingT: 0 }));
    // habitants et animaux
    const rng = Math.random;
    D.VILLAGERS.forEach((v, i) => {
      const wp = m.paths[(i * 5) % m.paths.length];
      sc.npcs.push({ role: 'villager', id: G.uid(), name: v.name, look: 'villager', body: v.body, hat: v.hat, carry: i % 3 === 0 ? 'basket' : i % 3 === 1 ? 'bread' : null, showName: true,
        x: wp[0], y: wp[1], r: 11, facing: 1, aim: 0, walk: 0, swingT: 0, wander: true, target: null, wait: rng() * 3, chatCd: 4 + rng() * 10, speed: 55 + rng() * 20, stuck: 0 });
    });
    m.critters.chickens.forEach(([x, y]) => sc.npcs.push({ role: 'chicken', id: G.uid(), name: 'Poule', look: 'chicken', small: true, x: x * T, y: y * T, hx: x * T, hy: y * T, r: 7, facing: 1, aim: 0, walk: 0, wait: rng() * 2, peck: 0 }));
    sc.npcs.push({ role: 'cat', id: G.uid(), name: 'Moustache', look: 'cat', small: true, x: m.critters.cat[0] * T, y: m.critters.cat[1] * T, hx: m.critters.cat[0] * T, hy: m.critters.cat[1] * T, r: 8, facing: -1, aim: 0, walk: 0, wait: 2, sit: true });
    // mannequins d'entraînement près de la porte sud
    m.dummies.forEach(([x, y]) => sc.units.push(makeMonster('dummy', x * T, y * T, 1, false)));
    const p = makePlayer(Game.char);
    const sp = m.spawns[where] || m.spawns.plaza;
    p.x = sp.x; p.y = sp.y;
    sc.units.push(p);
    Game.scene = sc;
    Game.mode = 'play';
    snapCam();
    G.UI.onScene();
    Game.save();
  };

  Game.enterTuto = function () {
    const m = mapCache.tuto || W.buildTuto();
    if (!m.img) W.render(m);
    mapCache.tuto = m;
    const sc = newScene(m, 'tuto');
    sc.npcs = m.npcs.map((n) => Object.assign({}, n, { role: n.id, id: G.uid(), facing: -1, aim: 0, walk: 0, swingT: 0, noShadow: true }));
    const sp = m.spots;
    sc.npcs.push({ role: 'brenna', id: G.uid(), name: 'Sergente Brenna', title: 'Instructrice', look: 'brenna', col: '#8c3b2a', x: sp.brenna[0] * T, y: sp.brenna[1] * T, r: 12, facing: -1, aim: Math.PI, walk: 0, swingT: 0, goal: null, speed: 150 });
    sp.dummies.forEach(([x, y]) => sc.units.push(makeMonster('dummy', x * T, y * T, 1, false)));
    const rune = makeMonster('runeStone', sp.rune[0] * T, sp.rune[1] * T, 1, false);
    sc.units.push(rune);
    sp.rats.forEach(([x, y]) => { const r = makeMonster('rat', x * T, y * T, 1, false); r.dormant = true; r.tutoRat = true; sc.units.push(r); });
    const p = makePlayer(Game.char);
    p.x = m.spawn.x; p.y = m.spawn.y;
    sc.units.push(p);
    Game.scene = sc;
    Game.mode = 'play';
    snapCam();
    G.UI.onScene();
    if (G.Tuto) G.Tuto.start();
    Game.save();
  };

  Game.finishTuto = function () {
    Game.char.tuto = 'done';
    if (G.Tuto) G.Tuto.stop();
    Game.enterTown('gate');
    G.UI.toast('Bienvenue à Havre-Gris, ' + Game.char.name + ' ! Allez voir le Capitaine Aldric à la Garnison.', '#4f6b2b', 6);
  };

  Game.dungeonUnlocked = (id) => id === 1 || Game.char.cleared >= id - 1;

  Game.enterDungeon = function (def) {
    const m = W.buildDungeon(def);
    if (mapCache['d' + def.id]) m.img = mapCache['d' + def.id];
    else { W.render(m); mapCache['d' + def.id] = m.img; }
    W.initFog(m);
    const sc = newScene(m, 'dungeon');
    sc.def = def;
    sc.run = { t0: Game.time, kills: 0, gold: 0, items: [], xp: 0 };
    const p = makePlayer(Game.char);
    p.x = m.spawn.x; p.y = m.spawn.y;
    sc.units.push(p);
    Game.scene = sc;
    spawnDungeon(sc, m, def);
    sc.portals.push({ id: G.uid(), x: m.spawn.x - 70, y: m.spawn.y, victory: false });
    // Boss lié (nécromancien) : il combat à vos côtés pendant tout ce donjon
    if (Game.char.boundBoss && D.MONSTERS[Game.char.boundBoss]) {
      const b = makeMinion(Game.char.boundBoss, p.x + 40, p.y, def.lvl + 2, false, true);
      sc.units.push(b);
      sc.usedBound = true;
      text(p.x, p.y - 50, D.MONSTERS[Game.char.boundBoss].name + ' vous sert !', '#3f7d2a', 20);
    }
    Game.mode = 'play';
    snapCam();
    W.reveal(m, p.x, p.y, 7);
    G.UI.onScene();
    G.UI.toast(def.name, '#2b2118', 3);
  };

  // dégâts « typiques » d'un monstre de ce donjon (pour les pièges du décor)
  const envDmg = (def) => 20 * D.DIFF.monDmg * (1 + 0.16 * (def.lvl - 1));
  const SINKS = {
    sand: { kind: 'sand', color: '#a07a42', pull: 55, slow: 0.35, dmg: 0, cause: 'les sables mouvants' },
    sleepfog: { kind: 'sleep', color: '#9c7cc4', slow: 0.2, sleepy: true, dmg: 0, cause: 'la brume du sommeil' },
    rift: { kind: 'void', color: '#5a3f86', pull: 70, dmg: 0.05, cause: 'un puits du Néant' },
  };
  function spawnDungeon(sc, m, def) {
    const rng = G.seeded(def.id * 7331 + 5);
    (m.sinks || []).forEach((k) => {
      const Z = SINKS[k.kind];
      if (!Z) return;
      sc.zones.push({ id: G.uid(), kind: Z.kind, x: k.x, y: k.y, r: k.r, dur: 1e9, t: 1, interval: 0.5, acc: 0, dmg: Z.dmg * envDmg(def), faction: 'e', src: null,
        color: Z.color, pull: Z.pull, slow: Z.slow, sleepy: Z.sleepy, cause: Z.cause, static: true });
    });
    const affixN = def.id >= 3 ? 2 : 1;
    m.rooms.forEach((r, ri) => {
      W.parseSpawns(r.spec).forEach((sp) => {
        if (sp.special === 'chest') {
          let x, y, tries = 0;
          do { x = (r.x + 2 + rng() * (r.w - 4)) * T; y = (r.y + 1.6) * T; } while (W.collides(m, x, y, 16) && ++tries < 20);
          sc.chests.push({ id: G.uid(), x, y, opened: false, lvl: def.lvl + Math.floor(ri / 2) });
          return;
        }
        if (sp.special === 'boss') {
          const b = makeMonster(def.boss, (r.x + r.w / 2) * T, (r.y + r.h / 2) * T, def.lvl + 2, false);
          if (W.collides(m, b.x, b.y, b.r)) b.y -= T;
          b.dormant = true; b.bossRoom = r;
          sc.boss = b; sc.units.push(b);
          return;
        }
        if (!sp.type) return;
        // un monstre de plus par groupe (sauf dans les toutes premières salles du jeu)
        const n = sp.n + (sp.n >= 2 && !sp.elite && (def.id > 1 || ri >= 3) ? D.DIFF.extra : 0);
        for (let i = 0; i < n; i++) {
          let x, y, tries = 0;
          do { x = (r.x + 1.5 + rng() * (r.w - 3)) * T; y = (r.y + 1.5 + rng() * (r.h - 3)) * T; } while (W.collides(m, x, y, 18) && ++tries < 30);
          sc.units.push(makeMonster(sp.type, x, y, def.lvl + Math.floor(ri / 2), sp.elite, { affixes: affixN }));
        }
      });
    });
  }

  function makeMonster(type, x, y, lvl, elite, opts) {
    const d = D.MONSTERS[type], X = D.DIFF;
    let hp = d.boss || d.dummy ? d.hp : d.hp * X.monHp * (1 + 0.25 * (lvl - 1));
    let dmg = d.boss ? d.dmg : d.dmg * (d.dummy ? 1 : X.monDmg) * (1 + 0.16 * (lvl - 1));
    if (elite) { hp *= X.eliteHp; dmg *= X.eliteDmg; }
    hp = Math.round(hp);
    const u = {
      id: G.uid(), type, def: d, name: d.name, x, y, r: d.r * (elite ? 1.25 : 1), hp, maxHp: hp, dmg, speed: d.speed, lvl, elite, boss: !!d.boss,
      faction: 'e', look: d.look, col: d.col, atkCd: {}, gcd: G.rnd(0.4, 1.4), aggro: false, facing: 1, aim: 0, walk: Math.random() * 6,
      hitT: 0, stunT: 0, slowT: 0, slowAmt: 0, weakT: 0, weakAmt: 0, dots: [], phase: 0, cast: null, dash: null, swingT: 0, vx: 0, vy: 0,
      dummyUnit: !!d.dummy, windupMul: 1,
    };
    if (d.dummy) { u.aggro = false; u.dmgLog = []; u.dps = null; u.dpsShow = 0; }
    if (elite && !d.boss && !d.dummy) applyAffixes(u, (opts && opts.affixes) || 1);
    atkList(u).forEach((a, i) => (u.atkCd[u.phase + '_' + i] = Math.random() * a.cd * 0.6));
    return u;
  }

  function applyAffixes(u, n) {
    const keys = Object.keys(D.AFFIXES).sort(() => Math.random() - 0.5).slice(0, n);
    u.affixes = [];
    keys.forEach((k) => {
      const A = D.AFFIXES[k];
      if (A.hp) { u.maxHp = u.hp = Math.round(u.maxHp * A.hp); }
      if (A.dmg) u.dmg *= A.dmg;
      if (A.speed) u.speed *= A.speed;
      if (A.windup) u.windupMul *= A.windup;
      if (A.vamp) u.vamp = A.vamp;
      if (A.explode) u.explosive = true;
      if (A.chill) u.chill = A.chill;
      u.affixes.push(A.name);
    });
    u.affixText = u.affixes.join(' · ');
  }

  function makeMinion(type, x, y, lvl, elite, bound) {
    const u = makeMonster(type, x, y, lvl, elite);
    const fromBoss = u.boss;
    u.faction = 'p'; u.minion = true; u.aggro = true; u.boss = false; u.bound = !!bound || fromBoss;
    u.maxHp = u.hp = Math.round(u.maxHp * (fromBoss ? 0.5 : 0.6));
    u.dmg *= fromBoss ? 0.5 : 0.65;
    u.life = u.bound ? 1e9 : elite ? 60 : 40;
    u.name = u.name + ' (serviteur)';
    u.explosive = false; u.vamp = 0; u.affixText = null;
    return u;
  }

  function atkList(u) {
    const d = u.def;
    if (d.phases) {
      if (u.minion) return d.phases[0].atks.filter((a) => a.t !== 'summon' && a.t !== 'shieldAdds' && a.t !== 'dive');
      return d.phases[u.phase].atks;
    }
    return d.atks;
  }

  // ================= Effets visuels =================
  function text(x, y, s, color, size, life) {
    Game.scene.texts.push({ x: x + G.rnd(-6, 6), y, s, color: color || '#2b2118', size: size || 18, t: 0, life: life || 1.1 });
  }
  Game.text = text;
  function parts(x, y, n, color, kind, spd) {
    const sc = Game.scene;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * G.TAU, v = (spd || 120) * G.rnd(0.3, 1);
      sc.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0, life: G.rnd(0.3, 0.7), r: G.rnd(1.5, 3.5), color: color || '#2b2118', kind: kind || 'ink' });
    }
  }
  Game.parts = parts;
  function ring(x, y, r, color, life) { Game.scene.parts.push({ x, y, r0: 6, r, t: 0, life: life || 0.35, color: color || '#2b2118', kind: 'ring' }); }
  Game.ring = ring;
  function decal(x, y, r, color, kind) {
    const sc = Game.scene;
    sc.decals.push({ x, y, r, color, kind: kind || 'splat', seed: G.uid(), t: 0 });
    if (sc.decals.length > 160) sc.decals.shift();
  }
  Game.shake = (a) => { if (G.opt('shake')) Game.cam.shake = Math.min(14, Math.max(Game.cam.shake, a)); };

  // ================= Statistiques dynamiques =================
  const hasBuff = (u, id) => u.buffs && u.buffs.some((b) => b.id === id);
  const sumBuff = (u, k) => (u.buffs ? u.buffs.reduce((a, b) => a + (b[k] || 0), 0) : 0);
  function powOf(p) {
    let m = 1 + sumBuff(p, 'pow');
    if (p.cls === 'berserker') m += (1 - p.hp / p.maxHp) * 0.8;
    return p.st.pow * m;
  }
  const critOf = (p) => p.st.crit + sumBuff(p, 'crit');
  const hasteOf = (p) => Math.min(0.9, p.st.haste + sumBuff(p, 'haste'));
  function rollDmg(p, mult, o) {
    o = o || {};
    const crit = o.forceCrit || p.nextCrit || Math.random() < critOf(p);
    let d = powOf(p) * mult * G.rnd(0.92, 1.08);
    if (crit) d *= 1.75;
    if (p.isPlayer && cheat('dmg')) d *= 10;
    if (o.bonus) d *= o.bonus;
    else if (p.stealthStrike) d *= 3;
    return { d, crit };
  }
  // mode créateur : invincibilité, dégâts ×10, sorts sans recharge ni coût
  const cheat = (k) => !!(Game.char && Game.char.cheats && Game.char.cheats[k]);
  function isInvuln(p) { return p.invulnT > 0 || hasBuff(p, 'divin') || (p.dash && p.dash.invuln) || (p.isPlayer && cheat('god')); }
  Game.isInvuln = isInvuln;
  Game.hasBuff = hasBuff;

  // ================= Géométrie des zones =================
  function inEllipse(cx, cy, r, u) {
    const rr = r + u.r * 0.8;
    const dx = (u.x - cx) / rr, dy = (u.y - cy) / (rr * 0.75);
    return dx * dx + dy * dy <= 1;
  }
  function inCone(x, y, ang, range, arc, u) {
    const d = Math.hypot(u.x - x, u.y - y);
    if (d > range + u.r) return false;
    if (d < u.r + 4) return true;
    return Math.abs(G.angDiff(ang, Math.atan2(u.y - y, u.x - x))) <= arc / 2 + Math.atan2(u.r, d);
  }
  function inLine(x, y, ang, len, width, u) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const dx = u.x - x, dy = u.y - y;
    const along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c);
    return along >= -u.r && along <= len + u.r && perp <= width / 2 + u.r;
  }
  Game.shapes = { inEllipse, inCone, inLine };
  const alive = (u) => !u.dead && !u.dormant && !u.hidden;
  const opposing = (f) => Game.scene.units.filter((u) => u.faction !== f && alive(u));

  // Position anticipée d'une cible (les monstres visent là où vous allez)
  function predict(tgt, t) {
    const m = Game.scene.map;
    const x = tgt.x + (tgt.vx || 0) * t, y = tgt.y + (tgt.vy || 0) * t;
    return W.solidAt(m, x, y) ? { x: tgt.x, y: tgt.y } : { x, y };
  }

  // ================= Dégâts =================
  function dealDamage(src, tgt, amt, o) {
    o = o || {};
    if (!tgt || tgt.dead || tgt.dormant || tgt.hidden) return 0;
    if (tgt.faction === 'p') {
      if (tgt.isPlayer) {
        if (isInvuln(tgt)) { if (!cheat('god') && Math.random() < 0.3) text(tgt.x, tgt.y - 40, 'Immunisé', '#c9a227', 16); return 0; }
        if (hasBuff(tgt, 'parade') && !o.isDot && !o.trueDmg) {
          text(tgt.x, tgt.y - 44, 'Parade !', '#c4661a', 22);
          ring(tgt.x, tgt.y - 8, 40, '#c4661a');
          if (src && !src.dead && src.faction === 'e') { const r = rollDmg(tgt, 2); dealDamage(tgt, src, r.d, { crit: r.crit }); }
          return 0;
        }
        if (!o.trueDmg) {
          amt *= (1 - Math.min(0.9, sumBuff(tgt, 'dr'))) * (1 + sumBuff(tgt, 'dtaken'));
          amt *= 1 - I.armorReduc(tgt.st.arm, Game.char.lvl);
        }
      } else amt *= 0.85;
      if (tgt.shield > 0) {
        const a = Math.min(tgt.shield, amt); tgt.shield -= a; amt -= a;
        if (a > 0 && amt <= 0) text(tgt.x, tgt.y - 40, 'Absorbé', '#2f5d8a', 15);
      }
      if (amt <= 0) return 0;
      tgt.hp -= amt; tgt.hitT = 0.15;
      if (tgt.isPlayer) tgt.lastHit = (src && src.name) || o.cause || tgt.lastHit;
      if (src && src.vamp && !src.dead) { src.hp = Math.min(src.maxHp, src.hp + amt * src.vamp); }
      if (tgt.isPlayer) {
        tgt.combatT = 0;
        Game.shake(4 + (amt / tgt.maxHp) * 30);
        if (D.CLASSES[tgt.cls].res === 'rage') gainRes(tgt, (amt / tgt.maxHp) * 60);
        if (G.opt('dmgNums')) text(tgt.x, tgt.y - 36, '-' + Math.round(amt), '#b3261e', 20);
        G.UI.hurt();
        if (Math.random() < 0.35) decal(tgt.x + G.rnd(-8, 8), tgt.y + G.rnd(-2, 6), 3 + Math.random() * 3, '#7a2734');
      } else if (Math.random() < 0.5 && G.opt('dmgNums')) text(tgt.x, tgt.y - 30, '-' + Math.round(amt), '#7a2734', 14);
      if (tgt.hp <= 0) {
        if (tgt.isPlayer && hasBuff(tgt, 'immortel')) tgt.hp = 1;
        else if (tgt.isPlayer && hasBuff(tgt, 'esprit')) {
          tgt.hp = tgt.maxHp * 0.4; tgt.buffs = tgt.buffs.filter((b) => b.id !== 'esprit');
          text(tgt.x, tgt.y - 50, 'Esprit protecteur !', '#c9a227', 24); ring(tgt.x, tgt.y, 90, '#e2c043');
        } else killUnit(tgt, src);
      }
      return amt;
    }
    // ----- cible ennemie -----
    if (tgt.shielded) { if (Math.random() < 0.25) text(tgt.x, tgt.y - tgt.r * 2 - 10, 'Protégé', '#c9a227', 18); return 0; }
    // garde levée : les soldats bloquent les coups de face, sauf pendant qu'ils frappent
    if (tgt.def.guard && !tgt.cast && !(tgt.stunT > 0) && src && !o.isDot) {
      const from = Math.atan2(src.y - tgt.y, src.x - tgt.x);
      if (Math.abs(G.angDiff(tgt.aim, from)) < 65 * DEG) {
        amt *= 1 - tgt.def.guard;
        if (Math.random() < 0.3) text(tgt.x, tgt.y - tgt.r * 2 - 12, 'Bloqué', '#6d665c', 16);
        parts(tgt.x + Math.cos(tgt.aim) * tgt.r, tgt.y - tgt.r, 3, '#c9ccd1', 'spark', 120);
      }
    }
    tgt.hp -= amt; tgt.hitT = 0.12;
    if (!tgt.aggro && !tgt.dummyUnit) aggroUnit(tgt);
    const fromPlayer = src && src.isPlayer;
    if ((fromPlayer || (src && src.minion)) && G.opt('dmgNums')) {
      const big = o.crit;
      text(tgt.x, tgt.y - tgt.r * 2 - 6, Math.round(amt) + (big ? ' !' : ''), big ? '#c4661a' : src.minion ? '#3f7d2a' : '#2b2118', big ? 26 : o.isDot ? 15 : 19);
    }
    if (fromPlayer) {
      src.combatT = 0;
      const ls = (o.lifesteal || 0) + sumBuff(src, 'lifesteal');
      if (ls > 0) healUnit(src, amt * ls, true);
      if (hasBuff(src, 'poison') && !o.isDot) tgt.dots.push({ dps: (amt * 0.5) / 4, t: 4, acc: 0, src });
    }
    parts(tgt.x, tgt.y - tgt.r, o.crit ? 6 : 3, tgt.look === 'inkslime' || tgt.look === 'inkling' ? '#1d1610' : '#2b2118', 'ink', 140);
    if (tgt.dummyUnit) {
      tgt.dmgLog.push([Game.time, amt]);
      tgt.hp = tgt.maxHp;
      tgt.dpsShow = 3;
      if (fromPlayer) tuto('hitDummy', tgt);
      return amt;
    }
    if (tgt.hp <= 0) killUnit(tgt, src);
    return amt;
  }
  Game.dealDamage = dealDamage;

  function hitUnit(src, tgt, amt, o) {
    o = o || {};
    const done = dealDamage(src, tgt, amt, o);
    if (tgt.dead || tgt.faction === 'p' || tgt.dummyUnit) return done;
    if (o.stun) {
      const res = tgt.boss ? 0.3 : tgt.elite ? 0.5 : 1;
      tgt.stunT = Math.max(tgt.stunT, o.stun * res); tgt.sleep = !!o.sleep;
      if (tgt.cast && tgt.cast.atk.t !== 'dive') { tgt.cast = null; cancelHazards(tgt); }
    }
    if (o.slow) { tgt.slowT = 2; tgt.slowAmt = Math.max(tgt.slowAmt, o.slow); }
    if (o.weaken) { tgt.weakT = 1; tgt.weakAmt = o.weaken; }
    if (o.knock && !tgt.boss) {
      const ox = o.kx != null ? o.kx : src.x, oy = o.ky != null ? o.ky : src.y;
      const a = Math.atan2(tgt.y - oy, tgt.x - ox);
      W.move(Game.scene.map, tgt, Math.cos(a) * o.knock * (tgt.elite ? 0.4 : 1), Math.sin(a) * o.knock * (tgt.elite ? 0.4 : 1));
    }
    return done;
  }

  function healUnit(u, amt, quiet) {
    if (u.dead) return;
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + amt);
    const got = u.hp - before;
    if (!quiet && got >= 1) text(u.x, u.y - 44, '+' + Math.round(got), '#3f7d2a', 20);
    else if (quiet && got >= 4 && Math.random() < 0.3) text(u.x, u.y - 44, '+' + Math.round(got), '#3f7d2a', 15);
  }

  function gainRes(p, n) { p.res = G.clamp(p.res + n, 0, p.resMax); }
  function cancelHazards(u) { const sc = Game.scene; sc.hazards = sc.hazards.filter((h) => !(h.src === u && h.follow)); }

  function aggroUnit(u) {
    if (u.aggro || u.dormant || u.dummyUnit) return;
    u.aggro = true;
    Game.scene.units.forEach((o) => { if (o.faction === 'e' && !o.aggro && !o.dormant && !o.dummyUnit && G.dist(o, u) < D.DIFF.alert) o.aggro = true; });
  }

  // ================= Mort d'une unité =================
  function killUnit(u, killer) {
    if (u.dead) return;
    u.dead = true; u.hp = 0;
    const sc = Game.scene;
    parts(u.x, u.y - 8, 14, u.look === 'wisp' ? '#9be0d0' : '#2b2118', 'ink', 200);
    ring(u.x, u.y, u.r * 2.5, '#2b2118');
    cancelHazards(u);
    if (u.isPlayer) { Game.onPlayerDeath(); return; }
    if (u.minion) { if (u.bound) text(u.x, u.y - 40, 'Le serviteur retourne à la poussière', '#3f7d2a', 16); return; }
    decal(u.x, u.y + 2, u.r * 0.9, u.look === 'wisp' ? '#5a8a7a' : '#2b2118');
    if (u.def.deathPool) { const P = u.def.deathPool; sc.zones.push({ id: G.uid(), kind: P.kind, x: u.x, y: u.y, r: P.r, dur: P.dur, t: 0, interval: 0.5, acc: 0, dmg: u.dmg * P.dmgMul, faction: 'e', src: null, color: P.color, sleepy: P.sleepy, slow: P.sleepy ? 0.2 : 0, cause: u.name }); }
    if (u.def.illusion) { text(u.x, u.y - 40, 'Ce n\'était qu\'une illusion…', '#7b3fa6', 18); parts(u.x, u.y - 10, 18, '#9c7cc4', 'spark', 160); }
    if (u.look !== 'wisp' && !u.def.illusion) sc.corpses.push({ id: G.uid(), x: u.x, y: u.y, type: u.type, elite: u.elite, boss: u.boss, lvl: u.lvl, r: u.r, t: 0, life: u.boss ? 120 : 25, tried: false });
    // élite explosive
    if (u.explosive) {
      sc.hazards.push({ id: G.uid(), shape: 'circle', x: u.x, y: u.y, r: 95, t: 0, delay: 1.0, dmg: u.dmg * 1.8, faction: 'e', src: null, color: '#c4661a', bomb: true, cause: u.name + ' (explosion)' });
      text(u.x, u.y - 40, 'Explosif !', '#c4661a', 22);
    }
    // éclats projetés à la mort
    if (u.def.deathRing) {
      const R = u.def.deathRing, off = Math.random() * G.TAU;
      for (let i = 0; i < R.count; i++) {
        const a = off + (i / R.count) * G.TAU;
        spawnProj({ x: u.x, y: u.y - 10, ang: a, speed: R.speed, r: 6, range: 420, faction: 'e', src: null, dmg: u.dmg * R.dmgMul, color: R.color, look: 'orb', cause: u.name + ' (éclats)' });
      }
      ring(u.x, u.y, 70, R.color);
    }
    // l'encre se divise
    if (u.def.split) for (let i = 0; i < u.def.split.n; i++) {
      const a = Math.random() * G.TAU, nx = u.x + Math.cos(a) * 18, ny = u.y + Math.sin(a) * 18;
      const free = !W.collides(sc.map, nx, ny, 9);
      const c = makeMonster(u.def.split.into, free ? nx : u.x, free ? ny : u.y, u.lvl, false);
      c.aggro = true; c.gcd = 0.6;
      sc.units.push(c);
    }
    const ch = Game.char;
    let xp = u.def.xp * (u.boss ? 1 : (1 + 0.3 * (u.lvl - 1)) * (u.elite ? 3 : 1));
    if (!u.boss && ch.lvl > u.lvl + 4) xp *= 0.2;
    if (u.summoned) xp *= 0.3;
    Game.addXp(Math.round(xp));
    const gmin = u.def.gold[0], gmax = u.def.gold[1];
    let gold = G.rint(gmin, gmax) * (u.boss ? 1 : (1 + 0.2 * (u.lvl - 1)) * (u.elite ? 3 : 1));
    if (u.summoned) gold *= 0.2;
    gold = Math.max(1, Math.round(gold));
    const piles = u.boss ? 6 : gold > 10 ? 2 : 1;
    for (let i = 0; i < piles; i++) addDrop(u.x, u.y, { kind: 'gold', amount: Math.max(1, Math.round(gold / piles)) });
    if (!u.summoned && sc.kind === 'dungeon') {
      if (u.boss) for (let i = 0; i < 3; i++) addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl + 1, src: 'boss' }) });
      else if (u.elite) {
        addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl, src: 'elite' }) });
        if (G.chance(0.3)) addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl, src: 'elite' }) });
      } else if (G.chance(0.075)) addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl, src: 'normal' }) });
      if (G.chance(u.elite ? 0.22 : 0.03)) addDrop(u.x, u.y, { kind: 'potion' });
    }
    ch.kills[u.type] = (ch.kills[u.type] || 0) + 1;
    if (sc.run) sc.run.kills++;
    Game.questEvent(u.boss ? 'boss' : 'kill', u.type);
    tuto('kill', u);
    if (u.boss) onBossDeath(u);
  }

  function addDrop(x, y, d) {
    const a = Math.random() * G.TAU, dist = G.rnd(10, 46);
    let tx = x + Math.cos(a) * dist, ty = y + Math.sin(a) * dist;
    if (W.solidAt(Game.scene.map, tx, ty)) { tx = x; ty = y; }
    Game.scene.drops.push(Object.assign({ id: G.uid(), x: tx, y: ty, t: 0 }, d));
  }
  Game.addDrop = addDrop;
  Game.killUnit = killUnit;
  // mode créateur : fait apparaître des monstres (ou des boss) près du joueur
  Game.spawnMonster = function (type, n) {
    const sc = Game.scene, p = Game.player, def = D.MONSTERS[type];
    if (!sc || sc.kind !== 'dungeon' || !def) return 0;
    const lvl = sc.def.lvl + 2;
    for (let i = 0; i < n; i++) {
      let x = p.x, y = p.y;
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * G.TAU, d = G.rnd(130, 210), nx = p.x + Math.cos(a) * d, ny = p.y + Math.sin(a) * d;
        if (!W.collides(sc.map, nx, ny, def.r + 4) && W.los(sc.map, p.x, p.y, nx, ny)) { x = nx; y = ny; break; }
      }
      const u = makeMonster(type, x, y, lvl, false);
      u.aggro = true; u.gcd = 1;
      if (u.boss) u.spawnedBoss = true;
      sc.units.push(u);
      parts(x, y - 10, 14, '#7b3fa6', 'spark', 140); ring(x, y, 50, '#7b3fa6');
    }
    return n;
  };

  function onBossDeath(b) {
    const sc = Game.scene, m = sc.map;
    if (b.spawnedBoss) { G.UI.toast(b.name + ' est vaincu !', '#7b3fa6', 3); ring(b.x, b.y, 180, '#c9a227', 0.6); return; } // boss invoqué en mode créateur
    m.gateLocked = false;
    sc.victory = true;
    sc.emitters = [];
    sc.zones = sc.zones.filter((z) => z.faction !== 'e' || z.static);
    sc.invert = null; sc.eclipse = null; sc.storm = null;
    const r = b.bossRoom;
    let px = (r.x + r.w / 2) * T, py = (r.y + r.h / 2) * T + 60;
    if (W.collides(m, px, py, 20)) py -= 60;
    sc.portals.push({ id: G.uid(), x: px, y: py, victory: true });
    const ch = Game.char;
    const first = ch.cleared < sc.def.id;
    ch.cleared = Math.max(ch.cleared, sc.def.id);
    G.UI.bossBar(null);
    G.UI.toast(first ? 'Fragment du Sceau obtenu ! Donjon suivant débloqué.' : b.name + ' est vaincu !', '#7b3fa6', 5);
    Game.shake(14);
    ring(b.x, b.y, 220, '#c9a227', 0.8);
    sc.units.forEach((u) => { if (u.faction === 'e' && u.summoned && !u.dead) killUnit(u, null); });
    // le Roi Cendré est tombé : le Sceau des Quinze est restauré
    if (b.def.final) {
      const legendBefore = !!ch.legend;
      ch.legend = true; ch.legendAt = ch.legendAt || Date.now();
      if (!legendBefore) sc.timers.push({ t: 3, fn: () => G.UI.showEnding && G.UI.showEnding({ name: ch.name, cls: ch.cls, lvl: ch.lvl, time: ch.time || 0, deaths: ch.deaths || 0, kills: Object.values(ch.kills || {}).reduce((a, n) => a + n, 0), hardcore: !!ch.hardcore }) });
    }
  }

  // ================= Expérience =================
  Game.addXp = function (n) {
    const ch = Game.char, p = Game.player;
    if (ch.lvl >= D.MAX_LEVEL) return;
    ch.xp += n;
    if (Game.scene.run) Game.scene.run.xp += n;
    while (ch.lvl < D.MAX_LEVEL && ch.xp >= D.xpNext(ch.lvl)) {
      ch.xp -= D.xpNext(ch.lvl);
      ch.lvl++;
      Game.refreshStats();
      p.hp = p.maxHp;
      text(p.x, p.y - 60, 'Niveau ' + ch.lvl + ' !', '#7b3fa6', 30, 2);
      ring(p.x, p.y, 120, '#7b3fa6', 0.7);
      G.UI.toast('Niveau ' + ch.lvl + ' ! Vie et puissance augmentées.', '#7b3fa6', 3);
    }
  };

  // ================= Sorts du joueur =================
  let lastWarn = 0;
  function warn(msg) { if (Game.time - lastWarn > 0.8) { lastWarn = Game.time; G.UI.toast(msg, '#9b2c20', 1.5); } }
  Game.warn = warn;

  Game.abilityDef = function (slot) {
    const C = D.CLASSES[Game.char.cls];
    return slot === 0 ? C.basic : C.abil[slot - 1];
  };

  Game.useAbility = function (slot) {
    const p = Game.player, ch = Game.char, sc = Game.scene;
    if (!p || p.dead || Game.mode !== 'play' || p.stunT > 0 || p.dash) return;
    const ab = Game.abilityDef(slot);
    const rank = slot === 0 ? 1 : ch.abil[slot] || 0;
    if (slot > 0 && !rank) { warn(ab.name + ' : à apprendre auprès du Maître des compétences.'); return; }
    if ((p.cds[slot] || 0) > 0) return;
    const free = cheat('nocd');
    const cost = free ? 0 : ab.cost || 0;
    if (p.res < cost) { warn('Pas assez de ' + D.RES[D.CLASSES[ch.cls].res].name.toLowerCase() + '.'); return; }
    const c = { rk: 1 + 0.25 * (rank - 1), tx: Game.mouse.wx, ty: Game.mouse.wy };
    for (const fx of ab.fx) {
      if (fx.k === 'raise' && !findCorpse(c.tx, c.ty)) { warn('Aucun cadavre à relever près du curseur.'); return; }
      if (fx.k === 'corpseBoom' && !sc.corpses.some((k) => Math.hypot(k.x - c.tx, k.y - c.ty) < fx.range)) { warn('Aucun cadavre près du curseur.'); return; }
      if (fx.k === 'shadowstep' && !nearestEnemyTo(c.tx, c.ty, p, fx.range)) { warn('Aucun ennemi à portée.'); return; }
    }
    const offensive = ab.fx.some((f) => ['melee', 'proj', 'aoeT', 'aoeS', 'cone', 'ring', 'zone', 'corpseBoom'].includes(f.k) || (f.k === 'dash' && (f.mult || f.end)));
    if (hasBuff(p, 'furtif') && offensive) p.stealthStrike = true;
    for (const fx of ab.fx) execFx(p, fx, c);
    p.res -= cost;
    const cd = free && slot > 0 ? 0.25 : ab.cd / (1 + hasteOf(p));
    p.cds[slot] = cd; p.cdMax[slot] = cd;
    if (p.stealthStrike) { p.stealthStrike = false; p.buffs = p.buffs.filter((b) => b.id !== 'furtif'); }
    if (offensive) { p.nextCrit = false; if (sc.kind === 'dungeon') p.combatT = 0; }
    tuto('ability', slot);
  };

  function clampRange(p, x, y, range) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (!range || d <= range) return { x, y };
    return { x: p.x + ((x - p.x) / d) * range, y: p.y + ((y - p.y) / d) * range };
  }

  function playerAoe(p, x, y, r, mult, o) {
    o = o || {};
    opposing('p').forEach((e) => {
      if (!inEllipse(x, y, r, e)) return;
      const rd = rollDmg(p, mult, o);
      hitUnit(p, e, rd.d, Object.assign({}, o, { crit: rd.crit, kx: x, ky: y }));
    });
  }

  function spawnProj(o) {
    Game.scene.projs.push(Object.assign({ id: G.uid(), dist: 0, hit: new Set(), pierce: 0 }, o, { vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed }));
  }

  function execFx(p, fx, c) {
    const sc = Game.scene;
    switch (fx.k) {
      case 'melee': case 'cone': {
        p.swingT = 1; p.swingDir = -(p.swingDir || 1);
        const arc = fx.arc * DEG;
        let hit = false;
        opposing('p').forEach((e) => {
          if (!inCone(p.x, p.y - 6, p.aim, fx.range, arc, e)) return;
          const rd = rollDmg(p, fx.mult * c.rk);
          let d = rd.d;
          if (fx.execute && e.hp / e.maxHp < fx.execute) { d *= 3; text(e.x, e.y - 50, 'Exécution !', '#9b2c20', 20); }
          hitUnit(p, e, d, { crit: rd.crit, stun: fx.stun, slow: fx.slow });
          hit = true;
        });
        if (hit && fx.rage) gainRes(p, fx.rage);
        sc.parts.push({ kind: 'slash', x: p.x, y: p.y - 6, ang: p.aim, arc, r: fx.range, t: 0, life: fx.k === 'cone' ? 0.3 : 0.18, color: fx.color || '#2b2118' });
        break;
      }
      case 'proj': {
        const n = fx.count || 1, spread = (fx.spread || 0) * DEG;
        const bonus = p.stealthStrike ? 3 : 1, forceCrit = p.nextCrit;
        for (let i = 0; i < n; i++) {
          const a = p.aim + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
          spawnProj({ x: p.x + Math.cos(a) * 12, y: p.y - 10 + Math.sin(a) * 8, ang: a, speed: fx.speed, r: fx.r || 6, range: fx.range, faction: 'p', src: p, mult: fx.mult * c.rk, pierce: fx.pierce || 0, aoe: fx.aoe, stun: fx.stun, slow: fx.slow, lifesteal: fx.lifesteal, color: fx.color, look: fx.look, bonus, forceCrit, glow: true });
        }
        p.swingT = 0.6;
        break;
      }
      case 'ring': {
        for (let i = 0; i < fx.count; i++) {
          const a = (i / fx.count) * G.TAU;
          spawnProj({ x: p.x, y: p.y - 10, ang: a, speed: fx.speed, r: 5, range: fx.range, faction: 'p', src: p, mult: fx.mult * c.rk, color: fx.color, look: 'arrow', bonus: p.stealthStrike ? 3 : 1 });
        }
        break;
      }
      case 'aoeT': {
        const pt = clampRange(p, c.tx, c.ty, fx.range);
        sc.hazards.push({ id: G.uid(), shape: 'circle', x: pt.x, y: pt.y, r: fx.radius, t: 0, delay: Math.max(0.05, fx.delay || 0), faction: 'p', src: p, mult: fx.mult * c.rk, stun: fx.stun, sleep: !!fx.stun, slow: fx.slow, color: fx.color });
        break;
      }
      case 'aoeS': {
        const ticks = fx.ticks || 1;
        for (let i = 0; i < ticks; i++) {
          sc.timers.push({ t: i * (fx.interval || 0), fn: () => {
            if (p.dead) return;
            playerAoe(p, p.x, p.y, fx.radius, fx.mult * c.rk, { stun: fx.stun, knock: fx.knock });
            ring(p.x, p.y, fx.radius, fx.color || '#2b2118', 0.3);
            if (ticks > 1) { p.swingT = 1; p.swingDir = -(p.swingDir || 1); }
          } });
        }
        break;
      }
      case 'dash': {
        const dx = c.tx - p.x, dy = c.ty - p.y;
        const dm = Math.hypot(dx, dy) || 1;
        const dist = Math.min(fx.dist, Math.max(70, dm));
        const dur = 0.2;
        p.dash = { ang: Math.atan2(dy, dx), speed: dist / dur, t: dur, mult: (fx.mult || 0) * c.rk, width: fx.width || 40, stun: fx.stun, invuln: fx.invuln, hit: new Set(), end: fx.end, rk: c.rk };
        parts(p.x, p.y, 6, '#8a7a62', 'puff', 60);
        break;
      }
      case 'blink': {
        const dx = c.tx - p.x, dy = c.ty - p.y, dm = Math.hypot(dx, dy) || 1;
        let d = Math.min(fx.dist, dm);
        const ux = dx / dm, uy = dy / dm;
        parts(p.x, p.y - 8, 10, '#7b5fd0', 'spark', 120);
        while (d > 0 && (W.collides(sc.map, p.x + ux * d, p.y + uy * d, p.r) || !W.los(sc.map, p.x, p.y, p.x + ux * d, p.y + uy * d))) d -= 8;
        if (d > 0) { p.x += ux * d; p.y += uy * d; }
        p.invulnT = 0.25;
        parts(p.x, p.y - 8, 10, '#7b5fd0', 'spark', 120);
        ring(p.x, p.y, 40, '#7b5fd0');
        break;
      }
      case 'shadowstep': {
        const e = nearestEnemyTo(c.tx, c.ty, p, fx.range);
        if (!e) break;
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        parts(p.x, p.y - 8, 10, '#3b3346', 'puff', 80);
        for (const t of [a, a + 0.8, a - 0.8, a + 1.6, a - 1.6, a + Math.PI]) {
          const nx = e.x + Math.cos(t) * (e.r + p.r + 6), ny = e.y + Math.sin(t) * (e.r + p.r + 6);
          if (!W.collides(sc.map, nx, ny, p.r)) { p.x = nx; p.y = ny; break; }
        }
        p.aim = Math.atan2(e.y - p.y, e.x - p.x);
        p.nextCrit = true; p.invulnT = 0.2;
        parts(p.x, p.y - 8, 10, '#3b3346', 'puff', 80);
        break;
      }
      case 'buff': {
        p.buffs = p.buffs.filter((b) => b.id !== fx.id);
        const b = Object.assign({}, fx, { t: fx.dur, max: fx.dur });
        if (b.pow) b.pow *= c.rk; if (b.haste) b.haste *= c.rk; if (b.crit) b.crit *= c.rk;
        p.buffs.push(b);
        ring(p.x, p.y, 50, '#c9a227');
        break;
      }
      case 'heal': healUnit(p, p.maxHp * fx.pct * c.rk); parts(p.x, p.y - 10, 10, '#3f7d2a', 'spark', 80); break;
      case 'hot': p.hots.push({ hps: (p.maxHp * fx.pct * c.rk) / fx.dur, t: fx.dur }); parts(p.x, p.y - 10, 6, '#3f7d2a', 'spark', 60); break;
      case 'shield': p.shield = p.maxHp * fx.pct * c.rk; p.shieldT = fx.dur; ring(p.x, p.y, 45, '#6fb1d9'); break;
      case 'zone': {
        const pt = fx.follow ? { x: p.x, y: p.y } : clampRange(p, c.tx, c.ty, fx.range);
        sc.zones.push({ id: G.uid(), x: pt.x, y: pt.y, follow: fx.follow ? p : null, r: fx.radius, dur: fx.dur, t: 0, interval: fx.interval, acc: 0, mult: fx.mult * c.rk, faction: 'p', src: p, slow: fx.slow, weaken: fx.weaken, color: fx.color });
        break;
      }
      case 'raise': doRaise(p, c); break;
      case 'corpseBoom': {
        const list = sc.corpses.filter((k) => Math.hypot(k.x - c.tx, k.y - c.ty) < fx.range);
        list.forEach((k) => {
          playerAoe(p, k.x, k.y, fx.radius, fx.mult * c.rk);
          ring(k.x, k.y, fx.radius, '#4f7a3d', 0.4);
          parts(k.x, k.y, 12, '#d9d2bf', 'ink', 220);
          decal(k.x, k.y, 14, '#4f7a3d');
        });
        sc.corpses = sc.corpses.filter((k) => !list.includes(k));
        Game.shake(6);
        break;
      }
      case 'res': gainRes(p, fx.amount); break;
    }
  }

  function nearestEnemyTo(x, y, p, range) {
    let best = null, bd = 1e9;
    opposing('p').forEach((e) => {
      if (Math.hypot(e.x - p.x, e.y - p.y) > range) return;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  function findCorpse(x, y) {
    const p = Game.player;
    let best = null, bd = 170;
    Game.scene.corpses.forEach((k) => {
      if (k.tried) return;
      const d = Math.hypot(k.x - x, k.y - y);
      if (d < bd && Math.hypot(k.x - p.x, k.y - p.y) < 520) { bd = d; best = k; }
    });
    return best;
  }

  function doRaise(p, c) {
    const sc = Game.scene;
    const k = findCorpse(c.tx, c.ty);
    if (!k) return;
    k.tried = true;
    const scale = k.boss ? 0.1 : k.elite ? 0.25 : 1;
    const chance = (k.boss ? 0.01 : k.elite ? 0.1 : 0.4) + p.st.raise * scale + 0.05 * (c.rk - 1) * scale;
    sc.corpses = sc.corpses.filter((x) => x !== k);
    if (Math.random() < chance) {
      const m = makeMinion(k.type, k.x, k.y, k.lvl, k.elite, k.boss);
      sc.units.push(m);
      text(k.x, k.y - 40, k.boss ? 'LE BOSS SE RELÈVE !' : 'Relevé !', '#3f7d2a', k.boss ? 30 : 22, 2);
      ring(k.x, k.y, 60, '#5bd04a', 0.5);
      parts(k.x, k.y, 14, '#5bd04a', 'spark', 120);
      if (k.boss) { Game.char.boundBoss = k.type; G.UI.toast(m.name + ' vous servira pendant votre prochain donjon !', '#3f7d2a', 5); }
      const mins = sc.units.filter((u) => u.minion && !u.bound && !u.dead);
      if (mins.length > 4) { mins[0].dead = true; parts(mins[0].x, mins[0].y, 8, '#2b2118'); }
    } else {
      text(k.x, k.y - 40, 'Échec ! (' + Math.round(chance * 100) + ' %)', '#9b2c20', 22);
      ring(k.x, k.y, 90, '#9b2c20', 0.4);
      parts(k.x, k.y, 16, '#7a2734', 'ink', 240);
      decal(k.x, k.y, 16, '#7a2734');
      dealDamage(null, p, p.maxHp * 0.1, { trueDmg: true, cause: 'un cadavre qui a explosé' });
      Game.shake(8);
    }
  }

  // ================= Attaques des monstres =================
  function monDmg(u, atk) { return u.dmg * (atk.dmgMul || 1) * (u.weakT > 0 ? 1 - u.weakAmt : 1); }
  // flaque laissée au sol (lave, poison…)
  function mkPool(u, P) { return { dur: P.dur, dmg: (u ? u.dmg : 100) * P.dmgMul, color: P.color || '#6b8f2a', kind: P.kind }; }

  function canUse(u, a, tgt, d, vis) {
    if (d > a.range + tgt.r || d < (a.min || 0)) return false;
    if (!vis && a.t !== 'summon' && a.t !== 'heal' && a.t !== 'shieldAdds') return false;
    if (a.t === 'heal') return !!woundedAlly(u, a.range);
    if (a.t === 'shieldAdds') return !u.shielded;
    if (a.t === 'summon') return Game.scene.units.filter((o) => o.summoned && o.faction === u.faction && !o.dead).length < 8;
    return true;
  }
  function woundedAlly(u, range) {
    let best = null, low = 0.85;
    Game.scene.units.forEach((o) => {
      if (o.faction !== u.faction || o.dead || o.dormant || o.dummyUnit || o.isPlayer) return;
      if (G.dist(o, u) > range) return;
      const r = o.hp / o.maxHp;
      if (r < low) { low = r; best = o; }
    });
    return best;
  }

  function startCast(u, atk, key, tgt) {
    const sc = Game.scene, m = sc.map;
    const windup = atk.windup * D.DIFF.windup * (u.windupMul || 1);
    const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    u.cast = { atk, t: 0, windup, ang, tx: tgt.x, ty: tgt.y };
    u.atkCd[key] = atk.cd;
    const dmg = monDmg(u, atk);
    const slow = atk.slow || u.chill || 0;
    if (atk.t === 'swing') sc.hazards.push({ id: G.uid(), shape: 'cone', follow: u, x: u.x, y: u.y, r: atk.range + 8, arc: atk.arc * DEG, ang, t: 0, delay: windup, dmg, faction: u.faction, src: u, slow });
    else if (atk.t === 'combo') {
      u.cast.left = atk.hits - 1;
      sc.hazards.push({ id: G.uid(), shape: 'cone', follow: u, x: u.x, y: u.y, r: atk.range + 8, arc: atk.arc * DEG, ang, t: 0, delay: windup, dmg, faction: u.faction, src: u, slow });
    } else if (atk.t === 'nova') sc.hazards.push({ id: G.uid(), shape: 'circle', follow: u, x: u.x, y: u.y, r: atk.radius, t: 0, delay: windup, dmg, faction: u.faction, src: u, slow,
      color: atk.color, freeze: atk.freeze, sleepP: atk.sleep, pool: atk.pool ? mkPool(u, atk.pool) : null });
    else if (atk.t === 'charge') sc.hazards.push({ id: G.uid(), shape: 'line', follow: u, x: u.x, y: u.y, ang, len: atk.dist, width: atk.width, t: 0, delay: windup, warnOnly: true, faction: u.faction, src: u });
    else if (atk.t === 'explode') sc.hazards.push({ id: G.uid(), shape: 'circle', x: u.x, y: u.y, r: atk.radius, t: 0, delay: windup, dmg, faction: u.faction, src: u, color: '#c4661a', bomb: true });
    else if (atk.t === 'heal') u.cast.ally = woundedAlly(u, atk.range);
    else if (atk.t === 'gust') sc.hazards.push({ id: G.uid(), shape: 'cone', follow: u, x: u.x, y: u.y, r: 340, arc: 1.9, ang, t: 0, delay: windup, warnOnly: true, faction: u.faction, src: u, color: '#5a6f86' });
    else if (atk.t === 'dive') {
      // plonge sous la vase et ressurgit sous la cible
      const pt = predict(tgt, windup * 0.5);
      let x = pt.x, y = pt.y;
      if (W.collides(m, x, y, u.r)) { x = tgt.x; y = tgt.y; }
      if (W.collides(m, x, y, u.r)) { x = u.x; y = u.y; }
      const dc = atk.color || '#2f4d47';
      parts(u.x, u.y, 16, dc, 'ink', 200);
      ring(u.x, u.y, 80, dc, 0.5);
      u.x = x; u.y = y; u.hidden = true;
      sc.hazards.push({ id: G.uid(), shape: 'circle', x, y, r: atk.radius, t: 0, delay: windup, dmg, faction: u.faction, src: u, color: dc });
      text(x, y - 60, 'Sous vos pieds !', '#9b2c20', 22);
    }
  }

  function execAttack(u, cast, tgt) {
    const sc = Game.scene, atk = cast.atk;
    const dmg = monDmg(u, atk);
    u.swingT = 1;
    switch (atk.t) {
      case 'shoot': {
        const n = atk.count || 1, speed = atk.speed || 300;
        const pt = predict(tgt, Math.min(0.9, G.dist(u, tgt) / speed) * 0.75);
        const ang = Math.atan2(pt.y - u.y, pt.x - u.x);
        const gap = atk.spreadAng ? atk.spreadAng * DEG : 0.5 / Math.max(1, n - 1);
        for (let i = 0; i < n; i++) {
          const a = ang + (n > 1 ? (i - (n - 1) / 2) * gap : 0);
          spawnProj({ x: u.x, y: u.y - 10, ang: a, speed, r: atk.size || 5, range: Math.min(900, (atk.range > 2000 ? 700 : atk.range) + 80), faction: u.faction, src: u, dmg, slow: atk.slow || u.chill, poison: atk.poison, color: atk.color || '#2b2118', look: atk.look || (u.look === 'skelArcher' ? 'arrow' : 'orb') });
        }
        break;
      }
      case 'circle': case 'zone': {
        const n = atk.count || 1;
        const first = predict(tgt, Math.min(0.6, (atk.delay || 1) * 0.5));
        for (let i = 0; i < n; i++) {
          let x = first.x, y = first.y;
          if (i > 0) { const a = Math.random() * G.TAU, d = G.rnd(40, atk.spread || 120); x = tgt.x + Math.cos(a) * d; y = tgt.y + Math.sin(a) * d; }
          const bomb = u.look === 'bomber' || u.look === 'grizzak';
          const h = { id: G.uid(), shape: 'circle', x, y, r: atk.radius, t: 0, delay: atk.delay + i * 0.08, dmg: atk.t === 'zone' ? dmg * 0.5 : dmg, faction: u.faction, src: u, poison: atk.poison, bomb, color: atk.color, slow: atk.slow || u.chill,
            freeze: atk.freeze, sleepP: atk.sleep };
          if (atk.pool) h.pool = mkPool(u, atk.pool);
          if (atk.t === 'zone') h.pool = { dur: atk.dur, dmg: dmg, color: atk.color || '#c9a227' };
          sc.hazards.push(h);
          if (bomb) sc.parts.push({ kind: 'lob', x0: u.x, y0: u.y - 14, x, y, t: 0, life: Math.min(0.6, atk.delay) });
        }
        break;
      }
      case 'line': {
        const n = atk.count || 1;
        const pt = predict(tgt, 0.3);
        const base = Math.atan2(pt.y - u.y, pt.x - u.x), sp = (atk.spreadAng || 20) * DEG;
        for (let i = 0; i < n; i++) {
          const a = base + (n > 1 ? (i - (n - 1) / 2) * sp : 0);
          sc.hazards.push({ id: G.uid(), shape: 'line', x: u.x, y: u.y, ang: a, len: atk.len, width: atk.width, t: 0, delay: atk.delay, dmg, faction: u.faction, src: u, color: atk.color || '#5d4a1e',
            slow: atk.slow || u.chill, poison: atk.poison, linePool: atk.pool ? mkPool(u, atk.pool) : null });
        }
        break;
      }
      case 'ring': {
        const off = Math.random() * G.TAU;
        for (let i = 0; i < atk.count; i++) {
          const a = off + (i / atk.count) * G.TAU;
          spawnProj({ x: u.x, y: u.y - 10, ang: a, speed: atk.speed, r: 6, range: 700, faction: u.faction, src: u, dmg, color: atk.color || '#2b2118', look: 'orb', poison: atk.poison });
        }
        ring(u.x, u.y, 60, atk.color || '#2b2118');
        break;
      }
      case 'sweep': {
        // rayon qui tourne : une suite de lignes qui se déclenchent l'une après l'autre
        const base = Math.atan2(tgt.y - u.y, tgt.x - u.x) - (atk.steps * atk.stepAng * DEG) / 2 * (Math.random() < 0.5 ? 1 : -1);
        const dir = Math.random() < 0.5 ? 1 : -1;
        for (let i = 0; i < atk.steps; i++) {
          sc.hazards.push({ id: G.uid(), shape: 'line', x: u.x, y: u.y, ang: base + dir * i * atk.stepAng * DEG, len: atk.len, width: atk.width, t: 0, delay: atk.delay + i * atk.stepT, dmg, faction: u.faction, src: u, color: atk.color || '#9b6fe0' });
        }
        text(u.x, u.y - u.r * 2 - 20, atk.say || 'Rayon !', atk.color || '#7b3fa6', 20);
        break;
      }
      case 'gust': {
        const a = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        Game.gust(a, atk.strength, atk.dur, 0.25);
        ring(u.x, u.y, 160, '#9fb4c8', 0.5);
        text(u.x, u.y - u.r * 2 - 20, 'Bourrasque !', '#5a6f86', 22);
        break;
      }
      case 'tornado': {
        for (let i = 0; i < (atk.count || 1); i++) {
          const a = Math.random() * G.TAU;
          let x = u.x + Math.cos(a) * 90, y = u.y + Math.sin(a) * 90;
          if (W.collides(sc.map, x, y, 20)) { x = u.x; y = u.y; }
          sc.zones.push({ id: G.uid(), kind: 'tornado', warm: 0.6, x, y, r: atk.radius, dur: atk.dur, t: 0, interval: 0.5, acc: 0, dmg: u.dmg * atk.dmgMul, faction: u.faction, src: u, color: '#9fb4c8', chase: tgt, speed: atk.speed, cause: 'une tornade de ' + u.name });
        }
        text(u.x, u.y - u.r * 2 - 20, 'Tornades !', '#5a6f86', 22);
        break;
      }
      case 'whirlpool': {
        const n = atk.count || 1, first = predict(tgt, 0.4);
        for (let i = 0; i < n; i++) {
          let x = first.x, y = first.y;
          if (i > 0) { const a = Math.random() * G.TAU, d = G.rnd(80, atk.spread || 160); x = tgt.x + Math.cos(a) * d; y = tgt.y + Math.sin(a) * d; }
          if (W.solidAt(sc.map, x, y)) { x = tgt.x; y = tgt.y; }
          sc.zones.push({ id: G.uid(), kind: atk.kind || 'whirl', warm: 0.9, x, y, r: atk.radius, dur: atk.dur, t: 0, interval: 0.5, acc: 0, dmg: u.dmg * atk.dmgMul, faction: u.faction, src: u, color: atk.color || '#2f6f86', pull: atk.pull, slow: atk.slow, cause: 'un tourbillon de ' + u.name });
        }
        text(u.x, u.y - u.r * 2 - 20, atk.say || 'Tourbillon !', atk.color || '#2f6f86', 22);
        break;
      }
      case 'spiral':
        sc.emitters.push({ src: u, t: 0, dur: atk.dur, rate: atk.rate, acc: 0, arms: atk.arms, ang0: Math.random() * G.TAU, spin: atk.spin * (Math.random() < 0.5 ? 1 : -1), speed: atk.speed, dmg, color: atk.color || '#3b3346' });
        text(u.x, u.y - u.r * 2 - 20, atk.say || 'Lecture interdite…', '#7b3fa6', 20);
        break;
      case 'charge':
        u.dash = { ang: cast.ang, speed: atk.dist / 0.4, t: 0.4, dmg, width: atk.width, hit: new Set(), trail: atk.trail ? Object.assign({ acc: 0 }, atk.trail) : null };
        break;
      case 'hook': {
        // bandelettes : la ligne attire la cible vers le monstre
        const pt = predict(tgt, 0.3), a = Math.atan2(pt.y - u.y, pt.x - u.x);
        sc.hazards.push({ id: G.uid(), shape: 'line', x: u.x, y: u.y, ang: a, len: atk.len, width: atk.width, t: 0, delay: atk.delay, dmg, faction: u.faction, src: u, color: atk.color || '#b8a070', yank: true });
        text(u.x, u.y - u.r * 2 - 20, 'Bandelettes !', '#8a6a3a', 20);
        break;
      }
      case 'rain':
        sc.emitters.push({ kind: 'rain', src: u, tgt, atk, t: 0, dur: atk.dur, rate: atk.rate, acc: atk.rate, dmg, n: 0 });
        text(u.x, u.y - u.r * 2 - 20, atk.say || 'Pluie !', atk.color || '#9b2c20', 22);
        break;
      case 'invert':
        sc.invert = { t: -1, dur: atk.dur };
        G.UI.toast('Cauchemar : vos commandes vont s\'inverser !', '#7b3fa6', 2.5);
        text(u.x, u.y - u.r * 2 - 20, 'Cauchemar !', '#7b3fa6', 24);
        ring(Game.player.x, Game.player.y, 90, '#7b3fa6', 0.6);
        break;
      case 'voidpool': {
        const n = atk.count || 1, first = predict(tgt, 0.4);
        for (let i = 0; i < n; i++) {
          let x = first.x, y = first.y;
          if (i > 0) { const a = Math.random() * G.TAU, d = G.rnd(90, atk.spread || 200); x = tgt.x + Math.cos(a) * d; y = tgt.y + Math.sin(a) * d; }
          if (W.solidAt(sc.map, x, y)) { x = tgt.x; y = tgt.y; }
          sc.zones.push({ id: G.uid(), kind: 'void', warm: 0.8, x, y, r: atk.r0, r0: atk.r0, r1: atk.r1, grow: atk.dur * 0.6, dur: atk.dur, t: 0, interval: 0.5, acc: 0, dmg: u.dmg * atk.dmgMul, faction: u.faction, src: u, color: '#5a3f86', pull: 35, cause: 'le Néant de ' + u.name });
        }
        text(u.x, u.y - u.r * 2 - 20, 'Le Néant s\'étend…', '#5a3f86', 22);
        break;
      }
      case 'gravity':
        Game.gust(Math.atan2(u.y - tgt.y, u.x - tgt.x), atk.strength, atk.dur, 0.6);
        Game.scene.wind.toward = u;
        ring(u.x, u.y, 220, '#7b3fa6', 0.7);
        text(u.x, u.y - u.r * 2 - 20, 'Attraction !', '#7b3fa6', 24);
        break;
      case 'eclipse':
        sc.eclipse = { t: 0, dur: atk.dur };
        G.UI.toast(u.name + ' dévore la lumière !', '#3b3346', 2.5);
        break;
      case 'storm':
        sc.storm = { t: 0, dur: atk.dur, str: atk.strength || 140, next: 0 };
        G.UI.toast('Tempête de sable !', '#8a6a3a', 2.5);
        break;
      case 'summon': {
        if (u.minion) break;
        for (let i = 0; i < atk.count; i++) spawnAdd(u, atk.mon, i, atk.count, atk.spread);
        text(u.x, u.y - u.r * 2 - 20, 'Invocation !', '#9b2c20', 20);
        break;
      }
      case 'shieldAdds': {
        const ids = [];
        let k = 0;
        atk.adds.forEach(([mon, n]) => { for (let i = 0; i < n; i++) ids.push(spawnAdd(u, mon, k++, 4).id); });
        u.shielded = { ids, t: atk.dur };
        G.UI.toast(u.name + ' est protégé ! Abattez ses gardes pour briser le bouclier.', '#c9a227', 4);
        ring(u.x, u.y, 120, '#c9a227', 0.6);
        break;
      }
      case 'heal': {
        const a = cast.ally;
        if (a && !a.dead) {
          const amt = a.maxHp * (a.boss ? 0.04 : atk.pct);
          a.hp = Math.min(a.maxHp, a.hp + amt);
          text(a.x, a.y - a.r * 2 - 8, '+' + Math.round(amt), '#3f7d2a', 18);
          sc.parts.push({ kind: 'beam', x0: u.x, y0: u.y - 20, x: a.x, y: a.y - 14, t: 0, life: 0.45, color: '#7fd07a' });
          parts(a.x, a.y - 10, 8, '#7fd07a', 'spark', 80);
        }
        break;
      }
      case 'explode':
        u.exploded = true;
        killUnit(u, null);
        Game.shake(6);
        break;
      case 'dive':
        u.hidden = false;
        parts(u.x, u.y, 18, atk.color || '#2f4d47', 'ink', 260);
        ring(u.x, u.y, atk.radius, atk.color || '#2f4d47', 0.5);
        Game.shake(10);
        break;
    }
  }

  function spawnAdd(u, mon, i, n, spread) {
    const sc = Game.scene;
    const a = (i / Math.max(1, n)) * G.TAU + Math.random();
    let x = u.x + Math.cos(a) * 80, y = u.y + Math.sin(a) * 80;
    if (spread) for (let k = 0; k < 20; k++) {
      const b = Math.random() * G.TAU, d = G.rnd(spread * 0.4, spread);
      const nx = u.x + Math.cos(b) * d, ny = u.y + Math.sin(b) * d;
      if (!W.collides(sc.map, nx, ny, 18) && W.los(sc.map, u.x, u.y, nx, ny)) { x = nx; y = ny; break; }
    }
    if (W.collides(sc.map, x, y, 14)) { x = u.x; y = u.y; }
    const lvl = Math.max(1, (sc.def ? sc.def.lvl : 1) + 1);
    const m = makeMonster(mon, x, y, lvl, false);
    m.aggro = true; m.summoned = true;
    sc.units.push(m);
    parts(x, y, 10, '#2b2118', 'puff', 80);
    return m;
  }

  // ================= IA des unités =================
  function pickTarget(u) {
    const sc = Game.scene, p = Game.player;
    if (u.faction === 'e') {
      if (!u.aggro) {
        if (!p.dead && !hasBuff(p, 'furtif') && G.dist(u, p) < D.DIFF.aggro && W.los(sc.map, u.x, u.y, p.x, p.y)) aggroUnit(u);
        else return null;
      }
      let best = null, bd = 1e9;
      sc.units.forEach((o) => {
        if (o.faction !== 'p' || o.dead) return;
        if (o.isPlayer && hasBuff(o, 'furtif') && G.dist(u, o) > 45) return;
        let d = G.dist(u, o);
        if (o === u.target) d -= 60;
        if (o.isPlayer) d -= 30;
        if (d < bd) { bd = d; best = o; }
      });
      u.target = best;
      return best;
    }
    let best = null, bd = 420;
    sc.units.forEach((o) => {
      if (o.faction !== 'e' || !alive(o) || o.dummyUnit) return;
      const d = G.dist(u, o);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }

  function moveToward(u, x, y, spd, dt) {
    let a = Math.atan2(y - u.y, x - u.x);
    if (u.def && u.def.erratic) a += Math.sin(Game.time * 6 + u.id) * 0.9;
    W.move(Game.scene.map, u, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
    u.walk += dt * spd * 0.09;
  }

  function tickStatus(u, dt) {
    if (u.hitT > 0) u.hitT -= dt;
    if (u.swingT > 0) u.swingT = Math.max(0, u.swingT - dt * 4);
    if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) u.slowAmt = 0; }
    if (u.weakT > 0) u.weakT -= dt;
    for (const d of u.dots) {
      d.acc += dt; d.t -= dt;
      while (d.acc >= 0.5 && !u.dead) { d.acc -= 0.5; dealDamage(d.src, u, d.dps * 0.5, { isDot: true }); }
    }
    u.dots = u.dots.filter((d) => d.t > 0);
  }

  function blinkAway(u, tgt) {
    const m = Game.scene.map, B = u.def.blink;
    const base = Math.atan2(u.y - tgt.y, u.x - tgt.x);
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 2]) {
      const a = base + off, x = u.x + Math.cos(a) * B.dist, y = u.y + Math.sin(a) * B.dist;
      if (!W.collides(m, x, y, u.r) && W.los(m, u.x, u.y, x, y)) {
        parts(u.x, u.y - 10, 10, '#7b3fa6', 'spark', 120);
        u.x = x; u.y = y; u.blinkCd = B.cd;
        parts(u.x, u.y - 10, 10, '#7b3fa6', 'spark', 120);
        ring(u.x, u.y, 40, '#7b3fa6');
        return true;
      }
    }
    u.blinkCd = 1;
    return false;
  }

  function updateUnit(u, dt) {
    const sc = Game.scene;
    const px = u.x, py = u.y;
    tickStatus(u, dt);
    if (u.dead) return;
    if (u.dummyUnit) {
      if (u.dpsShow > 0) {
        u.dpsShow -= dt;
        u.dmgLog = u.dmgLog.filter((e) => Game.time - e[0] < 5);
        const span = Math.max(1, Math.min(5, Game.time - (u.dmgLog.length ? u.dmgLog[0][0] : Game.time)));
        u.dps = u.dmgLog.reduce((a, e) => a + e[1], 0) / span;
      }
      if (!u.active) return;
    }
    if (u.minion) { u.life -= dt; if (u.life <= 0) { u.dead = true; parts(u.x, u.y, 10, '#2b2118', 'puff', 60); return; } }
    if (u.def.regen && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.def.regen * dt);
    if (u.blinkCd > 0) u.blinkCd -= dt;
    if (u.shielded) {
      u.shielded.t -= dt;
      const guards = u.shielded.ids.some((id) => sc.units.some((o) => o.id === id && !o.dead));
      if (!guards || u.shielded.t <= 0) {
        u.shielded = null;
        G.UI.toast('Le bouclier de ' + u.name + ' se brise !', '#c9a227', 3);
        ring(u.x, u.y, 140, '#c9a227', 0.5); Game.shake(8);
      }
    }
    if (u.stunT > 0) { u.stunT -= dt; return; }
    u.sleep = false;
    if (u.dash) {
      const d = u.dash;
      const blocked = W.move(sc.map, u, Math.cos(d.ang) * d.speed * dt, Math.sin(d.ang) * d.speed * dt);
      u.walk += dt * 20;
      sc.units.forEach((o) => {
        if (o.faction === u.faction || !alive(o) || d.hit.has(o.id)) return;
        if (Math.hypot(o.x - u.x, o.y - u.y) < d.width / 2 + o.r) { d.hit.add(o.id); dealDamage(u, o, d.dmg); }
      });
      if (Math.random() < 0.5) parts(u.x, u.y, 1, '#8a7a62', 'puff', 30);
      if (d.trail) {
        d.trail.acc += d.speed * dt;
        if (d.trail.acc >= d.trail.every) {
          d.trail.acc = 0;
          sc.zones.push({ id: G.uid(), kind: 'lava', x: u.x, y: u.y, r: d.trail.r, dur: d.trail.dur, t: 0, interval: 0.5, acc: 0, dmg: u.dmg * d.trail.dmgMul, faction: u.faction, src: u, color: d.trail.color || '#e8762a', cause: 'une traînée de feu' });
        }
      }
      d.t -= dt;
      if (d.t <= 0 || blocked) { u.dash = null; u.gcd = 0.6; if (blocked) Game.shake(5); }
      return;
    }
    if (u.dormant) {
      const p = Game.player, r = u.bossRoom;
      if (u.boss && r && p.x > (r.x + 0.6) * T && p.x < (r.x + r.w - 0.6) * T && p.y > (r.y + 0.6) * T && p.y < (r.y + r.h - 0.6) * T) activateBoss(u);
      return;
    }
    if (u.boss) {
      u.fightT = (u.fightT || 0) + dt;
      if (u.fightT > (u.def.enrage || D.DIFF.enrage) && !u.enraged) {
        u.enraged = true; u.dmg *= 2; u.speedMul = (u.speedMul || 1) * 1.2;
        G.UI.toast(u.name + ' entre dans une RAGE folle ! (dégâts ×2)', '#9b2c20', 5);
        ring(u.x, u.y, 200, '#9b2c20', 0.8); Game.shake(12);
      }
      if (u.def.phases && !u.cast) {
        const ratio = u.hp / u.maxHp;
        let ph = 0;
        while (ph < u.def.phases.length - 1 && ratio <= u.def.phases[ph].above) ph++;
        if (ph !== u.phase) {
          u.phase = ph;
          const P = u.def.phases[ph];
          if (P.msg) G.UI.toast(P.msg, '#9b2c20', 4);
          u.speedMul = (P.speedMul || 1) * (u.enraged ? 1.2 : 1);
          u.atkCd = {};
          P.atks.forEach((a, i) => (u.atkCd[ph + '_' + i] = 0.5 + i * 0.6));
          ring(u.x, u.y, 150, '#9b2c20', 0.6);
          Game.shake(10);
        }
      }
    }
    const tgt = pickTarget(u);
    for (const k in u.atkCd) u.atkCd[k] -= dt;
    u.gcd -= dt;
    const water = !u.def.flying && W.waterAt(sc.map, u.x, u.y);
    const spd = u.speed * (u.speedMul || 1) * (1 - (u.slowAmt || 0)) * (water ? 0.6 : 1);
    if (!tgt) {
      if (u.minion) { const p = Game.player; if (G.dist(u, p) > 90) moveToward(u, p.x, p.y, spd * 1.2, dt); }
      u.vx = (u.x - px) / dt; u.vy = (u.y - py) / dt;
      return;
    }
    u.aim = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    u.facing = Math.cos(u.aim) >= 0 ? 1 : -1;
    if (u.cast) {
      u.cast.t += dt;
      if (u.cast.t >= u.cast.windup) {
        const c = u.cast;
        execAttack(u, c, tgt);
        if (c.atk.t === 'combo' && c.left > 0 && !u.dead) {
          // coup suivant de l'enchaînement : le monstre avance et frappe à nouveau
          const a2 = Math.atan2(tgt.y - u.y, tgt.x - u.x);
          W.move(sc.map, u, Math.cos(a2) * (c.atk.lunge || 0), Math.sin(a2) * (c.atk.lunge || 0));
          const iv = c.atk.interval * D.DIFF.windup * (u.windupMul || 1);
          sc.hazards.push({ id: G.uid(), shape: 'cone', follow: u, x: u.x, y: u.y, r: c.atk.range + 8, arc: c.atk.arc * DEG, ang: a2, t: 0, delay: iv, dmg: monDmg(u, c.atk), faction: u.faction, src: u, slow: c.atk.slow || u.chill });
          u.cast = { atk: c.atk, t: 0, windup: iv, ang: a2, left: c.left - 1 };
        } else { u.cast = null; u.gcd = 0.35; }
      }
      u.vx = (u.x - px) / dt; u.vy = (u.y - py) / dt;
      return;
    }
    const d = G.dist(u, tgt);
    const vis = W.los(sc.map, u.x, u.y, tgt.x, tgt.y);
    if (u.def.blink && (u.blinkCd || 0) <= 0 && d < u.def.blink.range && !u.minion) blinkAway(u, tgt);
    if (u.def.stalk && !u.minion && tgt.isPlayer) {
      u.stalkCd = (u.stalkCd == null ? G.rnd(1, 3) : u.stalkCd) - dt;
      if (u.stalkCd <= 0 && d > u.def.stalk.range) {
        u.stalkCd = u.def.stalk.cd;
        const back = (tgt.aim || 0) + Math.PI + G.rnd(-0.5, 0.5), nx = tgt.x + Math.cos(back) * 56, ny = tgt.y + Math.sin(back) * 56;
        if (!W.collides(sc.map, nx, ny, u.r) && W.los(sc.map, tgt.x, tgt.y, nx, ny)) {
          parts(u.x, u.y - 10, 10, '#5a3f86', 'spark', 120);
          u.x = nx; u.y = ny; u.gcd = Math.max(u.gcd, 0.45);
          parts(u.x, u.y - 10, 12, '#9b6fe0', 'spark', 140); ring(u.x, u.y, 44, '#7b3fa6');
          text(u.x, u.y - 40, 'Derrière vous !', '#7b3fa6', 18);
        }
      }
    }
    const atks = atkList(u);
    if (u.gcd <= 0) {
      const start = Math.floor(Math.random() * atks.length);
      for (let k = 0; k < atks.length; k++) {
        const i = (start + k) % atks.length, a = atks[i];
        const key = (u.minion ? 0 : u.phase) + '_' + i;
        if ((u.atkCd[key] || 0) > 0) continue;
        if (!canUse(u, a, tgt, d, vis)) continue;
        startCast(u, a, key, tgt);
        u.vx = 0; u.vy = 0;
        return;
      }
    }
    if (u.speed > 0) {
      const melee = atks.find((a) => a.t === 'swing' || a.t === 'combo' || a.t === 'explode');
      const reach = melee ? melee.range * 0.8 + tgt.r : 120;
      const keep = u.def.keep;
      if (keep && !u.minion) {
        const maxR = Math.max(...atks.map((a) => (a.range > 2000 ? 400 : a.range)));
        if (d < keep * 0.7 && vis) {
          const a = Math.atan2(u.y - tgt.y, u.x - tgt.x) + Math.sin(Game.time + u.id) * 0.6;
          W.move(sc.map, u, Math.cos(a) * spd * 0.9 * dt, Math.sin(a) * spd * 0.9 * dt); u.walk += dt * spd * 0.09;
        } else if (d > maxR * 0.85 || !vis) chase(u, tgt, spd, dt, vis);
      } else if (d > reach || !vis) chase(u, tgt, spd, dt, vis);
    }
    u.vx = (u.x - px) / dt; u.vy = (u.y - py) / dt;
  }

  function chase(u, tgt, spd, dt, vis) {
    const sc = Game.scene;
    const ox = u.x, oy = u.y;
    if ((vis && !(u.forceFlow > 0)) || !tgt.isPlayer || !sc.map.dist) moveToward(u, tgt.x, tgt.y, spd, dt);
    else {
      const fd = W.flowDir(sc.map, u.x, u.y, u.r > 17);
      if (fd) moveToward(u, fd[0], fd[1], spd, dt);
      else moveToward(u, tgt.x, tgt.y, spd, dt);
    }
    // coincé contre un obstacle : on suit le chemin calculé un moment
    if (Math.hypot(u.x - ox, u.y - oy) < spd * dt * 0.25) { u.stuckT = (u.stuckT || 0) + dt; if (u.stuckT > 0.4) { u.forceFlow = 1.2; u.stuckT = 0; } }
    else u.stuckT = 0;
    if (u.forceFlow > 0) u.forceFlow -= dt;
  }

  function activateBoss(b) {
    const sc = Game.scene;
    b.dormant = false; b.aggro = true;
    sc.map.gateLocked = true;
    G.UI.bossBar(b);
    G.UI.toast(b.name + ' : ' + (b.def.intro || ''), '#9b2c20', 5);
    Game.shake(8);
    ring(b.x, b.y, 200, '#9b2c20', 0.7);
    sc.units.forEach((u) => { if (u.minion && !u.dead) { u.x = Game.player.x + G.rnd(-30, 30); u.y = Game.player.y + G.rnd(-30, 30); if (W.collides(sc.map, u.x, u.y, u.r)) { u.x = Game.player.x; u.y = Game.player.y; } } });
  }

  // ================= Joueur =================
  function updatePlayer(p, dt) {
    const sc = Game.scene;
    const px = p.x, py = p.y;
    tickStatus(p, dt);
    if (p.dead) return;
    for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
    if (p.potionCd > 0) p.potionCd -= dt;
    if (p.invulnT > 0) p.invulnT -= dt;
    if (p.stunT > 0) p.stunT -= dt;
    p.buffs.forEach((b) => (b.t -= dt));
    p.buffs = p.buffs.filter((b) => b.t > 0);
    p.stealth = hasBuff(p, 'furtif');
    p.invulnFx = hasBuff(p, 'divin');
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }
    p.hots.forEach((h) => { h.t -= dt; healUnit(p, h.hps * dt, true); });
    p.hots = p.hots.filter((h) => h.t > 0);
    const C = D.CLASSES[p.cls], RS = D.RES[C.res];
    p.combatT += dt;
    if (RS.regen) gainRes(p, RS.regen * dt);
    if (RS.regenPct) gainRes(p, p.resMax * RS.regenPct * dt);
    if (RS.decay && p.combatT > 4) gainRes(p, -RS.decay * dt);
    if (sc.kind === 'town') healUnit(p, p.maxHp * 0.2 * dt, true);
    else if (sc.kind === 'tuto') { if (p.combatT > 3 && !(G.Tuto && G.Tuto.noRegen())) healUnit(p, p.maxHp * 0.04 * dt, true); }
    else if (p.combatT > 8) healUnit(p, p.maxHp * 0.012 * dt, true);
    p.aim = Math.atan2(Game.mouse.wy - (p.y - 8), Game.mouse.wx - p.x);
    p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;
    if (p.dash) {
      const d = p.dash;
      const blocked = W.move(sc.map, p, Math.cos(d.ang) * d.speed * dt, Math.sin(d.ang) * d.speed * dt);
      p.walk += dt * 30;
      if (d.mult > 0) opposing('p').forEach((e) => {
        if (d.hit.has(e.id)) return;
        if (Math.hypot(e.x - p.x, e.y - p.y) < d.width / 2 + e.r) { d.hit.add(e.id); const rd = rollDmg(p, d.mult); hitUnit(p, e, rd.d, { crit: rd.crit, stun: d.stun }); }
      });
      if (Math.random() < 0.6) parts(p.x, p.y, 1, '#8a7a62', 'puff', 30);
      d.t -= dt;
      if (d.t <= 0 || blocked) {
        if (d.end) { playerAoe(p, p.x, p.y, d.end.radius, d.end.mult * d.rk); ring(p.x, p.y, d.end.radius, '#9a4a1c', 0.35); Game.shake(7); decal(p.x, p.y, 18, '#6b5a4a', 'crack'); }
        p.dash = null;
      }
      p.vx = (p.x - px) / dt; p.vy = (p.y - py) / dt;
      return;
    }
    // la lave brûle (les monstres du volcan, eux, y sont habitués)
    if (sc.kind === 'dungeon' && W.lavaAt(sc.map, p.x, p.y + 4)) {
      p.lavaT = (p.lavaT || 0) + dt;
      if (p.lavaT >= 0.25) {
        p.lavaT -= 0.25;
        dealDamage(null, p, p.maxHp * 0.02, { trueDmg: true, isDot: true, cause: 'la lave' });
        parts(p.x, p.y, 4, '#f08a2a', 'spark', 90);
        warn('La lave vous brûle !');
      }
    } else p.lavaT = 0;
    if (p.drowse > 0) p.drowse = Math.max(0, p.drowse - dt * 0.6);
    if (p.frozenT > 0) p.frozenT -= dt;
    if (p.stunT > 0) { p.vx = p.vy = 0; p.ivx = p.ivy = 0; return; }
    const In = G.Input;
    let mx = 0, my = 0;
    if (In.held('up')) my -= 1;
    if (In.held('down')) my += 1;
    if (In.held('left')) mx -= 1;
    if (In.held('right')) mx += 1;
    if (sc.invert && sc.invert.t >= 0) { mx = -mx; my = -my; }
    // sur la glace, on glisse : la vitesse change lentement
    const ice = sc.kind === 'dungeon' && W.iceAt(sc.map, p.x, p.y + 4);
    if (ice || p.ivx || p.ivy) {
      const l = Math.hypot(mx, my) || 1;
      const spd = p.st.speed * (1 + sumBuff(p, 'speed')) * (1 - (p.slowAmt || 0));
      const tvx = (mx / l) * spd, tvy = (my / l) * spd;
      if (ice) {
        const k = Math.min(1, dt * (mx || my ? 2.6 : 0.9));
        p.ivx = (p.ivx || 0) + (tvx - (p.ivx || 0)) * k; p.ivy = (p.ivy || 0) + (tvy - (p.ivy || 0)) * k;
        if (Math.abs(p.ivx) < 3) p.ivx = 0;
        if (Math.abs(p.ivy) < 3) p.ivy = 0;
        const bx = p.x, by = p.y;
        W.move(sc.map, p, p.ivx * dt, p.ivy * dt);
        if (Math.abs(p.x - bx) < Math.abs(p.ivx * dt) * 0.4) p.ivx *= -0.25;
        if (Math.abs(p.y - by) < Math.abs(p.ivy * dt) * 0.4) p.ivy *= -0.25;
        p.walk += dt * Math.hypot(p.ivx, p.ivy) * 0.05;
        if ((p.ivx || p.ivy) && Math.random() < dt * 12) sc.parts.push({ x: p.x, y: p.y + 4, vx: -p.ivx * 0.1, vy: -p.ivy * 0.1, t: 0, life: 0.35, r: 2, color: '#e8f4fb', kind: 'puff' });
        if (mx || my) tuto('move', Math.hypot(p.x - bx, p.y - by));
        p.vx = (p.x - px) / dt; p.vy = (p.y - py) / dt;
        if (In.held('attack') && !G.UI.panelOpen()) Game.useAbility(0);
        return;
      }
      p.ivx = p.ivy = 0; // de retour sur la terre ferme : plus d'élan
    }
    if (mx || my) {
      const l = Math.hypot(mx, my);
      const water = W.waterAt(sc.map, p.x, p.y);
      const spd = p.st.speed * (1 + sumBuff(p, 'speed')) * (1 - (p.slowAmt || 0)) * (sc.kind === 'town' ? 1.25 : 1) * (water ? 0.6 : 1);
      W.move(sc.map, p, (mx / l) * spd * dt, (my / l) * spd * dt);
      p.walk += dt * spd * 0.08;
      p.stepT -= dt;
      if (p.stepT <= 0) {
        p.stepT = 0.26;
        if (water) ring(p.x, p.y + 4, 14, '#e8f4f0', 0.4);
        else sc.parts.push({ x: p.x - mx * 6, y: p.y + 3, vx: -mx * 10, vy: -my * 10, t: 0, life: 0.45, r: 2.5, color: '#8a7a62', kind: 'puff' });
      }
      tuto('move', Math.hypot(p.x - px, p.y - py));
    }
    p.vx = (p.x - px) / dt; p.vy = (p.y - py) / dt;
    if (In.held('attack') && !G.UI.panelOpen()) Game.useAbility(0);
  }

  Game.drinkPotion = function () {
    const p = Game.player, ch = Game.char;
    if (!p || p.dead || Game.mode !== 'play') return;
    if (ch.potions <= 0) { warn('Plus de potions. La marchande en vend.'); return; }
    if (p.potionCd > 0) return;
    if (p.hp >= p.maxHp) { warn('Votre vie est déjà pleine.'); return; }
    ch.potions--;
    p.potionCd = D.POTION_CD;
    healUnit(p, p.maxHp * D.POTION_HEAL);
    parts(p.x, p.y - 10, 10, '#a8321f', 'spark', 80);
    tuto('potion');
  };

  // ================= Vie de la ville (habitants, animaux, instructrice) =================
  function updateNpcs(sc, dt) {
    const p = Game.player, m = sc.map;
    for (const n of sc.npcs) {
      if (n.bubble) { n.bubble.t -= dt; if (n.bubble.t <= 0) n.bubble = null; }
      if (n.role === 'villager') {
        n.chatCd -= dt;
        if (n.chatCd <= 0 && G.dist(n, p) < 170) { n.chatCd = 14 + Math.random() * 12; n.bubble = { text: G.pick(Game.char.legend && D.RUMORS_AFTER && Math.random() < 0.6 ? D.RUMORS_AFTER : D.RUMORS), t: 4 }; }
        if (n.wait > 0) { n.wait -= dt; continue; }
        if (!n.target) n.target = G.pick(m.paths);
        const dx = n.target[0] - n.x, dy = n.target[1] - n.y, d = Math.hypot(dx, dy);
        if (d < 12) { n.target = null; n.wait = 1 + Math.random() * 4; continue; }
        const ox = n.x, oy = n.y;
        W.move(m, n, (dx / d) * n.speed * dt, (dy / d) * n.speed * dt);
        n.walk += dt * n.speed * 0.09; n.facing = dx >= 0 ? 1 : -1; n.aim = Math.atan2(dy, dx);
        if (Math.hypot(n.x - ox, n.y - oy) < n.speed * dt * 0.3) { n.stuck += dt; if (n.stuck > 1.2) { n.stuck = 0; n.target = null; n.wait = 0.5; } } else n.stuck = 0;
      } else if (n.role === 'chicken') {
        if (n.peck > 0) n.peck -= dt;
        n.wait -= dt;
        if (n.wait <= 0) {
          n.wait = 0.6 + Math.random() * 2;
          if (Math.random() < 0.5) n.peck = 0.3;
          else { const a = Math.random() * G.TAU, nx = n.hx + Math.cos(a) * 40, ny = n.hy + Math.sin(a) * 26; n.facing = nx > n.x ? 1 : -1; n.goal = [nx, ny]; }
        }
        if (G.dist(n, p) < 40) { const a = Math.atan2(n.y - p.y, n.x - p.x); n.goal = [n.x + Math.cos(a) * 60, n.y + Math.sin(a) * 60]; n.facing = Math.cos(a) >= 0 ? 1 : -1; }
        if (n.goal) { const dx = n.goal[0] - n.x, dy = n.goal[1] - n.y, d = Math.hypot(dx, dy); if (d < 4) n.goal = null; else { W.move(m, n, (dx / d) * 70 * dt, (dy / d) * 70 * dt); n.walk += dt * 10; } }
      } else if (n.role === 'cat') {
        n.wait -= dt;
        if (n.wait <= 0) { n.wait = 3 + Math.random() * 5; n.sit = Math.random() < 0.5; if (!n.sit) { const a = Math.random() * G.TAU; n.goal = [n.hx + Math.cos(a) * 60, n.hy + Math.sin(a) * 30]; } }
        if (!n.sit && n.goal) { const dx = n.goal[0] - n.x, dy = n.goal[1] - n.y, d = Math.hypot(dx, dy); if (d < 4) { n.goal = null; n.sit = true; } else { W.move(m, n, (dx / d) * 45 * dt, (dy / d) * 45 * dt); n.facing = dx >= 0 ? 1 : -1; n.walk += dt * 4; } }
      } else if (n.role === 'brenna') {
        if (n.goal) {
          const dx = n.goal[0] - n.x, dy = n.goal[1] - n.y, d = Math.hypot(dx, dy);
          if (d > 6) { W.move(m, n, (dx / d) * n.speed * dt, (dy / d) * n.speed * dt); n.walk += dt * 12; n.facing = dx >= 0 ? 1 : -1; continue; }
        }
        n.facing = p.x >= n.x ? 1 : -1; n.aim = Math.atan2(p.y - n.y, p.x - n.x);
      } else if (n.look !== 'portal' && n.look !== 'citygate') {
        if (G.dist(n, p) < 160) { n.facing = p.x >= n.x ? 1 : -1; n.aim = Math.atan2(p.y - n.y, p.x - n.x); }
      }
    }
  }

  // ================= Vent =================
  // Une rafale pousse le joueur (et les monstres qui ne volent pas) dans une direction.
  Game.gust = function (ang, strength, dur, warn) {
    const sc = Game.scene;
    sc.wind = { ang, str: strength, dur, t: -(warn || 0) };
  };
  function updateWind(sc, dt) {
    const p = Game.player;
    if (sc.kind === 'dungeon' && sc.def && sc.def.wind && !sc.wind) {
      sc.windTimer = (sc.windTimer == null ? 8 : sc.windTimer) - dt;
      if (sc.windTimer <= 0) {
        sc.windTimer = G.rnd(9, 14);
        Game.gust(Math.floor(Math.random() * 8) * (Math.PI / 4), 115, 1.8, 1.0);
        G.UI.toast('Le vent se lève…', '#5a6f86', 1.6);
      }
    }
    const w = sc.wind;
    if (!w) return;
    w.t += dt;
    if (w.t >= w.dur) { sc.wind = null; return; }
    if (w.toward) { if (w.toward.dead) { sc.wind = null; return; } if (p) w.ang = Math.atan2(w.toward.y - p.y, w.toward.x - p.x); }
    if (w.t < 0) return;
    const k = w.str * dt * Math.min(1, (w.dur - w.t) * 2 + 0.2);
    const dx = Math.cos(w.ang) * k, dy = Math.sin(w.ang) * k;
    if (p && !p.dead && !p.dash) W.move(sc.map, p, dx, dy);
    sc.units.forEach((u) => { if (!u.isPlayer && alive(u) && !u.boss && !u.def.flying && !u.dummyUnit && u.speed > 0) W.move(sc.map, u, dx * 0.7, dy * 0.7); });
  }

  // ================= Pièges propres à certains donjons =================
  function updateEnv(sc, dt) {
    const p = Game.player;
    if (sc.kind === 'dungeon' && sc.def && sc.def.env && !sc.victory && p && !p.dead) {
      sc.envT = (sc.envT == null ? 14 : sc.envT) - dt;
      if (sc.envT <= 0) {
        const env = sc.def.env;
        if (env === 'sandstorm') {
          sc.envT = G.rnd(20, 28);
          if (!sc.storm) { sc.storm = { t: 0, dur: 6, str: 115, next: 1 }; G.UI.toast('Une tempête de sable se lève !', '#8a6a3a', 2); }
        } else if (env === 'eclipse') {
          sc.envT = G.rnd(26, 36);
          if (!sc.eclipse) { sc.eclipse = { t: 0, dur: 6 }; G.UI.toast('L\'éclipse approche… la lumière s\'éteint.', '#3b3346', 2); }
        } else if (env === 'ashrain') {
          sc.envT = G.rnd(7, 11);
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * G.TAU, d = i === 0 ? 0 : G.rnd(60, 150);
            const pt = i === 0 ? predict(p, 0.6) : { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
            if (W.solidAt(sc.map, pt.x, pt.y)) continue;
            sc.hazards.push({ id: G.uid(), shape: 'circle', x: pt.x, y: pt.y, r: 46, t: 0, delay: 1.25 + i * 0.15, dmg: envDmg(sc.def) * 0.8, faction: 'e', src: null, color: '#d0571b', drop: 'ash', cause: 'la pluie de cendres' });
          }
        }
      }
    }
    if (sc.storm) {
      const st = sc.storm;
      st.t += dt; st.next -= dt;
      if (st.t >= st.dur) sc.storm = null;
      else if (st.next <= 0 && !sc.wind) { st.next = G.rnd(1.5, 2.3); Game.gust(Math.floor(Math.random() * 8) * (Math.PI / 4), st.str, 1.2, 0.6); }
    }
    if (sc.eclipse) { sc.eclipse.t += dt; if (sc.eclipse.t >= sc.eclipse.dur) sc.eclipse = null; }
    if (sc.invert) {
      const was = sc.invert.t;
      sc.invert.t += dt;
      if (was < 0 && sc.invert.t >= 0 && p) text(p.x, p.y - 56, 'Commandes inversées !', '#7b3fa6', 22);
      if (sc.invert.t >= sc.invert.dur) { sc.invert = null; if (p) text(p.x, p.y - 50, 'Vous vous réveillez.', '#7b3fa6', 18); }
    }
  }

  // ================= Boucle de mise à jour =================
  Game.update = function (dt) {
    const sc = Game.scene;
    if (!sc || Game.mode !== 'play' || Game.paused) return;
    Game.time += dt;
    if (Game.char) Game.char.time = (Game.char.time || 0) + dt;
    S.boil = Math.floor(Game.time * 7);
    const p = Game.player, m = sc.map;
    Game.mouse.wx = Game.mouse.x + Game.cam.x;
    Game.mouse.wy = Game.mouse.y + Game.cam.y;

    updatePlayer(p, dt);
    if (Game.mode !== 'play') return;
    if (sc.kind === 'dungeon') {
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
      if (m.gateLocked !== m._lastGate) { m._lastGate = m.gateLocked; m.flowDirty = true; }
      if (!m.flowT || m.flowT[0] !== tx || m.flowT[1] !== ty || m.flowDirty) { W.flow(m, tx, ty); m.flowDirty = false; }
      W.reveal(m, p.x, p.y, 7);
    } else if (sc.kind === 'tuto') {
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
      if (!m.flowT || m.flowT[0] !== tx || m.flowT[1] !== ty) W.flow(m, tx, ty);
    }
    for (const u of sc.units) if (!u.isPlayer && !u.dead) updateUnit(u, dt);
    if (Game.mode !== 'play') return;
    separate(sc);
    sc.timers.forEach((t) => (t.t -= dt));
    const due = sc.timers.filter((t) => t.t <= 0);
    sc.timers = sc.timers.filter((t) => t.t > 0);
    due.forEach((t) => t.fn());
    updateEmitters(sc, dt);
    updateEnv(sc, dt);
    updateWind(sc, dt);
    updateProjs(sc, dt);
    updateHazards(sc, dt);
    updateZones(sc, dt);
    updateDrops(sc, dt, p);
    updateNpcs(sc, dt);
    if (G.FX) G.FX.update(sc, dt);
    sc.corpses.forEach((c) => (c.t += dt));
    sc.corpses = sc.corpses.filter((c) => c.t < c.life);
    sc.texts.forEach((t) => { t.t += dt; t.y -= 34 * dt; });
    sc.texts = sc.texts.filter((t) => t.t < t.life);
    sc.parts.forEach((q) => { q.t += dt; if (q.vx != null) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy = q.vy * 0.9 + (q.kind === 'puff' ? -20 : 200) * dt; } });
    sc.parts = sc.parts.filter((q) => q.t < q.life);
    sc.units = sc.units.filter((u) => !u.dead || u.isPlayer);
    if (sc.boss && !sc.boss.dormant && !sc.boss.dead) G.UI.bossBar(sc.boss);
    if (sc.kind === 'tuto' && G.Tuto) G.Tuto.update(dt);
    if (Game.scene !== sc) return;
    sc.prompt = findInteract(sc, p);
    const cam = Game.cam;
    const tx = p.x - Game.W / 2, ty = p.y - 10 - Game.H / 2;
    cam.x += (tx - cam.x) * Math.min(1, dt * 8);
    cam.y += (ty - cam.y) * Math.min(1, dt * 8);
    cam.x = G.clamp(cam.x, 0, Math.max(0, m.w * T - Game.W));
    cam.y = G.clamp(cam.y, 0, Math.max(0, m.h * T - Game.H));
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 30);
  };

  function separate(sc) {
    const us = sc.units.filter((u) => alive(u));
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.85;
      if (d > 0 && d < min) {
        const push = (min - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.isPlayer ? 0.3 : a.boss || a.dummyUnit ? 0 : 1, wb = b.isPlayer ? 0.3 : b.boss || b.dummyUnit ? 0 : 1;
        if (!a.dash && wa) W.move(sc.map, a, -nx * push * wa, -ny * push * wa);
        if (!b.dash && wb) W.move(sc.map, b, nx * push * wb, ny * push * wb);
      }
    }
  }

  function updateEmitters(sc, dt) {
    for (const e of sc.emitters) {
      e.t += dt; e.acc += dt;
      if (!e.src || e.src.dead) { e.t = e.dur; continue; }
      while (e.acc >= e.rate) {
        e.acc -= e.rate;
        if (e.kind === 'rain') {
          const A = e.atk, tg = e.tgt && !e.tgt.dead ? e.tgt : Game.player;
          e.n++;
          let pt;
          if (e.n % 3 === 1) pt = predict(tg, A.delay * 0.6);
          else { const a = Math.random() * G.TAU, d = G.rnd(40, A.spread || 150); pt = { x: tg.x + Math.cos(a) * d, y: tg.y + Math.sin(a) * d }; }
          if (W.solidAt(sc.map, pt.x, pt.y)) continue;
          sc.hazards.push({ id: G.uid(), shape: 'circle', x: pt.x, y: pt.y, r: A.radius, t: 0, delay: A.delay, dmg: e.dmg, faction: e.src.faction, src: e.src, color: A.color, drop: A.look || 'meteor',
            freeze: A.freeze, pool: A.pool ? mkPool(e.src, A.pool) : null });
          continue;
        }
        for (let k = 0; k < e.arms; k++) {
          const a = e.ang0 + (k / e.arms) * G.TAU + e.t * e.spin;
          spawnProj({ x: e.src.x, y: e.src.y - 14, ang: a, speed: e.speed, r: 6, range: 760, faction: e.src.faction, src: e.src, dmg: e.dmg, color: e.color, look: 'orb' });
        }
      }
    }
    sc.emitters = sc.emitters.filter((e) => e.t < e.dur);
  }

  function updateProjs(sc, dt) {
    const m = sc.map;
    for (const pr of sc.projs) {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.dist += pr.speed * dt;
      if (pr.dist > pr.range || W.solidAt(m, pr.x, pr.y + 8)) { explodeProj(sc, pr); pr.dead = true; continue; }
      for (const u of sc.units) {
        if (u.faction === pr.faction || !alive(u) || pr.hit.has(u.id)) continue;
        if (Math.hypot(u.x - pr.x, u.y - 10 - pr.y) > u.r + pr.r + 2) continue;
        if (pr.aoe) { explodeProj(sc, pr); pr.dead = true; break; }
        pr.hit.add(u.id);
        if (pr.mult) {
          const rd = rollDmg(pr.src, pr.mult, { bonus: pr.bonus, forceCrit: pr.forceCrit });
          hitUnit(pr.src, u, rd.d, { crit: rd.crit, stun: pr.stun, slow: pr.slow, lifesteal: pr.lifesteal });
        } else {
          dealDamage(pr.src, u, pr.dmg, { cause: pr.cause });
          if (u.faction === 'p' && !isInvuln(u) && !u.dead) {
            if (pr.slow) { u.slowT = 2; u.slowAmt = Math.max(u.slowAmt || 0, pr.slow); }
            if (pr.poison) u.dots.push({ dps: (pr.dmg * pr.poison) / 3, t: 3, acc: 0, src: pr.src });
          }
        }
        if (--pr.pierce < 0) { pr.dead = true; break; }
      }
    }
    sc.projs = sc.projs.filter((p) => !p.dead);
  }
  function explodeProj(sc, pr) {
    parts(pr.x, pr.y, 4, pr.color || '#2b2118', 'ink', 90);
    if (!pr.aoe) return;
    ring(pr.x, pr.y, pr.aoe, pr.color || '#d0571b', 0.35);
    decal(pr.x, pr.y + 10, pr.aoe * 0.35, '#3a2a1a', 'scorch');
    if (pr.faction === 'p' && pr.mult) playerAoe(pr.src, pr.x, pr.y + 10, pr.aoe, pr.mult, { bonus: pr.bonus });
    Game.shake(3);
  }

  function updateHazards(sc, dt) {
    for (const h of sc.hazards) {
      if (h.follow) { if (h.follow.dead) { h.dead = true; continue; } h.x = h.follow.x; h.y = h.follow.y - (h.shape === 'cone' ? 6 : 0); }
      h.t += dt;
      if (h.t < h.delay) continue;
      h.dead = true;
      if (h.warnOnly) continue;
      let hitPlayer = false;
      sc.units.filter((u) => u.faction !== h.faction && alive(u)).forEach((u) => {
        let inside;
        if (h.shape === 'circle') inside = inEllipse(h.x, h.y, h.r, u);
        else if (h.shape === 'cone') inside = inCone(h.x, h.y, h.ang, h.r, h.arc, u);
        else inside = inLine(h.x, h.y, h.ang, h.len, h.width, u);
        if (!inside) return;
        if (u.isPlayer) hitPlayer = true;
        if (h.mult) { const rd = rollDmg(h.src, h.mult); hitUnit(h.src, u, rd.d, { crit: rd.crit, stun: h.stun, sleep: h.sleep, slow: h.slow }); }
        else {
          const invul = u.faction === 'p' && isInvuln(u);
          dealDamage(h.src, u, h.dmg, { cause: h.cause });
          if (u.faction === 'p' && !u.dead && !invul) {
            if (h.poison) u.dots.push({ dps: h.dmg * 0.4, t: 3, acc: 0, src: h.src });
            if (h.slow) { u.slowT = 1.8; u.slowAmt = Math.max(u.slowAmt || 0, h.slow); }
            if (h.freeze && u.isPlayer) { u.stunT = Math.max(u.stunT, h.freeze); u.frozenT = h.freeze; u.sleep = false; text(u.x, u.y - 50, 'Gelé !', '#2f6f9a', 22); }
            if (h.sleepP && u.isPlayer) { u.stunT = Math.max(u.stunT, h.sleepP); u.sleep = true; text(u.x, u.y - 50, 'Endormi !', '#7b3fa6', 22); }
            if (h.yank && h.src && !h.src.dead) {
              // tiré vers le monstre
              const a = Math.atan2(h.src.y - u.y, h.src.x - u.x), dd = Math.hypot(h.src.x - u.x, h.src.y - u.y) - (h.src.r + u.r + 10);
              if (dd > 0) W.move(sc.map, u, Math.cos(a) * dd, Math.sin(a) * dd);
              sc.parts.push({ kind: 'beam', x0: h.src.x, y0: h.src.y - 14, x: u.x, y: u.y - 14, t: 0, life: 0.35, color: h.color || '#b8a070' });
              text(u.x, u.y - 50, 'Attiré !', '#8a6a3a', 20);
            }
          }
        }
      });
      if (h.faction === 'e' && h.src && h.src.def && h.src.def.dummy) tuto(hitPlayer ? 'runeHit' : 'dodge');
      if (h.pool) sc.zones.push({ id: G.uid(), kind: h.pool.kind, x: h.x, y: h.y, r: h.r * 0.9, dur: h.pool.dur, t: 0, interval: 0.5, acc: 0, dmg: h.pool.dmg, faction: h.faction, src: h.src, color: h.pool.color, poison: h.poison });
      if (h.linePool) {
        const P = h.linePool, n = Math.max(2, Math.floor(h.len / (h.width * 2.2)));
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n, x = h.x + Math.cos(h.ang) * h.len * f, y = h.y + Math.sin(h.ang) * h.len * f;
          if (!W.solidAt(sc.map, x, y)) sc.zones.push({ id: G.uid(), kind: P.kind, x, y, r: h.width * 0.6, dur: P.dur, t: 0, interval: 0.5, acc: 0, dmg: P.dmg, faction: h.faction, src: h.src, color: P.color, cause: 'un sillon de braises' });
        }
      }
      if (h.shape === 'circle') {
        ring(h.x, h.y, h.r, h.color || (h.faction === 'e' ? '#9b2c20' : '#c9a227'), 0.3);
        parts(h.x, h.y, h.bomb ? 14 : 6, h.bomb ? '#4a3b2a' : '#2b2118', 'ink', h.bomb ? 260 : 150);
        if (h.bomb) decal(h.x, h.y, h.r * 0.45, '#3a2a1a', 'scorch');
        if (h.bomb || h.r > 100) Game.shake(h.bomb ? 5 : 6);
      } else if (h.shape === 'line') for (let i = 0; i < 6; i++) parts(h.x + Math.cos(h.ang) * h.len * (i / 6), h.y + Math.sin(h.ang) * h.len * (i / 6), 2, '#5d4a1e', 'ink', 120);
      else sc.parts.push({ kind: 'slash', x: h.x, y: h.y, ang: h.ang, arc: h.arc, r: h.r, t: 0, life: 0.18, color: '#7a2734' });
    }
    sc.hazards = sc.hazards.filter((h) => !h.dead);
  }

  function updateZones(sc, dt) {
    for (const z of sc.zones) {
      z.t += dt;
      if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; }
      if (z.warm && z.t < z.warm) continue;
      if (z.grow) z.r = z.r0 + (z.r1 - z.r0) * Math.min(1, (z.t - (z.warm || 0)) / z.grow);
      if (z.chase && !z.chase.dead) {
        const a = Math.atan2(z.chase.y - z.y, z.chase.x - z.x), nx = z.x + Math.cos(a) * z.speed * dt, ny = z.y + Math.sin(a) * z.speed * dt;
        if (!W.solidAt(sc.map, nx, ny)) { z.x = nx; z.y = ny; }
      }
      if (z.pull) sc.units.forEach((u) => {
        if (u.faction === z.faction || !alive(u) || u.boss || (u.isPlayer && (u.dash || isInvuln(u)))) return;
        const d = Math.hypot(u.x - z.x, u.y - z.y);
        if (d > z.r * 1.7 || d < 6) return;
        const k = z.pull * dt * (1 - d / (z.r * 1.9));
        W.move(sc.map, u, ((z.x - u.x) / d) * k, ((z.y - u.y) / d) * k);
      });
      z.acc += dt;
      while (z.acc >= z.interval) {
        z.acc -= z.interval;
        sc.units.forEach((u) => {
          if (u.faction === z.faction || !alive(u) || !inEllipse(z.x, z.y, z.r, u)) return;
          if (z.mult) { const rd = rollDmg(z.src, z.mult); hitUnit(z.src, u, rd.d, { crit: rd.crit, slow: z.slow, weaken: z.weaken, isDot: true }); }
          else {
            if (z.dmg) dealDamage(z.src && !z.src.dead ? z.src : null, u, z.dmg, { isDot: true, cause: z.cause });
            if (u.faction === 'p' && z.poison && !u.dead) { u.slowT = 0.6; u.slowAmt = Math.max(u.slowAmt || 0, 0.2); }
            if (u.faction === 'p' && z.slow && !u.dead) { u.slowT = 0.6; u.slowAmt = Math.max(u.slowAmt || 0, z.slow); }
            if (u.isPlayer && z.sleepy && !u.dead && !isInvuln(u)) {
              u.drowse = (u.drowse || 0) + z.interval;
              if (u.drowse >= 2) { u.drowse = -1.5; u.stunT = Math.max(u.stunT, 1.2); u.sleep = true; text(u.x, u.y - 50, 'Vous vous endormez !', '#7b3fa6', 20); }
              else if (u.drowse >= 1 && Math.random() < 0.5) text(u.x, u.y - 46, 'Somnolence…', '#9c7cc4', 15);
            }
          }
        });
      }
    }
    sc.zones = sc.zones.filter((z) => z.t < z.dur);
  }

  function updateDrops(sc, dt, p) {
    const ch = Game.char;
    for (const d of sc.drops) {
      d.t += dt;
      if (d.t < 0.4) continue;
      const dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (d.kind === 'gold' && dist < 110) { const a = Math.atan2(p.y - d.y, p.x - d.x); d.x += Math.cos(a) * 380 * dt; d.y += Math.sin(a) * 380 * dt; }
      if (dist > 24) continue;
      if (d.kind === 'gold') { ch.gold += d.amount; if (sc.run) sc.run.gold += d.amount; text(p.x, p.y - 44, '+' + d.amount + ' or', '#b8862b', 16); d.dead = true; }
      else if (d.kind === 'potion') {
        if (ch.potions >= D.MAX_POTIONS) { if (!d.warned) { warn('Vous portez déjà ' + D.MAX_POTIONS + ' potions.'); d.warned = true; } continue; }
        ch.potions++; text(p.x, p.y - 44, '+1 potion', '#a8321f', 16); d.dead = true;
      } else if (d.kind === 'item') {
        if (ch.bag.length >= D.BAG_SIZE) { if (!d.warned) { warn('Sac plein ! Vendez ou jetez des objets.'); d.warned = true; } continue; }
        if (sc.kind === 'dungeon') { d.item.run = true; sc.run.items.push(d.item.id); }
        ch.bag.push(d.item);
        text(p.x, p.y - 50, I.fullName(d.item), D.RARITY[d.item.rarity].color, d.item.rarity >= 3 ? 22 : 17, 1.6);
        if (d.item.rarity >= 3) G.UI.toast((d.item.rarity === 4 ? 'LÉGENDAIRE : ' : 'Épique : ') + d.item.name, D.RARITY[d.item.rarity].color, 3);
        d.dead = true;
        tuto('pickup', d.item);
        G.UI.refreshPanel();
      }
    }
    sc.drops = sc.drops.filter((d) => !d.dead);
  }

  // ================= Interactions (touche E) =================
  function findInteract(sc, p) {
    let best = null;
    const consider = (x, y, label, act, range) => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < (range || 64) && d < (best ? best.d : 1e9)) best = { d, label, act };
    };
    sc.npcs.forEach((n) => {
      if (n.role === 'villager') consider(n.x, n.y, 'Discuter avec ' + n.name, () => { n.bubble = { text: G.pick(D.RUMORS), t: 4.5 }; n.wait = 3; n.facing = p.x >= n.x ? 1 : -1; }, 56);
      else if (n.role === 'cat') consider(n.x, n.y, 'Caresser ' + n.name, () => { n.bubble = { text: G.pick(['Miaou.', 'Rrrrrr…', 'Mrrrou ?']), t: 2.5 }; n.sit = true; n.wait = 4; }, 44);
      else if (n.role === 'chicken') return;
      else if (n.role === 'brenna') consider(n.x, n.y, 'Parler à ' + n.name, () => G.Tuto && G.Tuto.talk(), 70);
      else if (n.role === 'gateTuto') consider(n.x, n.y, 'Entrer à Havre-Gris', () => G.Tuto && G.Tuto.gate(), 90);
      else consider(n.x, n.y, (n.look === 'portal' ? 'Utiliser le ' : 'Parler à ') + n.name, () => G.UI.openPanel(n.role), n.look === 'portal' ? 90 : 64);
    });
    sc.chests.forEach((c) => { if (!c.opened) consider(c.x, c.y, 'Ouvrir le coffre', () => openChest(c)); });
    sc.portals.forEach((pt) => consider(pt.x, pt.y, pt.victory ? 'Retourner à Havre-Gris' : 'Quitter le donjon', () => (pt.victory ? Game.leaveDungeon(true) : G.UI.confirm('Quitter le donjon ?', 'Le butin déjà ramassé est conservé, mais le donjon sera réinitialisé (monstres et boss).', 'Quitter', () => Game.leaveDungeon(false))), 70));
    return best;
  }
  Game.interact = function () {
    const sc = Game.scene;
    if (!sc || !sc.prompt || Game.mode !== 'play') return;
    sc.prompt.act();
  };

  function openChest(c) {
    c.opened = true;
    const ch = Game.char;
    addDrop(c.x, c.y + 20, { kind: 'gold', amount: Math.round(G.rint(15, 30) * (1 + 0.3 * (c.lvl - 1))) });
    addDrop(c.x, c.y + 20, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: c.lvl + 1, src: 'chest' }) });
    if (G.chance(0.3)) addDrop(c.x, c.y + 20, { kind: 'potion' });
    ring(c.x, c.y, 50, '#c9a227');
    parts(c.x, c.y - 10, 12, '#c9a227', 'spark', 140);
  }

  // ================= Sortie, victoire, mort =================
  function secureLoot() {
    const ch = Game.char;
    ch.bag.forEach((it) => delete it.run);
    D.SLOTS.forEach((s) => ch.equip[s] && delete ch.equip[s].run);
  }

  Game.leaveDungeon = function (victory) {
    const sc = Game.scene, ch = Game.char;
    secureLoot();
    if (sc.usedBound) ch.boundBoss = null;
    const run = sc.run;
    Game.refreshShop();
    const summary = { victory, name: sc.def.name, kills: run.kills, gold: run.gold, xp: run.xp, items: run.items.length, time: Game.time - run.t0 };
    Game.enterTown('portal');
    G.UI.showSummary(summary);
  };

  Game.onPlayerDeath = function () {
    const sc = Game.scene, ch = Game.char, p = Game.player;
    if (sc.kind === 'tuto') {
      // pas de pénalité pendant l'apprentissage
      p.dead = false; p.hp = p.maxHp * 0.6;
      G.UI.toast('La sergente Brenna vous relève : « Debout, recrue ! Ici, on apprend. »', '#8c3b2a', 4);
      return;
    }
    Game.mode = 'dead';
    G.UI.bossBar(null);
    if (ch.hardcore) {
      // Mode Hardcore : une seule vie, le héros est effacé et gravé au cimetière
      const kills = Object.values(ch.kills || {}).reduce((a, b) => a + b, 0);
      const mem = { name: ch.name, cls: ch.cls, lvl: ch.lvl, cleared: ch.cleared, kills, cause: p.lastHit || 'une force inconnue',
        place: sc.kind === 'dungeon' ? sc.def.name : 'Havre-Gris', time: Math.round(ch.time || 0), date: Date.now() };
      const data = G.Save.data;
      data.chars = data.chars.filter((c) => c !== ch);
      data.last = 0;
      data.graveyard = [mem].concat(data.graveyard || []).slice(0, 20);
      Game.save(true);
      setTimeout(() => G.UI.showHardcoreDeath(mem), 1100);
      return;
    }
    const lost = { items: [], gold: 0, destroyed: null, dungeon: sc.kind === 'dungeon' ? sc.def.name : 'Havre-Gris' };
    ch.bag = ch.bag.filter((it) => { if (it.run) { lost.items.push(it); return false; } return true; });
    D.SLOTS.forEach((s) => { const it = ch.equip[s]; if (it && it.run) { lost.items.push(it); ch.equip[s] = null; } });
    lost.gold = Math.floor(ch.gold * 0.25);
    ch.gold -= lost.gold;
    const slots = D.SLOTS.filter((s) => ch.equip[s]);
    if (slots.length) { const s = G.pick(slots); lost.destroyed = ch.equip[s]; ch.equip[s] = null; }
    if (sc.usedBound) ch.boundBoss = null;
    ch.deaths++;
    Game.save(true);
    setTimeout(() => G.UI.showDeath(lost), 900);
  };

  // ================= Inventaire =================
  Game.equip = function (idx) {
    const ch = Game.char, it = ch.bag[idx];
    if (!it) return;
    const old = ch.equip[it.slot];
    ch.bag.splice(idx, 1);
    if (old) ch.bag.splice(idx, 0, old);
    ch.equip[it.slot] = it;
    Game.refreshStats(); Game.save();
    tuto('equip', it);
  };
  Game.unequip = function (slot) {
    const ch = Game.char;
    if (!ch.equip[slot]) return;
    if (ch.bag.length >= D.BAG_SIZE) { warn('Sac plein.'); return; }
    ch.bag.push(ch.equip[slot]); ch.equip[slot] = null;
    Game.refreshStats(); Game.save();
  };
  Game.destroyItem = function (idx) { Game.char.bag.splice(idx, 1); Game.save(); };
  Game.sellItem = function (idx) {
    const ch = Game.char, it = ch.bag[idx];
    if (!it) return 0;
    ch.gold += it.value; ch.bag.splice(idx, 1); Game.save();
    return it.value;
  };

  Game.refreshShop = function () {
    const ch = Game.char;
    const items = [];
    for (let i = 0; i < 6; i++) items.push(I.make({ cls: ch.cls, ilvl: ch.lvl, src: 'shop' }));
    ch.shop = { items };
  };
  Game.shopPrice = (it) => Math.round(it.value * 4);
  Game.buyItem = function (i) {
    const ch = Game.char, it = ch.shop.items[i];
    if (!it) return false;
    const price = Game.shopPrice(it);
    if (ch.gold < price) { warn('Pas assez d\'or.'); return false; }
    if (ch.bag.length >= D.BAG_SIZE) { warn('Sac plein.'); return false; }
    ch.gold -= price; ch.bag.push(it); ch.shop.items.splice(i, 1); Game.save();
    return true;
  };
  Game.buyPotion = function () {
    const ch = Game.char, price = D.POTION_PRICE(ch.lvl);
    if (ch.potions >= D.MAX_POTIONS) { warn('Maximum ' + D.MAX_POTIONS + ' potions.'); return false; }
    if (ch.gold < price) { warn('Pas assez d\'or.'); return false; }
    ch.gold -= price; ch.potions++; Game.save();
    return true;
  };

  Game.forge = function (ref) {
    const ch = Game.char;
    const it = ref.startsWith('e:') ? ch.equip[ref.slice(2)] : ch.bag[+ref.slice(2)];
    if (!it) return null;
    if ((it.up || 0) >= 10) return { msg: 'Cet objet est déjà au maximum (+10).' };
    const cost = I.forgeCost(it);
    if (ch.gold < cost) return { msg: 'Pas assez d\'or.' };
    ch.gold -= cost;
    const ok = Math.random() < I.forgeChance(it);
    let lost = false;
    if (ok) it.up = (it.up || 0) + 1;
    else if ((it.up || 0) >= 5) { it.up--; lost = true; }
    Game.refreshStats(); Game.save();
    return { ok, it, lost };
  };

  Game.learn = function (slot) {
    const ch = Game.char;
    const rank = ch.abil[slot] || 0;
    if (rank >= 3) return 'Rang maximum atteint.';
    const req = rank === 0 ? D.UNLOCK[slot] : D.RANK_COST(slot, rank + 1);
    if (ch.lvl < req.lvl) return 'Niveau ' + req.lvl + ' requis.';
    if (ch.gold < req.gold) return 'Pas assez d\'or.';
    ch.gold -= req.gold; ch.abil[slot] = rank + 1; Game.save();
    return null;
  };
  Game.learnTalent = function (id) {
    const ch = Game.char, def = D.TALENTS.find((t) => t.id === id);
    const r = ch.talents[id] || 0;
    if (r >= def.max) return 'Rang maximum atteint.';
    const cost = D.TALENT_COST(r + 1);
    if (ch.lvl < cost.lvl) return 'Niveau ' + cost.lvl + ' requis.';
    if (ch.gold < cost.gold) return 'Pas assez d\'or.';
    ch.gold -= cost.gold; ch.talents[id] = r + 1;
    Game.refreshStats(); Game.save();
    return null;
  };

  // ================= Quêtes =================
  Game.questState = (id) => Game.char.quests[id];
  Game.questAvailable = function (q) {
    const ch = Game.char;
    if (ch.quests[q.id]) return false;
    if (q.after && !(ch.quests[q.after] && ch.quests[q.after].state === 'rendue')) return false;
    return true;
  };
  Game.acceptQuest = function (id) { Game.char.quests[id] = { state: 'active', n: 0 }; Game.save(); };
  Game.questEvent = function (kind, type) {
    const ch = Game.char;
    D.QUESTS.forEach((q) => {
      const st = ch.quests[q.id];
      if (!st || st.state !== 'active' || q.type !== kind || q.target !== type) return;
      st.n++;
      if (st.n >= q.n) { st.state = 'terminée'; G.UI.toast('Quête terminée : ' + q.title + '. Retournez voir le Capitaine Aldric.', '#4f6b2b', 4); }
    });
  };
  Game.turnIn = function (id) {
    const ch = Game.char, q = D.QUESTS.find((x) => x.id === id), st = ch.quests[id];
    if (!st || st.state !== 'terminée') return;
    st.state = 'rendue';
    ch.gold += q.reward.gold;
    Game.addXp(q.reward.xp);
    Game.save();
  };

  // Où aller ensuite ? (flèche de guidage)
  Game.objective = function () {
    const sc = Game.scene, ch = Game.char;
    if (!sc) return null;
    if (sc.kind === 'tuto') return G.Tuto ? G.Tuto.target() : null;
    if (sc.kind === 'dungeon') { const v = sc.portals.find((p) => p.victory); return v ? { x: v.x, y: v.y, label: 'Sortie' } : null; }
    const npc = (role) => sc.npcs.find((n) => n.role === role);
    const done = D.QUESTS.some((q) => ch.quests[q.id] && ch.quests[q.id].state === 'terminée');
    const avail = D.QUESTS.some((q) => Game.questAvailable(q) && q.main);
    if (done || avail || !ch.quests.q1) { const a = npc('quests'); return a && { x: a.x, y: a.y, label: 'Capitaine Aldric' }; }
    const active = D.QUESTS.find((q) => q.main && ch.quests[q.id] && ch.quests[q.id].state === 'active');
    if (active) { const pt = npc('portal'); return pt && { x: pt.x, y: pt.y, label: 'Portail' }; }
    return null;
  };

  Game.save = function (now) { if (G.Save) G.Save.save(now); };
})();
