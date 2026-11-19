// Manette (API Gamepad, disposition standard Xbox / PlayStation).
// En jeu : stick gauche = se déplacer ; stick droit = viser (sinon visée automatique sur l'ennemi le plus proche) ;
// RT = attaque de base ; X, Y, B, RB, LT = sorts 1 à 5 ; LB = potion ; A = interagir ;
// Vue = inventaire ; Menu = pause ; croix ↓ = grimoire (nécromancien) ; croix ← = joueurs en ligne ; croix ↑ = invitations.
// Dans les menus : croix ou stick gauche = choisir ; A = valider ; B = retour ; X = jeter (inventaire).
(function () {
  const Game = G.Game, UI = G.UI, Input = G.Input;
  const $ = (id) => document.getElementById(id);
  const Pad = (G.Pad = { connected: false, active: false, prev: [], focus: null, overlay: null, navT: 0, navDir: null, aimAng: 0, aimT: 0 });
  const DEAD = 0.24;
  const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const PRESS = { [B.X]: 's1', [B.Y]: 's2', [B.B]: 's3', [B.RB]: 's4', [B.LT]: 's5', [B.LB]: 'potion', [B.A]: 'interact' };
  const dz = (v) => (Math.abs(v || 0) < DEAD ? 0 : v);
  const down = (b) => !!b && (b.pressed || b.value > 0.5);

  function getPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of list || []) if (gp && gp.connected && gp.buttons && gp.buttons.length >= 10) return gp;
    return null;
  }
  window.addEventListener('gamepadconnected', () => { if (UI.toast) UI.toast('Manette connectée', '#2f5d8a', 2.5); });
  window.addEventListener('gamepaddisconnected', () => { release(); clearFocus(); if (UI.toast) UI.toast('Manette déconnectée', '#9b2c20', 2.5); });

  function release() {
    if (!Pad.active) return;
    Pad.active = false;
    G.Virt.mx = G.Virt.my = 0;
    G.Virt.held = {};
  }

  Pad.update = function (dt) {
    const gp = getPad();
    if (!gp) { if (Pad.connected) { Pad.connected = false; release(); clearFocus(); } return; }
    Pad.connected = true;
    const btn = gp.buttons.map(down), ax = gp.axes || [];
    const lx = dz(ax[0]), ly = dz(ax[1]), rx = dz(ax[2]), ry = dz(ax[3]);
    const prev = Pad.prev;
    Pad.prev = btn;
    const edge = (i) => btn[i] && !prev[i];
    if (btn.some(Boolean) || lx || ly || rx || ry) Input.setMode('pad');
    if (Input.mode !== 'pad') { release(); clearFocus(); return; }
    // menus, écrans, fenêtres : on choisit avec la croix, A valide, B revient
    const layer = activeLayer();
    if (layer) { release(); navigate(layer, btn, edge, lx, ly, dt); return; }
    clearFocus();
    if (Game.mode !== 'play') return;
    Pad.active = true;
    G.Virt.mx = lx; G.Virt.my = ly;
    G.Virt.held.attack = btn[B.RT];
    aim(rx, ry, lx, ly, dt);
    for (const i in PRESS) if (edge(+i)) G.act(PRESS[i]);
    if (edge(B.VIEW)) G.act('inventory');
    if (edge(B.MENU)) G.act('menu');
    if (edge(B.DOWN)) G.act('summon');
    if (edge(B.LEFT)) G.act('social');
    if (edge(B.UP)) focusOverlay();
  };

  // ----- visée -----
  function aim(rx, ry, lx, ly, dt) {
    const p = Game.player;
    if (!p) return;
    let wx, wy;
    if (rx || ry) {
      const a = Math.atan2(ry, rx), d = 90 + 330 * Math.min(1, Math.hypot(rx, ry));
      Pad.aimAng = a; Pad.aimT = 0.6;
      wx = p.x + Math.cos(a) * d; wy = p.y - 8 + Math.sin(a) * d;
      Game.aimTarget = null;
    } else {
      Pad.aimT -= dt;
      const t = Pad.aimT <= 0 ? Game.autoTarget(560) : null;
      if (t) { wx = t.x; wy = t.y - 8; Pad.aimAng = Math.atan2(wy - p.y, wx - p.x); }
      else {
        if (lx || ly) Pad.aimAng = Math.atan2(ly, lx);
        wx = p.x + Math.cos(Pad.aimAng) * 170; wy = p.y - 8 + Math.sin(Pad.aimAng) * 170;
      }
    }
    Game.mouse.x = wx - Game.cam.x; Game.mouse.y = wy - Game.cam.y;
    Game.mouse.wx = wx; Game.mouse.wy = wy;
  }

  // ----- navigation dans l'interface -----
  const visible = (el) => { if (!el || !el.isConnected || el.closest('[hidden]')) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  function activeLayer() {
    const scr = $('screen');
    if (scr && !scr.hidden) return scr;
    const pnl = $('panel');
    if (pnl && !pnl.hidden) return pnl;
    if (Pad.overlay && visible(Pad.overlay)) return Pad.overlay;
    Pad.overlay = null;
    return null;
  }
  // croix ↑ en jeu : invitations reçues, ou bouton « Rentrer » d'un héros tombé
  function focusOverlay() {
    const inv = document.querySelector('#invites .invite');
    const ghost = $('ghost');
    Pad.overlay = inv || (ghost && !ghost.hidden ? ghost : null);
    if (Pad.overlay) { release(); setFocus(focusables(Pad.overlay)[0]); }
  }
  const SEL = 'button:not([disabled]), [data-ref], [data-dun], [data-cls], input:not([type=hidden]):not([disabled]), select, label.orow, .kbtn';
  function focusables(layer) {
    return [...layer.querySelectorAll(SEL)].filter((el) => visible(el) && !(el.tagName === 'INPUT' && el.closest('label.orow')));
  }
  function clearFocus() {
    if (Pad.focus) Pad.focus.classList.remove('padfocus');
    Pad.focus = null;
  }
  function setFocus(el) {
    if (!el || el === Pad.focus) return;
    clearFocus();
    Pad.focus = el;
    el.classList.add('padfocus');
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ancien navigateur */ }
    // infobulle des objets, choix du menu de départ
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  function step(list, dx, dy) {
    const cur = Pad.focus && list.includes(Pad.focus) ? Pad.focus : null;
    if (!cur) return list[0];
    const a = center(cur);
    let best = null, bs = 1e9;
    for (const el of list) {
      if (el === cur) continue;
      const b = center(el), vx = b.x - a.x, vy = b.y - a.y;
      const along = vx * dx + vy * dy;
      if (along <= 3) continue;
      const score = along + Math.abs(vx * dy - vy * dx) * 2.4;
      if (score < bs) { bs = score; best = el; }
    }
    return best || cur;
  }
  function navigate(layer, btn, edge, lx, ly, dt) {
    const list = focusables(layer);
    if (!list.length) { clearFocus(); if (edge(B.B)) back(); return; }
    let fresh = false; // première sélection : la direction choisie ne fait pas encore bouger
    if (!Pad.focus || !list.includes(Pad.focus)) { setFocus(pick(list)); fresh = true; }
    // direction (croix, ou stick gauche) avec répétition quand on maintient
    let d = null;
    if (btn[B.UP] || ly < -0.6) d = [0, -1];
    else if (btn[B.DOWN] || ly > 0.6) d = [0, 1];
    else if (btn[B.LEFT] || lx < -0.6) d = [-1, 0];
    else if (btn[B.RIGHT] || lx > 0.6) d = [1, 0];
    const key = d ? d.join() : null;
    if (key !== Pad.navDir) { Pad.navDir = key; Pad.navT = 0.38; if (d && !fresh) setFocus(step(list, d[0], d[1])); }
    else if (d) { Pad.navT -= dt; if (Pad.navT <= 0) { Pad.navT = 0.13; setFocus(step(list, d[0], d[1])); } }
    if (edge(B.A)) activate(Pad.focus);
    else if (edge(B.B)) back();
    else if (edge(B.X) && Pad.focus && Pad.focus.matches('.cell[data-ref]')) Pad.focus.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    else if (edge(B.MENU) && Game.mode === 'play') G.act('menu');
    else if (edge(B.VIEW) && UI.currentPanel() === 'inventory') UI.closePanel();
  }
  // premier élément proposé : le bouton principal s'il y en a un
  function pick(list) {
    return list.find((el) => el.matches('.mitem.sel')) || list.find((el) => el.matches('button.main')) || list[0];
  }
  function activate(el) {
    if (!el) return;
    if (el.tagName === 'INPUT' && /^(text|search)$/.test(el.type)) { el.focus(); return; }
    if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); return; }
    el.click();
    Pad.focus = null; // la fenêtre est peut-être redessinée : on retrouvera le bouton principal
    el.classList.remove('padfocus');
  }
  function back() {
    if (Pad.overlay && activeLayer() === Pad.overlay) { Pad.overlay = null; clearFocus(); return; }
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
  }

  // petite vibration quand le héros est touché
  Pad.rumble = function (power) {
    if (Input.mode !== 'pad') return;
    const gp = getPad();
    const act = gp && gp.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: 120, strongMagnitude: Math.min(1, power), weakMagnitude: Math.min(1, power * 0.6) }).catch(() => {});
  };
  const baseHurt = UI.hurt;
  UI.hurt = function () { baseHurt(); Pad.rumble(0.35); };
})();
