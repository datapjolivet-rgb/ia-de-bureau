// Panneau d'administration (comptes « admin » seulement, depuis le menu de départ : « Administration »).
// Le serveur vérifie lui-même le rôle à chaque demande : ce fichier ne fait qu'afficher et envoyer.
//  - En ligne : joueurs connectés, expulser, couper la discussion, annonce à tout le serveur ;
//  - Comptes : rechercher, bannir, couper la discussion, nommer administrateur, nouveau mot de passe, supprimer ;
//  - Héros : voir et modifier les héros d'un compte (niveau, or, potions, donjons, objets) ;
//  - Serveur : chiffres et mode maintenance.
(function () {
  const UI = G.UI, D = G.D, I = G.I, esc = G.esc;
  const $ = (id) => document.getElementById(id);
  const A = (G.Admin = { onglet: 'enligne', q: '', compte: null, save: null, msg: '' });
  const CLS = (c) => (D.CLASSES[c] ? D.CLASSES[c].name : c || '?');
  const LIEU = (s) => (s === 'town' ? 'Havre-Gris' : !s || s === 'off' ? '—' : /^tuto/.test(s) ? 'Camp des recrues' : 'en donjon');
  const date = (t) => (t ? new Date(t).toLocaleDateString('fr-FR') : '—');

  async function api(route, opt) {
    const o = Object.assign({ headers: {} }, opt || {});
    o.headers = Object.assign({ authorization: 'Bearer ' + (G.Compte && G.Compte.jeton) }, o.headers);
    if (o.json) { o.method = o.method || 'POST'; o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(o.json); delete o.json; }
    let r;
    try { r = await fetch('/api/admin/' + route, Object.assign({ cache: 'no-store' }, o)); } catch (e) { throw new Error('Serveur injoignable.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.erreur || 'Erreur ' + r.status);
    return d;
  }
  function note(t, bad) { A.msg = t; const el = $('admmsg'); if (el) { el.textContent = t; el.className = bad ? 'bad' : ''; } }
  async function action(fn, ok) {
    try { await fn(); if (ok) note(ok); await rendre(); }
    catch (e) { note(e.message, true); }
  }

  UI.showAdmin = function (onglet) {
    if (onglet) A.onglet = onglet;
    rendre();
  };

  async function rendre() {
    const tabs = [['enligne', 'En ligne'], ['comptes', 'Comptes'], ['heros', 'Héros'], ['serveur', 'Serveur']];
    let corps = '<p class="muted">Chargement…</p>';
    const tv = UI.frame('admin', `<header class="tvhead"><h2>Administration</h2><button data-back="1">Retour (Échap)</button></header>
      <div class="row adtabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${A.onglet === k ? 'main' : ''}">${n}</button>`).join('')}</div>
      <p id="admmsg"></p><div id="admbody">${corps}</div>`, true);
    tv.onclick = clic;
    note(A.msg); A.msg = '';
    try { corps = await ({ enligne, comptes, heros, serveur })[A.onglet](); }
    catch (e) { corps = `<p class="bad">${esc(e.message)}</p>`; }
    const b = $('admbody'); if (b && G.UI.titleView === 'admin') b.innerHTML = corps;
  }

  // ----- onglets -----
  async function enligne() {
    const d = await api('etat');
    const rows = d.enLigne.map((p) => `<tr><td><b>${esc(p.heros || '(menu)')}</b>${p.admin ? ' <span class="pill">admin</span>' : ''}</td><td>${esc(p.compte)}</td><td>${esc(CLS(p.cls))} ${p.lvl || ''}</td><td>${esc(LIEU(p.scene))}</td>
      <td class="acts"><button data-mute="${esc(p.compte)}" data-v="${p.muet ? 0 : 1}">${p.muet ? 'Rendre la parole' : 'Couper la parole'}</button><button class="danger" data-kick="${esc(p.id)}">Expulser</button></td></tr>`).join('');
    return `<div class="admbox"><label>Annonce à tous les joueurs connectés<span class="row"><input id="admann" maxlength="200" placeholder="Ex. : redémarrage du serveur dans 5 minutes"><button class="main" data-annonce="1">Envoyer</button></span></label></div>
      <h3>${d.enLigne.length} joueur${d.enLigne.length > 1 ? 's' : ''} connecté${d.enLigne.length > 1 ? 's' : ''}</h3>
      ${rows ? `<table class="admt"><tr><th>Héros</th><th>Compte</th><th>Classe</th><th>Lieu</th><th></th></tr>${rows}</table>` : '<p class="muted">Personne n\'est connecté en ce moment.</p>'}`;
  }
  async function comptes() {
    const d = await api('comptes?q=' + encodeURIComponent(A.q));
    const rows = d.comptes.map((c) => {
      const st = [c.role === 'admin' ? 'admin' : '', c.banni ? 'banni' : '', c.muet ? 'muet' : '', c.enLigne ? 'en ligne' : ''].filter(Boolean).map((s) => `<span class="pill ${s === 'banni' ? 'bad' : ''}">${s}</span>`).join(' ');
      const n = esc(c.nom);
      return `<tr><td><b>${n}</b> ${st}</td><td>${date(c.cree)}</td><td>${date(c.maj)}</td>
        <td class="acts"><button data-voir="${n}">Héros</button><button data-mute="${n}" data-v="${c.muet ? 0 : 1}">${c.muet ? 'Parole' : 'Muet'}</button>
        <button data-ban="${n}" data-v="${c.banni ? 0 : 1}" class="${c.banni ? '' : 'danger'}">${c.banni ? 'Débannir' : 'Bannir'}</button>
        <button data-adm="${n}" data-v="${c.role === 'admin' ? 0 : 1}">${c.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}</button>
        <button data-mdp="${n}">Mot de passe</button><button class="danger" data-del="${n}">Supprimer</button></td></tr>`;
    }).join('');
    return `<div class="row admbox"><input id="admq" value="${esc(A.q)}" placeholder="Rechercher un pseudo" data-enter="admchercher"><button id="admchercher" data-chercher="1">Rechercher</button></div>
      <h3>${d.comptes.length} compte${d.comptes.length > 1 ? 's' : ''}${A.q ? ' trouvés' : ''}</h3>
      ${rows ? `<table class="admt"><tr><th>Pseudo</th><th>Créé</th><th>Dernière sauvegarde</th><th></th></tr>${rows}</table>` : '<p class="muted">Aucun compte.</p>'}`;
  }
  async function heros() {
    if (!A.compte) return '<p>Choisissez un compte dans l\'onglet « Comptes » (bouton « Héros »), ou tapez son pseudo :</p><div class="row admbox"><input id="admhc" placeholder="Pseudo" data-enter="admhcgo"><button id="admhcgo" class="main" data-hc="1">Ouvrir</button></div>';
    const d = await api('sauvegarde?nom=' + encodeURIComponent(A.compte));
    A.save = d.donnees ? JSON.parse(d.donnees) : null;
    const chars = A.save ? A.save.chars : [];
    const cards = chars.map((ch, k) => `<div class="admhero">
      <h3>${esc(ch.name)} <small>${esc(CLS(ch.cls))}${ch.hardcore ? ' · Hardcore' : ''}${ch.creator ? ' · Créateur' : ''}</small></h3>
      <div class="admf"><label>Niveau<input type="number" min="1" max="${D.MAX_LEVEL}" data-f="lvl" data-k="${k}" value="${ch.lvl}"></label>
      <label>Or<input type="number" min="0" max="999999999" data-f="gold" data-k="${k}" value="${ch.gold}"></label>
      <label>Potions<input type="number" min="0" max="${D.MAX_POTIONS}" data-f="potions" data-k="${k}" value="${ch.potions}"></label>
      <label>Donjons finis<input type="number" min="0" max="15" data-f="cleared" data-k="${k}" value="${ch.cleared}"></label></div>
      <div class="row"><select data-slot="${k}">${D.SLOTS.map((s) => `<option value="${s}">${esc(s)}</option>`).join('')}</select>
      <select data-rar="${k}">${D.RARITY.map((r, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
      <button data-give="${k}">Donner un objet</button><button class="danger" data-delh="${k}">Supprimer ce héros</button></div>
      <p class="muted">Sac : ${(ch.bag || []).length} / ${D.BAG_SIZE} objets · ${ch.deaths || 0} mort${(ch.deaths || 0) > 1 ? 's' : ''}</p></div>`).join('');
    return `<div class="row"><h3 style="margin:0">Héros du compte « ${esc(d.nom)} »</h3><button data-hclose="1">Changer de compte</button></div>
      ${cards || '<p class="muted">Ce compte n\'a pas encore de héros.</p>'}
      ${chars.length ? '<div class="row"><button class="main" data-hsave="1">Enregistrer les modifications</button></div><p class="muted">Le joueur, s\'il est connecté, est déconnecté pour retrouver la nouvelle version de ses héros.</p>' : ''}`;
  }
  async function serveur() {
    const d = await api('etat');
    return `<div class="admstats"><div><b>${d.enLigne.length}</b> connecté${d.enLigne.length > 1 ? 's' : ''}</div><div><b>${d.comptes}</b> comptes</div><div><b>${d.sauvegardes}</b> avec des héros</div><div><b>${d.bannis}</b> banni${d.bannis > 1 ? 's' : ''}</div><div><b>${d.admins}</b> admin${d.admins > 1 ? 's' : ''}</div><div><b>${d.sessions}</b> sessions ouvertes</div></div>
      <div class="admbox"><h3>Mode maintenance : ${d.maintenance ? '<span class="bad">activé</span>' : 'désactivé'}</h3>
      <p class="muted">Activé, seuls les administrateurs peuvent jouer en ligne ; les autres joueurs connectés sont déconnectés (le solo reste possible).</p>
      <button class="${d.maintenance ? 'main' : 'danger'}" data-maint="${d.maintenance ? 0 : 1}">${d.maintenance ? 'Rouvrir le serveur' : 'Activer la maintenance'}</button></div>`;
  }

  // ----- clics -----
  function lireHeros() {
    if (!A.save) return;
    document.querySelectorAll('#admbody input[data-f]').forEach((el) => {
      const ch = A.save.chars[+el.dataset.k], f = el.dataset.f, max = +el.max, v = Math.max(+el.min || 0, Math.min(max, Math.round(+el.value || 0)));
      ch[f] = v;
      if (f === 'lvl') ch.xp = 0;
    });
  }
  function clic(e) {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset, C = (t, txt, ok, fn) => UI.titleConfirm(t, txt, ok, () => action(fn, ok + ' : fait.'), () => rendre());
    if (d.back) { UI.showTitle(); return; }
    if (d.tab) { A.onglet = d.tab; rendre(); return; }
    if (d.annonce) { const t = ($('admann').value || '').trim(); if (t) action(() => api('annonce', { json: { texte: t } }), 'Annonce envoyée.'); return; }
    if (d.kick) { C('Expulser ce joueur ?', 'Il sera déconnecté du jeu en ligne (il pourra revenir).', 'Expulser', () => api('expulser', { json: { id: d.kick } })); return; }
    if (d.mute) { action(() => api('muet', { json: { nom: d.mute, muet: d.v === '1' } }), d.v === '1' ? 'Discussion coupée.' : 'Parole rendue.'); return; }
    if (d.chercher) { A.q = ($('admq').value || '').trim(); rendre(); return; }
    if (d.voir) { A.compte = d.voir; A.onglet = 'heros'; rendre(); return; }
    if (d.ban) { if (d.v === '1') C('Bannir « ' + d.ban + ' » ?', 'Il est déconnecté et ne pourra plus se connecter tant qu\'il est banni.', 'Bannir', () => api('bannir', { json: { nom: d.ban, banni: true } })); else action(() => api('bannir', { json: { nom: d.ban, banni: false } }), 'Compte débanni.'); return; }
    if (d.adm) { C(d.v === '1' ? 'Rendre « ' + d.adm + ' » administrateur ?' : 'Retirer le rôle d\'administrateur ?', d.v === '1' ? 'Il aura accès à ce panneau et pourra tout contrôler.' : 'Il n\'aura plus accès à ce panneau.', 'Confirmer', () => api('role', { json: { nom: d.adm, admin: d.v === '1' } })); return; }
    if (d.mdp) {
      const tv = UI.frame('admin', `<h2>Nouveau mot de passe</h2><p>Pour le compte « ${esc(d.mdp)} ». Ses sessions ouvertes seront fermées.</p><label class="lf">Mot de passe (6 caractères au moins)<input id="admmdp" type="text" maxlength="128" autocomplete="off"></label><div class="row"><button class="main" id="cgo">Enregistrer</button><button data-annul="1">Annuler</button></div>`, 'narrow');
      tv.onclick = (ev) => { const x = ev.target.closest('button'); if (!x) return; if (x.dataset.annul) { rendre(); return; } if (x.id === 'cgo') action(() => api('mdp', { json: { nom: d.mdp, mdp: $('admmdp').value } }), 'Mot de passe changé.'); };
      return;
    }
    if (d.del) { C('Supprimer le compte « ' + d.del + ' » ?', 'Le compte et tous ses héros sont effacés pour toujours.', 'Supprimer', () => api('supprimer', { json: { nom: d.del } })); return; }
    if (d.hc) { A.compte = ($('admhc').value || '').trim() || null; rendre(); return; }
    if (d.hclose) { A.compte = null; A.save = null; rendre(); return; }
    if (d.give) {
      lireHeros();
      const ch = A.save.chars[+d.give], slot = document.querySelector(`select[data-slot="${d.give}"]`).value, rar = +document.querySelector(`select[data-rar="${d.give}"]`).value;
      if ((ch.bag || []).length >= D.BAG_SIZE) { note('Le sac de ' + ch.name + ' est plein.', true); return; }
      const it = I.make({ cls: ch.cls, slot, rarity: rar, ilvl: ch.lvl });
      (ch.bag = ch.bag || []).push(it);
      note(I.fullName(it) + ' ajouté au sac de ' + ch.name + '. Enregistrez pour valider.');
      return;
    }
    if (d.delh) { lireHeros(); const ch = A.save.chars[+d.delh]; C('Supprimer ' + ch.name + ' ?', 'Le héros est effacé du compte « ' + A.compte + ' » dès l\'enregistrement.', 'Supprimer', () => { A.save.chars.splice(+d.delh, 1); A.save.last = 0; return api('sauvegarde?nom=' + encodeURIComponent(A.compte), { method: 'PUT', body: JSON.stringify(A.save) }); }); return; }
    if (d.hsave) { lireHeros(); action(() => api('sauvegarde?nom=' + encodeURIComponent(A.compte), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(A.save) }), 'Héros enregistrés.'); return; }
    if (d.maint) { C(d.maint === '1' ? 'Activer la maintenance ?' : 'Rouvrir le serveur ?', d.maint === '1' ? 'Les joueurs connectés (sauf les administrateurs) seront déconnectés.' : 'Tout le monde pourra de nouveau jouer en ligne.', 'Confirmer', () => api('maintenance', { json: { on: d.maint === '1' } })); }
  }
})();
