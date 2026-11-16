// Données du jeu : classes, sorts, monstres, donjons, quêtes, talents.
(function () {
  const D = (G.D = {});

  D.TILE = 32;

  // ---------- Ressources ----------
  D.RES = {
    rage: { name: 'Rage', color: '#a8321f', max: 100, regen: 0, decay: 3, start: 0 },
    mana: { name: 'Mana', color: '#2f5d8a', max: 0, regenPct: 0.03, start: 1 },
    energy: { name: 'Énergie', color: '#c99a1d', max: 100, regen: 14, start: 1 },
  };

  // ---------- Sorts ----------
  // Chaque sort : nom, abréviation (barre d'action), coût, recharge (cd), effets (fx)
  // Les sorts 1 et 2 sont connus dès le départ ; 3, 4, 5 s'achètent chez le Maître des compétences.
  D.UNLOCK = [null, { lvl: 1, gold: 0 }, { lvl: 1, gold: 0 }, { lvl: 3, gold: 150 }, { lvl: 6, gold: 450 }, { lvl: 9, gold: 1000 }];
  D.RANK_COST = (slot, rank) => ({ lvl: [0, 0, 5, 10][rank] + slot, gold: Math.round((120 + slot * 90) * Math.pow(2.4, rank - 1)) });

  D.CLASSES = {
    guerrier: {
      name: 'Guerrier', role: 'Mêlée robuste', color: '#8c3b2a', diff: 1, res: 'rage', hp: 210, pow: 14, speed: 165,
      desc: 'Une montagne d\'acier. Charge au cœur de la mêlée et encaisse ce qui tuerait les autres.',
      basic: { name: 'Taillade', abbr: 'Tl', cd: 0.8, fx: [{ k: 'melee', range: 62, arc: 110, mult: 1, rage: 9 }] },
      abil: [
        { name: 'Frappe héroïque', abbr: 'FH', cost: 25, cd: 4, desc: 'Un coup puissant en arc devant vous.', fx: [{ k: 'melee', range: 74, arc: 130, mult: 2.6 }] },
        { name: 'Charge', abbr: 'Ch', cost: 0, cd: 10, desc: 'Fonce vers le curseur, étourdit les ennemis touchés et génère 20 rage.', fx: [{ k: 'dash', dist: 270, mult: 1, stun: 1.2, width: 40, invuln: true }, { k: 'res', amount: 20 }] },
        { name: 'Tourbillon', abbr: 'Tb', cost: 30, cd: 6, desc: 'Frappe tous les ennemis autour de vous.', fx: [{ k: 'aoeS', radius: 105, mult: 2.0 }] },
        { name: 'Cri de guerre', abbr: 'CG', cost: 0, cd: 30, desc: '+30 % de puissance pendant 10 s et 25 rage.', fx: [{ k: 'buff', id: 'cri', dur: 10, pow: 0.3 }, { k: 'res', amount: 25 }] },
        { name: 'Mur de bouclier', abbr: 'MB', cost: 0, cd: 40, desc: 'Réduit les dégâts subis de 70 % pendant 5 s.', fx: [{ k: 'buff', id: 'mur', dur: 5, dr: 0.7 }] },
      ],
    },
    mage: {
      name: 'Mage', role: 'Magie à distance', color: '#2f5d8a', diff: 2, res: 'mana', resMax: 160, hp: 125, pow: 18, speed: 165,
      desc: 'Maître des arcanes, du feu et du givre. Fragile, mais détruit tout à distance.',
      basic: { name: 'Trait arcanique', abbr: 'TA', cd: 0.7, fx: [{ k: 'proj', mult: 0.95, speed: 520, range: 520, r: 6, color: '#7b5fd0', look: 'orb' }] },
      abil: [
        { name: 'Boule de feu', abbr: 'BF', cost: 25, cd: 3, desc: 'Explose à l\'impact et brûle la zone.', fx: [{ k: 'proj', mult: 2.1, speed: 430, range: 560, r: 9, aoe: 70, color: '#d0571b', look: 'fire' }] },
        { name: 'Transfert', abbr: 'Tr', cost: 15, cd: 9, desc: 'Téléportation instantanée vers le curseur.', fx: [{ k: 'blink', dist: 250 }] },
        { name: 'Nova de givre', abbr: 'NG', cost: 30, cd: 10, desc: 'Gèle les ennemis proches 1,5 s.', fx: [{ k: 'aoeS', radius: 140, mult: 1.0, stun: 1.5, color: '#6fb1d9' }] },
        { name: 'Pluie de météores', abbr: 'PM', cost: 45, cd: 14, desc: 'Énorme impact au curseur après 1 s.', fx: [{ k: 'aoeT', radius: 120, delay: 1, mult: 4.2, range: 520, color: '#d0571b' }] },
        { name: 'Bouclier de mana', abbr: 'BM', cost: 30, cd: 25, desc: 'Absorbe des dégâts égaux à 40 % de votre vie pendant 8 s.', fx: [{ k: 'shield', pct: 0.4, dur: 8 }] },
      ],
    },
    samourai: {
      name: 'Samouraï', role: 'Duelliste rapide', color: '#7a2734', diff: 3, res: 'energy', hp: 170, pow: 16, speed: 180,
      desc: 'Une lame, un souffle. Parades parfaites et frappes éclair qui traversent les rangs.',
      basic: { name: 'Coupe', abbr: 'Cp', cd: 0.55, fx: [{ k: 'melee', range: 66, arc: 95, mult: 0.9 }] },
      abil: [
        { name: 'Iaijutsu', abbr: 'Ia', cost: 30, cd: 6, desc: 'Traverse les ennemis vers le curseur en les tranchant. Invulnérable pendant le mouvement.', fx: [{ k: 'dash', dist: 230, mult: 2.2, width: 44, invuln: true }] },
        { name: 'Lame du vent', abbr: 'LV', cost: 25, cd: 4, desc: 'Une onde tranchante qui traverse tout.', fx: [{ k: 'proj', mult: 1.6, speed: 620, range: 420, r: 12, pierce: 99, color: '#8fb3a0', look: 'wave' }] },
        { name: 'Parade', abbr: 'Pa', cost: 10, cd: 10, desc: 'Pendant 0,8 s, annule les coups reçus et riposte (×2).', fx: [{ k: 'buff', id: 'parade', dur: 0.8, special: 'parry' }] },
        { name: 'Danse des mille lames', abbr: 'DL', cost: 50, cd: 14, desc: 'Six frappes rapides tout autour de vous.', fx: [{ k: 'aoeS', radius: 115, mult: 0.8, ticks: 6, interval: 0.18 }] },
        { name: 'Concentration', abbr: 'Co', cost: 0, cd: 35, desc: '+40 % de chances de critique 8 s et remplit l\'énergie.', fx: [{ k: 'buff', id: 'concentration', dur: 8, crit: 0.4 }, { k: 'res', amount: 100 }] },
      ],
    },
    archer: {
      name: 'Archer', role: 'Tireur mobile', color: '#4f6b2b', diff: 2, res: 'energy', hp: 140, pow: 15, speed: 180,
      desc: 'Ne se laisse jamais toucher. Recule, roule et transforme le champ de bataille en pluie de flèches.',
      basic: { name: 'Flèche', abbr: 'Fl', cd: 0.6, fx: [{ k: 'proj', mult: 1, speed: 720, range: 600, r: 4, color: '#5b4a33', look: 'arrow' }] },
      abil: [
        { name: 'Tir perçant', abbr: 'TP', cost: 30, cd: 5, desc: 'Une flèche qui traverse tous les ennemis.', fx: [{ k: 'proj', mult: 2.4, speed: 950, range: 700, r: 5, pierce: 99, color: '#5b4a33', look: 'arrow' }] },
        { name: 'Roulade', abbr: 'Ro', cost: 0, cd: 6, desc: 'Roulade rapide vers le curseur, invulnérable.', fx: [{ k: 'dash', dist: 200, mult: 0, invuln: true }] },
        { name: 'Volée', abbr: 'Vo', cost: 40, cd: 7, desc: 'Sept flèches en éventail.', fx: [{ k: 'proj', mult: 0.9, speed: 680, range: 480, r: 4, count: 7, spread: 50, color: '#5b4a33', look: 'arrow' }] },
        { name: 'Pluie de flèches', abbr: 'PF', cost: 50, cd: 12, desc: 'Zone au curseur pendant 4 s : dégâts et ralentissement.', fx: [{ k: 'zone', radius: 115, dur: 4, interval: 0.5, mult: 0.75, slow: 0.4, range: 550, color: '#5b4a33' }] },
        { name: 'Œil du faucon', abbr: 'OF', cost: 0, cd: 40, desc: '+40 % de hâte et +20 % de puissance pendant 10 s.', fx: [{ k: 'buff', id: 'faucon', dur: 10, haste: 0.4, pow: 0.2 }] },
      ],
    },
    soigneur: {
      name: 'Soigneur', role: 'Prêtre de combat', color: '#b39b3c', diff: 2, res: 'mana', resMax: 170, hp: 150, pow: 14, speed: 165,
      desc: 'Prêtre de la Lumière : frappe avec le sacré et se soigne en plein combat. Indispensable en groupe.',
      basic: { name: 'Rayon sacré', abbr: 'RS', cd: 0.75, fx: [{ k: 'proj', mult: 0.9, speed: 560, range: 520, r: 6, color: '#e2c043', look: 'orb', lifesteal: 0.15 }] },
      abil: [
        { name: 'Soin', abbr: 'So', cost: 30, cd: 5, desc: 'Rend 30 % de votre vie.', fx: [{ k: 'heal', pct: 0.3 }] },
        { name: 'Châtiment', abbr: 'Ct', cost: 25, cd: 4, desc: 'Colonne de lumière au curseur.', fx: [{ k: 'aoeT', radius: 80, delay: 0.35, mult: 2.0, range: 480, color: '#e2c043' }] },
        { name: 'Renouveau', abbr: 'Rn', cost: 20, cd: 10, desc: 'Rend 30 % de votre vie en 8 s.', fx: [{ k: 'hot', pct: 0.3, dur: 8 }] },
        { name: 'Halo', abbr: 'Ha', cost: 40, cd: 12, desc: 'Onde de lumière : dégâts autour de vous et soin de 15 %.', fx: [{ k: 'aoeS', radius: 160, mult: 1.8, color: '#e2c043' }, { k: 'heal', pct: 0.15 }] },
        { name: 'Esprit protecteur', abbr: 'EP', cost: 40, cd: 60, desc: 'Pendant 10 s, un coup mortel vous laisse en vie avec 40 % de vie.', fx: [{ k: 'buff', id: 'esprit', dur: 10, special: 'cheat' }] },
      ],
    },
    paladin: {
      name: 'Paladin', role: 'Chevalier sacré', color: '#c48a2c', diff: 1, res: 'mana', resMax: 130, hp: 220, pow: 13, speed: 160,
      desc: 'Armure lourde et foi inébranlable. Lent mais presque impossible à abattre.',
      basic: { name: 'Coup de marteau', abbr: 'CM', cd: 0.9, fx: [{ k: 'melee', range: 62, arc: 110, mult: 1.05 }] },
      abil: [
        { name: 'Jugement', abbr: 'Ju', cost: 20, cd: 5, desc: 'Lance un marteau de lumière.', fx: [{ k: 'proj', mult: 1.8, speed: 600, range: 500, r: 8, color: '#e2c043', look: 'hammer' }] },
        { name: 'Consécration', abbr: 'Cs', cost: 30, cd: 10, desc: 'Sol sacré autour de vous pendant 6 s.', fx: [{ k: 'zone', radius: 110, dur: 6, interval: 0.5, mult: 0.45, follow: true, color: '#e2c043' }] },
        { name: 'Marteau de la justice', abbr: 'MJ', cost: 20, cd: 14, desc: 'Étourdit la cible 2,5 s.', fx: [{ k: 'proj', mult: 1.2, speed: 560, range: 450, r: 8, stun: 2.5, color: '#c48a2c', look: 'hammer' }] },
        { name: 'Imposition des mains', abbr: 'IM', cost: 0, cd: 90, desc: 'Rend toute votre vie.', fx: [{ k: 'heal', pct: 1 }] },
        { name: 'Bouclier divin', abbr: 'BD', cost: 0, cd: 120, desc: 'Invulnérable pendant 4 s.', fx: [{ k: 'buff', id: 'divin', dur: 4, special: 'invuln' }] },
      ],
    },
    necromancien: {
      name: 'Nécromancien', role: 'Invocateur des morts', color: '#3e5b3a', diff: 3, res: 'mana', resMax: 160, hp: 130, pow: 16, speed: 165,
      desc: 'Relève les ennemis tombés pour en faire ses serviteurs. Parfois, le cadavre refuse… et explose.',
      basic: { name: 'Trait d\'ombre', abbr: 'TO', cd: 0.75, fx: [{ k: 'proj', mult: 0.9, speed: 520, range: 520, r: 6, color: '#4f7a3d', look: 'orb' }] },
      abil: [
        { name: 'Relever les morts', abbr: 'RM', cost: 30, cd: 3, desc: 'Relève le cadavre le plus proche du curseur. Chances : 40 % (normal), 10 % (élite), 1 % (boss). En cas d\'échec, le cadavre explose sur vous.', fx: [{ k: 'raise' }] },
        { name: 'Drain de vie', abbr: 'DV', cost: 20, cd: 5, desc: 'Vole la vie : vous soigne de 100 % des dégâts.', fx: [{ k: 'proj', mult: 1.6, speed: 500, range: 480, r: 7, lifesteal: 1, color: '#7a2e3a', look: 'orb' }] },
        { name: 'Nuée d\'os', abbr: 'NO', cost: 35, cd: 8, desc: 'Des os jaillissent du sol au curseur.', fx: [{ k: 'aoeT', radius: 110, delay: 0.5, mult: 2.2, range: 500, color: '#d9d2bf' }] },
        { name: 'Malédiction', abbr: 'Ma', cost: 30, cd: 12, desc: 'Zone maudite : dégâts dans le temps et ennemis affaiblis (−25 % dégâts).', fx: [{ k: 'zone', radius: 140, dur: 6, interval: 0.5, mult: 0.5, weaken: 0.25, range: 500, color: '#4f7a3d' }] },
        { name: 'Explosion cadavérique', abbr: 'EC', cost: 40, cd: 10, desc: 'Fait exploser tous les cadavres près du curseur.', fx: [{ k: 'corpseBoom', radius: 95, mult: 3, range: 260 }] },
      ],
    },
    assassin: {
      name: 'Assassin', role: 'Tueur des ombres', color: '#3b3346', diff: 3, res: 'energy', hp: 130, pow: 17, speed: 195,
      desc: 'Invisible, insaisissable, mortel. Très fragile : chaque erreur se paie cher.',
      basic: { name: 'Dague', abbr: 'Dg', cd: 0.4, fx: [{ k: 'melee', range: 55, arc: 85, mult: 0.72 }] },
      abil: [
        { name: 'Pas de l\'ombre', abbr: 'PO', cost: 25, cd: 7, desc: 'Apparaît dans le dos de l\'ennemi le plus proche du curseur. Le coup suivant est critique.', fx: [{ k: 'shadowstep', range: 420 }] },
        { name: 'Lames empoisonnées', abbr: 'LE', cost: 20, cd: 15, desc: '10 s : vos coups empoisonnent (50 % de dégâts en plus sur 4 s).', fx: [{ k: 'buff', id: 'poison', dur: 10, special: 'poison' }] },
        { name: 'Furtivité', abbr: 'Fu', cost: 0, cd: 18, desc: 'Invisible 6 s, +30 % de vitesse. Le prochain coup inflige ×3.', fx: [{ k: 'buff', id: 'furtif', dur: 6, special: 'stealth', speed: 0.3 }] },
        { name: 'Éventail de lames', abbr: 'EL', cost: 40, cd: 8, desc: 'Douze dagues dans toutes les directions.', fx: [{ k: 'ring', count: 12, mult: 1, speed: 560, range: 320, color: '#3b3346' }] },
        { name: 'Exécution', abbr: 'Ex', cost: 50, cd: 10, desc: 'Coup brutal, ×3 si la cible a moins de 35 % de vie.', fx: [{ k: 'melee', range: 70, arc: 90, mult: 2, execute: 0.35 }] },
      ],
    },
    berserker: {
      name: 'Berserker', role: 'Furie sauvage', color: '#9a4a1c', diff: 2, res: 'rage', hp: 190, pow: 16, speed: 175,
      desc: 'Plus il saigne, plus il frappe fort : jusqu\'à +80 % de dégâts quand sa vie est basse.',
      basic: { name: 'Haches', abbr: 'Hx', cd: 0.75, fx: [{ k: 'melee', range: 62, arc: 125, mult: 1, rage: 10 }] },
      abil: [
        { name: 'Saut dévastateur', abbr: 'SD', cost: 0, cd: 9, desc: 'Bondit vers le curseur et frappe la zone d\'atterrissage.', fx: [{ k: 'dash', dist: 280, mult: 0, invuln: true, end: { radius: 100, mult: 1.6 } }, { k: 'res', amount: 15 }] },
        { name: 'Frénésie', abbr: 'Fr', cost: 0, cd: 20, desc: '+50 % de hâte pendant 8 s, mais +20 % de dégâts subis.', fx: [{ k: 'buff', id: 'frenesie', dur: 8, haste: 0.5, dtaken: 0.2 }] },
        { name: 'Soif de sang', abbr: 'SS', cost: 30, cd: 15, desc: '8 s : vous récupérez 25 % des dégâts infligés.', fx: [{ k: 'buff', id: 'soif', dur: 8, lifesteal: 0.25 }] },
        { name: 'Fracas', abbr: 'Fc', cost: 50, cd: 10, desc: 'Écrase le sol en cône, étourdit 0,8 s.', fx: [{ k: 'cone', range: 165, arc: 75, mult: 3, stun: 0.8 }] },
        { name: 'Rage immortelle', abbr: 'RI', cost: 0, cd: 90, desc: 'Pendant 5 s, votre vie ne peut pas descendre sous 1.', fx: [{ k: 'buff', id: 'immortel', dur: 5, special: 'undying' }] },
      ],
    },
    barde: {
      name: 'Barde', role: 'Musicien de guerre', color: '#6a3f86', diff: 2, res: 'mana', resMax: 150, hp: 145, pow: 14, speed: 175,
      desc: 'Ses chansons renforcent les alliés et endorment les ennemis. En groupe, il est le cœur de la bande.',
      basic: { name: 'Note tranchante', abbr: 'NT', cd: 0.65, fx: [{ k: 'proj', mult: 0.85, speed: 540, range: 500, r: 6, pierce: 1, color: '#6a3f86', look: 'note' }] },
      abil: [
        { name: 'Chant de guerre', abbr: 'CG', cost: 25, cd: 20, desc: '+25 % de puissance et +15 % de hâte pendant 12 s.', fx: [{ k: 'buff', id: 'chant', dur: 12, pow: 0.25, haste: 0.15 }] },
        { name: 'Berceuse', abbr: 'Be', cost: 30, cd: 14, desc: 'Endort les ennemis dans la zone 3 s.', fx: [{ k: 'aoeT', radius: 130, delay: 0.2, mult: 0.3, stun: 3, range: 480, color: '#9c7cc4' }] },
        { name: 'Dissonance', abbr: 'Di', cost: 25, cd: 6, desc: 'Onde sonore en cône qui ralentit.', fx: [{ k: 'cone', range: 210, arc: 80, mult: 2, slow: 0.5, color: '#6a3f86' }] },
        { name: 'Mélodie apaisante', abbr: 'MA', cost: 30, cd: 15, desc: 'Rend 35 % de votre vie en 8 s.', fx: [{ k: 'hot', pct: 0.35, dur: 8 }] },
        { name: 'Crescendo', abbr: 'Cr', cost: 60, cd: 20, desc: 'Explosion sonore massive autour de vous, repousse les ennemis.', fx: [{ k: 'aoeS', radius: 220, mult: 3.5, knock: 140, color: '#6a3f86' }] },
      ],
    },
  };
  D.CLASS_ORDER = ['guerrier', 'mage', 'samourai', 'archer', 'soigneur', 'paladin', 'necromancien', 'assassin', 'berserker', 'barde'];

  // ---------- Talents (Maître des compétences) ----------
  D.TALENTS = [
    { id: 'vigueur', name: 'Vigueur', desc: '+6 % de vie maximum par rang', max: 5, stat: 'hpPct', per: 0.06 },
    { id: 'puissance', name: 'Puissance', desc: '+5 % de puissance par rang', max: 5, stat: 'powPct', per: 0.05 },
    { id: 'precision', name: 'Précision', desc: '+2 % de chances de critique par rang', max: 5, stat: 'crit', per: 0.02 },
    { id: 'celerite', name: 'Célérité', desc: '+3 % de hâte par rang (recharges et attaques)', max: 5, stat: 'haste', per: 0.03 },
    { id: 'peau', name: 'Peau de fer', desc: '+6 d\'armure par rang', max: 5, stat: 'arm', per: 6 },
    { id: 'necro', name: 'Pacte funèbre', desc: '+3 % de chances de relever un mort (×0,25 pour un élite, ×0,1 pour un boss)', max: 5, stat: 'raise', per: 0.03, cls: 'necromancien' },
  ];
  D.TALENT_COST = (rank) => ({ gold: Math.round(80 * Math.pow(2.1, rank)), lvl: rank * 2 });

  // ---------- Monstres ----------
  // atks : attaques (swing = mêlée en cône, shoot = projectile, circle = zone au sol à retardement,
  // nova = zone autour de soi, charge = ruée en ligne, summon = invocation, ring = projectiles en cercle, line = ligne au sol)
  D.MONSTERS = {
    skeleton: { name: 'Squelette', hp: 55, dmg: 13, speed: 80, r: 13, xp: 10, gold: [1, 4], look: 'skeleton', col: '#e4dcc6',
      atks: [{ t: 'swing', range: 44, arc: 90, windup: 0.45, cd: 1.3 }] },
    skelArcher: { name: 'Squelette archer', hp: 40, dmg: 11, speed: 75, r: 12, xp: 12, gold: [2, 5], look: 'skelArcher', col: '#e4dcc6', keep: 230,
      atks: [{ t: 'shoot', range: 380, windup: 0.55, cd: 1.9, speed: 320 }] },
    ghoul: { name: 'Goule', hp: 45, dmg: 9, speed: 130, r: 12, xp: 10, gold: [1, 3], look: 'ghoul', col: '#8c9a7a',
      atks: [{ t: 'swing', range: 38, arc: 80, windup: 0.3, cd: 0.85 }] },
    cultist: { name: 'Acolyte cendré', hp: 50, dmg: 20, speed: 70, r: 13, xp: 14, gold: [3, 7], look: 'cultist', col: '#5a4a5e', keep: 270,
      atks: [{ t: 'circle', range: 420, radius: 58, delay: 1.1, windup: 0.3, cd: 3.2 }] },
    wolf: { name: 'Loup de Bois-Pendu', hp: 55, dmg: 11, speed: 155, r: 13, xp: 12, gold: [1, 4], look: 'wolf', col: '#6e6458',
      atks: [{ t: 'swing', range: 40, arc: 80, windup: 0.32, cd: 0.9 }, { t: 'charge', range: 230, min: 90, windup: 0.6, dist: 210, width: 30, cd: 5, dmgMul: 1.4 }] },
    spider: { name: 'Araignée tisseuse', hp: 45, dmg: 10, speed: 95, r: 12, xp: 12, gold: [2, 5], look: 'spider', col: '#3e3a2f', keep: 210,
      atks: [{ t: 'shoot', range: 360, windup: 0.5, cd: 2.0, speed: 300, slow: 0.4, poison: 0.6, color: '#6b8f2a' }] },
    treant: { name: 'Sylvain corrompu', hp: 110, dmg: 22, speed: 55, r: 20, xp: 30, gold: [5, 12], look: 'treant', col: '#5d6b37',
      atks: [{ t: 'swing', range: 58, arc: 110, windup: 0.7, cd: 1.6 }, { t: 'nova', range: 120, radius: 130, windup: 1.1, cd: 6, dmgMul: 1.3 }] },
    goblin: { name: 'Gobelin mineur', hp: 50, dmg: 11, speed: 140, r: 11, xp: 12, gold: [2, 6], look: 'goblin', col: '#6f8f3a',
      atks: [{ t: 'swing', range: 38, arc: 85, windup: 0.33, cd: 0.9 }] },
    bomber: { name: 'Gobelin artificier', hp: 42, dmg: 24, speed: 95, r: 11, xp: 14, gold: [3, 7], look: 'bomber', col: '#6f8f3a', keep: 240,
      atks: [{ t: 'circle', range: 400, radius: 62, delay: 1.0, windup: 0.4, cd: 2.8, count: 1 }] },
    miner: { name: 'Contremaître brutal', hp: 85, dmg: 18, speed: 85, r: 15, xp: 18, gold: [4, 9], look: 'miner', col: '#7c6a52',
      atks: [{ t: 'swing', range: 52, arc: 120, windup: 0.6, cd: 1.4 }, { t: 'charge', range: 260, min: 100, windup: 0.8, dist: 260, width: 36, cd: 6, dmgMul: 1.3 }] },
    golem: { name: 'Golem de fer-noir', hp: 150, dmg: 26, speed: 60, r: 21, xp: 40, gold: [8, 15], look: 'golem', col: '#56565c',
      atks: [{ t: 'swing', range: 62, arc: 120, windup: 0.8, cd: 1.8 }, { t: 'charge', range: 320, min: 120, windup: 1.0, dist: 340, width: 46, cd: 7, dmgMul: 1.5 }, { t: 'nova', range: 110, radius: 125, windup: 1.2, cd: 8 }] },

    // ----- Boss -----
    varok: { name: 'Varok le Fossoyeur', boss: true, hp: 8500, dmg: 35, speed: 82, r: 30, xp: 450, gold: [160, 230], look: 'varok', col: '#5a5047',
      intro: '« Encore un vivant qui vient creuser sa propre tombe… »',
      phases: [
        { above: 0.5, atks: [
          { t: 'swing', range: 80, arc: 140, windup: 0.75, cd: 1.7, dmgMul: 1.2 },
          { t: 'nova', range: 140, radius: 160, windup: 1.1, cd: 7, dmgMul: 1.6 },
          { t: 'summon', range: 9999, windup: 1, cd: 15, mon: 'skeleton', count: 2 },
        ] },
        { above: 0, msg: 'Varok enrage : « La terre vous réclame ! »', speedMul: 1.3, atks: [
          { t: 'swing', range: 80, arc: 140, windup: 0.6, cd: 1.4, dmgMul: 1.3 },
          { t: 'charge', range: 520, min: 120, windup: 0.85, dist: 460, width: 56, cd: 5, dmgMul: 1.6 },
          { t: 'circle', range: 9999, radius: 62, delay: 1.2, windup: 0.4, cd: 6, count: 5, spread: 170 },
          { t: 'summon', range: 9999, windup: 1, cd: 16, mon: 'ghoul', count: 3 },
        ] },
      ] },
    mereRonce: { name: 'Mère-Ronce', boss: true, hp: 14000, dmg: 42, speed: 60, r: 32, xp: 900, gold: [260, 340], look: 'mereRonce', col: '#4c5e2a',
      intro: '« Mes enfants ont faim… et vous sentez si bon. »',
      phases: [
        { above: 0.55, atks: [
          { t: 'line', range: 9999, len: 520, width: 44, delay: 1.15, windup: 0.3, cd: 4.2, count: 3, spreadAng: 30, dmgMul: 1.1 },
          { t: 'circle', range: 9999, radius: 70, delay: 1.3, windup: 0.3, cd: 6, count: 4, spread: 150, poison: 1 },
          { t: 'summon', range: 9999, windup: 1.2, cd: 16, mon: 'spider', count: 2 },
        ] },
        { above: 0, msg: 'Mère-Ronce hurle : « Que la forêt vous dévore ! »', speedMul: 1.2, atks: [
          { t: 'line', range: 9999, len: 600, width: 48, delay: 0.95, windup: 0.25, cd: 3.6, count: 5, spreadAng: 25, dmgMul: 1.25 },
          { t: 'ring', range: 9999, windup: 0.8, cd: 5, count: 16, speed: 260, dmgMul: 0.8, color: '#4c5e2a' },
          { t: 'summon', range: 9999, windup: 1.2, cd: 15, mon: 'wolf', count: 2 },
          { t: 'nova', range: 150, radius: 170, windup: 1.0, cd: 7, dmgMul: 1.8 },
        ] },
      ] },
    grizzak: { name: 'Contremaître Grizzak', boss: true, hp: 24000, dmg: 62, speed: 90, r: 30, xp: 1500, gold: [380, 480], look: 'grizzak', col: '#6f8f3a',
      intro: '« Hé ! Personne entre dans MA mine sans payer ! Et le prix, c\'est ta vie ! »',
      phases: [
        { above: 0.6, atks: [
          { t: 'charge', range: 600, min: 100, windup: 0.9, dist: 560, width: 60, cd: 4.5, dmgMul: 1.6 },
          { t: 'circle', range: 9999, radius: 66, delay: 1.1, windup: 0.4, cd: 5, count: 6, spread: 200 },
          { t: 'swing', range: 80, arc: 130, windup: 0.6, cd: 1.5, dmgMul: 1.2 },
        ] },
        { above: 0.3, msg: 'Grizzak : « Les gars ! À moi ! »', atks: [
          { t: 'summon', range: 9999, windup: 1, cd: 12, mon: 'bomber', count: 2 },
          { t: 'charge', range: 600, min: 100, windup: 0.8, dist: 560, width: 60, cd: 4, dmgMul: 1.6 },
          { t: 'circle', range: 9999, radius: 66, delay: 1.0, windup: 0.4, cd: 4.5, count: 8, spread: 230 },
          { t: 'swing', range: 80, arc: 130, windup: 0.55, cd: 1.4, dmgMul: 1.2 },
        ] },
        { above: 0, msg: 'Grizzak allume toute sa réserve de poudre !', speedMul: 1.35, atks: [
          { t: 'ring', range: 9999, windup: 0.7, cd: 3.5, count: 18, speed: 300, dmgMul: 0.7, color: '#4a3b2a' },
          { t: 'charge', range: 600, min: 100, windup: 0.7, dist: 600, width: 60, cd: 3.5, dmgMul: 1.7 },
          { t: 'circle', range: 9999, radius: 70, delay: 0.9, windup: 0.3, cd: 4, count: 10, spread: 260 },
        ] },
      ] },
  };

  // ---------- Donjons ----------
  // rooms : [x, y, w, h, "spawns"] (en cases). "nom:n" = n monstres, "nom!:n" = élites, "chest" = coffre, "boss".
  D.DUNGEONS = [
    { id: 1, name: 'Cryptes de Cendrefosse', lvl: 1, boss: 'varok', theme: 'crypt', w: 90, h: 64, playable: true,
      story: 'Sous le vieux cimetière, Varok le Fossoyeur relève les morts de Havre-Gris. Il garde le premier Fragment du Sceau.',
      rooms: [[4, 28, 10, 9, 'entry'], [20, 26, 12, 12, 'skeleton:3'], [20, 6, 12, 10, 'ghoul:3 chest'], [40, 24, 16, 15, 'skeleton:3 skelArcher:2 cultist:1'],
        [40, 46, 13, 11, 'skeleton!:1 ghoul:2 chest'], [62, 26, 12, 12, 'ghoul:4 skelArcher:2'], [60, 5, 16, 12, 'cultist:2 skeleton:3 skelArcher!:1 chest'], [64, 44, 20, 17, 'boss']],
      links: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 6], [5, 7]] },
    { id: 2, name: 'Bois-Pendu', lvl: 4, boss: 'mereRonce', theme: 'forest', w: 90, h: 64, playable: true,
      story: 'Une forêt où les arbres ont des yeux. Mère-Ronce y tisse ses toiles autour du deuxième Fragment.',
      rooms: [[4, 4, 10, 9, 'entry'], [18, 6, 14, 10, 'wolf:3'], [38, 4, 12, 12, 'spider:3 wolf:1'], [20, 24, 14, 14, 'wolf:2 spider:2 chest'],
        [40, 24, 16, 14, 'treant!:1 wolf:3 spider:1'], [62, 8, 14, 12, 'spider:3 wolf:2 chest'], [62, 28, 12, 12, 'wolf:4 spider!:1'],
        [40, 44, 14, 12, 'wolf:3 spider:3 treant:1 chest'], [62, 44, 22, 18, 'boss']],
      links: [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [4, 6], [5, 6], [4, 7], [6, 8]] },
    { id: 3, name: 'Mines de Fer-Noir', lvl: 7, boss: 'grizzak', theme: 'mine', w: 90, h: 64, playable: true,
      story: 'Les gobelins ont creusé trop profond et trouvé le troisième Fragment. Leur chef Grizzak refuse de le rendre.',
      rooms: [[40, 52, 10, 9, 'entry'], [38, 36, 14, 11, 'goblin:4'], [16, 36, 14, 12, 'bomber:2 goblin:2 chest'], [60, 36, 14, 12, 'miner:3 bomber:1'],
        [16, 16, 14, 13, 'golem!:1 goblin:3'], [38, 16, 14, 13, 'miner:2 bomber:2 goblin:3'], [62, 16, 12, 12, 'bomber:3 miner!:1 chest'], [32, 1, 26, 13, 'boss']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [3, 6], [4, 5], [5, 7]] },
    { id: 4, name: 'Marais des Noyés', lvl: 10, bossName: 'Gloumbra, l\'Hydre vaseuse' },
    { id: 5, name: 'Bastion de la Garde Déchue', lvl: 13, bossName: 'Sire Halvard le Parjure' },
    { id: 6, name: 'Bibliothèque Interdite', lvl: 16, bossName: 'L\'Archiviste Sans-Yeux' },
    { id: 7, name: 'Cavernes de Cristal', lvl: 19, bossName: 'Prismatrix' },
    { id: 8, name: 'Pic des Harpies', lvl: 22, bossName: 'Reine Sycorax' },
    { id: 9, name: 'Temple Englouti', lvl: 25, bossName: 'Léviathe' },
    { id: 10, name: 'Forge des Titans', lvl: 28, bossName: 'Brasier, le Titan forgeron' },
    { id: 11, name: 'Désert des Os', lvl: 31, bossName: 'Sekhar, Roi des Sables' },
    { id: 12, name: 'Citadelle de Givre', lvl: 34, bossName: 'Hivernia, la Reine de Givre' },
    { id: 13, name: 'Jardin du Cauchemar', lvl: 37, bossName: 'Le Marchand de Sommeil' },
    { id: 14, name: 'Faille du Néant', lvl: 40, bossName: 'L\'Éclipse Rampante' },
    { id: 15, name: 'Trône de Cendres', lvl: 43, bossName: 'Malgrith, le Roi Cendré' },
  ];

  D.THEMES = {
    crypt: { floor: '#e6d9bc', floorAlt: '#dccdab', wall: '#7d7366', wallDark: '#3b342d', deco: ['tomb', 'candle', 'bones', 'urn'] },
    forest: { floor: '#dfe0b8', floorAlt: '#cfd39e', wall: '#4f6a34', wallDark: '#28361d', deco: ['mushroom', 'bush', 'stump', 'web'] },
    mine: { floor: '#ddd0b4', floorAlt: '#cdbd9b', wall: '#6d5c48', wallDark: '#2f2820', deco: ['crate', 'rail', 'barrel', 'ore'] },
    town: { floor: '#dfe0b8', floorAlt: '#d3d5a6', wall: '#4f6a34', wallDark: '#28361d' },
  };

  // ---------- Quêtes ----------
  D.QUESTS = [
    { id: 'q1', main: true, title: 'Le Fossoyeur', dungeon: 1, type: 'boss', target: 'varok', n: 1, lvl: 1,
      text: 'Héros, Havre-Gris est le dernier bastion de Valdorne. Le Roi Cendré a brisé le Sceau des Quinze, et ses lieutenants gardent les fragments. Le premier, Varok, se terre dans les Cryptes de Cendrefosse. Ramenez-moi son fragment.',
      reward: { gold: 120, xp: 250 } },
    { id: 'q1b', title: 'Os brisés', dungeon: 1, type: 'kill', target: 'skeleton', n: 12, lvl: 1,
      text: 'Les squelettes des cryptes remontent jusqu\'aux murailles la nuit. Détruisez-en douze.', reward: { gold: 60, xp: 120 } },
    { id: 'q2', main: true, title: 'La Mère des ronces', dungeon: 2, type: 'boss', target: 'mereRonce', n: 1, lvl: 4, after: 'q1',
      text: 'Le deuxième fragment est au cœur de Bois-Pendu. Une créature appelée Mère-Ronce s\'en est emparée. Les éclaireurs qui y sont allés ne sont jamais revenus.',
      reward: { gold: 260, xp: 700 } },
    { id: 'q2b', title: 'La meute', dungeon: 2, type: 'kill', target: 'wolf', n: 14, lvl: 4, after: 'q1',
      text: 'Les loups de Bois-Pendu attaquent nos convois. Abattez-en quatorze.', reward: { gold: 140, xp: 350 } },
    { id: 'q3', main: true, title: 'Le prix de la mine', dungeon: 3, type: 'boss', target: 'grizzak', n: 1, lvl: 7, after: 'q2',
      text: 'Les gobelins des Mines de Fer-Noir ont trouvé le troisième fragment. Leur chef, Grizzak, le garde au fond des galeries. Méfiez-vous de ses explosifs.',
      reward: { gold: 450, xp: 1500 } },
    { id: 'q3b', title: 'Désamorçage', dungeon: 3, type: 'kill', target: 'bomber', n: 8, lvl: 7, after: 'q2',
      text: 'Les artificiers gobelins font sauter nos galeries. Éliminez-en huit.', reward: { gold: 220, xp: 700 } },
  ];

  // ---------- Objets ----------
  D.SLOTS = ['arme', 'tete', 'torse', 'mains', 'jambes', 'pieds', 'anneau', 'amulette'];
  D.SLOT_NAMES = { arme: 'Arme', tete: 'Tête', torse: 'Torse', mains: 'Mains', jambes: 'Jambes', pieds: 'Pieds', anneau: 'Anneau', amulette: 'Amulette' };
  D.RARITY = [
    { name: 'Commun', color: '#6d665c', mult: 1, affixes: 0, value: 1 },
    { name: 'Peu commun', color: '#3f7d2a', mult: 1.15, affixes: 1, value: 2 },
    { name: 'Rare', color: '#2c5f9e', mult: 1.35, affixes: 2, value: 4 },
    { name: 'Épique', color: '#7b3fa6', mult: 1.6, affixes: 3, value: 9 },
    { name: 'Légendaire', color: '#c4661a', mult: 2.0, affixes: 4, value: 22 },
  ];
  D.BASES = {
    tete: ['Casque', 'Capuche', 'Heaume', 'Couronne', 'Masque'],
    torse: ['Plastron', 'Robe', 'Cuirasse', 'Tunique', 'Brigandine'],
    mains: ['Gantelets', 'Gants', 'Poignes', 'Mitaines'],
    jambes: ['Jambières', 'Grèves', 'Pantalon', 'Cuissards'],
    pieds: ['Bottes', 'Sandales', 'Solerets', 'Chausses'],
    anneau: ['Anneau', 'Chevalière', 'Bague', 'Sceau'],
    amulette: ['Amulette', 'Pendentif', 'Talisman', 'Médaillon'],
  };
  D.WEAPONS = {
    guerrier: ['Épée longue', 'Hache de guerre', 'Claymore'], mage: ['Bâton', 'Baguette', 'Sceptre arcanique'],
    samourai: ['Katana', 'Nodachi', 'Wakizashi'], archer: ['Arc long', 'Arc court', 'Arc composite'],
    soigneur: ['Masse', 'Sceptre sacré', 'Bâton de pèlerin'], paladin: ['Marteau', 'Masse d\'armes', 'Fléau'],
    necromancien: ['Faux', 'Bâton d\'os', 'Grimoire maudit'], assassin: ['Dagues', 'Lames jumelles', 'Kriss'],
    berserker: ['Haches jumelles', 'Grande hache', 'Hachoir'], barde: ['Luth', 'Harpe', 'Flûte de guerre'],
  };
  D.SUFFIX = ['du Loup', 'de l\'Ours', 'du Faucon', 'de la Braise', 'du Givre', 'des Ombres', 'de l\'Aube', 'du Sanglier', 'de la Tempête',
    'des Anciens', 'du Crépuscule', 'de la Marée', 'du Corbeau', 'de l\'Éclipse', 'du Serment', 'des Cendres'];
  D.LEGENDARY = ['Cendrelame', 'Murmure-du-Néant', 'Cœur de Varok', 'Chant des Ronces', 'Fer-Maudit', 'Larme de l\'Aube', 'Ultime Serment', 'Briseur de Sceaux'];
  D.STAT_NAMES = { pow: 'Puissance', vit: 'Vitalité', arm: 'Armure', crit: 'Critique', haste: 'Hâte' };

  D.POTION_PRICE = (lvl) => 20 + lvl * 6;
  D.MAX_POTIONS = 5;
  D.BAG_SIZE = 30;
  D.MAX_LEVEL = 50;
  D.xpNext = (lvl) => Math.round(90 * Math.pow(lvl, 1.65));
})();
