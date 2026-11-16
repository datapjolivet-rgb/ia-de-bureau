// Cœur du jeu : scènes, combat, IA, sorts, butin, mort, quêtes.
(function () {
  const D = G.D, W = G.W, I = G.I, S = G.S, R = G.R;
  const T = D.TILE;
  const DEG = Math.PI / 180;

  const Game = (G.Game = {
    W: 1280, H: 720, time: 0, mode: 'title', paused: false,
    keys: {}, mouse: { x: 640, y: 360, wx: 0, wy: 0, down: false },
    cam: { x: 0, y: 0, shake: 0 }, scene: null, player: null, char: null,
  });
  const mapCache = {};

  // ================= Personnage =================
  Game.newChar = function (name, cls) {
    return {
      name, cls, lvl: 1, xp: 0, gold: 40, potions: 3,
      equip: { arme: I.make({ cls, slot: 'arme', rarity: 0, ilvl: 1 }), torse: I.make({ cls, slot: 'torse', rarity: 0, ilvl: 1 }) },
      bag: [], abil: { 1: 1, 2: 1 }, talents: {}, quests: {}, cleared: 0, boundBoss: null, deaths: 0, kills: {}, shop: null, created: Date.now(),
    };
  };

  Game.start = function (char) {
    Game.char = char;
    if (!char.shop) Game.refreshShop();
    Game.enterTown();
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
    };
    Game.player = p;
    Game.refreshStats();
    p.hp = p.maxHp;
    const res = D.RES[C.res];
    p.res = res.start ? p.resMax : 0;
    return p;
  }

  // ================= Scènes =================
  function newScene(map, kind) {
    return { map, kind, units: [], projs: [], hazards: [], zones: [], drops: [], corpses: [], texts: [], parts: [], chests: [], portals: [], timers: [], npcs: [], boss: null, run: null, prompt: null };
  }

  Game.enterTown = function () {
    const m = mapCache.town || W.buildTown();
    if (!m.img) W.render(m);
    mapCache.town = m;
    const sc = newScene(m, 'town');
    sc.npcs = m.npcs.map((n) => Object.assign({}, n, { role: n.id, id: G.uid(), facing: 1, aim: Math.PI / 2, walk: 0, swingT: 0 }));
    const p = makePlayer(Game.char);
    p.x = m.spawn.x; p.y = m.spawn.y;
    sc.units.push(p);
    Game.scene = sc;
    Game.mode = 'play';
    snapCam();
    G.UI.onScene();
    Game.save();
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

  function snapCam() {
    const p = Game.player, m = Game.scene.map;
    Game.cam.x = G.clamp(p.x - Game.W / 2, 0, Math.max(0, m.w * T - Game.W));
    Game.cam.y = G.clamp(p.y - 10 - Game.H / 2, 0, Math.max(0, m.h * T - Game.H));
  }

  function spawnDungeon(sc, m, def) {
    const rng = G.seeded(def.id * 7331 + 5);
    m.rooms.forEach((r, ri) => {
      W.parseSpawns(r.spec).forEach((sp) => {
        if (sp.special === 'chest') {
          sc.chests.push({ id: G.uid(), x: (r.x + 2 + rng() * (r.w - 4)) * T, y: (r.y + 1.6) * T, opened: false, lvl: def.lvl + Math.floor(ri / 2) });
          return;
        }
        if (sp.special === 'boss') {
          const b = makeMonster(def.boss, (r.x + r.w / 2) * T, (r.y + r.h / 2) * T, def.lvl + 2, false);
          b.dormant = true; b.bossRoom = r;
          sc.boss = b; sc.units.push(b);
          return;
        }
        if (sp.special) return;
        for (let i = 0; i < sp.n; i++) {
          let x, y, tries = 0;
          do { x = (r.x + 1.5 + rng() * (r.w - 3)) * T; y = (r.y + 1.5 + rng() * (r.h - 3)) * T; } while (W.collides(m, x, y, 16) && ++tries < 20);
          const u = makeMonster(sp.type, x, y, def.lvl + Math.floor(ri / 2), sp.elite);
          sc.units.push(u);
        }
      });
    });
  }

  function makeMonster(type, x, y, lvl, elite) {
    const d = D.MONSTERS[type];
    // "Très dur" : les monstres normaux ont +30 % de vie et +35 % de dégâts
    let hp = d.boss ? d.hp : d.hp * 1.3 * (1 + 0.25 * (lvl - 1));
    let dmg = d.boss ? d.dmg : d.dmg * 1.35 * (1 + 0.16 * (lvl - 1));
    if (elite) { hp *= 3.5; dmg *= 1.4; }
    hp = Math.round(hp);
    const u = {
      id: G.uid(), type, def: d, name: d.name, x, y, r: d.r * (elite ? 1.25 : 1), hp, maxHp: hp, dmg, speed: d.speed, lvl, elite, boss: !!d.boss,
      faction: 'e', look: d.look, col: d.col, atkCd: {}, gcd: G.rnd(0.4, 1.4), aggro: false, facing: 1, aim: 0, walk: Math.random() * 6,
      hitT: 0, stunT: 0, slowT: 0, slowAmt: 0, weakT: 0, weakAmt: 0, dots: [], phase: 0, cast: null, dash: null, swingT: 0,
    };
    atkList(u).forEach((a, i) => (u.atkCd[u.phase + '_' + i] = Math.random() * a.cd * 0.6));
    return u;
  }

  function makeMinion(type, x, y, lvl, elite, bound) {
    const u = makeMonster(type, x, y, lvl, elite);
    const fromBoss = u.boss;
    u.faction = 'p'; u.minion = true; u.aggro = true; u.boss = false; u.bound = !!bound || fromBoss;
    u.maxHp = u.hp = Math.round(u.maxHp * (fromBoss ? 0.5 : 0.6));
    u.dmg *= fromBoss ? 0.5 : 0.65;
    u.life = u.bound ? 1e9 : elite ? 60 : 40;
    u.name = u.name + ' (serviteur)';
    u.ownerLvl = Game.char.lvl;
    return u;
  }

  function atkList(u) {
    const d = u.def;
    if (d.phases) {
      if (u.minion) return d.phases[0].atks.filter((a) => a.t !== 'summon');
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
  function ring(x, y, r, color, life) { Game.scene.parts.push({ x, y, r0: 6, r, t: 0, life: life || 0.35, color: color || '#2b2118', kind: 'ring' }); }
  Game.shake = (a) => { Game.cam.shake = Math.min(14, Math.max(Game.cam.shake, a)); };

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
    if (o.bonus) d *= o.bonus;
    else if (p.stealthStrike) d *= 3;
    return { d, crit };
  }
  function isInvuln(p) { return p.invulnT > 0 || hasBuff(p, 'divin') || (p.dash && p.dash.invuln); }
  Game.isInvuln = isInvuln;

  // ================= Dégâts =================
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
  const opposing = (f) => Game.scene.units.filter((u) => u.faction !== f && !u.dead && !u.dormant);

  function dealDamage(src, tgt, amt, o) {
    o = o || {};
    if (!tgt || tgt.dead || tgt.dormant) return 0;
    const sc = Game.scene;
    if (tgt.faction === 'p') {
      if (tgt.isPlayer) {
        if (isInvuln(tgt)) { if (Math.random() < 0.3) text(tgt.x, tgt.y - 40, 'Immunisé', '#c9a227', 16); return 0; }
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
      if (tgt.isPlayer) {
        tgt.combatT = 0;
        Game.shake(4 + (amt / tgt.maxHp) * 30);
        if (D.CLASSES[tgt.cls].res === 'rage') gainRes(tgt, (amt / tgt.maxHp) * 60);
        text(tgt.x, tgt.y - 36, '-' + Math.round(amt), '#b3261e', 20);
        G.UI.hurt();
      } else if (Math.random() < 0.5) text(tgt.x, tgt.y - 30, '-' + Math.round(amt), '#7a2734', 14);
      if (tgt.hp <= 0) {
        if (tgt.isPlayer && hasBuff(tgt, 'immortel')) tgt.hp = 1;
        else if (tgt.isPlayer && hasBuff(tgt, 'esprit')) {
          tgt.hp = tgt.maxHp * 0.4; tgt.buffs = tgt.buffs.filter((b) => b.id !== 'esprit');
          text(tgt.x, tgt.y - 50, 'Esprit protecteur !', '#c9a227', 24); ring(tgt.x, tgt.y, 90, '#e2c043');
        } else killUnit(tgt, src);
      }
      return amt;
    }
    // Cible ennemie
    tgt.hp -= amt; tgt.hitT = 0.12;
    if (!tgt.aggro) aggroUnit(tgt);
    const fromPlayer = src && src.isPlayer;
    if (fromPlayer || (src && src.minion)) {
      const big = o.crit;
      text(tgt.x, tgt.y - tgt.r * 2 - 6, Math.round(amt) + (big ? ' !' : ''), big ? '#c4661a' : src.minion ? '#3f7d2a' : '#2b2118', big ? 26 : o.isDot ? 15 : 19);
    }
    if (fromPlayer) {
      src.combatT = 0;
      const ls = (o.lifesteal || 0) + sumBuff(src, 'lifesteal');
      if (ls > 0) healUnit(src, amt * ls, true);
      if (hasBuff(src, 'poison') && !o.isDot) tgt.dots.push({ dps: (amt * 0.5) / 4, t: 4, acc: 0, src });
    }
    parts(tgt.x, tgt.y - tgt.r, o.crit ? 6 : 3, '#2b2118', 'ink', 140);
    if (tgt.hp <= 0) killUnit(tgt, src);
    return amt;
  }
  Game.dealDamage = dealDamage;

  function hitUnit(src, tgt, amt, o) {
    o = o || {};
    const done = dealDamage(src, tgt, amt, o);
    if (tgt.dead || tgt.faction === 'p') return done;
    if (o.stun) {
      const res = tgt.boss ? 0.3 : tgt.elite ? 0.5 : 1;
      tgt.stunT = Math.max(tgt.stunT, o.stun * res); tgt.sleep = !!o.sleep;
      tgt.cast = null; cancelHazards(tgt);
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
    if (u.aggro || u.dormant) return;
    u.aggro = true;
    Game.scene.units.forEach((o) => { if (o.faction === 'e' && !o.aggro && !o.dormant && G.dist(o, u) < 240) o.aggro = true; });
  }

  // ================= Mort d'une unité =================
  function killUnit(u, killer) {
    if (u.dead) return;
    u.dead = true; u.hp = 0;
    const sc = Game.scene;
    parts(u.x, u.y - 8, 14, '#2b2118', 'ink', 200);
    ring(u.x, u.y, u.r * 2.5, '#2b2118');
    cancelHazards(u);
    if (u.isPlayer) { Game.onPlayerDeath(); return; }
    if (u.minion) { if (u.bound) text(u.x, u.y - 40, 'Le serviteur retourne à la poussière', '#3f7d2a', 16); return; }
    sc.corpses.push({ id: G.uid(), x: u.x, y: u.y, type: u.type, elite: u.elite, boss: u.boss, lvl: u.lvl, r: u.r, t: 0, life: u.boss ? 120 : 25, tried: false });
    const ch = Game.char, p = Game.player;
    // Expérience
    let xp = u.def.xp * (u.boss ? 1 : (1 + 0.3 * (u.lvl - 1)) * (u.elite ? 3 : 1));
    if (!u.boss && ch.lvl > u.lvl + 4) xp *= 0.2;
    if (u.summoned) xp *= 0.3;
    Game.addXp(Math.round(xp));
    // Or
    const gmin = u.def.gold[0], gmax = u.def.gold[1];
    let gold = G.rint(gmin, gmax) * (u.boss ? 1 : (1 + 0.2 * (u.lvl - 1)) * (u.elite ? 3 : 1));
    if (u.summoned) gold *= 0.2;
    gold = Math.max(1, Math.round(gold));
    const piles = u.boss ? 6 : gold > 10 ? 2 : 1;
    for (let i = 0; i < piles; i++) addDrop(u.x, u.y, { kind: 'gold', amount: Math.max(1, Math.round(gold / piles)) });
    // Objets
    if (!u.summoned) {
      if (u.boss) for (let i = 0; i < 3; i++) addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl + 1, src: 'boss' }) });
      else if (u.elite) {
        addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl, src: 'elite' }) });
        if (G.chance(0.3)) addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl, src: 'elite' }) });
      } else if (G.chance(0.075)) addDrop(u.x, u.y, { kind: 'item', item: I.make({ cls: ch.cls, ilvl: u.lvl, src: 'normal' }) });
      if (G.chance(u.elite ? 0.25 : 0.035)) addDrop(u.x, u.y, { kind: 'potion' });
    }
    ch.kills[u.type] = (ch.kills[u.type] || 0) + 1;
    if (sc.run) sc.run.kills++;
    Game.questEvent(u.boss ? 'boss' : 'kill', u.type);
    if (u.boss) onBossDeath(u);
  }

  function addDrop(x, y, d) {
    const a = Math.random() * G.TAU, dist = G.rnd(10, 46);
    let tx = x + Math.cos(a) * dist, ty = y + Math.sin(a) * dist;
    if (W.solidAt(Game.scene.map, tx, ty)) { tx = x; ty = y; }
    Game.scene.drops.push(Object.assign({ id: G.uid(), x: tx, y: ty, t: 0 }, d));
  }

  function onBossDeath(b) {
    const sc = Game.scene, m = sc.map;
    m.gateLocked = false;
    sc.victory = true;
    const r = b.bossRoom;
    sc.portals.push({ id: G.uid(), x: (r.x + r.w / 2) * T, y: (r.y + r.h / 2) * T + 60, victory: true });
    const ch = Game.char;
    const first = ch.cleared < sc.def.id;
    ch.cleared = Math.max(ch.cleared, sc.def.id);
    G.UI.bossBar(null);
    G.UI.toast(first ? 'Fragment du Sceau obtenu ! Donjon suivant débloqué.' : b.name + ' est vaincu !', '#7b3fa6', 5);
    Game.shake(14);
    ring(b.x, b.y, 220, '#c9a227', 0.8);
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
    if (sc.kind === 'town' && slot === 0) return;
    const cost = ab.cost || 0;
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
    const cd = ab.cd / (1 + hasteOf(p));
    p.cds[slot] = cd; p.cdMax[slot] = cd;
    if (p.stealthStrike) { p.stealthStrike = false; p.buffs = p.buffs.filter((b) => b.id !== 'furtif'); }
    if (offensive) { p.nextCrit = false; if (sc.kind === 'dungeon') p.combatT = 0; }
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
          spawnProj({ x: p.x + Math.cos(a) * 12, y: p.y - 10 + Math.sin(a) * 8, ang: a, speed: fx.speed, r: fx.r || 6, range: fx.range, faction: 'p', src: p, mult: fx.mult * c.rk, pierce: fx.pierce || 0, aoe: fx.aoe, stun: fx.stun, slow: fx.slow, lifesteal: fx.lifesteal, color: fx.color, look: fx.look, bonus, forceCrit });
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
        const tries = [a, a + 0.8, a - 0.8, a + 1.6, a - 1.6, a + Math.PI];
        for (const t of tries) {
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
    const bonus = p.st.raise * (k.boss ? 0.1 : k.elite ? 0.25 : 1) + 0.05 * (c.rk - 1) * (k.boss ? 0.1 : k.elite ? 0.25 : 1);
    const chance = (k.boss ? 0.01 : k.elite ? 0.1 : 0.4) + bonus;
    sc.corpses = sc.corpses.filter((x) => x !== k);
    if (Math.random() < chance) {
      const m = makeMinion(k.type, k.x, k.y, k.lvl, k.elite, k.boss);
      sc.units.push(m);
      text(k.x, k.y - 40, k.boss ? 'LE BOSS SE RELÈVE !' : 'Relevé !', '#3f7d2a', k.boss ? 30 : 22, 2);
      ring(k.x, k.y, 60, '#5bd04a', 0.5);
      parts(k.x, k.y, 14, '#5bd04a', 'spark', 120);
      if (k.boss) { Game.char.boundBoss = k.type; G.UI.toast(m.name + ' vous servira pendant votre prochain donjon !', '#3f7d2a', 5); }
      // 4 serviteurs maximum (hors boss lié)
      const mins = sc.units.filter((u) => u.minion && !u.bound && !u.dead);
      if (mins.length > 4) { mins[0].dead = true; parts(mins[0].x, mins[0].y, 8, '#2b2118'); }
    } else {
      text(k.x, k.y - 40, 'Échec ! (' + Math.round(chance * 100) + ' %)', '#9b2c20', 22);
      ring(k.x, k.y, 90, '#9b2c20', 0.4);
      parts(k.x, k.y, 16, '#7a2734', 'ink', 240);
      dealDamage(null, p, p.maxHp * 0.1, { trueDmg: true });
      Game.shake(8);
    }
  }

  // ================= Attaques des monstres =================
  function startCast(u, atk, key, tgt) {
    const sc = Game.scene;
    const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    u.cast = { atk, t: 0, windup: atk.windup, ang, tx: tgt.x, ty: tgt.y };
    u.atkCd[key] = atk.cd;
    const dmg = monDmg(u, atk);
    if (atk.t === 'swing') sc.hazards.push({ id: G.uid(), shape: 'cone', follow: u, x: u.x, y: u.y, r: atk.range + 8, arc: atk.arc * DEG, ang, t: 0, delay: atk.windup, dmg, faction: u.faction, src: u });
    else if (atk.t === 'nova') sc.hazards.push({ id: G.uid(), shape: 'circle', follow: u, x: u.x, y: u.y, r: atk.radius, t: 0, delay: atk.windup, dmg, faction: u.faction, src: u });
    else if (atk.t === 'charge') sc.hazards.push({ id: G.uid(), shape: 'line', follow: u, x: u.x, y: u.y, ang, len: atk.dist, width: atk.width, t: 0, delay: atk.windup, warnOnly: true, faction: u.faction, src: u });
  }

  function monDmg(u, atk) { return u.dmg * (atk.dmgMul || 1) * (u.weakT > 0 ? 1 - u.weakAmt : 1); }

  function execAttack(u, cast, tgt) {
    const sc = Game.scene, atk = cast.atk;
    const dmg = monDmg(u, atk);
    u.swingT = 1;
    switch (atk.t) {
      case 'shoot': {
        const n = atk.count || 1;
        const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        for (let i = 0; i < n; i++) {
          const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * 0.5 : 0);
          spawnProj({ x: u.x, y: u.y - 10, ang: a, speed: atk.speed || 300, r: 5, range: (atk.range || 400) + 80, faction: u.faction, src: u, dmg, slow: atk.slow, poison: atk.poison, color: atk.color || '#2b2118', look: u.look === 'skelArcher' ? 'arrow' : 'orb' });
        }
        break;
      }
      case 'circle': {
        const n = atk.count || 1;
        for (let i = 0; i < n; i++) {
          let x = tgt.x, y = tgt.y;
          if (i > 0) { const a = Math.random() * G.TAU, d = G.rnd(40, atk.spread || 120); x += Math.cos(a) * d; y += Math.sin(a) * d; }
          sc.hazards.push({ id: G.uid(), shape: 'circle', x, y, r: atk.radius, t: 0, delay: atk.delay + i * 0.08, dmg, faction: u.faction, src: u, poison: atk.poison, bomb: u.look === 'bomber' || u.look === 'grizzak' });
          if (u.look === 'bomber' || u.look === 'grizzak') sc.parts.push({ kind: 'lob', x0: u.x, y0: u.y - 14, x, y, t: 0, life: Math.min(0.6, atk.delay) });
        }
        break;
      }
      case 'line': {
        const n = atk.count || 1, base = Math.atan2(tgt.y - u.y, tgt.x - u.x), sp = (atk.spreadAng || 20) * DEG;
        for (let i = 0; i < n; i++) {
          const a = base + (n > 1 ? (i - (n - 1) / 2) * sp : 0);
          sc.hazards.push({ id: G.uid(), shape: 'line', x: u.x, y: u.y, ang: a, len: atk.len, width: atk.width, t: 0, delay: atk.delay, dmg, faction: u.faction, src: u, color: '#5d4a1e' });
        }
        break;
      }
      case 'ring': {
        const off = Math.random() * G.TAU;
        for (let i = 0; i < atk.count; i++) {
          const a = off + (i / atk.count) * G.TAU;
          spawnProj({ x: u.x, y: u.y - 10, ang: a, speed: atk.speed, r: 6, range: 700, faction: u.faction, src: u, dmg, color: atk.color || '#2b2118', look: 'orb' });
        }
        ring(u.x, u.y, 60, atk.color || '#2b2118');
        break;
      }
      case 'charge':
        u.dash = { ang: cast.ang, speed: atk.dist / 0.4, t: 0.4, dmg, width: atk.width, hit: new Set() };
        break;
      case 'summon': {
        if (u.minion) break;
        for (let i = 0; i < atk.count; i++) {
          const a = (i / atk.count) * G.TAU + Math.random();
          let x = u.x + Math.cos(a) * 70, y = u.y + Math.sin(a) * 70;
          if (W.collides(sc.map, x, y, 14)) { x = u.x; y = u.y; }
          const m = makeMonster(atk.mon, x, y, Math.max(1, (sc.def ? sc.def.lvl : 1) + 1), false);
          m.aggro = true; m.summoned = true;
          sc.units.push(m);
          parts(x, y, 10, '#2b2118', 'puff', 80);
        }
        text(u.x, u.y - u.r * 2 - 20, 'Invocation !', '#9b2c20', 20);
        break;
      }
    }
  }

  // ================= IA des unités (monstres et serviteurs) =================
  function pickTarget(u) {
    const sc = Game.scene, p = Game.player;
    if (u.faction === 'e') {
      if (!u.aggro) {
        if (!p.dead && !hasBuff(p, 'furtif') && G.dist(u, p) < 300 && W.los(sc.map, u.x, u.y, p.x, p.y)) aggroUnit(u);
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
    // serviteur : cible l'ennemi le plus proche
    let best = null, bd = 420;
    sc.units.forEach((o) => {
      if (o.faction !== 'e' || o.dead || o.dormant) return;
      const d = G.dist(u, o);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }

  function moveToward(u, x, y, spd, dt) {
    const a = Math.atan2(y - u.y, x - u.x);
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

  function updateUnit(u, dt) {
    const sc = Game.scene;
    tickStatus(u, dt);
    if (u.dead) return;
    if (u.minion) { u.life -= dt; if (u.life <= 0) { u.dead = true; parts(u.x, u.y, 10, '#2b2118', 'puff', 60); return; } }
    if (u.stunT > 0) { u.stunT -= dt; return; }
    u.sleep = false;
    if (u.dash) {
      const d = u.dash;
      const blocked = W.move(sc.map, u, Math.cos(d.ang) * d.speed * dt, Math.sin(d.ang) * d.speed * dt);
      u.walk += dt * 20;
      sc.units.forEach((o) => {
        if (o.faction === u.faction || o.dead || d.hit.has(o.id)) return;
        if (Math.hypot(o.x - u.x, o.y - u.y) < d.width / 2 + o.r) { d.hit.add(o.id); dealDamage(u, o, d.dmg); }
      });
      if (Math.random() < 0.5) parts(u.x, u.y, 1, '#8a7a62', 'puff', 30);
      d.t -= dt;
      if (d.t <= 0 || blocked) { u.dash = null; u.gcd = 0.6; if (blocked) Game.shake(5); }
      return;
    }
    if (u.dormant) {
      const p = Game.player, r = u.bossRoom;
      if (u.boss && r && p.x > (r.x + 0.6) * T && p.x < (r.x + r.w - 0.6) * T && p.y > (r.y + 0.6) * T && p.y < (r.y + r.h - 0.6) * T) activateBoss(u);
      return;
    }
    // rage du boss après 3 minutes de combat
    if (u.boss) {
      u.fightT = (u.fightT || 0) + dt;
      if (u.fightT > 180 && !u.enraged) {
        u.enraged = true; u.dmg *= 2; u.speedMul = (u.speedMul || 1) * 1.2;
        G.UI.toast(u.name + ' entre dans une RAGE folle ! (dégâts ×2)', '#9b2c20', 5);
        ring(u.x, u.y, 200, '#9b2c20', 0.8); Game.shake(12);
      }
    }
    // phase du boss
    if (u.boss && u.def.phases) {
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
    const tgt = pickTarget(u);
    for (const k in u.atkCd) u.atkCd[k] -= dt;
    u.gcd -= dt;
    const spd = u.speed * (u.speedMul || 1) * (1 - (u.slowAmt || 0));
    if (!tgt) {
      if (u.minion) { const p = Game.player; if (G.dist(u, p) > 90) moveToward(u, p.x, p.y, spd * 1.2, dt); }
      return;
    }
    u.aim = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    u.facing = Math.cos(u.aim) >= 0 ? 1 : -1;
    if (u.cast) {
      u.cast.t += dt;
      if (u.cast.t >= u.cast.windup) { execAttack(u, u.cast, tgt); u.cast = null; u.gcd = 0.35; }
      return;
    }
    const d = G.dist(u, tgt);
    const vis = W.los(sc.map, u.x, u.y, tgt.x, tgt.y);
    const atks = atkList(u);
    if (u.gcd <= 0) {
      const start = Math.floor(Math.random() * atks.length);
      for (let k = 0; k < atks.length; k++) {
        const i = (start + k) % atks.length, a = atks[i];
        const key = (u.minion ? 0 : u.phase) + '_' + i;
        if ((u.atkCd[key] || 0) > 0) continue;
        if (d > a.range + tgt.r || d < (a.min || 0)) continue;
        if (!vis && a.t !== 'summon') continue;
        startCast(u, a, key, tgt);
        return;
      }
    }
    // déplacement
    const melee = atks.find((a) => a.t === 'swing');
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

  function chase(u, tgt, spd, dt, vis) {
    const sc = Game.scene;
    if (vis || !tgt.isPlayer) { moveToward(u, tgt.x, tgt.y, spd, dt); return; }
    const fd = W.flowDir(sc.map, u.x, u.y);
    if (fd) moveToward(u, fd[0], fd[1], spd, dt);
    else moveToward(u, tgt.x, tgt.y, spd, dt);
  }

  function activateBoss(b) {
    const sc = Game.scene;
    b.dormant = false; b.aggro = true;
    sc.map.gateLocked = true;
    G.UI.bossBar(b);
    G.UI.toast(b.name + ' : ' + (b.def.intro || ''), '#9b2c20', 5);
    Game.shake(8);
    ring(b.x, b.y, 200, '#9b2c20', 0.7);
    // les serviteurs restés dehors sont téléportés à vos côtés
    sc.units.forEach((u) => { if (u.minion && !u.dead) { u.x = Game.player.x + G.rnd(-30, 30); u.y = Game.player.y + G.rnd(-30, 30); if (W.collides(sc.map, u.x, u.y, u.r)) { u.x = Game.player.x; u.y = Game.player.y; } } });
  }

  // ================= Mise à jour du joueur =================
  function updatePlayer(p, dt) {
    const sc = Game.scene, ch = Game.char;
    tickStatus(p, dt);
    if (p.dead) return;
    // recharges
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
    // ressources
    const C = D.CLASSES[p.cls], RS = D.RES[C.res];
    p.combatT += dt;
    if (RS.regen) gainRes(p, RS.regen * dt);
    if (RS.regenPct) gainRes(p, p.resMax * RS.regenPct * dt);
    if (RS.decay && p.combatT > 4) gainRes(p, -RS.decay * dt);
    // vie hors combat
    if (sc.kind === 'town') healUnit(p, p.maxHp * 0.2 * dt, true);
    else if (p.combatT > 6) healUnit(p, p.maxHp * 0.02 * dt, true);
    // visée
    p.aim = Math.atan2(Game.mouse.wy - (p.y - 8), Game.mouse.wx - p.x);
    p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;
    // ruée
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
        if (d.end) { playerAoe(p, p.x, p.y, d.end.radius, d.end.mult * d.rk); ring(p.x, p.y, d.end.radius, '#9a4a1c', 0.35); Game.shake(7); }
        p.dash = null;
      }
      return;
    }
    if (p.stunT > 0) return;
    // déplacement
    const k = Game.keys;
    let mx = 0, my = 0;
    if (k.KeyW || k.ArrowUp) my -= 1;
    if (k.KeyS || k.ArrowDown) my += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    if (mx || my) {
      const l = Math.hypot(mx, my);
      const spd = p.st.speed * (1 + sumBuff(p, 'speed')) * (1 - (p.slowAmt || 0)) * (sc.kind === 'town' ? 1.25 : 1);
      W.move(sc.map, p, (mx / l) * spd * dt, (my / l) * spd * dt);
      p.walk += dt * spd * 0.08;
    }
    if (Game.mouse.down && !G.UI.panelOpen()) Game.useAbility(0);
  }

  Game.drinkPotion = function () {
    const p = Game.player, ch = Game.char;
    if (!p || p.dead || Game.mode !== 'play') return;
    if (ch.potions <= 0) { warn('Plus de potions. La marchande en vend.'); return; }
    if (p.potionCd > 0) return;
    if (p.hp >= p.maxHp) { warn('Votre vie est déjà pleine.'); return; }
    ch.potions--;
    p.potionCd = 12;
    healUnit(p, p.maxHp * 0.35);
    parts(p.x, p.y - 10, 10, '#a8321f', 'spark', 80);
  };

  // ================= Boucle de mise à jour =================
  Game.update = function (dt) {
    const sc = Game.scene;
    if (!sc || Game.mode !== 'play' || Game.paused) return;
    Game.time += dt;
    S.boil = Math.floor(Game.time * 7);
    const p = Game.player, m = sc.map;
    Game.mouse.wx = Game.mouse.x + Game.cam.x;
    Game.mouse.wy = Game.mouse.y + Game.cam.y;

    updatePlayer(p, dt);
    if (Game.mode !== 'play') return;
    // champ de poursuite
    if (sc.kind === 'dungeon') {
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
      if (!m.flowT || m.flowT[0] !== tx || m.flowT[1] !== ty || m.flowDirty) { W.flow(m, tx, ty); m.flowDirty = false; }
      if (m.gateLocked !== m._lastGate) { m._lastGate = m.gateLocked; m.flowDirty = true; }
      W.reveal(m, p.x, p.y, 7);
    }
    for (const u of sc.units) if (!u.isPlayer && !u.dead) updateUnit(u, dt);
    if (Game.mode !== 'play') return;
    separate(sc);
    // minuteurs
    sc.timers.forEach((t) => (t.t -= dt));
    const due = sc.timers.filter((t) => t.t <= 0);
    sc.timers = sc.timers.filter((t) => t.t > 0);
    due.forEach((t) => t.fn());
    updateProjs(sc, dt);
    updateHazards(sc, dt);
    updateZones(sc, dt);
    updateDrops(sc, dt, p);
    sc.corpses.forEach((c) => (c.t += dt));
    sc.corpses = sc.corpses.filter((c) => c.t < c.life);
    sc.texts.forEach((t) => { t.t += dt; t.y -= 34 * dt; });
    sc.texts = sc.texts.filter((t) => t.t < t.life);
    sc.parts.forEach((q) => { q.t += dt; if (q.vx != null) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy = q.vy * 0.9 + 200 * dt; } });
    sc.parts = sc.parts.filter((q) => q.t < q.life);
    sc.units = sc.units.filter((u) => !u.dead || u.isPlayer);
    if (sc.boss && !sc.boss.dormant && !sc.boss.dead) G.UI.bossBar(sc.boss);
    // interactions
    sc.prompt = findInteract(sc, p);
    // caméra
    const cam = Game.cam;
    const tx = p.x - Game.W / 2, ty = p.y - 10 - Game.H / 2;
    cam.x += (tx - cam.x) * Math.min(1, dt * 8);
    cam.y += (ty - cam.y) * Math.min(1, dt * 8);
    cam.x = G.clamp(cam.x, 0, Math.max(0, m.w * T - Game.W));
    cam.y = G.clamp(cam.y, 0, Math.max(0, m.h * T - Game.H));
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 30);
  };

  function separate(sc) {
    const us = sc.units.filter((u) => !u.dead && !u.dormant);
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.85;
      if (d > 0 && d < min) {
        const push = (min - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.isPlayer ? 0.3 : a.boss ? 0.1 : 1, wb = b.isPlayer ? 0.3 : b.boss ? 0.1 : 1;
        if (!a.dash) W.move(sc.map, a, -nx * push * wa, -ny * push * wa);
        if (!b.dash) W.move(sc.map, b, nx * push * wb, ny * push * wb);
      }
    }
  }

  function updateProjs(sc, dt) {
    const m = sc.map;
    for (const pr of sc.projs) {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.dist += pr.speed * dt;
      if (pr.dist > pr.range || W.solidAt(m, pr.x, pr.y + 8)) { explodeProj(sc, pr); pr.dead = true; continue; }
      for (const u of sc.units) {
        if (u.faction === pr.faction || u.dead || u.dormant || pr.hit.has(u.id)) continue;
        if (Math.hypot(u.x - pr.x, u.y - 10 - pr.y) > u.r + pr.r + 2) continue;
        if (pr.aoe) { explodeProj(sc, pr); pr.dead = true; break; }
        pr.hit.add(u.id);
        if (pr.mult) {
          const rd = rollDmg(pr.src, pr.mult, { bonus: pr.bonus, forceCrit: pr.forceCrit });
          hitUnit(pr.src, u, rd.d, { crit: rd.crit, stun: pr.stun, slow: pr.slow, lifesteal: pr.lifesteal });
        } else {
          dealDamage(pr.src, u, pr.dmg);
          if (u.faction === 'p' && !isInvuln(u) && !u.dead) {
            if (pr.slow) { u.slowT = 2; u.slowAmt = Math.max(u.slowAmt || 0, pr.slow); }
            if (pr.poison) u.dots.push({ dps: pr.dmg * pr.poison / 3, t: 3, acc: 0, src: pr.src });
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
      const targets = sc.units.filter((u) => u.faction !== h.faction && !u.dead && !u.dormant);
      targets.forEach((u) => {
        let inside = false;
        if (h.shape === 'circle') inside = inEllipse(h.x, h.y, h.r, u);
        else if (h.shape === 'cone') inside = inCone(h.x, h.y, h.ang, h.r, h.arc, u);
        else inside = inLine(h.x, h.y, h.ang, h.len, h.width, u);
        if (!inside) return;
        if (h.mult) { const rd = rollDmg(h.src, h.mult); hitUnit(h.src, u, rd.d, { crit: rd.crit, stun: h.stun, sleep: h.sleep, slow: h.slow }); }
        else {
          dealDamage(h.src, u, h.dmg);
          if (h.poison && u.faction === 'p' && !u.dead && !isInvuln(u)) u.dots.push({ dps: h.dmg * 0.4, t: 3, acc: 0, src: h.src });
        }
      });
      if (h.shape === 'circle') { ring(h.x, h.y, h.r, h.color || (h.faction === 'e' ? '#9b2c20' : '#c9a227'), 0.3); parts(h.x, h.y, h.bomb ? 14 : 6, h.bomb ? '#4a3b2a' : '#2b2118', 'ink', h.bomb ? 260 : 150); if (h.bomb || h.r > 100) Game.shake(h.bomb ? 5 : 6); }
      else if (h.shape === 'line') for (let i = 0; i < 6; i++) parts(h.x + Math.cos(h.ang) * h.len * (i / 6), h.y + Math.sin(h.ang) * h.len * (i / 6), 2, '#5d4a1e', 'ink', 120);
      else sc.parts.push({ kind: 'slash', x: h.x, y: h.y, ang: h.ang, arc: h.arc, r: h.r, t: 0, life: 0.18, color: '#7a2734' });
    }
    sc.hazards = sc.hazards.filter((h) => !h.dead);
  }

  function updateZones(sc, dt) {
    for (const z of sc.zones) {
      z.t += dt;
      if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; }
      z.acc += dt;
      while (z.acc >= z.interval) {
        z.acc -= z.interval;
        sc.units.forEach((u) => {
          if (u.faction === z.faction || u.dead || u.dormant || !inEllipse(z.x, z.y, z.r, u)) return;
          if (z.mult) { const rd = rollDmg(z.src, z.mult); hitUnit(z.src, u, rd.d, { crit: rd.crit, slow: z.slow, weaken: z.weaken, isDot: true }); }
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
        G.UI.refreshPanel();
      }
    }
    sc.drops = sc.drops.filter((d) => !d.dead);
  }

  // ================= Interactions (touche E) =================
  function findInteract(sc, p) {
    let best = null, bd = 64;
    const consider = (x, y, label, act, range) => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < (range || bd) && d < (best ? best.d : 1e9)) best = { d, label, act };
    };
    sc.npcs.forEach((n) => consider(n.x, n.y, (n.look === 'portal' ? 'Utiliser le ' : 'Parler à ') + n.name, () => G.UI.openPanel(n.role), n.look === 'portal' ? 90 : 64));
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
    if (G.chance(0.35)) addDrop(c.x, c.y + 20, { kind: 'potion' });
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
    Game.enterTown();
    G.UI.showSummary(summary);
  };

  Game.onPlayerDeath = function () {
    const sc = Game.scene, ch = Game.char;
    Game.mode = 'dead';
    G.UI.bossBar(null);
    const lost = { items: [], gold: 0, destroyed: null, dungeon: sc.kind === 'dungeon' ? sc.def.name : 'Havre-Gris' };
    // 1) tout le butin trouvé dans ce donjon
    ch.bag = ch.bag.filter((it) => { if (it.run) { lost.items.push(it); return false; } return true; });
    D.SLOTS.forEach((s) => { const it = ch.equip[s]; if (it && it.run) { lost.items.push(it); ch.equip[s] = null; } });
    // 2) 25 % de l'or
    lost.gold = Math.floor(ch.gold * 0.25);
    ch.gold -= lost.gold;
    // 3) un objet équipé détruit au hasard
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
    if (!it) return;
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

  // Forge : améliore un objet (équipé : "e:slot", sac : "b:index")
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

  // Maître des compétences
  Game.learn = function (slot) {
    const ch = Game.char;
    const rank = ch.abil[slot] || 0;
    const req = rank === 0 ? D.UNLOCK[slot] : D.RANK_COST(slot, rank + 1);
    if (rank >= 3) return 'Rang maximum atteint.';
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

  Game.save = function (now) { if (G.Save) G.Save.save(now); };

  // ================= Rendu =================
  let vignette = null;
  Game.render = function (g) {
    const sc = Game.scene;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#1d1915'; g.fillRect(0, 0, Game.W, Game.H);
    if (!sc) return;
    const m = sc.map, cam = Game.cam;
    const sx = Math.round(cam.x + (cam.shake ? G.rnd(-cam.shake, cam.shake) : 0)), sy = Math.round(cam.y + (cam.shake ? G.rnd(-cam.shake, cam.shake) : 0));
    // carte : seulement la partie visible
    const vw = Math.min(Game.W, m.img.width - Math.max(0, sx)), vh = Math.min(Game.H, m.img.height - Math.max(0, sy));
    g.drawImage(m.img, Math.max(0, sx), Math.max(0, sy), vw, vh, Math.max(0, -sx), Math.max(0, -sy), vw, vh);
    g.save();
    g.translate(-sx, -sy);
    const vis = (x, y, pad) => x > sx - pad && x < sx + Game.W + pad && y > sy - pad && y < sy + Game.H + pad;
    R.gate(g, m);
    sc.zones.forEach((z) => vis(z.x, z.y, z.r) && R.zone(g, z));
    sc.hazards.forEach((h) => R.hazard(g, h));
    sc.corpses.forEach((c) => vis(c.x, c.y, 40) && R.corpse(g, c));
    sc.portals.forEach((pt) => vis(pt.x, pt.y, 60) && R.portalExit(g, pt, Game.time));
    sc.chests.forEach((c) => vis(c.x, c.y, 40) && R.chest(g, c));
    sc.drops.forEach((d) => vis(d.x, d.y, 30) && R.drop(g, d, Game.time));
    const list = sc.units.filter((u) => !u.dead && vis(u.x, u.y, 80)).concat(sc.npcs);
    list.sort((a, b) => a.y - b.y);
    list.forEach((u) => (u.look && sc.npcs.includes(u) ? R.npc(g, u) : R.unit(g, u)));
    sc.units.forEach((u) => !u.dead && !u.isPlayer && !u.dormant && vis(u.x, u.y, 40) && R.hpBar(g, u));
    sc.projs.forEach((p) => R.proj(g, p));
    drawParts(g, sc);
    // brouillard d'exploration
    if (m.fogCanvas) {
      g.imageSmoothingEnabled = true;
      const fx = Math.max(0, Math.floor(sx / T) - 1), fy = Math.max(0, Math.floor(sy / T) - 1);
      const fw = Math.min(m.w - fx, Math.ceil(Game.W / T) + 3), fh = Math.min(m.h - fy, Math.ceil(Game.H / T) + 3);
      g.drawImage(m.fogCanvas, fx, fy, fw, fh, fx * T, fy * T, fw * T, fh * T);
    }
    sc.texts.forEach((t) => {
      const a = 1 - Math.max(0, (t.t - t.life * 0.6) / (t.life * 0.4));
      g.globalAlpha = a; S.text(g, t.s, t.x, t.y, t.size, t.color, 'center', 'rgba(236,224,196,0.85)'); g.globalAlpha = 1;
    });
    // invite d'interaction
    if (sc.prompt && Game.mode === 'play') {
      const p = Game.player;
      S.begin(3);
      const label = 'E — ' + sc.prompt.label;
      g.font = '700 19px Caveat, cursive';
      const w = g.measureText(label).width + 24;
      S.rect(g, p.x - w / 2, p.y + 18, w, 26, { fill: '#efe3c6', fillA: 0.95, w: 1.4 });
      S.text(g, label, p.x, p.y + 31, 19, '#2b2118');
    }
    g.restore();
    // vignette
    if (!vignette) {
      vignette = document.createElement('canvas'); vignette.width = Game.W; vignette.height = Game.H;
      const vg = vignette.getContext('2d');
      const gr = vg.createRadialGradient(Game.W / 2, Game.H / 2, Game.H * 0.35, Game.W / 2, Game.H / 2, Game.W * 0.65);
      gr.addColorStop(0, 'rgba(60,40,20,0)'); gr.addColorStop(1, 'rgba(45,28,12,0.5)');
      vg.fillStyle = gr; vg.fillRect(0, 0, Game.W, Game.H);
    }
    g.drawImage(vignette, 0, 0);
    const p = Game.player;
    if (p && !p.dead && p.hp / p.maxHp < 0.3 && sc.kind === 'dungeon') {
      g.globalAlpha = (0.3 - p.hp / p.maxHp) * 1.6 * (0.7 + 0.3 * Math.sin(Game.time * 6));
      g.strokeStyle = '#9b2c20'; g.lineWidth = 40; g.strokeRect(0, 0, Game.W, Game.H); g.globalAlpha = 1;
    }
  };

  function drawParts(g, sc) {
    for (const q of sc.parts) {
      const a = 1 - q.t / q.life;
      g.globalAlpha = Math.max(0, a);
      if (q.kind === 'ring') {
        const r = q.r0 + (q.r - q.r0) * Math.min(1, q.t / q.life * 1.4);
        S.begin(q.r * 13 + (q.x | 0));
        S.circle(g, q.x, q.y, r, { ry: r * 0.75, stroke: q.color, w: 2, single: true });
      } else if (q.kind === 'slash') {
        g.strokeStyle = q.color; g.lineWidth = 3 * a + 1;
        const p = q.t / q.life;
        g.beginPath(); g.arc(q.x, q.y, q.r * (0.6 + 0.4 * p), q.ang - q.arc / 2, q.ang + q.arc / 2); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.arc(q.x, q.y, q.r * (0.45 + 0.4 * p), q.ang - q.arc / 2 + 0.1, q.ang + q.arc / 2 - 0.1); g.stroke();
      } else if (q.kind === 'puff') {
        g.strokeStyle = q.color; g.lineWidth = 1;
        g.beginPath(); g.arc(q.x, q.y, q.r * 2 + q.t * 20, 0, G.TAU); g.stroke();
      } else if (q.kind === 'spark') {
        g.fillStyle = q.color; g.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r);
      } else if (q.kind === 'lob') {
        const t = q.t / q.life, x = G.lerp(q.x0, q.x, t), y = G.lerp(q.y0, q.y, t) - Math.sin(t * Math.PI) * 80;
        g.globalAlpha = 1; S.begin(5); S.circle(g, x, y, 5, { fill: '#2b2118', w: 1 });
      } else {
        g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.r * a + 0.5, 0, G.TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
})();
