// Outils génériques partagés (aucune dépendance au rendu : réutilisable côté serveur plus tard)
(function () {
  const G = (window.G = window.G || {});
  G.TAU = Math.PI * 2;
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  G.ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  G.rnd = (a, b) => a + Math.random() * (b - a);
  G.rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  G.pick = (a) => a[Math.floor(Math.random() * a.length)];
  G.chance = (p) => Math.random() < p;
  G.hash = function (n) {
    n = (n | 0) ^ 0x9e3779b9;
    n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
    n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  };
  G.seeded = function (seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };
  G.weighted = (weights, r = Math.random) => {
    const t = weights.reduce((a, b) => a + b, 0);
    let x = r() * t;
    for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
    return weights.length - 1;
  };
  let _id = 1;
  G.uid = () => _id++;
  G.fmt = (n) => Math.round(n).toLocaleString('fr-FR');
  G.angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= G.TAU;
    while (d < -Math.PI) d += G.TAU;
    return d;
  };
  G.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
})();
