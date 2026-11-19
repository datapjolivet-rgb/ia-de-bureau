// Portail de connexion (sur le site du jeu seulement) : un compte = un pseudo réservé + un mot de passe.
// Les héros du compte sont gardés sur le serveur : on les retrouve sur n'importe quel appareil.
// Une copie reste sur l'appareil (jeu hors ligne) ; elle repart vers le serveur dès que la connexion revient.
// Sans compte, on peut toujours jouer en solo, avec les héros de l'appareil (comme avant).
(function () {
  const UI = G.UI, esc = G.esc;
  const $ = (id) => document.getElementById(id);
  const KS = 'valdorne-compte';
  const Compte = (G.Compte = { nom: null, jeton: null, dispo: false, sansCompte: false, mode: 'connexion', attente: false });
  const vide = () => ({ v: 1, chars: [], last: 0, updated: 0, graveyard: [] });
  const lire = () => { try { return JSON.parse(localStorage.getItem(KS)); } catch (e) { return null; } };
  const ecrire = (v) => { try { if (v) localStorage.setItem(KS, JSON.stringify(v)); else localStorage.removeItem(KS); } catch (e) { /* stockage bloqué */ } };
  const auth = () => ({ authorization: 'Bearer ' + Compte.jeton });
  function requete(url, opt, ms) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 8000);
    return fetch(url, Object.assign({ cache: 'no-store', signal: c.signal }, opt)).finally(() => clearTimeout(t));
  }
  function utiliser(nom) { // sauvegarde de l'appareil : celle du compte, ou celle « sans compte »
    const Save = G.Save;
    Save.useKey(nom); Save.data = vide(); Save.initLocal();
  }

  // ----- au démarrage -----
  Compte.demarrer = async function () {
    const Save = G.Save;
    if (!(G.Net && G.Net.available)) { Save.initLocal(); return; }
    const st = lire();
    let r = null;
    try { r = await requete('/api/compte/moi', { headers: st && st.jeton ? { authorization: 'Bearer ' + st.jeton } : {} }, 6000); } catch (e) { r = null; }
    if (!r) { // pas de réseau : on joue avec la copie de l'appareil
      if (st && st.jeton) { Compte.dispo = true; Compte.nom = st.nom; Compte.jeton = st.jeton; utiliser(st.nom); return; }
      utiliser(null); return;
    }
    if (r.status === 404 || !(r.headers.get('content-type') || '').includes('json')) { utiliser(null); return; } // pas de serveur de comptes ici
    Compte.dispo = true;
    if (r.ok && st && st.jeton) {
      const d = await r.json().catch(() => ({}));
      Compte.nom = d.nom || st.nom; Compte.jeton = st.jeton;
      await charger();
      return;
    }
    if (st) ecrire(null); // session expirée
    utiliser(null);
  };

  // héros du compte : ceux du serveur (ou la copie de l'appareil si le serveur ne répond pas)
  async function charger() {
    const Save = G.Save;
    utiliser(Compte.nom);
    try {
      const r = await requete('/api/compte/sauvegarde', { headers: auth() });
      if (r.status === 401) { deconnecte('Session expirée : reconnectez-vous.'); return false; }
      if (!r.ok) return true;
      const d = await r.json();
      if (d.donnees) { Save.data = Save.clean(JSON.parse(d.donnees)); try { localStorage.setItem('valdorne-save-v1@' + Compte.nom, d.donnees); } catch (e) { /* plein */ } }
      else if (Save.data.chars.length) Compte.envoyer(JSON.stringify(Save.data)); // copie locale jamais envoyée
    } catch (e) { /* hors ligne : la copie de l'appareil suffit */ }
    return true;
  }

  // ----- envoi de la sauvegarde (regroupé, et repris quand la connexion revient) -----
  let attente = null, envoi = false, timer = null;
  Compte.envoyer = function (json) {
    if (!Compte.jeton) return;
    attente = json; Compte.attente = true;
    clearTimeout(timer); timer = setTimeout(pousser, 1200);
  };
  async function pousser() {
    if (envoi || !attente || !Compte.jeton) return;
    const json = attente; attente = null; envoi = true;
    try {
      const r = await requete('/api/compte/sauvegarde', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, auth()), body: json }, 15000);
      if (r.status === 401) { attente = json; UI.toast && UI.toast('Session expirée : reconnectez-vous pour enregistrer vos héros sur le serveur.', '#9b2c20', 5); }
      else if (!r.ok) attente = attente || json;
    } catch (e) { attente = attente || json; } // hors ligne : on réessaiera
    envoi = false;
    Compte.attente = !!attente;
    if (attente) { clearTimeout(timer); timer = setTimeout(pousser, 30000); }
  }
  window.addEventListener('online', () => { if (attente) pousser(); });
  window.addEventListener('pagehide', () => { if (attente && Compte.jeton) try { fetch('/api/compte/sauvegarde', { method: 'PUT', keepalive: true, headers: Object.assign({ 'content-type': 'application/json' }, auth()), body: attente }); } catch (e) { /* tant pis */ } });

  function deconnecte(msg) {
    ecrire(null); Compte.nom = Compte.jeton = null; attente = null;
    if (G.Net && G.Net.stop) G.Net.stop();
    utiliser(null);
    if (msg && UI.toast) UI.toast(msg, '#9b2c20', 4);
  }
  Compte.deconnexion = function () {
    if (Compte.jeton) requete('/api/compte/deconnexion', { method: 'POST', headers: auth() }).catch(() => {});
    deconnecte(null);
    Compte.sansCompte = false;
    UI.showTitle();
  };

  // ----- l'écran de connexion -----
  UI.showLogin = function (mode) {
    Compte.mode = mode || Compte.mode;
    const ins = Compte.mode === 'inscription';
    const tv = UI.frame('login', `
      <div id="title-logo" class="mini">Chroniques de Valdorne</div>
      <div class="row ltabs"><button data-m="connexion" class="${ins ? '' : 'main'}">Se connecter</button><button data-m="inscription" class="${ins ? 'main' : ''}">Créer un compte</button></div>
      <label class="lf">Pseudo<input id="lnom" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="3 à 16 caractères"></label>
      <label class="lf">Mot de passe<input id="lmdp" type="password" maxlength="128" autocomplete="${ins ? 'new-password' : 'current-password'}" placeholder="${ins ? '6 caractères au moins' : ''}"></label>
      ${ins ? '<label class="lf">Confirmer le mot de passe<input id="lmdp2" type="password" maxlength="128" autocomplete="new-password"></label>' : ''}
      <p class="lerr" id="lerr" role="alert"></p>
      <div class="row"><button class="main" id="cgo">${ins ? 'Créer mon compte' : 'Se connecter'}</button></div>
      <p class="muted lnote">${ins ? 'Votre pseudo vous est réservé. Pas d\'e-mail : notez bien votre mot de passe, il ne peut pas être récupéré.' : 'Vos héros sont gardés sur le serveur : retrouvez-les sur n\'importe quel appareil.'}</p>
      <button class="lsans" data-sans="1">Jouer sans compte (solo, héros de cet appareil)</button>`, 'narrow');
    tv.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.m) { UI.showLogin(b.dataset.m); return; }
      if (b.dataset.sans) { Compte.sansCompte = true; UI.showTitle(); return; }
      if (b.id === 'cgo') valider();
    };
    setTimeout(() => { const i = $('lnom'); if (i && G.Input.mode !== 'pad') i.focus(); }, 40);
  };
  async function valider() {
    const nom = ($('lnom').value || '').trim(), mdp = $('lmdp').value || '', ins = Compte.mode === 'inscription';
    const err = (t) => { const e = $('lerr'); if (e) e.textContent = t; };
    if (!/^[\p{L}\p{N}_-]{3,16}$/u.test(nom)) return err('Le pseudo doit faire 3 à 16 caractères : lettres, chiffres, - ou _.');
    if (mdp.length < 6) return err('Le mot de passe doit faire au moins 6 caractères.');
    if (ins && mdp !== $('lmdp2').value) return err('Les deux mots de passe ne sont pas identiques.');
    const b = $('cgo'); b.disabled = true; b.textContent = 'Un instant…'; err('');
    let r = null, d = {};
    try { r = await requete('/api/compte/' + Compte.mode, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nom, mdp }) }, 15000); d = await r.json().catch(() => ({})); } catch (e) { r = null; }
    if (!r || !r.ok) {
      if ($('cgo')) { $('cgo').disabled = false; $('cgo').textContent = ins ? 'Créer mon compte' : 'Se connecter'; }
      return err(!r ? 'Serveur injoignable. Vérifiez votre connexion, ou jouez sans compte.' : d.erreur || 'Une erreur est survenue.');
    }
    const anon = G.Save.data; // héros de l'appareil « sans compte »
    Compte.nom = d.nom; Compte.jeton = d.jeton; Compte.sansCompte = false;
    ecrire({ nom: d.nom, jeton: d.jeton });
    await charger();
    if (UI.toast) UI.toast((ins ? 'Compte créé. ' : '') + 'Bienvenue, ' + d.nom + ' !', '#4f8a2a', 3);
    const n = (anon.chars || []).length;
    if (!G.Save.data.chars.length && n) {
      UI.titleConfirm('Importer vos héros ?', n + ' héros ' + (n > 1 ? 'sont enregistrés' : 'est enregistré') + ' sur cet appareil (' + anon.chars.map((c) => c.name).slice(0, 4).join(', ') + (n > 4 ? '…' : '') + '). Les ajouter à votre compte « ' + d.nom + ' » ?', 'Importer',
        () => { G.Save.data = anon; G.Save.save(true, true); UI.showTitle(); UI.toast && UI.toast('Héros importés dans votre compte.', '#4f8a2a', 3); },
        () => UI.showTitle());
      return;
    }
    UI.showTitle();
  }

  // le menu de départ : d'abord le portail, puis le nom du compte en bas
  const baseShow = UI.showTitle;
  UI.showTitle = function () {
    if (Compte.dispo && !Compte.nom && !Compte.sansCompte) { UI.showLogin(); return; }
    baseShow();
    const foot = document.querySelector('.tfoot');
    if (!foot || !Compte.dispo) return;
    foot.insertAdjacentHTML('beforeend', Compte.nom
      ? `<span class="lacct">Compte : <b>${esc(Compte.nom)}</b> · <button class="lbtn" data-logout="1">Se déconnecter</button></span>`
      : '<span class="lacct">Sans compte · <button class="lbtn" data-login="1">Se connecter</button></span>');
    foot.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation(); // le même clic ne doit pas atteindre la fenêtre qui s'ouvre
      if (b.dataset.logout) UI.titleConfirm('Se déconnecter ?', 'Vos héros restent enregistrés sur votre compte.', 'Se déconnecter', () => Compte.deconnexion(), () => UI.showTitle());
      if (b.dataset.login) { Compte.sansCompte = false; UI.showLogin('connexion'); }
    };
  };
})();
