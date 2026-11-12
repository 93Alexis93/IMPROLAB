# Avancement — IMPRO LAB

Lot du 2026-11-05 : préparation des séances (six curseurs), branche `amelioration/preparation-seance` créée depuis `origin/main` (0289828). Tâches de 1 à 2 h.

| Tâche | Objet | État |
|---|---|---|
| A | Environnement de test et référence sur `main` | fait |
| B | État des lieux des six curseurs sur `main` | fait |
| C | Cibles tactiles ≥ 44 px et nom accessible du bouton ✕ (écran Préparer) | fait, tests verts |
| D | Contraste ≥ 4,5 | mesuré : aucun écart détecté |
| E | Profils de groupe (Club collège, Copains, Association) | fait, voir journal |
| F | Compte rendu | fait |
| G | Carnet de bord, jeux écartés par groupe, partage de séance | fait (`354b5c9`) |
| H | Navigation compacte et badges de compétences | fait (`661eccd`) |
| I | Match d’impro et banque de thèmes de l’asso | fait (`e8fd307`) |
| J | Cibles tactiles restantes en Régie et Groupes | fait |
| K | Bouton « 💾 Enregistrer la séance » visible (D9) | fait (`f3ad148`) |
| L | Un effectif par groupe (D10) | fait : Playwright 80/80 (Chromium et WebKit), audit iPhone 13 et SE propre |
| M | Mode soirée (D11) | fait : Playwright 81/81 (Chromium et WebKit), audit Régie iPhone 13 et SE propre |
| O | Étapes 5 à 8 : main en main, favoris par groupe, fil rouge, spectacle (D13) | fait : Playwright 87/87 (Chromium et WebKit), audit de 11 écrans sur iPhone 13 et SE propre |
| N | Soirée sans exclusion par nombre de joueurs, créations IMPRO LAB incluses (D11 corrigé) ; plein écran de séance et élève animateur (D12) | fait : Playwright 83/83 (Chromium et WebKit), audit iPhone 13 et SE propre, scène comprise |

### Lot autonome (G à J) — vérifications
- Suite complète finale : `check.cjs` OK, `integrity.cjs` OK (124 fiches), Playwright **77/77 en iPhone-Chromium et 77/77 en iPhone-WebKit**, `library.json` inchangé (SHA-256 du fichier extrait identique à `main`, `git diff` vide).
- Audit iPhone 13 et iPhone SE (WebKit et Chromium) sur Préparer, séance générée, Régie avec match, Groupes avec badges, Historique avec carnet, Exercice aléatoire : 0 cible < 44 px, pas de débordement horizontal, 0 erreur JavaScript.
- Contraste : 0 écart sur tous les écrans sauf la Régie, où l’outil signale des faux positifs. Le texte foncé y est posé sur un dégradé clair que l’outil ne sait pas lire (vérifié sur capture). À confirmer à l’œil sur iPhone.

## Référence avant modification (`main`)
- `node tests/check.cjs` : OK. `node tests/integrity.cjs` : OK (124 fiches, 9 sections).
- Playwright iPhone-Chromium : 65/65. iPhone-WebKit : 65/65.

## État des lieux des six curseurs (`main`)
- Six curseurs, chacun regroupant une ou deux catégories : Énergie (Énergie, Corps), Écoute (Écoute, Cohésion), Construction, Scène (Scène, Émotions), Imaginaire, Amusement (Amusement, Lâcher-prise).
- Valeurs par défaut du HTML identiques à celles calculées par `groupDefault` (60, 70, 60, 60, 60, 70).
- Synchronisation séance ↔ tirage aléatoire : en place. Mémoire : `impro-session-dynamics-v1` et `impro-random-dynamics-v1`, écrites ensemble ; les anciennes valeurs à dix catégories sont reprises par moyenne.
- Défauts trouvés : cibles tactiles trop petites (voir DECISIONS D4) et bouton ✕ sans nom accessible (D5).

