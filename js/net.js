// Jeu en ligne : connexion au serveur, autres héros en ville, discussion, groupes de 4 joueurs.
// Le jeu reste entièrement jouable hors ligne (artefact claude.ai, fichier ouvert en local, option désactivée).
(function () {
  const D = G.D, Game = G.Game, S = G.S, UI = G.UI, Input = G.Input;
  const $ = (id) => document.getElementById(id);
  const esc = G.esc;
  const Net = (G.Net = {
    // en ligne uniquement sur le site du jeu (pas dans l'artefact claude.ai, ni en fichier local)
    available: /^https?:$/.test(location.protocol) && !(window.claude && window.claude.use) && !/[?&]horsligne\b/.test(location.search),
    url: location.origin.replace(/^http/, 'ws') + '/ws',
    ws: null, state: 'off', online: false, myId: null, char: null,
    peers: new Map(), party: null, chatLog: [], ignored: new Set(), chatCh: 'all',
    out: [], tickT: 0, pingT: 0, lastMe: '', meT: 99, retry: 0, retryT: null, ping: 120, lastChat: 0, uiT: 0, partySig: '',
  });
  const PARTY_MAX = 4;
  const cname = (cls) => (D.CLASSES[cls] ? D.CLASSES[cls].name : '?');

  // ================= Connexion =================
  Net.enabled = () => Net.available && G.opt('online');
  Net.start = function (ch) {
    Net.char = ch;
    if (!Net.enabled() || !ch) return;
    if (ch.creator) { setTimeout(() => UI.toast('Ce héros a utilisé le mode créateur : il joue hors ligne.', '#7b3fa6', 4), 400); renderNet(); return; }
    if (Net.ws) { if (Net.ws.readyState === 1) hello(); return; }
    connect();
  };
  // On vérifie d'abord qu'un serveur de jeu répond ici (un simple hébergement de fichiers n'en a pas)
  function connect() {
    clearTimeout(Net.retryT);
    if (Net.probing || Net.noServer) return;
    Net.probing = true; Net.state = 'connecting';
    renderNet();
    fetch('/api/status', { cache: 'no-store' }).then(statusOf).catch(() => null).then((d) => {
      Net.probing = false;
      if (!Net.char || Net.ws || Game.mode === 'title' || !Net.enabled()) { if (!Net.ws) { Net.state = 'off'; renderNet(); } return; }
      if (d === 'absent' || (d && typeof d.online !== 'number')) { Net.noServer = true; Net.state = 'off'; renderNet(); return; }
      if (!d) { Net.state = 'off'; renderNet(); retryLater(); return; }
      openSocket();
    });
  }
  // réponse de /api/status : { online } avec un serveur de jeu, 'absent' sur un simple hébergement de fichiers, null si erreur passagère
  const statusOf = (r) => (r.status === 404 || r.status === 405 ? 'absent' : r.ok ? r.json().catch(() => 'absent') : null);
  function retryLater() {
    if (!Net.char || !Net.enabled() || Game.mode === 'title') return;
    const wait = Math.min(60, 3 * Math.pow(2, Net.retry++));
    Net.retryT = setTimeout(() => { if (!Net.ws && Net.char && Game.mode !== 'title') connect(); }, wait * 1000);
  }
  function openSocket() {
    let ws;
    try { ws = new WebSocket(Net.url); } catch (e) { Net.state = 'off'; renderNet(); retryLater(); return; }
    Net.ws = ws; Net.state = 'connecting';
    renderNet();
    ws.onopen = () => { if (Net.ws === ws) { Net.retry = 0; hello(); } };
    ws.onmessage = (e) => {
      if (Net.ws !== ws) return;
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      try { handle(m); } catch (err) { console.error(err); }
    };
    ws.onclose = () => { if (Net.ws === ws) dropped(); };
    ws.onerror = () => {};
  }
  function hello() { const ch = Net.char; if (ch) sendNow({ t: 'hello', name: ch.name, cls: ch.cls, lvl: ch.lvl }); }
  function reset() {
    Net.state = 'off'; Net.online = false; Net.myId = null; Net.party = null; Net.peers.clear(); Net.out = [];
    removeAvatars();
  }
  function dropped() {
    const was = Net.online;
    Net.ws = null;
    if (G.Coop) G.Coop.onDisconnect(false);
    reset();
    if (was && UI.refreshLabels) UI.refreshLabels();
    if (was) sys('Connexion au serveur perdue. Nouvelle tentative…');
    renderParty(); renderNet();
    retryLater();
  }
  Net.stop = function () {
    clearTimeout(Net.retryT);
    const ws = Net.ws;
    Net.ws = null; Net.char = null;
    if (G.Coop) G.Coop.onDisconnect(true);
    if (ws) { try { ws.close(1000); } catch (e) { /* déjà fermée */ } }
    reset();
    closeChat();
    if ($('invites')) $('invites').innerHTML = '';
    renderParty(); renderNet();
  };

  // ================= Envoi =================
  function sendNow(m) {
    const ws = Net.ws;
    if (!ws || ws.readyState !== 1) return;
    try { ws.send(JSON.stringify(m)); } catch (e) { /* connexion fermée */ }
  }
  Net.send = (m) => { if (Net.ws) Net.out.push(m); };
  Net.flush = function () {
    if (!Net.ws || Net.ws.readyState !== 1) { Net.out = []; return; }
    if (G.Coop) G.Coop.drain(Net.out);
    while (Net.out.length) {
      const part = Net.out.splice(0, 40);
      sendNow(part.length === 1 ? part[0] : { b: part });
    }
  };

  // nom de la scène où se trouve le héros (en ville, tout le monde se voit ; en donjon, seulement le groupe)
  Net.sceneKey = function () {
    const sc = Game.scene;
    if (!sc || Game.mode === 'title') return 'off';
    if (sc.kind === 'town') return 'town';
    if (sc.coop) return sc.coop.key;
    return (sc.kind === 'tuto' ? 'tuto:' : 'solo:') + (Net.myId || '');
  };

  // État du héros envoyé aux autres
  function meMsg() {
    const p = Game.player, ch = Game.char, sc = Game.scene;
    if (!p || !ch || !sc) return null;
    const s = Net.sceneKey();
    const m = { t: 'me', s, x: Math.round(p.x), y: Math.round(p.y), l: ch.lvl };
    if (s === 'town' || sc.coop) {
      let f = 0;
      if (p.dead) f |= 1;
      if (p.stunT > 0) f |= 2;
      if (p.sleep) f |= 4;
      if (p.stealth) f |= 8;
      if (p.shield > 0) f |= 16;
      if (p.frozenT > 0) f |= 32;
      if (p.invulnFx) f |= 64;
      m.f = f; m.a = Math.round(p.aim * 100) / 100; m.sw = p.swingN || 0; m.sd = p.swingDir || 1;
    }
    if (sc.coop) {
      m.hp = Math.max(0, Math.round(p.hp)); m.mh = Math.round(p.maxHp);
      const mins = sc.units.filter((u) => u.minion && !u.netCtl && !u.dead);
      if (mins.length) m.mn = mins.map((u) => [u.id, u.type, Math.round(u.x), Math.round(u.y), Math.max(1, Math.round((100 * u.hp) / u.maxHp)), Math.round(u.aim * 100) / 100, u.elite ? 1 : 0, u.soul ? 1 : 0]);
    }
    return m;
  }

  // ================= Réception =================
  function handle(m) {
    switch (m.t) {
      case 'welcome':
        Net.myId = m.id; Net.online = true; Net.state = 'online';
        Net.peers.clear();
        (m.peers || []).forEach(addPeer);
        Net.party = m.party || null;
        Net.lastMe = ''; Net.meT = 99;
        Net.onScene();
        sys(m.peers && m.peers.length ? 'Connecté. ' + m.peers.length + ' autre' + (m.peers.length > 1 ? 's héros sont' : ' héros est') + ' en ligne.' : 'Connecté. Vous êtes seul en ligne pour le moment.');
        renderParty(); renderNet(); refreshPlayers();
        if (UI.refreshLabels) UI.refreshLabels(); // l'aide affiche les touches du jeu en ligne
        break;
      case 'join': addPeer(m.p); sys(m.p.name + ' (' + cname(m.p.cls).toLowerCase() + ' niv. ' + m.p.lvl + ') arrive à Havre-Gris.'); renderNet(); refreshPlayers(); break;
      case 'update': addPeer(m.p); refreshPlayers(); break;
      case 'peers': (m.peers || []).forEach((p) => { addPeer(p); if (p.scene === 'town') placeAvatar(p); }); refreshPlayers(); break;
      case 'leave': {
        const pr = Net.peers.get(m.id);
        Net.peers.delete(m.id);
        removeAvatar(m.id);
        if (G.Coop) G.Coop.onPeerGone(m.id);
        sys((m.name || (pr && pr.name) || 'Un héros') + ' s\'est déconnecté.');
        renderNet(); refreshPlayers();
        break;
      }
      case 'scene': {
        const pr = Net.peers.get(m.id);
        if (pr) { pr.scene = m.s; if (m.l) pr.lvl = m.l; }
        if (m.s !== Net.sceneKey()) removeAvatar(m.id);
        if (G.Coop) G.Coop.onPeerScene(m.id, m.s);
        refreshPlayers();
        break;
      }
      case 'me': onMe(m); break;
      case 'chat': onChat(m); break;
      case 'notice': UI.toast(m.text, '#2b2118', 3); sys(m.text); break;
      case 'invite': onInvite(m); break;
      case 'party': setParty(m.party, m); break;
      case 'start': if (G.Coop) G.Coop.begin(m); break;
      case 'g': if (G.Coop) G.Coop.onMessage(m); break;
      case 'pong': if (m.at) Net.ping = Math.max(20, Math.min(2000, performance.now() - m.at)); break;
    }
  }
  function addPeer(p) {
    if (!p || !p.id || p.id === Net.myId) return;
    const old = Net.peers.get(p.id) || {};
    Net.peers.set(p.id, Object.assign(old, p));
    const u = avatar(p.id);
    if (u) { u.name = p.name; u.lvl = p.lvl; }
  }

  // ================= Avatars des autres joueurs =================
  function avatar(id) {
    const sc = Game.scene;
    if (!sc) return null;
    for (const u of sc.units) if (u.isAlly && u.remote && u.netId === id) return u;
    return null;
  }
  Net.avatar = avatar;
  Net.avatars = () => (Game.scene ? Game.scene.units.filter((u) => u.isAlly && u.remote) : []);
  function makeAvatar(pr, x, y) {
    return {
      id: G.uid(), netId: pr.id, remote: true, netCtl: true, isAlly: true, keep: true, faction: 'p', def: { name: pr.name }, cls: pr.cls, look: pr.cls, name: pr.name, lvl: pr.lvl,
      x, y, tx: x, ty: y, r: 13, hp: 1, maxHp: 1, aim: Math.PI / 2, facing: 1, walk: 0, swingT: 0, swingDir: 1, swingN: 0, stunT: 0, hitT: 0, slowT: 0, slowAmt: 0,
      buffs: [], dots: [], hots: [], shield: 0, vx: 0, vy: 0, dead: false, lastMe: performance.now(),
    };
  }
  function placeAvatar(pr) {
    const sc = Game.scene;
    if (!sc || sc.kind !== 'town' || Net.sceneKey() !== 'town' || !(pr.x || pr.y)) return;
    const u = avatar(pr.id);
    if (u) { u.tx = pr.x; u.ty = pr.y; return; }
    sc.units.push(makeAvatar(pr, pr.x, pr.y));
  }
  function removeAvatar(id) {
    const sc = Game.scene;
    if (!sc) return;
    sc.units = sc.units.filter((u) => !(u.remote && (u.netId === id || u.owner === id)));
  }
  function removeAvatars() {
    const sc = Game.scene;
    if (sc) sc.units = sc.units.filter((u) => !(u.remote && (u.isAlly || u.rminKey)));
  }
  function onMe(m) {
    const pr = Net.peers.get(m.id);
    if (!pr) return;
    pr.x = m.x; pr.y = m.y; if (m.l) pr.lvl = m.l; pr.scene = m.s;
    const sc = Game.scene;
    if (!sc || Game.mode === 'title' || m.s !== Net.sceneKey()) return;
    let u = avatar(m.id);
    if (!u) { u = makeAvatar(pr, m.x, m.y); sc.units.push(u); }
    const now = performance.now(), gap = Math.max(0.05, Math.min(0.5, (now - u.lastMe) / 1000));
    u.vx = (m.x - u.tx) / gap; u.vy = (m.y - u.ty) / gap;
    u.tx = m.x; u.ty = m.y; u.lastMe = now; u.lvl = pr.lvl;
    if (m.a != null) u.aim = m.a;
    const f = m.f || 0;
    u.dead = !!(f & 1);
    u.stunT = f & 2 ? 1 : 0; u.sleep = !!(f & 4); u.stealth = !!(f & 8); u.shield = f & 16 ? 1 : 0; u.frozenT = f & 32 ? 1 : 0; u.invulnFx = !!(f & 64);
    u.buffs = u.stealth ? [{ id: 'furtif', t: 1 }] : [];
    if (m.sw != null && m.sw !== u.swingN) { u.swingN = m.sw; u.swingT = 1; u.swingDir = m.sd || 1; }
    if (m.hp != null) { u.hp = m.hp; u.maxHp = Math.max(1, m.mh || u.maxHp); }
    if (G.Coop) G.Coop.onMinions(m.id, m.mn || null);
  }

  // Déplacement adouci des unités pilotées par le réseau (autres joueurs, monstres de l'hôte, serviteurs)
  Net.moveRemote = function (u, dt) {
    const dx = u.tx - u.x, dy = u.ty - u.y, d = Math.hypot(dx, dy);
    if (d > 200) { u.x = u.tx; u.y = u.ty; }
    else if (d > 0.4) {
      const k = Math.min(1, dt * (u.puppet ? 14 : 12));
      u.x += dx * k; u.y += dy * k;
      u.walk += d * k * (u.isAlly ? 0.08 : 0.09);
    }
    if (!u.puppet) u.facing = Math.cos(u.aim) >= 0 ? 1 : -1;
    if (u.bubble) { u.bubble.t -= dt; if (u.bubble.t <= 0) u.bubble = null; }
  };

  // ================= Boucle (chaque image, même en pause) =================
  Net.update = function (dt) {
    const p = Game.player, sc = Game.scene;
    if (sc && Game.mode !== 'title') {
      for (const u of sc.units) if (u.netCtl && !u.dead) Net.moveRemote(u, dt);
      if (p && p.bubble) { p.bubble.t -= dt; if (p.bubble.t <= 0) p.bubble = null; }
      if (p) { if (p.swingT > (Net.lastSwing || 0) + 0.05) p.swingN = (p.swingN || 0) + 1; Net.lastSwing = p.swingT; }
    }
    Net.uiT += dt;
    if (Net.uiT > 0.25) { Net.uiT = 0; renderParty(); if (performance.now() - (Net.chatT || 0) > 1000) renderChat(); }
    if (!Net.ws || Net.ws.readyState !== 1 || !Net.online) return;
    Net.tickT += dt; Net.meT += dt; Net.pingT += dt;
    const coop = sc && sc.coop;
    if (Net.tickT < (coop ? 0.1 : 0.15)) return;
    Net.tickT = 0;
    if (Net.pingT > 20) { Net.pingT = 0; Net.send({ t: 'ping', at: Math.round(performance.now()) }); }
    const m = Game.mode !== 'title' ? meMsg() : null;
    if (m) {
      const town = m.s === 'town';
      // en ville, la visée n'est envoyée que par grands pas (moins de messages)
      const sig = [m.s, m.x, m.y, m.l, m.f, m.sw, town ? Math.round((m.a || 0) * 2) : m.a, m.hp, m.mn ? m.mn.map((a) => a.join(':')).join('|') : ''].join(',');
      const keep = coop ? 1 : 3;
      if (sig !== Net.lastMe || Net.meT > keep) { Net.lastMe = sig; Net.meT = 0; Net.send(m); }
    }
    Net.flush();
  };

  // Changement de scène (ville, donjon, tutoriel)
  Net.onScene = function () {
    const sc = Game.scene;
    if (!sc) return;
    if (sc.kind === 'town' && Net.online) Net.peers.forEach((pr) => { if (pr.scene === 'town') placeAvatar(pr); });
    Net.lastMe = ''; Net.meT = 99; Net.tickT = 1;
    const chat = $('chat');
    if (chat) chat.classList.toggle('tuto', sc.kind === 'tuto');
    renderParty(); renderNet();
  };

  // ================= Discussion =================
  function addLine(o) {
    o.t = performance.now();
    Net.chatLog.push(o);
    if (Net.chatLog.length > 80) Net.chatLog.shift();
    renderChat();
  }
  function sys(text) { addLine({ sys: true, text }); }
  Net.sys = sys;
  function onChat(m) {
    if (Net.ignored.has(m.id)) return;
    const mine = m.id === Net.myId;
    addLine({ ch: m.ch, name: m.name, text: m.text, mine });
    const u = mine ? Game.player : avatar(m.id);
    if (u && Game.mode === 'play') u.bubble = { text: m.text, t: 5 };
  }
  function renderChat() {
    const el = $('chatlog');
    if (!el) return;
    Net.chatT = performance.now();
    const open = !$('chatin').hidden, now = performance.now();
    const lines = Net.chatLog.slice(open ? -14 : -7).filter((l) => open || now - l.t < 25000);
    el.innerHTML = lines.map((l) => (l.sys ? `<div class="cl sys">${esc(l.text)}</div>`
      : `<div class="cl${l.ch === 'party' ? ' party' : ''}${l.mine ? ' mine' : ''}"><b>${l.ch === 'party' ? '[Groupe] ' : ''}${esc(l.name)} :</b> ${esc(l.text)}</div>`)).join('');
    $('chat').classList.toggle('open', open);
  }
  function renderCh() { const b = $('chatch'); if (b) { b.textContent = Net.chatCh === 'party' ? 'Groupe' : 'Tous'; b.classList.toggle('party', Net.chatCh === 'party'); } }
  Net.openChat = function () {
    const box = $('chatin'), inp = $('chatinput');
    if (!box || !Net.online) return;
    if (!Net.party) Net.chatCh = 'all';
    box.hidden = false; renderCh();
    Game.keys = {}; Game.mouse.down = false;
    inp.value = '';
    inp.focus();
    renderChat();
  };
  function closeChat() {
    const box = $('chatin');
    if (!box || box.hidden) return;
    box.hidden = true;
    $('chatinput').blur();
    renderChat();
  }
  Net.chatOpen = () => !!($('chatin') && !$('chatin').hidden);
  function sendChat(raw) {
    let text = String(raw || '').trim(), ch = Net.chatCh;
    const cmd = /^\/(g|groupe|t|tous)\s+/i.exec(text);
    if (cmd) { ch = /^g/i.test(cmd[1]) ? 'party' : 'all'; text = text.slice(cmd[0].length).trim(); }
    if (!text) return;
    if (ch === 'party' && !Net.party) { sys('Vous n\'êtes dans aucun groupe.'); return; }
    if (performance.now() - Net.lastChat < 700) { sys('Doucement : un message à la fois.'); return; }
    Net.lastChat = performance.now();
    Net.send({ t: 'chat', ch, text: text.slice(0, 200) });
    Net.flush();
  }

  // ================= Groupes =================
  Net.inParty = (id) => !!(Net.party && Net.party.members.some((m) => m.id === id));
  Net.isLeader = () => !!(Net.party && Net.party.leader === Net.myId);
  Net.canInvite = (id) => Net.online && id !== Net.myId && !Net.inParty(id) && (!Net.party || (Net.isLeader() && Net.party.members.length < PARTY_MAX));
  Net.invite = function (id) {
    if (!Net.online) return;
    if (Net.party && !Net.isLeader()) { UI.toast('Seul le chef du groupe peut inviter.', '#9b2c20', 2.5); return; }
    if (Net.party && Net.party.members.length >= PARTY_MAX) { UI.toast('Votre groupe est complet (4 joueurs).', '#9b2c20', 2.5); return; }
    Net.send({ t: 'invite', to: id }); Net.flush();
  };
  Net.leaveParty = function () { Net.send({ t: 'leave' }); Net.flush(); };
  Net.kick = function (id) { Net.send({ t: 'kick', id }); Net.flush(); };
  Net.promote = function (id) { Net.send({ t: 'promote', id }); Net.flush(); };
  Net.startGroup = function (def) {
    if (!Net.isLeader()) { UI.toast('Seul le chef du groupe peut ouvrir un donjon pour le groupe.', '#9b2c20', 3); return; }
    Net.send({ t: 'start', d: def.id, key: 'g' + Net.myId + '-' + Date.now().toString(36) });
    Net.flush();
  };
  function setParty(party, msg) {
    const old = Net.party;
    Net.party = party || null;
    if (msg && msg.note) sys(msg.note);
    if (!old && party) { UI.toast('Vous formez un groupe (' + party.members.length + '/4).', '#2f5d8a', 3); sys('Groupe formé. Le chef ouvre les donjons au Portail ; tout le groupe y entre ensemble. Message au groupe : /g votre texte'); }
    else if (old && !party && !(msg && msg.note)) sys('Vous avez quitté le groupe.');
    else if (old && party && old.leader !== party.leader) sys((memberName(party.leader) || 'Quelqu\'un') + ' est le nouveau chef du groupe.');
    if (!Net.party && Net.chatCh === 'party') { Net.chatCh = 'all'; renderCh(); }
    renderParty(); refreshPlayers();
    if (G.Coop) G.Coop.onParty(old, Net.party, msg || {});
  }
  function memberName(id) { const m = Net.party && Net.party.members.find((x) => x.id === id); return m ? m.name : null; }

  function onInvite(m) {
    if (Net.ignored.has(m.from)) { Net.send({ t: 'decline', from: m.from }); return; }
    if (Game.scene && Game.scene.coop) { Net.send({ t: 'decline', from: m.from }); sys(m.name + ' vous a invité, mais vous êtes en donjon avec votre groupe.'); return; }
    const box = $('invites');
    if (!box) return;
    [...box.children].forEach((c) => { if (c.dataset.from === m.from) c.remove(); });
    const el = document.createElement('div');
    el.className = 'invite sk';
    el.dataset.from = m.from;
    el.innerHTML = `<div><b>${esc(m.name)}</b> (${esc(cname(m.cls).toLowerCase())} niv. ${m.lvl | 0}) vous invite dans son groupe.${Net.party ? '<br><span class="muted">Vous quitterez votre groupe actuel.</span>' : ''}</div>
      <div class="row"><button class="main" data-acc="1">Accepter</button><button data-dec="1">Refuser</button></div>`;
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      Net.send({ t: b.dataset.acc ? 'accept' : 'decline', from: m.from }); Net.flush();
      el.remove();
    };
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { if (el.isConnected) { el.remove(); Net.send({ t: 'decline', from: m.from }); } }, 30000);
    UI.toast(m.name + ' vous invite dans son groupe.', '#2f5d8a', 3);
  }

  // ================= Interface =================
  function renderParty() {
    const el = $('party');
    if (!el) return;
    const P = Net.party, sc = Game.scene;
    if (!P || !Net.online || !sc || Game.mode === 'title') { if (!el.hidden) el.hidden = true; Net.partySig = ''; return; }
    const key = Net.sceneKey(), p = Game.player;
    const rows = P.members.map((m) => {
      const me = m.id === Net.myId, av = me ? null : avatar(m.id);
      let hp = null, dead = false;
      if (me && p) { hp = p.hp / p.maxHp; dead = !!p.dead; }
      else if (av && sc.coop) { hp = av.maxHp > 1 ? av.hp / av.maxHp : null; dead = av.dead; }
      const where = me ? '' : m.scene === key ? '' : m.scene === 'town' ? 'en ville' : /^tuto/.test(m.scene || '') ? 'au camp' : 'en donjon';
      return { m, me, hp: hp == null ? null : Math.max(0, Math.min(1, hp)), dead, where, lead: m.id === P.leader };
    });
    const sig = rows.map((r) => [r.m.id, r.m.name, r.m.lvl, r.hp == null ? '' : Math.round(r.hp * 40), r.dead, r.where, r.lead].join(':')).join('|');
    if (sig === Net.partySig && !el.hidden) return;
    Net.partySig = sig;
    el.hidden = false;
    el.innerHTML = `<div class="ptl">Groupe ${P.members.length}/4</div>` + rows.map((r) => {
      const C = D.CLASSES[r.m.cls] || { name: '?', color: '#888' };
      return `<div class="pm${r.me ? ' me' : ''}${r.dead ? ' dead' : ''}"><span class="pb" style="background:${C.color}">${esc(C.name[0])}</span>
        <span class="pn">${r.lead ? '<span class="lead" title="Chef du groupe">★</span>' : ''}${esc(r.m.name)}<small> niv. ${r.m.lvl | 0}${r.dead ? ' · mort' : r.where ? ' · ' + r.where : ''}</small></span>
        ${r.hp != null ? `<span class="ph"><i style="width:${(r.hp * 100).toFixed(0)}%"></i></span>` : ''}</div>`;
    }).join('');
  }
  Net.renderParty = renderParty;

  function renderNet() {
    const el = $('netline');
    if (!el) return;
    if (!Net.available) { el.hidden = true; return; }
    el.hidden = false;
    let txt, cls;
    if (!G.opt('online')) { txt = 'Hors ligne (option)'; cls = 'off'; }
    else if (Net.char && Net.char.creator) { txt = 'Hors ligne (héros créateur)'; cls = 'off'; }
    else if (Net.online) { const n = Net.peers.size + 1; txt = 'En ligne · ' + n + ' joueur' + (n > 1 ? 's' : ''); cls = 'on'; }
    else if (Net.state === 'connecting') { txt = 'Connexion au serveur…'; cls = 'wait'; }
    else if (Net.noServer) { txt = 'Pas de serveur ici : jeu hors ligne'; cls = 'off'; }
    else { txt = 'Serveur injoignable'; cls = 'off'; }
    el.innerHTML = `<span class="dot ${cls}"></span><span>${esc(txt)}</span>${Net.online ? `<button class="live" data-players="1">Joueurs (${esc(Input.shortLabel('social'))})</button>` : ''}`;
  }
  Net.renderNet = renderNet;

  function refreshPlayers() { if (UI.currentPanel() === 'players') UI.refreshPanel(); renderNet(); }

  const where = (s) => (s === 'town' ? 'à Havre-Gris' : !s || s === 'off' ? '—' : /^tuto/.test(s) ? 'au camp des recrues' : 'en donjon');
  UI.PANELS.players = function () {
    if (!Net.online) {
      return { title: 'Joueurs en ligne', sub: 'Hors ligne', body: `<p>${Net.available ? (G.opt('online') ? (Net.char && Net.char.creator ? 'Ce héros a utilisé le mode créateur : il ne peut pas jouer en ligne.' : 'Le serveur ne répond pas pour le moment. Le jeu réessaie tout seul.') : 'Le jeu en ligne est désactivé dans les options.') : 'Le jeu en ligne n\'est disponible que sur le site du jeu.'}</p>` };
    }
    const P = Net.party, lead = Net.isLeader();
    let body = '';
    if (P) {
      body += `<div class="sectitle">Votre groupe (${P.members.length}/4)</div><div class="plist">` + P.members.map((m) => {
        const me = m.id === Net.myId;
        const btns = me ? '<button data-pleave="1">Quitter le groupe</button>'
          : lead ? `<button data-promote="${esc(m.id)}">Nommer chef</button><button class="danger" data-kick="${esc(m.id)}">Exclure</button>` : '';
        return `<div class="prow"><span class="pb" style="background:${(D.CLASSES[m.cls] || {}).color || '#888'}">${esc(cname(m.cls)[0])}</span><span class="pinfo"><b>${m.id === P.leader ? '★ ' : ''}${esc(m.name)}${me ? ' (vous)' : ''}</b><small>${esc(cname(m.cls))} niv. ${m.lvl | 0} · ${me ? where(Net.sceneKey()) : where(m.scene)}</small></span><span class="row">${btns}</span></div>`;
      }).join('') + '</div>';
      body += `<p class="muted" style="font-size:16px;margin:6px 0 10px">${lead ? 'Vous êtes le chef : ouvrez un donjon au Portail, tout le groupe y entre avec vous. Les monstres ont plus de vie quand vous êtes plusieurs.' : 'Le chef du groupe ouvre les donjons au Portail : vous y entrerez avec lui.'} Pour parler au groupe : ${esc(Input.shortLabel('chat'))} puis « /g » devant le message.</p>`;
    } else body += '<p class="muted" style="font-size:17px;margin:0 0 10px">Vous n\'êtes dans aucun groupe. Invitez jusqu\'à 3 héros pour explorer les donjons ensemble (approchez-vous d\'eux en ville et appuyez sur ' + esc(Input.shortLabel('interact')) + ', ou utilisez les boutons ci-dessous).</p>';
    const others = [...Net.peers.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    body += `<div class="sectitle">En ligne (${others.length + 1})</div>`;
    body += others.length ? '<div class="plist">' + others.map((pr) => {
      const ign = Net.ignored.has(pr.id);
      const inv = Net.canInvite(pr.id) ? `<button class="main" data-inv="${esc(pr.id)}">Inviter</button>` : Net.inParty(pr.id) ? '<span class="pill" style="color:var(--heal)">dans votre groupe</span>' : '';
      return `<div class="prow"><span class="pb" style="background:${(D.CLASSES[pr.cls] || {}).color || '#888'}">${esc(cname(pr.cls)[0])}</span><span class="pinfo"><b>${esc(pr.name)}</b><small>${esc(cname(pr.cls))} niv. ${pr.lvl | 0} · ${where(pr.scene)}${pr.party && !Net.inParty(pr.id) ? ' · en groupe' : ''}</small></span><span class="row">${inv}<button data-ign="${esc(pr.id)}">${ign ? 'Ne plus ignorer' : 'Ignorer'}</button></span></div>`;
    }).join('') + '</div>' : '<p class="muted">Personne d\'autre pour le moment. Partagez le lien du jeu à vos amis !</p>';
    return { title: 'Joueurs en ligne', sub: 'Groupes de 4 joueurs maximum', body };
  };
  UI.panelClick.players = function (e) {
    const b = e.target.closest('button');
    if (!b) return false;
    if (b.dataset.inv) Net.invite(b.dataset.inv);
    else if (b.dataset.pleave) Net.leaveParty();
    else if (b.dataset.kick) Net.kick(b.dataset.kick);
    else if (b.dataset.promote) Net.promote(b.dataset.promote);
    else if (b.dataset.ign) {
      const id = b.dataset.ign;
      if (Net.ignored.has(id)) Net.ignored.delete(id); else { Net.ignored.add(id); sys('Vous ignorez désormais ' + ((Net.peers.get(id) || {}).name || 'ce joueur') + ' (messages et invitations).'); }
      UI.refreshPanel();
    } else return false;
    return true;
  };

  // Touche E près d'un autre héros en ville : l'inviter
  Net.interactions = function (sc, p, consider) {
    if (!Net.online || sc.kind !== 'town') return;
    for (const u of sc.units) {
      if (!u.isAlly || !u.remote) continue;
      if (Net.inParty(u.netId)) continue;
      if (Net.party && !Net.isLeader()) consider(u.x, u.y, u.name + ' — seul votre chef peut l\'inviter', () => UI.toast('Seul le chef du groupe peut inviter.', '#9b2c20', 2.5), 52);
      else consider(u.x, u.y, 'Inviter ' + u.name + ' dans votre groupe', () => Net.invite(u.netId), 52);
    }
  };

  // Noms au-dessus des autres héros, et héros tombés (fantômes) en donjon
  Net.drawOverlay = function (g, sc, vis) {
    for (const u of sc.units) {
      if (!u.isAlly || !u.remote || !vis(u.x, u.y, 80)) continue;
      if (u.dead) { g.save(); G.R.unit(g, Object.assign({}, u, { dead: false, stealth: true, shield: 0, stunT: 0, bubble: null })); g.restore(); }
      const mate = Net.inParty(u.netId), lead = Net.party && Net.party.leader === u.netId;
      S.text(g, (lead ? '★ ' : '') + u.name + (u.dead ? ' (mort)' : ''), u.x, u.y - 54, 15, mate ? '#2f5d8a' : '#4a3b2a', 'center', 'rgba(236,224,196,0.82)');
    }
  };

  // ================= Mise en place de l'interface =================
  const baseInit = UI.init;
  UI.init = function () {
    baseInit();
    const ui = $('ui');
    ui.insertAdjacentHTML('beforeend', `
      <div id="chat" class="live"><div id="chatlog"></div>
        <div id="chatin" hidden><button id="chatch" title="Changer de canal (Tab)">Tous</button><input id="chatinput" maxlength="200" autocomplete="off" spellcheck="false" placeholder="Message… Entrée : envoyer · Échap : fermer · Tab : canal"></div></div>
      <div id="party" class="sk" hidden></div>
      <div id="invites"></div>`);
    $('info').insertAdjacentHTML('beforeend', '<div id="netline" hidden></div>');
    $('netline').addEventListener('click', (e) => { if (e.target.closest('[data-players]')) UI.openPanel('players'); });
    $('chatch').onclick = () => { Net.chatCh = Net.chatCh === 'party' || !Net.party ? 'all' : 'party'; renderCh(); $('chatinput').focus(); };
    const inp = $('chatinput');
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); sendChat(inp.value); closeChat(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }
      else if (e.key === 'Tab') { e.preventDefault(); if (Net.party) { Net.chatCh = Net.chatCh === 'party' ? 'all' : 'party'; renderCh(); } }
    });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) closeChat(); }, 120));
    renderNet();
  };
  // Le HUD est reconstruit à chaque scène : on met à jour nos blocs
  const baseOnScene = UI.onScene;
  UI.onScene = function () { baseOnScene(); Net.onScene(); };

  // ================= Options et écran titre =================
  if (Net.available) {
    const at = Input.OPTIONS.findIndex((o) => o.id === 'creator');
    Input.OPTIONS.splice(at < 0 ? Input.OPTIONS.length : at, 0, { id: 'online', name: 'Jouer en ligne', desc: 'Voir les autres héros à Havre-Gris, discuter, former des groupes de 4 et explorer les donjons ensemble.' });
  }
  const baseOptChange = UI.optionsChange;
  UI.optionsChange = function (e) {
    baseOptChange(e);
    const c = e.target.closest && e.target.closest('input[data-opt]');
    if (!c || c.dataset.opt !== 'online') return;
    if (Game.mode === 'title') return;
    if (c.checked) Net.start(Game.char); else { Net.stop(); Net.char = Game.char; }
    renderNet();
    if (UI.refreshLabels) UI.refreshLabels();
  };
  const baseShowTitle = UI.showTitle;
  UI.showTitle = function () {
    Net.stop();
    baseShowTitle();
    if (!Net.available || !G.opt('online')) return;
    const foot = document.querySelector('.tfoot');
    if (foot) foot.insertAdjacentHTML('afterbegin', '<span id="srvstat">Serveur : …</span>');
    fetch('/api/status', { cache: 'no-store' }).then(statusOf).then((d) => {
      const el = $('srvstat');
      if (!el) return;
      if (d && typeof d.online === 'number') el.textContent = 'Serveur en ligne : ' + d.online + ' joueur' + (d.online > 1 ? 's' : '') + ' connecté' + (d.online > 1 ? 's' : '');
      else if (d === 'absent') { el.textContent = 'Pas de serveur de jeu ici : jeu hors ligne'; Net.noServer = true; }
      else el.textContent = 'Serveur injoignable pour le moment';
    }).catch(() => { const el = $('srvstat'); if (el) el.textContent = 'Serveur injoignable : jeu hors ligne'; });
  };

  // ================= Mode créateur : jamais en ligne =================
  const baseCreator = UI.PANELS.creator;
  if (baseCreator) {
    UI.PANELS.creator = function () {
      if (Net.online) return { title: 'Mode créateur', sub: 'Désactivé en ligne', body: '<p style="font-size:19px">Le mode créateur est désactivé quand vous jouez en ligne, pour que les parties à plusieurs restent équitables.</p><p class="muted">Pour l\'utiliser : désactivez « Jouer en ligne » dans les options. Un héros qui l\'a utilisé ne peut plus jouer en ligne.</p>' };
      return baseCreator();
    };
  }
})();
