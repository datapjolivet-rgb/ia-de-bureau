// Grimoire des âmes du nécromancien (touche F, ou case « Âme » de la barre d'action) :
// - les âmes des boss vaincus (une invocation par donjon, mana bloqué, boss très affaibli) ;
// - les meutes : n'importe quel monstre déjà réanimé avec « Relever les morts », invoqué par 5 (60 de mana, recharge de 45 s).
(function () {
  const D = G.D, Game = G.Game, UI = G.UI, R = G.R;
  const esc = G.esc;
  const Souls = (G.Souls = { tab: 'boss' });
  const portraits = {};

  // Portrait d'un monstre (dessiné une fois) ; en silhouette s'il n'a pas encore été vaincu
  function portrait(type, locked, size) {
    size = size || 176;
    const key = type + '|' + size + (locked ? '|x' : '');
    if (portraits[key]) return portraits[key];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    try {
      const u = Game.makeMonster(type, 0, 0, 1, false);
      u.aggro = true; u.dormant = false; u.facing = 1; u.aim = 0.35; u.walk = 0; u.swingT = 0; u.stunT = 0; u.hitT = 0; u.cast = null; u.hidden = false;
      const s = Math.min(3, (0.24 * size) / u.r); // le monstre occupe à peu près les trois quarts du portrait
      g.save(); g.translate(size / 2, size * 0.85); g.scale(s, s);
      R.unit(g, u);
      g.restore();
    } catch (e) { /* dessin indisponible */ }
    if (locked) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(43, 33, 24, 0.9)'; g.fillRect(0, 0, size, size);
      g.globalCompositeOperation = 'source-over';
    }
    portraits[key] = c.toDataURL();
    return portraits[key];
  }

  // Donjon où l'on rencontre chaque monstre (pour ranger les meutes)
  let origin = null;
  function originOf(type) {
    if (!origin) {
      origin = {};
      D.DUNGEONS.forEach((d) => {
        (d.rooms || []).forEach((r) => G.W.parseSpawns(r[4] || '').forEach((sp) => { if (sp.type && origin[sp.type] == null) origin[sp.type] = d.id; }));
        const b = D.MONSTERS[d.boss];
        if (b) (b.phases || [{ atks: b.atks || [] }]).forEach((ph) => (ph.atks || []).forEach((a) => {
          if (a.mon && origin[a.mon] == null) origin[a.mon] = d.id;
          (a.adds || []).forEach(([m]) => { if (origin[m] == null) origin[m] = d.id; });
        }));
      });
    }
    return origin[type] || 99;
  }

  // État pour la barre d'action et l'aide
  Souls.state = function () {
    const ch = Game.char, sc = Game.scene, p = Game.player;
    const list = Game.souls(ch), packs = Game.packTypes(ch);
    const out = Game.soulOut && Game.soulOut();
    return {
      any: list.length > 0 || packs.length > 0, n: list.length, packs: packs.length, out, used: !!(sc && sc.soulUsed),
      can: !Game.soulCheck() || !Game.packCheck(), packCd: p ? Math.max(0, p.packCd || 0) : 0,
    };
  };
  Souls.tip = function () {
    const st = Souls.state(), key = esc(G.Input.label('summon')), P = Game.PACK;
    let now = [];
    if (!st.any) now.push('Grimoire vide : vainquez des boss et réanimez des monstres pour qu\'ils le rejoignent.');
    if (st.out) now.push('<span style="color:var(--heal)">' + esc(st.out.def.name) + ' vous accompagne. Mana bloqué.</span>');
    else if (st.used) now.push('Âme de boss déjà invoquée dans ce donjon.');
    if (st.packCd > 0) now.push('Meutes : encore ' + Math.ceil(st.packCd) + ' s.');
    return `<h4>Grimoire des âmes</h4><div class="muted">Touche ${key} (Maj + ${key} : la dernière meute)</div><hr>
      <b>Boss vaincus</b> : un par donjon, jamais en ville ni dans la salle d'un boss ; tout le mana est bloqué tant qu'il est là.<br>
      <b>Meutes</b> : les monstres que vous avez réanimés, par ${P.n}, pour ${P.cost} de mana (recharge ${P.cd} s).${now.length ? '<hr>' + now.join('<br>') : ''}`;
  };

  // ----- la fenêtre -----
  function bossTab(ch) {
    const owned = Game.souls(ch), out = Game.soulOut(), why = Game.soulCheck();
    let status;
    if (out) status = `<div class="say"><b>${esc(out.def.name)}</b> vous accompagne (${G.fmt(Math.max(0, out.hp))} / ${G.fmt(out.maxHp)} vie). Votre mana est bloqué tant qu'il reste.<div class="row" style="margin-top:8px"><button class="danger" data-soulback="1">Renvoyer l'âme (le mana revient)</button></div></div>`;
    else if (!owned.length) status = '<div class="say">Aucun boss vaincu pour l\'instant. Chaque boss que vous vaincrez y laissera son âme.</div>';
    else status = `<div class="say">${why ? esc(why) : 'Choisissez l\'âme à invoquer.'}</div>`;
    const cards = D.DUNGEONS.filter((d) => d.boss && D.MONSTERS[d.boss]).map((d) => {
      const t = d.boss, m = D.MONSTERS[t], has = owned.includes(t);
      if (!has) return `<div class="soul lock"><img src="${portrait(t, true)}" alt=""><b>???</b><small>Vaincre le boss du donjon ${d.id}</small></div>`;
      const st = Game.soulStats(t);
      const btn = out && out.type === t ? '<span class="pill" style="color:var(--heal)">invoqué</span>'
        : `<button class="main" data-soul="${esc(t)}" ${why ? 'disabled title="' + esc(why) + '"' : ''}>Invoquer</button>`;
      return `<div class="soul"><img src="${portrait(t, false)}" alt=""><b>${esc(m.name)}</b><small>Donjon ${d.id} · vie ${G.fmt(st.hp)} · dégâts ${G.fmt(st.dmg)}</small>${btn}</div>`;
    }).join('');
    return `<p class="muted" style="margin:0 0 8px;font-size:16px">Une invocation de boss par donjon, jamais en ville ni dans la salle d'un boss. Pendant que l'âme est là, tout votre mana est bloqué (l'attaque de base reste possible). Elle n'a que ${Math.round(Game.SOUL.hp * 100)} % de la vie et ${Math.round(Game.SOUL.dmg * 100)} % des dégâts du vrai boss. Si elle tombe ou repart, elle reviendra au prochain donjon.</p>${status}<div class="soulgrid">${cards}</div>`;
  }
  function packTab(ch) {
    const P = Game.PACK, owned = Game.packTypes(ch), why = Game.packCheck(), lvl = Game.packLvl();
    const all = Game.packAll(), unknown = all.length - owned.length;
    const alive = Game.scene ? Game.scene.units.filter((u) => u.pack && !u.dead && !u.netCtl).length : 0;
    const status = `<div class="say">${why ? esc(why) : 'Choisissez la meute à invoquer.'}${alive ? ` <b>${alive}</b> âme${alive > 1 ? 's' : ''} de meute vous accompagne${alive > 1 ? 'nt' : ''}.` : ''}</div>`;
    const list = owned.slice().sort((a, b) => originOf(a) - originOf(b) || D.MONSTERS[a].name.localeCompare(D.MONSTERS[b].name));
    const cards = list.map((t) => {
      const m = D.MONSTERS[t], st = Game.packStats(t, lvl), o = originOf(t);
      return `<div class="soul small"><img src="${portrait(t, false, 112)}" alt=""><b>${esc(m.name)}</b><small>${o < 99 ? 'Donjon ' + o + ' · ' : ''}×${P.n} · vie ${G.fmt(st.hp)} · dégâts ${G.fmt(st.dmg)}</small><button class="main" data-pack="${esc(t)}" ${why ? 'disabled title="' + esc(why) + '"' : ''}>Invoquer</button></div>`;
    }).join('');
    return `<p class="muted" style="margin:0 0 8px;font-size:16px">Les monstres que vous avez déjà réanimés avec « Relever les morts », par ${P.n}, pour ${P.cost} de mana (recharge ${P.cd} s), autant de fois que vous voulez dans les donjons. Ils ont ${Math.round(P.hp * 100)} % de leur vie et ${Math.round(P.dmg * 100)} % de leurs dégâts, au niveau du donjon (${lvl}). Ils restent jusqu'à leur mort, ou la vôtre ; ${P.max} au plus en même temps (les plus anciens repartent). Maj + ${esc(G.Input.label('summon'))} : invoquer la dernière meute.</p>${status}
      ${cards ? `<div class="soulgrid packs">${cards}</div>` : '<p>Aucun monstre réanimé pour l\'instant : utilisez « Relever les morts » sur un cadavre.</p>'}${unknown > 0 ? `<p class="muted" style="margin:8px 0 0">${unknown} monstre${unknown > 1 ? 's' : ''} pas encore réanimé${unknown > 1 ? 's' : ''} : relevez-les une fois pour qu'ils rejoignent le grimoire.</p>` : ''}`;
  }
  UI.PANELS.grimoire = function () {
    const ch = Game.char;
    if (!ch || ch.cls !== 'necromancien') return { title: 'Grimoire des âmes', sub: '', body: '<p>Seul le nécromancien possède un grimoire des âmes.</p>' };
    const tabs = `<div class="row" style="margin:0 0 10px"><button data-gtab="boss" class="${Souls.tab === 'boss' ? 'main' : ''}">Âmes de boss (${Game.souls(ch).length} / 15)</button><button data-gtab="mobs" class="${Souls.tab === 'mobs' ? 'main' : ''}">Meutes (${Game.packTypes(ch).length} / ${Game.packAll().length})</button></div>`;
    return { title: 'Grimoire des âmes', sub: 'Touche ' + G.Input.shortLabel('summon'), body: tabs + (Souls.tab === 'mobs' ? packTab(ch) : bossTab(ch)) };
  };
  UI.panelClick.grimoire = function (e) {
    const b = e.target.closest('button');
    if (!b) return false;
    if (b.dataset.gtab) { Souls.tab = b.dataset.gtab; UI.refreshPanel(); return true; }
    if (b.dataset.soul) { if (Game.summonSoul(b.dataset.soul)) UI.closePanel(); else UI.refreshPanel(); return true; }
    if (b.dataset.pack) { if (Game.summonPack(b.dataset.pack)) UI.closePanel(); else UI.refreshPanel(); return true; }
    if (b.dataset.soulback) { Game.dismissSoul(); UI.refreshPanel(); return true; }
    return false;
  };
  Souls.toggle = function () {
    const ch = Game.char;
    if (!ch || ch.cls !== 'necromancien') { Game.warn('Seul le nécromancien possède un grimoire des âmes.'); return; }
    if (UI.currentPanel() === 'grimoire') UI.closePanel(); else UI.openPanel('grimoire');
  };
  // Maj + touche : la dernière meute, sans ouvrir le grimoire
  Souls.quick = function () {
    const ch = Game.char;
    if (!ch || ch.cls !== 'necromancien') { Game.warn('Seul le nécromancien possède un grimoire des âmes.'); return; }
    if (!Game.lastPack) { Game.warn('Aucune meute invoquée pour l\'instant : choisissez-en une dans le grimoire.'); return; }
    Game.summonPack(Game.lastPack);
  };
})();
