// Menu de départ : décor animé, menu principal, héros, création, touches, options, cimetière.
// Le menu des touches et celui des options servent aussi dans le menu pause.
(function () {
  const D = G.D, S = G.S, R = G.R, Game = G.Game, UI = G.UI, Input = G.Input;
  const $ = (id) => document.getElementById(id);
  const esc = G.esc;
  const VERSION = 'Version 3.1';
  let bg = null, tt = 0, sel = 0, items = [];
  UI.titleView = null;

  // ================= Décor animé =================
  function buildBg() {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const g = c.getContext('2d');
    S.boil = 0; S.begin(41, true);
    g.fillStyle = g.createPattern(S.paperPattern('#efe3c6'), 'repeat'); g.fillRect(0, 0, 1280, 720);
    const glow = g.createRadialGradient(990, 330, 20, 990, 330, 640);
    glow.addColorStop(0, 'rgba(240,170,90,0.42)'); glow.addColorStop(1, 'rgba(240,170,90,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 1280, 720);
    S.circle(g, 990, 300, 74, { fill: '#f2c46b', fillA: 0.75, w: 1.6 });
    // montagnes lointaines
    S.poly(g, [[0, 430], [120, 330], [230, 392], [360, 288], [470, 380], [590, 300], [700, 372], [820, 282], [930, 362], [1060, 300], [1180, 372], [1280, 320], [1280, 720], [0, 720]],
      { fill: '#d6ccb4', fillA: 0.85, w: 1.4, hatch: { sp: 10, c: '#7a6a56', a: 0.18, w: 0.7 } });
    for (const [x, y] of [[360, 288], [590, 300], [820, 282]]) { g.fillStyle = '#f7f2e6'; g.beginPath(); g.moveTo(x - 34, y + 30); g.lineTo(x, y); g.lineTo(x + 30, y + 28); g.lineTo(x + 8, y + 22); g.lineTo(x - 10, y + 32); g.closePath(); g.fill(); }
    // colline de la ville
    S.poly(g, [[700, 720], [760, 520], [880, 462], [1040, 446], [1200, 452], [1280, 470], [1280, 720]], { fill: '#c9be9a', fillA: 0.95, w: 1.8, hatch: { sp: 8, ang: -0.4, c: '#6b5a46', a: 0.2, w: 0.7 } });
    // remparts et maisons de Havre-Gris
    for (let i = 0; i < 9; i++) { const x = 900 + i * 38; S.poly(g, [[x, 418], [x + 18, 394 - (i % 3) * 8], [x + 36, 418]], { fill: ['#8c3b2a', '#2c5f9e', '#6a3f86', '#4f6b2b'][i % 4], fillA: 0.85, w: 1.2 }); }
    S.rect(g, 880, 412, 340, 56, { fill: '#cbbd9a', fillA: 1, w: 2, hatch: { sp: 6, ang: 1.5, c: '#6b5a46', a: 0.18, w: 0.6 } });
    for (let i = 0; i < 17; i++) S.rect(g, 884 + i * 20, 402, 12, 12, { fill: '#cbbd9a', fillA: 1, w: 1.1, single: true });
    S.rect(g, 1018, 300, 70, 168, { fill: '#c2b28c', fillA: 1, w: 2 });
    S.poly(g, [[1010, 304], [1053, 236], [1096, 304]], { fill: '#9b2c20', fillA: 0.95, w: 2 });
    for (const x of [868, 1210]) { S.rect(g, x - 18, 360, 36, 108, { fill: '#c2b28c', fillA: 1, w: 1.8 }); S.poly(g, [[x - 24, 364], [x, 318], [x + 24, 364]], { fill: '#9b2c20', fillA: 0.95, w: 1.6 }); }
    g.fillStyle = '#4a3524'; g.beginPath(); g.moveTo(1035, 468); g.lineTo(1035, 446); g.quadraticCurveTo(1053, 428, 1071, 446); g.lineTo(1071, 468); g.closePath(); g.fill();
    for (const [x, y] of [[1032, 330], [1062, 330], [1047, 372]]) { g.fillStyle = '#f2c46b'; g.fillRect(x, y, 9, 13); g.strokeStyle = S.ink; g.lineWidth = 1; g.strokeRect(x, y, 9, 13); }
    // route qui monte vers la porte
    g.save(); g.globalAlpha = 0.55; g.strokeStyle = '#b89c6a'; g.lineWidth = 30; g.lineCap = 'round';
    g.beginPath(); g.moveTo(560, 760); g.bezierCurveTo(760, 640, 820, 560, 1053, 470); g.stroke(); g.restore();
    S.line(g, 540, 735, 1040, 470, 1, 'rgba(90,65,35,0.4)', 3, 1);
    // collines et arbres à gauche
    S.poly(g, [[0, 560], [140, 500], [300, 540], [460, 520], [600, 600], [640, 720], [0, 720]], { fill: '#b8b98a', fillA: 0.9, w: 1.6, hatch: { sp: 9, c: '#4f6b2b', a: 0.18, w: 0.7 } });
    for (const [x, y, r] of [[70, 500, 26], [118, 488, 30], [176, 506, 24], [250, 520, 28], [300, 512, 22], [420, 516, 26]]) {
      S.line(g, x, y + r * 0.5, x, y + r * 1.2, 3, '#5a4030');
      S.circle(g, x, y, r, { fill: x % 2 ? '#5d7a3a' : '#4f6a34', fillA: 0.95, w: 1.5 });
      S.hatchCircle(g, x + r * 0.2, y + r * 0.2, r * 0.8, r * 0.7, { sp: 4, c: '#1d2a12', a: 0.3, w: 0.6 });
    }
    // rocher du premier plan
    S.poly(g, [[430, 720], [470, 640], [540, 604], [640, 596], [720, 622], [770, 676], [800, 720]], { fill: '#8a8478', fillA: 1, w: 2.2, hatch: { sp: 6, ang: 1.1, c: '#2b2118', a: 0.28, w: 0.8 } });
    S.line(g, 520, 640, 600, 650, 1, 'rgba(43,33,24,0.6)', 1.5, 1); S.line(g, 640, 640, 700, 668, 1, 'rgba(43,33,24,0.6)', 1.5, 1);
    for (let i = 0; i < 14; i++) { const x = 540 + i * 13, y = 604 + Math.abs(Math.sin(i)) * 8; S.line(g, x, y, x + 2, y - 8, 1, '#4f6b2b', 0.6, 1); }
    // vignette
    const v = g.createRadialGradient(640, 360, 300, 640, 360, 820);
    v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(45,28,12,0.45)');
    g.fillStyle = v; g.fillRect(0, 0, 1280, 720);
    return c;
  }

  const clouds = [[100, 120, 1.1], [520, 80, 0.8], [880, 150, 1.3], [1220, 100, 0.9], [300, 200, 0.7]];
  const birds = [[0, 160], [40, 180], [80, 150], [-40, 175]];
  const leaves = Array.from({ length: 10 }, (_, i) => ({ x: Math.random() * 1280, y: Math.random() * 720, s: 20 + Math.random() * 30, ph: i }));

  UI.titleFrame = function (dt) {
    const cv = $('title-canvas');
    if (!cv) return;
    tt += dt;
    if (!bg) bg = buildBg();
    const g = cv.getContext('2d');
    S.boil = Math.floor(tt * 6);
    g.drawImage(bg, 0, 0);
    // nuages
    clouds.forEach(([x0, y, s], i) => {
      const x = ((x0 + tt * 8 * s) % 1500) - 160;
      g.globalAlpha = 0.85; S.begin(300 + i);
      S.circle(g, x, y, 44 * s, { ry: 15 * s, fill: '#f7f2e6', fillA: 0.95, stroke: 'rgba(120,100,80,0.5)', w: 1.1, single: true });
      S.circle(g, x + 34 * s, y - 9 * s, 30 * s, { ry: 14 * s, fill: '#f7f2e6', fillA: 0.95, stroke: 'rgba(120,100,80,0.5)', w: 1.1, single: true });
      g.globalAlpha = 1;
    });
    // fumée des cheminées
    for (const [cx, cy] of [[935, 398], [1105, 396], [1160, 402]]) {
      for (let k = 0; k < 4; k++) {
        const f = ((tt * 0.35 + k * 0.25 + cx * 0.001) % 1);
        g.globalAlpha = 0.45 * (1 - f); S.begin(cx + k);
        S.circle(g, cx + f * 22 + Math.sin(tt + k) * 3, cy - f * 70, 5 + f * 12, { fill: 'rgba(200,192,180,0.8)', fillA: 0.6, stroke: 'rgba(90,80,70,0.7)', w: 1, single: true });
      }
      g.globalAlpha = 1;
    }
    // drapeaux qui flottent
    for (const [x, y] of [[1053, 236], [868, 318], [1210, 318]]) {
      const w = Math.sin(tt * 4 + x) * 4;
      S.line(g, x, y, x, y - 26, 1.6, '#4a3524', 0.4, 1);
      S.begin(x); S.poly(g, [[x, y - 26], [x + 22, y - 22 + w], [x, y - 15]], { fill: '#8c2a20', fillA: 0.95, w: 1, single: true });
    }
    // oiseaux
    birds.forEach(([dx, y], i) => {
      const x = ((tt * 55 + dx + 200) % 1600) - 150, fl = Math.sin(tt * 9 + i) * 4;
      // les oiseaux apparaissent à droite du menu (ils ne passent pas sur le titre)
      g.globalAlpha = Math.max(0, Math.min(1, (x - 560) / 140));
      if (!g.globalAlpha) { g.globalAlpha = 1; return; }
      g.strokeStyle = S.ink; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 8, y - fl); g.quadraticCurveTo(x - 4, y - 3, x, y); g.quadraticCurveTo(x + 4, y - 3, x + 8, y - fl); g.stroke();
      g.globalAlpha = 1;
    });
    // héros debout sur le rocher, face à la ville
    const ch = lastHero();
    const cls = ch ? ch.cls : D.CLASS_ORDER[Math.floor(tt / 3) % D.CLASS_ORDER.length];
    g.save(); g.translate(610, 604); g.scale(3, 3);
    R.unit(g, { id: 7777, x: 0, y: 0, r: 13, look: cls, isPlayer: true, facing: 1, aim: -0.25 + Math.sin(tt * 0.8) * 0.08, walk: 0, swingT: 0, stunT: 0, hitT: 0 });
    g.restore();
    // feuilles
    leaves.forEach((l) => {
      l.y += l.s * dt; l.x += Math.sin(tt + l.ph) * 20 * dt + 12 * dt;
      if (l.y > 730) { l.y = -10; l.x = Math.random() * 1280; }
      g.save(); g.translate(l.x, l.y); g.rotate(tt * 2 + l.ph); g.fillStyle = ['#7a9a48', '#c4661a', '#b8862b'][l.ph % 3]; g.beginPath(); g.ellipse(0, 0, 5, 2.4, 0, 0, G.TAU); g.fill(); g.restore();
    });
    // portraits animés de l'écran des héros
    document.querySelectorAll('canvas[data-hero]').forEach((pc) => {
      const pg = pc.getContext('2d');
      pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, pc.width, pc.height);
      pg.scale(2.05, 2.05);
      R.unit(pg, { id: 600 + +pc.dataset.idx, x: 29, y: 51, r: 13, look: pc.dataset.hero, isPlayer: true, facing: 1, aim: -0.3 + Math.sin(tt * 1.3 + +pc.dataset.idx) * 0.25, walk: 0, swingT: 0, stunT: 0, hitT: 0 });
    });
  };

  function lastHero() { const d = G.Save.data; return d.chars[d.last] || d.chars[0] || null; }

  // ================= Écran de base =================
  function frame(view, html, wide) {
    UI.titleView = view;
    Game.mode = 'title';
    Game.scene = null;
    $('hud').hidden = true; $('panel').hidden = true;
    UI.hidePanel(); Game.paused = false;
    const sc = $('screen');
    sc.className = 'screen live title-screen' + (view === 'home' ? ' home' : '');
    sc.hidden = false;
    if (!$('title-canvas')) sc.innerHTML = '<canvas id="title-canvas" width="1280" height="720"></canvas><div id="tview"></div>';
    const tv = $('tview');
    tv.className = view === 'home' ? 'tv-home' : 'tv-box sk' + (wide === 'narrow' ? ' narrow' : wide ? ' wide' : '');
    tv.innerHTML = html;
    sc.onclick = null; sc.onkeydown = null;
    tv.onclick = tv.onmouseover = tv.onchange = tv.onkeydown = null;
    tv.scrollTop = 0;
    return tv;
  }

  // Confirmation affichée sur le décor du titre (Échap = annuler)
  let cancelFn = null;
  function titleConfirm(title, text, okLabel, onOk, onCancel) {
    const tv = frame('confirm', `<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="danger-main" data-ok="1">${esc(okLabel)}</button><button data-no="1">Annuler</button></div>`, 'narrow');
    cancelFn = onCancel;
    tv.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cancelFn = null; if (b.dataset.ok) onOk(); else onCancel(); };
    setTimeout(() => { const b = tv.querySelector('[data-no]'); if (b) b.focus(); }, 30);
  }

  // ================= Menu principal =================
  UI.showTitle = function () {
    const data = G.Save.data, ch = lastHero();
    items = [];
    if (ch) items.push({ id: 'continue', t: 'Continuer', who: ch.name, s: `Reprendre avec ${ch.name} : ${D.CLASSES[ch.cls].name.toLowerCase()} niveau ${ch.lvl}, ${ch.cleared}/15 donjons${ch.hardcore ? ', Hardcore' : ''}.` });
    if (data.chars.length) items.push({ id: 'heroes', t: 'Choisir un héros', s: `Vos ${data.chars.length} héros : jouer, comparer ou supprimer.` });
    items.push({ id: 'new', t: 'Nouveau héros', s: data.chars.length >= 6 ? 'Maximum atteint : 6 héros. Supprimez-en un pour en créer un autre.' : '10 classes, un tutoriel avec la sergente Brenna, et le mode Hardcore pour les plus courageux.', off: data.chars.length >= 6 });
    items.push({ id: 'keys', t: 'Touches', s: 'Changer les commandes du clavier et de la souris.' });
    items.push({ id: 'options', t: 'Options', s: 'Tremblement de l\'écran, chiffres de dégâts, flèche de guidage, éclairage.' });
    if ((data.graveyard || []).length) items.push({ id: 'grave', t: 'Cimetière des héros', s: `${data.graveyard.length} héros tombé${data.graveyard.length > 1 ? 's' : ''} en mode Hardcore. Ils ne reviendront pas.` });
    sel = Math.max(0, Math.min(sel, items.length - 1));
    if (items[sel].off) sel = items.findIndex((it) => !it.off);
    const tv = frame('home', `
      <div id="title-logo">Chroniques de Valdorne<small>Les Quinze Sceaux</small></div>
      <p class="tagline">Le Roi Cendré a brisé le Sceau des Quinze. Ses lieutenants gardent les fragments au fond des donjons. Havre-Gris est le dernier bastion.</p>
      <nav class="mmenu" aria-label="Menu principal">${items.map((it, i) => `<button class="mitem${i === sel ? ' sel' : ''}" data-i="${i}" ${it.off ? 'disabled' : ''}><b>${it.t}</b>${it.who ? `<i>${esc(it.who)}</i>` : ''}</button>`).join('')}</nav>
      <p class="mdesc" id="mdesc">${esc(items[sel].s)}</p>
      <div class="tfoot"><span>↑ ↓ choisir · Entrée valider · ou la souris</span><span>${G.Save.whereText()} · ${VERSION}</span></div>`);
    tv.onclick = (e) => { const b = e.target.closest('.mitem'); if (b && !b.disabled) activate(+b.dataset.i); };
    tv.onmouseover = (e) => { const b = e.target.closest('.mitem'); if (b && !b.disabled && +b.dataset.i !== sel) { sel = +b.dataset.i; markSel(); } };
  };
  function markSel() {
    document.querySelectorAll('.mitem').forEach((b) => b.classList.toggle('sel', +b.dataset.i === sel));
    const d = $('mdesc'); if (d && items[sel]) d.textContent = items[sel].s;
  }
  function activate(i) {
    const it = items[i]; if (!it || it.off) return;
    const data = G.Save.data;
    if (it.id === 'continue') { const ch = lastHero(); data.last = data.chars.indexOf(ch); $('screen').hidden = true; Game.start(ch); }
    else if (it.id === 'heroes') UI.showHeroes();
    else if (it.id === 'new') UI.showCreate();
    else if (it.id === 'keys') UI.showKeys();
    else if (it.id === 'options') UI.showOptions();
    else if (it.id === 'grave') UI.showGrave();
  }

  // Clavier sur les écrans du menu
  UI.titleKey = function (e) {
    // fenêtre de confirmation ouverte : seule Échap (annuler) est prise en compte
    if ($('screen').classList.contains('dim')) { if (e.code === 'Escape') UI.closeConfirm(); return; }
    const isUp = e.code === 'ArrowUp' || Input.codes('up').includes(e.code);
    const isDown = e.code === 'ArrowDown' || Input.codes('down').includes(e.code);
    if (UI.titleView === 'home') {
      if (isUp || isDown) {
        e.preventDefault();
        let n = sel;
        do { n = (n + (isUp ? -1 : 1) + items.length) % items.length; } while (items[n].off && n !== sel);
        sel = n; markSel();
      } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { e.preventDefault(); activate(sel); }
      return;
    }
    if (e.code === 'Escape') {
      if (UI.titleView === 'confirm' && cancelFn) { const f = cancelFn; cancelFn = null; f(); }
      else UI.showTitle();
    }
  };

  // ================= Héros =================
  UI.showHeroes = function () {
    const data = G.Save.data;
    const fmtT = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + ' h ' + String(m).padStart(2, '0') : m + ' min'; };
    const cards = data.chars.map((c, i) => {
      const C = D.CLASSES[c.cls];
      return `<div class="hcard sk${c.hardcore ? ' hardcore' : ''}${i === data.last ? ' lastp' : ''}">
        <canvas width="120" height="120" data-hero="${c.cls}" data-idx="${i}"></canvas>
        <div class="hinfo"><h3>${esc(c.name)}${c.hardcore ? '<span class="hc">Hardcore</span>' : ''}</h3>
        <div>${C.name} · niveau ${c.lvl}</div>
        <div class="muted">${c.cleared}/15 donjons · ${c.hardcore ? 'une seule vie' : c.deaths + ' mort' + (c.deaths > 1 ? 's' : '')} · ${fmtT(c.time)}</div>
        <div class="row"><button class="main" data-play="${i}">Jouer</button><button class="danger" data-del="${i}">Supprimer</button></div></div></div>`;
    }).join('');
    const tv = frame('heroes', `<header class="tvhead"><h2>Vos héros</h2><button data-back="1">Retour (Échap)</button></header>
      <div class="hgrid">${cards}${data.chars.length < 6 ? '<button class="hcard newh sk" data-new="1"><b>+</b><span>Nouveau héros</span></button>' : ''}</div>`, true);
    tv.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.back) UI.showTitle();
      else if (b.dataset.new) UI.showCreate();
      else if (b.dataset.play != null) { data.last = +b.dataset.play; $('screen').hidden = true; Game.start(data.chars[+b.dataset.play]); }
      else if (b.dataset.del != null) {
        const c = data.chars[+b.dataset.del];
        titleConfirm('Supprimer ' + c.name + ' ?', 'Ce héros et tout son équipement seront effacés définitivement.', 'Supprimer', () => {
          data.chars.splice(+b.dataset.del, 1); data.last = 0; G.Save.save(true);
          if (data.chars.length) UI.showHeroes(); else UI.showTitle();
        }, () => UI.showHeroes());
      }
    };
  };

  // ================= Création de personnage =================
  UI.showCreate = function () {
    let selC = 'guerrier';
    const cards = D.CLASS_ORDER.map((k) => {
      const C = D.CLASSES[k];
      return `<div class="cls sk" data-cls="${k}" tabindex="0"><canvas width="90" height="80" data-prev="${k}"></canvas><h3>${C.name}</h3><div class="role">${C.role}</div><div class="role">Difficulté ${'●'.repeat(C.diff)}${'○'.repeat(3 - C.diff)}</div></div>`;
    }).join('');
    const tv = frame('create', `<header class="tvhead"><h2>Nouveau héros</h2><button id="cback">Retour (Échap)</button></header>
      <div class="classes">${cards}</div>
      <div id="clsdesc"></div>
      <div class="row" style="justify-content:center"><label for="cname" style="font-size:20px">Nom du héros</label><input type="text" id="cname" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Votre nom">
      <button class="main" id="cgo">Commencer l'aventure</button></div>
      <div class="row" style="gap:28px;font-size:18px;justify-content:center"><label class="row" style="gap:8px"><input type="checkbox" id="cskip"> Passer le tutoriel</label>
      <label class="row hcpick" style="gap:8px"><input type="checkbox" id="chc"> <b>Mode Hardcore</b> : une seule vie. À sa mort, le héros est effacé pour toujours.</label></div>
      <div class="msg" id="cmsg" style="color:var(--blood);text-align:center"></div>`, true);
    tv.querySelectorAll('canvas[data-prev]').forEach((cv) => {
      const g = cv.getContext('2d');
      g.scale(1.6, 1.6);
      R.unit(g, { id: 900 + D.CLASS_ORDER.indexOf(cv.dataset.prev), x: 28, y: 44, r: 13, look: cv.dataset.prev, isPlayer: true, facing: 1, aim: -0.4, walk: 0, swingT: 0, stunT: 0, hitT: 0 });
    });
    const upd = () => {
      tv.querySelectorAll('.cls').forEach((c) => c.classList.toggle('sel', c.dataset.cls === selC));
      const C = D.CLASSES[selC];
      $('clsdesc').innerHTML = `<b style="font-family:var(--f-title);font-size:26px">${C.name}</b> — ${esc(C.desc)}<br><span class="muted">Vie ${C.hp} · Ressource : ${D.RES[C.res].name} · Sorts : ${C.abil.map((a) => a.name).join(', ')}</span>`;
    };
    upd();
    tv.onclick = (e) => {
      const c = e.target.closest('.cls');
      if (c) { selC = c.dataset.cls; upd(); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'cback') UI.showTitle();
      if (b.id === 'cgo') {
        const name = $('cname').value.trim();
        if (name.length < 2) { $('cmsg').textContent = 'Le nom doit faire au moins 2 caractères.'; return; }
        const skip = $('cskip').checked;
        const ch = Game.newChar(name, selC, skip, $('chc').checked);
        G.Save.data.chars.push(ch); G.Save.data.last = G.Save.data.chars.length - 1;
        $('screen').hidden = true;
        Game.start(ch);
        if (skip) UI.toast('Bienvenue à Havre-Gris, ' + name + ' ! Parlez au Capitaine Aldric (Garnison).', '#4f6b2b', 6);
      }
    };
    tv.onkeydown = (e) => { const c = e.target.closest && e.target.closest('.cls'); if (c && (e.key === 'Enter' || e.key === ' ')) { selC = c.dataset.cls; upd(); } };
    $('chc').onchange = () => {
      $('cgo').textContent = $('chc').checked ? 'Commencer (une seule vie)' : 'Commencer l\'aventure';
      $('cgo').classList.toggle('danger-main', $('chc').checked);
    };
    setTimeout(() => $('cname') && $('cname').focus(), 50);
  };

  // ================= Touches =================
  let keyMsg = '';
  UI.capturing = null;
  UI.keysBody = function () {
    const cap = UI.capturing;
    const cell = (a, slot) => {
      const code = Input.binds[a.id][slot];
      const waiting = cap && cap.action === a.id && cap.slot === slot;
      const locked = a.id === 'menu' && slot === 0;
      return `<button class="kbtn${waiting ? ' wait' : ''}${code ? '' : ' empty'}" data-act="${a.id}" data-slot="${slot}" ${locked ? 'disabled title="Échap reste la touche du menu"' : ''}>${waiting ? 'Appuyez sur une touche' : code ? esc(Input.codeLabel(code)) : '—'}</button>`;
    };
    const group = (name) => `<div class="kgroup"><h3>${name}</h3>
      <div class="krow khead"><span>Action</span><span>Touche</span><span>Autre touche</span></div>
      ${Input.ACTIONS.filter((a) => a.group === name).map((a) => `<div class="krow"><span>${a.name}</span>${cell(a, 0)}${cell(a, 1)}</div>`).join('')}</div>`;
    const miss = Input.missing();
    return `<p class="khelp">Cliquez sur une case, puis appuyez sur la nouvelle touche. Pour un bouton de la souris, cliquez sur la case en attente avec ce bouton. <b>Échap</b> annule, <b>Suppr</b> vide la case.</p>
      <div class="kgrid"><div>${group('Déplacement')}${group('Interface')}</div><div>${group('Combat')}</div></div>
      <div class="msg kmsg" id="kmsg">${esc(keyMsg)}${miss.length ? `<span style="color:var(--blood)"> Sans touche : ${esc(miss.join(', '))}.</span>` : ''}</div>
      <div class="row kfoot"><button data-reset="1">Rétablir les touches par défaut</button><span class="muted">Les touches suivent leur place sur le clavier : Z Q S D sur un clavier AZERTY, W A S D sur un QWERTY.</span></div>`;
  };
  UI.keysClick = function (e, rerender) {
    const b = e.target.closest('button'); if (!b) return false;
    if (b.dataset.reset) { Input.reset(); keyMsg = 'Touches par défaut rétablies.'; UI.capturing = null; rerender(); UI.refreshLabels(); return true; }
    if (b.dataset.act) {
      keyMsg = '';
      const cap = { action: b.dataset.act, slot: +b.dataset.slot, armed: false, rerender };
      UI.capturing = cap;
      rerender();
      // un double-clic ne doit pas choisir « clic gauche » par erreur
      setTimeout(() => { if (UI.capturing === cap) cap.armed = true; }, 400);
      return true;
    }
    return false;
  };
  UI.captureKey = function (code) {
    const cap = UI.capturing;
    if (!cap) return;
    UI.capturing = null;
    const a = Input.ACTIONS.find((x) => x.id === cap.action);
    if (code === 'Escape') keyMsg = 'Changement annulé.';
    else if (code === 'Delete' || code === 'Backspace') { Input.clear(cap.action, cap.slot); keyMsg = '« ' + a.name + ' » : case vidée.'; }
    else {
      const r = Input.assign(cap.action, cap.slot, code);
      keyMsg = r.ok ? '« ' + a.name + ' » : ' + Input.codeLabel(code) + '. ' + r.msg : r.msg;
    }
    cap.rerender();
    UI.refreshLabels();
  };
  // Clic ailleurs pendant l'attente : on annule sans redessiner, pour que le clic agisse normalement
  UI.cancelCapture = function () {
    const cap = UI.capturing;
    if (!cap) return;
    UI.capturing = null;
    const el = document.querySelector('.kbtn.wait');
    if (el) { const code = Input.binds[cap.action][cap.slot]; el.classList.remove('wait'); el.textContent = code ? Input.codeLabel(code) : '—'; }
  };
  UI.showKeys = function () {
    const render = () => { const tv = frame('keys', `<header class="tvhead"><h2>Touches</h2><button data-back="1">Retour (Échap)</button></header>${UI.keysBody()}`, true); tv.onclick = (e) => { const b = e.target.closest('button'); if (b && b.dataset.back) { UI.capturing = null; keyMsg = ''; UI.showTitle(); return; } UI.keysClick(e, render); }; };
    keyMsg = '';
    render();
  };

  // ================= Options =================
  UI.optionsBody = function () {
    return `<div class="olist">${Input.OPTIONS.map((o) => `<label class="orow"><input type="checkbox" data-opt="${o.id}" ${G.opt(o.id) ? 'checked' : ''}><span class="oswitch"></span><span><b>${o.name}</b><br><span class="muted">${o.desc}</span></span></label>`).join('')}</div>`;
  };
  UI.optionsChange = function (e) {
    const c = e.target.closest('input[data-opt]'); if (!c) return;
    Input.setOption(c.dataset.opt, c.checked);
  };
  UI.showOptions = function () {
    const tv = frame('options', `<header class="tvhead"><h2>Options</h2><button data-back="1">Retour (Échap)</button></header>${UI.optionsBody()}`);
    tv.onclick = (e) => { const b = e.target.closest('button'); if (b && b.dataset.back) UI.showTitle(); };
    tv.onchange = UI.optionsChange;
  };

  // ================= Cimetière =================
  UI.showGrave = function () {
    const g = G.Save.data.graveyard || [];
    const date = (t) => { try { return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
    const tv = frame('grave', `<header class="tvhead"><h2>Cimetière des héros</h2><button data-back="1">Retour (Échap)</button></header>
      <p class="khelp">Ici reposent les héros du mode Hardcore. Une seule vie : ils ne reviendront pas.</p>
      <div class="ggrid">${g.map((m) => `<div class="tomb"><h3>${esc(m.name)}</h3><div>${D.CLASSES[m.cls] ? D.CLASSES[m.cls].name : ''} · niveau ${m.lvl}</div>
        <div class="muted">${m.cleared}/15 donjons · ${G.fmt(m.kills || 0)} monstres</div><div>${esc(m.place)}</div><div class="cause">${esc(m.cause)}</div><div class="muted">${date(m.date)}</div></div>`).join('')}</div>`, true);
    tv.onclick = (e) => { const b = e.target.closest('button'); if (b && b.dataset.back) UI.showTitle(); };
  };
})();