## Journal
### C — cibles tactiles
- Audit après correction (iPhone 13, WebKit et Chromium ; écrans Préparer, Préparer avec séance générée, Exercice aléatoire) : 0 cible < 44 px, 0 contraste < 4,5, pas de débordement horizontal, 0 erreur JavaScript.
- Vérifié au toucher : « Consigne » et « Crédits » s’ouvrent.
- Commit local `add1c95`.

### E — profils de groupe
- `index.html` : sélecteur « 1. Groupe », fonctions `switchProfile`, `snapshotGroupProfile`, `initGroupProfile` ; nom du groupe dans l’Historique. Voir DECISIONS D7.
- Tests ajoutés : `tests/profiles.spec.cjs` (4 tests : réglages et durée par groupe avec rechargement, rotation séparée, historique étiqueté, mémoire corrompue) et `impro-group-profiles-v1` dans la liste « stockage corrompu » de `security.spec.cjs`.
- Audit iPhone 13 et iPhone SE, WebKit et Chromium : 0 cible < 44 px, 0 contraste < 4,5, pas de débordement, 0 erreur JavaScript.
- Suite complète : `check.cjs` OK, `integrity.cjs` OK (124 fiches), Playwright 70/70 en iPhone-Chromium et 70/70 en iPhone-WebKit (65 existants + 5 nouveaux), `library.json` inchangé.

### Rappel C
- Après correction : `check.cjs` OK, `integrity.cjs` OK (124 fiches), Playwright 65/65 en iPhone-Chromium et 65/65 en iPhone-WebKit, `library.json` inchangé (`git diff` vide).

## Lot du 2026-11-07 : bibliothèque après la revue des fiches (D16)
Branche `bibliotheque/retrait-externes-3-2-2-20` depuis `origin/main` (c7f8b49).

| Lot | Objet | État |
|---|---|---|
| 1 | 17 fiches WEB/EXT, `sources_externes` et case « recherches externes » retirées ; créations IMPRO LAB incluses | fait |
| 2 | Fiche 3-2 « Impro libre » supprimée | fait |
| 3 | 2-20 « Take et give le focus » devenue principe (texte à rédiger par Alexis) | fait |
| 4 | Niveau en étoiles sur les 105 fiches (2-24 ramenée à ★★★) ; seuil de chargement 122 → 100 | fait |

- `check.cjs` OK, `integrity.cjs` OK (105 fiches, 8 sections), Playwright 87/87 en iPhone-Chromium et 87/87 en iPhone-WebKit.

## Lot du 2026-11-07 (suite) : niveaux en étoiles dans l’appli (D17)
Branche `fonctions/niveaux-etoiles`, partie de `bibliotheque/retrait-externes-3-2-2-20` (PR 22).

| Tâche | Objet | État |
|---|---|---|
| 1 | Étoiles affichées et filtre par niveau | fait |
| 2 | Difficulté progressive par étape (générateur, remplacement) | fait |
| 3 | Plafond par groupe (collège, copains ★★ ; asso ★★★) | fait |
| 4 | Signal en mode élève animateur | fait : Playwright 90/90 (Chromium et WebKit) |
| 5 | Étiquettes d’usage tirées des commentaires (D18) | fait : Playwright 91/91 (Chromium et WebKit), audit iPhone 13 (bibliothèque, Préparer, Spectacle) sans cible < 44 px ni débordement |
| 6 | Plus aucune mention des adaptations web (D19) | fait : Playwright 91/91 (Chromium et WebKit) |

## Lot du 2026-11-07 (suite) : tes règles avec tes mots (D20)
Branche `bibliotheque/regles-commentaires`, partie de `fonctions/usages-revue` (PR 24).

| Tâche | Objet | État |
|---|---|---|
| 1 | Commentaires de revue intégrés aux règles (9 fiches dont 2-32) | fait |
| 2 | Doublons jamais dans la même séance (`jamais_avec`) | fait |

