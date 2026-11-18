// Mode créateur : tous les objets du jeu, le héros au maximum, tous les donjons, téléportation, monstres à volonté.
// S'active dans les Options ; s'ouvre en jeu avec la touche C (ou depuis la pause).
(function () {
  const D = G.D, I = G.I, W = G.W, UI = G.UI, Game = G.Game;
  const T = D.TILE;
  const $ = (id) => document.getElementById(id);
  const esc = G.esc;
  const C = { tab: 'objets', rarity: 4, ilvl: 0, up: 10, leg: '', equip: false, spawn: 'brasier', spawnN: 1, bound: '' };
  const SLOT_ORDER = ['tete', 'torse', 'mains', 'jambes', 'pieds', 'anneau', 'amulette'];

  const mark = () => { const ch = Game.char; ch.creator = true; ch.cheats = ch.cheats || {}; };
  const saveNow = () => G.Save && G.Save.save(true, true);
  function say(text, color) { const el = $('crmsg'); if (el) { el.textContent = text; el.style.color = color || 'var(--violet)'; } }
  function after(text, color) { UI.refreshPanel(); say(text, color); saveNow(); }

  // ----- objets -----
  function makeItem(slot, base) {
    const ch = Game.char;
    const it = I.make({ cls: ch.cls, slot, rarity: C.rarity, ilvl: C.ilvl || ch.lvl });
    it.base = base;
    if (C.rarity === 4) it.name = '« ' + (C.leg || G.pick(D.LEGENDARY)) + ' »';
    else if (C.rarity === 0) it.name = base;
    else it.name = base + ' ' + G.pick(D.SUFFIX);
    it.up = C.up;
    return it;
  }
  function giveItem(it, equip) {
    const ch = Game.char;
    if (!equip && ch.bag.length >= D.BAG_SIZE) return false;
    ch.bag.push(it);
    if (equip) Game.equip(ch.bag.length - 1);
    if (ch.bag.length > D.BAG_SIZE) ch.bag.length = D.BAG_SIZE; // l'ancien objet ne rentre plus
    Game.refreshStats();
    return true;
  }
  function weaponBases() {
    const own = D.WEAPONS[Game.char.cls] || [];
    const others = [];
    D.CLASS_ORDER.forEach((k) => (D.WEAPONS[k] || []).forEach((b) => { if (!own.includes(b) && !others.includes(b)) others.push(b); }));
    return { own, others };
  }
  function cell(slot, base) {
    const col = D.RARITY[C.rarity].color;
    return `<button class="crit" data-crslot="${slot}" data-crbase="${esc(base)}" style="border-color:${col}" title="${esc(base)}"><img src="${G.Icons.item({ slot, base, rarity: C.rarity })}" alt=""><span>${esc(base)}</span></button>`;
  }
  function itemsTab(ch) {
    const lvl = C.ilvl || ch.lvl, w = weaponBases();
    const rar = D.RARITY.map((r, i) => `<button class="rarbtn${C.rarity === i ? ' sel' : ''}" data-crrar="${i}" style="color:${r.color};border-color:${r.color}">${r.name}</button>`).join('');
    const ups = Array.from({ length: 11 }, (_, i) => `<option value="${i}" ${C.up === i ? 'selected' : ''}>+${i}</option>`).join('');
    const legs = '<option value="">au hasard</option>' + D.LEGENDARY.map((n) => `<option ${C.leg === n ? 'selected' : ''}>${esc(n)}</option>`).join('');
    let h = `<div class="crset"><span class="row" style="gap:6px">${rar}</span>
      <label>Niveau d'objet <input type="number" min="1" max="60" value="${lvl}" data-cr="ilvl"></label>
      <label>Forge <select data-cr="up">${ups}</select></label>
      ${C.rarity === 4 ? `<label>Nom <select data-cr="leg">${legs}</select></label>` : ''}
      <label class="row" style="gap:6px"><input type="checkbox" data-cr="equip" ${C.equip ? 'checked' : ''}> Équiper directement</label></div>
      <p class="muted" style="margin:0 0 6px;font-size:15px">Cliquez sur un objet pour le créer${C.equip ? ' et l\'équiper' : ' dans votre sac'}. Les caractéristiques suivent la rareté, le niveau et la forge choisis.</p>`;
    h += `<div class="crsec">Armes de ${D.CLASSES[ch.cls].name.toLowerCase()}</div><div class="crgrid">${w.own.map((b) => cell('arme', b)).join('')}</div>`;
    h += `<div class="crsec">Autres armes</div><div class="crgrid">${w.others.map((b) => cell('arme', b)).join('')}</div>`;
    SLOT_ORDER.forEach((s) => { h += `<div class="crsec">${D.SLOT_NAMES[s]}</div><div class="crgrid">${D.BASES[s].map((b) => cell(s, b)).join('')}</div>`; });
    h += `<div class="crrow"><button class="main" data-cract="legset">Équipement légendaire complet +10 (niveau ${lvl})</button><button class="danger" data-cract="clearbag">Vider le sac</button></div>`;
    return h;
  }

  // ----- héros -----
  function heroTab(ch) {
    const ck = ch.cheats || {};
    const tog = (id, name, desc) => `<label class="orow"><input type="checkbox" data-crcheat="${id}" ${ck[id] ? 'checked' : ''}><span class="oswitch"></span><span><b>${name}</b><br><span class="muted">${desc}</span></span></label>`;
    const bosses = Object.entries(D.MONSTERS).filter(([, m]) => m.boss);
    return `<div class="crrow"><b class="crlab">Niveau</b><input type="number" id="cr-lvl" min="1" max="${D.MAX_LEVEL}" value="${ch.lvl}" data-enter="cr-lvlgo">
        <button id="cr-lvlgo" data-cract="lvl">Appliquer</button><button data-cract="lvlmax">Niveau maximum (${D.MAX_LEVEL})</button></div>
      <div class="crrow"><b class="crlab">Or</b><button data-cract="gold" data-n="10000">+10 000 or</button><button data-cract="gold" data-n="1000000">+1 000 000 or</button><span class="gold">${G.fmt(ch.gold)} or</span></div>
      <div class="crrow"><b class="crlab">Sorts</b><button data-cract="spells">Tous les sorts au rang 3</button><button data-cract="talents">Tous les talents au maximum</button></div>
      <div class="crrow"><b class="crlab">Soins</b><button data-cract="potions">Potions au maximum</button><button data-cract="heal">Vie et ressource au maximum</button></div>
      ${ch.cls === 'necromancien' ? `<div class="crrow"><b class="crlab">Serviteur</b><select data-cr="bound"><option value="">aucun boss lié</option>${bosses.map(([k, m]) => `<option value="${k}" ${ch.boundBoss === k ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select><span class="muted">Le boss lié combat à vos côtés pendant votre prochain donjon.</span></div>` : ''}
      <div class="olist" style="margin-top:6px">${tog('god', 'Invincible', 'Aucun dégât, aucun gel, aucun sommeil.')}${tog('dmg', 'Dégâts ×10', 'Vos attaques et vos sorts frappent dix fois plus fort.')}${tog('nocd', 'Sorts sans recharge ni coût', 'Les sorts se relancent presque aussitôt et ne coûtent rien.')}</div>`;
  }

  // ----- monde -----
  function spawnOptions() {
    const seen = new Set(['dummy', 'runeStone']);
    const groups = D.DUNGEONS.map((d) => {
      const list = [];
      const add = (k) => { if (k && D.MONSTERS[k] && !seen.has(k)) { seen.add(k); list.push(k); } };
      add(d.boss);
      d.rooms.forEach((r) => W.parseSpawns(r[4]).forEach((sp) => add(sp.type)));
      list.slice().forEach((k) => { const m = D.MONSTERS[k]; if (m.split) add(m.split.into); (m.phases ? m.phases.flatMap((p) => p.atks) : m.atks).forEach((a) => { if (a.mon) add(a.mon); if (a.adds) a.adds.forEach(([n]) => add(n)); }); });
      return { name: d.id + '. ' + d.name, list };
    });
    const rest = Object.keys(D.MONSTERS).filter((k) => !seen.has(k));
    if (rest.length) groups.push({ name: 'Autres', list: rest });
    return groups.map((g) => `<optgroup label="${esc(g.name)}">${g.list.map((k) => `<option value="${k}" ${C.spawn === k ? 'selected' : ''}>${esc(D.MONSTERS[k].name)}${D.MONSTERS[k].boss ? ' (boss)' : ''}</option>`).join('')}</optgroup>`).join('');
  }
  function worldTab(ch, sc) {
    const inD = sc.kind === 'dungeon';
    let h = `<div class="crrow"><button class="main" data-cract="unlock">Débloquer les 15 donjons</button><span class="muted">Donjons vaincus : ${ch.cleared}/15</span></div>
      <div class="crsec">Aller dans un donjon</div><div class="crdun">${D.DUNGEONS.map((d) => `<button data-crgo="${d.id}">${d.id}. ${esc(d.name)}</button>`).join('')}</div>`;
    if (inD) {
      h += `<div class="crsec">Dans ce donjon</div><div class="crrow"><button data-cract="toboss">Aller au boss</button><button data-cract="killboss">Vaincre le boss</button>
        <button data-cract="killall">Éliminer les monstres</button><button data-cract="reveal">Révéler la carte</button><button data-cract="town">Retour à Havre-Gris</button></div>
        <div class="crsec">Faire apparaître des monstres</div><div class="crrow"><select data-cr="spawn">${spawnOptions()}</select>
        <label>Nombre <input type="number" min="1" max="10" value="${C.spawnN}" data-cr="spawnN"></label><button class="main" data-cract="spawn">Faire apparaître</button></div>`;
    } else h += '<p class="muted">Dans un donjon, vous pourrez aussi aller directement au boss, éliminer les monstres, révéler la carte et faire apparaître n\'importe quel monstre ou boss.</p>';
    return h;
  }

  UI.PANELS.creator = function () {
    const ch = Game.char, sc = Game.scene;
    const tabs = [['objets', 'Tous les objets'], ['heros', 'Héros'], ['monde', 'Donjons et monstres']];
    const head = `<div class="ctabs">${tabs.map(([id, n]) => `<button data-ctab="${id}" class="${C.tab === id ? 'main' : ''}">${n}</button>`).join('')}<span class="muted" style="margin-left:auto">Sac : ${ch.bag.length}/${D.BAG_SIZE}</span></div><div class="msg" id="crmsg"></div>`;
    const body = C.tab === 'objets' ? itemsTab(ch) : C.tab === 'heros' ? heroTab(ch) : worldTab(ch, sc);
    return { title: 'Mode créateur', sub: 'Tout est permis. Le héros qui s\'en sert porte le badge « Créateur ».', body: head + body };
  };

  // ----- clics -----
  UI.panelClick.creator = function (e) {
    const ch = Game.char, sc = Game.scene, p = Game.player;
    const b = e.target.closest('button');
    if (!b) return false;
    if (b.dataset.ctab) { C.tab = b.dataset.ctab; UI.refreshPanel(); return true; }
    if (b.dataset.crrar != null) { C.rarity = +b.dataset.crrar; UI.refreshPanel(); return true; }
    if (b.dataset.crslot) {
      mark();
      const it = makeItem(b.dataset.crslot, b.dataset.crbase);
      if (!giveItem(it, C.equip)) { say('Sac plein : videz-le ou cochez « Équiper directement ».', 'var(--blood)'); return true; }
      after((C.equip ? 'Équipé : ' : 'Créé : ') + I.fullName(it), D.RARITY[it.rarity].color);
      return true;
    }
    if (b.dataset.crgo) {
      mark();
      const d = D.DUNGEONS[+b.dataset.crgo - 1];
      ch.cleared = Math.max(ch.cleared, d.id - 1);
      UI.closePanel();
      if (sc.kind === 'dungeon') { ch.bag.forEach((it) => delete it.run); D.SLOTS.forEach((s) => ch.equip[s] && delete ch.equip[s].run); }
      Game.enterDungeon(d);
      saveNow();
      return true;
    }
    const act = b.dataset.cract;
    if (!act) return false;
    mark();
    const lvlTo = (n) => { ch.lvl = G.clamp(Math.round(n), 1, D.MAX_LEVEL); ch.xp = 0; Game.refreshStats(); p.hp = p.maxHp; };
    switch (act) {
      case 'legset': {
        const keep = { rarity: C.rarity, up: C.up };
        C.rarity = 4; C.up = 10;
        D.SLOTS.forEach((s) => { const base = s === 'arme' ? G.pick(D.WEAPONS[ch.cls]) : G.pick(D.BASES[s]); giveItem(makeItem(s, base), true); });
        C.rarity = keep.rarity; C.up = keep.up;
        p.hp = p.maxHp;
        after('Équipement légendaire +10 complet !', D.RARITY[4].color);
        break;
      }
      case 'clearbag': ch.bag = []; Game.refreshStats(); after('Sac vidé.'); break;
      case 'lvl': lvlTo(+$('cr-lvl').value || ch.lvl); after('Niveau ' + ch.lvl + '.'); break;
      case 'lvlmax': lvlTo(D.MAX_LEVEL); after('Niveau maximum atteint.'); break;
      case 'gold': ch.gold += +b.dataset.n; after('+' + G.fmt(+b.dataset.n) + ' or.', 'var(--gold)'); break;
      case 'spells': ch.abil = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }; G.UI.onScene(); UI.openPanel('creator'); after('Tous les sorts sont au rang 3.'); break;
      case 'talents': D.TALENTS.forEach((t) => { if (!t.cls || t.cls === ch.cls) ch.talents[t.id] = t.max; }); Game.refreshStats(); after('Tous les talents sont au maximum.'); break;
      case 'potions': ch.potions = D.MAX_POTIONS; after('Potions au maximum.'); break;
      case 'heal': p.hp = p.maxHp; p.res = p.resMax; after('Vie et ressource au maximum.'); break;
      case 'unlock': ch.cleared = Math.max(ch.cleared, 14); after('Les 15 donjons sont ouverts au portail.'); break;
      case 'toboss': {
        const bo = sc.boss;
        if (!bo || bo.dead) { say('Le boss de ce donjon est déjà vaincu.', 'var(--blood)'); break; }
        const r = bo.bossRoom; let x = (r.x + r.w / 2) * T, y = (r.y + r.h - 1.6) * T;
        for (let k = 0; k < 30 && W.collides(sc.map, x, y, p.r + 2); k++) y -= 16;
        p.x = x; p.y = y; W.reveal(sc.map, x, y, 9);
        Game.cam.x = p.x - Game.W / 2; Game.cam.y = p.y - Game.H / 2;
        UI.closePanel();
        break;
      }
      case 'killboss': {
        const bo = sc.boss;
        if (!bo || bo.dead) { say('Le boss de ce donjon est déjà vaincu.', 'var(--blood)'); break; }
        bo.dormant = false; bo.shielded = null; bo.hidden = false;
        Game.killUnit(bo, p);
        UI.closePanel();
        break;
      }
      case 'killall': {
        const list = sc.units.filter((u) => u.faction === 'e' && !u.dead && !u.boss && !u.dummyUnit);
        list.forEach((u) => { u.dormant = false; u.hidden = false; Game.killUnit(u, p); });
        after(list.length + ' monstre' + (list.length > 1 ? 's' : '') + ' éliminé' + (list.length > 1 ? 's' : '') + '. Le butin est resté là où ils étaient.');
        break;
      }
      case 'reveal': {
        const m = sc.map;
        for (let y = 0; y < m.h + 8; y += 8) for (let x = 0; x < m.w + 8; x += 8) W.reveal(m, x * T, y * T, 8);
        after('Toute la carte est révélée.');
        break;
      }
      case 'town': UI.closePanel(); Game.leaveDungeon(false); break;
      case 'spawn': {
        const n = Game.spawnMonster(C.spawn, G.clamp(C.spawnN, 1, 10));
        UI.closePanel();
        if (n) G.UI.toast(D.MONSTERS[C.spawn].name + (n > 1 ? ' ×' + n : '') + ' apparaît !', '#7b3fa6', 2);
        break;
      }
      default: return false;
    }
    return true;
  };

  // ----- réglages (listes, cases, nombres) -----
  UI.panelChange.creator = function (e) {
    const el = e.target, ch = Game.char;
    if (el.dataset.crcheat) {
      mark();
      ch.cheats[el.dataset.crcheat] = el.checked;
      say((el.checked ? 'Activé : ' : 'Désactivé : ') + el.closest('label').querySelector('b').textContent);
      saveNow();
      return;
    }
    const k = el.dataset.cr;
    if (!k) return;
    if (k === 'ilvl') C.ilvl = G.clamp(+el.value || ch.lvl, 1, 60);
    else if (k === 'up') C.up = +el.value;
    else if (k === 'leg') C.leg = el.value;
    else if (k === 'equip') C.equip = el.checked;
    else if (k === 'spawn') C.spawn = el.value;
    else if (k === 'spawnN') C.spawnN = G.clamp(+el.value || 1, 1, 10);
    else if (k === 'bound') { mark(); ch.boundBoss = el.value || null; say(el.value ? D.MONSTERS[el.value].name + ' vous servira pendant votre prochain donjon.' : 'Aucun boss lié.'); saveNow(); return; }
    if (k === 'ilvl' || k === 'equip') UI.refreshPanel();
  };
})();
