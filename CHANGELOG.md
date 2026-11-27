# Journal des versions — IMPRO LAB

Les changements antérieurs sont décrits dans `DECISIONS.md` (D1 à D47) et `PROGRESS.md`.

## 2026-11-27 — Journal des séances (branche `journal-seances`, non fusionnée)
### Ajouté
- Bouton « 🏁 Clore la séance » sur la séance préparée.
- Écran de clôture : date (aujourd’hui par défaut), groupe et présents à cocher (ou prénoms en saisie libre), exercices joués ou non avec commentaire court, exercices joués hors plan (bibliothèque ou texte libre), commentaire général.
- « 📓 Journal des séances » en tête de Plus → Historique : de la plus récente à la plus ancienne, détail dépliable, Modifier, Supprimer avec confirmation.
- Clé `impro-session-log-v1`, comprise dans « Tout sauvegarder » et « Restaurer une sauvegarde ».
- Fichiers `journal.js`, `journal.css`, tests `tests/journal-seances.spec.cjs`.
### Modifié
- Cache hors ligne `v70-journal-seances` (deux fichiers ajoutés).
