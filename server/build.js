// Prépare le dossier public/ servi par Cloudflare : la page du jeu (avec un en-tête HTML complet) et ses scripts.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'public');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const head = '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="description" content="Chroniques de Valdorne : RPG d\'action crayonné, en ligne et en coopération (groupes de 4).">' +
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ctext y=%2213%22 font-size=%2213%22%3E%E2%9A%94%3C/text%3E%3C/svg%3E">' +
  '</head><body>';
fs.writeFileSync(path.join(out, 'index.html'), head + body + '</body></html>');
let n = 0;
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  if (!f.endsWith('.js')) continue;
  fs.copyFileSync(path.join(root, 'js', f), path.join(out, 'js', f));
  n++;
}
console.log('public/ prêt : index.html et ' + n + ' scripts');
