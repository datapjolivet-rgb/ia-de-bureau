// Icônes d'objets dessinées au crayon (générées une fois puis mises en cache).
(function () {
  const S = G.S, D = G.D, INK = S.ink;
  const cache = {};
  const KIND = {
    'Épée longue': 'sword', Claymore: 'sword', 'Hache de guerre': 'axe', 'Grande hache': 'axe', Hachoir: 'axe', 'Haches jumelles': 'axe',
    Bâton: 'staff', 'Bâton de pèlerin': 'staff', 'Bâton d\'os': 'bonestaff', 'Sceptre arcanique': 'scepter', 'Sceptre sacré': 'scepter', Baguette: 'wand',
    Katana: 'katana', Nodachi: 'katana', Wakizashi: 'katana', 'Arc long': 'bow', 'Arc court': 'bow', 'Arc composite': 'bow',
    Masse: 'mace', 'Masse d\'armes': 'mace', Fléau: 'mace', Marteau: 'hammer', Faux: 'scythe', 'Grimoire maudit': 'book',
    Dagues: 'dagger', 'Lames jumelles': 'dagger', Kriss: 'dagger', Luth: 'lute', Harpe: 'harp', 'Flûte de guerre': 'flute',
    Casque: 'helm', Heaume: 'helm', Capuche: 'hood', Couronne: 'crown', Masque: 'mask',
    Plastron: 'chest', Cuirasse: 'chest', Brigandine: 'chest', Robe: 'robe', Tunique: 'robe',
    Gantelets: 'gauntlet', Gants: 'glove', Poignes: 'gauntlet', Mitaines: 'glove',
    Jambières: 'legs', Grèves: 'legs', Pantalon: 'legs', Cuissards: 'legs',
    Bottes: 'boots', Sandales: 'boots', Solerets: 'boots', Chausses: 'boots',
    Anneau: 'ring', Chevalière: 'ring', Bague: 'ring', Sceau: 'ring', Amulette: 'amulet', Pendentif: 'amulet', Talisman: 'amulet', Médaillon: 'amulet',
  };
  const METAL = '#b5b8bf', WOOD = '#7a5a3a', GOLD = '#c9a227', LEATHER = '#8a6236';

  G.Icons = {
    item(it) {
      const kind = KIND[it.base] || it.slot;
      const key = kind + '|' + it.rarity;
      if (!cache[key]) cache[key] = draw(kind, it.rarity);
      return cache[key];
    },
  };

  function draw(kind, rarity) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.scale(2, 2);
    S.begin(kind.length * 97 + rarity * 13, true);
    const col = D.RARITY[rarity].color;
    if (rarity >= 3) { const gr = g.createRadialGradient(24, 24, 2, 24, 24, 24); gr.addColorStop(0, col + '66'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); }
    const cloth = rarity === 0 ? '#9a8a6a' : col;
    const L = (x1, y1, x2, y2, w, c) => S.line(g, x1, y1, x2, y2, w, c || INK, 0.7);
    switch (kind) {
      case 'sword':
        L(12, 38, 36, 10, 5, METAL); L(12, 38, 36, 10, 1.2);
        L(10, 30, 20, 40, 3, GOLD); L(6, 42, 12, 36, 3.5, LEATHER);
        break;
      case 'katana':
        g.strokeStyle = '#d9dde2'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(12, 38); g.quadraticCurveTo(24, 26, 40, 8); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
        L(8, 36, 14, 42, 2.4, GOLD); L(4, 46, 11, 39, 3.5, '#2a2433');
        break;
      case 'axe':
        L(14, 42, 32, 8, 3.2, WOOD);
        S.poly(g, [[28, 10], [42, 8], [44, 22], [32, 20]], { fill: METAL, w: 1.3 });
        break;
      case 'staff': case 'bonestaff': case 'scepter': case 'wand':
        L(12, 44, 34, 12, kind === 'wand' ? 2.4 : 3.2, kind === 'bonestaff' ? '#e4dcc6' : WOOD);
        S.circle(g, 36, 10, kind === 'scepter' ? 6 : 5, { fill: kind === 'bonestaff' ? '#e4dcc6' : col, w: 1.2 });
        if (kind === 'scepter') S.poly(g, [[30, 6], [36, 0], [42, 6]], { fill: GOLD, w: 1, single: true });
        break;
      case 'bow':
        g.strokeStyle = WOOD; g.lineWidth = 3.2; g.beginPath(); g.moveTo(14, 6); g.quadraticCurveTo(40, 24, 14, 42); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 0.8; g.beginPath(); g.moveTo(14, 6); g.lineTo(14, 42); g.stroke();
        L(8, 24, 38, 24, 1.4, '#5b4a33'); S.poly(g, [[38, 21], [44, 24], [38, 27]], { fill: INK, w: 0.8, single: true });
        break;
      case 'mace': case 'hammer':
        L(12, 42, 30, 16, 3.2, WOOD);
        if (kind === 'hammer') S.rect(g, 24, 4, 18, 14, { fill: METAL, w: 1.4 });
        else { S.circle(g, 33, 12, 8, { fill: METAL, w: 1.4 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * G.TAU; L(33 + Math.cos(a) * 7, 12 + Math.sin(a) * 7, 33 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, 1.6); } }
        break;
      case 'scythe':
        L(14, 44, 30, 6, 3, WOOD);
        g.strokeStyle = METAL; g.lineWidth = 3.4; g.beginPath(); g.moveTo(30, 6); g.quadraticCurveTo(14, 4, 6, 16); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
        break;
      case 'book':
        S.rect(g, 10, 10, 28, 30, { fill: '#5a2a3a', w: 1.6 }); S.line(g, 14, 10, 14, 40, 1.4, GOLD);
        S.circle(g, 26, 25, 6, { stroke: GOLD, w: 1.4, single: true });
        break;
      case 'dagger':
        L(10, 38, 26, 18, 3.4, METAL); L(22, 38, 38, 18, 3.4, METAL);
        L(6, 42, 11, 37, 3, LEATHER); L(18, 42, 23, 37, 3, LEATHER);
        break;
      case 'lute': case 'harp': case 'flute':
        if (kind === 'flute') { L(8, 40, 40, 8, 4, WOOD); for (let i = 0; i < 4; i++) S.circle(g, 16 + i * 6, 32 - i * 6, 1.4, { fill: INK, w: 0.5, single: true }); break; }
        if (kind === 'harp') { g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(12, 42); g.quadraticCurveTo(10, 8, 36, 8); g.lineTo(34, 42); g.stroke(); for (let i = 0; i < 4; i++) L(16 + i * 5, 12, 16 + i * 5, 40, 0.7); break; }
        S.circle(g, 20, 30, 11, { ry: 9, fill: '#a0703a', w: 1.5 }); S.circle(g, 20, 30, 3, { fill: INK, w: 0.6 });
        L(26, 24, 40, 8, 3, WOOD);
        break;
      case 'helm':
        S.poly(g, [[10, 34], [10, 18], [16, 10], [32, 10], [38, 18], [38, 34]], { fill: METAL, w: 1.6 });
        L(16, 24, 32, 24, 2.4); L(24, 24, 24, 34, 1.6);
        break;
      case 'hood':
        S.poly(g, [[8, 40], [12, 16], [24, 6], [36, 16], [40, 40], [32, 36], [24, 22], [16, 36]], { fill: cloth, w: 1.5 });
        break;
      case 'crown':
        S.poly(g, [[8, 34], [8, 14], [16, 24], [24, 10], [32, 24], [40, 14], [40, 34]], { fill: GOLD, w: 1.5 });
        S.circle(g, 24, 28, 3, { fill: col, w: 0.8 });
        break;
      case 'mask':
        S.circle(g, 24, 24, 15, { ry: 17, fill: '#d9c4a8', w: 1.5 });
        g.fillStyle = INK; g.fillRect(15, 19, 7, 4); g.fillRect(26, 19, 7, 4);
        L(18, 32, 30, 32, 1.4);
        break;
      case 'chest': case 'robe':
        S.poly(g, kind === 'robe' ? [[16, 8], [32, 8], [40, 42], [8, 42]] : [[8, 14], [16, 8], [32, 8], [40, 14], [36, 22], [34, 42], [14, 42], [12, 22]], { fill: kind === 'robe' ? cloth : METAL, w: 1.6 });
        if (kind === 'chest') { L(24, 10, 24, 40, 1.2); L(16, 22, 32, 22, 1); } else L(16, 30, 32, 30, 2, GOLD);
        break;
      case 'gauntlet': case 'glove':
        S.poly(g, [[14, 40], [14, 18], [18, 10], [22, 18], [24, 8], [28, 18], [30, 10], [34, 20], [34, 40]], { fill: kind === 'gauntlet' ? METAL : LEATHER, w: 1.5 });
        L(14, 32, 34, 32, 1.6);
        break;
      case 'legs':
        S.poly(g, [[12, 8], [36, 8], [36, 42], [27, 42], [24, 20], [21, 42], [12, 42]], { fill: cloth, w: 1.5 });
        L(12, 14, 36, 14, 1.6, LEATHER);
        break;
      case 'boots':
        S.poly(g, [[14, 6], [26, 6], [26, 30], [40, 34], [40, 42], [14, 42]], { fill: LEATHER, w: 1.6 });
        L(14, 14, 26, 14, 1.2);
        break;
      case 'ring':
        S.circle(g, 24, 28, 12, { stroke: GOLD, w: 4, single: true });
        S.circle(g, 24, 14, 6, { fill: col, w: 1.3 });
        break;
      case 'amulet':
        g.strokeStyle = GOLD; g.lineWidth = 1.6; g.beginPath(); g.moveTo(10, 6); g.quadraticCurveTo(24, 30, 38, 6); g.stroke();
        S.poly(g, [[24, 22], [32, 32], [24, 44], [16, 32]], { fill: col, w: 1.4 });
        break;
      default:
        S.circle(g, 24, 24, 12, { fill: col, w: 1.4 });
    }
    return c.toDataURL();
  }
})();
