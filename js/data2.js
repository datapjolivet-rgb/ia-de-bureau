// Données des donjons 10 à 15 : Forge des Titans, Désert des Os, Citadelle de Givre,
// Jardin du Cauchemar, Faille du Néant, Trône de Cendres (et la fin de l'histoire).
(function () {
  const D = G.D;
  const LAVA = { dur: 6, dmgMul: 0.12, color: '#e8762a', kind: 'lava' };
  const lava = (o) => Object.assign({}, LAVA, o || {});

  // Nouvelles attaques :
  // hook = bandelettes qui attirent vers le monstre · rain = pluie d'objets (stalactites, météores) autour de la cible
  // invert = commandes inversées · voidpool = trou noir qui grandit · gravity = attire vers le monstre
  // eclipse = la lumière s'éteint · storm = tempête de sable (rafales) · whirlpool kind 'sand' / 'void' = sables mouvants / puits du néant
  // Options : pool (flaque qui brûle), trail (traînée de feu pendant une charge), freeze (gèle), sleep (endort), look (projectile)
  // Traits : stalk (surgit dans votre dos), shade (presque invisible de loin), deathPool (flaque à la mort), illusion
  Object.assign(D.MONSTERS, {
    // ----- Forge des Titans -----
    emberImp: { name: 'Diablotin des braises', hp: 55, dmg: 15, speed: 150, r: 10, xp: 22, gold: [4, 9], look: 'emberImp', col: '#c4461d', glow: '#f08a2a', flying: true, keep: 210, erratic: true,
      atks: [{ t: 'shoot', range: 380, windup: 0.45, cd: 2.2, speed: 360, poison: 0.5, color: '#e8762a', look: 'fire' }, { t: 'swing', range: 34, arc: 80, windup: 0.3, cd: 0.9 }] },
    salamander: { name: 'Salamandre ardente', hp: 85, dmg: 18, speed: 125, r: 14, xp: 26, gold: [5, 10], look: 'salamander', col: '#d0571b',
      atks: [{ t: 'swing', range: 42, arc: 90, windup: 0.4, cd: 1.1 }, { t: 'charge', range: 300, min: 100, windup: 0.6, dist: 280, width: 34, cd: 5.5, dmgMul: 1.3, trail: { r: 26, dur: 3.5, dmgMul: 0.18, every: 34 } }] },
    forgeGuard: { name: 'Gardien de forge', hp: 150, dmg: 24, speed: 72, r: 17, xp: 34, gold: [6, 13], look: 'forgeGuard', col: '#6d5d55', guard: 0.55,
      atks: [{ t: 'combo', range: 64, arc: 120, windup: 0.6, interval: 0.5, hits: 2, cd: 3.4, dmgMul: 0.95, lunge: 14 }, { t: 'nova', range: 110, radius: 125, windup: 1.0, cd: 7, dmgMul: 1.2, pool: lava({ dur: 5 }) }] },
    magmaSlime: { name: 'Magma vivant', hp: 120, dmg: 20, speed: 66, r: 16, xp: 26, gold: [5, 10], look: 'magmaSlime', col: '#a8321f', glow: '#f07a2a', split: { into: 'cinder', n: 2 }, deathPool: lava({ r: 50, dur: 4, dmgMul: 0.15 }),
      atks: [{ t: 'swing', range: 46, arc: 100, windup: 0.5, cd: 1.3 }, { t: 'shoot', range: 320, windup: 0.6, cd: 3.2, speed: 280, count: 3, spreadAng: 20, poison: 0.4, color: '#e8762a', dmgMul: 0.7, look: 'fire' }] },
    cinder: { name: 'Escarbille', hp: 38, dmg: 11, speed: 140, r: 9, xp: 6, gold: [1, 3], look: 'cinder', col: '#e8762a', glow: '#f08a2a',
      atks: [{ t: 'swing', range: 30, arc: 80, windup: 0.35, cd: 0.9 }] },
    titanSpawn: { name: 'Rejeton de Titan', hp: 260, dmg: 32, speed: 62, r: 23, xp: 75, gold: [14, 26], look: 'titanSpawn', col: '#5a4038', glow: '#f07a2a',
      atks: [{ t: 'swing', range: 72, arc: 130, windup: 0.75, cd: 1.7 }, { t: 'charge', range: 340, min: 120, windup: 0.85, dist: 340, width: 50, cd: 7, dmgMul: 1.4, trail: { r: 30, dur: 4, dmgMul: 0.2, every: 36 } },
        { t: 'circle', range: 420, radius: 70, delay: 1.1, windup: 0.5, cd: 6, count: 3, spread: 140, color: '#d0571b', pool: lava() }] },

    // ----- Désert des Os -----
    scarab: { name: 'Scarabée des sables', hp: 34, dmg: 10, speed: 155, r: 9, xp: 9, gold: [1, 4], look: 'scarab', col: '#3a5a6a',
      atks: [{ t: 'swing', range: 30, arc: 80, windup: 0.3, cd: 0.8 }] },
    mummy: { name: 'Momie', hp: 140, dmg: 22, speed: 62, r: 15, xp: 32, gold: [6, 12], look: 'mummy', col: '#d9cba0', regen: 0.01,
      atks: [{ t: 'swing', range: 50, arc: 100, windup: 0.55, cd: 1.4, slow: 0.4 }, { t: 'hook', range: 340, len: 360, width: 26, delay: 0.85, windup: 0.3, cd: 7, dmgMul: 0.8, color: '#b8a070' }] },
    sandWorm: { name: 'Ver des sables', hp: 160, dmg: 26, speed: 92, r: 18, xp: 40, gold: [8, 15], look: 'sandWorm', col: '#b08a52',
      atks: [{ t: 'dive', range: 420, radius: 95, windup: 1.3, cd: 7, dmgMul: 1.4, color: '#a07a42' }, { t: 'swing', range: 58, arc: 110, windup: 0.6, cd: 1.5 }] },
    sandWraith: { name: 'Spectre des sables', hp: 72, dmg: 23, speed: 85, r: 13, xp: 30, gold: [5, 11], look: 'sandWraith', col: '#c9a25a', glow: '#e8c070', keep: 260, flying: true, blink: { range: 140, dist: 230, cd: 7 },
      atks: [{ t: 'circle', range: 440, radius: 62, delay: 1.0, windup: 0.4, cd: 3.4, count: 2, spread: 110, color: '#a07a42' }, { t: 'shoot', range: 400, windup: 0.4, cd: 2.4, speed: 380, color: '#c9a25a' }] },
    scorpion: { name: 'Scorpion géant', hp: 210, dmg: 28, speed: 88, r: 19, xp: 60, gold: [11, 20], look: 'scorpion', col: '#7a3a1a', guard: 0.5,
      atks: [{ t: 'combo', range: 60, arc: 110, windup: 0.55, interval: 0.4, hits: 2, cd: 3.2, dmgMul: 0.9, lunge: 14 }, { t: 'line', range: 260, len: 280, width: 30, delay: 0.75, windup: 0.3, cd: 5, dmgMul: 1.4, color: '#6b8f2a', poison: 0.8 },
        { t: 'charge', range: 300, min: 110, windup: 0.7, dist: 300, width: 44, cd: 7, dmgMul: 1.3 }] },

    // ----- Citadelle de Givre -----
    iceSprite: { name: 'Esprit du givre', hp: 50, dmg: 15, speed: 140, r: 10, xp: 24, gold: [4, 9], look: 'iceSprite', col: '#bfe4f4', glow: '#bfe4f4', flying: true,
      atks: [{ t: 'shoot', range: 380, windup: 0.45, cd: 2.1, speed: 330, slow: 0.35, color: '#9fd0f0' }] },
    frostKnight: { name: 'Chevalier de givre', hp: 170, dmg: 26, speed: 80, r: 16, xp: 40, gold: [7, 14], look: 'frostKnight', col: '#9fb4c8', guard: 0.65,
      atks: [{ t: 'combo', range: 66, arc: 120, windup: 0.55, interval: 0.45, hits: 3, cd: 3.6, dmgMul: 0.85, lunge: 18, slow: 0.3 }, { t: 'charge', range: 320, min: 120, windup: 0.8, dist: 320, width: 46, cd: 6.5, dmgMul: 1.3 }] },
    iceArcher: { name: 'Archère de glace', hp: 72, dmg: 24, speed: 80, r: 13, xp: 30, gold: [5, 11], look: 'iceArcher', col: '#6fb1d9', keep: 300,
      atks: [{ t: 'line', range: 560, len: 600, width: 18, delay: 0.9, windup: 0.3, cd: 3.4, dmgMul: 1.5, color: '#5f9fc8', slow: 0.4 },
        { t: 'shoot', range: 420, windup: 0.4, cd: 2.6, speed: 420, count: 3, spreadAng: 10, dmgMul: 0.7, color: '#9fd0f0', look: 'arrow' }] },
    frostMage: { name: 'Mage de givre', hp: 78, dmg: 21, speed: 76, r: 13, xp: 32, gold: [6, 12], look: 'frostMage', col: '#4a6f9a', glow: '#9fd0f0', keep: 260, blink: { range: 130, dist: 220, cd: 8 },
      atks: [{ t: 'circle', range: 440, radius: 66, delay: 1.15, windup: 0.4, cd: 4, count: 2, spread: 100, color: '#6fb1d9', freeze: 1.1 }, { t: 'heal', range: 320, pct: 0.2, windup: 1.1, cd: 6 }] },
    iceGiant: { name: 'Géant de glace', hp: 290, dmg: 34, speed: 60, r: 24, xp: 80, gold: [15, 28], look: 'iceGiant', col: '#cfe2f2',
      atks: [{ t: 'swing', range: 74, arc: 130, windup: 0.8, cd: 1.8, slow: 0.4 }, { t: 'nova', range: 130, radius: 150, windup: 1.2, cd: 7.5, dmgMul: 1.2, freeze: 1.0, color: '#6fb1d9' },
        { t: 'shoot', range: 420, windup: 0.7, cd: 4.5, speed: 300, dmgMul: 1.3, slow: 0.5, color: '#e8f4fb', size: 12 }] },

    // ----- Jardin du Cauchemar -----
    puppet: { name: 'Pantin désarticulé', hp: 70, dmg: 18, speed: 135, r: 12, xp: 26, gold: [5, 10], look: 'puppet', col: '#c9a46a', erratic: true,
      atks: [{ t: 'combo', range: 44, arc: 90, windup: 0.4, interval: 0.32, hits: 3, cd: 2.6, dmgMul: 0.7, lunge: 10 }, { t: 'swing', range: 40, arc: 80, windup: 0.3, cd: 0.9 }] },
    nightSheep: { name: 'Mouton de cauchemar', hp: 95, dmg: 20, speed: 105, r: 14, xp: 28, gold: [5, 11], look: 'nightSheep', col: '#3b3346',
      atks: [{ t: 'charge', range: 320, min: 80, windup: 0.55, dist: 300, width: 38, cd: 4, dmgMul: 1.3 }, { t: 'swing', range: 42, arc: 90, windup: 0.4, cd: 1.1 }] },
    dreamEye: { name: 'Œil rêveur', hp: 68, dmg: 24, speed: 70, r: 12, xp: 30, gold: [6, 12], look: 'dreamEye', col: '#d07ad0', glow: '#e0a0f0', flying: true, keep: 300, blink: { range: 140, dist: 240, cd: 7 },
      atks: [{ t: 'line', range: 540, len: 560, width: 22, delay: 0.9, windup: 0.3, cd: 3.4, dmgMul: 1.3, color: '#b04ab0' }, { t: 'circle', range: 440, radius: 64, delay: 1.1, windup: 0.4, cd: 4.5, color: '#9c7cc4', sleep: 1.0 }] },
    jester: { name: 'Bouffon grimaçant', hp: 78, dmg: 22, speed: 105, r: 13, xp: 30, gold: [6, 12], look: 'jester', col: '#a8321f', keep: 240, blink: { range: 120, dist: 220, cd: 6 },
      atks: [{ t: 'shoot', range: 400, windup: 0.4, cd: 2.4, speed: 380, count: 3, spreadAng: 16, dmgMul: 0.75, color: '#a8321f', look: 'card' }, { t: 'circle', range: 420, radius: 60, delay: 1.0, windup: 0.4, cd: 4, count: 3, spread: 120, color: '#7b3fa6' }] },
    nightmare: { name: 'Cauchemar', hp: 270, dmg: 32, speed: 120, r: 22, xp: 80, gold: [15, 28], look: 'nightmare', col: '#1d1430', glow: '#7b3fa6',
      atks: [{ t: 'charge', range: 420, min: 120, windup: 0.7, dist: 420, width: 50, cd: 5, dmgMul: 1.5 }, { t: 'combo', range: 66, arc: 120, windup: 0.55, interval: 0.4, hits: 2, cd: 3.2, dmgMul: 0.9, lunge: 16 },
        { t: 'nova', range: 130, radius: 150, windup: 1.1, cd: 7, dmgMul: 1.1, sleep: 1.0, color: '#9c7cc4' }] },
    illusion: { name: 'Illusion du Marchand', hp: 140, dmg: 30, speed: 90, r: 24, xp: 0, gold: [0, 0], look: 'sandman', col: '#6a3f86', illusion: true,
      deathPool: { r: 70, dur: 4, dmgMul: 0.1, color: '#9c7cc4', kind: 'sleep', sleepy: true },
      atks: [{ t: 'swing', range: 70, arc: 120, windup: 0.6, cd: 1.6 }, { t: 'shoot', range: 400, windup: 0.5, cd: 3, speed: 330, count: 3, spreadAng: 14, dmgMul: 0.6, color: '#9c7cc4' }] },

    // ----- Faille du Néant -----
    voidling: { name: 'Rejeton du Néant', hp: 62, dmg: 19, speed: 130, r: 11, xp: 26, gold: [5, 10], look: 'voidling', col: '#2a1f3a', glow: '#9b6fe0', stalk: { range: 220, cd: 6 },
      atks: [{ t: 'swing', range: 38, arc: 90, windup: 0.35, cd: 0.9 }] },
    voidMaw: { name: 'Gueule du Néant', hp: 170, dmg: 27, speed: 70, r: 18, xp: 44, gold: [8, 15], look: 'voidMaw', col: '#1d1430', glow: '#7b3fa6', flying: true,
      atks: [{ t: 'swing', range: 58, arc: 110, windup: 0.6, cd: 1.5 }, { t: 'whirlpool', kind: 'void', range: 360, radius: 90, dur: 4, pull: 80, windup: 0.8, cd: 9, dmgMul: 0.15, color: '#5a3f86' }] },
    riftMage: { name: 'Mage de la Faille', hp: 82, dmg: 26, speed: 75, r: 13, xp: 34, gold: [6, 13], look: 'riftMage', col: '#4a2f6a', glow: '#9b6fe0', keep: 280, blink: { range: 130, dist: 240, cd: 7 },
      atks: [{ t: 'sweep', range: 380, len: 380, width: 26, steps: 6, stepAng: 18, stepT: 0.1, delay: 0.8, windup: 0.5, cd: 7, dmgMul: 0.9, color: '#9b6fe0' },
        { t: 'circle', range: 440, radius: 64, delay: 1.0, windup: 0.4, cd: 3.6, count: 2, spread: 100, color: '#7b3fa6' }] },
    shade: { name: 'Ombre errante', hp: 78, dmg: 25, speed: 145, r: 12, xp: 30, gold: [6, 12], look: 'shade', col: '#1d1610', shade: true,
      atks: [{ t: 'combo', range: 46, arc: 90, windup: 0.35, interval: 0.3, hits: 3, cd: 2.8, dmgMul: 0.75, lunge: 12 }, { t: 'swing', range: 42, arc: 85, windup: 0.3, cd: 0.9 }] },
    voidTitan: { name: 'Colosse du Néant', hp: 310, dmg: 36, speed: 60, r: 24, xp: 90, gold: [16, 30], look: 'voidTitan', col: '#2a1f3a', glow: '#9b6fe0',
      atks: [{ t: 'swing', range: 76, arc: 130, windup: 0.8, cd: 1.8 }, { t: 'nova', range: 140, radius: 155, windup: 1.2, cd: 7.5, dmgMul: 1.3, color: '#7b3fa6' },
        { t: 'gravity', range: 500, windup: 0.8, cd: 10, strength: 130, dur: 1.4 }] },

    // ----- Trône de Cendres -----
    ashSoldier: { name: 'Légionnaire cendré', hp: 165, dmg: 26, speed: 85, r: 15, xp: 40, gold: [8, 15], look: 'ashSoldier', col: '#5a524a', guard: 0.6,
      atks: [{ t: 'combo', range: 60, arc: 110, windup: 0.5, interval: 0.42, hits: 2, cd: 3.2, dmgMul: 0.9, lunge: 16 }, { t: 'charge', range: 320, min: 110, windup: 0.75, dist: 320, width: 44, cd: 6.5, dmgMul: 1.3 }] },
    ashHound: { name: 'Molosse de cendre', hp: 80, dmg: 20, speed: 172, r: 13, xp: 26, gold: [5, 10], look: 'ashHound', col: '#3a3430', glow: '#f08a2a', deathRing: { count: 8, speed: 230, dmgMul: 0.3, color: '#e8762a' },
      atks: [{ t: 'swing', range: 40, arc: 80, windup: 0.3, cd: 0.85 }, { t: 'charge', range: 260, min: 90, windup: 0.55, dist: 240, width: 32, cd: 5, dmgMul: 1.3, trail: { r: 24, dur: 3, dmgMul: 0.15, every: 34 } }] },
    pyromancer: { name: 'Pyromancien du Roi', hp: 88, dmg: 26, speed: 75, r: 13, xp: 34, gold: [6, 13], look: 'pyromancer', col: '#5a2a1a', glow: '#f08a2a', keep: 270, blink: { range: 130, dist: 230, cd: 7 },
      atks: [{ t: 'circle', range: 440, radius: 66, delay: 1.05, windup: 0.4, cd: 3.6, count: 2, spread: 110, color: '#d0571b', pool: lava({ dur: 5 }) }, { t: 'line', range: 500, len: 520, width: 26, delay: 0.9, windup: 0.3, cd: 4.5, dmgMul: 1.3, color: '#d0571b' }] },
    ashPriest: { name: 'Prêtre des cendres', hp: 92, dmg: 22, speed: 70, r: 13, xp: 34, gold: [6, 13], look: 'ashPriest', col: '#4a4440', keep: 260,
      atks: [{ t: 'heal', range: 340, pct: 0.22, windup: 1.1, cd: 5 }, { t: 'circle', range: 420, radius: 62, delay: 1.1, windup: 0.4, cd: 3.8, color: '#9b2c20' }] },
    ashKnight: { name: 'Chevalier noir', hp: 330, dmg: 36, speed: 85, r: 20, xp: 95, gold: [17, 32], look: 'ashKnight', col: '#2a2622', guard: 0.6, glow: '#f08a2a',
      atks: [{ t: 'combo', range: 76, arc: 130, windup: 0.55, interval: 0.45, hits: 3, cd: 3.4, dmgMul: 0.9, lunge: 22 }, { t: 'charge', range: 360, min: 120, windup: 0.8, dist: 360, width: 50, cd: 6, dmgMul: 1.4, trail: { r: 28, dur: 4, dmgMul: 0.15, every: 36 } },
        { t: 'nova', range: 130, radius: 150, windup: 1.1, cd: 8, dmgMul: 1.2 }] },

    // ----- Boss -----
    brasier: { name: 'Brasier, le Titan forgeron', boss: true, hp: 140000, dmg: 142, speed: 68, r: 40, xp: 21000, gold: [2400, 3000], look: 'brasier', col: '#5a4038', glow: '#f07a2a', enrage: 165,
      intro: '« Approche, petit morceau de métal. Je vais te reforger. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'swing', range: 112, arc: 140, windup: 0.75, cd: 1.8, dmgMul: 1.3 },
          { t: 'circle', range: 9999, radius: 80, delay: 1.15, windup: 0.4, cd: 5.5, count: 3, spread: 170, color: '#d0571b', pool: lava({ dur: 7, dmgMul: 0.13 }) },
          { t: 'line', range: 9999, len: 620, width: 50, delay: 1.0, windup: 0.3, cd: 4.5, count: 3, spreadAng: 24, dmgMul: 1.1, color: '#d0571b' },
        ] },
        { above: 0.3, msg: 'Brasier ouvre les vannes : la lave déborde des forges !', atks: [
          { t: 'rain', range: 9999, windup: 0.6, cd: 10, dur: 4, rate: 0.35, radius: 62, delay: 1.0, spread: 170, dmgMul: 0.9, color: '#d0571b', look: 'meteor', pool: lava({ dur: 5, dmgMul: 0.1 }), say: 'Pluie de lave !' },
          { t: 'sweep', range: 9999, len: 640, width: 40, steps: 12, stepAng: 15, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 7.5, dmgMul: 1.1, color: '#d0571b', say: 'Souffle de la forge !' },
          { t: 'summon', range: 9999, windup: 1, cd: 16, mon: 'emberImp', count: 3, spread: 260 },
          { t: 'swing', range: 112, arc: 140, windup: 0.65, cd: 1.6, dmgMul: 1.3 },
        ] },
        { above: 0, msg: 'Le Titan chauffe à blanc !', speedMul: 1.25, atks: [
          { t: 'charge', range: 700, min: 120, windup: 0.75, dist: 600, width: 64, cd: 5, dmgMul: 1.5, trail: { r: 34, dur: 5, dmgMul: 0.12, every: 38 } },
          { t: 'ring', range: 9999, windup: 0.6, cd: 4.5, count: 22, speed: 270, dmgMul: 0.6, color: '#e8762a' },
          { t: 'circle', range: 9999, radius: 80, delay: 1.0, windup: 0.4, cd: 5, count: 4, spread: 200, color: '#d0571b', pool: lava({ dur: 6, dmgMul: 0.13 }) },
          { t: 'nova', range: 180, radius: 190, windup: 1.0, cd: 8, dmgMul: 1.6, color: '#d0571b' },
        ] },
      ] },
    sekhar: { name: 'Sekhar, Roi des Sables', boss: true, hp: 172000, dmg: 155, speed: 72, r: 32, xp: 27000, gold: [3000, 3700], look: 'sekhar', col: '#d9cba0', glow: '#e8c070', enrage: 170,
      intro: '« Mon tombeau est scellé depuis mille ans. Tu n\'en sortiras jamais. »',
      phases: [
        { above: 0.66, atks: [
          { t: 'shoot', range: 9999, windup: 0.55, cd: 2.6, speed: 360, count: 5, spreadAng: 14, dmgMul: 0.7, color: '#c9a25a' },
          { t: 'swing', range: 100, arc: 140, windup: 0.65, cd: 1.7, dmgMul: 1.25 },
          { t: 'whirlpool', kind: 'sand', range: 9999, radius: 100, dur: 7, pull: 70, windup: 0.7, cd: 9, count: 2, spread: 200, dmgMul: 0.14, color: '#a07a42', slow: 0.3, say: 'Sables mouvants !' },
          { t: 'hook', range: 9999, len: 520, width: 32, delay: 0.9, windup: 0.3, cd: 7, dmgMul: 0.9, color: '#b8a070' },
          { t: 'summon', range: 9999, windup: 1, cd: 15, mon: 'scarab', count: 6, spread: 200 },
        ] },
        { above: 0.33, msg: 'Sekhar invoque la tempête des sables !', atks: [
          { t: 'storm', range: 9999, windup: 0.8, cd: 15, dur: 6, strength: 165 },
          { t: 'swing', range: 100, arc: 140, windup: 0.65, cd: 1.7, dmgMul: 1.25 },
          { t: 'nova', range: 150, radius: 165, windup: 1.0, cd: 8, dmgMul: 1.5, color: '#a07a42' },
          { t: 'line', range: 9999, len: 640, width: 40, delay: 0.9, windup: 0.3, cd: 4.2, count: 5, spreadAng: 18, dmgMul: 1.1, color: '#a07a42' },
          { t: 'summon', range: 9999, windup: 1, cd: 18, mon: 'sandWorm', count: 2, spread: 260 },
          { t: 'whirlpool', kind: 'sand', range: 9999, radius: 100, dur: 7, pull: 75, windup: 0.7, cd: 10, count: 2, spread: 220, dmgMul: 0.14, color: '#a07a42', slow: 0.3, say: 'Sables mouvants !' },
        ] },
        { above: 0, msg: 'Le pharaon se relève, plus terrible encore !', speedMul: 1.2, atks: [
          { t: 'sweep', range: 9999, len: 680, width: 42, steps: 14, stepAng: 16, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 7, dmgMul: 1.1, color: '#e8a030', say: 'Rayon du soleil !' },
          { t: 'swing', range: 100, arc: 140, windup: 0.65, cd: 1.7, dmgMul: 1.25 },
          { t: 'ring', range: 9999, windup: 0.6, cd: 5, count: 20, speed: 270, dmgMul: 0.6, color: '#c9a25a' },
          { t: 'hook', range: 9999, len: 560, width: 34, delay: 0.85, windup: 0.3, cd: 6, dmgMul: 0.9, color: '#b8a070' },
          { t: 'summon', range: 9999, windup: 1, cd: 18, mon: 'mummy', count: 2, spread: 220 },
        ] },
      ] },
    hivernia: { name: 'Hivernia, la Reine de Givre', boss: true, hp: 165000, dmg: 162, speed: 80, r: 32, xp: 34000, gold: [3600, 4400], look: 'hivernia', col: '#bfe4f4', glow: '#bfe4f4', enrage: 175,
      blink: { range: 140, dist: 280, cd: 10 },
      intro: '« Que le froid t\'enlace. Tu feras une si jolie statue. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'line', range: 9999, len: 620, width: 34, delay: 0.95, windup: 0.3, cd: 3.8, count: 3, spreadAng: 22, dmgMul: 1.1, color: '#5f9fc8', slow: 0.3 },
          { t: 'circle', range: 9999, radius: 70, delay: 1.15, windup: 0.4, cd: 5.5, count: 3, spread: 170, color: '#6fb1d9', freeze: 1.0 },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.8, speed: 380, count: 7, spreadAng: 10, dmgMul: 0.6, color: '#9fd0f0' },
          { t: 'summon', range: 9999, windup: 1, cd: 20, mon: 'iceSprite', count: 2, spread: 240 },
        ] },
        { above: 0.3, msg: 'Hivernia s\'enferme dans la glace : abattez ses chevaliers !', atks: [
          { t: 'shieldAdds', range: 9999, windup: 1.2, cd: 40, dur: 20, adds: [['frostKnight', 2], ['frostMage', 1]] },
          { t: 'rain', range: 9999, windup: 0.6, cd: 9, dur: 5, rate: 0.3, radius: 54, delay: 1.0, spread: 160, dmgMul: 0.8, color: '#6fb1d9', look: 'icicle', freeze: 0.6, say: 'Pluie de stalactites !' },
          { t: 'sweep', range: 9999, len: 640, width: 38, steps: 12, stepAng: 15, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 7.5, dmgMul: 1.0, color: '#5f9fc8', say: 'Souffle glacé !' },
        ] },
        { above: 0, msg: 'Le cœur de glace de la Reine se fend… de rage !', speedMul: 1.25, atks: [
          { t: 'rain', range: 9999, windup: 0.6, cd: 8, dur: 6, rate: 0.25, radius: 54, delay: 1.0, spread: 170, dmgMul: 0.8, color: '#6fb1d9', look: 'icicle', freeze: 0.6, say: 'Pluie de stalactites !' },
          { t: 'ring', range: 9999, windup: 0.6, cd: 4.5, count: 24, speed: 270, dmgMul: 0.55, color: '#9fd0f0' },
          { t: 'circle', range: 9999, radius: 72, delay: 1.05, windup: 0.4, cd: 5, count: 4, spread: 200, color: '#6fb1d9', freeze: 1.0 },
          { t: 'line', range: 9999, len: 640, width: 34, delay: 0.9, windup: 0.3, cd: 4, count: 5, spreadAng: 18, dmgMul: 1.1, color: '#5f9fc8', slow: 0.3 },
        ] },
      ] },
    marchand: { name: 'Le Marchand de Sommeil', boss: true, hp: 196000, dmg: 182, speed: 85, r: 30, xp: 42000, gold: [4300, 5200], look: 'sandman', col: '#3b2f5a', glow: '#c9a0f0', enrage: 180,
      blink: { range: 150, dist: 300, cd: 7 },
      intro: '« Chut… Ferme les yeux. Les cauchemars ne font mal… qu\'au réveil. »',
      phases: [
        { above: 0.66, atks: [
          { t: 'circle', range: 9999, radius: 66, delay: 1.1, windup: 0.4, cd: 5, count: 5, spread: 200, color: '#9c7cc4', sleep: 1.2 },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.4, speed: 360, count: 5, spreadAng: 14, dmgMul: 0.7, color: '#c9a0f0' },
          { t: 'line', range: 9999, len: 600, width: 36, delay: 0.95, windup: 0.3, cd: 4, count: 3, spreadAng: 24, dmgMul: 1.1, color: '#6a3f86' },
          { t: 'summon', range: 9999, windup: 1, cd: 15, mon: 'puppet', count: 3, spread: 220 },
        ] },
        { above: 0.33, msg: 'Le Marchand vous plonge dans un cauchemar !', atks: [
          { t: 'invert', range: 9999, windup: 0.8, cd: 16, dur: 5 },
          { t: 'summon', range: 9999, windup: 1, cd: 18, mon: 'illusion', count: 3, spread: 260 },
          { t: 'spiral', range: 9999, windup: 0.8, cd: 8, arms: 2, dur: 3.2, rate: 0.12, speed: 220, spin: 2.0, dmgMul: 0.55, color: '#6a3f86', say: 'Le rêve tourne…' },
          { t: 'circle', range: 9999, radius: 66, delay: 1.1, windup: 0.4, cd: 5.5, count: 5, spread: 200, color: '#9c7cc4', sleep: 1.2 },
        ] },
        { above: 0, msg: '« Dormez… pour toujours. »', speedMul: 1.2, atks: [
          { t: 'invert', range: 9999, windup: 0.8, cd: 14, dur: 5 },
          { t: 'spiral', range: 9999, windup: 0.6, cd: 7, arms: 3, dur: 3.5, rate: 0.11, speed: 230, spin: 2.2, dmgMul: 0.55, color: '#6a3f86', say: 'Le rêve tourne…' },
          { t: 'ring', range: 9999, windup: 0.6, cd: 5, count: 22, speed: 260, dmgMul: 0.55, color: '#c9a0f0' },
          { t: 'summon', range: 9999, windup: 1, cd: 20, mon: 'nightmare', count: 1, spread: 220 },
        ] },
      ] },
    eclipse: { name: 'L\'Éclipse Rampante', boss: true, hp: 250000, dmg: 196, speed: 70, r: 36, xp: 52000, gold: [5100, 6200], look: 'eclipse', col: '#140c1e', glow: '#e8c070', flying: true, enrage: 185,
      intro: '« J\'ai dévoré des soleils. Ta petite flamme ne fera qu\'une bouchée. »',
      phases: [
        { above: 0.65, atks: [
          { t: 'sweep', range: 9999, len: 660, width: 38, steps: 12, stepAng: 15, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 7, dmgMul: 1.1, color: '#5a3f86', say: 'Rayon noir !' },
          { t: 'shoot', range: 9999, windup: 0.5, cd: 2.4, speed: 380, count: 7, spreadAng: 11, dmgMul: 0.6, color: '#7b3fa6' },
          { t: 'swing', range: 115, arc: 160, windup: 0.6, cd: 1.6, dmgMul: 1.2, color: '#5a3f86' },
          { t: 'voidpool', range: 9999, windup: 0.6, cd: 8, count: 2, spread: 220, r0: 30, r1: 110, dur: 14, dmgMul: 0.16 },
          { t: 'summon', range: 9999, windup: 1, cd: 15, mon: 'voidling', count: 3, spread: 240 },
        ] },
        { above: 0.3, msg: 'L\'Éclipse dévore la lumière !', atks: [
          { t: 'eclipse', range: 9999, windup: 0.8, cd: 20, dur: 8 },
          { t: 'swing', range: 115, arc: 160, windup: 0.6, cd: 1.6, dmgMul: 1.2, color: '#5a3f86' },
          { t: 'nova', range: 170, radius: 185, windup: 1.0, cd: 8, dmgMul: 1.5, color: '#5a3f86' },
          { t: 'gravity', range: 9999, windup: 0.8, cd: 9, strength: 170, dur: 1.6 },
          { t: 'ring', range: 9999, windup: 0.6, cd: 4.5, count: 22, speed: 260, dmgMul: 0.55, color: '#7b3fa6' },
          { t: 'voidpool', range: 9999, windup: 0.6, cd: 7, count: 2, spread: 240, r0: 30, r1: 115, dur: 14, dmgMul: 0.16 },
        ] },
        { above: 0, msg: 'La Faille s\'ouvre en grand !', speedMul: 1.2, atks: [
          { t: 'spiral', range: 9999, windup: 0.6, cd: 7, arms: 3, dur: 3.5, rate: 0.1, speed: 230, spin: 2.2, dmgMul: 0.55, color: '#5a3f86', say: 'Le Néant tourne…' },
          { t: 'swing', range: 115, arc: 160, windup: 0.6, cd: 1.6, dmgMul: 1.2, color: '#5a3f86' },
          { t: 'nova', range: 170, radius: 185, windup: 1.0, cd: 8, dmgMul: 1.5, color: '#5a3f86' },
          { t: 'sweep', range: 9999, len: 700, width: 40, steps: 16, stepAng: 16, stepT: 0.085, delay: 0.85, windup: 0.5, cd: 6.5, dmgMul: 1.1, color: '#5a3f86', say: 'Rayon noir !' },
          { t: 'gravity', range: 9999, windup: 0.8, cd: 8, strength: 160, dur: 1.6 },
          { t: 'voidpool', range: 9999, windup: 0.6, cd: 6, count: 3, spread: 260, r0: 30, r1: 110, dur: 12, dmgMul: 0.16 },
        ] },
      ] },
    malgrith: { name: 'Malgrith, le Roi Cendré', boss: true, final: true, hp: 270000, dmg: 200, speed: 90, r: 34, xp: 65000, gold: [6000, 7500], look: 'malgrith', col: '#2a2622', glow: '#f08a2a', enrage: 240,
      intro: '« Quinze lieutenants. Quinze fragments. Et maintenant, toi. Voyons si tu vaux mieux qu\'eux. »',
      phases: [
        { above: 0.75, atks: [
          { t: 'combo', range: 110, arc: 150, windup: 0.6, interval: 0.45, hits: 3, cd: 3.4, dmgMul: 0.8, lunge: 26 },
          { t: 'line', range: 9999, len: 640, width: 44, delay: 0.9, windup: 0.3, cd: 4.2, count: 3, spreadAng: 22, dmgMul: 1.1, color: '#d0571b' },
          { t: 'charge', range: 700, min: 140, windup: 0.8, dist: 600, width: 62, cd: 6, dmgMul: 1.5, trail: { r: 32, dur: 5, dmgMul: 0.12, every: 38 } },
          { t: 'circle', range: 9999, radius: 76, delay: 1.1, windup: 0.4, cd: 5.5, count: 3, spread: 180, color: '#d0571b', pool: lava({ dur: 5, dmgMul: 0.1 }) },
        ] },
        { above: 0.5, msg: 'Malgrith : « Ma garde ! Protégez votre roi ! »', atks: [
          { t: 'shieldAdds', range: 9999, windup: 1.2, cd: 45, dur: 22, adds: [['ashSoldier', 2], ['ashPriest', 1]] },
          { t: 'rain', range: 9999, windup: 0.6, cd: 9, dur: 5, rate: 0.3, radius: 60, delay: 1.0, spread: 170, dmgMul: 0.85, color: '#d0571b', look: 'meteor', pool: lava({ dur: 4, dmgMul: 0.1 }), say: 'Pluie de cendres ardentes !' },
          { t: 'ring', range: 9999, windup: 0.6, cd: 5, count: 20, speed: 270, dmgMul: 0.6, color: '#e8762a' },
          { t: 'combo', range: 110, arc: 150, windup: 0.6, interval: 0.45, hits: 3, cd: 3.4, dmgMul: 0.8, lunge: 26 },
        ] },
        { above: 0.25, msg: 'Malgrith brandit le Sceau brisé : le trône s\'embrase !', atks: [
          { t: 'sweep', range: 9999, len: 700, width: 44, steps: 14, stepAng: 16, stepT: 0.09, delay: 0.85, windup: 0.5, cd: 7, dmgMul: 1.1, color: '#d0571b', say: 'Lame de feu !' },
          { t: 'spiral', range: 9999, windup: 0.7, cd: 8, arms: 2, dur: 3.2, rate: 0.12, speed: 230, spin: 2.0, dmgMul: 0.55, color: '#e8762a', say: 'Les cendres tourbillonnent…' },
          { t: 'gravity', range: 9999, windup: 0.8, cd: 11, strength: 140, dur: 1.5 },
          { t: 'line', range: 9999, len: 660, width: 44, delay: 0.85, windup: 0.3, cd: 4.5, count: 5, spreadAng: 18, dmgMul: 1.1, color: '#d0571b', pool: lava({ dur: 4, dmgMul: 0.1 }) },
        ] },
        { above: 0, msg: 'Malgrith : « Si je tombe, Valdorne brûlera avec moi ! »', speedMul: 1.3, atks: [
          { t: 'rain', range: 9999, windup: 0.6, cd: 7, dur: 6, rate: 0.22, radius: 60, delay: 1.0, spread: 190, dmgMul: 0.85, color: '#d0571b', look: 'meteor', pool: lava({ dur: 4, dmgMul: 0.1 }), say: 'Pluie de cendres ardentes !' },
          { t: 'sweep', range: 9999, len: 720, width: 44, steps: 18, stepAng: 20, stepT: 0.08, delay: 0.8, windup: 0.45, cd: 6, dmgMul: 1.1, color: '#d0571b', say: 'Lame de feu !' },
          { t: 'charge', range: 700, min: 120, windup: 0.7, dist: 620, width: 62, cd: 4.5, dmgMul: 1.5, trail: { r: 32, dur: 5, dmgMul: 0.12, every: 38 } },
          { t: 'ring', range: 9999, windup: 0.6, cd: 4, count: 26, speed: 280, dmgMul: 0.55, color: '#e8762a' },
          { t: 'nova', range: 180, radius: 200, windup: 1.0, cd: 8, dmgMul: 1.7, color: '#d0571b' },
        ] },
      ] },
  });

  // ---------- Donjons 10 à 15 (plans fixes) ----------
  // "#lava" flaques de lave · "#ice" sol gelé qui glisse · "#quicksand" sables mouvants · "#sleepfog" brume du sommeil
  // "#rifts" puits du néant · "#furnaces" fourneaux · "#icepillars", "#dreamtrees", "#monoliths", "#bones" obstacles
  const NEW = [
    { id: 10, name: 'Forge des Titans', lvl: 28, boss: 'brasier', theme: 'forge', w: 96, h: 64, playable: true,
      story: 'Au cœur du volcan, les forges des anciens Titans brûlent encore. Brasier, le dernier Titan forgeron, y martèle le dixième Fragment pour en faire une arme.',
      rooms: [[4, 50, 10, 10, 'entry'], [20, 46, 16, 14, 'emberImp:3 salamander:2 #lava'], [42, 48, 14, 12, 'forgeGuard:2 emberImp:2 #furnaces chest'],
        [20, 26, 16, 14, 'magmaSlime:2 salamander:2 #lava #pillars'], [62, 46, 16, 14, 'titanSpawn!:1 emberImp:2 forgeGuard:1 #lava chest'],
        [42, 24, 16, 16, 'forgeGuard:2 magmaSlime:2 emberImp:2 #furnaces #lava'], [18, 4, 18, 14, 'salamander:3 emberImp:3 #lava chest'],
        [42, 4, 14, 12, 'magmaSlime:2 forgeGuard:2 #pillars'], [62, 4, 30, 30, 'boss #lava #furnaces']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [2, 5], [3, 5], [3, 6], [5, 7], [6, 7], [7, 8]] },
    { id: 11, name: 'Désert des Os', lvl: 31, boss: 'sekhar', theme: 'desert', w: 96, h: 64, playable: true, env: 'sandstorm',
      story: 'Une mer de sable où affleurent les os de créatures gigantesques. Sekhar, pharaon que la mort n\'a pas voulu garder, a enfoui le onzième Fragment dans son tombeau.',
      rooms: [[4, 4, 10, 10, 'entry'], [20, 4, 18, 12, 'scarab:5 sandWraith:1 #quicksand'], [44, 4, 16, 12, 'mummy:2 scarab:3 #statues chest'],
        [20, 22, 16, 16, 'sandWorm:2 scarab:3 #quicksand #bones'], [66, 4, 18, 14, 'scorpion!:1 mummy:2 #statues chest'],
        [42, 22, 18, 16, 'mummy:2 sandWraith:2 scarab:3 #quicksand #statues'], [20, 44, 16, 14, 'scorpion:1 sandWorm:1 scarab:4 #bones chest'],
        [66, 26, 16, 14, 'sandWraith:2 sandWorm:2 #quicksand'], [44, 44, 46, 18, 'boss #statues #quicksand']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [2, 5], [3, 5], [3, 6], [4, 7], [5, 7], [7, 8]] },
    { id: 12, name: 'Citadelle de Givre', lvl: 34, boss: 'hivernia', theme: 'ice', w: 96, h: 64, playable: true,
      story: 'Une citadelle de glace bâtie en une seule nuit par Hivernia, la Reine de Givre. Ses couloirs gèlent tout ce qui respire, et le douzième Fragment y est prisonnier d\'un bloc de glace éternelle.',
      rooms: [[43, 54, 10, 8, 'entry'], [38, 40, 20, 10, 'frostKnight:2 iceSprite:3 #ice'], [14, 40, 16, 12, 'iceArcher:3 iceSprite:2 #ice chest'],
        [66, 40, 16, 12, 'frostMage:2 frostKnight:1 #icepillars'], [12, 20, 18, 14, 'iceGiant!:1 iceSprite:3 #ice #icepillars'],
        [38, 22, 20, 12, 'frostKnight:2 frostMage:1 iceArcher:2 #ice #icepillars'], [66, 20, 18, 14, 'iceArcher:2 frostMage:2 iceSprite:2 #ice chest'],
        [14, 4, 16, 10, 'frostKnight:2 iceArcher:2 #ice chest'], [34, 2, 28, 16, 'boss #ice #icepillars']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 6], [4, 5], [5, 6], [4, 7], [5, 8]] },
    { id: 13, name: 'Jardin du Cauchemar', lvl: 37, boss: 'marchand', theme: 'dream', w: 96, h: 64, playable: true,
      story: 'Un jardin qui n\'existe que dans les rêves de ceux qui dorment trop longtemps. Le Marchand de Sommeil y vend des cauchemars, et il a caché le treizième Fragment au fond du pire d\'entre eux.',
      rooms: [[4, 27, 10, 10, 'entry'], [20, 24, 14, 16, 'puppet:3 nightSheep:2 #dreamtrees'], [20, 4, 16, 14, 'dreamEye:2 puppet:3 #sleepfog chest'],
        [42, 4, 18, 12, 'jester:2 nightSheep:2 dreamEye:1 #dreamtrees'], [66, 4, 18, 16, 'nightmare!:1 puppet:2 jester:1 #sleepfog chest'],
        [66, 26, 16, 14, 'dreamEye:2 jester:2 nightSheep:1 #dreamtrees #sleepfog'], [70, 46, 16, 14, 'nightSheep:3 puppet:3 #sleepfog chest'],
        [40, 50, 20, 12, 'jester:2 dreamEye:2 nightmare:1 #dreamtrees'], [40, 22, 22, 22, 'boss #statues #sleepfog']],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]] },
    { id: 14, name: 'Faille du Néant', lvl: 40, boss: 'eclipse', theme: 'void', w: 96, h: 64, playable: true, env: 'eclipse',
      story: 'Là où le monde se déchire, la Faille du Néant avale la lumière. L\'Éclipse Rampante, une ombre plus vieille que les étoiles, s\'y nourrit du quatorzième Fragment.',
      rooms: [[82, 50, 10, 10, 'entry'], [62, 48, 14, 12, 'voidling:4 shade:1 #monoliths'], [40, 50, 16, 12, 'voidMaw:1 riftMage:2 voidling:2 chest'],
        [62, 28, 16, 14, 'shade:3 voidling:2 #rifts'], [18, 46, 16, 14, 'voidTitan!:1 shade:2 #monoliths chest'],
        [40, 28, 16, 14, 'riftMage:2 voidMaw:1 shade:2 #rifts #monoliths'], [62, 6, 16, 14, 'voidMaw:2 voidling:3 chest'],
        [40, 6, 16, 14, 'riftMage:2 shade:2 voidling:2 #monoliths'], [4, 4, 30, 34, 'boss #monoliths #rifts']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [2, 5], [3, 5], [3, 6], [6, 7], [5, 7], [7, 8]] },
    { id: 15, name: 'Trône de Cendres', lvl: 43, boss: 'malgrith', theme: 'ash', w: 96, h: 64, playable: true, env: 'ashrain',
      story: 'La forteresse du Roi Cendré, bâtie sur les ruines de l\'ancienne capitale. Ici, la cendre tombe comme la neige. Malgrith attend sur son trône, le dernier Fragment au creux de la main.',
      rooms: [[43, 54, 10, 8, 'entry'], [36, 40, 24, 10, 'ashSoldier:3 ashHound:3 #pillars'], [10, 40, 18, 14, 'pyromancer:2 ashSoldier:2 #lava chest'],
        [68, 40, 18, 14, 'ashHound:4 ashPriest:1 #lava chest'], [8, 18, 18, 16, 'ashKnight!:1 ashPriest:1 pyromancer:1 #statues chest'],
        [36, 26, 24, 10, 'ashSoldier:3 pyromancer:2 ashPriest:1 #pillars'], [70, 18, 18, 16, 'ashKnight!:1 ashHound:3 #statues chest'],
        [30, 2, 36, 20, 'boss #throne #pillars #lava']],
      links: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 6], [4, 5], [6, 5], [5, 7]] },
  ];
  NEW.forEach((d) => { D.DUNGEONS[d.id - 1] = d; });

  // ---------- Thèmes ----------
  Object.assign(D.THEMES, {
    forge: { floor: '#dccbb4', floorAlt: '#cfbb9f', wall: '#5a4038', wallDark: '#1d100c', deco: ['anvil', 'ingot', 'chain', 'slag', 'rubble', 'brazier'], dark: 0.5, ambient: 'ember', obstacle: 'furnace', torch: true },
    desert: { floor: '#efdcae', floorAlt: '#e4cd96', wall: '#b8925a', wallDark: '#6b4a24', deco: ['bones', 'cactus', 'skullbig', 'urn', 'rock', 'pot'], dark: 0.1, ambient: 'sand', obstacle: 'obelisk' },
    ice: { floor: '#e6eff5', floorAlt: '#d6e4ee', wall: '#7f9ab0', wallDark: '#14243a', deco: ['icecrystal', 'snowpile', 'icicle', 'frozenbones', 'brokenshield', 'icecrystal'], dark: 0.42, ambient: 'frost', obstacle: 'icepillar', torch: true, blueFire: true },
    dream: { floor: '#ebe0f0', floorAlt: '#ddd0e8', wall: '#6a4f86', wallDark: '#1a1028', deco: ['dreamflower', 'mushroom', 'clock', 'cards', 'eyeplant', 'teacup'], dark: 0.55, ambient: 'dreamdust', obstacle: 'dreamtree' },
    void: { floor: '#d8d2e2', floorAlt: '#c8c0d8', wall: '#3a2f50', wallDark: '#05030c', deco: ['starshard', 'floatrock', 'runes', 'voidcrystal', 'rubble', 'starshard'], dark: 0.66, ambient: 'voidmote', obstacle: 'monolith' },
    ash: { floor: '#d6d0c6', floorAlt: '#c8c0b4', wall: '#4a4440', wallDark: '#140f0c', deco: ['ashpile', 'brokenbanner', 'brazier', 'skullpile', 'chain', 'burntbones'], dark: 0.58, ambient: 'ash', obstacle: 'pillar', torch: true },
  });

  // ---------- Quêtes ----------
  D.QUESTS.push(
    { id: 'q10', main: true, title: 'Le Titan forgeron', dungeon: 10, type: 'boss', target: 'brasier', n: 1, lvl: 28, after: 'q9',
      text: 'Au cœur du volcan, les forges des Titans se sont rallumées. Brasier, le dernier d\'entre eux, martèle le dixième fragment pour en faire une arme. Ne marchez jamais dans la lave : elle ne pardonne pas.',
      reward: { gold: 4100, xp: 32000 } },
    { id: 'q10b', title: 'Traînées de feu', dungeon: 10, type: 'kill', target: 'salamander', n: 12, lvl: 28, after: 'q9',
      text: 'Les salamandres laissent des traînées de feu derrière elles. Éteignez-en douze, et ne restez pas dans leur sillage.', reward: { gold: 2000, xp: 14000 } },
    { id: 'q11', main: true, title: 'Le Roi des Sables', dungeon: 11, type: 'boss', target: 'sekhar', n: 1, lvl: 31, after: 'q10',
      text: 'Le onzième fragment repose dans le tombeau de Sekhar, un pharaon que la mort n\'a pas voulu garder. Ses bandelettes vous attirent vers lui, et les tempêtes de sable vous poussent dans ses pièges.',
      reward: { gold: 5000, xp: 42000 } },
    { id: 'q11b', title: 'La nuée', dungeon: 11, type: 'kill', target: 'scarab', n: 25, lvl: 31, after: 'q10',
      text: 'Des nuées de scarabées dévorent les caravanes du sud. Écrasez-en vingt-cinq.', reward: { gold: 2500, xp: 18000 } },
    { id: 'q12', main: true, title: 'La Reine de Givre', dungeon: 12, type: 'boss', target: 'hivernia', n: 1, lvl: 34, after: 'q11',
      text: 'Hivernia a bâti une citadelle de glace en une seule nuit. Le douzième fragment y est prisonnier. Attention : le sol gelé glisse, et ses sorts peuvent vous changer en statue.',
      reward: { gold: 6100, xp: 54000 } },
    { id: 'q12b', title: 'Armures gelées', dungeon: 12, type: 'kill', target: 'frostKnight', n: 10, lvl: 34, after: 'q11',
      text: 'Les chevaliers de givre portaient autrefois les couleurs de Valdorne. Libérez dix d\'entre eux de la glace… à coups de lame.', reward: { gold: 3000, xp: 23000 } },
    { id: 'q13', main: true, title: 'Le Marchand de Sommeil', dungeon: 13, type: 'boss', target: 'marchand', n: 1, lvl: 37, after: 'q12',
      text: 'Certains soldats ne se réveillent plus. Dans leurs rêves, un Marchand de Sommeil leur vend des cauchemars… et il garde le treizième fragment. Ne vous endormez pas. Et là-bas, la gauche et la droite s\'inversent parfois.',
      reward: { gold: 7400, xp: 68000 } },
    { id: 'q13b', title: 'Rires dans le noir', dungeon: 13, type: 'kill', target: 'jester', n: 10, lvl: 37, after: 'q12',
      text: 'On entend des rires dans les rêves des dormeurs. Faites taire dix bouffons grimaçants.', reward: { gold: 3700, xp: 29000 } },
    { id: 'q14', main: true, title: 'L\'Éclipse Rampante', dungeon: 14, type: 'boss', target: 'eclipse', n: 1, lvl: 40, after: 'q13',
      text: 'Une déchirure s\'est ouverte dans le ciel : la Faille du Néant. Une ombre plus vieille que les étoiles, l\'Éclipse Rampante, y dévore le quatorzième fragment. Quand la lumière s\'éteint, ne restez pas immobile.',
      reward: { gold: 9000, xp: 85000 } },
    { id: 'q14b', title: 'Les rejetons', dungeon: 14, type: 'kill', target: 'voidling', n: 15, lvl: 40, after: 'q13',
      text: 'Les rejetons du Néant surgissent dans le dos des imprudents. Détruisez-en quinze.', reward: { gold: 4500, xp: 36000 } },
    { id: 'q15', main: true, title: 'Le Roi Cendré', dungeon: 15, type: 'boss', target: 'malgrith', n: 1, lvl: 43, after: 'q14',
      text: 'C\'est l\'heure. Quatorze fragments sont revenus à Havre-Gris. Le dernier est entre les mains de Malgrith, le Roi Cendré, sur son trône de cendres. Ramenez-le, et le Sceau des Quinze sera restauré. Valdorne compte sur vous.',
      reward: { gold: 15000, xp: 100000 } },
    { id: 'q15b', title: 'La garde noire', dungeon: 15, type: 'kill', target: 'ashKnight', n: 6, lvl: 43, after: 'q14',
      text: 'Les chevaliers noirs du Roi Cendré ne fuient jamais. Abattez-en six : sans eux, son armée s\'effondrera.', reward: { gold: 5500, xp: 45000 } },
  );

  // ---------- Butin, habitants ----------
  D.LEGENDARY.push('Marteau de Brasier', 'Bandelettes de Sekhar', 'Cœur de Givre', 'Sablier du Marchand', 'Éclat d\'Éclipse', 'Couronne de Cendres', 'Le Sceau Restauré');
  D.SUFFIX.push('des Titans', 'des Dunes', 'de la Reine de Givre', 'des Songes', 'du Néant', 'du Roi Cendré');
  D.RUMORS.push(
    'Les forges des Titans fument de nouveau. Borin dit qu\'il rêve d\'y poser son marteau.',
    'Dans le désert, le sable bouge tout seul. Et il mord.',
    'Une citadelle de glace a poussé en une nuit, au nord. En une seule nuit !',
    'Mon frère dort depuis trois jours. Il parle d\'un marchand qui vend des rêves…',
    'Le ciel s\'est fendu à l\'est. Le soir, on y voit des étoiles noires.',
    'Le Roi Cendré attend sur son trône. On dit qu\'il connaît le nom de chaque héros tombé.',
  );
  // Après la victoire finale
  D.RUMORS_AFTER = [
    'Le Roi Cendré est tombé ! On chante votre nom jusque dans les tavernes du sud !',
    'Le Sceau des Quinze brille de nouveau au-dessus de Havre-Gris. Je ne me lasse pas de le regarder.',
    'Borin a promis de forger une statue à votre effigie. En fer-noir, rien que ça.',
    'Les donjons sont encore pleins de monstres, paraît-il. Les héros n\'ont jamais fini leur travail.',
  ];
})();
