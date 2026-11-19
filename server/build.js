// Prépare les fichiers du jeu servis par le Worker : src/site.js contient la page (avec un en-tête HTML complet)
// et tous les scripts. Chaque script reçoit un numéro de version (?v=…) : le navigateur le garde en cache
// jusqu'à la publication suivante.
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
let page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
page = page.replace(/<script src="(js\/[^"?]+\.js)"><\/script>/g, (all, src) => {
  const f = files['/' + src];
  return f ? `<script src="${src}?v=${f.etag}"></script>` : all;
});
const head = '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
  '<meta name="theme-color" content="#1d1915"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">' +
  '<meta name="description" content="Chroniques de Valdorne : RPG d\'action crayonné, en ligne et en coopération (groupes de 4).">' +
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ctext y=%2213%22 font-size=%2213%22%3E%E2%9A%94%3C/text%3E%3C/svg%3E">' +
  '</head><body>';
const html = head + page + '</body></html>';
files['/index.html'] = { type: 'text/html; charset=utf-8', body: html, etag: hash(html), immutable: false };

const out = '// Fichier généré par build.js : ne pas modifier à la main.\nexport default ' + JSON.stringify(files) + ';\n';
fs.writeFileSync(path.join(__dirname, 'src', 'site.js'), out);
console.log('src/site.js prêt : la page et ' + (Object.keys(files).length - 1) + ' scripts (' + Math.round(out.length / 1024) + ' Ko)');
