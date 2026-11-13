# Audit IMPRO LAB du 13 novembre 2026

Audit fait sur `main` après la fusion de la PR 29 (commit `1a2cc6b`). Mesures prises avec Chromium en gabarit iPhone SE (375 × 667) et iPhone 13 (390 × 664). Ce qui n'a pas été mesuré est dit à la fin.

## Les chiffres avant la refonte

| Écran | Hauteur (en écrans d'iPhone SE) | Éléments touchables visibles | Replis |
|---|---|---|---|
| Accueil | 1,3 | 5 | 1 |
| Préparer | 2,3 | 45 | 4 |
| Exercice aléatoire | 1,8 | 11 | 2 |
| Régie | 2,1 | 83 | 16 |
| Bibliothèque | 131,9 | 419 | 207 |
| Groupes | 2,3 | 15 | 4 |
| Cahier de coach | 3,1 | 0 | 0 |
| Principes | 1,3 | 3 | 0 |
| Historique | 1,1 | 4 | 1 |
| Spectacle | 1,7 | 17 | 2 |

Aucune cible tactile sous 44 px, aucun débordement horizontal, aucune erreur JavaScript sur les dix onglets, sur les deux gabarits. Chargement local en 250 ms environ. Poids : `index.html` 270 Ko, `styles.css` 80 Ko, `library.json` 354 Ko.

## Ce qui gêne vraiment en séance

1. La Bibliothèque faisait 132 écrans de haut : les 103 fiches étaient ouvertes en entier, 850 px chacune. Sans passer par la recherche, retrouver un jeu au pouce était impossible.
2. L'en-tête et la navigation prenaient 180 px en haut de chaque page, soit 27 % d'un iPhone SE, avant le premier contenu utile. En Régie, c'est de la place perdue pour le chrono.
3. La navigation était en haut de l'écran, hors de portée du pouce quand on tient le téléphone d'une main devant un groupe.
4. Préparer montrait six boutons d'action (Enregistrer, Partager, Fiches élèves, Exporter, Importer, Effacer) alors qu'aucune séance n'existait, et 300 px de texte d'aide avant le premier réglage.
5. Le Cahier de coach : trois écrans de listes, sans aucun repli.

## Ce qui est à améliorer

- `styles.css` est fait de couches empilées : un thème sombre d'origine, recouvert par un thème papier, puis par le thème pastel actuel. 211 `!important`. Chaque retouche de style demande de se battre contre les couches du dessous. C'est le premier frein à la maintenance.
- Il n'y a pas de thème sombre : l'appli est claire partout, seule la Régie a un cadre sombre. En salle peu éclairée ou en coulisses, l'écran clair éblouit.
- `index.html` contient 324 fonctions sur 1 646 lignes dont certaines font 18 000 caractères, et 132 `onclick` écrits dans le HTML. Le fichier n'est pas vraiment minifié, mais il est illisible ligne à ligne. Il reste du code mort probable (un ancien chrono `start()` / `draw()` vers la ligne 289), à vérifier avant de retirer.
- Les replis ne se souviennent pas de leur état : après un rechargement, tout est refermé. C'est voulu pour garder les écrans légers, mais en Régie on peut vouloir retrouver « Tirages d'impro » ouvert. À décider.
- Le service worker va toujours chercher le réseau d'abord. Hors ligne, ça marche (cache de secours). En ligne avec un mauvais réseau, l'ouverture peut traîner alors que tout est déjà sur le téléphone.
- Sauvegarde : l'export et l'import existent, avec un rappel sur l'Accueil. Le point faible reste Safari, qui peut vider le stockage d'un site non installé après plusieurs semaines sans visite. L'appli demande déjà le stockage persistant ; l'installer sur l'écran d'accueil reste la vraie protection.

## Ce qui est à garder

- La Régie repliée par blocs : 16 replis, deux ouverts au départ, chrono lisible. C'est le meilleur écran de l'appli.
- La suite de tests : 132 tests par navigateur avant cette PR, une référence d'intégrité de `library.json`, une CI sur deux moteurs. C'est ce qui permet de refondre sans casser.
- L'absence d'outil de construction : trois fichiers, GitHub Pages, rien à installer. À préserver.
- Le générateur de séance, les profils de groupe et la bibliothèque : non touchés.
- L'identité visuelle (logo, filet arc-en-ciel, bordeaux et or).

## Trois options de refonte

### Option A, légère : une couche « écrans légers » (faite dans cette PR)

Deux fichiers ajoutés, `refonte.css` et `refonte.js`, qui rangent l'affichage sans toucher aux données ni au générateur. Détail dans DECISIONS D36.

- Avantages : gain immédiat sur les cinq gênes ci-dessus ; réversible en retirant deux lignes de `index.html`.
- Risques : une couche de plus par-dessus un CSS déjà empilé ; la barre du bas doit être vérifiée sur un vrai iPhone (zone du geste d'accueil, appli installée).
- Durée : fait.

### Option B, moyenne : remettre la maison en ordre, par lots

1. Nettoyer `styles.css` : une seule couche, des variables de couleur, plus de `!important` de combat. Rendu identique, vérifié par captures avant et après.
2. Thème sombre « coulisses », rendu possible par le lot 1.
3. Sortir le JavaScript d'`index.html` en quelques fichiers lisibles (bibliothèque, séance, régie, groupes, sauvegarde), sans outil de construction.
4. Service worker « cache d'abord, mise à jour en arrière-plan », avec un bandeau « nouvelle version disponible ».

- Avantages : chaque évolution future coûte moins cher ; le thème sombre devient simple.
- Risques : moyens. Les lots 1 et 3 ne changent rien de visible, donc toute régression est un bug. Les tests couvrent bien le comportement, moins le rendu.
- Durée : quatre à six séances de 1 à 2 h, une PR par lot.

### Option C, profonde : réécriture en composants

Découpage en modules avec un outil de construction, données dans IndexedDB.

- Avantages : base moderne, plus facile à faire grandir à long terme.
- Risques : élevés. Il faudrait rejouer tout ce qui est validé, migrer les données des téléphones, et l'appli perdrait sa simplicité (trois fichiers, pas de construction).
- Durée : plus de dix séances.

### Ma recommandation

Garder l'option A si elle te convient à l'usage, puis faire l'option B dans l'ordre 1, 2, 4, 3. Pas d'option C : l'appli marche, elle est testée, et rien dans tes besoins ne justifie de la reconstruire.

## Ce que je n'ai pas vérifié

- Les contrastes n'ont pas été mesurés un par un. Les éléments ajoutés sont en bordeaux `#8f2433` sur crème, largement au-dessus de 4,5.
- WebKit (le moteur de Safari) n'est pas installé dans mon environnement : ces tests tournent dans la CI de la PR.
- Rien n'a été essayé sur un vrai iPhone.
- Un test échoue chez moi avant comme après la refonte (« plein écran de séance… paysage ») : mon Playwright est en 1.63 et refuse de redimensionner une fenêtre en plein écran. La CI, en 1.56, le passait au vert sur la PR 29.
