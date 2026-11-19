// Démarrage : sauvegarde, clavier/souris, mise à l'échelle et boucle principale.
(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = 'valdorne-save-v1';

  // ================= Sauvegarde =================
  // Compte claude.ai (base privée par joueur) si disponible, sinon ce navigateur.
  const Save = (G.Save = { data: { v: 1, chars: [], last: 0, updated: 0, graveyard: [] }, local: false, db: null, writing: false, dirty: false, timer: null });

  function clean(data) {
    // Une partie fermée en plein donjon = donjon abandonné : le butin non sécurisé disparaît.
    (data.chars || []).forEach((c) => {
      c.bag = (c.bag || []).filter((it) => !it.run);
      G.D.SLOTS.forEach((s) => { if (c.equip[s] && c.equip[s].run) c.equip[s] = null; });
      c.kills = c.kills || {}; c.raised = c.raised || {}; c.quests = c.quests || {}; c.talents = c.talents || {};
      c.potions = Math.min(c.potions || 0, G.D.MAX_POTIONS);
    });
    data.graveyard = data.graveyard || [];
    return data;
  }

  Save.whereText = function () {
    if (Save.db) return 'Sauvegarde automatique liée à votre compte claude.ai.';
    if (Save.local) return 'Sauvegarde automatique dans ce navigateur.';
    return 'Sauvegarde indisponible ici : la progression sera perdue en fermant la page.';
  };

  Save.initLocal = function () {
    try {
      const s = localStorage.getItem(KEY);
      if (s) Save.data = clean(JSON.parse(s));
      localStorage.setItem(KEY + '-test', '1'); localStorage.removeItem(KEY + '-test');
      Save.local = true;
    } catch (e) { Save.local = false; }
  };

  Save.initRemote = async function () {
    try {
      if (!window.claude || !window.claude.use) return false;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return false;
      const id = await user.id();
      if (!id) return false;
      const ref = db.doc('data/users/' + id + '/save');
      const snap = await ref.get();
      Save.db = ref;
      if (snap.exists) {
        const d = snap.data();
        const remote = clean(JSON.parse(d.json));
        if ((remote.updated || 0) >= (Save.data.updated || 0)) { Save.data = remote; return true; }
      }
      return false;
    } catch (e) { Save.db = null; return false; }
  };

  function writeNow() {
    const json = JSON.stringify(Save.data);
    if (Save.local) { try { localStorage.setItem(KEY, json); } catch (e) { /* stockage plein ou bloqué */ } }
    if (!Save.db) return;
    if (Save.writing) { Save.dirty = true; return; }
    Save.writing = true;
    Save.db.set({ json, updated: Save.data.updated }).catch(() => { Save.db = null; }).finally(() => {
      Save.writing = false;
      if (Save.dirty) { Save.dirty = false; writeNow(); }
    });
  }

  Save.save = function (now, force) {
    const sc = G.Game.scene;
    if (!force && sc && sc.kind === 'dungeon' && G.Game.mode === 'play') return; // pas de sauvegarde en plein donjon
    Save.data.updated = Date.now();
    clearTimeout(Save.timer);
    if (now) writeNow(); else Save.timer = setTimeout(writeNow, 700);
  };

  // ================= Mise à l'échelle =================
  const stage = $('stage');
  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();

  // ================= Souris =================
  const cv = $('cv');
  const ctx = cv.getContext('2d');
  // souris et clavier : on repasse en mode « clavier » (sauf événements simulés après un toucher)
  let lastTouch = 0;
  window.addEventListener('touchstart', () => { lastTouch = performance.now(); }, { capture: true, passive: true });
  const realMouse = (e) => e.isTrusted && performance.now() - lastTouch > 900 && !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
  window.addEventListener('mousemove', (e) => { if (realMouse(e) && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) G.Input.setMode('kb'); }, true);
  window.addEventListener('mousedown', (e) => { if (realMouse(e)) G.Input.setMode('kb'); }, true);
  window.addEventListener('keydown', (e) => { if (e.isTrusted) G.Input.setMode('kb'); }, true);
  stage.addEventListener('mousemove', (e) => {
    if (!realMouse(e) && G.Input.mode !== 'kb') return;
    const r = stage.getBoundingClientRect();
    G.Game.mouse.x = ((e.clientX - r.left) / r.width) * 1280;
    G.Game.mouse.y = ((e.clientY - r.top) / r.height) * 720;
  });
  G.Game.mbtn = {};
  cv.addEventListener('mousedown', (e) => {
    if (G.UI.capturing) return;
    if (!realMouse(e) && G.Input.mode === 'touch') return; // un toucher sur le décor ne fait pas attaquer
    if (e.button > 2) e.preventDefault();
    const code = 'Mouse' + e.button;
    G.Game.mbtn[code] = true;
    if (e.button === 0) G.Game.mouse.down = true;
    pressActions(code);
  });
  window.addEventListener('mouseup', (e) => { G.Game.mbtn['Mouse' + e.button] = false; if (e.button === 0) G.Game.mouse.down = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => { G.Game.keys = {}; G.Game.mbtn = {}; G.Game.mouse.down = false; });
  // Menu des touches : un bouton de la souris se choisit en cliquant sur la case en attente ;
  // un clic ailleurs annule simplement l'attente.
  let swallowUntil = 0;
  window.addEventListener('mousedown', (e) => {
    const UI = G.UI;
    if (!UI.capturing) return;
    const onWait = e.target.closest && e.target.closest('.kbtn.wait');
    if (!onWait) { UI.cancelCapture(); return; }
    if (!UI.capturing.armed) return;
    e.preventDefault(); e.stopPropagation();
    swallowUntil = performance.now() + 800;
    UI.captureKey('Mouse' + e.button);
  }, true);
  window.addEventListener('click', (e) => { if (performance.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); swallowUntil = 0; } }, true);
  window.addEventListener('contextmenu', (e) => { if (G.UI.capturing || performance.now() < swallowUntil) { e.preventDefault(); swallowUntil = 0; } }, true);
  // boutons « précédent / suivant » de la souris : ne pas quitter la page en pleine partie
  window.addEventListener('mouseup', (e) => { if (e.button > 2 && (G.Game.mode === 'play' || performance.now() < swallowUntil)) e.preventDefault(); }, true);

  // Déclenche les actions liées à une touche (sorts, potion, interaction)
  function pressActions(code) {
    for (const a of G.Input.actionsFor(code)) G.act(a, true);
  }
  // Une action du jeu, quel que soit le périphérique (clavier, manette, écran tactile).
  // fromKey : appelée par le clavier, qui gère lui-même l'inventaire, le menu, etc.
  G.act = function (a, fromKey) {
    const Game = G.Game, UI = G.UI;
    if (Game.mode !== 'play' || !$('screen').hidden) return;
    const panel = UI.currentPanel();
    const blocking = panel === 'menu' || panel === 'keys' || panel === 'options' || panel === 'creator';
    const m = /^s([1-5])$/.exec(a);
    if (m) { if (!blocking) Game.useAbility(+m[1]); return; }
    if (a === 'potion') { if (!blocking) Game.drinkPotion(); return; }
    if (a === 'interact') { if (!panel) Game.interact(); return; }
    if (fromKey) return;
    if (a === 'inventory') { if (panel === 'inventory') UI.closePanel(); else if (!blocking) UI.openPanel('inventory'); }
    else if (a === 'menu') { if (panel === 'menu') UI.closePanel(); else if (panel === 'keys' || panel === 'options') UI.openPanel('menu'); else if (panel) UI.closePanel(); else UI.openPanel('menu'); }
    else if (a === 'summon') { if (!blocking && G.Souls) G.Souls.toggle(); }
    else if (a === 'social') { if (panel === 'players') UI.closePanel(); else if (!blocking && G.Net && G.Net.available) UI.openPanel('players'); }
    else if (a === 'chat') { if (G.Net && G.Net.online && !panel) G.Net.openChat(); }
  };

  // ================= Clavier =================
  const NO_SCROLL = ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => {
    const Game = G.Game, UI = G.UI, Input = G.Input;
    Input.learn(e);
    if (UI.capturing) { e.preventDefault(); UI.captureKey(e.code); return; }
    const typing = e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (typing) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const b = $('cgo') || (e.target.dataset.enter && $(e.target.dataset.enter)); if (b) b.click(); }
      if (e.code !== 'Escape') return;
      e.target.blur();
      if (Game.mode === 'title') { UI.titleKey(e); return; }
    }
    if (e.code === 'Tab') e.preventDefault();
    if (Game.mode === 'title') { UI.titleKey(e); return; }
    const acts = Input.actionsFor(e.code);
    const screenOpen = !$('screen').hidden;
    if (acts.includes('menu') || e.code === 'Escape') {
      if (UI.closeConfirm()) return;
      if (screenOpen) return;
      const panel = UI.currentPanel();
      if (panel === 'keys' || panel === 'options') UI.openPanel('menu');
      else if (panel) UI.closePanel();
      else if (Game.mode === 'play') UI.openPanel('menu');
      return;
    }
    if (screenOpen) return;
    if (acts.includes('inventory')) {
      e.preventDefault();
      if (UI.currentPanel() === 'inventory') UI.closePanel();
      else if (Game.mode === 'play' && !['menu', 'keys', 'options', 'creator'].includes(UI.currentPanel())) UI.openPanel('inventory');
      return;
    }
    if (acts.includes('creator') && G.opt('creator') && Game.mode === 'play') {
      e.preventDefault();
      if (UI.currentPanel() === 'creator') UI.closePanel(); else UI.openPanel('creator');
      return;
    }
    // grimoire des âmes du nécromancien
    if (acts.includes('summon') && Game.mode === 'play' && G.Souls && !['menu', 'keys', 'options', 'creator'].includes(UI.currentPanel())) {
      e.preventDefault();
      if (e.shiftKey) { if (!e.repeat) G.Souls.quick(); } else G.Souls.toggle(); // Maj : la dernière meute
      return;
    }
    // jeu en ligne : discussion et liste des joueurs
    if (acts.includes('chat') && Game.mode === 'play' && G.Net && G.Net.online && !UI.currentPanel()) { e.preventDefault(); G.Net.openChat(); return; }
    if (acts.includes('social') && Game.mode === 'play' && G.Net && G.Net.available) {
      e.preventDefault();
      const cur = UI.currentPanel();
      if (cur === 'players') UI.closePanel(); else if (!['menu', 'keys', 'options', 'creator'].includes(cur)) UI.openPanel('players');
      return;
    }
    if (acts.length || NO_SCROLL.includes(e.code)) e.preventDefault();
    Game.keys[e.code] = true;
    if (e.repeat) return;
    pressActions(e.code);
  });
  window.addEventListener('keyup', (e) => { G.Game.keys[e.code] = false; });

  // ================= Boucle =================
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    try { if (G.Pad) G.Pad.update(dt); if (G.Touch) G.Touch.update(dt); } catch (err) { console.error(err); }
    try {
      if (G.Game.mode === 'title') G.UI.titleFrame(dt);
      else {
        G.Game.update(dt);
        G.Game.render(ctx);
        G.UI.update();
      }
    } catch (err) { console.error(err); }
    try { if (G.Net) G.Net.update(dt); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }

  // ================= Démarrage =================
  async function boot() {
    G.UI.init();
    Save.initLocal();
    G.Input.load();
    try { await Promise.race([document.fonts.load('700 20px Caveat'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* police de secours */ }
    G.UI.showTitle();
    requestAnimationFrame(frame);
    const changed = await Save.initRemote();
    if (changed) G.Input.load();
    if (G.Game.mode === 'title' && G.UI.titleView === 'home') G.UI.showTitle();
    if (changed && Save.local) { try { localStorage.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { /* ignoré */ } }
  }
  boot();
})();
