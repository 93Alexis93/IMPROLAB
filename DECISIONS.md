# Décisions — IMPRO LAB

## 2026-11-05 — Lot « préparation des séances / six curseurs »

### D1. Base de travail : `main`, pas `refonte-ux-ui-impro-lab`
- `refonte-ux-ui-impro-lab` est entièrement contenue dans `main` (0 commit propre, `main` a 29 commits d’avance).
- Sur `refonte` : `check.cjs` échoue (« Tutoriel d’accueil absent »), 31 tests Playwright sur 62 échouent par moteur, et `library.json` n’a que 122 fiches (3-6 et 3-7 absentes).
- Sur `main` : `check.cjs` et `integrity.cjs` passent (124 fiches, dont 3-6 et 3-7), 65/65 tests Playwright passent en iPhone-Chromium et iPhone-WebKit, et les six curseurs demandés (Énergie, Écoute, Construction, Scène, Imaginaire, Amusement) existent déjà (fusion de `design/six-curseurs`).
- Décision (Alexis) : partir de `main`. Branche de travail : `amelioration/preparation-seance`, sans suivi distant, aucune fusion ni poussée.
- Le point ouvert « Tutoriel d’accueil absent » ne concerne que `refonte` ; il est sans objet sur `main`.

### D2. Curseurs de la séance et du tirage aléatoire : synchronisés
- Décision (Alexis) : synchronisés. C’est déjà le comportement de `main` (`updateDynamic` / `updateRandomDynamic` recopient la valeur dans l’autre générateur, une seule mémoire partagée). Aucun changement de code.

### D3. Bibliothèque intouchable
- `library.json` et `tests/library.baseline.json` ne sont pas modifiés ; contrôle par `git diff --exit-code` et `node tests/integrity.cjs` après chaque étape. Fiches 3-6, 3-7 et 1-43 (« Bananes ») non touchées.

### D4. Cibles tactiles : correction CSS ciblée plutôt que refonte
- Mesure Playwright (iPhone 13, WebKit et Chromium) avant correction : curseurs de 32 px de haut ; rubriques « Consigne », « Variante », « Objectif… » des exercices de 22 px de haut (le cadre visible faisait 44 px mais seule la ligne de titre réagissait au toucher) ; « Crédits » 28 px ; boutons ↑ ↓ ✕ de 34 à 39 px de large.
- Correction : un bloc de 6 règles en fin de `styles.css`, limité aux curseurs (`.dynamic-row`) et aux cartes de la séance (`#plan`). Le titre de chaque rubrique occupe désormais tout son cadre, sans changer l’apparence.
- Les `!important` suivent la convention déjà en place dans la feuille de styles (thèmes empilés).

### D5. Nom accessible du bouton ✕ de chaque exercice
- Le bouton ✕ n’avait pas de nom accessible (VoiceOver lisait le symbole). Ajout de `aria-label="Retirer exercice N"`, sur le modèle de « Monter exercice N ».
- Conséquence : le test `regression.spec.cjs` qui cherchait le bouton par le texte « ✕ » cherche désormais « Retirer exercice N ». Même action, même vérification.

### D6. Environnement de test local (hors dépôt)
- Node 22.23.4 portable et Playwright 1.56.1 (versions de la CI) dans un dossier temporaire. `python3` étant absent, un petit serveur Node statique sert le dépôt sur `127.0.0.1:8765` ; `playwright.config.cjs` le réutilise et n’est pas modifié.

### D7. Profils de groupe : Club collège, Copains, Association
- Demande d’Alexis : une seule application pour le club d’impro du collège, les copains et l’association.
- Trois profils fixes, choisis en tête de l’écran Préparer (« 1. Groupe »). Chacun garde ses six priorités, sa durée et sa rotation d’exercices (`impro-recent-games`, `impro-game-usage-v1`, `impro-session-rounds-v1`). Les séances enregistrées portent le nom du groupe dans l’Historique.
- Choix technique : les clés habituelles contiennent toujours l’état du groupe actif. Au changement de groupe, elles sont rangées dans `impro-group-profiles-v1`, puis remplacées par celles du groupe choisi. Le générateur, le tirage aléatoire et la synchronisation des curseurs (D2) ne sont pas modifiés.
- Migration : au premier lancement, les réglages et la rotation existants deviennent ceux du Club collège ; rien n’est perdu. Copains et Association partent des valeurs par défaut.
- Mémoire corrompue ou incohérente : lecture tolérante, retour au Club collège et aux valeurs par défaut (test dédié).
- Le menu « Public » (Collège débutant / Troupe adulte) n’avait aucun effet sur la génération : la variable `adult` de `generate()` n’est jamais utilisée. Il est masqué et réglé automatiquement par le profil (Club collège → Collège débutant ; Copains et Association → Troupe adulte). Ses identifiants restent en place.
- Non inclus dans ce lot, à décider : séance en cours propre à chaque groupe, effectifs et favoris par groupe, noms de groupes modifiables, sélecteur de groupe dans « Exercice aléatoire ».

