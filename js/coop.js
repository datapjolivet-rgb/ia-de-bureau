// Donjons à plusieurs (groupes de 2 à 4 joueurs).
// L'ordinateur du chef de groupe (l'« hôte ») fait vivre les monstres. Environ dix fois par seconde, il envoie leur état
// aux autres joueurs (les « membres »), ainsi que chaque attaque ennemie au moment où elle apparaît (zones, projectiles, flaques).
// Chaque joueur reste maître de son héros : il calcule lui-même les coups qu'il reçoit (l'esquive est fidèle à son écran)
// et envoie à l'hôte les dégâts qu'il inflige. Le butin est personnel : chacun reçoit le sien à chaque monstre vaincu.
(function () {
  const D = G.D, W = G.W, Game = G.Game, UI = G.UI;
  const T = D.TILE;
  const $ = (id) => document.getElementById(id);
  const Coop = (G.Coop = {});
  let st = null; // partie à plusieurs en cours

  const Net = () => G.Net;
  const myId = () => (G.Net ? G.Net.myId : null);
  Coop.state = () => st;
  Coop.active = () => !!(st && Game.scene === st.sc);
  Coop.isHost = () => !!(st && st.role === 'host' && Game.scene === st.sc);
  Coop.isMember = () => !!(st && st.role === 'member' && Game.scene === st.sc);
  Coop.hpMul = (n) => 1 + 0.7 * (Math.max(1, n) - 1);

  // ================= Début et fin =================
  // Le serveur annonce le départ du groupe : chacun entre dans le même donjon (même plan, même graine)
  Coop.begin = function (m) {
    const def = D.DUNGEONS[(m.d | 0) - 1];
    if (!def || !def.playable || !Game.char || Game.mode !== 'play') return;
    if (Game.scene && Game.scene.coop) return;
    const role = m.host === myId() ? 'host' : 'member';
    UI.closeConfirm && UI.closeConfirm();
    Game.enterDungeon(def, { role, key: String(m.key || 'g'), host: m.host, size: Math.max(1, Math.min(4, m.size | 0)) });
    UI.toast(role === 'host' ? 'Votre groupe vous suit : ' + def.name : 'Votre chef de groupe ouvre ' + def.name + ' !', '#2f5d8a', 3.5);
  };

  // Appelé par Game.enterDungeon une fois la scène prête
  Coop.start = function (sc) {
    st = {
      role: sc.coop.role, key: sc.coop.key, host: sc.coop.host, sc,
      pup: new Map(), sent: new Map(), rmin: new Map(), need: new Set(),
      out: [], outHost: [], snapT: 0, fullT: 0, needT: 0, revealT: 0, checkT: 0, wipeT: 0,
      env: { wind: null, storm: null, eclipse: null, invert: null }, gateSent: null, ghost: null, ended: false,
      rez: null, rezzing: new Map(), ghostTxt: '', // réanimation : la nôtre, et celles en cours dans le groupe
    };
    hideGhost();
    if (st.role === 'member') G.Net && G.Net.sys('Donjon de groupe : l\'ordinateur de votre chef fait vivre les monstres. Chacun ramasse son propre butin.');
  };

  function stop() {
    if (st && st.sc) st.sc.coop = null;
    st = null;
    hideGhost();
  }

  // Ce joueur quitte le donjon (portail, retour au titre…)
  Coop.onLeave = function (victory) {
    if (!st || st.leaving) return;
    if (st.role === 'host') { queue({ k: 'end', why: 'left', victory: !!(victory || st.sc.victory) }); G.Net && G.Net.flush(); }
    stop();
  };

  // Connexion coupée ou retour au titre
  Coop.onDisconnect = function (intentional) {
    if (!st) return;
    if (intentional || Game.scene !== st.sc) { stop(); return; }
    if (st.role === 'host') becomeSolo('Connexion perdue : vous continuez seul.');
    else hostGone('Connexion au serveur perdue : retour à Havre-Gris.');
  };

  // L'hôte est parti (ou le joueur a été exclu du groupe)
  function hostGone(msg) {
    if (!st) return;
    const sc = st.sc;
    if (Game.scene !== sc) { stop(); return; }
    if (sc.victory && !st.ghost) { becomeSolo('Le chef du groupe est rentré. Ramassez votre butin, puis prenez le portail.'); return; }
    returnToTown(msg);
  }
  function returnToTown(msg) {
    const ghost = st && st.ghost;
    if (st) st.leaving = true;
    stop();
    if (ghost) { Game.enterTown('portal'); UI.showDeath(ghost.lost); }
    else Game.leaveDungeon(false);
    if (msg) setTimeout(() => UI.toast(msg, '#2f5d8a', 4), 50);
  }
  // Plus d'hôte ni de membres : on termine le donjon seul (sans les monstres de l'hôte)
  function becomeSolo(msg) {
    if (!st) return;
    const sc = st.sc, wasMember = st.role === 'member';
    stop();
    sc.units = sc.units.filter((u) => !(u.remote || (wasMember && u.puppet)));
    if (wasMember) { sc.boss = null; sc.hazards = sc.hazards.filter((h) => h.faction !== 'e'); sc.projs = sc.projs.filter((p) => p.faction !== 'e'); sc.zones = sc.zones.filter((z) => z.faction !== 'e' || z.static); sc.wind = null; sc.storm = null; sc.eclipse = null; sc.invert = null; G.UI.bossBar(null); }
    if (Game.player && Game.player.dead) { Game.mode = 'dead'; setTimeout(() => UI.showDeath(sc.deathLost || { items: [], gold: 0, destroyed: null, dungeon: sc.def.name }), 400); }
    if (msg) UI.toast(msg, '#2f5d8a', 4);
  }

  Coop.onParty = function (old, party) {
    if (!st || Game.scene !== st.sc) return;
    const ids = party ? party.members.map((m) => m.id) : [];
    if (st.role === 'member') { if (!ids.includes(st.host)) hostGone('Le chef du groupe est parti : retour à Havre-Gris.'); return; }
    if (!party) becomeSolo('Votre groupe s\'est dissous : vous continuez seul.');
    else removeStrangers(ids);
  };
  function removeStrangers(ids) {
    const sc = st.sc;
    sc.units = sc.units.filter((u) => !(u.remote && ((u.isAlly && !ids.includes(u.netId)) || (u.owner && !ids.includes(u.owner)))));
  }
  Coop.onPeerGone = function (id) {
    if (!st || Game.scene !== st.sc) return;
    if (st.role === 'member' && id === st.host) { hostGone('Le chef du groupe s\'est déconnecté : retour à Havre-Gris.'); return; }
    dropOwner(id);
  };
  Coop.onPeerScene = function (id, s) {
    if (!st || Game.scene !== st.sc || s === st.key) return;
    if (st.role === 'member' && id === st.host) { hostGone('Le chef du groupe a quitté le donjon.'); return; }
    dropOwner(id);
  };
  function dropOwner(id) {
    for (const [k, u] of st.rmin) if (u.owner === id) { u.dead = true; st.rmin.delete(k); }
    for (const [k, r] of st.rezzing) if (r.by === id || k === id) st.rezzing.delete(k);
    st.sc.units = st.sc.units.filter((u) => !(u.remote && (u.netId === id || u.owner === id)));
  }

  // ================= Mort en groupe : le héros tombe au sol, un allié peut le réanimer =================
  Coop.onLocalDeath = function (lost, hardcore) {
    if (!st) return;
    const sc = st.sc;
    if (hardcore) { // le héros est effacé : le donjon s'arrête pour lui (et pour tous si c'est l'hôte)
      if (st.role === 'host') { queue({ k: 'end', why: 'hostdead', victory: !!sc.victory }); G.Net && G.Net.flush(); }
      stop();
      return;
    }
    st.ghost = { lost };
    sc.deathLost = lost;
    st.rezzing.delete(myId()); // une ancienne réanimation (déjà finie) ne compte plus
    G.UI.bossBar(null);
    showGhost();
  };
  function showGhost() {
    let el = $('ghost');
    if (!el) { $('ui').insertAdjacentHTML('beforeend', '<div id="ghost" class="sk live" hidden></div>'); el = $('ghost'); }
    el.hidden = false;
    el.innerHTML = `<b>Vous êtes tombé.</b><span>Un allié peut vous réanimer en restant ${D.REVIVE_TIME} secondes près de votre corps : vous retrouverez alors tout ce que la mort vous a pris.</span>`
      + `<span id="ghostrez" hidden></span><small>Si vous rentrez à Havre-Gris, les pénalités de mort restent appliquées.</small><button class="main" id="ghostgo">Rentrer à Havre-Gris</button>`;
    st.ghostTxt = '';
    $('ghostgo').onclick = () => {
      if (!st) return;
      if (st.role === 'host' && othersInDungeon()) {
        UI.confirm('Rentrer en ville ?', 'Votre ordinateur fait vivre ce donjon : il se terminera pour tout le groupe.', 'Rentrer', () => { if (!st) return; queue({ k: 'end', why: 'hostdead', victory: !!st.sc.victory }); G.Net && G.Net.flush(); returnToTown(); });
      } else returnToTown();
    };
  }
  function hideGhost() { const el = $('ghost'); if (el) el.hidden = true; }
  function othersInDungeon() { return st && st.sc.units.some((u) => u.isAlly && u.remote); }

  // ================= Envoi =================
  function queue(e) { if (st) st.out.push(e); }
  function queueHost(e) { if (st) st.outHost.push(e); }
  // Net.flush rassemble nos événements en un seul message de groupe
  Coop.drain = function (out) {
    if (!st) return;
    if (st.out.length) { out.push({ t: 'g', e: st.out }); st.out = []; }
    if (st.outHost.length) { out.push({ t: 'g', to: st.host, e: st.outHost }); st.outHost = []; }
  };

  // ================= Références aux unités (partagées entre les ordinateurs) =================
  // p:<joueur>  h:<unité de l'hôte>  m:<joueur>:<serviteur d'un membre>
  function ref(u) {
    if (!u) return null;
    if (u.isPlayer) return 'p:' + myId();
    if (u.isAlly && u.remote) return 'p:' + u.netId;
    if (u.rminKey) return 'm:' + u.rminKey;
    if (u.puppet) return 'h:' + u.netId;
    if (u.minion && !u.netCtl && st && st.role === 'member') return 'm:' + myId() + ':' + u.id;
    return 'h:' + u.id;
  }
  function resolve(r) {
    if (!r || typeof r !== 'string' || !st) return null;
    const c = r[0], v = r.slice(2);
    if (c === 'p') return v === myId() ? Game.player : (G.Net && G.Net.avatar(v)) || null;
    if (c === 'h') return st.role === 'host' ? st.sent.get(+v) || null : st.pup.get(+v) || null;
    if (c === 'm') {
      const i = v.indexOf(':'), owner = v.slice(0, i), id = +v.slice(i + 1);
      if (owner === myId()) return st.sc.units.find((u) => u.id === id && !u.netCtl) || null;
      return st.rmin.get(v) || null;
    }
    return null;
  }

  // ================= Copie des attaques (zones, projectiles, flaques) =================
  const SKIP = new Set(['id', 'hit', 'dead', '_n', 'vx', 'vy', 'acc', '_sig']);
  const REFS = ['src', 'follow', 'chase', 'toward'];
  function pack(o) {
    const d = {};
    for (const k in o) {
      if (SKIP.has(k)) continue;
      const v = o[k];
      if (REFS.includes(k)) { if (v) d[k] = ref(v); continue; }
      const t = typeof v;
      if (t === 'number') d[k] = Math.round(v * 100) / 100;
      else if (t === 'string' || t === 'boolean') d[k] = v;
      else if (v && t === 'object' && !Array.isArray(v) && !(v instanceof Set) && !(v instanceof Map) && !v.faction) {
        const o2 = {};
        for (const k2 in v) { const v2 = v[k2]; if (typeof v2 === 'number' || typeof v2 === 'string' || typeof v2 === 'boolean') o2[k2] = v2; }
        d[k] = o2;
      }
    }
    return d;
  }
  function unpack(d, kind, visual) {
    const o = Object.assign({}, d);
    o.id = G.uid(); o._n = 1;
    for (const k of REFS) if (k in o) o[k] = resolve(o[k]);
    if (visual) o.visual = true;
    if (kind === 'p') { o.hit = new Set(); o.vx = Math.cos(o.ang) * o.speed; o.vy = Math.sin(o.ang) * o.speed; if (o.dist == null) o.dist = 0; if (o.pierce == null) o.pierce = 0; }
    if (kind === 'z') o.acc = 0;
    if (kind === 'h' && o.t == null) o.t = 0;
    return o;
  }
  // Ce qu'il faut envoyer : les attaques ennemies (hôte) et nos propres attaques, pour qu'on les voie ailleurs
  function classify(o) {
    if (o.visual || o.derived) return null;
    if (o.faction === 'e') return st.role === 'host' && !o.static ? 'fx' : null;
    const s = o.src;
    if (o.faction === 'p' && s && (s.isPlayer || (s.minion && !s.netCtl))) return 'vfx';
    return null;
  }
  function scan(sc) {
    for (const h of sc.hazards) if (!h._n) { h._n = 1; const k = classify(h); if (k) queue({ k, o: 'h', d: pack(h) }); }
    for (const p of sc.projs) if (!p._n) { p._n = 1; const k = classify(p); if (k) queue({ k, o: 'p', d: pack(p) }); }
    for (const z of sc.zones) if (!z._n) { z._n = 1; const k = classify(z); if (k) queue({ k, o: 'z', d: pack(z) }); }
  }
  function spawnCopy(e, visual) {
    const sc = st.sc, o = unpack(e.d, e.o, visual);
    if (e.o === 'h') sc.hazards.push(o);
    else if (e.o === 'p') sc.projs.push(o);
    else if (e.o === 'z') sc.zones.push(o);
  }

  // ================= Hôte : état des monstres =================
  function defOf(u) {
    const d = { id: u.id, t: u.type, x: Math.round(u.x), y: Math.round(u.y), l: u.lvl, hp: Math.ceil(u.hp), mh: Math.round(u.maxHp), r: Math.round(u.r * 10) / 10 };
    if (u.elite) d.e = 1;
    if (u.affixText) d.af = u.affixText;
    if (u.minion) { d.mn = 1; d.n = u.name; }
    if (u.summoned) d.su = 1;
    if (u.boss) d.b = 1;
    if (u === st.sc.boss) { d.sb = 1; const r = u.bossRoom; if (r) d.room = [r.x, r.y, r.w, r.h]; }
    if (u.dormant) d.dm = 1;
    if (u.hidden) d.hd = 1;
    return d;
  }
  function entry(u) {
    let f = 0;
    if (u.aggro) f |= 1;
    if (u.dormant) f |= 2;
    if (u.hidden) f |= 4;
    if (u.stunT > 0) f |= 8;
    if (u.sleep) f |= 16;
    if (u.shielded) f |= 32;
    if (u.enraged) f |= 64;
    if (u.dash) f |= 128;
    return [u.id, Math.round(u.x), Math.round(u.y), Math.ceil(Math.max(0, u.hp)), Math.round(u.aim * 100), f, u.cast ? u.cast.atk.t : 0, u.phase || 0, (u.swingN || 0) & 255, Math.round(u.maxHp)];
  }
  function snapshot(sc, full) {
    const defs = [], list = [], here = new Set();
    for (const u of sc.units) {
      if (u.isPlayer || u.netCtl || u.dead) continue;
      here.add(u.id);
      if (!st.sent.has(u.id)) { st.sent.set(u.id, u); defs.push(defOf(u)); }
      const e = entry(u), sig = e.join(',');
      if (u.dash && u.dash !== u._dashSent) { u._dashSent = u.dash; queue({ k: 'dash', id: u.id, d: Math.round(u.dash.dmg || 0), w: Math.round(u.dash.width || 30) }); }
      if (!full && u._sig === sig) continue;
      u._sig = sig;
      list.push(e);
    }
    for (const [id, u] of st.sent) if (!here.has(id)) { st.sent.delete(id); if (!u._killSent) queue({ k: 'gone', id }); }
    for (let i = 0; i < defs.length; i += 80) queue({ k: 'def', u: defs.slice(i, i + 80) });
    const ev = { k: 's', u: list };
    if (sc.map.gateLocked !== st.gateSent) { st.gateSent = sc.map.gateLocked; ev.gate = sc.map.gateLocked ? 1 : 0; }
    if (list.length || ev.gate != null) queue(ev);
  }
  function envScan(sc) {
    if (sc.wind !== st.env.wind) { st.env.wind = sc.wind; if (sc.wind && !sc.wind._net) queue({ k: 'wind', d: pack(sc.wind) }); }
    for (const n of ['storm', 'eclipse', 'invert']) if (sc[n] !== st.env[n]) { st.env[n] = sc[n]; queue({ k: 'env', n, d: sc[n] ? pack(sc[n]) : null }); }
  }

  // Appels du moteur (hôte)
  Coop.onKill = function (u) {
    if (!Coop.isHost() || !st.sent.has(u.id)) return;
    u._killSent = true;
    queue({ k: 'kill', id: u.id, x: Math.round(u.x), y: Math.round(u.y) });
  };
  Coop.cancel = function (u) { if (Coop.isHost() && st.sent.has(u.id)) queue({ k: 'cancel', id: u.id }); };
  Coop.toast = function (msg, color, dur) { if (Coop.isHost()) queue({ k: 'toast', m: msg, c: color, d: dur }); };
  Coop.say = function (u, s, color, size) { if (Coop.isHost()) queue({ k: 'say', id: u.id, s, c: color, z: size }); };
  Coop.bossStart = function (b, who) {
    if (!Coop.isHost()) return;
    snapshot(st.sc, false); // le boss doit être connu avant l'annonce
    queue({ k: 'boss', id: b.id, at: [Math.round(who.x), Math.round(who.y)] });
  };

  // ================= Membre : dégâts infligés aux monstres de l'hôte =================
  Coop.hit = function (tgt, amt, o, src) {
    if (!st || st.role !== 'member' || !tgt.puppet) return;
    if (src && src.netCtl) return; // seuls nos propres coups comptent
    const a = Math.round(amt);
    if (a <= 0) return;
    queueHost({ k: 'hit', id: tgt.netId, a, c: o.crit ? 1 : 0, d: o.isDot ? 1 : 0 });
    tgt.pend = tgt.pend || [];
    tgt.pend.push([performance.now(), a]);
    tgt.hp = Math.max(1, tgt.hp - a);
  };
  Coop.hitFx = function (tgt, src, o) {
    if (!st || st.role !== 'member' || !tgt.puppet) return;
    if (!(o.stun || o.slow || o.weaken || o.knock)) return;
    const e = { k: 'hfx', id: tgt.netId };
    if (o.stun) { e.stun = o.stun; if (o.sleep) e.sl = 1; }
    if (o.slow) e.slow = o.slow;
    if (o.weaken) e.wk = o.weaken;
    if (o.knock) { e.kn = o.knock; e.kx = Math.round(o.kx != null ? o.kx : src ? src.x : tgt.x); e.ky = Math.round(o.ky != null ? o.ky : src ? src.y : tgt.y); }
    queueHost(e);
  };

  // ================= Réception =================
  Coop.onMessage = function (m) {
    if (!st || Game.scene !== st.sc || !Array.isArray(m.e)) return;
    const from = m.from;
    for (const e of m.e) {
      if (!e || typeof e !== 'object') continue;
      try { apply(e, from); } catch (err) { console.error(err); }
      if (!st) return;
    }
  };

  function apply(e, from) {
    const sc = st.sc, host = st.role === 'host';
    switch (e.k) {
      // ----- de l'hôte vers les membres -----
      case 'def': if (!host && from === st.host) e.u.forEach(makePuppet); break;
      case 's': if (!host && from === st.host) applySnap(e); break;
      case 'kill': {
        if (host || from !== st.host) break;
        const u = st.pup.get(e.id);
        st.pup.delete(e.id);
        if (u && !u.dead) { u.x = e.x != null ? e.x : u.tx; u.y = e.y != null ? e.y : u.ty; u.hp = 0; Game.killUnit(u, null); }
        break;
      }
      case 'gone': {
        if (host || from !== st.host) break;
        const u = st.pup.get(e.id);
        st.pup.delete(e.id);
        if (u && !u.dead) { u.dead = true; Game.parts(u.x, u.y - 8, 8, '#2b2118', 'puff', 60); }
        break;
      }
      case 'fx': if (!host && from === st.host) spawnCopy(e, false); break;
      case 'cancel': if (!host && from === st.host) { const u = st.pup.get(e.id); if (u) sc.hazards = sc.hazards.filter((h) => !(h.src === u && h.follow)); } break;
      case 'dash': if (!host && from === st.host) { const u = st.pup.get(e.id); if (u) u.dashHit = { dmg: e.d, w: e.w, until: Game.time + 0.7, done: false }; } break;
      case 'wind': if (!host && from === st.host) { const w = Object.assign({}, e.d, { _net: true }); w.toward = resolve(e.d.toward); sc.wind = w; } break;
      case 'env': if (!host && from === st.host) sc[e.n] = e.d ? Object.assign({}, e.d, { visual: true }) : null; break;
      case 'toast': if (!host && from === st.host) UI.toast(String(e.m).slice(0, 160), e.c, e.d); break;
      case 'say': if (!host && from === st.host) { const u = st.pup.get(e.id); if (u) Game.text(u.x, u.y - u.r * 2 - 20, String(e.s).slice(0, 60), e.c, e.z); } break;
      case 'boss': if (!host && from === st.host) bossStart(e); break;
      case 'end': if (!host && from === st.host) hostEnd(e); break;
      // ----- de tous vers tous : effets visuels de nos attaques -----
      case 'vfx': spawnCopy(e, true); break;
      // ----- des membres vers l'hôte -----
      case 'hit': {
        if (!host) break;
        const u = st.sent.get(e.id);
        if (!u || u.dead) break;
        Game.netHit(G.Net.avatar(from), u, Math.max(0, Math.min(1e7, +e.a || 0)), { crit: !!e.c, isDot: !!e.d });
        break;
      }
      case 'hfx': {
        if (!host) break;
        const u = st.sent.get(e.id);
        if (!u || u.dead) break;
        const src = G.Net.avatar(from) || { x: e.kx, y: e.ky };
        Game.hitFx(src, u, { stun: Math.min(5, +e.stun || 0), sleep: !!e.sl, slow: Math.min(0.9, +e.slow || 0), weaken: Math.min(0.9, +e.wk || 0), knock: Math.min(300, +e.kn || 0), kx: e.kx, ky: e.ky });
        break;
      }
      // ----- réanimation d'un héros tombé (de tous vers tous) -----
      case 'rez': {
        const id = typeof e.id === 'string' ? e.id.slice(0, 40) : '';
        if (!id || !from) break;
        if (e.s === 1) {
          st.rezzing.set(id, { by: from, t0: Game.time });
          if (id === myId() && st.ghost) UI.toast(G.Net.nameOf(from) + ' commence à vous réanimer !', '#2f5d8a', 2.5);
        } else {
          const r = st.rezzing.get(id);
          if (r && r.by === from) st.rezzing.delete(id);
          if (e.s === 2 && id === myId()) revived(from);
        }
        break;
      }
      case 'need': if (host && Array.isArray(e.ids)) { const defs = e.ids.slice(0, 200).map((id) => st.sent.get(id)).filter(Boolean).map(defOf); for (let i = 0; i < defs.length; i += 80) queue({ k: 'def', u: defs.slice(i, i + 80) }); } break;
    }
  }

  // ----- Membre : marionnettes des monstres de l'hôte -----
  function makePuppet(d) {
    if (!d || st.pup.has(d.id) || !D.MONSTERS[d.t]) return;
    const sc = st.sc;
    const u = Game.makeMonster(d.t, d.x, d.y, d.l || 1, !!d.e);
    Object.assign(u, {
      netId: d.id, puppet: true, netCtl: true, hp: d.hp, maxHp: d.mh, r: d.r || u.r, tx: d.x, ty: d.y, affixText: d.af || null,
      aggro: false, dormant: !!d.dm, hidden: !!d.hd, summoned: !!d.su, boss: !!d.b, explosive: false, vamp: 0, gcd: 1e9, swingN: 0,
    });
    if (d.mn) { u.faction = 'p'; u.minion = true; u.remote = true; u.boss = false; u.name = d.n || u.name; u.life = 1e9; }
    if (d.sb) { sc.boss = u; if (d.room) u.bossRoom = { x: d.room[0], y: d.room[1], w: d.room[2], h: d.room[3] }; }
    sc.units.push(u);
    st.pup.set(d.id, u);
    st.need.delete(d.id);
  }
  function applySnap(e) {
    const sc = st.sc, now = performance.now(), win = Math.min(700, (G.Net ? G.Net.ping : 150) + 150);
    if (e.gate != null) { sc.map.gateLocked = !!e.gate; sc.map.flowDirty = true; }
    for (const a of e.u) {
      const u = st.pup.get(a[0]);
      if (!u) { st.need.add(a[0]); continue; }
      if (u.dead) continue;
      u.tx = a[1]; u.ty = a[2];
      // vie : celle de l'hôte, moins nos coups qu'il n'a peut-être pas encore comptés
      if (u.pend) { u.pend = u.pend.filter((p) => now - p[0] < win); if (!u.pend.length) u.pend = null; }
      const pending = u.pend ? u.pend.reduce((s, p) => s + p[1], 0) : 0;
      u.hp = a[3] > 0 ? Math.max(1, a[3] - pending) : 1;
      if (a[9]) u.maxHp = a[9];
      u.aim = a[4] / 100; u.facing = Math.cos(u.aim) >= 0 ? 1 : -1;
      const f = a[5];
      u.aggro = !!(f & 1); u.dormant = !!(f & 2); u.hidden = !!(f & 4);
      u.stunT = f & 8 ? 1 : 0; u.sleep = !!(f & 16);
      u.shielded = f & 32 ? u.shielded || { ids: [], t: 99 } : null;
      u.enraged = !!(f & 64); u.dashing = !!(f & 128);
      u.cast = a[6] ? { atk: { t: a[6] }, t: 0, windup: 1 } : null;
      u.phase = a[7] || 0;
      if (a[8] !== (u.swingN & 255)) { u.swingN = a[8]; u.swingT = 1; }
    }
  }
  function bossStart(e) {
    const sc = st.sc, b = st.pup.get(e.id), p = Game.player;
    sc.map.gateLocked = true; sc.map.flowDirty = true;
    if (b) { b.dormant = false; b.aggro = true; G.UI.bossBar(b); Game.ring(b.x, b.y, 200, '#9b2c20', 0.7); }
    Game.shake(8);
    const r = b && b.bossRoom;
    const inside = (u) => r && u.x > (r.x + 0.6) * T && u.x < (r.x + r.w - 0.6) * T && u.y > (r.y + 0.6) * T && u.y < (r.y + r.h - 0.6) * T;
    if (p && !p.dead && r && !inside(p) && Array.isArray(e.at)) {
      // le groupe affronte le boss : on rejoint la salle (la porte se referme)
      const spot = (u) => {
        for (let k = 0; k < 24; k++) {
          const a = Math.random() * G.TAU, d = 20 + Math.random() * 50, x = e.at[0] + Math.cos(a) * d, y = e.at[1] + Math.sin(a) * d;
          if (!W.collides(sc.map, x, y, u.r + 2)) { u.x = x; u.y = y; return; }
        }
        u.x = e.at[0]; u.y = e.at[1];
      };
      Game.parts(p.x, p.y - 8, 12, '#7b5fd0', 'spark', 120);
      spot(p);
      sc.units.forEach((u) => { if (u.minion && !u.netCtl && !u.dead) spot(u); });
      Game.ring(p.x, p.y, 50, '#7b5fd0');
      UI.toast('Votre groupe affronte le boss : vous le rejoignez !', '#2f5d8a', 3);
    }
  }
  function hostEnd(e) {
    if (e.why === 'wipe') { returnToTown('Tout le groupe est tombé…'); return; }
    if (e.victory || st.sc.victory) { if (st.ghost) returnToTown('Le chef du groupe est rentré à Havre-Gris.'); else becomeSolo('Le chef du groupe est rentré. Ramassez votre butin, puis prenez le portail.'); return; }
    returnToTown(e.why === 'hostdead' ? 'Le chef du groupe est tombé : le donjon se termine.' : 'Le chef du groupe a quitté le donjon : retour à Havre-Gris.');
  }

  // ----- Serviteurs des autres joueurs (nécromancien) -----
  Coop.onMinions = function (from, list) {
    if (!st || Game.scene !== st.sc) return;
    const seen = new Set();
    (list || []).slice(0, 24).forEach((a) => {
      if (!Array.isArray(a)) return;
      const [id, type, x, y, hpPct, aim, elite, soul] = a, key = from + ':' + id;
      if (!D.MONSTERS[type]) return;
      seen.add(key);
      let u = st.rmin.get(key);
      if (!u) {
        u = Game.makeMonster(type, x, y, 1, !!elite);
        Object.assign(u, { faction: 'p', minion: true, remote: true, netCtl: true, rminKey: key, owner: from, tx: x, ty: y, affixText: null, boss: false, explosive: false, vamp: 0, name: u.name + (soul ? ' (âme)' : ' (serviteur)'), life: 1e9, aggro: true });
        st.sc.units.push(u);
        st.rmin.set(key, u);
      }
      u.tx = x; u.ty = y; u.aim = +aim || 0; u.facing = Math.cos(u.aim) >= 0 ? 1 : -1; u.maxHp = 100; u.hp = Math.max(1, +hpPct || 1);
    });
    for (const [key, u] of st.rmin) if (u.owner === from && !seen.has(key)) { u.dead = true; Game.parts(u.x, u.y, 8, '#2b2118', 'puff', 60); st.rmin.delete(key); }
  };

  // ================= Chaque image (appelé à la fin de Game.update) =================
  Coop.update = function (sc, dt) {
    if (!st || st.sc !== sc) return;
    const p = Game.player;
    scan(sc);
    if (st.role === 'host') {
      envScan(sc);
      st.snapT += dt; st.fullT += dt;
      if (st.snapT >= 0.1) { st.snapT = 0; const full = st.fullT > 3; if (full) st.fullT = 0; snapshot(sc, full); }
      // chemins vers chaque autre joueur (les monstres contournent les murs pour les atteindre)
      for (const u of sc.units) {
        if (!u.isAlly || !u.remote || u.dead) continue;
        const tx = Math.floor(u.x / T), ty = Math.floor(u.y / T);
        u.flowCd = (u.flowCd || 0) - dt;
        if (u.flowCd > 0) continue;
        if (!u.flow || u.flow.flowT[0] !== tx || u.flow.flowT[1] !== ty || sc.map.flowDirty) { u.flow = u.flow || {}; W.flow(sc.map, tx, ty, u.flow); u.flowCd = 0.25; }
      }
      // tout le groupe est tombé ?
      st.checkT += dt;
      if (st.checkT > 0.5) {
        st.checkT = 0;
        const allies = sc.units.filter((u) => u.isAlly && u.remote);
        if (p && p.dead && allies.every((u) => u.dead)) {
          st.wipeT += 0.5;
          if (st.wipeT >= 2) { queue({ k: 'end', why: 'wipe' }); G.Net && G.Net.flush(); returnToTown(allies.length ? 'Tout le groupe est tombé…' : null); return; }
        } else st.wipeT = 0;
      }
    } else {
      // charges des monstres : chacun vérifie s'il est touché sur son propre écran
      if (p && !p.dead) for (const u of st.pup.values()) {
        const h = u.dashHit;
        if (!h || h.done || u.dead) continue;
        if (Game.time > h.until) { u.dashHit = null; continue; }
        if (Math.hypot(u.x - p.x, u.y - p.y) < h.w / 2 + p.r) { h.done = true; Game.dealDamage(u, p, h.dmg); if (!st) return; }
      }
      st.needT += dt;
      if (st.needT > 0.5 && st.need.size) { st.needT = 0; queueHost({ k: 'need', ids: [...st.need].slice(0, 200) }); }
    }
    if (!st) return;
    updateRez(dt);
    if (!st) return;
    // la carte se dévoile aussi autour des alliés
    st.revealT += dt;
    if (st.revealT > 0.25) { st.revealT = 0; for (const u of sc.units) if (u.isAlly && u.remote && !u.dead) W.reveal(sc.map, u.x, u.y, 7); }
  };

  // ================= Réanimation =================
  // Un héros tombé reste au sol. Un allié vivant s'approche de son corps, appuie sur « interagir » et reste
  // D.REVIVE_TIME secondes sans bouger ni attaquer (les coups reçus n'interrompent pas ; être étourdi, si).
  // L'ordinateur du héros tombé le relève lui-même quand il reçoit le message de réussite.
  const nameOf = (id) => (G.Net ? G.Net.nameOf(id) : 'Un allié');
  function moving() {
    const In = G.Input, v = G.Virt || {};
    return In.held('up') || In.held('down') || In.held('left') || In.held('right') || Math.hypot(v.mx || 0, v.my || 0) > 0.3;
  }
  function startRez(u) {
    const p = Game.player;
    if (!st || st.rez || !p || p.dead || !u || !u.dead) return;
    st.rez = { id: u.netId, name: u.name, t: 0 };
    st.rezzing.set(u.netId, { by: myId(), t0: Game.time });
    queue({ k: 'rez', id: u.netId, s: 1 });
    UI.toast('Vous réanimez ' + u.name + ' : restez près de son corps sans bouger ni attaquer pendant ' + D.REVIVE_TIME + ' secondes.', '#2f5d8a', 3);
  }
  function cancelRez(msg) {
    if (!st || !st.rez) return;
    const id = st.rez.id, r = st.rezzing.get(id);
    st.rez = null;
    if (r && r.by === myId()) st.rezzing.delete(id);
    queue({ k: 'rez', id, s: 0 });
    if (msg) UI.toast(msg, '#9b2c20', 2.5);
  }
  Coop.interrupt = function (why) {
    if (st && st.rez) cancelRez(why === 'attack' ? 'Réanimation interrompue : vous avez attaqué.' : 'Réanimation interrompue.');
  };
  // un allié est en train de nous réanimer ?
  function rezOf(id) {
    const r = st && st.rezzing.get(id);
    return r && Game.time - r.t0 < D.REVIVE_TIME + 2 ? r : null;
  }
  Coop.beingRevived = () => !!(st && st.ghost && rezOf(myId()));
  // touche « interagir » près d'un corps
  Coop.interactions = function (sc, p, consider) {
    if (!st || st.sc !== sc || !p || p.dead) return;
    if (st.rez) { consider(p.x, p.y, 'Arrêter de réanimer (' + Math.max(1, Math.ceil(D.REVIVE_TIME - st.rez.t)) + ' s)', () => cancelRez('Réanimation arrêtée.'), 1); return; }
    for (const u of sc.units) {
      if (!u.isAlly || !u.remote || !u.dead || Game.time - (u.rezT || -99) < 2) continue;
      const r = rezOf(u.netId);
      if (r && r.by !== myId()) consider(u.x, u.y, nameOf(r.by) + ' réanime déjà ' + u.name, () => UI.toast(nameOf(r.by) + ' réanime déjà ' + u.name + '.', '#2f5d8a', 2), D.REVIVE_RANGE);
      else consider(u.x, u.y, 'Réanimer ' + u.name + ' (' + D.REVIVE_TIME + ' s)', () => startRez(u), D.REVIVE_RANGE);
    }
  };
  function updateRez(dt) {
    const p = Game.player, r = st.rez;
    if (r) {
      const u = G.Net && G.Net.avatar(r.id);
      if (!u) cancelRez(r.name + ' n\'est plus dans le donjon.');
      else if (!u.dead) cancelRez(null); // déjà relevé (par un autre allié)
      else if (!p || p.dead) cancelRez(null);
      else if (p.stunT > 0) cancelRez('Réanimation interrompue : vous êtes étourdi.');
      else if (moving()) cancelRez('Réanimation interrompue : il faut rester immobile.');
      else if (Math.hypot(u.x - p.x, u.y - p.y) > D.REVIVE_RANGE + 24) cancelRez('Réanimation interrompue : vous êtes trop loin du corps.');
      else {
        r.t += dt;
        if (r.t >= D.REVIVE_TIME) {
          st.rez = null; st.rezzing.delete(r.id);
          u.rezT = Game.time;
          queue({ k: 'rez', id: r.id, s: 2 });
          G.Net && G.Net.flush();
          Game.ring(u.x, u.y, 60, '#e2c043');
          Game.parts(u.x, u.y - 10, 16, '#e2c043', 'spark', 120);
          UI.toast('Vous avez réanimé ' + r.name + ' !', '#4f8a2a', 3);
        }
      }
    }
    // héros tombé : qui nous réanime, et dans combien de temps
    if (st.ghost) {
      const q = rezOf(myId());
      const txt = q ? nameOf(q.by) + ' vous réanime… ' + Math.max(1, Math.ceil(D.REVIVE_TIME - (Game.time - q.t0))) + ' s' : '';
      if (txt !== st.ghostTxt) { st.ghostTxt = txt; const el = $('ghostrez'); if (el) { el.textContent = txt; el.hidden = !txt; } }
    }
    for (const [id, q] of st.rezzing) if (Game.time - q.t0 > D.REVIVE_TIME + 6) st.rezzing.delete(id);
  }
  // message de réussite reçu : notre ordinateur relève notre héros
  function revived(from) {
    const p = Game.player, sc = st.sc;
    if (!p || !p.dead || !st.ghost || !(G.Net && G.Net.avatar(from))) return;
    const lost = st.ghost.lost;
    st.ghost = null; sc.deathLost = null; st.ghostTxt = '';
    st.rezzing.delete(myId());
    hideGhost();
    if (!Game.revivePlayer(lost)) return;
    UI.toast(nameOf(from) + ' vous a réanimé ! Vous retrouvez tout ce que la mort vous avait pris.', '#4f8a2a', 4);
  }

  // ----- dessin des corps -----
  function corpses(sc) {
    const list = [], p = Game.player;
    if (p && p.dead && st.ghost) list.push(p);
    for (const u of sc.units) if (u.isAlly && u.remote && u.dead) list.push(u);
    return list;
  }
  const corpseId = (u) => (u.isPlayer ? myId() : u.netId);
  // progression d'une réanimation (0 à 1), vue par ce joueur
  function rezProgress(u) {
    const id = corpseId(u);
    if (st.rez && st.rez.id === id) return st.rez.t / D.REVIVE_TIME;
    const r = rezOf(id);
    return r ? Math.min(1, (Game.time - r.t0) / D.REVIVE_TIME) : -1;
  }
  // au sol (avant les héros debout) : le corps et, pendant une réanimation, un anneau doré qui se remplit
  Coop.drawCorpses = function (g, sc, vis) {
    if (!st || st.sc !== sc) return;
    for (const u of corpses(sc)) {
      if (!vis(u.x, u.y, 60)) continue;
      G.R.heroCorpse(g, u);
      const k = rezProgress(u);
      if (k < 0) continue;
      g.save();
      g.lineCap = 'round';
      g.globalAlpha = 0.3; g.strokeStyle = '#2b2118'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(u.x, u.y - 2, 36, 14, 0, 0, G.TAU); g.stroke();
      g.globalAlpha = 0.95; g.strokeStyle = '#e2c043'; g.lineWidth = 5;
      g.beginPath(); g.ellipse(u.x, u.y - 2, 36, 14, 0, -Math.PI / 2, -Math.PI / 2 + G.TAU * Math.max(0.01, k)); g.stroke();
      g.restore();
    }
  };
  // par-dessus : le nom sous le corps (loin du nom des héros debout), le temps restant au-dessus
  Coop.drawCorpseInfo = function (g, sc, vis) {
    if (!st || st.sc !== sc) return;
    const S = G.S;
    for (const u of corpses(sc)) {
      if (!vis(u.x, u.y, 90)) continue;
      S.text(g, (u.isPlayer ? 'Vous' : u.name) + ' — à terre', u.x, u.y + 25, 15, '#7a2734', 'center', 'rgba(236,224,196,0.85)');
      const k = rezProgress(u);
      if (k >= 0) S.text(g, 'Réanimation… ' + Math.max(1, Math.ceil(D.REVIVE_TIME * (1 - k))) + ' s', u.x, u.y - 78, 18, '#8a6a10', 'center', 'rgba(236,224,196,0.9)');
    }
  };
})();
