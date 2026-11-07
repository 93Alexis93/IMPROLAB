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

### D9. Bouton « 💾 Enregistrer la séance » bien visible
- Demande d’Alexis : le bouton « Enregistrer » se trouvait dans le bloc « Ajouter un exercice », en bas de page, et passait inaperçu.
- Il est déplacé (pas dupliqué) : bouton principal en tête des actions, juste sous la séance, avant « Partager la séance ». L’émoji est masqué aux lecteurs d’écran, le nom accessible est « Enregistrer la séance ». Le message de confirmation indique où retrouver la séance : Plus → Historique.
- Les tests qui cherchaient le nom exact « Enregistrer » cherchent désormais « Enregistrer la séance ». Un test vérifie que le bouton est unique, visible, d’au moins 44 px et placé juste sous la séance.

### D10. Un effectif par groupe
- Trois effectifs au lieu de deux : Club collège (`college`), **Copains (`copains`, nouveau)** et Association (`troupe`). La clé `troupe` est conservée : l’ancienne « Troupe adulte » devient l’effectif de l’Association, joueurs, historique des associations et équipes enregistrées compris. Rien n’est perdu ni renommé dans la mémoire.
- Choisir un groupe dans Préparer sélectionne son effectif dans Groupes et dans la Régie. On peut toujours changer d’effectif à la main dans ces deux écrans.
- Chargement, import et équipes enregistrées acceptent les trois effectifs. Un ancien fichier d’export (Collège et Troupe seulement) s’importe toujours ; l’effectif Copains reste alors vide.
- Les badges de compétences suivent l’effectif, puisqu’ils sont rangés par effectif.
- Tests : `tests/profiles.spec.cjs`, « effectifs » (deux tests : trois effectifs suivis par Groupes et la Régie avec rechargement ; reprise des anciennes données et import d’un ancien fichier).

### D11. Mode soirée (Copains)
- Régie → « 🎉 Mode soirée · jeux au hasard » : on saisit le nombre de joueurs présents, puis chaque « 🎲 Jeu suivant » tire un jeu et l’envoie dans la Régie, en mode impro libre, avec sa durée de fiche, son titre et sa consigne courte. « Nouvelle soirée » remet le compteur à zéro.
- Nombre de joueurs : pré-rempli avec les présents de l’effectif du groupe actif (6 par défaut s’il y en a moins de 2).
- **Correction demandée par Alexis** : le nombre de joueurs n’écarte **aucun** jeu. Un jeu « en binômes » se joue à n’importe quel effectif, en formant des binômes en même temps. La première version écartait un seul jeu, 3-7 « Le banc des solutions » (4–8 joueurs), sous 4 joueurs ; ce filtre est supprimé. L’effectif conseillé reste affiché pour information quand il est renseigné.
- Jeux proposés : notes personnelles **et créations IMPRO LAB** (dont 3-6 et 3-7, validés par Alexis), hors adaptations externes (WEB, EXT). Le tirage rapide de l’Accueil et le générateur de séance gardent leurs règles d’origine, non modifiées. Jeux écartés pour le groupe exclus, aucune répétition dans la soirée, rotation du groupe respectée (les 25 derniers jeux sont évités tant que possible). L’ambiance vient des curseurs de « Exercice aléatoire », synchronisés avec ceux de la séance.
- Mémoire : `impro-soiree-v1` (jeux joués le jour même).
- Constat, non modifié : dans « Exercice en cours », la consigne défile dans une zone de 92 px (réglage existant de la Régie). Le plein écran de l’étape 3 la rendra lisible en entier.

