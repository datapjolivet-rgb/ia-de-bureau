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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Connexion WebSocket attendue.', { status: 426 });
      return env.WORLD.getByName('monde').fetch(request);
    }
    if (url.pathname === '/api/status') return env.WORLD.getByName('monde').fetch(request);
    if (url.pathname.startsWith('/api/')) return new Response('Inconnu.', { status: 404 });
    return serveFile(request, url);
  },
};

// Fichiers du jeu : la page n'est jamais gardée en cache sans vérification ; les scripts, numérotés, le sont longtemps.
function serveFile(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Méthode non permise.', { status: 405 });
  const f = SITE[url.pathname === '/' ? '/index.html' : url.pathname];
  if (!f) return new Response('Page introuvable.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const etag = '"' + f.etag + '"';
  const headers = {
    'content-type': f.type, etag,
    'cache-control': f.immutable && url.searchParams.get('v') === f.etag ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : f.body, { headers });
}

export class World extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // État en mémoire. Si l'objet hiberne, il est reconstruit à partir des pièces jointes des connexions.
    this.meta = new Map(); // WebSocket -> { id, name, cls, lvl, party, leader, scene }
    this.pos = new Map(); //  WebSocket -> dernière position connue en ville
    this.rate = new Map(); // WebSocket -> [seconde, compteur]
    this.gone = new WeakSet(); // connexions terminées
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/status') {
      return Response.json({ online: this.named().length }, { headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const m = { id: crypto.randomUUID().replace(/-/g, '').slice(0, 12), name: '', cls: '', lvl: 1, party: null, leader: false, scene: 'town' };
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
    return { id: m.id, name: m.name, cls: m.cls, lvl: m.lvl, party: m.party, scene: m.scene, x: p.x || 0, y: p.y || 0 };
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
        const party = msg.ch === 'party' && me.party;
        const out = JSON.stringify({ t: 'chat', id: me.id, name: me.name, ch: party ? 'party' : 'all', text });
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
