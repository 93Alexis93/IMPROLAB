# Identité visuelle IMPRO LAB

Direction : « carnet de coach » — papier crème, texte encre, accents bordeaux « rideau », touche théâtrale mesurée. Les couleurs arc-en-ciel du logo servent d'accents (filets, bandeaux, pastilles), jamais de grandes surfaces.

## Palette de l'interface (déjà dans `styles.css`, variables `:root`)

| Rôle | Variable | Code |
|---|---|---|
| Fond | `--paper` | `#f7f1e7` |
| Cartes | `--paper-raised` | `#fffdf8` |
| Texte | `--ink` | `#25231f` |
| Texte discret | `--ink-soft` | `#625b52` |
| Filets | `--line` | `#d9cdbd` |
| Boutons, titres actifs | `--curtain` | `#9b303b` |
| Bordeaux foncé | `--curtain-dark` | `#74232d` |
| Scène (sombre) | `--stage` | `#292725` |
| Focus clavier | `--focus-ring` | `#205f78` |

## Accents arc-en-ciel (ajoutés à la fin de `styles.css`)

`--il-jaune` `#ffd21f` · `--il-corail` `#ff526e` · `--il-violet` `#d52cff` · `--il-bleu` `#138bff` · `--il-menthe` `#39f5c8` · `--il-nuit` `#080a17` (tuile du logo) · `--il-arc-en-ciel` (dégradé des cinq couleurs).

Où ils apparaissent dans l'appli : filet sous l'en-tête, filet en haut de l'écran d'entrée, soulignement des actions de l'accueil, barre colorée en haut de chaque liste du Cahier de coach, logo à côté du titre. Fond de toutes les pages : dégradé doux jaune, violet, bleu, menthe sur le papier crème (les cartes restent claires pour la lisibilité). Rien de tout cela n'est affiché à l'impression.

## Typographies

- Titres : Georgia, gras.
- Texte : police système (`system-ui`).
- Aucune police chargée depuis un CDN : l'application reste utilisable hors ligne.

## Logos

- `icon.svg` (racine) : logo officiel de l'application (tuile sombre, couronne, lettres arc-en-ciel), inchangé.
- `design/logo-nuit.svg` : logo horizontal sur fond nuit.
- `design/logo-papier.svg` : logo horizontal sur fond papier `#f7f1e7`.

## Supports Canva (31/10/2026)

Éditables depuis Canva ; le code du dépôt fait foi. Le logo dessiné dans Canva est une illustration : le fichier officiel reste `icon.svg`.

- Planche d'identité (logo, palette, typographies) : https://canva.link/lrnwa59y30m1s0m
- Maquettes d'écrans (direction visuelle : entrée, accueil, exercice aléatoire, cahier de coach) : https://canva.link/svy9hk84xctlc1e
- Fiche d'exercice A4, une page (exemple : fiche 3-7 « Le banc des solutions ») : https://canva.link/iqsweng8ev54upc (export : `design/canva/fiche-exercice-3-7-le-banc-des-solutions.pdf`)
- Affiche : https://canva.link/jhlc421bxhniea0 (export : `design/canva/affiche.jpg`).

Exports dans `design/canva/` : `planche-logo.jpg`, `planche-palette.jpg`, `planche-typographies.jpg`, `maquette-ecran-entree.jpg`, `maquette-accueil.jpg`, `maquette-exercice-aleatoire.jpg`, `maquette-cahier-de-coach.jpg`, `affiche.jpg` et la fiche A4 en PDF.