### D12. Plein écran de séance et mode élève animateur
- Régie → « 📺 Plein écran » et « 🧑‍🎓 Élève animateur » ouvrent une **vue scène** qui couvre tout l’écran : titre, consigne en très gros caractères (la consigne courte de la fiche, sinon la règle), chrono géant, gros boutons. La vue recopie la Régie en direct (chrono, Démarrer/Pause, exercice en cours), donc séance préparée, mode soirée et match fonctionnent dedans.
- Paysage : consigne à gauche, chrono et boutons à droite ; la consigne défile dans sa colonne si elle est trop longue.
- Pourquoi une vue en surimpression plutôt que le plein écran du navigateur : Safari sur iPhone ne permet pas le plein écran d’une page web (seulement des vidéos). Le plein écran du navigateur est tout de même demandé là où il existe (iPad, ordinateur), et l’écran est maintenu allumé (Wake Lock) quand l’appareil le permet. Installée sur l’écran d’accueil, l’application n’a de toute façon pas de barre de navigateur.
- **Élève animateur** : « À toi de mener l’échauffement ! », consigne courte seulement (contenu existant de la bibliothèque, rien de créé), boutons Démarrer et ↺ uniquement : pas de passage à l’exercice suivant ou précédent, glissement désactivé. Quitter demande « Reprendre la main sur la Régie ? ».
- L’ancienne fonction `liveFull`, sans bouton depuis la refonte, n’est pas modifiée.
- Tests : plein écran (synchronisation du chrono, navigation, paysage) et élève animateur (pas de navigation, sortie confirmée).

### D13. Étapes 5 à 8
- **Contraintes de main en main (Copains)** : Régie → Tirages d’impro → « 📱 Plein écran, de main en main ». Les catégories cochées s’affichent en très gros, avec un bouton « 🎲 Suivant » géant (84 px) qui relance tout. Ce sont les listes de tirage existantes (modifiables dans « Personnaliser les listes ») : rien n’est créé.
- **Favoris par groupe** : `impro-favorites` rejoint les clés rangées et restituées au changement de groupe, comme la rotation. Les favoris existants restent au Club collège ; Copains et Association démarrent sans favoris. La Bibliothèque indique « (groupe X) » à côté de « Favoris seulement ».
- **Fil rouge sur l’année** : Préparer → « 🧵 Fil rouge de l’année ». Trois trimestres, chacun avec ses priorités parmi les six curseurs. Le trimestre est choisi d’après la date, et reste modifiable. **Trame par défaut tirée de la demande d’Alexis** (« de l’écoute aux personnages puis au spectacle ») : T1 Écoute + Énergie, T2 Scène + Construction, T3 Scène + Imaginaire + Amusement. Elle est modifiable par groupe et **reste à valider**. « Proposer la séance suivante » règle les curseurs (90 pour les priorités du trimestre, 30 pour les autres) et génère la séance. « D’après la précédente » : si la dernière séance enregistrée du groupe était centrée sur une priorité du trimestre, celle-ci passe à 70 pour varier l’accent. Le compteur « séance n° » compte les séances enregistrées du groupe dans ce trimestre. Mémoire : `impro-fil-rouge-v1`. Aucun contenu pédagogique n’est inventé : la trame ne fait que régler les priorités existantes.
- **Préparation de spectacle (Asso)** : nouvel onglet Plus → « Spectacle ». Titre, date et lieu, effectif (celui du groupe actif par défaut), numéros ordonnés (format proposé d’après les catégories du match, durée, joueurs à toucher, notes lumière et son). Le résumé donne la durée totale, les passages par joueur et les joueurs sans passage. « 🖨 Imprimer la feuille de régie » imprime un tableau propre (N°, format, durée, joueurs, lumière et son, durée totale), sans les champs de saisie. Mémoire : `impro-show-v1`.
- Correctif au passage : les gros boutons de la vue scène et du plein écran étaient ramenés à 44 px par une règle existante de la Régie. Leurs tailles (56 à 84 px) sont maintenant appliquées.
- Tests : quatre nouveaux tests dans `tests/features.spec.cjs` (favoris par groupe, main en main, fil rouge, spectacle avec rendu « impression » vérifié).

### Hors périmètre, signalé
- La barre de navigation fixe (Accueil, Préparer, Exercice aléatoire, Régie, Plus) occupe environ un quart de la hauteur d’un iPhone 13 sur l’écran Préparer. Non modifiée (navigation globale) ; à décider séparément.

