// Primitives de dessin "crayonné à la main" : traits tremblés, lavis, hachures, papier.
(function () {
  const S = (G.S = {});
  S.boil = 0; // change ~7 fois/s pour faire "vibrer" les traits comme un dessin animé
  S.ink = '#2b2118';
  let seed = 0, k = 0;
  S.begin = (s, still) => { seed = ((s | 0) * 7919 + (still ? 0 : S.boil * 104729)) | 0; k = 0; };
  const j = (amt) => (G.hash(seed + Math.imul(++k, 2654435761)) - 0.5) * 2 * amt;
  S.j = j;

  // Trait tremblé (2 passages)
  S.line = function (ctx, x1, y1, x2, y2, w = 1.6, c = S.ink, amt = 1.4, passes = 2) {
    ctx.strokeStyle = c; ctx.lineCap = 'round';
    for (let p = 0; p < passes; p++) {
      ctx.lineWidth = p ? w * 0.55 : w;
      const mx = (x1 + x2) / 2 + j(amt * 1.4), my = (y1 + y2) / 2 + j(amt * 1.4);
      ctx.beginPath();
      ctx.moveTo(x1 + j(amt), y1 + j(amt));
      ctx.quadraticCurveTo(mx, my, x2 + j(amt), y2 + j(amt));
      ctx.stroke();
    }
  };

  // Contour d'ellipse irrégulier (courbe lissée)
  S.blobPath = function (ctx, x, y, rx, ry, amt, n, over) {
    n = n || Math.max(10, Math.min(28, Math.round((rx + ry) / 2.2)));
    const pts = [];
    const start = j(3);
    const tot = n + (over ? 2 : 0);
    for (let i = 0; i <= tot; i++) {
      const a = start + (i / n) * G.TAU;
      const rr = 1 + j(amt) / Math.max(rx, 5);
      pts.push([x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr]);
    }
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
  };

  // Cercle / ellipse : lavis coloré + contour encre
  S.circle = function (ctx, x, y, r, o = {}) {
    const ry = o.ry || r;
    if (o.fill) {
      ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.fillA == null ? 0.9 : o.fillA);
      ctx.fillStyle = o.fill;
      S.blobPath(ctx, x + j(1.5), y + j(1.5), r * 0.96, ry * 0.96, 1.5);
      ctx.fill();
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    }
    if (o.hatch) S.hatchCircle(ctx, x, y, r, ry, o.hatch);
    if (o.stroke !== false) {
      ctx.strokeStyle = o.stroke || S.ink;
      ctx.lineWidth = o.w || 1.7; ctx.lineCap = 'round';
      S.blobPath(ctx, x, y, r, ry, o.amt == null ? 1.3 : o.amt, 0, true);
      ctx.stroke();
      if (!o.single) {
        ctx.lineWidth = (o.w || 1.7) * 0.5;
        S.blobPath(ctx, x, y, r, ry, (o.amt == null ? 1.3 : o.amt) * 1.6, 0, false);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  // Polygone : lavis + arêtes tremblées qui dépassent légèrement
  S.poly = function (ctx, pts, o = {}) {
    if (o.fill) {
      ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.fillA == null ? 0.9 : o.fillA);
      ctx.fillStyle = o.fill;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + j(1.2), p[1] + j(1.2)) : ctx.moveTo(p[0] + j(1.2), p[1] + j(1.2))));
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    }
    if (o.hatch) {
      ctx.save();
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.clip();
      let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      pts.forEach((p) => { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
      S.hatchArea(ctx, minx, miny, maxx - minx, maxy - miny, o.hatch);
      ctx.restore();
    }
    if (o.stroke !== false) {
      const w = o.w || 1.7, c = o.stroke || S.ink, ov = o.over == null ? 2.5 : o.over;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        const ex = (dx / L) * ov, ey = (dy / L) * ov;
        S.line(ctx, a[0] - ex, a[1] - ey, b[0] + ex, b[1] + ey, w, c, o.amt == null ? 1.1 : o.amt, o.single ? 1 : 2);
      }
    }
    ctx.globalAlpha = 1;
  };

  S.rect = (ctx, x, y, w, h, o) => S.poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);

  // Hachures dans une zone rectangulaire (à utiliser sous clip)
  S.hatchArea = function (ctx, x, y, w, h, o) {
    const sp = o.sp || 6, ang = o.ang == null ? -0.8 : o.ang, c = o.c || S.ink;
    ctx.strokeStyle = c; ctx.lineWidth = o.w || 0.8; ctx.globalAlpha = o.a == null ? 0.5 : o.a;
    const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + 4;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.beginPath();
    for (let d = -R; d <= R; d += sp) {
      const px = cx - sa * d, py = cy + ca * d;
      ctx.moveTo(px - ca * R + j(1), py - sa * R + j(1));
      ctx.lineTo(px + ca * R + j(1), py + sa * R + j(1));
    }
    ctx.stroke();
    if (o.cross) {
      const cb = Math.cos(ang + 1.5), sb = Math.sin(ang + 1.5);
      ctx.beginPath();
      for (let d = -R; d <= R; d += sp * 1.3) {
        const px = cx - sb * d, py = cy + cb * d;
        ctx.moveTo(px - cb * R, py - sb * R);
        ctx.lineTo(px + cb * R, py + sb * R);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  S.hatchCircle = function (ctx, x, y, rx, ry, o) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, G.TAU); ctx.clip();
    S.hatchArea(ctx, x - rx, y - ry, rx * 2, ry * 2, o);
    ctx.restore();
  };

  // Texte manuscrit
  S.text = function (ctx, str, x, y, size, color, align, outline, font) {
    ctx.font = `700 ${size}px ${font || "Caveat, 'Comic Sans MS', cursive"}`;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineWidth = 3.5; ctx.strokeStyle = outline; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color || S.ink; ctx.fillText(str, x, y);
  };

  // Texture de papier (motif répétable)
  S.paperPattern = function (base, size) {
    size = size || 256;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    const r = G.seeded(42);
    for (let i = 0; i < size * size * 0.06; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? 'rgba(90,60,30,0.05)' : 'rgba(255,250,235,0.08)';
      g.fillRect(Math.floor(r() * size), Math.floor(r() * size), 1 + (r() < 0.2), 1);
    }
    g.strokeStyle = 'rgba(110,80,50,0.07)'; g.lineWidth = 0.6;
    for (let i = 0; i < 40; i++) {
      const x = r() * size, y = r() * size, a = r() * G.TAU, l = 4 + r() * 14;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = r() * size, y = r() * size, rad = 10 + r() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(120,85,40,0.05)'); gr.addColorStop(1, 'rgba(120,85,40,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return c;
  };

  // Petite tache d'encre
  S.splat = function (ctx, x, y, r, c) {
    ctx.fillStyle = c || S.ink;
    S.blobPath(ctx, x, y, r, r * 0.8, r * 0.8, 9);
    ctx.fill();
  };
})();
