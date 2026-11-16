// Tutoriel : le camp des recrues devant la porte de Havre-Gris, guidé par la sergente Brenna.
(function () {
  const D = G.D, T = D.TILE, Game = G.Game;
  const Tuto = (G.Tuto = {});
  let st = null;

  const STEPS = [
    { id: 'move', need: 260, goal: 'yard', brenna: [14, 11],
      text: 'Déplacez-vous avec Z Q S D (ou les flèches du clavier). Suivez la flèche jaune.',
      say: 'Bienvenue, recrue ! Avant d\'entrer à Havre-Gris, je vérifie que tu sais te battre. Marche un peu, que je voie tes jambes.' },
    { id: 'attack', need: 8, goal: 'dummy', brenna: [15, 13],
      text: 'Visez un mannequin avec la souris et MAINTENEZ le clic gauche pour attaquer.',
      say: 'Bien. Frappe ces mannequins : vise avec la souris et garde le bouton enfoncé.' },
    { id: 'spells', need: 2, goal: 'dummy', brenna: [15, 13],
      text: 'Lancez vos sorts avec les touches 1 et 2. Chaque sort coûte de la ressource (barre sous la vie) et se recharge.',
      say: 'Ton attaque de base ne suffira pas. Utilise tes techniques : touches 1 et 2.' },
    { id: 'dodge', need: 3, goal: 'rune', brenna: [29, 9],
      text: 'Approchez de la pierre runique. Les zones rouges hachurées annoncent une attaque : sortez-en avant qu\'elles soient pleines ! (3 esquives)',
      say: 'Cette pierre lance des sorts. Ne reste JAMAIS dans une zone rouge. Les monstres font pareil, en pire.' },
    { id: 'potion', need: 1, goal: null, brenna: [29, 9],
      text: 'Vous êtes blessé : appuyez sur R pour boire une potion (+30 % de vie, recharge 15 s).',
      say: 'Aïe, tu saignes. Bois une potion : touche R. Tu n\'en auras jamais assez, alors économise-les.' },
    { id: 'fight', need: 3, goal: 'rats', brenna: [42, 12],
      text: 'Des rats ont envahi la réserve ! Éliminez-les tous.',
      say: 'Des rats dans la réserve ! Nettoie-moi ça. Eux sont faibles… les monstres des donjons, non.' },
    { id: 'loot', need: 1, goal: 'loot', brenna: [42, 12],
      text: 'Un rat a laissé tomber un objet. Marchez dessus pour le ramasser.',
      say: 'Tiens, il avait quelque chose sur lui. Ramasse-le.' },
    { id: 'equip', need: 1, goal: null, brenna: [42, 12],
      text: 'Appuyez sur TAB pour ouvrir l\'inventaire, puis cliquez sur le nouvel objet pour l\'équiper.',
      say: 'Un héros mal équipé est un héros mort. TAB pour ton sac, clic pour équiper.' },
    { id: 'gate', need: 1, goal: 'gate', brenna: [55, 14],
      text: 'Parfait ! Allez à la porte de Havre-Gris (à l\'est) et appuyez sur E pour entrer en ville.',
      say: 'Tu as tout ce qu\'il faut. Va à la porte. Et souviens-toi : là-bas, la mort coûte cher.' },
  ];
  Tuto.STEPS = STEPS;

  const brenna = () => Game.scene && Game.scene.npcs.find((n) => n.role === 'brenna');
  const say = (text, t) => { const b = brenna(); if (b) b.bubble = { text, t: t || 6 }; };
  const units = (f) => Game.scene.units.filter(f);

  Tuto.start = function () {
    st = { i: -1, n: 0, flags: {} };
    next();
  };
  Tuto.stop = function () { st = null; G.UI.tuto(null); };
  Tuto.active = () => !!st;
  Tuto.noRegen = () => !!st && STEPS[st.i] && STEPS[st.i].id === 'potion';

  function next() {
    st.i++; st.n = 0; st.flags = {};
    const s = STEPS[st.i];
    if (!s) return;
    const sc = Game.scene, p = Game.player, b = brenna();
    if (b) b.goal = [s.brenna[0] * T, s.brenna[1] * T];
    say(s.say, 7);
    const rune = units((u) => u.type === 'runeStone')[0];
    if (rune) { rune.active = s.id === 'dodge'; rune.aggro = s.id === 'dodge'; rune.cast = null; }
    if (s.id === 'dodge') sc.hazards = [];
    if (s.id === 'potion') {
      sc.hazards = [];
      if (p.hp > p.maxHp * 0.5) p.hp = p.maxHp * 0.4;
      if (Game.char.potions < 1) { Game.char.potions = 1; G.UI.toast('La sergente vous tend une potion.', '#8c3b2a', 3); }
    }
    if (s.id === 'fight') units((u) => u.tutoRat).forEach((r) => { r.dormant = false; r.aggro = true; });
    if (s.id === 'loot') {
      const ch = Game.char;
      const free = ['tete', 'mains', 'pieds', 'jambes', 'anneau', 'amulette'].find((sl) => !ch.equip[sl]) || 'tete';
      const it = G.I.make({ cls: ch.cls, slot: free, rarity: 1, ilvl: 1 });
      it.name = it.base + ' de la recrue';
      st.lootId = it.id;
      const pos = st.lastRat || { x: sc.map.spots.store[0] * T, y: sc.map.spots.store[1] * T };
      Game.addDrop(pos.x, pos.y, { kind: 'item', item: it });
      st.lootDrop = sc.drops[sc.drops.length - 1];
    }
    refresh();
  }

  function done() {
    G.UI.toast(G.pick(['Bien joué !', 'Parfait !', 'Pas mal, recrue !', 'Excellent !']), '#4f6b2b', 1.6);
    next();
  }

  function refresh() {
    if (!st) return;
    const s = STEPS[st.i];
    if (!s) return;
    let prog = '';
    if (s.id === 'move') prog = Math.min(100, Math.round((100 * st.n) / s.need)) + ' %';
    else if (s.need > 1) prog = Math.min(st.n, s.need) + ' / ' + s.need;
    G.UI.tuto({ step: st.i + 1, total: STEPS.length, text: s.text, prog });
  }

  Tuto.event = function (ev, data) {
    if (!st) return;
    const s = STEPS[st.i];
    if (!s) return;
    switch (s.id) {
      case 'move': if (ev === 'move') { st.n += data; if (st.n >= s.need) return done(); } break;
      case 'attack': if (ev === 'hitDummy') { st.n++; if (st.n >= s.need) return done(); } break;
      case 'spells':
        if (ev === 'ability' && (data === 1 || data === 2)) { st.flags[data] = true; st.n = Object.keys(st.flags).length; if (st.n >= 2) return done(); }
        break;
      case 'dodge':
        if (ev === 'dodge') { st.n++; Game.text(Game.player.x, Game.player.y - 50, 'Esquivé !', '#4f6b2b', 20); if (st.n >= s.need) return done(); }
        if (ev === 'runeHit') { G.UI.toast('Touché ! Sortez de la zone avant qu\'elle soit pleine.', '#9b2c20', 2); }
        break;
      case 'potion': if (ev === 'potion') return done(); break;
      case 'fight':
        if (ev === 'kill' && data.tutoRat) { st.n++; st.lastRat = { x: data.x, y: data.y }; if (st.n >= s.need) return done(); }
        break;
      case 'loot': if (ev === 'pickup' && data.id === st.lootId) return done(); break;
      case 'equip': if (ev === 'equip' && data.id === st.lootId) { setTimeout(() => G.UI.closePanel(), 600); return done(); } break;
    }
    refresh();
  };

  Tuto.update = function () {
    if (!st) return;
    const s = STEPS[st.i];
    // si l'objet a été ramassé avant l'étape "ramasser", on avance quand même
    if (s && s.id === 'loot' && Game.char.bag.some((it) => it.id === st.lootId)) done();
    if (s && s.id === 'equip' && D.SLOTS.some((sl) => Game.char.equip[sl] && Game.char.equip[sl].id === st.lootId)) done();
  };

  Tuto.target = function () {
    if (!st) return null;
    const s = STEPS[st.i], sc = Game.scene, sp = sc.map.spots, p = Game.player;
    if (!s || !s.goal) return null;
    const nearest = (f) => { let best = null, bd = 1e9; sc.units.forEach((u) => { if (!u.dead && f(u)) { const d = G.dist(u, p); if (d < bd) { bd = d; best = u; } } }); return best; };
    if (s.goal === 'yard') return { x: sp.yard[0] * T, y: sp.yard[1] * T, label: 'Mannequins' };
    if (s.goal === 'dummy') { const d = nearest((u) => u.type === 'dummy'); return d && { x: d.x, y: d.y, label: 'Mannequin' }; }
    if (s.goal === 'rune') return { x: sp.runeZone[0] * T, y: sp.runeZone[1] * T, label: 'Pierre runique' };
    if (s.goal === 'rats') { const r = nearest((u) => u.tutoRat); return r && { x: r.x, y: r.y, label: 'Rats' }; }
    if (s.goal === 'loot') { const d = st.lootDrop; return d && !d.dead ? { x: d.x, y: d.y, label: 'Objet' } : null; }
    if (s.goal === 'gate') return { x: sp.gate[0] * T, y: sp.gate[1] * T, label: 'Porte de Havre-Gris' };
    return null;
  };

  Tuto.talk = function () {
    if (!st) return;
    const s = STEPS[st.i];
    if (s) say(s.say, 7);
  };

  Tuto.gate = function () {
    if (st && STEPS[st.i] && STEPS[st.i].id === 'gate') { Game.finishTuto(); return; }
    say('Pas si vite ! Termine d\'abord l\'entraînement. Ou passe-le, si tu connais déjà tout ça.', 5);
    G.UI.toast('Terminez le tutoriel, ou cliquez sur « Passer le tutoriel ».', '#8c3b2a', 3);
  };

  Tuto.skip = function () {
    G.UI.confirm('Passer le tutoriel ?', 'Vous entrerez directement à Havre-Gris. Vous pourrez toujours vous entraîner sur les mannequins près de la porte sud.', 'Passer', () => Game.finishTuto());
  };
})();