### D14. Articles des titres : seulement quand ils conviennent
- Demande d'Alexis : « Le » ou « La » ne doit pas apparaître tout le temps, seulement quand il faut, et le reste du titre ne change pas.
- La table `TITLE_ARTICLES` (dans `index.html`, pas dans `library.json`) passe de 62 à 21 entrées. L'article est gardé devant les titres qui sont des noms (« Le Duel au cercle », « L'Abécédaire », « La Patate chaude : … », « Les Voleurs de répliques », « L'Impro libre »…). Il est retiré devant les phrases, questions, exclamations, verbes et énumérations (« C'est quoi, ce poindon ? », « Tape, tape… choisis ton cap ! », « Tu sais pas quoi », « Applaudir à trois », « À l'aide ! », « Maison – créature – inondations »…).
- Le texte des titres n'est jamais modifié : seul l'article ajouté automatiquement disparaît.
- Test mis à jour (`app.spec.cjs`) : il exigeait un article devant tous les titres. Il vérifie désormais la nouvelle règle dans les deux sens, et que le titre d'origine reste intact.

### D15. Bibliothèque après la revue des fiches (lots 1 à 4)
- Revue éditoriale d'Alexis du 7 novembre 2026 (Google Sheet « IMPRO LAB — Revue des fiches ») et décisions explicites du même jour. Modification de `library.json` validée par Alexis, référence d'intégrité régénérée (`tests/integrity.cjs --update`), diff vérifié.
- **Lot 1 — recherches externes retirées** : les 17 fiches `recherche_web` (WEB-001 à 008, EXT-001 à 009) et la section `sources_externes` (3 sites) sont supprimées. La case « Inclure aussi les exercices issus de recherches externes » est retirée de Préparer. Les créations IMPRO LAB (3-6, 3-7) entrent désormais dans le tirage rapide, le générateur de séance et l'ajout manuel, comme les notes personnelles.
- **Lot 2 — 3-2 « Impro libre » supprimée** (« ce n'est pas un jeu »). Le mode chrono « Impro libre » de la Régie est indépendant de la fiche et reste.
- **Lot 3 — 2-20 « Take et give le focus » devient un principe** : retirée des exercices, ajoutée à `principes_improvisation` (titre et note originale d'Alexis). Le texte du principe (`detail`) est vide : Alexis le rédigera plus tard.
- **Lot 4 — niveau en étoiles** : le champ `niveau` de chaque fiche reçoit la note d'Alexis, écrite en étoiles (« ★ », « ★★ », « ★★★ »). 2-24, notée ★★★★ dans la revue, passe à ★★★ (décision d'Alexis). Accord explicite d'Alexis pour les fiches validées 1-43 (★), 3-6 et 3-7 (★★★) : seul leur champ `niveau` change. Répartition : 23 ★, 66 ★★, 16 ★★★. L'intégrité a listé exactement 105 écarts « champ niveau : MODIFIÉ » avant régénération.
- Chargement : l'appli refusait une bibliothèque de moins de 122 fiches (« Bibliothèque incomplète »). Seuil abaissé à 100 pour accepter les 105 fiches tout en détectant un fichier tronqué.
- Résultat : 105 fiches (103 notes personnelles, 2 créations IMPRO LAB), 14 principes. Aucune autre fiche n'est modifiée : 1-43, 3-6 et 3-7 sont intactes.
- Cache : `library.json?v=20261107-revue-fiches`, service worker `v46-revue-fiches`, pour que l'iPhone recharge la bibliothèque.
- Tests mis à jour : `app.spec.cjs` (titres : WEB, EXT et 3-2 retirés des exemples, seuil 105), `regression.spec.cjs` (plus de case externe ; le générateur accepte notes et créations), `check.cjs` (2-20, 3-2, recherches externes et `sources_externes` doivent être absents, le principe doit exister).
- Non modifié, signalé : le texte de `conservation` en tête de `library.json` parle encore d'« exercices externes » ; les `regles_pedagogiques` citent toujours theatrefolk.com dans `source_url` ; la mention « Adaptation pédagogique issue d'une source externe » reste dans le code sans plus servir.
