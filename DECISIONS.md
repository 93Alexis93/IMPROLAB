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

### D15. Sauvegarde, avis 👍/👎, présences, caucus, échauffement express, fiches élèves ; CI fiabilisée
- **Sauvegarde complète** (Accueil → « 💾 Sauvegarde de tes données ») : toutes les clés `impro-*` de l'appareil dans un seul fichier `impro-lab-sauvegarde-AAAA-MM-JJ.json`, par la feuille de partage de l'iPhone (Fichiers, iCloud Drive) ou en téléchargement. La restauration vérifie le format, demande confirmation, remplace les données IMPRO LAB de l'appareil et recharge la page. Raison : tout est enregistré sur l'appareil seulement, et Safari peut effacer les données d'un site resté longtemps sans être ouvert.
- **Avis 👍 / 👎 par exercice**, dans le carnet de bord de chaque séance enregistrée. Le total par groupe (`impro-game-feedback-v1`, recalculé depuis l'historique) donne un bonus (+2,5 par 👍, plafonné à 2) ou un malus (−3 par 👎, plafonné à 2) dans le choix des jeux de la séance. Un jeu n'est jamais exclu d'office : après deux 👎 avec un groupe, l'application **propose** de l'écarter pour ce groupe.
- **Présences** (Groupes → « 📋 Présences du club ») : une feuille par jour et par effectif (l'enregistrer à nouveau le même jour la remplace), avec le décompte par joueur (« Lina : 5 / 6 »). Mémoire `impro-attendance-v1`.
- **Caucus** (Régie → Match) : 20 secondes, signal sonore à la fin.
- **Échauffement express** (Accueil → « ⚡ J'ai 5 minutes ») : un jeu validé d'énergie, de lâcher-prise ou d'amusement, hors jeux écartés pour le groupe, lancé directement dans la vue plein écran avec 5 minutes au chrono.
- **Fiches élèves** (Préparer → « 🖨 Fiches élèves ») : une page par exercice de la séance, avec le titre et la consigne courte en très gros caractères. Seules ces fiches sont imprimées.
- **CI** : la vérification iPhone-Chromium restait parfois bloquée à l'installation des navigateurs, jusqu'à l'annulation au bout de 25 minutes (3 lancements sur 12). Chaque vérification n'installe plus que son navigateur, avec 5 minutes au plus par tentative et jusqu'à 3 essais.
- Petit correctif : les boutons du match passent à la ligne sur iPhone SE (le bouton Caucus dépassait de 13 px).
- Tests : `tests/data-tools.spec.cjs` (6 tests).

### D16. Bibliothèque après la revue des fiches (lots 1 à 4)
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

### D17. Utiliser les niveaux en étoiles dans l'appli
- Demande d'Alexis (7 novembre 2026), après la revue : afficher les niveaux, rendre la séance progressive, plafonner par groupe, ménager l'élève animateur. Aucune donnée de `library.json` n'est modifiée par cette étape.
- **Affichage** : pastille ★ / ★★ / ★★★ sur chaque fiche de la bibliothèque, étoiles dans l'étiquette des cartes de séance et dans la liste « ajouter un exercice ». Nouveau filtre « Niveau » à côté de « Objectif » dans la bibliothèque.
- **Difficulté progressive** (générateur et remplacement) : préférence par étape, jamais bloquante : mise en énergie et connexion en ★ ou ★★, exploration en ★★, improvisation et scène finale en ★★ ou ★★★. Si aucun jeu ne convient à l'étape, la règle est relâchée.
- **Plafond par groupe** : Club collège et Copains jusqu'à ★★, Association jusqu'à ★★★. Il s'applique au générateur, au remplacement, au tirage rapide de l'Accueil, à « Exercice aléatoire » et au mode soirée. Le plafond est relâché seulement si moins de 5 jeux restent pour une séance (ou aucun pour un tirage). Le plafond s'affiche sous le choix du groupe (« Jeux jusqu’à ★★ »).
- **Élève animateur** : si le jeu en cours dépasse ★, la vue scène l'indique (« Jeu ★★ : plus délicat à mener. Pour un élève animateur, privilégie les jeux ★. »). Le jeu n'est pas remplacé automatiquement.
- Mode soirée : les créations IMPRO LAB restent proposées (D11) dans la limite du niveau du groupe. 3-6 et 3-7 étant ★★★, elles sortent du tirage pour les Copains et le Club collège, et restent pour l’Association. Le test du mode soirée vérifie maintenant cette règle.
- Tests : trois nouveaux tests dans `tests/features.spec.cjs` (étoiles et filtre ; plafond Club collège et Association ; signal en élève animateur).

### D18. Étiquettes d'usage tirées des commentaires de revue
- Demande d'Alexis (7 novembre 2026, « fait tout sans me poser de questions ») : transformer ses commentaires de revue en étiquettes utiles à l'appli. Les libellés reprennent ses propres mots ; aucune règle n'est reformulée.
- `library.json` : nouveau champ `usages` (tableau) sur 28 fiches. Seul ce champ est ajouté ; l'intégrité a listé exactement 28 écarts « champ usages : AJOUTÉ » avant régénération.
  - spectacle : 1-31, 1-32, 1-36, 1-44 · avant un spectacle : 1-25, 1-37
  - chauffe : 1-48, 2-18, 2-26 · début de séance : 2-13
  - cohésion : 1-25, 1-49 · apprentissage des prénoms : 1-8, 2-36
  - beaucoup de comédiens : 1-63, 2-2, 2-10, 2-11, 2-12, 3-3 · tout le monde joue : 1-57, 1-60, 3-4
  - entrée en scène : 1-52, 1-53, 3-7 (fiche validée : seul `usages` est ajouté) · jump and justify : 3-3, 3-4
  - lâcher-prise : 1-55 · spontanéité : 2-4 · en binômes : 2-3
- Commentaires non transformés en étiquettes (ce sont des remarques sur la règle, à traiter avec le lot 5) : 1-30, 1-59, 1-61, 2-1, 2-9, 2-14, 2-17, 2-22, 2-24, 2-25, 2-28, 2-30, 2-31, 2-33.
- Appli : « Usages : … » sur la fiche, filtre « Usage » dans la bibliothèque, et dans Spectacle un encadré « Jeux repérés pour le spectacle » (étiquettes spectacle et avant un spectacle) avec un bouton « ＋ Numéro » qui ajoute le jeu à l'ordre de passage, avec la durée de sa fiche.
- Non fait, à décider : se servir de « chauffe » ou « apprentissage des prénoms » dans le générateur (par exemple pour la première séance d'un groupe).
- Cache : `library.json?v=20261107-usages`, service worker `v47-usages`.

### D19. Plus aucune mention des adaptations web dans l'appli
- Demande d'Alexis (7 novembre 2026) : « enlève les adaptations web ».
- Bibliothèque : la phrase « Les notes personnelles restent distinctes des adaptations issues du web. » est retirée ; « Une règle incomplète n’est pas une règle validée. » reste.
- Fiche : la mention « Adaptation pédagogique issue d’une source externe » est retirée du code (plus aucune fiche ne l'utilisait).
- `library.json`, section `conservation` : « Les 105 notes originales sont préservées ; les exercices externes sont des reformulations attribuées et séparées. » devient « Les notes originales sont préservées dans chaque fiche (champ texte_original). ». Seule cette section change ; référence d'intégrité régénérée.
- Non modifié, signalé : `LICENSE` et le tableau des droits du `README.md` citent encore les fiches `recherche_web` (texte juridique, à revoir par Alexis) ; `regles_pedagogiques` garde ses liens vers theatrefolk.com.
- Cache : `library.json?v=20261107-sans-web`, service worker `v48-sans-web`.

### D20. Lot 5 : les commentaires de revue entrent dans les règles, doublons jamais dans la même séance
- Demande d'Alexis (7 novembre 2026) : reprendre ses commentaires de revue tels quels ; doublons « on garde les deux mais ils ne peuvent pas tomber en même temps dans une séance » ; 2-32 « le second est le second partenaire du binôme ».
- Phrases ajoutées en fin de règle (mots d'Alexis, seules corrections : orthographe et apostrophes) : 1-30, 2-1, 2-9, 2-22.
- Remplacements : 2-24 (variante du 4ème comédien), 2-28 (variante des trois tours de « tous les jours »), 2-33 (définition de « colorer » une relation, aussi dans la consigne courte), 2-30 (« Pour aller plus loin, » devant la suite).
- 2-32 : la règle passe de « deux binômes » à un binôme dont les deux partenaires alternent ; consignes et variantes de l'assistant alignées. La note originale ne change pas.
- Nouveau champ `jamais_avec` (identifiants, réciproque) : 2-25 / 1-14, 2-17 / 1-58, 2-14 / 1-56. Le générateur, le remplacement d'un exercice et le mode soirée n'associent jamais deux jumeaux. L'ajout manuel reste libre (choix délibéré du coach).
- Non modifiés : 1-61 et 2-31 (gardés tels quels), 1-59, les fiches validées 3-6, 3-7, 1-43. Le texte du principe « Take et give le focus » attend toujours Alexis.
- Cache : `library.json?v=20261107-regles-commentaires`, service worker `v49-regles-commentaires`. Référence d'intégrité régénérée après vérification des 19 écarts attendus.

### D21. Texte du principe « Take et give le focus »
- Texte d'Alexis (7 novembre 2026), placé tel quel dans `detail` (seuls changements : guillemets et apostrophes typographiques). Seule la section `principes_improvisation` change ; référence d'intégrité régénérée.

### D22. Licence et README alignés sur la bibliothèque sans fiches web
- Demande d'Alexis (7 novembre 2026) : « modifie aussi license et readme pour que ça colle ».
- `LICENSE`, section 2 : la licence CC BY-NC-ND 4.0 couvre toutes les fiches d'exercices (il n'en reste que d'origine `notes_personnelles` ou `creation_improlab`). Section 3 : la mention des fiches `recherche_web` est remplacée par la section `regles_pedagogiques`, seul contenu de `library.json` qui renvoie encore à une source extérieure (theatrefolk.com).
- `README.md` : tableau des droits aligné sur ces deux points.
- Inchangé : périmètre des droits (code, identité visuelle, principes-impro.json, cahier de coach, Canva). Les principes de `principes_improvisation` (notes d'Alexis) restent sous « tous droits réservés » faute de mention ; les passer en CC BY-NC-ND est une décision à prendre par Alexis.

## 2026-11-07 (soir) — Lots 1, 2 et 3 en autonomie

### D23. Lot 1 : sauvegarde, tutoriel, README, barre de navigation
- **Rappel de sauvegarde** : bandeau en tête de l’Accueil quand il y a des données à protéger (historique, effectifs, présences, spectacle, match, fil rouge, badges, jeux écartés) et aucune sauvegarde depuis 7 jours. Bouton « Sauvegarder maintenant ». La carte Sauvegarde affiche la date de la dernière sauvegarde.
- La date est rangée dans `improlab-backup-last`, hors des clés `impro-` : elle ne fait pas partie de la sauvegarde. Une restauration reprend la date de la sauvegarde restaurée.
- `navigator.storage.persist()` est demandé au démarrage, sans message. Installée sur l’écran d’accueil, l’appli échappe déjà à l’effacement des 7 jours de Safari ; ouverte dans Safari, non. Le rappel couvre les deux cas.
- **Tutoriel d’accueil** : la proposition `proposal/tutorial-persistence` est reprise (mémoire `improlab-welcome-seen` aussi dans `localStorage`). Raison : sur iPhone, chaque lancement de l’appli installée rouvrait l’écran d’accueil, soit un toucher de plus à chaque séance. L’Accueil garde les mêmes raccourcis. Les tests qui rouvrent le tutoriel effacent les deux mémoires.
- **Barre de navigation** : mesurée à 56 px de haut sur iPhone 13 (664 px utiles), en ligne unique et collante. Le constat de D13 (« un quart de l’écran ») datait d’avant la navigation compacte. Pas de masquage au défilement : le gain serait faible et la navigation deviendrait moins prévisible en séance.

### D24. Lot 2 : en séance
- **Prénoms et chauffe dans le générateur** : pour la première séance d’un groupe (aucune séance enregistrée pour lui), un jeu étiqueté « apprentissage des prénoms » est placé à l’étape 1 (1-8) ou 2 (2-36), sauf s’il vient d’être proposé : la rotation reste prioritaire (le test « rotation équitable » l’exige). Les jeux étiquetés « chauffe » ou « début de séance » peuvent ouvrir la séance même hors Énergie, Lâcher-prise ou Amusement (2-18, catégorie Corps). Le test d’ouverture accepte désormais ces étiquettes.
- **Équipes à partir des présents** : déjà en place (Groupes et Régie, en évitant de reformer les mêmes paires). Rien ajouté ; la proposition était redondante.
- **Avis pris en Régie** : 👍 / 👎 et « Note rapide » dans « Exercice en cours », 👍 / 👎 dans le plein écran (pas en mode élève animateur). Mémoire `impro-live-notes-v1`. À l’enregistrement de la séance, les avis vont dans le carnet de bord (même effet sur le générateur que les boutons de l’Historique) et les notes dans un nouveau champ « Notes prises pendant la séance ». La mémoire est vidée après l’enregistrement et à chaque nouvelle génération.
- **Signal de fin** : trois bips plus forts à l’échéance (au lieu d’un bip court et faible), bip d’avertissement 1 minute avant pour les durées de 3 minutes et plus (case à décocher), contour du chrono qui pulse (fixe si l’utilisateur refuse les animations), écran maintenu allumé pendant que le chrono tourne, vibration là où le navigateur la permet (pas sur iPhone). Limite connue : iPhone verrouillé, aucun son n’est garanti ; la mention existante reste.

### D25. Lot 3 : suivi des groupes
- **Trame du fil rouge** : non modifiée. Elle attend toujours la validation d’Alexis (D13).
- **Séance en cours par groupe** : `impro-last-plan` et `impro-live-notes-v1` rejoignent les clés rangées au changement de groupe. Changer de groupe ne remplace plus la séance préparée d’un autre. La séance existante reste au groupe actif au moment de la mise à jour.
- **Noms de groupes** : bouton « ✏️ Renommer ce groupe » dans Préparer. Noms dans `impro-group-names-v1` ; les identifiants (`college`, `copains`, `asso`) ne changent pas. Les séances enregistrées portent aussi `groupeId` ; les anciennes sont retrouvées par leur nom d’origine ou le nom personnalisé. Fil rouge, avis et jeux écartés passent par l’identifiant. Un nom déjà pris par un autre groupe est refusé ; un nom vide rend le nom d’origine.
- **Exercice aléatoire** : sélecteur de groupe en tête, synchronisé avec Préparer. Correctif au passage : le tirage ignorait les jeux écartés pour le groupe ; il les exclut maintenant, comme le générateur.
- **Bilan du trimestre** (Historique → « 📊 Bilan du trimestre ») : par groupe et par trimestre de l’année scolaire en cours (septembre à août) : séances, priorités travaillées, jeux les plus joués, 👍 / 👎 avec jeux préférés et à revoir, présences par joueur, badges, trois points « à retravailler ». Bouton « Copier le bilan ».

### D26. Cache
- `styles.css?v=7`, service worker `v50-lots-1-2-3`. `library.json` inchangé.

### D27. Google Sheet « IMPRO LAB — Revue des catégories et des filtres »
- Même présentation que la revue des fiches : une ligne par fiche, colonnes de contexte en gris, listes déroulantes, cases modifiées en vert (comparaison avec l’onglet « Valeurs d’origine »).
- Champs existants à corriger si besoin : catégorie principale, catégories secondaires, usages.
- Filtres demandés : contact physique, élimination, jeu engagé, plus compétition. Contact, élimination et compétition sont pré-remplis d’après le texte des règles ; les 14 cases les moins sûres sont en jaune. Jeu engagé est vide, avec une définition à corriger.
- Colonnes proposées : format de jeu, moment de la séance, espace, volume sonore, matériel, élève animateur possible, durée réelle, effectif min et max. Constat : 104 fiches sur 105 ont une durée de 8 min et 103 un effectif « à évaluer » : ce sont des valeurs par défaut.
- Onglet « Catégories » : nombre de fiches par catégorie (formules) et remarques. Désaccord principal : Amusement (1 fiche principale, 55 en secondaire) et Lâcher-prise (1 fiche principale) ne fonctionnent pas comme des catégories ; proposition de les fusionner ou de les garder en secondaire seulement. Émotions n’apparaît en secondaire sur aucune fiche.
- Rien n’est reporté dans `library.json` avant le retour d’Alexis sur la feuille.

### D28. Phase autonome du 8 novembre 2026 : tirage, échauffement, Régie, fiche élève, mes notes, soirée
Demande d’Alexis (8 novembre 2026, réponses aux questions préalables) ; branche `amelioration/phase-autonome-nov` depuis `amelioration/lots-1-2-3`.
- **Tirage de l’Accueil repliable** : le résultat de « Tirer un exercice » s’ouvre déplié dans un menu ; un toucher sur son titre (« ▾ Replier ») le referme, un nouveau tirage le rouvre.
- **Jeu joué seul en Régie** (`liveFree`) : l’échauffement express, le mode soirée, le tirage aléatoire envoyé en Régie et le match d’impro posent un jeu en mode impro libre qui **reste affiché** quand on remet le chrono à zéro. Cause du bug signalé : le bouton ↺ réinitialisait la Régie et réécrivait « Impro libre » à la place du jeu. Choisir « Séance préparée » puis « Impro libre » dans le menu Mode efface ce jeu.
- **Bouton 🔄 de l’échauffement** : tire un autre jeu d’échauffement, jamais le même que celui en cours, en évitant les 15 derniers jeux tirés (l’échauffement n’enregistrait pas ses tirages : il pouvait retomber sur le même jeu). Présent dans le plein écran et sous le chrono. ↺ remet seulement le chrono à zéro.
- **Exercice aléatoire → Régie** : le bouton devient « ✓ Jouer en Régie (la séance n’est pas modifiée) ». Le jeu est joué seul (« Exercice tiré au hasard · hors séance ») ; il n’est plus ajouté à la séance préparée. La durée vient de la fiche (5 min par défaut).
- **Mode soirée** : sous le chrono, le titre et la consigne courte du jeu, puis un menu « 📖 Consigne et explication complète » : règle complète, plus facile, plus difficile, variante, points de vigilance, objectif du prof. Bouton « 🔄 Autre jeu » (= jeu suivant). La page se place sur le chrono.
- **Fiche élève** : toute la séance sur **une page A4** : en tête la date, l’objectif de la séance et le fil conducteur ; un encadré par exercice (numéro, titre, consigne courte), deux par ligne. La taille du texte se règle seule (5 paliers) : vérifié en PDF de 3 à 16 exercices, les plus longs de la bibliothèque, toujours une page. Cause des fiches « mal faites » : une règle d’impression générale forçait l’affichage de la bibliothèque (`#jeux{display:block!important}`), qui s’imprimait derrière les fiches (80 pages) ; les en-têtes et les marges des encadrés étaient aussi écrasés par les règles générales de `header` et `section`.
- **📝 Mes notes** : nouveau menu sur chaque exercice (bibliothèque, séance, Régie, tirage) : la note d’origine d’Alexis (`texte_original`, lecture seule) puis une zone « Mes notes perso » enregistrée sur l’appareil par identifiant de fiche (`impro-my-notes-v1`), comprise dans la sauvegarde complète.
- Cache : `styles.css?v=8`, service worker `v51-phase-nov`.
- Tests : `tests/phase-nov.spec.cjs` (6 tests) ; test du tirage aléatoire de `app.spec.cjs` adapté (la séance ne change plus).

### D29. Fiches animateur refaites d’après la revue des fiches (Google Sheet « IMPRO LAB — Revue des fiches (niveau et règle) »)
- Constat : la colonne « Règle » de la feuille contient les règles réécrites par Alexis le 7 novembre (avant 16 h 34). D16 n’avait reporté que le niveau, et le lot 5 (D20) n’avait repris que les commentaires : **53 fiches** avaient encore l’ancienne règle. Accord d’Alexis du 8 novembre : « Oui, reporter tout ».
- Pour chaque fiche : nouvelle règle (`regle_clarifiee`) ; fiche animateur réécrite pour suivre la règle : consigne courte (et la consigne de l’accompagnement quand elle lui était identique), et, quand elles contredisaient la nouvelle règle, variante, « plus facile », « plus difficile » ou validation du coach. `texte_original` n’est jamais touché.
- Corrections apportées au texte d’Alexis : orthographe et typographie seulement (accents, apostrophes, guillemets, « tous le groupe » → « tout le groupe », « etr commence son impro avec au volant » → « et commence son impro au volant », « Sure une faute » → « Sur une faute », « moiuvement », « binome crée » → « binôme ainsi créé », parenthèse non fermée de 1-3, « citées dans sont » → « sont », « 4ème » → « quatrième » en 1-43 et 2-24, « A "deux" personnages » → « À « deux » personnages »).
- Fusions avec le lot 5 (les deux viennent d’Alexis) : 1-30, 2-1, 2-9, 2-22 gardent la phrase de commentaire en fin de règle ; 2-24 garde la nouvelle règle (le quatrième joue le second personnage) puis « Autre possibilité » ; 2-28 ajoute « Depuis ce jour… » et garde la variante. 2-30 et 2-33 : la feuille et la bibliothèque ne diffèrent que par le commentaire déjà intégré, rien à changer. **2-32 n’est pas modifiée** : la feuille dit « deux binômes », mais Alexis a décidé ensuite (D20) « un binôme, le second est le second partenaire ».
- 3-4 et 3-5 : Alexis a déplacé la liste de contraintes de 3-5 vers 3-4 ; 3-5 garde seulement le discours, le « euh » répété et le thème choisi par le MC. Variantes et validation du coach de 3-5 alignées (plus de contraintes). 3-4 garde « Le dispositif permet à tous les participants de passer ».
- 2-34 et 2-36 : la validation du coach suit la règle (le MC impose les contraintes ; voisin de **droite**).
- Fiches validées : 1-43 « Bananes » change seulement par la précision d’Alexis (« demande au quatrième ») ; 3-6 et 3-7 ne changent pas.
- **Titres renommés** par Alexis : 1-5 « Le zombie », 1-38 « Le jeu des listes », 2-29 « Le super mime ». Les données gardées sur l’iPhone (favoris, historique, séances, jeux écartés…) sont migrées vers le nouveau titre à chaque ouverture (`TITLE_RENAMES`). Les autres écarts de titre de la feuille ne sont que des espaces en fin de titre : ignorés.
- 1-61 et 2-31 (« à améliorer », règle oubliée par Alexis) : gardées telles quelles.
- Intégrité : 160 écarts listés, tous sur `titre`, `regle_clarifiee`, `conseils_animation`, `accompagnement_pedagogique` ou `validation_coach` des 53 fiches ; référence régénérée. Cache : `library.json?v=20261108-revue-fiches-regles`, service worker `v52-phase-nov-fiches` (corrige aussi l’URL d’enregistrement du service worker, oubliée au commit précédent : `check.cjs` échouait sur `v51`).

### D30. Revue des catégories et des filtres : ce qui est reporté
- Lecture du Google Sheet le 8 novembre 2026 (onglets Revue, Catégories, Légende, Valeurs d’origine). Accord d’Alexis : « Revue des catégories » à reporter après les sept demandes.
- **Dans le générateur** : toutes les fiches à « Oui » (demande d’Alexis rappelée dans la Légende). Les 12 fiches qui étaient hors générateur y entrent : 1-4, 1-7, 1-13, 1-28, 1-58, 2-5, 2-13, 2-16, 2-17, 2-24, 2-25, 2-26. Les jumeaux (`jamais_avec`) restent séparés.
- **Contact physique** : nouveau champ `contact_physique` (« aucun » ou « léger » ; aucun « fort »), placé après `effectif_conseille`. Contact léger : 1-5, 1-15, 1-49, 2-11, 2-26, 2-31. Bibliothèque : filtre « Contact » (Tous, Sans contact, Contact léger) et pastille « 🤝 Contact léger » sur la fiche. Le générateur ne filtre pas encore sur ce champ (pas de décision d’Alexis).
- **Non reporté, en attente d’Alexis** : catégories principales et secondaires et usages (aucune case changée par rapport aux valeurs d’origine) ; onglet Catégories (colonnes Décision, Nouveau nom, Commentaire vides : rien n’est fusionné ni renommé) ; colonnes proposées (format de jeu, moment de la séance, élève animateur possible, durée réelle, effectif min) restées vides. Les filtres élimination, jeu engagé et compétition annoncés en D27 ne figurent pas dans cette version de la feuille.
- Intégrité : 117 écarts (12 `eligible_generateur`, 105 ajouts `contact_physique`), référence régénérée. Cache : `library.json?v=20261108-categories-contact`, service worker `v53-categories-contact`. Scripts de report conservés dans `tools/`.

### D31. Finitions après audit iPhone SE et iPhone 13 (WebKit)
- Audit des écrans touchés (tirage de l’Accueil, Régie en mode soirée, échauffement en plein écran, bibliothèque avec « Mes notes » ouvert) : aucun débordement horizontal, aucune erreur JavaScript.
- Corrigé : l’en-tête « 📝 Mes notes » de la bibliothèque mesurait 22 px de haut → 44 px.
- Corrigé : le bandeau sous le chrono était sombre alors que la Régie est en thème clair ; il reprend les couleurs des autres panneaux (fond papier, texte encre, titre en Georgia). `styles.css?v=9`.

### D32. Pistes improwiki : ce qui entre dans l’appli (9 novembre 2026)
- Accord d’Alexis du 9 novembre pour les lots A à F, y compris les ajouts dans `library.json`. Aucun texte d’improwiki n’est repris (licence CC BY-SA incompatible avec BY-NC-ND, et leur robots.txt interdit les robots d’IA) : tout est rédigé pour IMPRO LAB ; seuls des liens « Pour aller plus loin » renvoient vers leurs pages. Le site n’a pas été relu pour ce lot.
- **A. Suggestion du public** (Régie, dans « Tirages d’impro ») : un bouton affiche la question qu’on aurait posée à la salle et une réponse tirée des listes (lieu, métier, activité, relation, émotion, genre, mot, personnage, thème), sans deux fois la même catégorie de suite. Indépendant des cases cochées.
  - **Refaite le 12 novembre 2026 à la demande d’Alexis** : la suggestion vient de la salle, pas de l’appli. L’appli propose la question à poser (🔄 pour en changer, jamais deux fois la même de suite) ; Alexis tape ce que le public a dit dans « Ce que le public a dit » ; le mot s’affiche en grand sous le chrono et en plein écran, et une note « Suggestion du public : question → réponse » part dans le carnet de bord. « 🎲 Tirer à la place du public » reste en secours (marqué « tiré par l’appli »). L’affichage disparaît quand on passe à un autre exercice ou avec « Effacer ».
- **C. Listes** : nouvelles catégories « Métier » (40) et « Activité » (40) ; « Lieu » et « Émotion » passent de 40 à 50. Les listes de tirage sont dans `index.html` (`DRAW_DEFAULTS`), pas dans `library.json`. « Relation » existait déjà (40) : inchangée. Les compléments sont ajoutés une seule fois aux listes déjà enregistrées sur l’appareil (clé `impro-draw-additions-v1`) ; une proposition retirée ensuite ne revient pas.
- **D. Repères de genre** : nouvelle catégorie de tirage « Genre » (les 22 genres du cahier de coach + 10 : Policier, Comédie musicale, Cape et d’épée, Film catastrophe, Téléréalité, Feuilleton sentimental, Film d’espionnage, Dessin animé, Film muet, Péplum). Quand un genre sort, trois repères s’affichent : décor, personnages, façon de jouer (rythme, corps, voix pour les genres musicaux). Un genre ajouté à la main n’a pas de repères.
- **Choix à confirmer** : Genre, Métier et Activité sont décochées au départ, pour que « Tout tirer » et le plein écran « de main en main » restent à 8 contraintes. Elles se cochent dans la liste.
- **B. « Aussi appelé »** : nouveau champ `aussi_appele` (liste) placé après `titre` sur 29 fiches. La recherche de la bibliothèque trouve le jeu par ces noms et la fiche les affiche. Six équivalences viennent de la visite d’improwiki (1-1, 1-17, 1-33, 1-44, 1-63, 3-3/3-4) ; les 22 autres sont des noms courants proposés par l’assistant, **à vérifier par Alexis** : 1-2, 1-4, 1-6, 1-8, 1-21, 1-25, 1-27, 1-28, 1-29, 1-30, 1-38, 1-39, 1-40, 1-48, 1-58, 2-6, 2-10, 2-12, 2-17, 2-26, 2-28, 3-1. Aucun autre champ de fiche n’est touché ; 1-43, 3-6 et 3-7 sont intactes.
  - **Ajout du 12 novembre 2026** : la ligne « Aussi appelé » apparaît aussi au tirage de l’Accueil, dans l’onglet Exercice aléatoire, sous le titre de la Régie et en plein écran.
- **E. Trames de spectacle** (`SHOW_TEMPLATES` dans `index.html`) : La Ronde, Le Meurtre, Feu de camp, Vie en ville, Le voyage du héros. Le bouton ajoute les numéros à la suite de l’ordre de passage (rien n’est effacé) et donne son nom au spectacle s’il n’a pas de titre. Les découpages et durées sont des propositions de l’assistant, à ajuster.
- **F. Principes** : six fiches ajoutées dans `principes-impro.json` (ids 8 à 13 : statut, blocage, routines, arc narratif, tension, présence), statut « proposé par l’assistant, à relire », affichées avec cette mention et sans « Formulation originale ». Elles sont rangées par niveau avec les sept principes validés, qui ne changent pas.
- Intégrité : 29 écarts, tous « champ aussi_appele ajouté » ; référence régénérée. Cache : service worker `v54-pistes-improwiki`.
- **Toujours en attente d’Alexis** : les fiches de jeux (prénoms, émotions, statut, voix) tant que « Ta version » est vide dans le Sheet « Pistes improwiki » ; les colonnes K à P du Sheet « Revue des catégories » ; les décisions D30 (catégories, filtre contact dans le générateur).

### D33. Titres du public : questions cochées, deux mots mélangés, Mes titres (12 novembre 2026)
- Demande d’Alexis (12 novembre) : « garde le bouton pour que l’appli aide à poser une question », des cases pour choisir ce qu’on demande, et mélanger deux mots du public en un titre (« étoilé » + « chalutier » → « Le chalutier étoilé », « Une étoile dans le chalutier »), y compris pour deux films ou deux chansons. Plan validé, puis « fais les 4 lots direct ».
- **Lot 1. Questions cochées** : onze questions, dans « Questions possibles ». Cochées au départ, comme demandé : Lieu, Relation, Mot. En option : Métier, Objet, Personnage, Émotion, Genre, Époque, Titre de film, Titre de chanson. 🔄 ne propose que les questions cochées ; il en reste toujours une. Le choix est gardé sur l’appareil (`impro-audience-cats-v1`). « Activité » et « Thème » ne sont plus proposés comme questions (ils restent dans les Tirages d’impro).
- Nouvelles listes de secours, propres à la suggestion du public (`AUDIENCE_LISTS` dans `index.html`, pas dans les Tirages d’impro) : Objet (40, sans doublon avec la liste Mot), Époque (24), Titre de film (40), Titre de chanson (40). Les titres d’œuvres connues sont cités tels quels ; aucune autre donnée n’est reprise. **À relire par Alexis.**
- **Lot 2. Deux mots → titres** : après le 1er mot, un champ « Un 2e mot du public » et « 🔀 Mélanger ». Le 2e mot vient toujours du public : pas de tirage pour lui. L’appli propose quatre titres (le premier est choisi d’office), 🔄 « Autres titres », ✏️ « Corriger », ↩ « Autre 2e mot ». Le titre retenu s’affiche sous le chrono et en plein écran ; une seule note par suggestion dans le carnet de bord, mise à jour avec le titre final.
- Fabrication sans internet : une vingtaine de modèles (« Le A du B », « Un A dans le B », « Le A qui voulait être un B », « Mon A, mon B et moi », « Quand le A rencontre le B », « Un A sous les B », « Le A étoilé »…). L’appli devine seule le genre (le / la), l’élision (l’), le pluriel, le h aspiré (« le hibou »), l’accord de l’adjectif, et retrouve le nom d’un adjectif courant (étoilé → étoile) quand ce nom est connu. Un mot qui commence par une majuscule et n’est pas dans les listes est traité comme un nom propre (pas d’article). Une IA en ligne a été écartée : il faudrait internet, une clé payante et un serveur. Les erreurs restantes se corrigent avec ✏️.
- **Lot 3. Films et chansons** : quand la question cochée était « Un titre de film / de chanson ? », les modèles changent : « Titanic 2 : le retour des Bronzés », « Quand Les Bronzés rencontrent Titanic », « Titanic, version Les Bronzés », « « Titanic » à la manière de « Les Bronzés » », et pour les chansons « (feat. …) », « … sur l’air de … », « Le remix : … ».
- **Lot 4.** Bouton « 🏒 Thème du match » : le titre (ou le mot) devient le thème de l’impro en cours du match (une catégorie est tirée s’il n’y en a pas). Dans le Spectacle, le numéro « Accueil et suggestion du public » des trames affiche « 🙋 Ouvrir la suggestion du public ». **Mes titres** : ☆ garde un titre sur l’appareil (`impro-my-titles-v1`, jusqu’à 200), « 🎲 Tirer un de mes titres » le ressort sans public, ✕ le retire. Mes titres et les questions cochées partent dans la sauvegarde complète.

### D34. La question se coche, et plus de replis (12 novembre 2026)
- Demande d’Alexis : « je veux pouvoir cocher un lieu, une relation ou un mot comme question à poser, les autres apparaissent en repli, enlève le bouton qui rafraîchit les questions », et « plus de choses repliables dans l’appli, surtout en bas de la Régie ».
- **Question à poser** : remplace le système de D33 (cases multiples + 🔄). Un seul choix à la fois (boutons radio) : Lieu, Relation, Mot visibles ; les huit autres dans « Autres questions », replié (rouvert d’office si la question choisie s’y trouve). Le bouton 🔄 est retiré. La question choisie est gardée sur l’appareil (`impro-audience-q-v1`, dans la sauvegarde complète à la place de `impro-audience-cats-v1`).
- **Régie** : « Suggestion du public » devient un repli (ouvert au départ) ; les 11 catégories de « Tirages d’impro » passent dans « Catégories à tirer · N cochées » (fermé) ; dans le Match, les noms des équipes et la durée rejoignent des replis (« ✏️ Noms des équipes », « ✏️ Durée, catégories et thèmes de l’asso ») — le score et les boutons restent visibles ; la remarque sur le signal sonore passe dans « Réglages du chrono ».
- **Ailleurs** : Accueil, « Sauvegarde de tes données » repliée (le rappel de sauvegarde reste affiché quand il le faut) ; Préparer, « Ajouter un exercice à la main » replié ; Bibliothèque, « Filtres · N actifs » replié (la recherche reste visible) ; Spectacle, « Jeux repérés » et « Trames toutes prêtes » repliés ; Groupes, « Équipes enregistrées » fermé au départ.
- Les nouveaux replis ont la même flèche ▶ / ▼ et une hauteur de 44 px.

### D35. Décisions d’Alexis du 13 novembre 2026, puis fusion de la PR 29
- **Catégories** : ne pas fusionner Amusement et Lâcher-prise (réponse à D29-D31).
- **Générateur de séance** : n’y rien changer ; le filtre « contact physique » reste limité à la bibliothèque.
- **1-61 « Le mouvement se transforme » et 2-31 « Le compte qui change de direction »** : règles toujours à retrouver ; « pour l’instant », sorties de l’appli (bibliothèque, tirages, générateur, ajout manuel) par la liste `APP_HIDDEN_IDS` dans `index.html`. Elles restent intactes dans `library.json` (la référence d’intégrité ne change pas). L’appli affiche donc 103 exercices.
- **Genre, Métier, Activité** : restent décochés au départ.
- **Tirages d’impro** : rien n’est coché au départ. Le réglage déjà enregistré sur un appareil est remis une seule fois à « rien de coché » (`impro-draw-none-v1`), ensuite les choix sont gardés. « Tout tirer » sans case cochée ouvre « Catégories à tirer » et le dit.
- **Fusion** : Alexis demande « fais tout et fusionne » : PR 29 fusionnée dans main après la CI.

### D36. Refonte « écrans légers » après audit (13 novembre 2026)
Demande d’Alexis : audit complet puis refonte, avec pour but des écrans moins chargés (étendre les replis) et un peu de fantaisie dans la présentation. Rapport dans `AUDIT.md`.

- **Deux nouveaux fichiers**, `refonte.css` et `refonte.js`, chargés après `styles.css` et après le script principal. Ils ne touchent ni à `library.json`, ni au générateur de séance, ni aux données enregistrées. Pour revenir en arrière : retirer leurs deux lignes dans `index.html` et dans `sw.js`. C’est un écart au « fichier unique » : `refonte.js` est écrit en clair et commenté. À confirmer ou refuser par Alexis.
- **En-tête** : complet sur l’Accueil, réduit à une ligne ailleurs. Un bouton « Tout replier » y apparaît dès qu’un repli est ouvert sur la page.
- **Navigation** : barre fixe en bas de l’écran, avec un pictogramme par onglet. Mêmes cinq entrées, mêmes libellés ; « Plus » s’ouvre vers le haut. Masquée en plein écran de Régie et de séance.
- **Bibliothèque** : une ligne par jeu (titre, catégorie, niveau, « Aussi appelé »). Toucher le titre déplie la fiche. Trois résultats ou moins : fiches ouvertes d’office. Bouton « Tout déplier ». À l’impression, tout est déplié.
- **Cahier de coach** : chaque liste est repliée, on la déplie au toucher.
- **Préparer** : Enregistrer, Partager, Fiches élèves, Exporter et Effacer sont masqués tant que la séance est vide (Importer reste). Les deux textes d’aide passent derrière un bouton « ? ».
- **Fantaisie** : un masque de théâtre arrive et éclate en deux secondes à l’ouverture (sans bloquer les touchers) ; confettis quand le chrono de la Régie arrive à zéro en décompte ; « Défi du jour » sur l’Accueil, tiré des listes Lieu, Personnage, Émotion et Contrainte d’Alexis, identique toute la journée ; le logo touché cinq fois fait pleuvoir des masques et affiche une des citations de l’en-tête ; petit rebond sur le résultat d’un tirage ; les pages apparaissent en fondu (le glissement prévu au départ faussait une mesure de hauteur dans la CI, retiré). Tout est coupé quand l’iPhone est réglé sur « Réduire les animations ».
- **Non retenu** : la mémoire des replis d’un lancement à l’autre (elle rechargerait les écrans, contraire au but) ; le thème sombre (demande d’abord de nettoyer `styles.css`, voir option B de l’audit).

**Réponses d’Alexis du 13 novembre 2026 sur D36 :**
- Remettre `refonte.css` et `refonte.js` dans le fichier unique : possible plus tard, pas maintenant. À reproposer.
- Tri des effets de fantaisie (ce qui reste, ce qui part) : plus tard, après ses essais sur iPhone.
- Pas de réécriture complète de l’appli (option C de `AUDIT.md` écartée).

**Deuxième passe du 13 novembre 2026 (réponses d’Alexis : « alléger encore » et « encore quelques idées ») :**
- Le texte d’introduction de chaque page (Préparer, Bibliothèque, Groupes, Spectacle, Principes, Cahier de coach) passe derrière un bouton « ? ». Rien n’est supprimé.
- Exercice aléatoire : les six curseurs sont repliés au départ, le bouton « Tirer un exercice » remonte sous le choix du groupe.
- Groupes : « Ajouter des joueurs » devient un repli, ouvert tant que l’effectif est vide, refermé quand on revient sur l’onglet avec un effectif déjà saisi.
- Trois effets de plus, à trier avec les autres : un rideau qui s’ouvre à l’entrée en plein écran (séance et Régie), les titres qui défilent une demi-seconde au tirage de l’Accueil (le vrai titre est déjà en place dessous), un tampon « Séance enregistrée ».
- Spectacle et Régie : pas touchés dans cette passe. Le Spectacle demanderait de replier les champs titre, date et effectif ; à voir avec Alexis.

## 2026-11-18 — Audit et refonte, chantier 1 « La séance d’abord »

### D37. Chantier 1 : chrono en haut, fiche courte partout, tirage animé, Accueil refait, fiabilité
Audit du 18 novembre 2026 (iPhone SE et 13, WebKit), puis choix d’Alexis : option A, puis une partie de B. Réponses : Préparer trop long ; thème sombre automatique et barre en bas (chantier 2) ; plus de tirage sur l’Accueil (doublon avec Exercice aléatoire), garder l’Échauffement express ; animation « où ça roule » dans Exercice aléatoire ; partout une fiche courte (nom, aussi appelé, durée, caractéristiques, étoiles) qu’on déroule ; en Régie, consigne courte visible ; tout se referme quand on change d’écran. Branche `refonte/seance-dabord`.
- **Régie** : chrono et boutons ▶ / ⏮ / ⏭ / ↺ en tête de la Régie, dans un bloc qui reste collé sous la barre de navigation quand on défile (statique en plein écran). Chrono plus grand (62 à 112 px). Ordre des boutons : ▶, ⏮ Avant, ⏭ Suite, ↺. Mesure : bas du bouton ▶ à 324 px sur iPhone SE (au lieu de 1 439 px).
- **En-tête réduit** hors de l’Accueil : logo 28 px, titre seul (slogan et sous-titre masqués). `body[data-tab]` porte l’écran courant ; la hauteur de la barre est gardée dans `--nav-h`.
- **Fiche courte** : `coachDetailsHtml` range schéma, consigne, variante, objectifs, complexification, explication, Mes notes et crédits dans un seul repli « 📖 Voir la fiche complète » (44 px), fermé. En Régie (`consigneVisible`), la consigne courte reste affichée au-dessus du repli. Séance : « Aussi appelé » sous le titre ; une séance enregistrée avant D37 est repliée à l’ouverture (`ficheFold`), et une séance rouverte (rechargement, Historique) retrouve sa fiche dès que la bibliothèque est chargée (avant D37, une séance rechargée perdait ses volets). Les étapes (`data-stage-index`, `data-category`) sont gardées à la réouverture. Le fil conducteur garde sa première phrase ; le reste passe dans « 🧭 Déroulé de la séance ». Boutons d’édition sur deux lignes de quatre (−1 min, durée, +1 min, Remplacer / ↑, ↓, Écarter, ✕). Remplacer un exercice retire aussi l’ancien schéma.
- **Bibliothèque** : fiche courte (catégorie, ⏱ durée de la fiche, étoiles, contact, aussi appelé, favori), 20 fiches affichées puis « Voir plus » par 20 ; toute recherche ou filtre repart de 20 ; mettre en favori garde la liste ouverte. Les autres fiches restent dans la page, cachées : le compte de 103 et la recherche ne changent pas. La durée affichée est `duree_minutes` de la fiche (souvent 8 min par défaut, voir D27).
- **Tout se referme** : chaque changement d’écran ferme les « Voir la fiche complète » ouverts. À l’impression, ils s’ouvrent seuls puis se referment.
- **Exercice aléatoire** : le jeu est choisi d’abord (même calcul), puis les titres défilent environ 1 s comme une machine à sous et s’arrêtent sur le jeu tiré ; « Jouer en Régie » apparaît ensuite. Pas d’animation si l’iPhone réduit les animations. La ligne sous le titre ajoute la durée et les étoiles.
- **Accueil** : « Tirer un exercice » retiré (`quickDraw` supprimé). À la place, « Ta prochaine séance » : groupe, nombre d’exercices, minutes, premier jeu, date de la dernière séance du groupe, « 🎬 Lancer en Régie » (repasse la Régie en séance préparée) et « 🗓 Revoir la séance » ; sans séance, « 🗓 Préparer la séance ». Échauffement express inchangé. « 💡 Principe du jour » : un des 7 principes validés, qui change chaque jour, jamais un principe « à relire ». L’ancien bloc « Reprendre la séance en cours » est remplacé.
- **Hors ligne** : le service worker sert d’abord sa copie (ouverture immédiate même avec un réseau faible) et met à jour en arrière-plan. Une nouvelle version arrive donc à la deuxième ouverture après sa mise en ligne. La page s’ouvre toujours depuis l’`index.html` gardé avec la version du service worker, pour ne pas mélanger une page neuve et un style ancien.
- **Enregistrement refusé** : si l’appareil refuse d’enregistrer (stockage plein, navigation privée), un bandeau « ⚠️ Pas enregistré » le dit, au plus une fois par minute. Le reste du comportement ne change pas.
- **Restauration** : les données d’avant sont gardées dans `improlab-restore-undo` (hors clés `impro-`, donc hors sauvegarde) ; si l’écriture échoue en route, elles sont remises. Après rechargement, la carte Sauvegarde s’ouvre avec « ↩ Annuler la restauration » et « ✓ Garder la sauvegarde restaurée ».
- **Tests** : nouveau `tests/seance-dabord.spec.cjs` (13 tests). Adaptés : ouverture de « Voir la fiche complète » avant les volets (regression, phase-nov) ; étiquettes lues en `#plan>.card>small` (le « Aussi appelé » contient aussi un `small`) ; ordre chrono / bandeau soirée vérifié dans la page et non à l’écran (le chrono est collant) ; impression qui ouvre les replis ; tirage lu sans animation (`reducedMotion`). Retirés : les deux tests du tirage de l’Accueil. `check.cjs` : schéma dans le repli, Accueil sans tirage rapide, cache qui ignore les paramètres.
- Cache : service worker `v59-seance-dabord`, `styles.css?v=14`. `library.json` inchangé ; générateur de séance inchangé.

### D38. Chantier 2 : barre d’onglets en bas, thème sombre automatique (18 novembre 2026)
Choix d’Alexis à l’audit : barre en bas avec 4 onglets et « Plus », thème sombre qui suit le réglage de l’iPhone. Branche `refonte/navigation-sombre`, partie de `refonte/seance-dabord` (PR 31, pas encore fusionnée) : la PR de ce chantier vise cette branche.
- **Barre en bas** : Accueil, Préparer, Exercice aléatoire, Régie et « Plus », chacun avec une icône (masquée pour les lecteurs d’écran : les noms des onglets ne changent pas). Exercice aléatoire garde sa place parmi les quatre : le tirage a quitté l’Accueil (D37), et la Bibliothèque reste dans « Plus ». La barre est fixée en bas, au-dessus de la barre d’accueil de l’iPhone (`viewport-fit=cover`, `env(safe-area-inset-bottom)`), 63 px de haut, cibles de 52 px. « Plus » s’ouvre vers le haut en grille de deux colonnes (cibles de 48 px), se ferme d’un toucher à côté, et prend la couleur de l’onglet actif quand l’écran ouvert est dans son menu. Le chrono de la Régie se colle désormais en haut de l’écran (`--nav-h` à 0 ; `--nav-bottom` sert au menu et au bandeau « Pas enregistré »). La barre ne s’imprime pas. L’en-tête respecte la zone de l’heure en haut (`safe-area-inset-top`).
- **Thème sombre** : bloc `@media (prefers-color-scheme: dark)` à la fin de `styles.css`. Il redéfinit les variables (`--paper`, `--paper-raised`, `--ink`, `--ink-soft`, `--line`, `--il-surface`…), ajoute `--accent-text` (rose clair) pour les titres et les replis écrits en couleur rideau, garde la couleur rideau en fond des boutons principaux avec texte blanc, et reprend les couleurs écrites en dur (fond dégradé de la page, champs, pastilles, schémas, curseurs, titres en couleur de catégorie). Le thème clair ne change pas. Le plein écran et l’écran d’accueil, déjà sombres, ne changent pas. `theme-color` suit le thème.
- Retouche commune aux deux thèmes : le titre du jeu tiré (Exercice aléatoire) passe à 20 px ; sa couleur de catégorie était à 4,35 de contraste en petit texte.
- **Mesures** (WebKit, SE et 13, tous replis ouverts) : contraste ≥ 4,5 partout en clair et en sombre, sauf les titres des principes, écrits en texte dégradé, que l’outil ne sait pas mesurer (vérifiés sur capture : lisibles). 0 cible < 44 px, aucun débordement, aucune erreur JavaScript.
- **Tests** : nouveau `tests/navigation-sombre.spec.cjs` (6 tests) ; `features.spec.cjs` vérifie aussi que la barre touche le bas de l’écran.
- Cache : service worker `v60-navigation-sombre`, `styles.css?v=15`. `library.json` et générateur de séance inchangés.

### D39. Accueil : sans la séance, avec un défi du jour (18 novembre 2026)
Demande d’Alexis : retirer « Ta prochaine séance » de l’Accueil, garder l’Échauffement express et le Principe du jour, ajouter un Défi du jour créé par l’assistant, puis tout fusionner.
- L’Accueil montre, dans l’ordre : Échauffement express (« 01 / VITE »), Principe du jour, Défi du jour, puis la carte Sauvegarde et le rappel quand il le faut. Le bloc « Ta prochaine séance » et ses boutons (« Lancer en Régie », « Revoir la séance ») disparaissent ; la séance se retrouve dans Préparer et la Régie.
- **Défi du jour** : 60 défis courts (un titre et une consigne d’une ou deux phrases) écrits par l’assistant, **à relire par Alexis**. Ils sont dans `index.html` (`HOME_CHALLENGES`), pas dans `library.json`. Un défi par jour, le même toute la journée, qui change à minuit (`challengeOfDay(jour de l’année + 3)`, en boucle), indépendant du principe du jour (autre liste). Aucune donnée enregistrée sur l’appareil. Une moitié concerne le jeu (écoute, corps, scène), l’autre l’animation (cadre, bilan, rythme de séance).
- Tests : `seance-dabord.spec.cjs` (accueil sans séance, ordre des trois blocs ; défi du jour : 60 défis uniques, un par jour, stable) ; `navigation-sombre.spec.cjs` et `check.cjs` suivent le Principe du jour.
- Cache : service worker `v61-defi-du-jour`, `styles.css?v=16`.

### D40. Fusion avec la PR 30 : mes versions gardées (18 novembre 2026)
Deux refontes se recoupaient : la PR 30 « écrans légers » (D36, déjà dans `main`) et mes chantiers (D37 à D39). Choix d’Alexis : « Garde mes versions ». Numérotation : D36 reste celle de la PR 30 ; mes décisions, écrites avant la fusion sous les numéros D36 à D38, sont devenues D37 à D39.
- **Retiré de `refonte.js` et `refonte.css`** (remplacé par mes versions) : la barre du bas et ses pictogrammes en CSS (remplacés par la barre de D38), l’en-tête réduit et le bouton « Tout replier », la Bibliothèque en cartes repliables et son bouton « Tout déplier » (remplacés par « Voir la fiche complète », D37), le « Défi du jour » tiré des listes de tirage (remplacé par les 60 défis de D39), le tirage de l’Accueil qui défile (le tirage a quitté l’Accueil ; l’animation est celle d’Exercice aléatoire, D37). Le test de la PR 30 correspondant à chacun est retiré ; les mêmes comportements sont testés dans `navigation-sombre.spec.cjs` et `seance-dabord.spec.cjs`.
- **Gardé de la PR 30** (rien de ce qu’Alexis a dit sur le tri des effets n’est modifié : « plus tard, après ses essais sur iPhone ») : cahier de coach replié, actions de séance masquées tant que la séance est vide, aide de page derrière « ? », curseurs d’Exercice aléatoire repliés, ajout de joueurs replié, masque d’ouverture, confettis du chrono, pluie de masques (logo touché cinq fois), rideau au plein écran, tampon « Séance enregistrée », fondu entre pages. `AUDIT.md` aussi.
- **Ajustements** : `refonte.css` reprend les couleurs du thème sombre (`--rf-bordeaux`, `--rf-encre`, ajout de joueurs, « ? », titres du cahier) ; le petit mot du logo se place au-dessus de la barre de 63 px ; la barre du bas est cachée dans les plein écran (Régie, séance). `refonte.css` et `refonte.js` entrent dans le cache hors ligne (déjà fait par la PR 30, repris dans `sw.js`).
- **Index** : `index.html` garde ma version avec les trois ajouts de la PR 30 (`refonte.css?v=5`, `refonte.js?v=4`, enregistrement du service worker). Cache : `v63-fusion-refonte`, `styles.css?v=17` (le `v62` de la PR 30 est dépassé).
- Les effets de fantaisie restent à trier par Alexis après ses essais sur iPhone.

### D41. Tri des effets et des replis de la PR 30 (18 novembre 2026)
Alexis a trié, un par un, ce qui restait de la PR 30 après la fusion de D40.
- **Gardés tels quels** : masque d’ouverture (à chaque ouverture), confettis et battement du chrono à 00:00, rideau au plein écran, tampon « Séance enregistrée », pluie de masques (logo touché cinq fois), fondu entre pages avec retour en haut de page.
- **Replis gardés** : Cahier de coach en listes repliées, curseurs d’Exercice aléatoire repliés, ajout de joueurs replié quand l’effectif existe, boutons Enregistrer / Partager / Fiches élèves / Exporter / Effacer cachés tant que la séance est vide.
- **Retiré** : le bouton « ? » qui cachait le texte d’introduction de chaque page. Les introductions (Préparer, Bibliothèque, Groupes, Spectacle, Principes, Cahier de coach) sont de nouveau affichées. Rien n’était supprimé : le texte était seulement caché.
- Tests : `refonte.spec.cjs` vérifie que le bouton n’existe plus et que les introductions sont visibles. Cache : service worker `v64-tri-effets`, `refonte.css?v=6`, `refonte.js?v=5`.

### D42. Saison 3 : sept exercices et cinq principes des notes d’Alexis (18 novembre 2026)
Alexis a classé ses notes des dernières séances (classeur relu le 18/11, préparé avec Cowork) et a demandé de travailler directement dans `main` (« même si une règle dit le contraire »).
- **Exercices ajoutés** (section « Saison 3 », `notes_personnelles`, statut « clarifié », qualité « clarifiée », sans contact, admissibles au générateur) : 3-8 Cercle des fous (Écoute), 3-9 Action puis réplique (Scène), 3-10 Les cadeaux (Émotions), 3-11 Description factuelle (Écoute), 3-12 Le triangle des Persrudes (Émotions), 3-13 Scène sans P (Scène), 3-14 La piscine du kiff (Cohésion, usage « cercle de clôture »). L’id 3-2 n’est pas réutilisé. `numero_source` : null, comme 3-6 et 3-7.
- **Principes ajoutés** dans `principes_improvisation` de `library.json` (pas dans `principes-impro.json`), avec objectif et catégories secondaires comme « Les balances » : Tout vous touche en bien comme en mal ; Votre meilleur jeu est dans l’autre ; La plus grande des actions peut arriver si elle ne touche pas le personnage ; Jouer l’immaturité ; Le triangle des Persrudes. Ils s’affichent dans « Autres notes personnelles d’improvisation ».
- **Textes d’Alexis recopiés tels quels**, apostrophes droites changées en apostrophes typographiques comme dans le reste de la bibliothèque.
- **Champs qu’Alexis n’a pas remplis** (exigés par `check.cjs`) : consigne courte = la règle clarifiée ; variantes facile et difficile courtes, marquées « Proposition générique de l’assistant, à valider par Alexis » ; points de vigilance et objectifs prof / élèves repris des phrases types déjà utilisées dans la bibliothèque. Durée 8 min quand elle n’était pas donnée (Les cadeaux, Description factuelle, Triangle, Scène sans P, Piscine du kiff).
- **Rien de remplacé** : 3-5 (texte_original court, version longue dans les notes) et 1-40 (« peut accélérer ralentir et se casser ») attendent la décision d’Alexis. Triangle des Persrudes : trois étapes dans l’exercice, quatre dans le principe, laissé tel quel.
- Aucune fiche existante modifiée (diff de `library.json` : uniquement des ajouts) ; référence d’intégrité régénérée (112 fiches). Test `phase-nov` : 105 fiches sans contact au lieu de 98. Nouveau test `saison-3.spec.cjs`. Cache : `library.json?v=20261118-saison-3`, service worker `v65-saison-3`.
