// Serveur multijoueur des Chroniques de Valdorne (Cloudflare Workers + Durable Objects).
// - Le Worker sert le jeu (dossier public/) et envoie les connexions WebSocket au « monde ».
// - Le Durable Object World est le monde partagé : joueurs connectés, ville, discussion,
//   groupes de 4, et relais des données de donjon entre les membres d'un groupe.
//   Le serveur ne fait tourner aucun monstre : en donjon, c'est l'ordinateur du chef de groupe qui le fait.
import { DurableObject } from 'cloudflare:workers';
import SITE from './site.js'; // la page et les scripts du jeu (générés par build.js)

const MAX_PARTY = 4;
const MAX_MSG_PER_SEC = 60;
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64url = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// empreinte d'un jeton de session (SHA-256)
const sha = async (t) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))));
// empreinte d'un mot de passe : PBKDF2-SHA256, 100 000 tours, sel aléatoire
async function empreinte(mdp, sel) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(mdp), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sel), iterations: 100000 }, k, 256);
  return hex(new Uint8Array(bits));
}
// comparaison en temps constant
function egal(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Connexion WebSocket attendue.', { status: 426 });
      return env.WORLD.getByName('monde-v2').fetch(request);
    }
    if (url.pathname === '/api/status' || url.pathname.startsWith('/api/compte/') || url.pathname.startsWith('/api/admin/')) {
      try { return await env.WORLD.getByName('monde-v2').fetch(request); }
      catch (e) { return Response.json({ erreur: 'Serveur indisponible, réessayez dans un instant.', detail: String(e && e.message || e).slice(0, 300) }, { status: 503 }); }
    }
    if (url.pathname.startsWith('/api/')) return new Response('Inconnu.', { status: 404 });
    return serveFile(request, url);
  },
};

