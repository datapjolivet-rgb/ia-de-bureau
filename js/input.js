// Touches configurables et options : actions, touches par défaut, noms des touches selon le clavier, sauvegarde.
// Les touches sont enregistrées par position physique (e.code) : la touche "KeyW" est Z sur un clavier AZERTY.
(function () {
  const Input = (G.Input = {});
  const LS_KEYS = 'valdorne-keys-v1', LS_OPTS = 'valdorne-options-v1';

  Input.ACTIONS = [
    { id: 'up', name: 'Aller en haut', group: 'Déplacement' },
    { id: 'down', name: 'Aller en bas', group: 'Déplacement' },
    { id: 'left', name: 'Aller à gauche', group: 'Déplacement' },
    { id: 'right', name: 'Aller à droite', group: 'Déplacement' },
    { id: 'attack', name: 'Attaque de base (maintenir)', group: 'Combat' },
    { id: 's1', name: 'Sort 1', group: 'Combat' },
    { id: 's2', name: 'Sort 2', group: 'Combat' },
    { id: 's3', name: 'Sort 3', group: 'Combat' },
    { id: 's4', name: 'Sort 4', group: 'Combat' },
    { id: 's5', name: 'Sort 5', group: 'Combat' },
    { id: 'potion', name: 'Boire une potion', group: 'Combat' },
    { id: 'summon', name: 'Grimoire des âmes (nécromancien)', group: 'Combat' },
    { id: 'interact', name: 'Parler, ouvrir, utiliser', group: 'Interface' },
    { id: 'inventory', name: 'Ouvrir l\'inventaire', group: 'Interface' },
    { id: 'creator', name: 'Mode créateur', group: 'Interface' },
    { id: 'chat', name: 'Discuter (en ligne)', group: 'Interface' },
    { id: 'social', name: 'Joueurs en ligne et groupe', group: 'Interface' },
    { id: 'menu', name: 'Menu et fermer les fenêtres', group: 'Interface' },
  ];
  const DEFAULTS = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    attack: ['Mouse0', null], s1: ['Digit1', 'Numpad1'], s2: ['Digit2', 'Numpad2'], s3: ['Digit3', 'Numpad3'], s4: ['Digit4', 'Numpad4'], s5: ['Digit5', 'Numpad5'],
    potion: ['KeyR', null], summon: ['KeyF', null], interact: ['KeyE', null], inventory: ['Tab', 'KeyI'], creator: ['KeyC', null], chat: ['Enter', 'NumpadEnter'], social: ['KeyP', null], menu: ['Escape', null],
  };
  Input.binds = JSON.parse(JSON.stringify(DEFAULTS));

  // ---------- Noms des touches ----------
  const NAMES = {
    Space: 'Espace', Tab: 'Tab', Escape: 'Échap', Enter: 'Entrée', NumpadEnter: 'Entrée (pavé)', Backspace: 'Retour arrière', CapsLock: 'Verr. Maj',
    ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droite', ControlLeft: 'Ctrl gauche', ControlRight: 'Ctrl droite', AltLeft: 'Alt', AltRight: 'Alt Gr',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Insert: 'Inser', Delete: 'Suppr', Home: 'Début', End: 'Fin', PageUp: 'Page haut', PageDown: 'Page bas',
    Mouse0: 'Clic gauche', Mouse1: 'Clic molette', Mouse2: 'Clic droit', Mouse3: 'Bouton 4', Mouse4: 'Bouton 5',
  };
  const PUNCT_AZ = { Minus: ')', Equal: '=', BracketLeft: '^', BracketRight: '$', Quote: 'ù', Backquote: '²', Backslash: '*', Comma: ';', Period: ':', Slash: '!', IntlBackslash: '<' };
  const PUNCT_QW = { Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: '\'', Backquote: '`', Backslash: '\\', Comma: ',', Period: '.', Slash: '/', IntlBackslash: '<' };
  // Clavier AZERTY (France, Belgique) : seules les lettres qui changent de place
  const AZERTY = { KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ',', Semicolon: 'M' };
  const layout = {};
  const lang = (navigator.language || 'fr').toLowerCase();
  Input.azerty = /^fr(-fr|-be|-lu|-mc)?$/.test(lang) || lang === 'fr';
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then((map) => { map.forEach((v, k) => { if (v && v.length === 1) layout[k] = v.toUpperCase(); }); if (G.UI && G.UI.refreshLabels) G.UI.refreshLabels(); }).catch(() => {});
  } catch (e) { /* carte du clavier indisponible */ }
  // On apprend les vrais noms des lettres quand le joueur appuie dessus
  Input.learn = function (e) {
    if (e.code && /^Key[A-Z]$|^Semicolon$|^Comma$|^Period$/.test(e.code) && e.key && e.key.length === 1 && !layout[e.code]) layout[e.code] = e.key.toUpperCase();
  };
  Input.codeLabel = function (code) {
    if (!code) return '—';
    if (layout[code]) return layout[code];
    if (/^Key[A-Z]$/.test(code)) return Input.azerty && AZERTY[code] ? AZERTY[code] : code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return 'Pavé ' + code.slice(6);
    if (/^F\d+$/.test(code)) return code;
    if (Input.azerty && AZERTY[code]) return AZERTY[code];
    const punct = Input.azerty ? PUNCT_AZ : PUNCT_QW;
    return NAMES[code] || punct[code] || code;
  };
  // Nom court (barre d'action) : "Clic" plutôt que "Clic gauche"
  Input.short = function (code) {
    if (code === 'Mouse0') return 'Clic';
    if (code === 'Mouse2') return 'Clic D';
    if (code === 'Mouse1') return 'Molette';
    if (/^Numpad\d$/.test(code)) return 'P' + code.slice(6);
    const l = Input.codeLabel(code);
    return l.length > 6 ? l.slice(0, 5) + '.' : l;
  };
  Input.codes = (action) => (Input.binds[action] || []).filter(Boolean);
  Input.label = (action) => { const c = Input.codes(action); return c.length ? Input.codeLabel(c[0]) : 'non attribuée'; };
  Input.shortLabel = (action) => { const c = Input.codes(action); return c.length ? Input.short(c[0]) : '—'; };
  Input.moveLabel = function () {
    const ks = ['up', 'left', 'down', 'right'].map((a) => Input.codes(a)[0]);
    const ls = ks.map((c) => Input.codeLabel(c));
    return ls.every((l) => l.length === 1) ? ls.join('') : ls.join(' ');
  };
  Input.actionsFor = (code) => Input.ACTIONS.filter((a) => (Input.binds[a.id] || []).includes(code)).map((a) => a.id);
  Input.held = function (action) {
    const Game = G.Game;
    return Input.codes(action).some((c) => (c.startsWith('Mouse') ? (c === 'Mouse0' && Game.mouse.down) || (Game.mbtn && Game.mbtn[c]) : Game.keys[c]));
  };

  // ---------- Modifier une touche ----------
  // Renvoie { ok, msg } ; une touche déjà utilisée par une autre action lui est retirée.
  Input.assign = function (action, slot, code) {
    if (code === 'Escape' && action !== 'menu') return { ok: false, msg: 'Échap est réservée au menu.' };
    if (action === 'menu' && slot === 0) return { ok: false, msg: 'Échap reste toujours la touche du menu.' };
    const removed = [];
    Input.ACTIONS.forEach((a) => {
      const b = Input.binds[a.id];
      b.forEach((c, i) => { if (c === code && !(a.id === action && i === slot)) { b[i] = null; removed.push(a.name); } });
    });
    Input.binds[action][slot] = code;
    Input.save();
    return { ok: true, msg: removed.length ? Input.codeLabel(code) + ' était utilisée pour « ' + removed.join(', ') + ' » : elle y est retirée.' : '' };
  };
  Input.clear = function (action, slot) {
    if (action === 'menu' && slot === 0) return;
    Input.binds[action][slot] = null;
    Input.save();
  };
  Input.reset = function () { Input.binds = JSON.parse(JSON.stringify(DEFAULTS)); Input.save(); };
  // actions sans aucune touche
  Input.missing = () => Input.ACTIONS.filter((a) => !Input.codes(a.id).length).map((a) => a.name);

  // ---------- Options ----------
  const OPT_DEFAULTS = { shake: true, dmgNums: true, arrow: true, light: true, creator: false };
  G.Options = Object.assign({}, OPT_DEFAULTS);
  G.opt = (k) => G.Options[k] !== false;
  Input.OPTIONS = [
    { id: 'shake', name: 'Tremblement de l\'écran', desc: 'Quand vous êtes touché ou lors des explosions.' },
    { id: 'dmgNums', name: 'Chiffres de dégâts', desc: 'Les dégâts infligés et reçus s\'affichent au-dessus des personnages.' },
    { id: 'arrow', name: 'Flèche de guidage', desc: 'Une flèche jaune indique le prochain objectif.' },
    { id: 'light', name: 'Éclairage des donjons', desc: 'Obscurité et lueurs des torches. À désactiver si le jeu rame.' },
    { id: 'creator', name: 'Mode créateur', desc: () => 'Accès à tous les objets, à tous les donjons, au niveau et à l\'or au maximum, à l\'invincibilité… En jeu : touche ' + Input.label('creator') + ' ou bouton dans la pause. Les héros qui l\'utilisent portent le badge « Créateur ».' },
  ];
  Input.setOption = function (id, v) { G.Options[id] = !!v; Input.save(); };

  // ---------- Sauvegarde ----------
  function valid(b) {
    if (!b || typeof b !== 'object') return null;
    const out = JSON.parse(JSON.stringify(DEFAULTS));
    Input.ACTIONS.forEach((a) => {
      if (Array.isArray(b[a.id])) out[a.id] = [b[a.id][0] || null, b[a.id][1] || null];
    });
    out.menu[0] = 'Escape';
    const used = new Set();
    Input.ACTIONS.forEach((a) => out[a.id].forEach((c, i) => { if (!c) return; if (used.has(c)) out[a.id][i] = null; else used.add(c); }));
    return out;
  }
  Input.load = function () {
    let src = G.Save && G.Save.data.settings && G.Save.data.settings.keys;
    let opts = G.Save && G.Save.data.settings && G.Save.data.settings.options;
    try { if (!src) src = JSON.parse(localStorage.getItem(LS_KEYS) || 'null'); } catch (e) { /* ignoré */ }
    try { if (!opts) opts = JSON.parse(localStorage.getItem(LS_OPTS) || 'null'); } catch (e) { /* ignoré */ }
    Input.binds = valid(src) || JSON.parse(JSON.stringify(DEFAULTS));
    G.Options = Object.assign({}, OPT_DEFAULTS, opts || {});
  };
  Input.save = function () {
    if (G.Save) {
      G.Save.data.settings = G.Save.data.settings || {};
      G.Save.data.settings.keys = Input.binds;
      G.Save.data.settings.options = G.Options;
      const sc = G.Game && G.Game.scene;
      if (!(sc && sc.kind === 'dungeon')) G.Save.save(true);
    }
    try { localStorage.setItem(LS_KEYS, JSON.stringify(Input.binds)); localStorage.setItem(LS_OPTS, JSON.stringify(G.Options)); } catch (e) { /* ignoré */ }
  };
})();
