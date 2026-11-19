# Chroniques de Valdorne — Les Quinze Sceaux

RPG d'action en vue du dessus, au style **crayonné à la main**, jouable dans le navigateur (ordinateur, clavier et souris).

**Jouer en ligne : https://valdorne.chroniques-valdorne.workers.dev**

Le Roi Cendré a brisé le Sceau des Quinze. Ses quinze lieutenants gardent chacun un fragment au fond d'un donjon. Havre-Gris est le dernier bastion de Valdorne.

## Contenu actuel (version 5 : solo et en ligne)

- **10 classes** : guerrier, mage, samouraï, archer, soigneur, paladin, nécromancien, assassin, berserker, barde (5 sorts chacune).
- **Menu de départ animé** : Havre-Gris au soleil couchant, votre dernier héros debout sur son rocher. Continuer, choisir un héros, nouveau héros, touches, options, cimetière des héros (souris ou flèches + Entrée).
- **Touches configurables** : deux touches par action (clavier ou bouton de souris), depuis l'écran titre ou le menu pause. Les conflits sont signalés, la barre d'action, l'aide et le tutoriel affichent vos touches.
- **Options** : tremblement de l'écran, chiffres de dégâts, flèche de guidage, éclairage des donjons.
- **Mode créateur** (à activer dans les Options, puis touche C en jeu ou bouton dans la pause) : tous les objets du jeu (60 modèles, toutes raretés, niveau 1 à 60, forge +0 à +10, nom légendaire au choix), niveau, or, sorts et talents au maximum, invincibilité, dégâts ×10, sorts sans recharge, les 15 donjons ouverts, téléportation au boss, monstres et boss à volonté. Les héros qui s'en servent portent le badge « Créateur ».
- **Tutoriel guidé** avec la sergente Brenna, dans le camp des recrues devant la porte de Havre-Gris (il peut être passé).
- **Havre-Gris** : forge (amélioration jusqu'à +10), boutique, académie (sorts et talents), garnison (quêtes), portail des donjons, mannequins d'entraînement, habitants et animaux.
- **Grimoire des âmes du nécromancien** (touche F) : chaque boss qu'il a vaincu y laisse son âme, qu'il peut invoquer une fois par donjon, jamais en ville ni dans la salle d'un boss. Tant que l'âme est là, tout son mana est bloqué (l'attaque de base reste possible). L'âme n'a que 15 % de la vie et 25 % des dégâts du vrai boss et n'utilise pas les pouvoirs qui gêneraient le joueur ; si elle tombe ou repart, elle reviendra au prochain donjon. L'ancien « serviteur lié » (cadavre de boss relevé) existe toujours. Le grimoire contient aussi des **meutes** : n'importe quel monstre déjà vaincu, invoqué par 5 pour 60 de mana (recharge de 45 s, autant de fois que voulu dans les donjons), aussi forts que les morts relevés (60 % de vie, 65 % de dégâts, au niveau du donjon) ; ils restent jusqu'à leur mort ou celle du nécromancien, 10 au plus en même temps. Maj + F invoque la dernière meute.
- **Objets reconnaissables** : chacun des 60 modèles a sa propre icône, aussi visible au sol. La matière change avec le niveau de l'objet (fer, acier, acier noirci, mithril, orichalque), la pierre sertie indique le bonus principal (rouge : puissance, vert : vitalité, bleu : armure, jaune : critique, turquoise : hâte) et l'éclat la rareté.
- **Les 15 donjons au plan fixe**, chacun avec son boss à plusieurs phases :
  1. Cryptes de Cendrefosse — Varok le Fossoyeur
  2. Bois-Pendu — Mère-Ronce
  3. Mines de Fer-Noir — Contremaître Grizzak
  4. Marais des Noyés — Gloumbra, l'Hydre vaseuse (plongée sous la vase, flaques de poison)
  5. Bastion de la Garde Déchue — Sire Halvard le Parjure (bouclier tant que ses gardes vivent)
  6. Bibliothèque Interdite — L'Archiviste Sans-Yeux (spirales de projectiles, téléportation)
  7. Cavernes de Cristal — Prismatrix (rayons qui balaient la salle, prismes-tourelles)
  8. Pic des Harpies — Reine Sycorax (rafales de vent, tornades qui poursuivent, piqués)
  9. Temple Englouti — Léviathe (tourbillons qui aspirent, raz-de-marée, plongées)
  10. Forge des Titans — Brasier, le Titan forgeron (flaques de lave qui brûlent, traînées de feu, pluie de lave)
  11. Désert des Os — Sekhar, Roi des Sables (sables mouvants, tempêtes de sable, bandelettes qui attirent)
  12. Citadelle de Givre — Hivernia, la Reine de Givre (sol gelé qui glisse, sorts qui gèlent sur place, pluie de stalactites)
  13. Jardin du Cauchemar — Le Marchand de Sommeil (brume qui endort, commandes inversées, illusions)
  14. Faille du Néant — L'Éclipse Rampante (îles flottantes, trous noirs qui grandissent, attraction, éclipses)
  15. Trône de Cendres — Malgrith, le Roi Cendré (boss final à 4 phases, pluie de cendres, garde royale)
- **Fin de l'histoire** : vaincre le Roi Cendré restaure le Sceau des Quinze ; le héros devient « Légende de Valdorne ». Les donjons restent ouverts ensuite.
- **Très dur** : monstres qui anticipent vos déplacements, élites avec pouvoirs (Rapide, Enragé, Blindé, Vampirique, Explosif, Glacial), boss qui enragent après 2 min 30, potions limitées.
- **Mort impitoyable** : retour en ville, 25 % de l'or perdu, tout le butin du donjon perdu, un objet équipé détruit au hasard.
- **Mode Hardcore** (au choix à la création) : une seule vie. À sa mort, le héros est effacé pour toujours et son nom est gravé au Cimetière des héros.
- **Jeu en ligne** (sur le site du jeu, voir plus bas) : les héros connectés se croisent à Havre-Gris, discutent, forment des groupes de 4 et explorent les donjons ensemble.

## Jeu en ligne

Le jeu en ligne fonctionne sur https://valdorne.chroniques-valdorne.workers.dev, où le jeu est servi par son serveur (dossier `server/`, voir « Mettre le jeu en ligne »). Dans l'artefact claude.ai ou en ouvrant les fichiers en local, le jeu reste en solo. L'option « Jouer en ligne » (Options) permet aussi de jouer hors ligne.

- **Havre-Gris partagée** : on voit les autres héros se déplacer, avec leur nom.
- **Discussion** : Entrée pour écrire, Entrée pour envoyer, Échap pour fermer. Les messages s'affichent aussi en bulle au-dessus du héros. « /g » devant le message (ou Tab, ou le bouton du canal) : message au groupe seulement.
- **Groupes de 4** : approchez-vous d'un héros et appuyez sur E pour l'inviter, ou ouvrez la liste des joueurs (touche P) pour inviter, exclure, nommer un nouveau chef, quitter le groupe ou ignorer un joueur. Le cadre du groupe affiche les membres, leur niveau et leur vie.
- **Donjons en groupe** : le chef ouvre le donjon au Portail et tout le groupe y entre (tous les membres doivent être en ville). Les monstres ont +70 % de vie par joueur en plus. Quand un héros entre dans la salle du boss, la porte se ferme et le reste du groupe le rejoint.
- **Butin personnel** : chacun reçoit son or, ses objets (pour sa classe), son expérience et ses coffres. Un donjon que votre héros n'a pas encore débloqué ne lui donne pas de fragment du Sceau.
- **Mort en groupe** : les pénalités habituelles s'appliquent, puis le héros regarde son groupe combattre ; il rentre en ville quand il veut. Si tout le groupe tombe, tout le monde rentre.
- **Pas de pause** dans un donjon de groupe : le menu s'ouvre, mais le combat continue.
- **Mode créateur désactivé en ligne**. Un héros qui l'a utilisé joue hors ligne.

Comment ça marche : l'ordinateur du chef de groupe fait vivre les monstres et envoie leur état une dizaine de fois par seconde, ainsi que chaque attaque ennemie dès qu'elle apparaît. Chaque joueur calcule lui-même les coups que reçoit son héros (ce qu'il voit à l'écran fait foi pour l'esquive) et envoie au chef les dégâts qu'il inflige. Le serveur relaie les messages et gère la ville, la discussion et les groupes. Le jeu étant coopératif, le serveur ne vérifie pas les calculs des joueurs.

## Mettre le jeu en ligne (Cloudflare, gratuit)

Le serveur est un Worker Cloudflare avec un Durable Object (`server/src/index.js`) : il sert aussi les fichiers du jeu, intégrés au Worker. Il faut un compte Cloudflare (gratuit) et Node.js.

```bash
cd server
npm install
npx wrangler login
npm run deploy
```

`npm run deploy` intègre la page et les scripts du jeu au serveur (fichier généré `server/src/site.js`), puis le publie. Le jeu est alors à l'adresse `https://valdorne.<votre-sous-domaine>.workers.dev` (Wrangler propose de choisir ce sous-domaine la première fois).

Pour essayer en local avec plusieurs fenêtres : `npm run dev` dans `server/`, puis ouvrir http://localhost:8787 dans deux navigateurs (ou une fenêtre normale et une fenêtre privée).

Limites de l'offre gratuite de Cloudflare (à vérifier sur la page des tarifs, elles peuvent changer) : 100 000 requêtes par jour pour les Durable Objects, chaque message envoyé au serveur comptant pour 1/20 de requête. Un joueur envoie environ 2 à 10 messages par seconde, ce qui donne de l'ordre de 50 heures de jeu par jour en tout, tous joueurs confondus. Au-delà, Cloudflare refuse les nouvelles requêtes jusqu'à la remise à zéro quotidienne ; le jeu reste jouable hors ligne en attendant.

## Commandes

Touches par défaut (modifiables dans « Touches », sur l'écran titre ou dans le menu pause). Elles suivent la place des touches sur le clavier : Z Q S D sur un clavier AZERTY, W A S D sur un QWERTY.

| Touche | Action |
|---|---|
| Z Q S D / flèches | Se déplacer |
| Clic gauche (maintenu) | Attaque de base vers le curseur |
| 1 à 5 (ou pavé numérique) | Sorts |
| R | Potion |
| F | Grimoire des âmes (nécromancien) |
| E | Parler, ouvrir, utiliser (en ligne : inviter un héros proche) |
| Entrée | Discuter (en ligne) |
| P | Joueurs en ligne et groupe |
| C | Mode créateur (s'il est activé dans les Options, hors ligne) |
| TAB ou I | Inventaire |
| Échap | Fermer / menu |

### Manette

Une manette standard (Xbox, PlayStation…) fonctionne dès qu'on appuie sur un bouton.

| Bouton | Action |
|---|---|
| Stick gauche | Se déplacer |
| Stick droit | Viser (sans lui, la visée se fait seule sur l'ennemi le plus proche) |
| RT | Attaque de base (maintenir) |
| X, Y, B, RB, LT | Sorts 1 à 5 |
| LB | Potion |
| A | Parler, ouvrir, utiliser |
| Vue / Menu | Inventaire / menu |
| Croix ↓ / ← / ↑ | Grimoire des âmes / joueurs en ligne / répondre à une invitation |
| Dans les menus | Croix pour choisir, A pour valider, B pour revenir, X pour jeter un objet |

À la création d'un héros, le bouton « Au hasard » propose un nom (pratique sans clavier).

### Téléphone et tablette

Le jeu se joue en mode paysage (un message demande de tourner le téléphone s'il est tenu droit).

- Posez le pouce gauche n'importe où sur la gauche de l'écran : un joystick apparaît pour se déplacer.
- À droite : ⚔ attaque (maintenir), les 5 sorts, la potion. La visée est automatique sur l'ennemi le plus proche ; les sorts de déplacement partent dans la direction du joystick ; « Relever les morts » vise le cadavre le plus proche.
- Le bouton « Action » apparaît près d'un personnage, d'un coffre ou d'un portail.
- En bas : Menu, Sac (inventaire), Joueurs, Discuter (en ligne) et Plein écran (si le navigateur le permet).
- Dans l'inventaire, la boutique ou la forge : un premier toucher montre l'objet, un second l'utilise ; un appui long permet de le jeter.

## Lancer le jeu en local

Le jeu n'a besoin d'aucune installation : ce sont des fichiers HTML et JavaScript.

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 dans un navigateur. Ainsi, le jeu est en solo (pas de serveur de jeu) ; pour le jeu en ligne, voir « Mettre le jeu en ligne ».

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | Page, styles et chargement des scripts |
| `js/data.js` | Données : classes, sorts, monstres, boss, donjons 1 à 9, quêtes, objets, difficulté |
| `js/data2.js` | Données des donjons 10 à 15 : monstres, boss, plans, thèmes, quêtes, fin de l'histoire |
| `js/items.js` | Génération des objets, forge, statistiques du personnage |
| `js/world.js` | Cartes (donjons, ville, tutoriel), collisions, chemins, brouillard, rendu des décors |
| `js/world2.js` | Décors des donjons 10 à 15 : lave, glace, dunes, jardin, vide étoilé, trône |
| `js/game.js` | Moteur : combat, IA des monstres, sorts, butin, mort, quêtes, vie de la ville |
| `js/fx.js` | Rendu à l'écran : éclairage, flammes, ambiance, taches d'encre, flèche d'objectif |
| `js/sketch.js`, `js/draw.js`, `js/looks.js`, `js/looks2.js`, `js/looks3.js`, `js/icons.js` | Dessin crayonné : traits, personnages, monstres, icônes |
| `js/tuto.js` | Tutoriel |
| `js/input.js` | Touches configurables, noms des touches selon le clavier, options |
| `js/ui.js` | Interface en jeu : HUD, inventaire, boutiques, quêtes, menu pause |
| `js/menu.js` | Menu de départ animé, héros, création, touches, options, cimetière |
| `js/creator.js` | Mode créateur : tous les objets, héros au maximum, donjons, monstres à volonté |
| `js/souls.js` | Grimoire des âmes du nécromancien : boss et meutes de monstres à invoquer |
| `js/pad.js` | Manette : déplacement, visée, sorts, navigation dans les menus |
| `js/touch.js` | Écran tactile : joystick, boutons d'action, visée automatique |
| `js/net.js` | Jeu en ligne : connexion, autres héros en ville, discussion, groupes, liste des joueurs |
| `js/coop.js` | Donjons en groupe : état des monstres envoyé par le chef, attaques partagées, mort en groupe |
| `js/main.js` | Démarrage, sauvegarde, clavier et souris |
| `server/` | Serveur Cloudflare (Worker + Durable Object) : ville partagée, discussion, groupes, relais des donjons |

## Prochaines étapes

- Guildes (nom, blason, rangs, discussion de guilde, classement)
