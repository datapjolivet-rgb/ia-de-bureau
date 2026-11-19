// Génération d'objets, forge et calcul des statistiques du personnage.
(function () {
  const D = G.D;
  const I = (G.I = {});

  const RARITY_WEIGHTS = {
    normal: [62, 28, 9, 1, 0],
    elite: [15, 40, 33, 11, 1],
    boss: [0, 10, 45, 38, 7],
    chest: [8, 40, 37, 13, 2],
    shop: [45, 40, 15, 0, 0],
  };

  I.roll = function (src) {
    return G.weighted(RARITY_WEIGHTS[src] || RARITY_WEIGHTS.normal);
  };

  // Valeurs de base selon l'emplacement
  function baseStats(slot, ilvl, rm) {
    const s = {};
    const L = ilvl;
    if (slot === 'arme') s.pow = (5 + L * 2.3) * rm;
    else if (slot === 'torse') { s.arm = (4 + L * 1.6) * rm; s.vit = (3 + L * 1.1) * rm; }
    else if (slot === 'tete' || slot === 'jambes') { s.arm = (3 + L * 1.2) * rm; s.vit = (2 + L * 0.8) * rm; }
    else if (slot === 'mains' || slot === 'pieds') { s.arm = (2 + L * 0.9) * rm; s.vit = (1 + L * 0.6) * rm; }
    else if (slot === 'anneau') s.pow = (2 + L * 0.9) * rm;
    else if (slot === 'amulette') s.vit = (3 + L * 1.0) * rm;
    return s;
  }
  I.baseStats = baseStats;
  function affixValue(stat, ilvl, rm) {
    switch (stat) {
      case 'pow': return (1.5 + ilvl * 0.8) * rm;
      case 'vit': return (2 + ilvl * 0.9) * rm;
      case 'arm': return (2 + ilvl * 0.9) * rm;
      case 'crit': return Math.min(0.08, (0.012 + ilvl * 0.0012) * rm);
      case 'haste': return Math.min(0.08, (0.012 + ilvl * 0.0012) * rm);
    }
  }

  I.make = function (opts) {
    const cls = opts.cls;
    const slot = opts.slot || G.pick(D.SLOTS);
    const rarity = opts.rarity == null ? I.roll(opts.src) : opts.rarity;
    const ilvl = Math.max(1, Math.round(opts.ilvl || 1));
    const R = D.RARITY[rarity];
    const rm = R.mult;
    const stats = baseStats(slot, ilvl, rm);
    const pool = ['pow', 'vit', 'arm', 'crit', 'haste'];
    for (let i = 0; i < R.affixes; i++) {
      const st = G.pick(pool);
      stats[st] = (stats[st] || 0) + affixValue(st, ilvl, rm);
    }
    for (const k in stats) stats[k] = k === 'crit' || k === 'haste' ? Math.round(stats[k] * 1000) / 1000 : Math.max(1, Math.round(stats[k]));
    let base = slot === 'arme' ? G.pick(D.WEAPONS[cls] || D.WEAPONS.guerrier) : G.pick(D.BASES[slot]);
    let name;
    if (rarity === 4) name = '« ' + G.pick(D.LEGENDARY) + ' »';
    else if (rarity === 0) name = base;
    else name = base + ' ' + G.pick(D.SUFFIX);
    return {
      id: 'it' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      slot, rarity, ilvl, name, base, stats, up: 0,
      value: Math.round((6 + ilvl * 3) * R.value),
    };
  };

  // Statistiques effectives (avec amélioration de forge)
  I.stats = function (it) {
    const m = 1 + 0.1 * (it.up || 0);
    const out = {};
    for (const k in it.stats) out[k] = k === 'crit' || k === 'haste' ? it.stats[k] * m : Math.round(it.stats[k] * m);
    return out;
  };
  I.fmtStat = (k, v) => (k === 'crit' || k === 'haste' ? '+' + (v * 100).toFixed(1).replace('.', ',') + ' %' : '+' + Math.round(v));
  I.score = function (it) {
    if (!it) return 0;
    const s = I.stats(it);
    return (s.pow || 0) * 2 + (s.vit || 0) * 1.2 + (s.arm || 0) + (s.crit || 0) * 400 + (s.haste || 0) * 350;
  };
  I.fullName = (it) => it.name + (it.up ? ' +' + it.up : '');

  // ---------- Forge ----------
  I.FORGE_CHANCE = [1, 1, 1, 0.85, 0.7, 0.55, 0.42, 0.3, 0.2, 0.1];
  I.forgeCost = (it) => Math.round((25 + it.ilvl * 8) * (1 + it.rarity * 0.6) * Math.pow(1.55, it.up || 0));
  I.forgeChance = (it) => I.FORGE_CHANCE[it.up || 0] || 0;

  // ---------- Statistiques du personnage ----------
  I.charStats = function (ch) {
    const C = D.CLASSES[ch.cls];
    const lvl = ch.lvl;
    const sum = { pow: 0, vit: 0, arm: 0, crit: 0, haste: 0 };
    for (const slot of D.SLOTS) {
      const it = ch.equip[slot];
      if (!it) continue;
      const s = I.stats(it);
      for (const k in s) sum[k] += s[k];
    }
    const t = ch.talents || {};
    const tal = (id) => {
      const def = D.TALENTS.find((x) => x.id === id);
      return (t[id] || 0) * def.per;
    };
    const maxHp = Math.round((C.hp * (1 + 0.13 * (lvl - 1)) + sum.vit * 6) * (1 + tal('vigueur')));
    const pow = (C.pow * (1 + 0.11 * (lvl - 1)) + sum.pow) * (1 + tal('puissance'));
    const arm = sum.arm + tal('peau');
    const crit = 0.05 + sum.crit + tal('precision');
    const haste = Math.min(0.6, sum.haste + tal('celerite'));
    const res = D.RES[C.res];
    const resMax = C.resMax ? Math.round(C.resMax * (1 + 0.04 * (lvl - 1))) : res.max;
    return { maxHp, pow, arm, crit, haste, speed: C.speed, resMax, raise: tal('necro'), sum };
  };
  // Réduction de dégâts par l'armure
  I.armorReduc = (arm, lvl) => arm / (arm + 60 + lvl * 12);
})();
