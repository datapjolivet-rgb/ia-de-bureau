// Grimoire des âmes du nécromancien : la liste des boss vaincus qu'il peut invoquer (touche F, ou case « Âme » de la barre d'action).
(function () {
  const D = G.D, Game = G.Game, UI = G.UI, R = G.R;
  const esc = G.esc;
  const Souls = (G.Souls = {});
  const portraits = {};

  // Portrait d'un boss (dessiné une fois) ; en silhouette s'il n'a pas encore été vaincu
  function portrait(type, locked) {
    const key = type + (locked ? '|x' : '');
    if (portraits[key]) return portraits[key];
    const c = document.createElement('canvas');
    c.width = c.height = 176;
    const g = c.getContext('2d');
    try {
      const u = Game.makeMonster(type, 0, 0, 1, false);
      u.aggro = true; u.dormant = false; u.facing = 1; u.aim = 0.35; u.walk = 0; u.swingT = 0; u.stunT = 0; u.hitT = 0; u.cast = null;
      const s = Math.min(1.5, 40 / u.r);
      g.save(); g.translate(88, 150); g.scale(s, s);
      R.unit(g, u);
      g.restore();
    } catch (e) { /* dessin indisponible */ }
    if (locked) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(43, 33, 24, 0.9)'; g.fillRect(0, 0, 176, 176);
      g.globalCompositeOperation = 'source-over';
    }
    portraits[key] = c.toDataURL();
    return portraits[key];
  }

  // État pour la barre d'action et l'aide
  Souls.state = function () {
    const ch = Game.char, sc = Game.scene;
    const list = Game.souls(ch);
    const out = Game.soulOut && Game.soulOut();
    return { any: list.length > 0, n: list.length, out, used: !!(sc && sc.soulUsed), can: !Game.soulCheck() };
  };
  Souls.tip = function () {
    const st = Souls.state(), key = esc(G.Input.label('summon'));
    let now;
    if (!st.any) now = 'Aucune âme pour l\'instant : vainquez un boss pour qu\'il rejoigne votre grimoire.';
    else if (st.out) now = '<span style="color:var(--heal)">' + esc(st.out.def.name) + ' vous accompagne. Mana bloqué.</span>';
    else if (st.used) now = 'Âme déjà invoquée dans ce donjon.';
    else now = st.n + ' âme' + (st.n > 1 ? 's' : '') + ' dans votre grimoire.';
    return `<h4>Grimoire des âmes</h4><div class="muted">Touche ${key}</div><hr>Invoquez un boss que vous avez vaincu. Une fois par donjon, jamais en ville ni dans la salle d'un boss. Tant qu'il est là, tout votre mana est bloqué. Il n'a que ${Math.round(Game.SOUL.hp * 100)} % de sa vie et ${Math.round(Game.SOUL.dmg * 100)} % de ses dégâts.<hr>${now}`;
  };

  // ----- la fenêtre -----
  UI.PANELS.grimoire = function () {
    const ch = Game.char, sc = Game.scene, key = esc(G.Input.label('summon'));
    if (!ch || ch.cls !== 'necromancien') return { title: 'Grimoire des âmes', sub: '', body: '<p>Seul le nécromancien possède un grimoire des âmes.</p>' };
    const owned = Game.souls(ch), out = Game.soulOut(), why = Game.soulCheck();
    let status;
    if (out) status = `<div class="say"><b>${esc(out.def.name)}</b> vous accompagne (${G.fmt(Math.max(0, out.hp))} / ${G.fmt(out.maxHp)} vie). Votre mana est bloqué tant qu'il reste.<div class="row" style="margin-top:8px"><button class="danger" data-soulback="1">Renvoyer l'âme (le mana revient)</button></div></div>`;
    else if (!owned.length) status = '<div class="say">Votre grimoire est vide. Chaque boss que vous vaincrez y laissera son âme.</div>';
    else status = `<div class="say">${why ? esc(why) : 'Choisissez l\'âme à invoquer.'}</div>`;
    const cards = D.DUNGEONS.filter((d) => d.boss && D.MONSTERS[d.boss]).map((d) => {
      const t = d.boss, m = D.MONSTERS[t], has = owned.includes(t);
      if (!has) return `<div class="soul lock"><img src="${portrait(t, true)}" alt=""><b>???</b><small>Vaincre le boss du donjon ${d.id}</small></div>`;
      const st = Game.soulStats(t);
      const btn = out && out.type === t ? '<span class="pill" style="color:var(--heal)">invoqué</span>'
        : `<button class="main" data-soul="${esc(t)}" ${why ? 'disabled title="' + esc(why) + '"' : ''}>Invoquer</button>`;
      return `<div class="soul"><img src="${portrait(t, false)}" alt=""><b>${esc(m.name)}</b><small>Donjon ${d.id} · vie ${G.fmt(st.hp)} · dégâts ${G.fmt(st.dmg)}</small>${btn}</div>`;
    }).join('');
    return {
      title: 'Grimoire des âmes', sub: owned.length + ' / 15 âmes · touche ' + G.Input.shortLabel('summon'),
      body: `<p class="muted" style="margin:0 0 8px;font-size:16px">Une invocation par donjon, jamais en ville ni dans la salle d'un boss. Pendant que l'âme est là, tout votre mana est bloqué (l'attaque de base reste possible). L'âme n'a que ${Math.round(Game.SOUL.hp * 100)} % de la vie et ${Math.round(Game.SOUL.dmg * 100)} % des dégâts du vrai boss, et n'utilise pas les pouvoirs qui vous gêneraient. Si elle tombe, elle reviendra au prochain donjon.</p>${status}<div class="soulgrid">${cards}</div>`,
    };
  };
  UI.panelClick.grimoire = function (e) {
    const b = e.target.closest('button');
    if (!b) return false;
    if (b.dataset.soul) { if (Game.summonSoul(b.dataset.soul)) UI.closePanel(); else UI.refreshPanel(); return true; }
    if (b.dataset.soulback) { Game.dismissSoul(); UI.refreshPanel(); return true; }
    return false;
  };
  Souls.toggle = function () {
    const ch = Game.char;
    if (!ch || ch.cls !== 'necromancien') { Game.warn('Seul le nécromancien possède un grimoire des âmes.'); return; }
    if (UI.currentPanel() === 'grimoire') UI.closePanel(); else UI.openPanel('grimoire');
  };
})();
