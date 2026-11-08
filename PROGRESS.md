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