## Lot du 2026-11-07 (soir) : lots 1, 2 et 3 en autonomie (D23 à D27)
Branche `amelioration/lots-1-2-3` depuis `origin/main` (dd0a951). Demande d’Alexis : « fais les lots 1, 2 et 3 en autonomie ».

| Lot | Tâche | État |
|---|---|---|
| 1 | Rappel de sauvegarde sur l’Accueil, date de la dernière sauvegarde, stockage persistant demandé | fait |
| 1 | README à jour (2-20 devenue principe, tutoriel, sauvegarde) | fait |
| 1 | Tutoriel d’accueil : seulement à la première ouverture (proposition `proposal/tutorial-persistence` reprise avec son test) | fait |
| 1 | Barre de navigation : mesurée à 56 px (8 % d’un iPhone 13), non modifiée | vérifié, sans changement |
| 2 | Première séance d’un groupe : jeu de prénoms au début ; jeux « chauffe » et « début de séance » admis en ouverture | fait |
| 2 | Équipes à partir des présents | déjà présent (Groupes et Régie, en évitant les mêmes paires) : rien à faire |
| 2 | 👍 / 👎 et note rapide dans la Régie et le plein écran, versés dans le carnet de bord | fait |
| 2 | Signal de fin : trois bips plus forts, bip 1 min avant, chrono qui pulse, écran maintenu allumé, vibration si possible | fait, à tester sur iPhone |
| 3 | Trame du fil rouge | laissée telle quelle : elle attend la validation d’Alexis (D13) |
| 3 | Séance en cours propre à chaque groupe | fait |
| 3 | Bilan du trimestre par groupe (Historique), prêt à copier | fait |
| 3 | Noms de groupes modifiables ; choix du groupe dans Exercice aléatoire | fait |

- Tests ajoutés : `tests/lots-1-2-3.spec.cjs` (8 tests) et `tests/tutorial-persistence.spec.cjs` (repris de la proposition).
- Google Sheet de revue des catégories et des filtres : voir D27.

## Lot du 2026-11-08 : phase autonome (D28 et suivantes)
Branche `amelioration/phase-autonome-nov` depuis `amelioration/lots-1-2-3` (844dbd6). Demande d’Alexis, absent : « fais-en un max », réponses données avant le départ.

| Étape | Objet | État |
|---|---|---|
| 1 | Tirage de l’Accueil repliable | fait |
| 2 | Échauffement : ↺ garde le jeu, 🔄 tire un autre jeu (fin du retour sur « Impro libre ») | fait |
| 3 | Exercice aléatoire joué seul en Régie, séance intacte | fait |
| 4 | Fiche élève sur une page A4, deux encadrés par ligne, objectif et fil conducteur | fait, vérifié en PDF (1 page de 3 à 16 exercices) |
| 5 | « 📝 Mes notes » sur chaque exercice | fait |
| 6 | Mode soirée : titre, consigne et explication complète sous le chrono | fait |

- Étapes 1 à 6 : `check.cjs` OK, `integrity.cjs` OK (105 fiches), Playwright 113/113 en iPhone-Chromium et 113/113 en iPhone-WebKit (226 au total).
| 7 | Fiches animateur refaites d’après la revue des fiches (53 fiches, 3 titres renommés), D29 | fait : `check.cjs` OK, intégrité régénérée (160 écarts attendus), Playwright 114/114 Chromium et 114/114 WebKit |
| 8 | Revue des catégories : tous les jeux dans le générateur, contact physique et son filtre (D30) | fait : Playwright 115/115 Chromium et 115/115 WebKit |
| 9 | Finitions : audit iPhone SE et 13, cible « Mes notes » 44 px, bandeau sous le chrono au thème clair (D31) | fait : `check.cjs` OK, `integrity.cjs` OK, Playwright 115/115 Chromium et 115/115 WebKit (230) |

