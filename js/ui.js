// Interface : HUD, inventaire, forge, boutique, compétences, quêtes, portail, menu pause, mort.
// L'écran titre, la création de héros, les touches et les options sont dans menu.js.
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
        <div id="tutobox" class="sk live" hidden><div class="tuto-head" id="tutohead"></div><div id="tutosay"></div><div id="tutotext"></div><div class="tuto-foot"><span id="tutoprog"></span><button id="tutoskip">Passer le tutoriel</button></div></div>
        <div id="info" class="sk"><div id="zone"></div><div id="wallet"></div><div id="tracker"></div></div>
        <div id="bossbar" class="sk" hidden><div id="bossname"></div><div class="bar"><i></i><span></span></div></div>
        <div id="hotwrap"><div class="bar" id="xpbar"><i></i><span></span></div><div id="hotbar" class="sk live"></div></div>
        <div id="hint"></div>
      </div>
      <div id="toasts"></div>
      <div id="panel" class="sk live" hidden><header><div><h2 id="ptitle"></h2><div class="sub" id="psub"></div></div><button class="close" id="pclose">Fermer (Échap)</button></header><div id="pbody"></div></div>
      <div id="screen" class="screen live" hidden></div>
      <div id="tip" class="sk" hidden></div>`;
    $('pclose').onclick = () => UI.closePanel();
    $('tutoskip').onclick = () => G.Tuto && G.Tuto.skip();
    $('pbody').addEventListener('click', onPanelClick);
    $('pbody').addEventListener('contextmenu', onPanelRightClick);
    $('pbody').addEventListener('change', (e) => { if (panelId === 'options') UI.optionsChange(e); if (UI.panelChange[panelId]) UI.panelChange[panelId](e); });
    $('ui').addEventListener('mouseover', (e) => { const t = e.target.closest('[data-tip]'); tipRef = t ? t.dataset.tip : null; showTip(t); });
    $('ui').addEventListener('mouseout', (e) => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('[data-tip]')) { tipRef = null; $('tip').hidden = true; } });
  };

  // ================= Scène =================
  UI.onScene = function () {
    $('screen').hidden = true;
    UI.closePanel();
    $('hud').hidden = false;
    UI.bossBar(null);
    const sc = Game.scene, ch = Game.char, C = D.CLASSES[ch.cls];
    $('zone').textContent = sc.kind === 'town' ? 'Havre-Gris' : sc.kind === 'tuto' ? 'Camp des recrues' : sc.def.name;
    if (sc.kind !== 'tuto') $('tutobox').hidden = true;
    $('portrait').textContent = C.name[0];
    $('portrait').style.background = C.color;
    $('resbar').querySelector('i').style.background = D.RES[C.res].color;
    $('hotbar').innerHTML = [0, 1, 2, 3, 4, 5].map((s) => {
      const ab = Game.abilityDef(s);
      return `<div class="slot" data-slot="${s}" data-tip="ab:${s}"><span class="key">${esc(slotKey(s))}</span><span class="abbr">${ab.abbr}</span>${ab.cost ? `<span class="cost">${ab.cost}</span>` : ''}<div class="cd"></div><div class="cdt"></div></div>`;
    }).join('') + `<div class="slot" data-slot="p" data-tip="potion" style="color:var(--blood)"><span class="key">${esc(slotKey('p'))}</span><span class="abbr">Po</span><span class="cost" id="potn"></span><div class="cd"></div><div class="cdt"></div></div>` +
      (ch.cls === 'necromancien' ? `<div class="slot soulslot" data-slot="soul" data-tip="soul"><span class="key">${esc(G.Input.shortLabel('summon'))}</span><span class="abbr">Âm</span><div class="cd"></div><div class="cdt"></div></div>` : '');
    $('hotbar').onclick = (e) => { if (e.target.closest('[data-slot="soul"]') && G.Souls) G.Souls.toggle(); };
    setHint();
    buffSig = null;
    lastTracker = 0;
    $('toasts').innerHTML = '';
  };

  // ================= Noms des touches dans l'interface =================
  const slotKey = (s) => G.Input.shortLabel(s === 'p' ? 'potion' : s === 'soul' ? 'summon' : +s === 0 ? 'attack' : 's' + s);
  function spellKeys(sep) {
    const ks = [1, 2, 3, 4, 5].map((n) => G.Input.shortLabel('s' + n));
    return ks.join('') === '12345' ? (sep ? '1 à 5' : '1–5') : ks.join(sep || ' ');
  }
  function setHint() {
    const h = $('hint'), In = G.Input;
    const online = G.Net && G.Net.online ? ` · ${In.shortLabel('chat')} discuter · ${In.shortLabel('social')} joueurs` : '';
    if (h) h.textContent = `${In.moveLabel()} bouger · ${In.shortLabel('attack')} attaquer · ${spellKeys()} sorts · ${In.shortLabel('potion')} potion · ${In.shortLabel('interact')} interagir · ${In.shortLabel('inventory')} inventaire${online} · ${In.shortLabel('menu')} menu`;
  }
  // Après un changement de touche : barre d'action, aide, panneau ouvert, tutoriel
  UI.refreshLabels = function () {
    if (!$('hint')) return;
    setHint();
    document.querySelectorAll('#hotbar .slot').forEach((el) => { const k = el.querySelector('.key'); if (k) k.textContent = slotKey(el.dataset.slot); });
    if (panelId && panelId !== 'keys') UI.refreshPanel();
    if (G.Tuto && G.Tuto.active() && Game.scene && Game.scene.kind === 'tuto') G.Tuto.refresh();
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
    rb.children[1].textContent = p.manaLock ? 'Mana bloqué : âme invoquée' : Math.floor(p.res) + ' / ' + p.resMax;
    rb.classList.toggle('locked', !!p.manaLock);
    $('pname').innerHTML = `<span>${esc(ch.name)}${ch.hardcore ? '<span class="hc">HC</span>' : ''}${ch.legend ? '<span class="legend">★</span>' : ''}${ch.creator ? '<span class="creator" title="Mode créateur">✎</span>' : ''}</span><small>Niv. ${ch.lvl} ${D.CLASSES[ch.cls].name}</small>`;
    const need = D.xpNext(ch.lvl);
    $('xpbar').children[0].style.width = (ch.lvl >= D.MAX_LEVEL ? 100 : (100 * ch.xp) / need).toFixed(1) + '%';
    $('xpbar').children[1].textContent = ch.lvl >= D.MAX_LEVEL ? 'Niveau maximum' : 'Expérience ' + G.fmt(ch.xp) + ' / ' + G.fmt(need);
    $('wallet').innerHTML = `<span class="gold">${G.fmt(ch.gold)} or</span><span style="color:var(--blood)">${ch.potions}/${D.MAX_POTIONS} potions</span>`;
    // barre d'action
    const slots = $('hotbar').children;
    for (const el of slots) {
      const s = el.dataset.slot;
      if (s === 'soul') { // grimoire des âmes : disponible, invoquée, ou déjà utilisée dans ce donjon
        const st = G.Souls ? G.Souls.state() : { any: false };
        el.classList.toggle('locked', !st.any);
        el.classList.toggle('active', !!st.out);
        el.classList.toggle('nores', st.any && !st.out && !st.can);
        continue;
      }
      let cd = 0, max = 1;
      if (s === 'p') { cd = p.potionCd; max = D.POTION_CD; }
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
    const soul = Game.soulOut && Game.soulOut();
    const sig = p.buffs.map((b) => b.id + Math.ceil(b.t)).join('|') + (Game.char.boundBoss ? 'B' : '') + (soul ? 'S' + soul.type : '');
    if (sig !== buffSig) {
      buffSig = sig;
      const names = { cri: 'Cri de guerre', mur: 'Mur de bouclier', concentration: 'Concentration', parade: 'Parade', faucon: 'Œil du faucon', esprit: 'Esprit protecteur', divin: 'Bouclier divin', poison: 'Lames empoisonnées', furtif: 'Furtivité', frenesie: 'Frénésie', soif: 'Soif de sang', immortel: 'Rage immortelle', chant: 'Chant de guerre' };
      $('buffs').innerHTML = p.buffs.map((b) => `<span class="buff">${names[b.id] || b.id} ${Math.ceil(b.t)} s</span>`).join('') +
        (Game.char.boundBoss ? `<span class="buff" style="color:var(--heal)">Serviteur lié : ${esc(D.MONSTERS[Game.char.boundBoss].name)}</span>` : '') +
        (soul ? `<span class="buff" style="color:var(--heal)">Âme invoquée : ${esc(soul.def.name)} (mana bloqué)</span>` : '');
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

  UI.tuto = function (o) {
    const b = $('tutobox');
    if (!o) { b.hidden = true; return; }
    b.hidden = false;
    $('tutohead').textContent = 'Tutoriel — étape ' + o.step + ' / ' + o.total;
    $('tutotext').textContent = o.text;
    $('tutosay').textContent = o.say ? 'Sergente Brenna : « ' + o.say + ' »' : '';
    $('tutosay').hidden = !o.say;
    $('tutoprog').textContent = o.prog || '';
  };

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
  // en donjon de groupe, le jeu ne se met jamais en pause (les autres joueurs continuent)
  UI.noPause = () => !!(Game.scene && Game.scene.coop);
  UI.currentPanel = () => panelId;
  UI.openPanel = function (id) {
    if (Game.mode !== 'play') return;
    panelId = id; forgeSel = null;
    $('panel').hidden = false;
    if ((id === 'menu' || id === 'keys' || id === 'options' || id === 'creator') && !UI.noPause()) Game.paused = true;
    if (id !== 'keys') UI.capturing = null;
    UI.refreshPanel();
  };
  UI.closePanel = function () {
    UI.capturing = null;
    UI.hidePanel();
    Game.paused = false;
  };
  UI.hidePanel = function () { panelId = null; $('panel').hidden = true; $('tip').hidden = true; };
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
    return `<div class="cell" data-ref="${ref}" data-tip="it:${ref}" style="border-color:${col};background:${col}22"><img src="${G.Icons.item(it)}" alt="${esc(it.name)}" draggable="false">${it.up ? `<span class="up">+${it.up}</span>` : ''}${it.run ? '<span class="run" title="Butin de ce donjon">●</span>' : ''}${it.rarity === 4 ? '<span class="leg">★</span>' : ''}</div>`;
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
          <div class="sectitle" style="margin-top:14px">Potions de soin</div><p style="margin:0 0 8px">Rend ${Math.round(D.POTION_HEAL * 100)} % de votre vie (touche ${esc(G.Input.label('potion'))}, recharge ${D.POTION_CD} s). Vous en avez ${ch.potions} / ${D.MAX_POTIONS}.</p>
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
      if (!avail.length && !act.length && !done.length) body += ch.legend
        ? '<div class="say"><b>Capitaine Aldric :</b> « Le Sceau des Quinze brille de nouveau au-dessus de Havre-Gris. Valdorne est libre, grâce à vous. Les donjons restent ouverts aux plus courageux… et leurs trésors aussi. »</div>'
        : '<p class="muted">Plus de quêtes pour le moment. Montez de niveau, puis revenez me voir.</p>';
      return { title: 'Garnison — Capitaine Aldric', sub: 'Quêtes', body };
    },
    portal() {
      const ch = Game.char, Net = G.Net, party = Net && Net.online && Net.party;
      const follower = party && !Net.isLeader();
      const cards = D.DUNGEONS.map((d) => {
        const unlocked = Game.dungeonUnlocked(d.id) && !follower, done = ch.cleared >= d.id;
        const boss = d.boss ? D.MONSTERS[d.boss].name : d.bossName;
        let status, cls = 'dcard';
        if (!d.playable) { status = '<span class="muted">En construction</span>'; cls += ' lock'; }
        else if (!unlocked) { status = follower ? '<span class="muted">Le chef du groupe choisit</span>' : '<span style="color:var(--blood)">Verrouillé : vaincre le donjon ' + (d.id - 1) + '</span>'; cls += ' lock'; }
        else { status = done ? '<span style="color:var(--heal)">Vaincu — rejouable</span>' : '<span style="color:var(--violet)">Disponible</span>'; cls += ' ok'; }
        return `<div class="${cls}" ${d.playable && unlocked ? `data-dun="${d.id}" tabindex="0" role="button"` : ''}><h3>${d.id}. ${d.name}</h3><span>Niveau conseillé ${d.lvl}+ · Boss : ${esc(boss)}</span>${status}</div>`;
      }).join('');
      let grp = '';
      if (party) {
        const names = party.members.filter((m) => m.id !== Net.myId).map((m) => esc(m.name)).join(', ');
        const away = party.members.filter((m) => m.id !== Net.myId && m.scene !== 'town').map((m) => esc(m.name));
        grp = follower
          ? `<div class="say"><b>Groupe :</b> seul le chef (${esc((party.members.find((m) => m.id === party.leader) || {}).name || '?')}) peut ouvrir un donjon ; vous y entrerez avec lui. Pour jouer seul, quittez le groupe (touche ${esc(G.Input.shortLabel('social'))}).</div>`
          : `<div class="say"><b>Groupe de ${party.members.length} :</b> ${names} entreront avec vous. Les monstres ont ${Math.round(((G.Coop ? G.Coop.hpMul(party.members.length) : 1) - 1) * 100)} % de vie en plus ; chacun ramasse son propre butin.${away.length ? `<br><span style="color:var(--blood)">${away.join(', ')} doi${away.length > 1 ? 'vent' : 't'} d'abord revenir en ville.</span>` : ''}</div>`;
      }
      return { title: 'Portail des Donjons', sub: party ? (follower ? 'Votre chef de groupe choisit la destination' : 'Choisissez la destination du groupe') : 'Choisissez votre destination', body: `${grp}<p style="margin:0 0 10px">Les donjons ont toujours le même plan. À la mort : retour en ville, perte de 25 % de l'or, de tout le butin du donjon et d'un objet équipé au hasard.</p><div class="dgrid">${cards}</div>` };
    },
    guild() {
      return {
        title: 'Taverne des Guildes', sub: 'Tavernière Maëlle',
        body: `<div class="say"><b>Maëlle :</b> « Les guildes ? Bientôt, mon brave ! En attendant, les héros de Valdorne se retrouvent déjà en ville : formez un groupe et descendez ensemble dans les donjons. »</div>
          <p>${G.Net && G.Net.available ? 'Le jeu en ligne est ouvert : approchez-vous d\'un autre héros et appuyez sur ' + esc(G.Input.shortLabel('interact')) + ' pour l\'inviter, ou ouvrez la liste des joueurs (' + esc(G.Input.shortLabel('social')) + '). Le chef du groupe ouvre le donjon au Portail et tout le groupe y entre.' : 'Le jeu à plusieurs se joue sur le site du jeu (version en ligne).'} Les guildes arriveront ensuite :</p>
          <ul style="font-size:18px;line-height:1.5"><li>Créer une guilde, choisir son nom et son blason, inviter des membres</li><li>Rangs : chef, officier, membre</li><li>Discussion de guilde et liste des membres connectés</li><li>Classement des guildes (donjons vaincus, temps record)</li></ul>`,
      };
    },
    menu() {
      const inD = Game.scene.kind === 'dungeon', In = G.Input;
      const kbd = (t) => `<kbd>${esc(t)}</kbd>`;
      const keys = (id) => In.codes(id).map((c) => kbd(In.codeLabel(c))).join(' / ') || '<span style="color:var(--blood)">aucune touche</span>';
      const arrows = ['up', 'left', 'down', 'right'].map((a) => In.binds[a][1]).join() === 'ArrowUp,ArrowLeft,ArrowDown,ArrowRight';
      const sp = [1, 2, 3, 4, 5].map((n) => In.shortLabel('s' + n));
      const spells = sp.join('') === '12345' ? kbd('1') + ' à ' + kbd('5') : sp.map(kbd).join(' ');
      const rows = [[kbd(In.moveLabel()) + (arrows ? ' / flèches' : ''), 'Se déplacer'], [keys('attack'), 'Attaque de base vers le curseur (maintenir)'], [spells, 'Sorts (visés au curseur)'],
        [keys('potion'), 'Boire une potion'], [keys('interact'), 'Parler, ouvrir, utiliser'], [keys('inventory'), 'Inventaire'], [keys('menu'), 'Fermer / menu']];
      const online = G.Net && G.Net.online, coop = !!Game.scene.coop;
      if (G.opt('creator') && !online) rows.push([keys('creator'), 'Mode créateur']);
      if (online) rows.push([keys('chat'), 'Discuter (« /g » : au groupe)'], [keys('social'), 'Joueurs en ligne et groupe']);
      return {
        title: coop ? 'Menu' : 'Pause', sub: coop ? 'Donjon de groupe : le jeu continue !' : inD ? 'Le jeu est en pause' : 'Havre-Gris',
        body: `<div class="cols" style="grid-template-columns:300px 1fr"><div class="list"><button class="main" data-menu="resume">Reprendre</button>
          <button data-menu="keys">Touches</button><button data-menu="options">Options</button>
          ${G.opt('creator') && !online ? '<button data-menu="creator" class="creatorbtn">Mode créateur</button>' : ''}
          <button data-menu="title">${inD ? 'Abandonner et revenir au titre' : 'Revenir à l\'écran titre'}</button>
          ${inD ? '<p class="muted" style="font-size:15px;margin:0">Abandonner : le butin trouvé dans ce donjon est perdu (sans les autres pénalités de mort).</p>' : '<p class="muted" style="font-size:15px;margin:0">La partie est sauvegardée automatiquement en ville.</p>'}</div>
          <div><div class="sectitle">Commandes</div><div class="cmds">${rows.map(([k, t]) => `<span>${k}</span><span>${t}</span>`).join('')}</div>
          <p class="muted" style="font-size:15px">Les zones hachurées rouges annoncent une attaque : sortez-en avant qu'elles soient pleines. Les touches se changent dans « Touches ».</p></div></div>`,
      };
    },
    keys() {
      return { title: 'Touches', sub: UI.noPause() ? 'Le jeu continue' : 'Le jeu est en pause', body: `<div class="row" style="margin-bottom:8px"><button data-menu="back">← Retour au menu</button></div>${UI.keysBody()}` };
    },
    options() {
      return { title: 'Options', sub: UI.noPause() ? 'Le jeu continue' : 'Le jeu est en pause', body: `<div class="row" style="margin-bottom:8px"><button data-menu="back">← Retour au menu</button></div>${UI.optionsBody()}` };
    },
  };
  // autres panneaux (mode créateur) : ajoutés par d'autres fichiers
  UI.PANELS = PANELS; UI.panelClick = {}; UI.panelChange = {};

  function msg(id, text, color) { const el = $(id); if (el) { el.textContent = text || ''; el.style.color = color || 'var(--ink)'; } }

  function onPanelClick(e) {
    const ch = Game.char;
    const b = e.target.closest('button');
    if (UI.panelClick[panelId] && UI.panelClick[panelId](e)) return;
    if (panelId === 'keys' && UI.keysClick(e, () => UI.refreshPanel())) return;
    if (b && (b.dataset.menu === 'keys' || b.dataset.menu === 'options' || b.dataset.menu === 'creator')) { UI.openPanel(b.dataset.menu); return; }
    if (b && b.dataset.menu === 'back') { UI.openPanel('menu'); return; }
    const cell = e.target.closest('.cell[data-ref]');
    const dun = e.target.closest('[data-dun]');
    if (dun) {
      const d = D.DUNGEONS[+dun.dataset.dun - 1];
      UI.closePanel();
      if (G.Net && G.Net.online && G.Net.party) G.Net.startGroup(d); // tout le groupe entre ensemble
      else Game.enterDungeon(d);
      return;
    }
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
    else if (ref === 'soul') h = G.Souls ? G.Souls.tip() : '';
    else if (ref === 'potion') h = `<h4 style="color:var(--blood)">Potion de soin</h4><div class="muted">Touche ${esc(G.Input.label('potion'))}</div><hr>Rend ${Math.round(D.POTION_HEAL * 100)} % de votre vie. Recharge : ${D.POTION_CD} s.<br>Vous en avez ${Game.char.potions} / ${D.MAX_POTIONS}. En vente chez Ysolde.`;
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
    return `<h4>${ab.name}</h4><div class="muted">${slot === 0 ? 'Attaque de base · ' + esc(G.Input.label('attack')) : 'Touche ' + esc(G.Input.label('s' + slot)) + (rank ? ' · rang ' + rank + '/3' : '')}</div><hr>
      ${ab.desc ? esc(ab.desc) : 'Votre attaque principale, dirigée vers le curseur.'}<hr>
      <div class="ln"><span>Coût</span><span>${ab.cost ? ab.cost + ' ' + D.RES[C.res].name.toLowerCase() : 'aucun'}</span></div><div class="ln"><span>Recharge</span><span>${String(ab.cd).replace('.', ',')} s</span></div>${req}`;
  }

  // ================= Écrans spéciaux =================
  UI.confirm = function (title, text, okLabel, onOk, onCancel) {
    const sc = $('screen');
    const prevPaused = Game.paused;
    if (!UI.noPause()) Game.paused = true;
    sc.className = 'screen dim live'; sc.hidden = false;
    sc.innerHTML = `<div class="box sk"><h2 style="font-size:44px">${esc(title)}</h2><p style="font-size:19px;margin:0">${esc(text)}</p><div class="row"><button class="main" id="cok">${esc(okLabel)}</button><button id="cno">Annuler</button></div></div>`;
    sc.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      sc.hidden = true; Game.paused = prevPaused && panelId === 'menu' && !UI.noPause();
      if (b.id === 'cok') onOk && onOk(); else onCancel && onCancel();
    };
  };
  UI.closeConfirm = function () { const sc = $('screen'); if (!sc.hidden && sc.classList.contains('dim') && sc.querySelector('#cno')) { sc.querySelector('#cno').click(); return true; } return false; };

  UI.showHardcoreDeath = function (m) {
    UI.closePanel();
    const sc = $('screen');
    sc.className = 'screen dim live'; sc.hidden = false;
    const h = Math.floor(m.time / 3600), min = Math.floor((m.time % 3600) / 60);
    sc.innerHTML = `<div class="box sk"><h2 style="color:var(--blood)">Mort pour toujours</h2>
      <p style="margin:0;font-size:20px">La légende de <b>${esc(m.name)}</b> s'achève ici. Le mode Hardcore ne pardonne pas : ce héros est effacé.</p>
      <div class="stats" style="min-width:380px"><span>Classe</span><span>${D.CLASSES[m.cls].name}</span><span>Niveau atteint</span><span>${m.lvl}</span>
      <span>Donjons vaincus</span><span>${m.cleared} / 15</span><span>Monstres vaincus</span><span>${G.fmt(m.kills)}</span>
      <span>Lieu</span><span>${esc(m.place)}</span><span>Cause de la mort</span><span>${esc(m.cause)}</span>
      <span>Temps de jeu</span><span>${h ? h + ' h ' : ''}${min} min</span></div>
      <p class="muted" style="margin:0">Son nom est gravé au Cimetière des héros (menu de l'écran titre).</p>
      <button class="main" id="hcgo">Retour à l'écran titre</button></div>`;
    sc.onclick = (e) => { if (e.target.id === 'hcgo') UI.showTitle(); };
  };

  // ================= Fin de l'histoire =================
  UI.showEnding = function (info) {
    UI.closePanel();
    const sc = $('screen');
    sc.className = 'screen dim live'; sc.hidden = false;
    const h = Math.floor(info.time / 3600), min = Math.floor((info.time % 3600) / 60);
    sc.innerHTML = `<div class="box sk ending"><canvas class="seal" width="240" height="240"></canvas>
      <h2>Le Sceau des Quinze est restauré</h2>
      <p class="epi">Le Roi Cendré s'effondre. Sa couronne de flammes s'éteint, et le quinzième fragment glisse de sa main vers la vôtre. À Havre-Gris, les quinze fragments s'assemblent dans un éclat d'or : le Sceau renaît, et sa lumière repousse la cendre jusqu'aux frontières de Valdorne.</p>
      <p class="epi">On chantera longtemps le nom de <b>${esc(info.name)}</b>, ${D.CLASSES[info.cls].name.toLowerCase()}${info.hardcore ? ' en mode Hardcore, avec une seule vie' : ''}, qui a traversé les quinze donjons. Mais les monstres ne disparaissent jamais tout à fait… et les donjons attendent toujours les plus courageux.</p>
      <div class="stats" style="min-width:380px"><span>Niveau</span><span>${info.lvl}</span><span>Temps de jeu</span><span>${h ? h + ' h ' : ''}${min} min</span>
      <span>Monstres vaincus</span><span>${G.fmt(info.kills)}</span><span>Morts</span><span>${info.hardcore ? 'aucune' : info.deaths}</span></div>
      <p class="muted" style="margin:0">Votre héros porte désormais le titre de Légende de Valdorne.</p>
      <button class="main" id="ego">Continuer</button></div>`;
    // le Sceau dessiné à la main
    const cv = sc.querySelector('.seal'), g = cv.getContext('2d'), S = G.S;
    g.scale(2, 2); S.begin(15, true);
    S.circle(g, 60, 60, 52, { fill: '#e2c043', fillA: 0.35, stroke: '#8a6a10', w: 2 });
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * G.TAU - Math.PI / 2, x = 60 + Math.cos(a) * 40, y = 60 + Math.sin(a) * 40;
      S.poly(g, [[x, y - 6], [x + 5, y], [x, y + 6], [x - 5, y]], { fill: '#c9a227', w: 1 });
    }
    S.circle(g, 60, 60, 18, { fill: '#f2c46b', w: 1.6 });
    S.text(g, 'XV', 60, 61, 18, '#5a4a10');
    sc.onclick = (e) => { if (e.target.id === 'ego') sc.hidden = true; };
    G.Save.save(true, true);
  };

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
