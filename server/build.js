// Prépare les fichiers du jeu servis par le Worker : src/site.js contient la page (avec un en-tête HTML complet),
// tous les scripts, et ce qui fait du site une application installable (manifeste, icônes, service worker).
// Chaque script reçoit un numéro de version (?v=…) : le navigateur le garde en cache jusqu'à la publication suivante.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

const files = {};
for (const f of fs.readdirSync(path.join(root, 'js')).sort()) {
  if (!f.endsWith('.js')) continue;
  const body = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  files['/js/' + f] = { type: 'text/javascript; charset=utf-8', body, etag: hash(body), immutable: true };
}
// icônes de l'application (images : envoyées en base64, décodées par le Worker)
for (const f of fs.readdirSync(path.join(root, 'icons')).sort()) {
  if (!f.endsWith('.png')) continue;
  const buf = fs.readFileSync(path.join(root, 'icons', f));
  files['/icons/' + f] = { type: 'image/png', b64: buf.toString('base64'), etag: hash(buf) };
}
// manifeste : nom, icônes, plein écran en paysage
const manifest = {
  id: '/',
  name: 'Chroniques de Valdorne',
  short_name: 'Valdorne',
  description: 'RPG d\'action crayonné : 15 donjons, 10 classes, en solo ou en groupe de 4.',
  lang: 'fr',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'fullscreen',
  display_override: ['fullscreen', 'standalone'],
  orientation: 'landscape',
  background_color: '#1d1915',
  theme_color: '#1d1915',
  categories: ['games'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
const mbody = JSON.stringify(manifest, null, 1);
files['/manifest.webmanifest'] = { type: 'application/manifest+json; charset=utf-8', body: mbody, etag: hash(mbody) };

let page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
page = page.replace(/<script src="(js\/[^"?]+\.js)"><\/script>/g, (all, src) => {
  const f = files['/' + src];
  return f ? `<script src="${src}?v=${f.etag}"></script>` : all;
});
const head = '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
  '<meta name="theme-color" content="#1d1915"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">' +
  '<meta name="apple-mobile-web-app-title" content="Valdorne"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="application-name" content="Valdorne">' +
  '<meta name="description" content="Chroniques de Valdorne : RPG d\'action crayonné, en ligne et en coopération (groupes de 4).">' +
  '<link rel="manifest" href="/manifest.webmanifest">' +
  '<link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png"><link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">' +
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">' +
  '</head><body>';
const html = head + page + '</body></html>';
files['/index.html'] = { type: 'text/html; charset=utf-8', body: html, etag: hash(html), immutable: false };

// service worker : la liste des fichiers à garder sur l'appareil et un numéro de version qui change à chaque publication
const keep = ['/'].concat(
  Object.keys(files).filter((k) => k.startsWith('/js/') && page.includes(k.slice(1) + '?v=')).map((k) => k + '?v=' + files[k].etag),
  ['/manifest.webmanifest'], Object.keys(files).filter((k) => k.startsWith('/icons/')),
);
const version = hash(Object.keys(files).sort().map((k) => k + files[k].etag).join('|'));
const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(keep));
files['/sw.js'] = { type: 'text/javascript; charset=utf-8', body: sw, etag: hash(sw) };

const out = '// Fichier généré par build.js : ne pas modifier à la main.\nexport default ' + JSON.stringify(files) + ';\n';
fs.writeFileSync(path.join(__dirname, 'src', 'site.js'), out);
console.log('src/site.js prêt : la page, ' + Object.keys(files).filter((k) => k.startsWith('/js/')).length + ' scripts, '
  + Object.keys(files).filter((k) => k.startsWith('/icons/')).length + ' icônes, manifeste et service worker (version ' + version + ', ' + Math.round(out.length / 1024) + ' Ko)');
