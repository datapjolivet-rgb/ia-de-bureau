# Chroniques de Valdorne — Les Quinze Sceaux

RPG d'action en vue du dessus, au style **crayonné à la main**, jouable dans le navigateur (ordinateur, clavier et souris).

Le Roi Cendré a brisé le Sceau des Quinze. Ses quinze lieutenants gardent chacun un fragment au fond d'un donjon. Havre-Gris est le dernier bastion de Valdorne.

## Contenu actuel (version 3.1, solo)

- **10 classes** : guerrier, mage, samouraï, archer, soigneur, paladin, nécromancien, assassin, berserker, barde (5 sorts chacune).
- **Menu de départ animé** : Havre-Gris au soleil couchant, votre dernier héros debout sur son rocher. Continuer, choisir un héros, nouveau héros, touches, options, cimetière des héros (souris ou flèches + Entrée).
- **Touches configurables** : deux touches par action (clavier ou bouton de souris), depuis l'écran titre ou le menu pause. Les conflits sont signalés, la barre d'action, l'aide et le tutoriel affichent vos touches.
- **Options** : tremblement de l'écran, chiffres de dégâts, flèche de guidage, éclairage des donjons.
- **Tutoriel guidé** avec la sergente Brenna, dans le camp des recrues devant la porte de Havre-Gris (il peut être passé).
- **Havre-Gris** : forge (amélioration jusqu'à +10), boutique, académie (sorts et talents), garnison (quêtes), portail des donjons, mannequins d'entraînement, habitants et animaux.
- **9 donjons au plan fixe** sur 15, chacun avec son boss à plusieurs phases :
  1. Cryptes de Cendrefosse — Varok le Fossoyeur
  2. Bois-Pendu — Mère-Ronce
  3. Mines de Fer-Noir — Contremaître Grizzak
  4. Marais des Noyés — Gloumbra, l'Hydre vaseuse (plongée sous la vase, flaques de poison)
  5. Bastion de la Garde Déchue — Sire Halvard le Parjure (bouclier tant que ses gardes vivent)
  6. Bibliothèque Interdite — L'Archiviste Sans-Yeux (spirales de projectiles, téléportation)
  7. Cavernes de Cristal — Prismatrix (rayons qui balaient la salle, prismes-tourelles)
  8. Pic des Harpies — Reine Sycorax (rafales de vent, tornades qui poursuivent, piqués)
  9. Temple Englouti — Léviathe (tourbillons qui aspirent, raz-de-marée, plongées)
- **Très dur** : monstres qui anticipent vos déplacements, élites avec pouvoirs (Rapide, Enragé, Blindé, Vampirique, Explosif, Glacial), boss qui enragent après 2 min 30, potions limitées.
- **Mort impitoyable** : retour en ville, 25 % de l'or perdu, tout le butin du donjon perdu, un objet équipé détruit au hasard.
- **Mode Hardcore** (au choix à la création) : une seule vie. À sa mort, le héros est effacé pour toujours et son nom est gravé au Cimetière des héros.

## Commandes

Touches par défaut (modifiables dans « Touches », sur l'écran titre ou dans le menu pause). Elles suivent la place des touches sur le clavier : Z Q S D sur un clavier AZERTY, W A S D sur un QWERTY.

| Touche | Action |
|---|---|
| Z Q S D / flèches | Se déplacer |
| Clic gauche (maintenu) | Attaque de base vers le curseur |
| 1 à 5 (ou pavé numérique) | Sorts |
| R | Potion |
| E | Parler, ouvrir, utiliser |
| TAB ou I | Inventaire |
| Échap | Fermer / menu |

## Lancer le jeu en local

Le jeu n'a besoin d'aucune installation : ce sont des fichiers HTML et JavaScript.

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 dans un navigateur.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | Page, styles et chargement des scripts |
| `js/data.js` | Données : classes, sorts, monstres, boss, donjons, quêtes, objets, difficulté |
| `js/items.js` | Génération des objets, forge, statistiques du personnage |
| `js/world.js` | Cartes (donjons, ville, tutoriel), collisions, chemins, brouillard, rendu des décors |
| `js/game.js` | Moteur : combat, IA des monstres, sorts, butin, mort, quêtes, vie de la ville |
| `js/fx.js` | Rendu à l'écran : éclairage, flammes, ambiance, taches d'encre, flèche d'objectif |
| `js/sketch.js`, `js/draw.js`, `js/looks.js`, `js/looks2.js`, `js/icons.js` | Dessin crayonné : traits, personnages, monstres, icônes |
| `js/tuto.js` | Tutoriel |
| `js/input.js` | Touches configurables, noms des touches selon le clavier, options |
| `js/ui.js` | Interface en jeu : HUD, inventaire, boutiques, quêtes, menu pause |
| `js/menu.js` | Menu de départ animé, héros, création, touches, options, cimetière |
| `js/main.js` | Démarrage, sauvegarde, clavier et souris |

## Prochaines étapes

- Donjons 10 à 15
- Serveur multijoueur public (groupes de 4 joueurs) et guildes
