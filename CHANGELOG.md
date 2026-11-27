# Journal des versions — IMPRO LAB

Les changements antérieurs sont décrits dans `DECISIONS.md` (D1 à D47) et `PROGRESS.md`.

## 2026-11-27 — Plans dans la durée réelle (branche `plans-duree-corrections`, non fusionnée)
### Ajouté
- Installation et rangement (5 min) et clôture (3 min), réglables, déduits de la durée choisie.
- Carte « Clôture » toujours en dernier, jamais raccourcie ni supprimée par le générateur.
- Badge « ⏭ À sauter si retard » sur un exercice, déplaçable d’un toucher, imprimé.
- Horaires de chaque carte et alerte « Plan intenable » si le total dépasse la durée.
- Bouton « 🖨 Imprimer le plan ».
- Journal : l’exercice « à sauter » non lancé en Régie arrive en « pas joué ».
### Corrigé
- Déroulé de la séance réécrit d’après les cartes réelles, dans leur ordre, avec leur catégorie ; étiquette des cartes avec la catégorie du jeu.
- Jeux récents sans doublon.
- Titres de la bibliothèque comparés sans espaces finaux (`library.json` inchangé).

## 2026-11-27 — Journal des séances (branche `journal-seances`, non fusionnée)
### Ajouté
- Bouton « 🏁 Clore la séance » sur la séance préparée.
- Écran de clôture : date (aujourd’hui par défaut), groupe et présents à cocher (ou prénoms en saisie libre), exercices joués ou non avec commentaire court, exercices joués hors plan (bibliothèque ou texte libre), commentaire général.
- « 📓 Journal des séances » en tête de Plus → Historique : de la plus récente à la plus ancienne, détail dépliable, Modifier, Supprimer avec confirmation.
- Clé `impro-session-log-v1`, comprise dans « Tout sauvegarder » et « Restaurer une sauvegarde ».
- Fichiers `journal.js`, `journal.css`, tests `tests/journal-seances.spec.cjs`.
### Modifié
- Cache hors ligne `v70-journal-seances` (deux fichiers ajoutés).
