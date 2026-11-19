// Écran tactile (téléphone, tablette) : joystick à gauche, boutons d'action à droite, visée automatique.
// - Le joystick apparaît là où le pouce gauche se pose.
// - Attaque (maintenir), 5 sorts, potion ; « Action » apparaît près d'un personnage, d'un coffre ou d'un portail.
// - La visée se fait seule sur l'ennemi le plus proche (les sorts de déplacement suivent le joystick ;
//   « Relever les morts » et « Explosion cadavérique » visent le cadavre le plus proche).
// - Dans l'inventaire, la boutique ou la forge : un premier toucher montre l'objet, un second l'utilise.
(function () {
  const Game = G.Game, UI = G.UI, Input = G.Input, D = G.D;
  const $ = (id) => document.getElementById(id);
  const Touch = (G.Touch = { joyId: null, ox: 0, oy: 0, jx: 0, jy: 0, armed: null, sig: '' });
  const R_JOY = 105;

  // un appareil sans souris démarre directement en mode tactile
  try { if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) Input.setMode('touch'); } catch (e) { /* ancien navigateur */ }
  window.addEventListener('touchstart', () => Input.setMode('touch'), { capture: true, passive: true });

  // coordonnées d'un doigt dans la scène 1280 × 720 (la scène est mise à l'échelle de l'écran)
  function stagePos(t) {
    const r = $('stage').getBoundingClientRect();
    return { x: ((t.clientX - r.left) / r.width) * 1280, y: ((t.clientY - r.top) / r.height) * 720 };
  }

  // ----- les commandes -----
  const SPELL_POS = [[1010, 660], [992, 553], [1036, 452], [1122, 393], [1222, 392]];
  function build() {
    const ui = $('ui');
    ui.insertAdjacentHTML('afterbegin', `
      <div id="touch" hidden>
        <div id="tjoyzone" class="live"></div>
        <div id="tjoy" hidden><div id="tknob"></div></div>
        <button id="tatk" class="tb live big" aria-label="Attaquer">⚔</button>
        ${SPELL_POS.map(([x, y], i) => `<button class="tb live sp" data-s="${i + 1}" style="left:${x - 46}px;top:${y - 46}px" aria-label="Sort ${i + 1}"><span class="ab"></span><span class="tc"></span><i class="cdw"></i></button>`).join('')}
        <button id="tpot" class="tb live pot" aria-label="Potion">Po<span class="tc"></span><i class="cdw"></i></button>
        <button id="tuse" class="tb live use" hidden>Action</button>
        <button id="tsoul" class="tb live soulb" hidden aria-label="Grimoire des âmes">Âme<i class="cdw"></i></button>
        <div id="ttop" class="live">
          <button data-t="menu">☰ Menu</button><button data-t="inventory">Sac</button>
          <button data-t="social" hidden>Joueurs</button><button data-t="chat" hidden>Discuter</button>
          <button data-t="full" hidden>Plein écran</button>
        </div>
      </div>`);
    const zone = $('tjoyzone');
    zone.addEventListener('touchstart', joyStart, { passive: false });
    window.addEventListener('touchmove', joyMove, { passive: false });
    window.addEventListener('touchend', joyEnd, { passive: false });
    window.addEventListener('touchcancel', joyEnd, { passive: false });
    const hold = (el, on, off) => {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('down'); on(); }, { passive: false });
      const up = (e) => { e.preventDefault(); el.classList.remove('down'); if (off) off(); };
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
    };
    hold($('tatk'), () => { G.Virt.held.attack = true; }, () => { G.Virt.held.attack = false; });
    document.querySelectorAll('#touch .sp').forEach((b) => hold(b, () => cast(+b.dataset.s)));
    hold($('tpot'), () => G.act('potion'));
    hold($('tuse'), () => G.act('interact'));
    hold($('tsoul'), () => G.act('summon'));
    $('ttop').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.t === 'full') fullscreen();
      else G.act(b.dataset.t);
    });
    // premier toucher sur un objet : on montre ses caractéristiques ; le second l'utilise
    $('ui').addEventListener('click', (e) => {
      if (Input.mode !== 'touch') return;
      const cell = e.target.closest('.cell[data-tip], .slot[data-tip]');
      if (!cell) { Touch.armed = null; $('tip').hidden = true; return; }
      if (Touch.armed === cell && performance.now() - Touch.armedT < 4000) { Touch.armed = null; return; }
      e.preventDefault(); e.stopPropagation();
      Touch.armed = cell; Touch.armedT = performance.now();
      cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, true);
  }

  function joyStart(e) {
    e.preventDefault();
    if (Touch.joyId != null) return;
    const t = e.changedTouches[0], p = stagePos(t);
    Touch.joyId = t.identifier; Touch.ox = p.x; Touch.oy = p.y; Touch.jx = Touch.jy = 0;
    const j = $('tjoy');
    j.hidden = false; j.style.left = p.x - R_JOY + 'px'; j.style.top = p.y - R_JOY + 'px';
    $('tknob').style.transform = 'translate(0px, 0px)';
  }
  function joyMove(e) {
    if (Touch.joyId == null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== Touch.joyId) continue;
      e.preventDefault();
      const p = stagePos(t);
      let dx = (p.x - Touch.ox) / R_JOY, dy = (p.y - Touch.oy) / R_JOY;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      Touch.jx = Math.hypot(dx, dy) < 0.18 ? 0 : dx; Touch.jy = Math.hypot(dx, dy) < 0.18 ? 0 : dy;
      $('tknob').style.transform = `translate(${(dx * R_JOY * 0.62).toFixed(1)}px, ${(dy * R_JOY * 0.62).toFixed(1)}px)`;
    }
  }
  function joyEnd(e) {
    if (Touch.joyId == null) return;
    for (const t of e.changedTouches) if (t.identifier === Touch.joyId) { Touch.joyId = null; Touch.jx = Touch.jy = 0; $('tjoy').hidden = true; }
  }

  // ----- visée -----
  function aimAt(wx, wy) {
    Game.mouse.wx = wx; Game.mouse.wy = wy;
    Game.mouse.x = wx - Game.cam.x; Game.mouse.y = wy - Game.cam.y;
  }
  function autoAim() {
    const p = Game.player;
    if (!p) return;
    const t = Game.autoTarget(560);
    if (t) { aimAt(t.x, t.y - 8); return; }
    const a = Touch.jx || Touch.jy ? Math.atan2(Touch.jy, Touch.jx) : p.aim || 0;
    aimAt(p.x + Math.cos(a) * 170, p.y - 8 + Math.sin(a) * 170);
  }
  // les sorts de déplacement partent dans la direction du joystick ; les sorts de cadavres visent un cadavre
  function cast(slot) {
    const p = Game.player, sc = Game.scene;
    if (p && sc && Game.mode === 'play') {
      const ab = Game.abilityDef(slot), ks = ab.fx.map((f) => f.k);
      const move = ab.fx.some((f) => f.k === 'blink' || (f.k === 'dash' && !f.mult && !f.end));
      if (move && (Touch.jx || Touch.jy)) {
        const a = Math.atan2(Touch.jy, Touch.jx), d = Math.max(...ab.fx.map((f) => f.dist || 0), 160);
        aimAt(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      } else if (ks.includes('raise') || ks.includes('corpseBoom')) {
        let best = null, bd = 520;
        sc.corpses.forEach((k) => { const d = Math.hypot(k.x - p.x, k.y - p.y); if (!k.tried && d < bd) { bd = d; best = k; } });
        if (best) aimAt(best.x, best.y);
      }
    }
    G.act('s' + slot);
  }

  function fullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) { document.exitFullscreen && document.exitFullscreen(); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { UI.toast('Plein écran non disponible sur ce navigateur.', '#9b2c20', 2.5); return; }
    Promise.resolve(req.call(el)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (err) { /* pas de verrouillage */ } }).catch(() => {});
  }

  // ----- chaque image -----
  Touch.update = function () {
    const box = $('touch');
    if (!box) return;
    const show = Input.mode === 'touch' && Game.mode === 'play' && $('screen').hidden && !UI.currentPanel() && !!Game.player;
    if (box.hidden === show) box.hidden = !show;
    // héros tombé en groupe : seuls les boutons du haut restent (menu, discussion…)
    const down = !!(show && Game.player.dead);
    if (box.classList.contains('dead') !== down) box.classList.toggle('dead', down);
    if (!show || down) { if (Touch.joyId != null || Touch.jx || Touch.jy) { Touch.joyId = null; Touch.jx = Touch.jy = 0; $('tjoy').hidden = true; } if (Input.mode === 'touch') { G.Virt.mx = G.Virt.my = 0; G.Virt.held = {}; } if (!down) return; }
    const p = Game.player, ch = Game.char, sc = Game.scene;
    if (!down) { G.Virt.mx = Touch.jx; G.Virt.my = Touch.jy; autoAim(); }
    // sorts : abréviation, coût, recharge
    document.querySelectorAll('#touch .sp').forEach((b) => {
      const s = +b.dataset.s, ab = Game.abilityDef(s), rank = ch.abil[s] || 0;
      const cd = p.cds[s] || 0, max = p.cdMax[s] || 1;
      const sig = ab.abbr + '|' + rank + '|' + (cd > 0 ? Math.ceil(cd) : 0) + '|' + ((ab.cost || 0) > p.res || p.manaLock ? 1 : 0);
      if (b._sig === sig) return;
      b._sig = sig;
      b.querySelector('.ab').textContent = ab.abbr;
      b.querySelector('.tc').textContent = cd > 0 ? Math.ceil(cd) : ab.cost || '';
      b.querySelector('.cdw').style.height = cd > 0 ? (100 * cd / max).toFixed(0) + '%' : '0%';
      b.classList.toggle('off', !rank);
      b.classList.toggle('nores', !!(rank && ((ab.cost || 0) > p.res || (p.manaLock && ab.cost > 0))));
    });
    const pot = $('tpot');
    pot.querySelector('.tc').textContent = ch.potions;
    pot.querySelector('.cdw').style.height = p.potionCd > 0 ? (100 * p.potionCd / D.POTION_CD).toFixed(0) + '%' : '0%';
    // « Action » : parler, ouvrir, utiliser
    const use = $('tuse'), pr = sc && sc.prompt;
    if (!!pr !== !use.hidden) use.hidden = !pr;
    if (pr && use._label !== pr.label) { use._label = pr.label; use.textContent = pr.label.length > 26 ? pr.label.slice(0, 25) + '…' : pr.label; }
    // grimoire du nécromancien
    const soul = $('tsoul'), isNecro = ch.cls === 'necromancien';
    if (soul.hidden === isNecro) soul.hidden = !isNecro;
    if (isNecro && G.Souls) { const st = G.Souls.state(); soul.classList.toggle('active', !!st.out); soul.querySelector('.cdw').style.height = st.packCd > 0 ? (100 * st.packCd / Game.PACK.cd).toFixed(0) + '%' : '0%'; }
    // boutons du haut selon le jeu en ligne
    const online = !!(G.Net && G.Net.online);
    const top = $('ttop');
    top.querySelector('[data-t="social"]').hidden = !(G.Net && G.Net.available);
    top.querySelector('[data-t="chat"]').hidden = !online;
    top.querySelector('[data-t="full"]').hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled) || !!(G.App && G.App.standalone()); // l'application installée est déjà en plein écran
  };

  const baseInit = UI.init;
  UI.init = function () { baseInit(); build(); };
})();