### D8. Lot autonome du 2026-11-05 (1 h 15) : choix parmi les cinq axes
Fait, chacun avec ses tests (`tests/features.spec.cjs`) :
- **Club collège, carnet de bord** : dans l’Historique, chaque séance enregistrée a un carnet (ce qui a marché, qui a brillé, à retravailler) et une phrase pour les parents construite à partir de l’objectif de la séance, prête à copier. Le texte saisi est échappé à l’affichage.
- **Club collège, badges de compétences** : Groupes → « 🏅 Compétences des joueurs », quatre badges (écoute, accepter, construire, oser) à activer par joueur, sans note ni classement. Mémoire à part (`impro-player-badges-v1`, par effectif et par prénom) pour ne pas toucher au format des effectifs, ni à leur nettoyage au chargement ou à l’import.
- **Association, partage entre animateurs** : « 📤 Partager la séance » ouvre la feuille de partage de l’iPhone (AirDrop, Messages, WhatsApp…), avec un résumé lisible et le fichier importable (même format que l’export, plus le nom du groupe). Sans feuille de partage, le fichier est téléchargé.
- **Association, match d’impro** : Régie → « 🏒 Match d’impro · table de l’arbitre » : noms et score des deux équipes, tirage catégorie + thème, lancement du chrono de la Régie en mode impro libre avec la catégorie et le thème affichés en grand. Catégories par défaut : Mixte, Comparée, Chantée (celles citées par Alexis), modifiables. Banque de thèmes alimentée par les membres, vide au départ, enregistrée sur l’appareil (`impro-match-v1`), **à part de `library.json`**.
- **Tous, « jamais avec ce groupe »** : bouton « 🚫 Écarter » sur chaque exercice de la séance. Le jeu est remplacé, puis n’est plus proposé à ce groupe, ni par le générateur ni par « Remplacer ». « Tout réautoriser » annule. Mémoire `impro-group-excluded-v1`, par groupe.
- **Tous, navigation compacte** : sur téléphone, une seule ligne de cinq cibles de 44 px (56 px de haut au lieu de 144 sur iPhone 13). « Plus », une fois ouvert, passe sur sa propre ligne : son menu reste en flux et n’est jamais rogné.

Non fait, et pourquoi :
- **Filtres contact physique, élimination, jeu engagé** : la bibliothèque n’a pas d’information fiable pour les distinguer. Il faudrait ajouter un champ dans `library.json`, ce qui demande une validation éditoriale.
- **Niveaux ★** : en attente de la revue en cours dans une autre session.
- **Fil rouge sur l’année, préparation de spectacle, mode élève animateur, mode soirée** : plus longs ou à cadrer avec Alexis. La Régie a déjà le mode impro libre, les tirages de contraintes, le plein écran et un signal sonore à l’échéance, qui couvrent en partie « Copains ».
- **Effectif propre à chaque groupe** : l’application n’a que deux effectifs (Collège, Troupe adulte), et leur format est figé à plusieurs endroits (chargement, import). À traiter dans une tâche à part.
- **Favoris par groupe** : les favoris servent à parcourir la bibliothèque. « Écarter » couvre le besoin principal ; les favoris restent communs.

### Hors périmètre, signalé
- La barre de navigation fixe (Accueil, Préparer, Exercice aléatoire, Régie, Plus) occupe environ un quart de la hauteur d’un iPhone 13 sur l’écran Préparer. Non modifiée (navigation globale) ; à décider séparément.
