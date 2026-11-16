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

  // ---------- Difficulté ("très dur") ----------
  D.DIFF = {
    monHp: 1.5, monDmg: 1.55,      // multiplicateurs des monstres normaux
    eliteHp: 4, eliteDmg: 1.5,     // multiplicateurs des élites
    windup: 0.88,                  // les monstres préparent leurs coups plus vite
    aggro: 340, alert: 300,        // distance de repérage / d'appel à l'aide
    enrage: 150,                   // secondes avant la rage des boss
    extra: 1,                      // monstres en plus par groupe de 2 ou plus
  };
  D.POTION_HEAL = 0.3;
  D.POTION_CD = 15;

  // Pouvoirs des élites (1 au donjon 1-2, 2 à partir du donjon 3)
  D.AFFIXES = {
    rapide: { name: 'Rapide', speed: 1.35, windup: 0.85 },
    enrage: { name: 'Enragé', dmg: 1.3 },
    blinde: { name: 'Blindé', hp: 1.5 },
    vampire: { name: 'Vampirique', vamp: 0.4 },
    explosif: { name: 'Explosif', explode: true },
    glacial: { name: 'Glacial', chill: 0.4 },
  };

  // ---------- Monstres ----------
  // atks : swing = mêlée en cône, shoot = projectile, circle = zone au sol à retardement, nova = zone autour de soi,
  // charge = ruée en ligne, summon = invocation, ring = projectiles en cercle, line = ligne au sol,
  // combo = enchaînement de coups, zone = sol maudit qui dure, dive = plongée puis surgissement, heal = soigne un allié,
  // shieldAdds = bouclier tant que les gardes vivent, spiral = spirale de projectiles, explode = se fait exploser.
  // Traits : keep (garde ses distances), guard (bloque de face), regen, split, erratic, blink, flying, glow.
  D.MONSTERS = {
    skeleton: { name: 'Squelette', hp: 55, dmg: 13, speed: 80, r: 13, xp: 10, gold: [1, 4], look: 'skeleton', col: '#e4dcc6',
      atks: [{ t: 'swing', range: 44, arc: 90, windup: 0.45, cd: 1.3 }] },
    skelArcher: { name: 'Squelette archer', hp: 40, dmg: 11, speed: 75, r: 12, xp: 12, gold: [2, 5], look: 'skelArcher', col: '#e4dcc6', keep: 230,
      atks: [{ t: 'shoot', range: 380, windup: 0.55, cd: 1.9, speed: 330 }] },
    ghoul: { name: 'Goule', hp: 45, dmg: 9, speed: 135, r: 12, xp: 10, gold: [1, 3], look: 'ghoul', col: '#8c9a7a',
      atks: [{ t: 'swing', range: 38, arc: 80, windup: 0.3, cd: 0.85 }] },
    cultist: { name: 'Acolyte cendré', hp: 50, dmg: 20, speed: 70, r: 13, xp: 14, gold: [3, 7], look: 'cultist', col: '#5a4a5e', keep: 270,
      atks: [{ t: 'circle', range: 420, radius: 58, delay: 1.05, windup: 0.3, cd: 3.0 }] },
    wolf: { name: 'Loup de Bois-Pendu', hp: 55, dmg: 11, speed: 158, r: 13, xp: 12, gold: [1, 4], look: 'wolf', col: '#6e6458',
      atks: [{ t: 'swing', range: 40, arc: 80, windup: 0.32, cd: 0.9 }, { t: 'charge', range: 230, min: 90, windup: 0.6, dist: 210, width: 30, cd: 5, dmgMul: 1.4 }] },
    spider: { name: 'Araignée tisseuse', hp: 45, dmg: 10, speed: 95, r: 12, xp: 12, gold: [2, 5], look: 'spider', col: '#3e3a2f', keep: 210,
      atks: [{ t: 'shoot', range: 360, windup: 0.5, cd: 2.0, speed: 310, slow: 0.4, poison: 0.6, color: '#6b8f2a' }] },
    treant: { name: 'Sylvain corrompu', hp: 110, dmg: 22, speed: 55, r: 20, xp: 30, gold: [5, 12], look: 'treant', col: '#5d6b37',
      atks: [{ t: 'swing', range: 58, arc: 110, windup: 0.7, cd: 1.6 }, { t: 'nova', range: 120, radius: 130, windup: 1.1, cd: 6, dmgMul: 1.3 }] },
    goblin: { name: 'Gobelin mineur', hp: 50, dmg: 11, speed: 142, r: 11, xp: 12, gold: [2, 6], look: 'goblin', col: '#6f8f3a',
      atks: [{ t: 'swing', range: 38, arc: 85, windup: 0.33, cd: 0.9 }] },
    bomber: { name: 'Gobelin artificier', hp: 42, dmg: 24, speed: 95, r: 11, xp: 14, gold: [3, 7], look: 'bomber', col: '#6f8f3a', keep: 240,
      atks: [{ t: 'circle', range: 400, radius: 62, delay: 1.0, windup: 0.4, cd: 2.8, count: 1 }] },
    miner: { name: 'Contremaître brutal', hp: 85, dmg: 18, speed: 85, r: 15, xp: 18, gold: [4, 9], look: 'miner', col: '#7c6a52',
      atks: [{ t: 'swing', range: 52, arc: 120, windup: 0.6, cd: 1.4 }, { t: 'charge', range: 260, min: 100, windup: 0.8, dist: 260, width: 36, cd: 6, dmgMul: 1.3 }] },
    golem: { name: 'Golem de fer-noir', hp: 150, dmg: 26, speed: 60, r: 21, xp: 40, gold: [8, 15], look: 'golem', col: '#56565c',
      atks: [{ t: 'swing', range: 62, arc: 120, windup: 0.8, cd: 1.8 }, { t: 'charge', range: 320, min: 120, windup: 1.0, dist: 340, width: 46, cd: 7, dmgMul: 1.5 }, { t: 'nova', range: 110, radius: 125, windup: 1.2, cd: 8 }] },

    // ----- Marais des Noyés -----
    drowned: { name: 'Noyé', hp: 95, dmg: 16, speed: 68, r: 14, xp: 16, gold: [3, 7], look: 'drowned', col: '#5d7a6e',
      atks: [{ t: 'swing', range: 46, arc: 95, windup: 0.5, cd: 1.4, slow: 0.45 }] },
    toad: { name: 'Crapaud-buffle', hp: 70, dmg: 14, speed: 85, r: 14, xp: 16, gold: [3, 7], look: 'toad', col: '#6b7a3a', keep: 200,
      atks: [{ t: 'shoot', range: 360, windup: 0.5, cd: 2.2, speed: 300, poison: 0.7, color: '#8aa03a' }, { t: 'charge', range: 260, min: 100, windup: 0.6, dist: 200, width: 34, cd: 6, dmgMul: 1.2 }] },
    wisp: { name: 'Feu follet', hp: 32, dmg: 30, speed: 170, r: 9, xp: 12, gold: [2, 5], look: 'wisp', col: '#9be0d0', glow: '#9be0d0', flying: true,
      atks: [{ t: 'explode', range: 44, radius: 72, windup: 0.55, cd: 99 }] },
    troll: { name: 'Troll des marais', hp: 170, dmg: 26, speed: 72, r: 20, xp: 45, gold: [9, 16], look: 'troll', col: '#5d7a4e', regen: 0.02,
      atks: [{ t: 'swing', range: 62, arc: 120, windup: 0.75, cd: 1.7 }, { t: 'nova', range: 120, radius: 135, windup: 1.1, cd: 7, dmgMul: 1.3 }, { t: 'charge', range: 300, min: 120, windup: 0.9, dist: 300, width: 46, cd: 8, dmgMul: 1.4 }] },

    // ----- Bastion de la Garde Déchue -----
    fallen: { name: 'Soldat déchu', hp: 110, dmg: 19, speed: 80, r: 14, xp: 20, gold: [4, 9], look: 'fallen', col: '#7d7366', guard: 0.7,
      atks: [{ t: 'swing', range: 50, arc: 100, windup: 0.55, cd: 1.4 }, { t: 'combo', range: 56, arc: 110, windup: 0.5, interval: 0.45, hits: 2, cd: 5, dmgMul: 0.9, lunge: 16 }] },
    crossbow: { name: 'Arbalétrier spectral', hp: 62, dmg: 22, speed: 70, r: 13, xp: 18, gold: [4, 9], look: 'crossbow', col: '#8fa3b0', keep: 300, glow: '#b8d0dc',
      atks: [{ t: 'line', range: 560, len: 620, width: 18, delay: 0.95, windup: 0.3, cd: 3.4, dmgMul: 1.6, color: '#5a6f7d' }] },
    warhound: { name: 'Molosse de guerre', hp: 60, dmg: 13, speed: 172, r: 13, xp: 14, gold: [2, 6], look: 'warhound', col: '#5a4a3e',
      atks: [{ t: 'swing', range: 40, arc: 80, windup: 0.3, cd: 0.85 }, { t: 'charge', range: 240, min: 90, windup: 0.55, dist: 220, width: 30, cd: 5, dmgMul: 1.4 }] },
    priest: { name: 'Prêtre corrompu', hp: 72, dmg: 16, speed: 72, r: 13, xp: 24, gold: [5, 11], look: 'priest', col: '#6a5a2a', keep: 260,
      atks: [{ t: 'heal', range: 340, pct: 0.25, windup: 1.1, cd: 4.5 }, { t: 'circle', range: 420, radius: 60, delay: 1.1, windup: 0.4, cd: 3.6, color: '#b8862b' }] },
    champion: { name: 'Champion parjure', hp: 210, dmg: 28, speed: 88, r: 19, xp: 55, gold: [10, 18], look: 'champion', col: '#6d6d75', guard: 0.6,
      atks: [{ t: 'combo', range: 70, arc: 130, windup: 0.6, interval: 0.45, hits: 3, cd: 3.5, dmgMul: 0.9, lunge: 22 }, { t: 'charge', range: 340, min: 120, windup: 0.85, dist: 340, width: 48, cd: 6, dmgMul: 1.4 }] },

    // ----- Bibliothèque Interdite -----
    book: { name: 'Grimoire volant', hp: 48, dmg: 14, speed: 160, r: 10, xp: 14, gold: [2, 6], look: 'book', col: '#7a2734', erratic: true, flying: true,
      atks: [{ t: 'swing', range: 36, arc: 80, windup: 0.3, cd: 0.8 }] },
    apprentice: { name: 'Apprenti maudit', hp: 66, dmg: 23, speed: 80, r: 13, xp: 20, gold: [4, 10], look: 'apprentice', col: '#4a2f6a', keep: 260, blink: { range: 140, dist: 230, cd: 6 }, glow: '#a07ad0',
      atks: [{ t: 'circle', range: 440, radius: 62, delay: 1.0, windup: 0.4, cd: 3.2, count: 2, spread: 90, color: '#7b3fa6' }, { t: 'shoot', range: 400, windup: 0.4, cd: 2.4, speed: 390, color: '#7b3fa6' }] },
    inkslime: { name: 'Encre vivante', hp: 100, dmg: 18, speed: 72, r: 15, xp: 18, gold: [3, 8], look: 'inkslime', col: '#1d1610', split: { into: 'inkling', n: 2 },
      atks: [{ t: 'swing', range: 44, arc: 100, windup: 0.5, cd: 1.3, slow: 0.35 }] },
    inkling: { name: 'Gouttelette d\'encre', hp: 40, dmg: 10, speed: 115, r: 9, xp: 6, gold: [1, 2], look: 'inkling', col: '#1d1610',
      atks: [{ t: 'swing', range: 32, arc: 80, windup: 0.35, cd: 1.0 }] },
    gargoyle: { name: 'Gargouille', hp: 150, dmg: 25, speed: 85, r: 17, xp: 40, gold: [8, 15], look: 'gargoyle', col: '#7a7a82', flying: true,
      atks: [{ t: 'swing', range: 54, arc: 110, windup: 0.6, cd: 1.5 }, { t: 'charge', range: 380, min: 120, windup: 0.8, dist: 380, width: 44, cd: 6, dmgMul: 1.5 }] },

    // ----- Cavernes de Cristal -----
    shardling: { name: 'Éclat animé', hp: 36, dmg: 9, speed: 155, r: 9, xp: 12, gold: [2, 5], look: 'shardling', col: '#8fd8f0', glow: '#8fd8f0',
      atks: [{ t: 'swing', range: 32, arc: 80, windup: 0.3, cd: 0.8 }] },
    crystalSpider: { name: 'Araignée de cristal', hp: 60, dmg: 13, speed: 120, r: 13, xp: 18, gold: [3, 7], look: 'crystalSpider', col: '#6f8fd0', keep: 220,
      atks: [{ t: 'shoot', range: 380, windup: 0.55, cd: 2.8, speed: 340, count: 3, spreadAng: 14, dmgMul: 0.8, color: '#8fd8f0' }] },
    geode: { name: 'Géode vivante', hp: 120, dmg: 20, speed: 70, r: 16, xp: 26, gold: [5, 11], look: 'geode', col: '#7a6f8a', deathRing: { count: 8, speed: 240, dmgMul: 0.35, color: '#b48ae0' },
      atks: [{ t: 'swing', range: 50, arc: 110, windup: 0.6, cd: 1.5 }, { t: 'charge', range: 320, min: 110, windup: 0.8, dist: 320, width: 40, cd: 6, dmgMul: 1.4 }] },
    luminant: { name: 'Luminant', hp: 70, dmg: 22, speed: 80, r: 13, xp: 22, gold: [4, 10], look: 'luminant', col: '#b48ae0', keep: 260, glow: '#b48ae0', blink: { range: 130, dist: 220, cd: 9 },
      atks: [{ t: 'line', range: 520, len: 560, width: 20, delay: 0.9, windup: 0.3, cd: 3.4, dmgMul: 1.2, color: '#9b6fe0' }, { t: 'circle', range: 440, radius: 60, delay: 1.0, windup: 0.4, cd: 4, color: '#9b6fe0' }] },
    crystalGolem: { name: 'Colosse de cristal', hp: 220, dmg: 30, speed: 60, r: 22, xp: 60, gold: [12, 22], look: 'crystalGolem', col: '#6f8fd0', glow: '#8fd8f0', deathRing: { count: 12, speed: 260, dmgMul: 0.45, color: '#8fd8f0' },
      atks: [{ t: 'swing', range: 66, arc: 120, windup: 0.8, cd: 1.7 }, { t: 'nova', range: 130, radius: 140, windup: 1.2, cd: 7, dmgMul: 1.3 },
        { t: 'sweep', range: 360, len: 360, width: 30, steps: 6, stepAng: 18, stepT: 0.1, delay: 0.8, windup: 0.5, cd: 9, dmgMul: 0.9, color: '#5fc0e0' }] },
    prism: { name: 'Prisme', hp: 90, dmg: 20, speed: 0, r: 14, xp: 10, gold: [1, 3], look: 'prism', col: '#8fd8f0', glow: '#8fd8f0',
      atks: [{ t: 'line', range: 900, len: 760, width: 22, delay: 1.0, windup: 0.3, cd: 3.4, dmgMul: 1.3, color: '#5fc0e0' }] },

    // ----- Pic des Harpies -----
    harpy: { name: 'Harpie', hp: 60, dmg: 14, speed: 170, r: 12, xp: 18, gold: [3, 7], look: 'harpy', col: '#8a5a3a', flying: true,
      atks: [{ t: 'swing', range: 36, arc: 80, windup: 0.3, cd: 0.9 }, { t: 'charge', range: 300, min: 100, windup: 0.5, dist: 280, width: 34, cd: 5, dmgMul: 1.3 }] },
    frostWolf: { name: 'Loup des neiges', hp: 65, dmg: 13, speed: 160, r: 13, xp: 16, gold: [2, 6], look: 'wolf', col: '#dfe6ee',
      atks: [{ t: 'swing', range: 40, arc: 80, windup: 0.32, cd: 0.9, slow: 0.3 }, { t: 'charge', range: 230, min: 90, windup: 0.6, dist: 210, width: 30, cd: 5, dmgMul: 1.4 }] },
    yeti: { name: 'Yéti', hp: 160, dmg: 24, speed: 80, r: 19, xp: 45, gold: [9, 17], look: 'yeti', col: '#eef1f4',
      atks: [{ t: 'swing', range: 58, arc: 120, windup: 0.65, cd: 1.5, slow: 0.3 }, { t: 'nova', range: 120, radius: 140, windup: 1.1, cd: 6, dmgMul: 1.3 },
        { t: 'shoot', range: 360, windup: 0.6, cd: 4, speed: 300, dmgMul: 1.1, slow: 0.4, color: '#e8f0f8' }] },
    iceShaman: { name: 'Chaman du givre', hp: 75, dmg: 21, speed: 75, r: 13, xp: 26, gold: [5, 11], look: 'iceShaman', col: '#6fb1d9', keep: 260, glow: '#9fd0f0',
      atks: [{ t: 'circle', range: 440, radius: 64, delay: 1.0, windup: 0.4, cd: 3.2, count: 2, spread: 100, color: '#6fb1d9', slow: 0.35 }, { t: 'heal', range: 320, pct: 0.2, windup: 1.1, cd: 6 }] },

    // ----- Temple Englouti -----
    merfolk: { name: 'Triton', hp: 100, dmg: 19, speed: 95, r: 14, xp: 24, gold: [4, 10], look: 'merfolk', col: '#4f8a86',
      atks: [{ t: 'combo', range: 66, arc: 60, windup: 0.5, interval: 0.4, hits: 2, cd: 3, dmgMul: 0.9, lunge: 24 }, { t: 'swing', range: 62, arc: 50, windup: 0.45, cd: 1.3 }] },
    siren: { name: 'Sirène', hp: 70, dmg: 20, speed: 80, r: 13, xp: 26, gold: [5, 11], look: 'siren', col: '#5f9fa6', keep: 260, glow: '#7fd0e0',
      atks: [{ t: 'shoot', range: 420, windup: 0.45, cd: 2.2, speed: 340, slow: 0.45, color: '#7fd0e0' }, { t: 'circle', range: 440, radius: 70, delay: 1.1, windup: 0.4, cd: 4.2, color: '#5f9fa6', slow: 0.3 },
        { t: 'heal', range: 300, pct: 0.2, windup: 1.1, cd: 7 }] },
    crab: { name: 'Crabe colossal', hp: 150, dmg: 22, speed: 65, r: 17, xp: 34, gold: [6, 13], look: 'crab', col: '#b5461d', guard: 0.75,
      atks: [{ t: 'swing', range: 54, arc: 110, windup: 0.6, cd: 1.5 }, { t: 'combo', range: 54, arc: 100, windup: 0.5, interval: 0.35, hits: 2, cd: 4.5, dmgMul: 0.9, lunge: 10 }] },
    eel: { name: 'Anguille électrique', hp: 60, dmg: 16, speed: 180, r: 11, xp: 18, gold: [3, 7], look: 'eel', col: '#3e5a4a', glow: '#e8e070', flying: true,
      atks: [{ t: 'charge', range: 300, min: 80, windup: 0.45, dist: 260, width: 30, cd: 3.5, dmgMul: 1.3 }, { t: 'swing', range: 34, arc: 80, windup: 0.3, cd: 0.9 }] },
    deepOne: { name: 'Gardien des abysses', hp: 230, dmg: 30, speed: 80, r: 21, xp: 65, gold: [13, 24], look: 'deepOne', col: '#2f5d6a', regen: 0.015, glow: '#7fd0e0',
      atks: [{ t: 'combo', range: 72, arc: 130, windup: 0.6, interval: 0.45, hits: 3, cd: 3.6, dmgMul: 0.9, lunge: 20 }, { t: 'nova', range: 130, radius: 140, windup: 1.1, cd: 7, dmgMul: 1.3 },
        { t: 'whirlpool', range: 400, radius: 110, dur: 5, pull: 70, windup: 0.8, cd: 12, dmgMul: 0.12 }] },

    // ----- Tutoriel -----
    dummy: { name: 'Mannequin d\'entraînement', hp: 999999, dmg: 0, speed: 0, r: 15, xp: 0, gold: [0, 0], look: 'dummy', col: '#c9a46a', dummy: true, atks: [] },
    runeStone: { name: 'Pierre runique', hp: 999999, dmg: 7, speed: 0, r: 18, xp: 0, gold: [0, 0], look: 'runeStone', col: '#7b3fa6', dummy: true, glow: '#b48ae0',
      atks: [{ t: 'circle', range: 600, radius: 64, delay: 1.35, windup: 0.4, cd: 2.3 }] },
    rat: { name: 'Rat d\'égout', hp: 20, dmg: 4, speed: 115, r: 9, xp: 15, gold: [1, 3], look: 'rat', col: '#6b5a4a',
      atks: [{ t: 'swing', range: 30, arc: 80, windup: 0.45, cd: 1.2 }] },

    // ----- Boss -----
    varok: { name: 'Varok le Fossoyeur', boss: true, hp: 10500, dmg: 42, speed: 82, r: 30, xp: 450, gold: [160, 230], look: 'varok', col: '#5a5047',
      intro: '« Encore un vivant qui vient creuser sa propre tombe… »',
      phases: [
        { above: 0.5, atks: [
          { t: 'swing', range: 80, arc: 140, windup: 0.7, cd: 1.6, dmgMul: 1.2 },
          { t: 'nova', range: 140, radius: 160, windup: 1.05, cd: 7, dmgMul: 1.6 },
          { t: 'summon', range: 9999, windup: 1, cd: 14, mon: 'skeleton', count: 2 },
        ] },
        { above: 0, msg: 'Varok enrage : « La terre vous réclame ! »', speedMul: 1.3, atks: [
          { t: 'swing', range: 80, arc: 140, windup: 0.55, cd: 1.3, dmgMul: 1.3 },
          { t: 'charge', range: 520, min: 120, windup: 0.8, dist: 460, width: 56, cd: 5, dmgMul: 1.6 },
          { t: 'circle', range: 9999, radius: 62, delay: 1.15, windup: 0.4, cd: 5.5, count: 5, spread: 170 },
          { t: 'summon', range: 9999, windup: 1, cd: 15, mon: 'ghoul', count: 3 },
        ] },
      ] },
    mereRonce: { name: 'Mère-Ronce', boss: true, hp: 17500, dmg: 50, speed: 60, r: 32, xp: 900, gold: [260, 340], look: 'mereRonce', col: '#4c5e2a',
      intro: '« Mes enfants ont faim… et vous sentez si bon. »',
      phases: [
        { above: 0.55, atks: [
          { t: 'line', range: 9999, len: 520, width: 44, delay: 1.1, windup: 0.3, cd: 4.0, count: 3, spreadAng: 30, dmgMul: 1.1 },
          { t: 'circle', range: 9999, radius: 70, delay: 1.25, windup: 0.3, cd: 6, count: 4, spread: 150, poison: 1, pool: { dur: 5, dmgMul: 0.1 } },
          { t: 'summon', range: 9999, windup: 1.2, cd: 16, mon: 'spider', count: 2 },
        ] },
        { above: 0, msg: 'Mère-Ronce hurle : « Que la forêt vous dévore ! »', speedMul: 1.2, atks: [
          { t: 'line', range: 9999, len: 600, width: 48, delay: 0.9, windup: 0.25, cd: 3.4, count: 5, spreadAng: 25, dmgMul: 1.25 },
          { t: 'ring', range: 9999, windup: 0.8, cd: 5, count: 16, speed: 260, dmgMul: 0.8, color: '#4c5e2a' },
          { t: 'summon', range: 9999, windup: 1.2, cd: 15, mon: 'wolf', count: 2 },
          { t: 'nova', range: 150, radius: 170, windup: 1.0, cd: 7, dmgMul: 1.8 },
        ] },
      ] },
    grizzak: { name: 'Contremaître Grizzak', boss: true, hp: 30000, dmg: 74, speed: 90, r: 30, xp: 1500, gold: [380, 480], look: 'grizzak', col: '#6f8f3a',
      intro: '« Hé ! Personne entre dans MA mine sans payer ! Et le prix, c\'est ta vie ! »',
      phases: [
        { above: 0.6, atks: [
          { t: 'charge', range: 600, min: 100, windup: 0.85, dist: 560, width: 60, cd: 4.5, dmgMul: 1.6 },
          { t: 'circle', range: 9999, radius: 66, delay: 1.05, windup: 0.4, cd: 5, count: 6, spread: 200 },
          { t: 'swing', range: 80, arc: 130, windup: 0.55, cd: 1.4, dmgMul: 1.2 },
        ] },
        { above: 0.3, msg: 'Grizzak : « Les gars ! À moi ! »', atks: [
          { t: 'summon', range: 9999, windup: 1, cd: 12, mon: 'bomber', count: 2 },
          { t: 'charge', range: 600, min: 100, windup: 0.75, dist: 560, width: 60, cd: 4, dmgMul: 1.6 },
          { t: 'circle', range: 9999, radius: 66, delay: 0.95, windup: 0.4, cd: 4.5, count: 8, spread: 230 },
          { t: 'swing', range: 80, arc: 130, windup: 0.5, cd: 1.3, dmgMul: 1.2 },
        ] },
        { above: 0, msg: 'Grizzak allume toute sa réserve de poudre !', speedMul: 1.35, atks: [
          { t: 'ring', range: 9999, windup: 0.7, cd: 3.5, count: 18, speed: 300, dmgMul: 0.7, color: '#4a3b2a' },
          { t: 'charge', range: 600, min: 100, windup: 0.65, dist: 600, width: 60, cd: 3.5, dmgMul: 1.7 },
          { t: 'circle', range: 9999, radius: 70, delay: 0.85, windup: 0.3, cd: 4, count: 10, spread: 260 },
        ] },
      ] },
    gloumbra: { name: 'Gloumbra, l\'Hydre vaseuse', boss: true, hp: 40000, dmg: 82, speed: 55, r: 36, xp: 2600, gold: [520, 640], look: 'gloumbra', col: '#4d6b5a',
      intro: '« Blrrrb… Trois têtes, trois fois plus faim. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'shoot', range: 9999, windup: 0.6, cd: 2.4, speed: 330, count: 3, spreadAng: 22, poison: 0.5, color: '#6b8f2a', dmgMul: 0.8 },
          { t: 'circle', range: 9999, radius: 74, delay: 1.2, windup: 0.4, cd: 6, count: 4, spread: 170, pool: { dur: 6, dmgMul: 0.12 } },
          { t: 'swing', range: 92, arc: 150, windup: 0.7, cd: 1.8, dmgMul: 1.2 },
          { t: 'summon', range: 9999, windup: 1.2, cd: 18, mon: 'drowned', count: 2 },
        ] },
        { above: 0.3, msg: 'Gloumbra plonge sous la vase !', atks: [
          { t: 'dive', range: 9999, radius: 150, windup: 1.6, cd: 7, dmgMul: 1.7 },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.2, speed: 350, count: 5, spreadAng: 18, poison: 0.5, color: '#6b8f2a', dmgMul: 0.8 },
          { t: 'circle', range: 9999, radius: 74, delay: 1.1, windup: 0.4, cd: 5.5, count: 5, spread: 200, pool: { dur: 6, dmgMul: 0.12 } },
          { t: 'swing', range: 92, arc: 150, windup: 0.6, cd: 1.6, dmgMul: 1.2 },
        ] },
        { above: 0, msg: 'Les têtes de Gloumbra repoussent… et elles ont faim.', speedMul: 1.25, atks: [
          { t: 'dive', range: 9999, radius: 160, windup: 1.4, cd: 6, dmgMul: 1.8 },
          { t: 'ring', range: 9999, windup: 0.7, cd: 4.5, count: 20, speed: 280, dmgMul: 0.7, color: '#6b8f2a', poison: 0.4 },
          { t: 'shoot', range: 9999, windup: 0.45, cd: 2, speed: 370, count: 7, spreadAng: 15, poison: 0.5, color: '#6b8f2a', dmgMul: 0.75 },
          { t: 'summon', range: 9999, windup: 1, cd: 16, mon: 'wisp', count: 3 },
        ] },
      ] },
    halvard: { name: 'Sire Halvard le Parjure', boss: true, hp: 52000, dmg: 92, speed: 95, r: 30, xp: 4200, gold: [700, 860], look: 'halvard', col: '#7d7366',
      intro: '« J\'ai juré de protéger Valdorne. Puis le Roi Cendré m\'a offert l\'éternité. »',
      phases: [
        { above: 0.7, atks: [
          { t: 'combo', range: 100, arc: 140, windup: 0.6, interval: 0.5, hits: 3, cd: 3.2, dmgMul: 0.9, lunge: 26 },
          { t: 'charge', range: 600, min: 140, windup: 0.8, dist: 520, width: 54, cd: 6, dmgMul: 1.5 },
          { t: 'zone', range: 9999, radius: 95, delay: 0.9, windup: 0.4, cd: 6, dur: 6, dmgMul: 0.22, color: '#c9a227' },
        ] },
        { above: 0.4, msg: 'Halvard lève son bouclier : « Gardes ! Protégez votre seigneur ! »', atks: [
          { t: 'shieldAdds', range: 9999, windup: 1.2, cd: 40, dur: 22, adds: [['fallen', 2], ['priest', 1]] },
          { t: 'zone', range: 9999, radius: 95, delay: 0.9, windup: 0.4, cd: 5, dur: 6, dmgMul: 0.22, color: '#c9a227', count: 2, spread: 160 },
          { t: 'combo', range: 100, arc: 140, windup: 0.55, interval: 0.45, hits: 3, cd: 3, dmgMul: 0.9, lunge: 26 },
          { t: 'line', range: 9999, len: 560, width: 40, delay: 0.9, windup: 0.3, cd: 5, count: 3, spreadAng: 22, dmgMul: 1.2, color: '#b8862b' },
        ] },
        { above: 0, msg: 'Halvard : « Si je dois tomber, Valdorne tombera avec moi ! »', speedMul: 1.25, atks: [
          { t: 'combo', range: 100, arc: 150, windup: 0.45, interval: 0.38, hits: 4, cd: 2.6, dmgMul: 0.9, lunge: 30 },
          { t: 'charge', range: 600, min: 120, windup: 0.65, dist: 560, width: 56, cd: 4.5, dmgMul: 1.6 },
          { t: 'line', range: 9999, len: 600, width: 42, delay: 0.85, windup: 0.25, cd: 4.2, count: 5, spreadAng: 20, dmgMul: 1.25, color: '#b8862b' },
          { t: 'zone', range: 9999, radius: 100, delay: 0.8, windup: 0.3, cd: 5, dur: 7, dmgMul: 0.25, color: '#c9a227', count: 2, spread: 180 },
        ] },
      ] },
    archiviste: { name: 'L\'Archiviste Sans-Yeux', boss: true, hp: 64000, dmg: 100, speed: 70, r: 30, xp: 6500, gold: [900, 1100], look: 'archiviste', col: '#3b3346',
      blink: { range: 130, dist: 280, cd: 7 }, glow: '#a07ad0',
      intro: '« Chut. Ici, même les cris doivent être murmurés. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'line', range: 9999, len: 600, width: 36, delay: 0.95, windup: 0.3, cd: 3.6, count: 3, spreadAng: 26, dmgMul: 1.1, color: '#3b3346' },
          { t: 'circle', range: 9999, radius: 66, delay: 1.1, windup: 0.4, cd: 5, count: 6, spread: 220, color: '#7b3fa6' },
          { t: 'summon', range: 9999, windup: 1, cd: 15, mon: 'book', count: 3 },
        ] },
        { above: 0.3, msg: 'L\'Archiviste : « Silence dans ma bibliothèque ! »', atks: [
          { t: 'spiral', range: 9999, windup: 0.8, cd: 8, arms: 2, dur: 3.2, rate: 0.12, speed: 210, spin: 1.9, dmgMul: 0.55, color: '#3b3346' },
          { t: 'circle', range: 9999, radius: 66, delay: 1.0, windup: 0.4, cd: 4.5, count: 6, spread: 230, color: '#7b3fa6' },
          { t: 'summon', range: 9999, windup: 1, cd: 16, mon: 'inkslime', count: 2 },
          { t: 'line', range: 9999, len: 600, width: 36, delay: 0.9, windup: 0.3, cd: 4, count: 3, spreadAng: 26, dmgMul: 1.1, color: '#3b3346' },
        ] },
        { above: 0, msg: 'L\'Archiviste ouvre le Livre Interdit !', speedMul: 1.2, atks: [
          { t: 'spiral', range: 9999, windup: 0.6, cd: 6.5, arms: 3, dur: 3.5, rate: 0.1, speed: 230, spin: 2.3, dmgMul: 0.55, color: '#3b3346' },
          { t: 'ring', range: 9999, windup: 0.6, cd: 5, count: 22, speed: 260, dmgMul: 0.6, color: '#3b3346' },
          { t: 'line', range: 9999, len: 640, width: 38, delay: 0.85, windup: 0.25, cd: 3.8, count: 5, spreadAng: 22, dmgMul: 1.15, color: '#3b3346' },
          { t: 'summon', range: 9999, windup: 1, cd: 18, mon: 'book', count: 4 },
        ] },
      ] },
    prismatrix: { name: 'Prismatrix', boss: true, hp: 80000, dmg: 110, speed: 65, r: 34, xp: 9000, gold: [1200, 1500], look: 'prismatrix', col: '#8a6fd0', glow: '#b48ae0',
      intro: '« Chaque éclat de moi est un miroir. Et chaque miroir te tuera. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'shoot', range: 9999, windup: 0.55, cd: 2.4, speed: 380, count: 5, spreadAng: 12, dmgMul: 0.7, color: '#8fd8f0' },
          { t: 'sweep', range: 9999, len: 640, width: 34, steps: 10, stepAng: 14, stepT: 0.1, delay: 0.9, windup: 0.5, cd: 7, dmgMul: 1.1, color: '#9b6fe0' },
          { t: 'swing', range: 96, arc: 140, windup: 0.7, cd: 1.8, dmgMul: 1.2 },
        ] },
        { above: 0.3, msg: 'Prismatrix se fragmente : des prismes jaillissent du sol !', atks: [
          { t: 'summon', range: 9999, windup: 1, cd: 22, mon: 'prism', count: 3, spread: 300 },
          { t: 'sweep', range: 9999, len: 660, width: 34, steps: 12, stepAng: 15, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 6.5, dmgMul: 1.1, color: '#9b6fe0' },
          { t: 'ring', range: 9999, windup: 0.7, cd: 5, count: 18, speed: 260, dmgMul: 0.6, color: '#8fd8f0' },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.4, speed: 400, count: 5, spreadAng: 12, dmgMul: 0.7, color: '#8fd8f0' },
        ] },
        { above: 0, msg: 'Le cœur de Prismatrix s\'emballe !', speedMul: 1.2, atks: [
          { t: 'sweep', range: 9999, len: 700, width: 36, steps: 16, stepAng: 22, stepT: 0.08, delay: 0.8, windup: 0.45, cd: 6, dmgMul: 1.1, color: '#9b6fe0' },
          { t: 'ring', range: 9999, windup: 0.6, cd: 4, count: 24, speed: 280, dmgMul: 0.6, color: '#8fd8f0' },
          { t: 'summon', range: 9999, windup: 1, cd: 20, mon: 'prism', count: 2, spread: 300 },
          { t: 'nova', range: 170, radius: 180, windup: 1.0, cd: 8, dmgMul: 1.6 },
        ] },
      ] },
    sycorax: { name: 'Reine Sycorax', boss: true, hp: 100000, dmg: 120, speed: 120, r: 30, xp: 12500, gold: [1500, 1900], look: 'sycorax', col: '#8a5a3a', flying: true,
      intro: '« Personne n\'a jamais atteint mon nid. Personne n\'en est jamais redescendu. »',
      phases: [
        { above: 0.6, atks: [
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.6, speed: 420, count: 7, spreadAng: 10, dmgMul: 0.6, color: '#6b4a2c' },
          { t: 'charge', range: 700, min: 120, windup: 0.7, dist: 600, width: 60, cd: 5, dmgMul: 1.5 },
          { t: 'swing', range: 70, arc: 140, windup: 0.55, cd: 1.5, dmgMul: 1.1 },
          { t: 'summon', range: 9999, windup: 1, cd: 16, mon: 'harpy', count: 2 },
        ] },
        { above: 0.25, msg: 'Sycorax déchaîne la tempête !', atks: [
          { t: 'gust', range: 9999, windup: 0.8, cd: 7, strength: 190, dur: 1.4 },
          { t: 'tornado', range: 9999, windup: 0.6, cd: 10, count: 2, radius: 64, dur: 9, speed: 75, dmgMul: 0.2 },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.4, speed: 420, count: 9, spreadAng: 10, dmgMul: 0.6, color: '#6b4a2c' },
          { t: 'charge', range: 700, min: 120, windup: 0.65, dist: 600, width: 60, cd: 4.5, dmgMul: 1.5 },
        ] },
        { above: 0, msg: 'La Reine des Harpies plonge dans une rage aveugle !', speedMul: 1.3, atks: [
          { t: 'charge', range: 700, min: 100, windup: 0.6, dist: 640, width: 62, cd: 3.5, dmgMul: 1.6 },
          { t: 'shoot', range: 9999, windup: 0.45, cd: 2, speed: 440, count: 11, spreadAng: 9, dmgMul: 0.6, color: '#6b4a2c' },
          { t: 'tornado', range: 9999, windup: 0.6, cd: 9, count: 3, radius: 64, dur: 9, speed: 80, dmgMul: 0.2 },
          { t: 'gust', range: 9999, windup: 0.7, cd: 6, strength: 210, dur: 1.4 },
        ] },
      ] },
    leviathe: { name: 'Léviathe', boss: true, hp: 125000, dmg: 130, speed: 70, r: 38, xp: 16000, gold: [1900, 2400], look: 'leviathe', col: '#2f6f86', glow: '#7fd0e0',
      intro: '« Les dieux ont noyé ce temple. Moi, je l\'ai gardé. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'swing', range: 100, arc: 120, windup: 0.7, cd: 1.7, dmgMul: 1.3 },
          { t: 'line', range: 9999, len: 700, width: 70, delay: 1.0, windup: 0.3, cd: 5, count: 3, spreadAng: 20, dmgMul: 1.1, color: '#2f6f86' },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.6, speed: 380, count: 4, spreadAng: 16, dmgMul: 0.7, color: '#7fd0e0' },
        ] },
        { above: 0.3, msg: 'Léviathe plonge… les eaux tourbillonnent !', atks: [
          { t: 'dive', range: 9999, radius: 160, windup: 1.5, cd: 7, dmgMul: 1.7 },
          { t: 'whirlpool', range: 9999, radius: 130, dur: 6, pull: 95, windup: 0.6, cd: 9, count: 2, spread: 220, dmgMul: 0.15 },
          { t: 'summon', range: 9999, windup: 1, cd: 16, mon: 'eel', count: 3 },
          { t: 'line', range: 9999, len: 720, width: 70, delay: 0.95, windup: 0.3, cd: 5, count: 3, spreadAng: 20, dmgMul: 1.1, color: '#2f6f86' },
        ] },
        { above: 0, msg: 'Le temple tremble : Léviathe se déchaîne !', speedMul: 1.2, atks: [
          { t: 'sweep', range: 9999, len: 720, width: 46, steps: 14, stepAng: 16, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 6.5, dmgMul: 1.1, color: '#2f6f86' },
          { t: 'dive', range: 9999, radius: 170, windup: 1.4, cd: 6, dmgMul: 1.8 },
          { t: 'ring', range: 9999, windup: 0.6, cd: 4.5, count: 22, speed: 270, dmgMul: 0.6, color: '#7fd0e0' },
          { t: 'whirlpool', range: 9999, radius: 130, dur: 6, pull: 100, windup: 0.6, cd: 10, count: 2, spread: 220, dmgMul: 0.15 },
        ] },
      ] },
  };

  // ---------- Donjons ----------
  // rooms : [x, y, w, h, "spawns"] (en cases). "nom:n" = n monstres, "nom!:n" = élites, "chest" = coffre, "boss".
  // "#water", "#pillars", "#shelves", "#trees", "#statues", "#crystals" ajoutent des éléments de décor (toujours au même endroit).
  D.DUNGEONS = [
    { id: 1, name: 'Cryptes de Cendrefosse', lvl: 1, boss: 'varok', theme: 'crypt', w: 90, h: 64, playable: true,
      story: 'Sous le vieux cimetière, Varok le Fossoyeur relève les morts de Havre-Gris. Il garde le premier Fragment du Sceau.',
      rooms: [[4, 28, 10, 9, 'entry'], [20, 26, 12, 12, 'skeleton:3'], [20, 6, 12, 10, 'ghoul:3 chest'], [40, 24, 16, 15, 'skeleton:3 skelArcher:2 cultist:1 #statues'],
        [40, 46, 13, 11, 'skeleton!:1 ghoul:2 chest'], [62, 26, 12, 12, 'ghoul:4 skelArcher:2'], [60, 5, 16, 12, 'cultist:2 skeleton:3 skelArcher!:1 chest'], [64, 44, 20, 17, 'boss #statues']],
      links: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 6], [5, 7]] },
    { id: 2, name: 'Bois-Pendu', lvl: 4, boss: 'mereRonce', theme: 'forest', w: 90, h: 64, playable: true,
      story: 'Une forêt où les arbres ont des yeux. Mère-Ronce y tisse ses toiles autour du deuxième Fragment.',
      rooms: [[4, 4, 10, 9, 'entry'], [18, 6, 14, 10, 'wolf:3'], [38, 4, 12, 12, 'spider:3 wolf:1'], [20, 24, 14, 14, 'wolf:2 spider:2 chest #trees'],
        [40, 24, 16, 14, 'treant!:1 wolf:3 spider:1 #trees'], [62, 8, 14, 12, 'spider:3 wolf:2 chest'], [62, 28, 12, 12, 'wolf:4 spider!:1'],
        [40, 44, 14, 12, 'wolf:3 spider:3 treant:1 chest'], [62, 44, 22, 18, 'boss #trees']],
      links: [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [4, 6], [5, 6], [4, 7], [6, 8]] },
    { id: 3, name: 'Mines de Fer-Noir', lvl: 7, boss: 'grizzak', theme: 'mine', w: 90, h: 64, playable: true,
      story: 'Les gobelins ont creusé trop profond et trouvé le troisième Fragment. Leur chef Grizzak refuse de le rendre.',
      rooms: [[40, 52, 10, 9, 'entry'], [38, 36, 14, 11, 'goblin:4'], [16, 36, 14, 12, 'bomber:2 goblin:2 chest'], [60, 36, 14, 12, 'miner:3 bomber:1 #pillars'],
        [16, 16, 14, 13, 'golem!:1 goblin:3'], [38, 16, 14, 13, 'miner:2 bomber:2 goblin:3 #pillars'], [62, 16, 12, 12, 'bomber:3 miner!:1 chest'], [32, 1, 26, 13, 'boss']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [3, 6], [4, 5], [5, 7]] },
    { id: 4, name: 'Marais des Noyés', lvl: 10, boss: 'gloumbra', theme: 'swamp', w: 96, h: 64, playable: true,
      story: 'Un marais où les noyés ne restent jamais au fond. L\'hydre Gloumbra a avalé le quatrième Fragment.',
      rooms: [[4, 26, 10, 10, 'entry'], [20, 22, 16, 14, 'drowned:3 toad:2 #water'], [20, 4, 14, 12, 'wisp:4 toad:1 #water chest'], [42, 20, 18, 16, 'drowned:3 toad:2 wisp:2 #water #trees'],
        [42, 44, 14, 12, 'troll!:1 drowned:2 #water chest'], [66, 8, 16, 14, 'toad:3 wisp:3 #trees'], [66, 30, 14, 12, 'drowned:3 troll:1 #water'], [64, 46, 26, 16, 'boss #water']],
      links: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 6], [6, 7]] },
    { id: 5, name: 'Bastion de la Garde Déchue', lvl: 13, boss: 'halvard', theme: 'bastion', w: 96, h: 64, playable: true,
      story: 'Les chevaliers de Valdorne ont trahi leur serment. Leur seigneur, Sire Halvard, garde le cinquième Fragment dans la salle du trône.',
      rooms: [[44, 54, 10, 8, 'entry'], [40, 40, 18, 10, 'fallen:2 crossbow:2 #pillars'], [18, 38, 14, 12, 'warhound:4 fallen:1'], [66, 38, 14, 12, 'priest:1 fallen:2 crossbow:1 chest'],
        [16, 18, 16, 14, 'champion!:1 warhound:2 priest:1 #pillars'], [40, 20, 18, 14, 'fallen:3 priest:2 crossbow:2 #pillars'], [68, 18, 14, 12, 'crossbow:3 warhound:3 chest'], [34, 1, 30, 15, 'boss #pillars']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [3, 6], [4, 5], [5, 7], [5, 6]] },
    { id: 6, name: 'Bibliothèque Interdite', lvl: 16, boss: 'archiviste', theme: 'library', w: 88, h: 64, playable: true,
      story: 'Une bibliothèque où les livres mordent et où l\'encre rampe. L\'Archiviste Sans-Yeux y a rangé le sixième Fragment parmi les savoirs interdits.',
      rooms: [[4, 4, 10, 9, 'entry'], [18, 4, 16, 12, 'book:4 apprentice:1 #shelves'], [40, 4, 16, 12, 'inkslime:2 book:2 apprentice:1 #shelves chest'], [18, 22, 16, 14, 'gargoyle:1 book:3 apprentice:1 #shelves'],
        [40, 22, 18, 14, 'inkslime:3 apprentice:2 #shelves'], [64, 4, 16, 14, 'gargoyle!:1 book:3 #statues chest'], [64, 24, 16, 14, 'apprentice:2 inkslime:2 book:2 #shelves'],
        [18, 42, 16, 12, 'inkslime:2 gargoyle:1 apprentice:1 chest #statues'], [42, 42, 40, 20, 'boss #statues']],
      links: [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [4, 6], [5, 6], [3, 7], [6, 8]] },
    { id: 7, name: 'Cavernes de Cristal', lvl: 19, boss: 'prismatrix', theme: 'crystal', w: 96, h: 64, playable: true,
      story: 'Sous la montagne, les cristaux chantent et tuent. Prismatrix, une créature faite de lumière brisée, protège le septième Fragment.',
      rooms: [[44, 4, 10, 9, 'entry'], [40, 18, 18, 12, 'shardling:3 crystalSpider:2 #crystals'], [16, 16, 16, 14, 'geode:2 luminant:2 #crystals chest'],
        [66, 16, 16, 14, 'crystalSpider:3 shardling:3 #crystals'], [14, 38, 16, 14, 'crystalGolem!:1 shardling:3 #crystals chest'],
        [40, 36, 18, 14, 'luminant:2 geode:2 crystalSpider:2 #crystals'], [68, 38, 14, 12, 'geode:3 luminant:1 chest'], [32, 51, 34, 12, 'boss #crystals']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [3, 6], [5, 7], [4, 5]] },
    { id: 8, name: 'Pic des Harpies', lvl: 22, boss: 'sycorax', theme: 'peak', w: 96, h: 64, playable: true, wind: true,
      story: 'Au sommet du monde, le vent hurle et les harpies chassent. Leur reine, Sycorax, couve le huitième Fragment dans son nid.',
      rooms: [[6, 50, 10, 9, 'entry'], [22, 46, 16, 12, 'harpy:3 frostWolf:2'], [44, 48, 14, 12, 'yeti:1 frostWolf:3 #trees chest'], [22, 26, 16, 12, 'iceShaman:2 harpy:3 #trees'],
        [64, 44, 16, 14, 'yeti!:1 harpy:2 iceShaman:1 #trees chest'], [44, 24, 16, 14, 'harpy:4 iceShaman:1 frostWolf:2 #trees'], [66, 22, 14, 12, 'yeti:2 frostWolf:2 chest'],
        [36, 2, 32, 15, 'boss']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [2, 5], [4, 6], [5, 7], [5, 6]] },
    { id: 9, name: 'Temple Englouti', lvl: 25, boss: 'leviathe', theme: 'temple', w: 96, h: 64, playable: true,
      story: 'Un temple englouti par la mer, où les statues prient encore sous l\'eau. Léviathe, le serpent des abysses, y garde le neuvième Fragment.',
      rooms: [[4, 26, 10, 10, 'entry'], [20, 24, 16, 14, 'merfolk:3 crab:1 #water #pillars'], [20, 4, 16, 12, 'siren:2 eel:2 #water chest'], [20, 46, 16, 12, 'crab:2 merfolk:2 #water chest'],
        [42, 22, 18, 18, 'deepOne!:1 merfolk:2 siren:1 #water #pillars'], [44, 4, 14, 12, 'eel:3 siren:1 #water'], [44, 46, 14, 12, 'crab:2 eel:2 merfolk:1 #water chest'],
        [66, 14, 26, 34, 'boss #water #pillars']],
      links: [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 6], [4, 7], [5, 4], [6, 4]] },
    { id: 10, name: 'Forge des Titans', lvl: 28, bossName: 'Brasier, le Titan forgeron' },
    { id: 11, name: 'Désert des Os', lvl: 31, bossName: 'Sekhar, Roi des Sables' },
    { id: 12, name: 'Citadelle de Givre', lvl: 34, bossName: 'Hivernia, la Reine de Givre' },
    { id: 13, name: 'Jardin du Cauchemar', lvl: 37, bossName: 'Le Marchand de Sommeil' },
    { id: 14, name: 'Faille du Néant', lvl: 40, bossName: 'L\'Éclipse Rampante' },
    { id: 15, name: 'Trône de Cendres', lvl: 43, bossName: 'Malgrith, le Roi Cendré' },
  ];

  // dark : obscurité (0 = plein jour) · ambient : particules d'ambiance · obstacle : décor qui bloque le passage
  D.THEMES = {
    crypt: { floor: '#e6d9bc', floorAlt: '#dccdab', wall: '#7d7366', wallDark: '#3b342d', deco: ['tomb', 'candle', 'bones', 'urn', 'cobweb', 'skullpile'], dark: 0.55, ambient: 'dust', obstacle: 'tomb', torch: true },
    forest: { floor: '#dfe0b8', floorAlt: '#cfd39e', wall: '#4f6a34', wallDark: '#28361d', deco: ['mushroom', 'bush', 'stump', 'web', 'fern', 'rock'], dark: 0.32, ambient: 'firefly', obstacle: 'tree' },
    mine: { floor: '#ddd0b4', floorAlt: '#cdbd9b', wall: '#6d5c48', wallDark: '#2f2820', deco: ['crate', 'rail', 'barrel', 'ore', 'lantern', 'pickaxe'], dark: 0.6, ambient: 'ember', obstacle: 'rock', torch: true },
    swamp: { floor: '#d6dbb0', floorAlt: '#c8cf9c', wall: '#4d5e3e', wallDark: '#24372f', water: '#7fa89a', deep: '#2f4d47', deco: ['reeds', 'lily', 'mushroom', 'bones', 'fern', 'log'], dark: 0.42, ambient: 'firefly', obstacle: 'deadtree' },
    bastion: { floor: '#e2d8c2', floorAlt: '#d3c7ad', wall: '#7d7366', wallDark: '#2e2a26', deco: ['banner', 'armor', 'brazier', 'rubble', 'weapons', 'shieldwall'], dark: 0.5, ambient: 'ember', obstacle: 'pillar', torch: true },
    library: { floor: '#dcc9a3', floorAlt: '#cfba92', wall: '#6b4a2c', wallDark: '#2a1d14', deco: ['books', 'candle', 'papers', 'globe', 'candelabra', 'scroll'], dark: 0.52, ambient: 'page', obstacle: 'shelf', torch: true },
    town: { floor: '#dfe0b8', floorAlt: '#d3d5a6', wall: '#8a8478', wallDark: '#3d3832', dark: 0 },
    crystal: { floor: '#d9d4e6', floorAlt: '#cbc4de', wall: '#5a5470', wallDark: '#221d33', deco: ['crystalsmall', 'geodeRock', 'crystalsmall', 'bones', 'rock', 'glowshroom'], dark: 0.6, ambient: 'sparkle', obstacle: 'crystal' },
    peak: { floor: '#eef1f4', floorAlt: '#dfe5ea', wall: '#8a8e96', wallDark: '#b8d4ea', deco: ['snowpile', 'rock', 'icicle', 'bones', 'nest', 'feather'], dark: 0.08, ambient: 'snow', obstacle: 'pine' },
    temple: { floor: '#cfe0dc', floorAlt: '#bdd3cf', wall: '#4f7a78', wallDark: '#14303a', water: '#5f9fa6', deep: '#163a46', deco: ['coral', 'seaweed', 'shell', 'urn', 'runes', 'coral'], dark: 0.5, ambient: 'bubble', obstacle: 'column', torch: true, blueFire: true },
    tuto: { floor: '#dfe0b8', floorAlt: '#d3d5a6', wall: '#4f6a34', wallDark: '#28361d', dark: 0 },
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
    { id: 'q4', main: true, title: 'L\'hydre des marais', dungeon: 4, type: 'boss', target: 'gloumbra', n: 1, lvl: 10, after: 'q3',
      text: 'Le quatrième fragment a coulé au fond du Marais des Noyés… dans le ventre de Gloumbra, une hydre à trois têtes. Attention : elle plonge sous la vase et ressurgit là où on ne l\'attend pas.',
      reward: { gold: 700, xp: 3000 } },
    { id: 'q4b', title: 'Concert de crapauds', dungeon: 4, type: 'kill', target: 'toad', n: 12, lvl: 10, after: 'q3',
      text: 'Les crapauds-buffles empoisonnent les puits du sud. Faites-en taire douze.', reward: { gold: 350, xp: 1400 } },
    { id: 'q5', main: true, title: 'Le serment brisé', dungeon: 5, type: 'boss', target: 'halvard', n: 1, lvl: 13, after: 'q4',
      text: 'Sire Halvard était notre plus grand chevalier. Il a vendu son âme au Roi Cendré. Il garde le cinquième fragment dans la salle du trône du Bastion. Tant que ses gardes vivent, son bouclier tient.',
      reward: { gold: 1000, xp: 5000 } },
    { id: 'q5b', title: 'Fausses prières', dungeon: 5, type: 'kill', target: 'priest', n: 6, lvl: 13, after: 'q4',
      text: 'Les prêtres corrompus soignent les soldats déchus. Abattez-les en premier : six suffiront à briser leur ordre.', reward: { gold: 500, xp: 2200 } },
    { id: 'q6', main: true, title: 'Les savoirs interdits', dungeon: 6, type: 'boss', target: 'archiviste', n: 1, lvl: 16, after: 'q5',
      text: 'L\'Archiviste Sans-Yeux a classé le sixième fragment parmi ses livres interdits. Il ne voit rien, mais il entend tout. Et sa bibliothèque se défend.',
      reward: { gold: 1400, xp: 8000 } },
    { id: 'q6b', title: 'Taches d\'encre', dungeon: 6, type: 'kill', target: 'inkslime', n: 10, lvl: 16, after: 'q5',
      text: 'L\'encre vivante se divise quand on la frappe. Détruisez dix de ces horreurs avant qu\'elles n\'atteignent les archives de la ville.', reward: { gold: 700, xp: 3200 } },
    { id: 'q7', main: true, title: 'Le cœur de cristal', dungeon: 7, type: 'boss', target: 'prismatrix', n: 1, lvl: 19, after: 'q6',
      text: 'Sous la montagne, des cavernes de cristal brillent sans soleil. Une créature y est née de la lumière brisée : Prismatrix. Elle tient le septième fragment. Ses rayons tournent comme les aiguilles d\'une horloge : ne restez jamais sur leur chemin.',
      reward: { gold: 1900, xp: 12000 } },
    { id: 'q7b', title: 'Éclats dangereux', dungeon: 7, type: 'kill', target: 'geode', n: 10, lvl: 19, after: 'q6',
      text: 'Les géodes vivantes éclatent en mourant et projettent leurs cristaux partout. Brisez-en dix, mais pas de trop près.', reward: { gold: 950, xp: 5000 } },
    { id: 'q8', main: true, title: 'La reine du pic', dungeon: 8, type: 'boss', target: 'sycorax', n: 1, lvl: 22, after: 'q7',
      text: 'Le huitième fragment est au sommet du Pic des Harpies, dans le nid de la Reine Sycorax. Là-haut, le vent peut vous pousser à tout moment. Gardez toujours une marge.',
      reward: { gold: 2500, xp: 17000 } },
    { id: 'q8b', title: 'Plumes et griffes', dungeon: 8, type: 'kill', target: 'harpy', n: 15, lvl: 22, after: 'q7',
      text: 'Les harpies enlèvent nos moutons, et bientôt nos enfants. Abattez-en quinze.', reward: { gold: 1200, xp: 7000 } },
    { id: 'q9', main: true, title: 'Le gardien des abysses', dungeon: 9, type: 'boss', target: 'leviathe', n: 1, lvl: 25, after: 'q8',
      text: 'Un temple entier a sombré dans la mer avec le neuvième fragment. Léviathe, un serpent plus long qu\'un navire, garde ses ruines. Ses tourbillons aspirent tout : nagez à contre-courant.',
      reward: { gold: 3200, xp: 24000 } },
    { id: 'q9b', title: 'Chant des sirènes', dungeon: 9, type: 'kill', target: 'siren', n: 10, lvl: 25, after: 'q8',
      text: 'Le chant des sirènes attire nos pêcheurs vers le fond. Faites-en taire dix.', reward: { gold: 1500, xp: 9500 } },
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
    'des Anciens', 'du Crépuscule', 'de la Marée', 'du Corbeau', 'de l\'Éclipse', 'du Serment', 'des Cendres', 'des Marais', 'du Parjure', 'de l\'Archive', 'du Cristal', 'des Cimes', 'des Abysses'];
  D.LEGENDARY = ['Cendrelame', 'Murmure-du-Néant', 'Cœur de Varok', 'Chant des Ronces', 'Fer-Maudit', 'Larme de l\'Aube', 'Ultime Serment', 'Briseur de Sceaux',
    'Croc de Gloumbra', 'Serment d\'Halvard', 'Page Interdite', 'Éclat de Prismatrix', 'Plume de Sycorax', 'Écaille de Léviathe'];
  D.STAT_NAMES = { pow: 'Puissance', vit: 'Vitalité', arm: 'Armure', crit: 'Critique', haste: 'Hâte' };

  // ---------- Habitants de Havre-Gris (ambiance) ----------
  D.VILLAGERS = [
    { name: 'Odette', body: '#a0703a', hat: '#efe7d0' }, { name: 'Gaspard', body: '#4f6b2b', hat: '#6b4a2c' },
    { name: 'Mireille', body: '#8a3b2a', hat: null }, { name: 'Bastien', body: '#2c5f9e', hat: '#c9a227' },
    { name: 'Agathe', body: '#6a3f86', hat: '#efe7d0' }, { name: 'Firmin', body: '#7c6a52', hat: '#3e5622' },
  ];
  D.RUMORS = [
    'On dit que les morts remuent sous le vieux cimetière…',
    'Mon cousin est parti à Bois-Pendu. On n\'a retrouvé que ses bottes.',
    'Les gobelins des mines vendent leur poudre à qui paie. Même au Roi Cendré.',
    'Borin a forgé une épée +10 une fois. Une seule fois. Il en parle encore.',
    'Si tu meurs en donjon, les gardes te ramènent. Mais pas ton or !',
    'Le marais pue la vase… et quelque chose y respire, sous l\'eau.',
    'Sire Halvard était un héros. Je l\'ai vu défiler, quand j\'étais petite.',
    'La bibliothèque interdite ? Les livres y mordent, paraît-il.',
    'Ysolde change son stock à chaque retour de donjon. Passe la voir souvent !',
    'Maître Ilian dit que la patience est la première des armes. Moi, je préfère une hache.',
    'Les zones rouges hachurées ? Sors-en vite. Très vite.',
    'Un nécromancien a relevé un boss, une fois. Un sur cent, qu\'on dit.',
  ];

  D.POTION_PRICE = (lvl) => 24 + lvl * 7;
  D.MAX_POTIONS = 4;
  D.BAG_SIZE = 30;
  D.MAX_LEVEL = 50;
  D.xpNext = (lvl) => Math.round(90 * Math.pow(lvl, 1.65));
})();