// Fichiers du jeu : la page n'est jamais gardée en cache sans vérification ; les scripts, numérotés, le sont longtemps.
// Les images (icônes de l'application) sont rangées en base64 dans site.js : on les décode une fois.
const bytes = new Map();
function bodyOf(path, f) {
  if (!f.b64) return f.body;
  let b = bytes.get(path);
  if (!b) { const s = atob(f.b64); b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); bytes.set(path, b); }
  return b;
}
function serveFile(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Méthode non permise.', { status: 405 });
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const f = SITE[path];
  if (!f) return new Response('Page introuvable.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const etag = '"' + f.etag + '"';
  const headers = {
    'content-type': f.type, etag,
    'cache-control': f.immutable && url.searchParams.get('v') === f.etag ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : bodyOf(path, f), { headers });
}

export class World extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // État en mémoire. Si l'objet hiberne, il est reconstruit à partir des pièces jointes des connexions.
    this.meta = new Map(); // WebSocket -> { id, name, cls, lvl, party, leader, scene }
    this.pos = new Map(); //  WebSocket -> dernière position connue en ville
    this.rate = new Map(); // WebSocket -> [seconde, compteur]
    this.gone = new WeakSet(); // connexions terminées
    this.tries = new Map(); // adresse ou compte -> [début de la fenêtre, essais] (limite les essais de mot de passe)
    // Comptes des joueurs : pseudo, mot de passe (empreinte PBKDF2 salée, jamais le mot de passe lui-même),
    // sessions (seule l'empreinte du jeton est gardée) et sauvegarde des héros.
    const sql = ctx.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS comptes (cle TEXT PRIMARY KEY, nom TEXT NOT NULL, sel TEXT NOT NULL, empreinte TEXT NOT NULL, cree INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS sessions (jeton TEXT PRIMARY KEY, cle TEXT NOT NULL, expire INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS sauvegardes (cle TEXT PRIMARY KEY, donnees TEXT NOT NULL, maj INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS reglages (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
    for (const col of ['role TEXT NOT NULL DEFAULT \'\'', 'banni INTEGER NOT NULL DEFAULT 0', 'muet INTEGER NOT NULL DEFAULT 0']) {
      try { sql.exec('ALTER TABLE comptes ADD COLUMN ' + col); } catch (e) { /* colonne déjà là */ }
    }
    // premier administrateur : le compte « Polux » (déjà créé par le propriétaire du jeu), une seule fois
    // (seulement si ce compte existait avant cette mise à jour : personne ne peut le créer ensuite pour obtenir le rôle)
    if (!sql.exec("SELECT v FROM reglages WHERE k = 'admin-polux'").toArray().length
      && sql.exec("SELECT cle FROM comptes WHERE cle = 'polux' AND cree < ?", Date.parse('2026-11-19T18:00:00Z')).toArray().length) {
      sql.exec("UPDATE comptes SET role = 'admin' WHERE cle = 'polux'");
      sql.exec("INSERT INTO reglages (k, v) VALUES ('admin-polux', '1')");
    }
  }
  reglage(k) { const r = this.ctx.storage.sql.exec('SELECT v FROM reglages WHERE k = ?', k).toArray()[0]; return r ? r.v : null; }
  regler(k, v) { this.ctx.storage.sql.exec('INSERT INTO reglages (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, String(v)); }

  // ---------- comptes ----------
  async compte(request, url) {
    const sql = this.ctx.storage.sql, now = Date.now();
    const json = (o, status = 200) => Response.json(o, { status, headers: { 'cache-control': 'no-store' } });
    const route = url.pathname.slice('/api/compte/'.length);
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    if (route === 'inscription' || route === 'connexion') {
      if (request.method !== 'POST') return json({ erreur: 'Méthode non permise.' }, 405);
      if (!this.essai('ip:' + ip, 30)) return json({ erreur: 'Trop d\'essais. Réessayez dans quelques minutes.' }, 429);
      let b; try { b = await request.json(); } catch (e) { return json({ erreur: 'Demande illisible.' }, 400); }
      const nom = String((b && b.nom) || '').trim(), mdp = String((b && b.mdp) || '');
      if (!/^[\p{L}\p{N}_-]{3,16}$/u.test(nom)) return json({ erreur: 'Le pseudo doit faire 3 à 16 caractères : lettres, chiffres, - ou _.' }, 400);
      if (mdp.length < 6 || mdp.length > 128) return json({ erreur: 'Le mot de passe doit faire au moins 6 caractères.' }, 400);
      const cle = nom.toLocaleLowerCase('fr');
      const row = sql.exec('SELECT nom, sel, empreinte, role, banni FROM comptes WHERE cle = ?', cle).toArray()[0];
      if (route === 'inscription') {
        if (row) return json({ erreur: 'Ce pseudo est déjà pris.' }, 409);
        const sel = hex(crypto.getRandomValues(new Uint8Array(16)));
        sql.exec('INSERT INTO comptes (cle, nom, sel, empreinte, cree) VALUES (?, ?, ?, ?, ?)', cle, nom, sel, await empreinte(mdp, sel), now);
        return json({ nom, jeton: await this.session(cle) }, 201);
      }
      if (!this.essai('compte:' + cle, 10)) return json({ erreur: 'Trop d\'essais pour ce compte. Réessayez dans quelques minutes.' }, 429);
      if (!row || !egal(await empreinte(mdp, row.sel), row.empreinte)) return json({ erreur: 'Pseudo ou mot de passe incorrect.' }, 401);
      if (row.banni) return json({ erreur: 'Ce compte a été banni par un administrateur.' }, 403);
      return json({ nom: row.nom, role: row.role, jeton: await this.session(cle) });
    }
    const who = await this.qui(request);
    if (!who) return json({ erreur: 'Session expirée : reconnectez-vous.' }, 401);
    if (route === 'moi') return json({ nom: who.nom, role: who.role });
    if (route === 'deconnexion') { sql.exec('DELETE FROM sessions WHERE jeton = ?', who.jeton); return json({ ok: true }); }
    if (route === 'sauvegarde') {
      if (request.method === 'GET') {
        const s = sql.exec('SELECT donnees, maj FROM sauvegardes WHERE cle = ?', who.cle).toArray()[0];
        return json({ donnees: s ? s.donnees : null, maj: s ? s.maj : 0 });
      }
      if (request.method === 'PUT') {
        const txt = await request.text();
        if (txt.length > 1500000) return json({ erreur: 'Sauvegarde trop grosse.' }, 413);
        try { const d = JSON.parse(txt); if (!d || !Array.isArray(d.chars)) throw 0; } catch (e) { return json({ erreur: 'Sauvegarde illisible.' }, 400); }
        sql.exec('INSERT INTO sauvegardes (cle, donnees, maj) VALUES (?, ?, ?) ON CONFLICT(cle) DO UPDATE SET donnees = excluded.donnees, maj = excluded.maj', who.cle, txt, now);
        return json({ ok: true, maj: now });
      }
      return json({ erreur: 'Méthode non permise.' }, 405);
    }
    return json({ erreur: 'Inconnu.' }, 404);
  }
  // ---------- administration (comptes ayant le rôle « admin ») ----------
  async admin(request, url) {
    const sql = this.ctx.storage.sql;
    const json = (o, status = 200) => Response.json(o, { status, headers: { 'cache-control': 'no-store' } });
    const who = await this.qui(request);
    if (!who || who.role !== 'admin') return json({ erreur: 'Réservé aux administrateurs.' }, 403);
    const route = url.pathname.slice('/api/admin/'.length), m = request.method;
    let b = {};
    if (m === 'POST' || m === 'PUT') { try { b = route === 'sauvegarde' ? null : await request.json(); } catch (e) { return json({ erreur: 'Demande illisible.' }, 400); } }
    const compte = (nom) => sql.exec('SELECT cle, nom, role, banni, muet, cree FROM comptes WHERE cle = ?', String(nom || '').trim().toLocaleLowerCase('fr')).toArray()[0];
    const sockets = (cle) => this.all().filter((w) => this.info(w).cle === cle);
    const ejecter = (w, texte, code) => { this.send(w, { t: 'kick', text: texte, code: code || 4001 }); try { w.close(code || 4001, 'expulsé'); } catch (e) { /* déjà fermée */ } this.drop(w); };
    switch (route) {
      case 'etat': {
        const enLigne = this.all().map((w) => { const i = this.info(w); return { id: i.id, heros: i.name, compte: i.acct, cls: i.cls, lvl: i.lvl, scene: i.scene, admin: !!i.admin, muet: !!i.muet }; });
        const n = (q) => sql.exec(q).toArray()[0].n;
        return json({ enLigne, comptes: n('SELECT COUNT(*) AS n FROM comptes'), bannis: n('SELECT COUNT(*) AS n FROM comptes WHERE banni = 1'), admins: n("SELECT COUNT(*) AS n FROM comptes WHERE role = 'admin'"),
          sauvegardes: n('SELECT COUNT(*) AS n FROM sauvegardes'), sessions: n('SELECT COUNT(*) AS n FROM sessions WHERE expire > ' + Date.now()), maintenance: this.reglage('maintenance') === '1', moi: who.nom });
      }
      case 'comptes': {
        const q = '%' + String(url.searchParams.get('q') || '').toLocaleLowerCase('fr') + '%';
        const rows = sql.exec('SELECT c.nom, c.role, c.banni, c.muet, c.cree, s.maj, length(s.donnees) AS taille FROM comptes c LEFT JOIN sauvegardes s ON s.cle = c.cle WHERE c.cle LIKE ? ORDER BY c.cree DESC LIMIT 300', q).toArray();
        const ids = new Set(this.all().map((w) => this.info(w).cle));
        return json({ comptes: rows.map((r) => Object.assign(r, { enLigne: ids.has(r.nom.toLocaleLowerCase('fr')) })) });
      }
      case 'annonce': {
        const texte = clean(b.texte, 200); if (!texte) return json({ erreur: 'Message vide.' }, 400);
        const out = JSON.stringify({ t: 'notice', text: '📣 ' + texte, annonce: 1 });
        for (const w of this.all()) this.send(w, out);
        return json({ ok: true, envoye: this.all().length });
      }
      case 'expulser': {
        const w = this.byId(b.id); if (!w) return json({ erreur: 'Ce joueur n\'est plus connecté.' }, 404);
        ejecter(w, 'Vous avez été expulsé par un administrateur.' + (b.raison ? ' Raison : ' + clean(b.raison, 120) : ''));
        return json({ ok: true });
      }
      case 'muet': case 'bannir': case 'role': case 'mdp': case 'supprimer': {
        const c = compte(b.nom); if (!c) return json({ erreur: 'Compte introuvable.' }, 404);
        if (route === 'muet') {
          sql.exec('UPDATE comptes SET muet = ? WHERE cle = ?', b.muet ? 1 : 0, c.cle);
          for (const w of sockets(c.cle)) { const i = this.info(w); i.muet = !!b.muet; this.save(w, i); this.send(w, { t: 'notice', text: b.muet ? 'Un administrateur a coupé votre discussion.' : 'Vous pouvez de nouveau discuter.' }); }
          return json({ ok: true });
        }
        if ((route === 'bannir' || route === 'supprimer' || route === 'role') && c.cle === who.cle && !(route === 'role' && b.admin)) return json({ erreur: 'Impossible sur votre propre compte.' }, 400);
        if (route === 'bannir') {
          sql.exec('UPDATE comptes SET banni = ? WHERE cle = ?', b.banni ? 1 : 0, c.cle);
          if (b.banni) { sql.exec('DELETE FROM sessions WHERE cle = ?', c.cle); for (const w of sockets(c.cle)) ejecter(w, 'Ce compte a été banni par un administrateur.', 4003); }
          return json({ ok: true });
        }
        if (route === 'role') { sql.exec('UPDATE comptes SET role = ? WHERE cle = ?', b.admin ? 'admin' : '', c.cle); for (const w of sockets(c.cle)) { const i = this.info(w); i.admin = !!b.admin; this.save(w, i); } return json({ ok: true }); }
        if (route === 'mdp') {
          const mdp = String(b.mdp || ''); if (mdp.length < 6 || mdp.length > 128) return json({ erreur: 'Le mot de passe doit faire au moins 6 caractères.' }, 400);
          const sel = hex(crypto.getRandomValues(new Uint8Array(16)));
          sql.exec('UPDATE comptes SET sel = ?, empreinte = ? WHERE cle = ?', sel, await empreinte(mdp, sel), c.cle);
          sql.exec('DELETE FROM sessions WHERE cle = ?', c.cle);
          return json({ ok: true });
        }
        for (const w of sockets(c.cle)) ejecter(w, 'Ce compte a été supprimé par un administrateur.', 4003);
        sql.exec('DELETE FROM sessions WHERE cle = ?', c.cle); sql.exec('DELETE FROM sauvegardes WHERE cle = ?', c.cle); sql.exec('DELETE FROM comptes WHERE cle = ?', c.cle);
        return json({ ok: true });
      }
      case 'sauvegarde': {
        const c = compte(url.searchParams.get('nom')); if (!c) return json({ erreur: 'Compte introuvable.' }, 404);
        if (m === 'GET') { const r = sql.exec('SELECT donnees, maj FROM sauvegardes WHERE cle = ?', c.cle).toArray()[0]; return json({ nom: c.nom, donnees: r ? r.donnees : null, maj: r ? r.maj : 0 }); }
        if (m !== 'PUT') return json({ erreur: 'Méthode non permise.' }, 405);
        const txt = await request.text();
        if (txt.length > 1500000) return json({ erreur: 'Sauvegarde trop grosse.' }, 413);
        try { const d = JSON.parse(txt); if (!d || !Array.isArray(d.chars)) throw 0; } catch (e) { return json({ erreur: 'Sauvegarde illisible.' }, 400); }
        sql.exec('INSERT INTO sauvegardes (cle, donnees, maj) VALUES (?, ?, ?) ON CONFLICT(cle) DO UPDATE SET donnees = excluded.donnees, maj = excluded.maj', c.cle, txt, Date.now());
        // le joueur doit se reconnecter : sinon son jeu réenverrait l'ancienne version de ses héros
        sql.exec('DELETE FROM sessions WHERE cle = ?', c.cle);
        for (const w of sockets(c.cle)) ejecter(w, 'Un administrateur a modifié vos héros : reconnectez-vous pour les retrouver.', 4002);
        return json({ ok: true });
      }
      case 'maintenance': {
        this.regler('maintenance', b.on ? '1' : '0');
        if (b.on) for (const w of this.all()) if (!this.info(w).admin) ejecter(w, 'Le serveur passe en maintenance. Revenez un peu plus tard !', 4004);
        return json({ ok: true, maintenance: !!b.on });
      }
    }
    return json({ erreur: 'Inconnu.' }, 404);
  }
  async session(cle) {
    const jeton = b64url(crypto.getRandomValues(new Uint8Array(32)));
    // on ne garde que l'empreinte : une fuite de la base ne donne pas de session utilisable
    this.ctx.storage.sql.exec('INSERT INTO sessions (jeton, cle, expire) VALUES (?, ?, ?)', await sha(jeton), cle, Date.now() + 180 * 86400000);
    this.ctx.storage.sql.exec('DELETE FROM sessions WHERE expire < ?', Date.now());
    return jeton;
  }
  async qui(request, tok) {
    const t = tok || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!t || t.length > 100) return null;
    const h = await sha(t);
    const r = this.ctx.storage.sql.exec('SELECT s.cle AS cle, c.nom AS nom, c.role AS role, c.banni AS banni, c.muet AS muet FROM sessions s JOIN comptes c ON c.cle = s.cle WHERE s.jeton = ? AND s.expire > ?', h, Date.now()).toArray()[0];
    if (!r || r.banni) return null;
    return { cle: r.cle, nom: r.nom, role: r.role || '', muet: !!r.muet, jeton: h };
  }
  essai(k, max) {
    const now = Date.now(), r = this.tries.get(k) || [now, 0];
    if (now - r[0] > 10 * 60000) { r[0] = now; r[1] = 0; }
    r[1]++; this.tries.set(k, r);
    if (this.tries.size > 5000) this.tries.clear();
    return r[1] <= max;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/status') {
      return Response.json({ online: this.named().length, comptes: true }, { headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
    }
    if (url.pathname.startsWith('/api/compte/') || url.pathname.startsWith('/api/admin/')) {
      try { return url.pathname.startsWith('/api/admin/') ? await this.admin(request, url) : await this.compte(request, url); }
      catch (e) { console.error('compte', e && e.stack); return Response.json({ erreur: 'Erreur du serveur.', detail: String(e && e.message || e).slice(0, 300) }, { status: 500 }); }
    }
    // jeu en ligne : seulement avec un compte
    const who = await this.qui(request, url.searchParams.get('jeton') || '');
    if (!who) return new Response('Connectez-vous pour jouer en ligne.', { status: 401 });
    if (this.reglage('maintenance') === '1' && who.role !== 'admin') return new Response('Serveur en maintenance.', { status: 503 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const m = { id: crypto.randomUUID().replace(/-/g, '').slice(0, 12), name: '', acct: who.nom, cle: who.cle, admin: who.role === 'admin', muet: who.muet, cls: '', lvl: 1, party: null, leader: false, scene: 'town' };
    server.serializeAttachment(m);
    this.meta.set(server, m);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------- outils ----------
  info(ws) {
    let m = this.meta.get(ws);
    if (!m) {
      m = ws.deserializeAttachment() || { id: 'x' + crypto.randomUUID().slice(0, 8), name: '', lvl: 1, party: null, leader: false, scene: 'town' };
      this.meta.set(ws, m);
    }
    return m;
  }
  save(ws, m) { this.meta.set(ws, m); try { ws.serializeAttachment(m); } catch (e) { /* connexion fermée */ } }
  all() { return this.ctx.getWebSockets().filter((w) => !this.gone.has(w)); }
  named() { return this.all().filter((w) => this.info(w).name); }
  byId(id) { return this.all().find((w) => this.info(w).id === id); }
  members(pid) { return pid ? this.all().filter((w) => this.info(w).party === pid) : []; }
  send(ws, msg) { try { ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); } catch (e) { /* connexion fermée */ } }
  pub(ws) {
    const m = this.info(ws), p = this.pos.get(ws) || {};
    return { id: m.id, name: m.name, acct: m.acct || '', cls: m.cls, lvl: m.lvl, party: m.party, scene: m.scene, x: p.x || 0, y: p.y || 0 };
  }
  partyView(pid) {
    const list = this.members(pid);
    if (!pid || !list.length) return null;
    const lead = list.find((w) => this.info(w).leader) || list[0];
    return {
      id: pid, leader: this.info(lead).id,
      members: list.map((w) => { const m = this.info(w); return { id: m.id, name: m.name, cls: m.cls, lvl: m.lvl, scene: m.scene }; }),
    };
  }
  notifyParty(pid, note) {
    const view = this.partyView(pid);
    for (const w of this.members(pid)) this.send(w, note ? { t: 'party', party: view, note } : { t: 'party', party: view });
  }
  leaveParty(ws, closing) {
    const m = this.info(ws), pid = m.party;
    if (!pid) return;
    const wasLeader = m.leader;
    m.party = null; m.leader = false;
    if (!closing) { this.save(ws, m); this.send(ws, { t: 'party', party: null }); }
    const rest = this.members(pid).filter((w) => w !== ws);
    const note = (m.name || 'Un joueur') + (closing ? ' s\'est déconnecté.' : ' a quitté le groupe.');
    if (rest.length === 1) { // un groupe d'une seule personne n'existe plus
      const o = this.info(rest[0]); o.party = null; o.leader = false; this.save(rest[0], o);
      this.send(rest[0], { t: 'party', party: null, note, ended: m.id });
      return;
    }
    if (rest.length && wasLeader) { const o = this.info(rest[0]); o.leader = true; this.save(rest[0], o); }
    if (rest.length) { const view = this.partyView(pid); for (const w of rest) this.send(w, { t: 'party', party: view, note, ended: m.id }); }
  }

  // ---------- messages ----------
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 262144 || this.gone.has(ws)) return;
    const now = Math.floor(Date.now() / 1000);
    const r = this.rate.get(ws) || [now, 0];
    if (r[0] !== now) { r[0] = now; r[1] = 0; }
    r[1]++; this.rate.set(ws, r);
    if (r[1] > MAX_MSG_PER_SEC) return; // trop de messages : le surplus est ignoré
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || typeof data !== 'object') return;
    const list = Array.isArray(data.b) ? data.b.slice(0, 60) : [data];
    for (const msg of list) if (msg && typeof msg === 'object') this.handle(ws, msg);
  }

  handle(ws, msg) {
    const me = this.info(ws);
    switch (msg.t) {
      case 'ping': this.send(ws, { t: 'pong', at: num(msg.at) }); break;
      case 'hello': {
        const first = !me.name;
        me.name = clean(msg.name, 16) || 'Héros';
        me.cls = clean(msg.cls, 16);
        me.lvl = Math.max(1, Math.min(99, num(msg.lvl, 1) | 0));
        me.scene = 'town';
        this.save(ws, me);
        const peers = this.named().filter((w) => w !== ws).map((w) => this.pub(w));
        this.send(ws, { t: 'welcome', id: me.id, peers, party: this.partyView(me.party) });
        const out = JSON.stringify({ t: first ? 'join' : 'update', p: this.pub(ws) });
        for (const w of this.named()) if (w !== ws) this.send(w, out);
        if (!first && me.party) this.notifyParty(me.party);
        break;
      }
      case 'me': { // position et apparence : en ville pour tous, en donjon pour le groupe
        if (!me.name) return;
        const scene = clean(msg.s, 48) || 'town';
        const lvl = Math.max(1, Math.min(99, num(msg.l, me.lvl) | 0));
        if (scene !== me.scene || lvl !== me.lvl) {
          const moved = scene !== me.scene;
          me.scene = scene; me.lvl = lvl; this.save(ws, me);
          if (moved) {
            const out = JSON.stringify({ t: 'scene', id: me.id, s: scene, l: lvl });
            for (const w of this.named()) if (w !== ws) this.send(w, out);
            if (me.party) this.notifyParty(me.party);
            // de retour en ville : la position actuelle des autres joueurs
            if (scene === 'town') this.send(ws, { t: 'peers', peers: this.named().filter((w) => w !== ws).map((w) => this.pub(w)) });
          }
        }
        if (scene === 'town') this.pos.set(ws, { x: num(msg.x), y: num(msg.y) });
        msg.id = me.id;
        const out = JSON.stringify(msg);
        const targets = scene === 'town' ? this.named() : this.members(me.party);
        for (const w of targets) if (w !== ws && this.info(w).scene === scene) this.send(w, out);
        break;
      }
      case 'chat': {
        if (!me.name) return;
        const text = clean(msg.text, 200);
        if (!text) return;
        if (me.muet) { this.send(ws, { t: 'notice', text: 'Un administrateur a coupé votre discussion.' }); return; }
        const party = msg.ch === 'party' && me.party;
        const out = JSON.stringify({ t: 'chat', id: me.id, name: me.name, acct: me.acct || '', ch: party ? 'party' : 'all', text });
        for (const w of party ? this.members(me.party) : this.named()) this.send(w, out);
        break;
      }
      case 'invite': {
        const target = this.byId(msg.to);
        if (!target || target === ws || !me.name) return;
        const t = this.info(target);
        if (!t.name) return;
        if (me.party && t.party === me.party) { this.send(ws, { t: 'notice', text: t.name + ' est déjà dans votre groupe.' }); return; }
        if (me.party && !me.leader) { this.send(ws, { t: 'notice', text: 'Seul le chef du groupe peut inviter.' }); return; }
        if (me.party && this.members(me.party).length >= MAX_PARTY) { this.send(ws, { t: 'notice', text: 'Votre groupe est complet (4 joueurs).' }); return; }
        this.send(target, { t: 'invite', from: me.id, name: me.name, cls: me.cls, lvl: me.lvl });
        this.send(ws, { t: 'notice', text: 'Invitation envoyée à ' + t.name + '.' });
        break;
      }
      case 'accept': {
        const inviter = this.byId(msg.from);
        if (!inviter || inviter === ws || !me.name) { this.send(ws, { t: 'notice', text: 'Ce joueur n\'est plus en ligne.' }); return; }
        const a = this.info(inviter);
        if (a.party && !a.leader) { this.send(ws, { t: 'notice', text: 'Cette invitation n\'est plus valable.' }); return; }
        if (a.party && a.party === me.party) return;
        if (a.party && this.members(a.party).length >= MAX_PARTY) { this.send(ws, { t: 'notice', text: 'Ce groupe est déjà complet.' }); return; }
        if (me.party) this.leaveParty(ws, false);
        if (!a.party) { a.party = 'g' + crypto.randomUUID().replace(/-/g, '').slice(0, 10); a.leader = true; this.save(inviter, a); }
        me.party = a.party; me.leader = false; this.save(ws, me);
        this.notifyParty(a.party, me.name + ' rejoint le groupe.');
        break;
      }
      case 'decline': {
        const inviter = this.byId(msg.from);
        if (inviter && me.name) this.send(inviter, { t: 'notice', text: me.name + ' a refusé votre invitation.' });
        break;
      }
      case 'leave': this.leaveParty(ws, false); break;
      case 'kick': {
        if (!me.leader || !me.party) return;
        const target = this.byId(msg.id);
        if (target && target !== ws && this.info(target).party === me.party) {
          this.leaveParty(target, false);
          this.send(target, { t: 'notice', text: 'Vous avez été retiré du groupe.' });
        }
        break;
      }
      case 'promote': {
        if (!me.leader || !me.party) return;
        const target = this.byId(msg.id);
        if (!target || target === ws || this.info(target).party !== me.party) return;
        const o = this.info(target);
        me.leader = false; this.save(ws, me);
        o.leader = true; this.save(target, o);
        this.notifyParty(me.party, o.name + ' devient chef du groupe.');
        break;
      }
      case 'start': { // le chef ouvre un donjon pour tout le groupe
        if (!me.leader || !me.party) return;
        const list = this.members(me.party);
        const away = list.filter((w) => this.info(w).scene !== 'town');
        if (away.length) { this.send(ws, { t: 'notice', text: away.map((w) => this.info(w).name).join(', ') + ' doit d\'abord revenir en ville.' }); return; }
        const out = JSON.stringify({ t: 'start', d: num(msg.d) | 0, key: clean(msg.key, 48), seed: num(msg.seed) | 0, host: me.id, size: list.length, ids: list.map((w) => this.info(w).id) });
        for (const w of list) this.send(w, out);
        break;
      }
      case 'g': { // données de jeu dans le groupe : instantanés, événements, dégâts…
        if (!me.party) return;
        msg.from = me.id;
        const out = JSON.stringify(msg);
        for (const w of this.members(me.party)) if (w !== ws && (!msg.to || this.info(w).id === msg.to)) this.send(w, out);
        break;
      }
    }
  }

  async webSocketClose(ws) { this.drop(ws); try { ws.close(1000, 'au revoir'); } catch (e) { /* déjà fermée */ } }
  async webSocketError(ws) { this.drop(ws); }
  drop(ws) {
    if (this.gone.has(ws)) return;
    const me = this.info(ws);
    this.gone.add(ws);
    if (me.party) this.leaveParty(ws, true);
    this.meta.delete(ws); this.pos.delete(ws); this.rate.delete(ws);
    if (me.name) { const out = JSON.stringify({ t: 'leave', id: me.id, name: me.name }); for (const w of this.named()) this.send(w, out); }
  }
}
