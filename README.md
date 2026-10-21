# IMPRO LAB

Application locale de préparation et d’animation d’exercices d’improvisation. Le fichier `library.json` contient les fiches et leurs données pédagogiques ; `index.html` fournit l’interface ; `sw.js` gère le mode hors ligne.

## Contrôles automatisés

La CI utilise Node.js 22 et Playwright `@playwright/test@1.56.1`. Le workflow `.github/workflows/ci.yml` lance les contrôles statiques et le contrôle d’intégrité, puis les tests navigateur sur Chromium et WebKit. Un test qui ne passe qu’après une relance est signalé comme instable et fait échouer le job. En cas d’échec, les traces, captures et rapports sont conservés dans les artefacts GitHub Actions.

Les commandes exécutées par la CI sont :

- `node tests/check.cjs`
- `node tests/integrity.cjs`
- `npx playwright test --project="iPhone-Chromium" --fail-on-flaky-tests`
- `npx playwright test --project="iPhone-WebKit" --fail-on-flaky-tests`

## Fichiers sensibles et procédure d’évolution

- **`library.json`** : source pédagogique. Ne pas modifier les fiches sans validation éditoriale explicite.
- **`tests/library.baseline.json`** : référence d’intégrité issue de la bibliothèque de référence. Toute mise à jour doit être volontaire, relue et justifiée ; la CI refuse l’option `--update`.
- Avant une évolution éditoriale, conserver une copie de la bibliothèque hors du dépôt, relire le diff champ par champ et vérifier que les changements correspondent précisément à la décision validée. Ne jamais régénérer la référence pour faire disparaître un écart inattendu.

## Historique des workflows avant leur consolidation

| Contrôle précédent | Ce qu’il faisait | Reprise dans `ci.yml` |
|---|---|---|
| `check.yml` — job statique | `node tests/check.cjs` | Job `static`, avec le contrôle d’intégrité ajouté |
| `check.yml` — navigateur | Suite Playwright complète, Chromium et WebKit, Playwright 1.56.1 épinglé, artefacts sur échec | Job `browser`, matrice des deux projets, version épinglée et artefacts |
| `quality.yml` | Rejouait uniquement `tests/app.spec.cjs`, avec Playwright non épinglé et sans artefacts | La suite navigateur complète exécute aussi `app.spec.cjs`, dans les deux projets, avec version épinglée et artefacts |

## Diagnostic d’une CI en échec

Ouvrir le run GitHub Actions correspondant, identifier le job et le test précis, puis consulter les traces et captures de l’artefact. Une erreur de contrôle statique ou d’intégrité doit être traitée avant les tests navigateur. Un test instable reste un échec à diagnostiquer : ne pas supprimer le test, augmenter les délais sans preuve, ni contourner le tutoriel pour obtenir un résultat vert.

## Périmètre et décisions en attente

- La fiche **2-20** reste « à confirmer » et non éligible ; aucune fiche n’est rendue éligible dans ce lot.
- **Concentration** reste exclue des catégories de génération.
- Le comportement du tutoriel d’accueil n’est pas modifié dans la PR principale. Les helpers de test le ferment lorsqu’il est présent afin que les tests puissent atteindre l’interface. Une proposition isolée avec son test est disponible sur la branche `proposal/tutorial-persistence` ; elle n’est ni fusionnée ni incluse dans la PR principale.

Le test de stockage corrompu a reproduit un défaut réel : une valeur JSON invalide dans `localStorage['impro-favorites']` faisait échouer le chargement de toute la bibliothèque. La correction de ce lot ajoute une lecture tolérante des favoris (valeur invalide ou de forme incorrecte → liste vide) ; le test de régression reste actif.
