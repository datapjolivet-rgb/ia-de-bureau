// Interface : écrans titre/création, HUD, inventaire, forge, boutique, compétences, quêtes, portail, mort.
(function () {
  const D = G.D, I = G.I, Game = G.Game;
  const UI = (G.UI = {});
  const $ = (id) => document.getElementById(id);
  const esc = G.esc;
  let panelId = null, tipRef = null, forgeSel = null, pendingDestroy = null, lastTracker = 0, buffSig = '';

  UI.init = function () {
    $('ui').innerHTML = `
      <div id="hud" hidden>
        <div id="hurt"></div>
        <div id="pframe" class="sk"><div id="portrait"></div><div id="pname"></div>
          <div class="bar" id="hpbar"><i></i><i class="shield"></i><span></span></div>
          <div class="bar" id="resbar"><i></i><span></span></div></div>
        <div id="buffs"></div>
        <div id="info" class="sk"><div id="zone"></div><div id="wallet"></div><div id="tracker"></div></div>
        <div id="bossbar" class="sk" hidden><div id="bossname"></div><div class="bar"><i></i><span></span></div></div>
        <div id="hotwrap"><div class="bar" id="xpbar"><i></i><span></span></div><div id="hotbar" class="sk live"></div></div>
        <div id="hint">ZQSD bouger · Clic attaquer · 1–5 sorts · R potion · E interagir · TAB inventaire · Échap menu</div>
      </div>
      <div id="toasts"></div>
      <div id="panel" class="sk live" hidden><header><div><h2 id="ptitle"></h2><div class="sub" id="psub"></div></div><button class="close" id="pclose">Fermer (Échap)</button></header><div id="pbody"></div></div>
      <div id="screen" class="screen live" hidden></div>
      <div id="tip" class="sk" hidden></div>`;
    $('pclose').onclick = () => UI.closePanel();
    $('pbody').addEventListener('click', onPanelClick);
    $('pbody').addEventListener('contextmenu', onPanelRightClick);
    $('ui').addEventListener('mouseover', (e) => { const t = e.target.closest('[data-tip]'); tipRef = t ? t.dataset.tip : null; showTip(t); });
    $('ui').addEventListener('mouseout', (e) => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('[data-tip]')) { tipRef = null; $('tip').hidden = true; } });
  };

  // ================= Écran titre =================
  UI.showTitle = function () {
    Game.mode = 'title';
    Game.scene = null;
    $('hud').hidden = true; $('panel').hidden = true; panelId = null;
    const data = G.Save.data;
    const sc = $('screen');
    sc.className = 'screen live'; sc.hidden = false;
    const chars = data.chars.map((c, i) => {
      const C = D.CLASSES[c.cls];
      return `<div class="charcard sk"><h3>${esc(c.name)}</h3><div class="muted">${C.name} · niveau ${c.lvl}</div>
        <div class="muted">${c.cleared}/15 donjons · ${c.deaths} mort${c.deaths > 1 ? 's' : ''}</div>
        <div class="row"><button class="main" data-play="${i}">Jouer</button><button class="danger" data-del="${i}">Supprimer</button></div></div>`;
    }).join('');
    sc.innerHTML = `<canvas id="title-canvas" width="1280" height="720"></canvas>
      <div id="title-logo">Chroniques de Valdorne<small>Les Quinze Sceaux</small></div>
      <p style="max-width:640px;text-align:center;font-size:19px;margin:0">Le Roi Cendré a brisé le Sceau des Quinze. Ses lieutenants gardent chacun un fragment au fond d'un donjon. Havre-Gris est le dernier bastion.</p>
      ${chars ? `<div class="chars">${chars}</div>` : '<p class="muted" style="margin:0">Aucun héros pour l\'instant.</p>'}
      <button class="main" id="newchar" ${data.chars.length >= 6 ? 'disabled' : ''}>Créer un nouveau héros</button>
      <p class="muted" style="margin:0;font-size:15px">${G.Save.whereText()}</p>`;
    drawTitleBg($('title-canvas'));
    sc.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'newchar') UI.showCreate();
      else if (b.dataset.play != null) { data.last = +b.dataset.play; sc.hidden = true; Game.start(data.chars[+b.dataset.play]); }
      else if (b.dataset.del != null) {
        const c = data.chars[+b.dataset.del];
        UI.confirm('Supprimer ' + c.name + ' ?', 'Ce héros et tout son équipement seront effacés définitivement.', 'Supprimer', () => { data.chars.splice(+b.dataset.del, 1); G.Save.save(true); UI.showTitle(); }, () => UI.showTitle());
      }
    };
  };

  function drawTitleBg(cv) {
    const g = cv.getContext('2d'), S = G.S;
    g.fillStyle = g.createPattern(S.paperPattern('#efe3c6'), 'repeat'); g.fillRect(0, 0, 1280, 720);
    S.begin(11, true);
    // montagnes et château esquissés
    const pts = [[0, 600], [140, 470], [260, 560], [400, 430], [520, 540], [640, 470], [760, 560], [900, 420], [1040, 540], [1160, 460], [1280, 560], [1280, 720], [0, 720]];
    S.poly(g, pts, { fill: '#d9c9a2', fillA: 0.7, w: 1.6, hatch: { sp: 9, c: '#6b5a46', a: 0.25, w: 0.8 } });
    S.rect(g, 1010, 330, 120, 160, { fill: '#cbbd9a', w: 2 });
    for (let i = 0; i < 4; i++) S.rect(g, 1010 + i * 32, 312, 18, 20, { fill: '#cbbd9a', w: 1.6 });
    S.rect(g, 1150, 280, 50, 210, { fill: '#cbbd9a', w: 2 });
    S.poly(g, [[1145, 282], [1175, 220], [1205, 282]], { fill: '#9b2c20', w: 1.8 });
    S.rect(g, 1060, 440, 26, 50, { fill: '#6b4a2c', w: 1.6 });
    S.poly(g, [[60, 330], [120, 250], [180, 330]], { fill: '#4f6a34', w: 1.6 });
    S.poly(g, [[150, 360], [210, 270], [270, 360]], { fill: '#5d7a3a', w: 1.6 });
    g.globalAlpha = 0.35; S.circle(g, 200, 120, 46, { fill: '#e8a33a', w: 1.5 }); g.globalAlpha = 1;
    for (let i = 0; i < 5; i++) { const x = 380 + i * 60, y = 140 + (i % 2) * 22; S.line(g, x, y, x + 10, y - 6, 1.4); S.line(g, x + 10, y - 6, x + 20, y, 1.4); }
  }

  // ================= Création de personnage =================
  UI.showCreate = function () {
    const sc = $('screen');
    sc.className = 'screen live'; sc.hidden = false;
    let sel = 'guerrier';
    const cards = D.CLASS_ORDER.map((k) => {
      const C = D.CLASSES[k];
      return `<div class="cls sk" data-cls="${k}" tabindex="0"><canvas width="90" height="80" data-prev="${k}"></canvas><h3>${C.name}</h3><div class="role">${C.role}</div><div class="role">Difficulté ${'●'.repeat(C.diff)}${'○'.repeat(3 - C.diff)}</div></div>`;
    }).join('');
    sc.innerHTML = `<h1 style="font-size:56px">Choisissez votre classe</h1>
      <div class="classes">${cards}</div>
      <div id="clsdesc"></div>
      <div class="row"><label for="cname" style="font-size:20px">Nom du héros</label><input type="text" id="cname" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Votre nom">
      <button class="main" id="cgo">Entrer à Havre-Gris</button><button id="cback">Retour</button></div>
      <div class="msg" id="cmsg" style="color:var(--blood)"></div>`;
    sc.querySelectorAll('canvas[data-prev]').forEach((cv) => {
      const g = cv.getContext('2d');
      g.scale(1.6, 1.6);
      G.R.unit(g, { id: 900 + D.CLASS_ORDER.indexOf(cv.dataset.prev), x: 28, y: 44, r: 13, look: cv.dataset.prev, isPlayer: true, facing: 1, aim: -0.4, walk: 0, swingT: 0, stunT: 0, hitT: 0 });
    });
    const upd = () => {
      sc.querySelectorAll('.cls').forEach((c) => c.classList.toggle('sel', c.dataset.cls === sel));
      const C = D.CLASSES[sel];
      $('clsdesc').innerHTML = `<b style="font-family:var(--f-title);font-size:26px">${C.name}</b> — ${esc(C.desc)}<br><span class="muted">Vie ${C.hp} · Ressource : ${D.RES[C.res].name} · Sorts : ${C.abil.map((a) => a.name).join(', ')}</span>`;
    };
    upd();
    sc.onclick = (e) => {
      const c = e.target.closest('.cls');
      if (c) { sel = c.dataset.cls; upd(); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'cback') UI.showTitle();
      if (b.id === 'cgo') {
        const name = $('cname').value.trim();
        if (name.length < 2) { $('cmsg').textContent = 'Le nom doit faire au moins 2 caractères.'; return; }
        const ch = Game.newChar(name, sel);
        G.Save.data.chars.push(ch); G.Save.data.last = G.Save.data.chars.length - 1;
        sc.hidden = true;
        Game.start(ch);
        UI.toast('Bienvenue à Havre-Gris, ' + name + ' ! Parlez au Capitaine Aldric (Garnison).', '#4f6b2b', 6);
      }
    };
    sc.onkeydown = (e) => { const c = e.target.closest && e.target.closest('.cls'); if (c && (e.key === 'Enter' || e.key === ' ')) { sel = c.dataset.cls; upd(); } };
    setTimeout(() => $('cname').focus(), 50);
  };

  // ================= Scène =================
  UI.onScene = function () {
    $('screen').hidden = true;
    UI.closePanel();
    $('hud').hidden = false;
    UI.bossBar(null);
    const sc = Game.scene, ch = Game.char, C = D.CLASSES[ch.cls];
    $('zone').textContent = sc.kind === 'town' ? 'Havre-Gris' : sc.def.name;
    $('portrait').textContent = C.name[0];
    $('portrait').style.background = C.color;
    $('resbar').querySelector('i').style.background = D.RES[C.res].color;
    const slots = [{ k: 'Clic', s: 0 }, { k: '1', s: 1 }, { k: '2', s: 2 }, { k: '3', s: 3 }, { k: '4', s: 4 }, { k: '5', s: 5 }];
    $('hotbar').innerHTML = slots.map((o) => {
      const ab = Game.abilityDef(o.s);
      return `<div class="slot" data-slot="${o.s}" data-tip="ab:${o.s}"><span class="key">${o.k}</span><span class="abbr">${ab.abbr}</span>${ab.cost ? `<span class="cost">${ab.cost}</span>` : ''}<div class="cd"></div><div class="cdt"></div></div>`;
    }).join('') + `<div class="slot" data-slot="p" data-tip="potion" style="color:var(--blood)"><span class="key">R</span><span class="abbr">Po</span><span class="cost" id="potn"></span><div class="cd"></div><div class="cdt"></div></div>`;
    buffSig = null;
    lastTracker = 0;
    $('toasts').innerHTML = '';
  };

  // ================= Mise à jour du HUD (chaque image) =================
  UI.update = function () {
    const p = Game.player, ch = Game.char;
    if (!p || $('hud').hidden) return;
    const hb = $('hpbar');
    hb.children[0].style.width = (100 * Math.max(0, p.hp) / p.maxHp).toFixed(1) + '%';
    hb.children[1].style.width = (100 * Math.min(1, p.shield / p.maxHp)).toFixed(1) + '%';
    hb.children[2].textContent = Math.ceil(Math.max(0, p.hp)) + ' / ' + p.maxHp;
    const rb = $('resbar');
    rb.children[0].style.width = (100 * p.res / p.resMax).toFixed(1) + '%';
    rb.children[1].textContent = Math.floor(p.res) + ' / ' + p.resMax;
    $('pname').innerHTML = `${esc(ch.name)} <small>Niv. ${ch.lvl} ${D.CLASSES[ch.cls].name}</small>`;
    const need = D.xpNext(ch.lvl);
    $('xpbar').children[0].style.width = (ch.lvl >= D.MAX_LEVEL ? 100 : (100 * ch.xp) / need).toFixed(1) + '%';
    $('xpbar').children[1].textContent = ch.lvl >= D.MAX_LEVEL ? 'Niveau maximum' : 'Expérience ' + G.fmt(ch.xp) + ' / ' + G.fmt(need);
    $('wallet').innerHTML = `<span class="gold">${G.fmt(ch.gold)} or</span><span style="color:var(--blood)">${ch.potions}/${D.MAX_POTIONS} potions</span>`;
    // barre d'action
    const slots = $('hotbar').children;
    for (const el of slots) {
      const s = el.dataset.slot;
      let cd = 0, max = 1;
      if (s === 'p') { cd = p.potionCd; max = 12; }
      else {
        cd = p.cds[s] || 0; max = p.cdMax[s] || 1;
        const ab = Game.abilityDef(+s);
        el.classList.toggle('locked', +s > 0 && !ch.abil[s]);
        el.classList.toggle('nores', (ab.cost || 0) > p.res);
      }
      const cdEl = el.querySelector('.cd'), t = el.querySelector('.cdt');
      if (cd > 0) { cdEl.style.setProperty('--p', (100 * cd / max).toFixed(0) + '%'); t.textContent = cd >= 1 ? Math.ceil(cd) : cd.toFixed(1).replace('.', ','); el.classList.add('oncd'); }
      else if (t.textContent) { cdEl.style.setProperty('--p', '0%'); t.textContent = ''; el.classList.remove('oncd'); }
    }
    const pn = $('potn'); if (pn) pn.textContent = ch.potions;
    // améliorations
    const sig = p.buffs.map((b) => b.id + Math.ceil(b.t)).join('|') + (Game.char.boundBoss ? 'B' : '');
    if (sig !== buffSig) {
      buffSig = sig;
      const names = { cri: 'Cri de guerre', mur: 'Mur de bouclier', concentration: 'Concentration', parade: 'Parade', faucon: 'Œil du faucon', esprit: 'Esprit protecteur', divin: 'Bouclier divin', poison: 'Lames empoisonnées', furtif: 'Furtivité', frenesie: 'Frénésie', soif: 'Soif de sang', immortel: 'Rage immortelle', chant: 'Chant de guerre' };
      $('buffs').innerHTML = p.buffs.map((b) => `<span class="buff">${names[b.id] || b.id} ${Math.ceil(b.t)} s</span>`).join('') +
        (Game.char.boundBoss ? `<span class="buff" style="color:var(--heal)">Serviteur lié : ${esc(D.MONSTERS[Game.char.boundBoss].name)}</span>` : '');
    }
    if (Game.time - lastTracker > 0.5 || lastTracker === 0) { lastTracker = Game.time || 0.01; renderTracker(); }
  };

  function renderTracker() {
    const ch = Game.char;
    const act = D.QUESTS.filter((q) => ch.quests[q.id] && ch.quests[q.id].state !== 'rendue');
    if (!act.length) { $('tracker').innerHTML = '<span class="muted">Aucune quête en cours. Le Capitaine Aldric (Garnison) a du travail pour vous.</span>'; return; }
    $('tracker').innerHTML = act.slice(0, 4).map((q) => {
      const st = ch.quests[q.id];
      const done = st.state === 'terminée';
      return `<div><b style="color:${done ? 'var(--heal)' : 'var(--ink)'}">${esc(q.title)}</b><br><span class="muted">${done ? 'Terminée : retournez voir Aldric' : objective(q) + ' ' + Math.min(st.n, q.n) + '/' + q.n}</span></div>`;
    }).join('');
  }
  function objective(q) {
    if (q.type === 'boss') return 'Vaincre ' + D.MONSTERS[q.target].name + ' —';
    return 'Tuer : ' + D.MONSTERS[q.target].name + ' —';
  }

  UI.toast = function (msg, color, dur) {
    const box0 = $('toasts');
    for (const old of box0.children) if (old.textContent === msg && old.style.opacity !== '0') { clearTimeout(old._t); old._t = setTimeout(() => { old.style.opacity = '0'; setTimeout(() => old.remove(), 450); }, (dur || 2.5) * 1000); return; }
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg; el.style.color = color || 'var(--ink)';
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    el._t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, (dur || 2.5) * 1000);
  };

  UI.hurt = function () { const h = $('hurt'); h.style.opacity = '1'; clearTimeout(UI._ht); UI._ht = setTimeout(() => (h.style.opacity = '0'), 120); };

  UI.bossBar = function (b) {
    const bb = $('bossbar');
    if (!b) { bb.hidden = true; return; }
    bb.hidden = false;
    $('bossname').textContent = b.name + (b.def.phases && b.phase > 0 ? ' — phase ' + (b.phase + 1) : '');
    bb.querySelector('i').style.width = (100 * Math.max(0, b.hp) / b.maxHp).toFixed(1) + '%';
    bb.querySelector('span').textContent = G.fmt(Math.max(0, b.hp)) + ' / ' + G.fmt(b.maxHp);
  };

  // ================= Panneaux =================
  UI.panelOpen = () => panelId != null || !$('screen').hidden;
  UI.currentPanel = () => panelId;
  UI.openPanel = function (id) {
    if (Game.mode !== 'play') return;
    panelId = id; forgeSel = null;
    $('panel').hidden = false;
    if (id === 'menu') Game.paused = true;
    UI.refreshPanel();
  };
  UI.closePanel = function () {
    panelId = null; $('panel').hidden = true; $('tip').hidden = true; Game.paused = false;
  };
  UI.refreshPanel = function () {
    if (!panelId) return;
    const f = PANELS[panelId];
    if (!f) return;
    const out = f();
    $('ptitle').textContent = out.title;
    $('psub').textContent = out.sub || '';
    const scroll = $('pbody').scrollTop;
    $('pbody').innerHTML = out.body;
    $('pbody').scrollTop = scroll;
    if (tipRef) showTip(document.querySelector(`[data-tip="${tipRef}"]`));
  };

  function itemCell(it, ref, label) {
    if (!it) return `<div class="cell empty">${label || ''}</div>`;
    const col = D.RARITY[it.rarity].color;
    const short = it.rarity === 4 ? '★' : it.base.split(' ')[0].slice(0, 8);
    return `<div class="cell" data-ref="${ref}" data-tip="it:${ref}" style="border-color:${col};background:${col}22"><span class="nm" style="color:${col}">${esc(short)}</span><span>${D.SLOT_NAMES[it.slot]}</span>${it.up ? `<span class="up">+${it.up}</span>` : ''}${it.run ? '<span class="run" title="Butin de ce donjon">●</span>' : ''}</div>`;
  }
  function bagGrid() {
    const ch = Game.char;
    let h = '<div class="grid">';
    for (let i = 0; i < D.BAG_SIZE; i++) h += itemCell(ch.bag[i], 'b:' + i);
    return h + '</div>';
  }
  function equipGrid() {
    const ch = Game.char;
    return '<div class="eq">' + D.SLOTS.map((s) => `<div>${itemCell(ch.equip[s], 'e:' + s, D.SLOT_NAMES[s])}<div class="lbl">${D.SLOT_NAMES[s]}</div></div>`).join('') + '</div>';
  }
  function statList() {
    const p = Game.player, ch = Game.char, st = p.st;
    const red = I.armorReduc(st.arm, ch.lvl);
    const pct = (v) => (v * 100).toFixed(1).replace('.', ',') + ' %';
    return `<div class="stats"><span>Vie maximum</span><span>${G.fmt(st.maxHp)}</span><span>Puissance</span><span>${G.fmt(st.pow)}</span>
      <span>Armure</span><span>${G.fmt(st.arm)} (−${pct(red)} dégâts)</span><span>Critique</span><span>${pct(st.crit)}</span>
      <span>Hâte</span><span>${pct(st.haste)}</span><span>${D.RES[D.CLASSES[ch.cls].res].name}</span><span>${st.resMax}</span>
      <span>Donjons vaincus</span><span>${ch.cleared} / 15</span><span>Morts</span><span>${ch.deaths}</span></div>`;
  }
  function itemByRef(ref) {
    const ch = Game.char;
    if (ref.startsWith('b:')) return ch.bag[+ref.slice(2)];
    if (ref.startsWith('e:')) return ch.equip[ref.slice(2)];
    if (ref.startsWith('s:')) return ch.shop.items[+ref.slice(2)];
  }

  const PANELS = {
    inventory() {
      const ch = Game.char;
      return {
        title: 'Inventaire', sub: `${ch.name} — ${D.CLASSES[ch.cls].name} niveau ${ch.lvl}`,
        body: `<div class="cols"><div><div class="sectitle">Équipement</div>${equipGrid()}${statList()}</div>
          <div><div class="sectitle">Sac (${ch.bag.length}/${D.BAG_SIZE})</div>${bagGrid()}
          <p class="muted" style="font-size:15px">Clic sur un objet du sac : l'équiper. Clic sur une pièce équipée : la retirer. Clic droit deux fois : jeter.<br>
          <span style="color:var(--blood)">●</span> = butin de ce donjon : il sera perdu si vous mourez avant d'en sortir.</p><div class="msg" id="imsg"></div></div></div>`,
      };
    },
    forge() {
      const ch = Game.char;
      let detail = '<p class="muted">Choisissez un objet à améliorer.</p>';
      const it = forgeSel && itemByRef(forgeSel);
      if (it) {
        const now = I.stats(it), next = I.stats(Object.assign({}, it, { up: (it.up || 0) + 1 }));
        const cost = I.forgeCost(it), chance = I.forgeChance(it);
        const lines = Object.keys(now).map((k) => `<div class="ln"><span>${D.STAT_NAMES[k]}</span><span>${I.fmtStat(k, now[k])} → <b class="up">${I.fmtStat(k, next[k])}</b></span></div>`).join('');
        detail = (it.up || 0) >= 10 ? `<h3 style="color:${D.RARITY[it.rarity].color}">${esc(I.fullName(it))}</h3><p>Cet objet est au maximum (+10).</p>` :
          `<h3 style="color:${D.RARITY[it.rarity].color};font-size:28px">${esc(I.fullName(it))}</h3><div class="tiplines">${lines}</div>
          <div class="stats"><span>Amélioration</span><span>+${it.up || 0} → +${(it.up || 0) + 1}</span><span>Coût</span><span class="gold">${G.fmt(cost)} or</span><span>Chance de réussite</span><span>${Math.round(chance * 100)} %</span></div>
          <p class="muted" style="font-size:15px">${(it.up || 0) >= 5 ? '<b style="color:var(--blood)">Attention :</b> en cas d\'échec, l\'objet perd un niveau d\'amélioration.' : 'En cas d\'échec, seul l\'or est perdu.'}</p>
          <button class="main" data-forge="1" ${ch.gold < cost ? 'disabled' : ''}>Forger (${G.fmt(cost)} or)</button>`;
      }
      return {
        title: 'Forge de Borin', sub: `Vous avez ${G.fmt(ch.gold)} or`,
        body: `<div class="say"><b>Borin :</b> « Chaque coup de marteau rend ton acier plus fort de 10 %. Jusqu'à +3, c'est sans risque. Après… le métal décide. »</div>
          <div class="cols"><div><div class="sectitle">Équipé</div>${equipGrid()}<div class="sectitle" style="margin-top:12px">Sac</div>${bagGrid()}</div><div>${detail}<div class="msg" id="fmsg"></div></div></div>`,
      };
    },
    shop() {
      const ch = Game.char, pp = D.POTION_PRICE(ch.lvl);
      const stock = ch.shop.items.map((it, i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">${itemCell(it, 's:' + i)}<span class="gold" style="font-size:14px">${G.fmt(Game.shopPrice(it))} or</span></div>`).join('') || '<p class="muted">Plus rien en stock. Revenez après votre prochain donjon.</p>';
      return {
        title: 'Boutique d\'Ysolde', sub: `Vous avez ${G.fmt(ch.gold)} or`,
        body: `<div class="say"><b>Ysolde :</b> « Potions fraîches, équipement d'occasion… Je rachète tout ce que tu rapportes des donjons. Mon stock change à chaque retour de donjon. »</div>
          <div class="cols"><div><div class="sectitle">À vendre</div><div class="grid" style="grid-template-columns:repeat(4,64px);row-gap:12px">${stock}</div>
          <div class="sectitle" style="margin-top:14px">Potions de soin</div><p style="margin:0 0 8px">Rend 35 % de votre vie (touche R). Vous en avez ${ch.potions} / ${D.MAX_POTIONS}.</p>
          <button class="main" data-potion="1" ${ch.potions >= D.MAX_POTIONS || ch.gold < pp ? 'disabled' : ''}>Acheter une potion (${pp} or)</button></div>
          <div><div class="sectitle">Votre sac — clic pour vendre</div>${bagGrid()}<div class="row" style="margin-top:10px"><button data-sellgrey="1">Vendre tous les objets communs (gris)</button></div><div class="msg" id="smsg"></div></div></div>`,
      };
    },
    skills() {
      const ch = Game.char, C = D.CLASSES[ch.cls];
      const ab = C.abil.map((a, i) => {
        const slot = i + 1, rank = ch.abil[slot] || 0;
        let act;
        if (rank >= 3) act = '<span class="pill" style="color:var(--heal)">Maîtrisé</span>';
        else {
          const req = rank === 0 ? D.UNLOCK[slot] : D.RANK_COST(slot, rank + 1);
          const ok = ch.lvl >= req.lvl && ch.gold >= req.gold;
          act = `<button class="${ok ? 'main' : ''}" data-learn="${slot}" ${ok ? '' : 'disabled'}>${rank === 0 ? 'Apprendre' : 'Rang ' + (rank + 1)}</button><span>niv. ${req.lvl} · <span class="gold">${G.fmt(req.gold)} or</span></span>`;
        }
        return `<div class="card ${rank ? '' : 'off'}"><h3>${slot}. ${a.name} <span class="pill">${rank ? 'Rang ' + rank + '/3' : 'Inconnu'}</span></h3><div class="act">${act}</div>
          <p>${esc(a.desc)} ${a.cost ? '· Coût ' + a.cost + ' ' + D.RES[C.res].name.toLowerCase() : ''} · Recharge ${String(a.cd).replace('.', ',')} s${rank && rank < 3 ? ' · Chaque rang : +25 % d\'efficacité' : ''}</p></div>`;
      }).join('');
      const tal = D.TALENTS.filter((t) => !t.cls || t.cls === ch.cls).map((t) => {
        const r = ch.talents[t.id] || 0;
        let act;
        if (r >= t.max) act = '<span class="pill" style="color:var(--heal)">Maximum</span>';
        else { const c = D.TALENT_COST(r + 1); const ok = ch.lvl >= c.lvl && ch.gold >= c.gold; act = `<button class="${ok ? 'main' : ''}" data-tal="${t.id}" ${ok ? '' : 'disabled'}>Rang ${r + 1}</button><span>niv. ${c.lvl} · <span class="gold">${G.fmt(c.gold)} or</span></span>`; }
        return `<div class="card"><h3>${t.name} <span class="pill">${r}/${t.max}</span></h3><div class="act">${act}</div><p>${esc(t.desc)}</p></div>`;
      }).join('');
      return {
        title: 'Académie — Maître Ilian', sub: `Vous avez ${G.fmt(ch.gold)} or · niveau ${ch.lvl}`,
        body: `<div class="say"><b>Maître Ilian :</b> « La force ne suffit pas. Apprends de nouvelles techniques, puis perfectionne-les. Chaque leçon a un prix. »</div>
          <div class="msg" id="kmsg" style="color:var(--blood)"></div>
          <div class="cols" style="grid-template-columns:1.25fr 1fr"><div><div class="sectitle">Sorts de ${C.name}</div><div class="list">${ab}</div></div><div><div class="sectitle">Talents</div><div class="list">${tal}</div></div></div>`,
      };
    },
    quests() {
      const ch = Game.char;
      const avail = D.QUESTS.filter((q) => Game.questAvailable(q));
      const act = D.QUESTS.filter((q) => ch.quests[q.id] && ch.quests[q.id].state === 'active');
      const done = D.QUESTS.filter((q) => ch.quests[q.id] && ch.quests[q.id].state === 'terminée');
      const card = (q, btn) => `<div class="card"><h3>${esc(q.title)} ${q.main ? '<span class="pill" style="color:var(--violet)">Histoire</span>' : ''}</h3><div class="act">${btn}<span>${q.reward.gold} or · ${q.reward.xp} XP</span></div>
        <p>${esc(q.text)}<br><b>Objectif :</b> ${objective(q).replace(' —', '')} (${q.n}) · Donjon : ${D.DUNGEONS[q.dungeon - 1].name}</p></div>`;
      let body = '<div class="say"><b>Capitaine Aldric :</b> « Valdorne tombe, morceau par morceau. Quinze fragments du Sceau, quinze monstres pour les garder. Je n\'ai plus de soldats… je n\'ai que vous. »</div>';
      if (done.length) body += '<div class="sectitle">Terminées</div><div class="list">' + done.map((q) => card(q, `<button class="main" data-turn="${q.id}">Rendre la quête</button>`)).join('') + '</div>';
      if (avail.length) body += '<div class="sectitle" style="margin-top:10px">Disponibles</div><div class="list">' + avail.map((q) => card(q, `<button class="main" data-accept="${q.id}">Accepter</button>`)).join('') + '</div>';
      if (act.length) body += '<div class="sectitle" style="margin-top:10px">En cours</div><div class="list">' + act.map((q) => card(q, `<span class="pill">${ch.quests[q.id].n}/${q.n}</span>`)).join('') + '</div>';
      if (!avail.length && !act.length && !done.length) body += '<p class="muted">Plus de quêtes pour le moment. La suite de l\'histoire arrive avec les prochains donjons.</p>';
      return { title: 'Garnison — Capitaine Aldric', sub: 'Quêtes', body };
    },
    portal() {
      const ch = Game.char;
      const cards = D.DUNGEONS.map((d) => {
        const unlocked = Game.dungeonUnlocked(d.id), done = ch.cleared >= d.id;
        const boss = d.boss ? D.MONSTERS[d.boss].name : d.bossName;
        let status, cls = 'dcard';
        if (!d.playable) { status = '<span class="muted">En construction</span>'; cls += ' lock'; }
        else if (!unlocked) { status = '<span style="color:var(--blood)">Verrouillé : vaincre le donjon ' + (d.id - 1) + '</span>'; cls += ' lock'; }
        else { status = done ? '<span style="color:var(--heal)">Vaincu — rejouable</span>' : '<span style="color:var(--violet)">Disponible</span>'; cls += ' ok'; }
        return `<div class="${cls}" ${d.playable && unlocked ? `data-dun="${d.id}" tabindex="0" role="button"` : ''}><h3>${d.id}. ${d.name}</h3><span>Niveau conseillé ${d.lvl}+ · Boss : ${esc(boss)}</span>${status}</div>`;
      }).join('');
      return { title: 'Portail des Donjons', sub: 'Choisissez votre destination', body: `<p style="margin:0 0 10px">Les donjons ont toujours le même plan. À la mort : retour en ville, perte de 25 % de l'or, de tout le butin du donjon et d'un objet équipé au hasard.</p><div class="dgrid">${cards}</div>` };
    },
    guild() {
      return {
        title: 'Taverne des Guildes', sub: 'Tavernière Maëlle',
        body: `<div class="say"><b>Maëlle :</b> « Les guildes ? Bientôt, mon brave ! Quand les autres héros de Valdorne pourront rejoindre Havre-Gris, c'est ici qu'on fondera les confréries. »</div>
          <p>Les guildes et le jeu à plusieurs (groupes de 4 en donjon) arrivent avec la version multijoueur sur serveur en ligne. Ce qui est prévu :</p>
          <ul style="font-size:18px;line-height:1.5"><li>Créer une guilde, choisir son nom et son blason, inviter des membres</li><li>Rangs : chef, officier, membre</li><li>Discussion de guilde et liste des membres connectés</li><li>Groupes de 4 joueurs dans les donjons, avec monstres plus résistants</li><li>Classement des guildes (donjons vaincus, temps record)</li></ul>`,
      };
    },
    menu() {
      const inD = Game.scene.kind === 'dungeon';
      return {
        title: 'Pause', sub: inD ? 'Le jeu est en pause' : 'Havre-Gris',
        body: `<div class="cols" style="grid-template-columns:300px 1fr"><div class="list"><button class="main" data-menu="resume">Reprendre</button><button data-menu="title">${inD ? 'Abandonner et revenir au titre' : 'Revenir à l\'écran titre'}</button>
          ${inD ? '<p class="muted" style="font-size:15px;margin:0">Abandonner : le butin trouvé dans ce donjon est perdu (sans les autres pénalités de mort).</p>' : '<p class="muted" style="font-size:15px;margin:0">La partie est sauvegardée automatiquement en ville.</p>'}</div>
          <div><div class="sectitle">Commandes</div><div class="stats" style="grid-template-columns:auto 1fr"><span>Z Q S D / flèches</span><span>Se déplacer</span><span>Clic gauche (maintenu)</span><span>Attaque de base vers le curseur</span><span>1 à 5</span><span>Sorts (visés au curseur)</span><span>R</span><span>Boire une potion</span><span>E</span><span>Parler, ouvrir, utiliser</span><span>TAB</span><span>Inventaire</span><span>Échap</span><span>Fermer / menu</span></div>
          <p class="muted" style="font-size:15px">Les zones hachurées rouges annoncent une attaque : sortez-en avant qu'elles soient pleines.</p></div></div>`,
      };
    },
  };

  function msg(id, text, color) { const el = $(id); if (el) { el.textContent = text || ''; el.style.color = color || 'var(--ink)'; } }

  function onPanelClick(e) {
    const ch = Game.char;
    const b = e.target.closest('button');
    const cell = e.target.closest('.cell[data-ref]');
    const dun = e.target.closest('[data-dun]');
    if (dun) { const d = D.DUNGEONS[+dun.dataset.dun - 1]; UI.closePanel(); Game.enterDungeon(d); return; }
    if (panelId === 'inventory' && cell) {
      const ref = cell.dataset.ref;
      if (ref.startsWith('b:')) Game.equip(+ref.slice(2)); else Game.unequip(ref.slice(2));
      UI.refreshPanel(); return;
    }
    if (panelId === 'shop' && cell) {
      const ref = cell.dataset.ref;
      if (ref.startsWith('b:')) { const it = ch.bag[+ref.slice(2)]; const v = Game.sellItem(+ref.slice(2)); UI.refreshPanel(); msg('smsg', 'Vendu : ' + it.name + ' (+' + v + ' or)', 'var(--gold)'); }
      else if (ref.startsWith('s:')) { const it = itemByRef(ref); if (Game.buyItem(+ref.slice(2))) { UI.refreshPanel(); msg('smsg', 'Acheté : ' + it.name, 'var(--heal)'); } }
      return;
    }
    if (panelId === 'forge' && cell) { forgeSel = cell.dataset.ref; UI.refreshPanel(); document.querySelectorAll(`.cell[data-ref="${forgeSel}"]`).forEach((c) => c.classList.add('sel')); return; }
    if (!b) return;
    if (b.dataset.forge) {
      const r = Game.forge(forgeSel);
      UI.refreshPanel();
      document.querySelectorAll(`.cell[data-ref="${forgeSel}"]`).forEach((c) => c.classList.add('sel'));
      if (r && r.msg) msg('fmsg', r.msg, 'var(--blood)');
      else if (r) msg('fmsg', r.ok ? 'Réussite ! L\'objet passe à +' + r.it.up + '.' : r.lost ? 'Échec… l\'objet redescend à +' + r.it.up + '.' : 'Échec… l\'or est perdu.', r.ok ? 'var(--heal)' : 'var(--blood)');
    }
    if (b.dataset.potion) { if (Game.buyPotion()) { UI.refreshPanel(); msg('smsg', 'Potion achetée.', 'var(--heal)'); } }
    if (b.dataset.sellgrey) {
      let n = 0, g = 0;
      for (let i = ch.bag.length - 1; i >= 0; i--) if (ch.bag[i].rarity === 0) { g += Game.sellItem(i); n++; }
      UI.refreshPanel(); msg('smsg', n ? n + ' objet(s) vendu(s) pour ' + g + ' or.' : 'Aucun objet commun dans le sac.', 'var(--gold)');
    }
    if (b.dataset.learn) { const err = Game.learn(+b.dataset.learn); UI.refreshPanel(); if (err) msg('kmsg', err, 'var(--blood)'); else { msg('kmsg', 'Leçon apprise !', 'var(--heal)'); UI.onScene(); UI.openPanel('skills'); msg('kmsg', 'Leçon apprise !', 'var(--heal)'); } }
    if (b.dataset.tal) { const err = Game.learnTalent(b.dataset.tal); UI.refreshPanel(); msg('kmsg', err || 'Talent amélioré !', err ? 'var(--blood)' : 'var(--heal)'); }
    if (b.dataset.accept) { Game.acceptQuest(b.dataset.accept); UI.refreshPanel(); lastTracker = 0; }
    if (b.dataset.turn) { const q = D.QUESTS.find((x) => x.id === b.dataset.turn); Game.turnIn(b.dataset.turn); UI.refreshPanel(); UI.toast('Récompense : ' + q.reward.gold + ' or et ' + q.reward.xp + ' XP', '#b8862b', 3); lastTracker = 0; }
    if (b.dataset.menu === 'resume') UI.closePanel();
    if (b.dataset.menu === 'title') {
      if (Game.scene.kind === 'dungeon') {
        ch.bag = ch.bag.filter((it) => !it.run);
        D.SLOTS.forEach((s) => { if (ch.equip[s] && ch.equip[s].run) ch.equip[s] = null; });
        if (Game.scene.usedBound) ch.boundBoss = null;
      }
      Game.paused = false; panelId = null;
      G.Save.save(true, true);
      UI.showTitle();
    }
  }

  function onPanelRightClick(e) {
    const cell = e.target.closest('.cell[data-ref]');
    if (!cell) return;
    e.preventDefault();
    if (panelId !== 'inventory' || !cell.dataset.ref.startsWith('b:')) return;
    const ref = cell.dataset.ref, it = itemByRef(ref);
    if (pendingDestroy && pendingDestroy.ref === ref && pendingDestroy.id === it.id && performance.now() - pendingDestroy.t < 2500) {
      Game.destroyItem(+ref.slice(2)); pendingDestroy = null; UI.refreshPanel(); msg('imsg', 'Objet jeté : ' + it.name, 'var(--blood)');
    } else { pendingDestroy = { ref, id: it.id, t: performance.now() }; msg('imsg', 'Clic droit encore une fois pour jeter « ' + it.name + ' ».', 'var(--blood)'); }
  }

  // ================= Infobulles =================
  function showTip(el) {
    const tip = $('tip');
    if (!el) { tip.hidden = true; return; }
    const ref = el.dataset.tip;
    let h = '';
    if (ref.startsWith('it:')) h = itemTip(ref.slice(3));
    else if (ref.startsWith('ab:')) h = abilTip(+ref.slice(3));
    else if (ref === 'potion') h = `<h4 style="color:var(--blood)">Potion de soin</h4>Rend 35 % de votre vie. Recharge : 12 s.<br>Vous en avez ${Game.char.potions} / ${D.MAX_POTIONS}. En vente chez Ysolde.`;
    if (!h) { tip.hidden = true; return; }
    tip.innerHTML = h; tip.hidden = false;
    const r = el.getBoundingClientRect(), sr = $('stage').getBoundingClientRect(), sc = sr.width / 1280;
    let x = (r.right - sr.left) / sc + 10, y = (r.top - sr.top) / sc;
    const tw = 270, th = tip.offsetHeight;
    if (x + tw > 1270) x = (r.left - sr.left) / sc - tw - 10;
    if (y + th > 710) y = 710 - th;
    tip.style.left = Math.max(6, x) + 'px'; tip.style.top = Math.max(6, y) + 'px';
  }

  function itemTip(ref) {
    const it = itemByRef(ref);
    if (!it) return '';
    const R = D.RARITY[it.rarity], st = I.stats(it);
    const eq = !ref.startsWith('e:') ? Game.char.equip[it.slot] : null;
    const est = eq ? I.stats(eq) : {};
    const keys = Array.from(new Set(Object.keys(st).concat(Object.keys(est))));
    const lines = keys.map((k) => {
      const v = st[k] || 0, diff = v - (est[k] || 0);
      const dtxt = eq && Math.abs(diff) > 1e-4 ? ` <span class="${diff > 0 ? 'up' : 'down'}">(${diff > 0 ? '+' : '−'}${k === 'crit' || k === 'haste' ? (Math.abs(diff) * 100).toFixed(1).replace('.', ',') + ' %' : Math.round(Math.abs(diff))})</span>` : '';
      return v ? `<div class="ln"><span>${D.STAT_NAMES[k]}</span><span>${I.fmtStat(k, v)}${dtxt}</span></div>` : `<div class="ln"><span>${D.STAT_NAMES[k]}</span><span class="down">—${dtxt}</span></div>`;
    }).join('');
    let hint = '';
    if (panelId === 'inventory') hint = ref.startsWith('b:') ? 'Clic : équiper · Clic droit ×2 : jeter' : 'Clic : retirer';
    else if (panelId === 'shop') hint = ref.startsWith('s:') ? `Clic : acheter (${G.fmt(Game.shopPrice(it))} or)` : `Clic : vendre (${it.value} or)`;
    else if (panelId === 'forge') hint = 'Clic : choisir pour la forge';
    return `<h4 style="color:${R.color}">${esc(I.fullName(it))}</h4><div class="muted">${R.name} · ${D.SLOT_NAMES[it.slot]} · niv. ${it.ilvl}</div><hr>${lines}
      ${eq ? `<div class="muted" style="font-size:13px">Comparé à : ${esc(I.fullName(eq))}</div>` : ''}<hr><div class="ln"><span>Valeur</span><span class="gold">${it.value} or</span></div>
      ${it.run ? '<div style="color:var(--blood)">Butin de ce donjon : perdu si vous mourez avant d\'en sortir.</div>' : ''}${hint ? `<div class="muted">${hint}</div>` : ''}`;
  }

  function abilTip(slot) {
    const ch = Game.char, C = D.CLASSES[ch.cls], ab = Game.abilityDef(slot);
    const rank = slot === 0 ? 1 : ch.abil[slot] || 0;
    let req = '';
    if (slot > 0 && !rank) { const u = D.UNLOCK[slot]; req = `<div style="color:var(--blood)">À apprendre à l'Académie (niveau ${u.lvl}, ${u.gold} or)</div>`; }
    return `<h4>${ab.name}</h4><div class="muted">${slot === 0 ? 'Attaque de base · clic gauche' : 'Touche ' + slot + (rank ? ' · rang ' + rank + '/3' : '')}</div><hr>
      ${ab.desc ? esc(ab.desc) : 'Votre attaque principale, dirigée vers le curseur.'}<hr>
      <div class="ln"><span>Coût</span><span>${ab.cost ? ab.cost + ' ' + D.RES[C.res].name.toLowerCase() : 'aucun'}</span></div><div class="ln"><span>Recharge</span><span>${String(ab.cd).replace('.', ',')} s</span></div>${req}`;
  }

  // ================= Écrans spéciaux =================
  UI.confirm = function (title, text, okLabel, onOk, onCancel) {
    const sc = $('screen');
    const prevPaused = Game.paused;
    Game.paused = true;
    sc.className = 'screen dim live'; sc.hidden = false;
    sc.innerHTML = `<div class="box sk"><h2 style="font-size:44px">${esc(title)}</h2><p style="font-size:19px;margin:0">${esc(text)}</p><div class="row"><button class="main" id="cok">${esc(okLabel)}</button><button id="cno">Annuler</button></div></div>`;
    sc.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      sc.hidden = true; Game.paused = prevPaused && panelId === 'menu';
      if (b.id === 'cok') onOk && onOk(); else onCancel && onCancel();
    };
  };
  UI.closeConfirm = function () { const sc = $('screen'); if (!sc.hidden && sc.classList.contains('dim') && sc.querySelector('#cno')) { sc.querySelector('#cno').click(); return true; } return false; };

  UI.showDeath = function (lost) {
    UI.closePanel();
    const sc = $('screen');
    sc.className = 'screen dim live'; sc.hidden = false;
    const items = lost.items.map((it) => `<li style="color:${D.RARITY[it.rarity].color}">${esc(I.fullName(it))}</li>`).join('');
    sc.innerHTML = `<div class="box sk"><h2 style="color:var(--blood)">Vous êtes mort</h2><p style="margin:0;font-size:19px">${esc(lost.dungeon)} a eu raison de vous. Les gardes vous ont ramené à Havre-Gris.</p>
      <ul class="lost"><li><b>Or perdu :</b> <span class="gold">${G.fmt(lost.gold)} or</span> (25 %)</li>
      <li><b>Objet équipé détruit :</b> ${lost.destroyed ? `<span style="color:${D.RARITY[lost.destroyed.rarity].color}">${esc(I.fullName(lost.destroyed))}</span>` : 'aucun (vous n\'aviez rien sur vous)'}</li>
      <li><b>Butin du donjon perdu :</b> ${lost.items.length ? lost.items.length + ' objet(s)' : 'aucun'}</li>${items}</ul>
      <button class="main" id="dgo">Retourner à Havre-Gris</button></div>`;
    sc.onclick = (e) => { if (e.target.id === 'dgo') { sc.hidden = true; Game.enterTown(); } };
  };

  UI.showSummary = function (s) {
    const sc = $('screen');
    sc.className = 'screen dim live'; sc.hidden = false;
    const m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
    sc.innerHTML = `<div class="box sk"><h2 style="color:${s.victory ? 'var(--violet)' : 'var(--ink)'}">${s.victory ? 'Victoire !' : 'De retour en ville'}</h2><p style="margin:0;font-size:19px">${esc(s.name)}${s.victory ? ' est purgé. Le fragment du Sceau est en sécurité.' : ' : vous êtes sorti vivant. Le donjon est réinitialisé.'}</p>
      <div class="stats" style="min-width:320px"><span>Monstres vaincus</span><span>${s.kills}</span><span>Or ramassé</span><span class="gold">${G.fmt(s.gold)}</span><span>Expérience</span><span>${G.fmt(s.xp)}</span><span>Objets trouvés</span><span>${s.items}</span><span>Durée</span><span>${m} min ${String(sec).padStart(2, '0')} s</span></div>
      <p class="muted" style="margin:0">Le butin est en sécurité. La boutique d'Ysolde a reçu un nouveau stock.</p><button class="main" id="sgo">Continuer</button></div>`;
    sc.onclick = (e) => { if (e.target.id === 'sgo') sc.hidden = true; };
  };
})();