## Lot du 2026-11-09 : pistes improwiki (D32)
Branche `amelioration/pistes-improwiki` depuis `main` (23a5a65). Accord d’Alexis pour les lots A à F.

| Lot | Objet | État |
|---|---|---|
| A | Bouton « Suggestion du public » dans la Régie | fait |
| B | Champ « Aussi appelé » sur 29 fiches, recherche par l’autre nom | fait ; 22 noms à vérifier par Alexis |
| C | Listes Métier et Activité, compléments Lieu et Émotion | fait |
| D | Tirage « Genre » avec trois repères pour 32 genres | fait |
| E | Cinq trames de spectacle qui remplissent l’ordre de passage | fait ; découpages à ajuster |
| F | Six principes avec lien « Pour aller plus loin » | fait ; textes à relire |

- Tests ajoutés : `tests/pistes-improwiki.spec.cjs` (7 tests) ; `tests/app.spec.cjs` passe de 7 à 13 principes.
- Résultats : `check.cjs` OK, `integrity.cjs` OK (105 fiches), Playwright 122/122 en iPhone-Chromium et 122/122 en iPhone-WebKit (244 au total) ; rendu vérifié sur capture iPhone 13 WebKit (Régie et Spectacle), sans débordement horizontal.
- À tester sur iPhone : la lisibilité de la suggestion du public à bout de bras, et l’ouverture des liens improwiki depuis l’appli installée sur l’écran d’accueil.

### Retouche du 2026-11-12 (même branche, PR 29)
- Suggestion du public refaite : question à poser, champ pour ce que la salle a dit, affichage sous le chrono et en plein écran, note dans le carnet de bord, tirage de secours.
- « Aussi appelé » affiché aux tirages (Accueil, Exercice aléatoire) et en Régie (sous le titre, plein écran).
- Tests : 246/246 (iPhone-Chromium et iPhone-WebKit), check.cjs et integrity.cjs OK ; le test de la suggestion est réécrit, un test « Aussi appelé » ajouté (8 tests dans `tests/pistes-improwiki.spec.cjs`). Cache `v55-public-aussi-appele`, `styles.css?v=11`.

### Lot du 2026-11-12 : titres du public (D33), même branche, PR 29
| Lot | Objet | État |
|---|---|---|
| 1 | Questions cochées (Lieu, Relation, Mot au départ), listes Objet, Époque, films, chansons | fait ; listes à relire |
| 2 | Deux mots du public mélangés en titres, choix, ✏️, carnet de bord | fait |
| 3 | Deux films ou deux chansons, « à la manière de » | fait |
| 4 | Thème du match, lien depuis le Spectacle, Mes titres | fait |

- Tests ajoutés : `tests/titres-public.spec.cjs` (7 tests) ; campagne complète 260/260 (iPhone-Chromium et iPhone-WebKit), check.cjs et integrity.cjs OK. Cache `v56-titres-du-public`, `styles.css?v=12`.
- Rendu vérifié sur iPhone SE et iPhone 13 (WebKit) : pas de débordement, cibles tactiles ≥ 44 px dans la boîte de suggestion, aucune erreur JavaScript.

### Retouche du 2026-11-12 : question cochée et replis (D34), PR 29
- La question à poser se coche (Lieu, Relation, Mot ; les autres repliées), plus de 🔄.
- Replis ajoutés : Régie (suggestion, catégories de tirage, noms et réglages du match, remarque du chrono), Accueil (sauvegarde), Préparer (ajout manuel), Bibliothèque (filtres), Spectacle (jeux repérés, trames), Groupes (équipes enregistrées fermées).
- Tests adaptés : ouverture des replis avant usage (features, mobile, phase-nov, regression, data-tools, pistes-improwiki, titres-public). Cache `v57-replis`, `styles.css?v=13`. Campagne complète 260/260 (iPhone-Chromium et iPhone-WebKit), check.cjs et integrity.cjs OK.
