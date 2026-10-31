# Identité visuelle IMPRO LAB

Direction : « carnet de coach » — pratique et professionnelle, touche théâtrale mesurée, couleurs vives en accents sur une base sobre.

Les variables prêtes à l'emploi sont dans `design/tokens.css` (fichier non branché sur l'interface : aucun changement visuel tant qu'il n'est pas importé).

## Logos

- `design/logo-nuit.svg` : sur fond bleu nuit.
- `design/logo-papier.svg` : sur fond papier carnet (documents, fiches imprimées).
- `icon.svg` (racine) reste l'icône de l'application, inchangée.

Les logos reprennent la couronne, le dégradé arc-en-ciel et la police du logo existant (Arial Black italique, comme `icon.svg`).

## Palette

| Rôle | Nom | Code |
|---|---|---|
| Fond principal | Nuit de scène | `#111528` |
| Fond profond (écran d'entrée, icône) | Nuit profonde | `#080a17` |
| Cartes | Bleu nuit carte | `#242c4a` |
| Papier / version claire | Papier carnet | `#fff8e7` |
| Titres, bouton actif | Or projecteur | `#ffd16d` |
| Boutons, liens | Menthe | `#72d8d1` |
| Arc-en-ciel | Jaune · Corail · Violet · Bleu · Menthe vive | `#ffd21f` · `#ff526e` · `#d52cff` · `#138bff` · `#39f5c8` |

Règle d'usage : les couleurs arc-en-ciel servent aux accents (logo, halos, bandeaux, pastilles de catégories), pas aux grandes surfaces de texte.

## Typographies

- Titres : Georgia, gras, italique possible.
- Texte : police système (`system-ui`).
- Pas de police chargée depuis un CDN, pour que l'application reste utilisable hors ligne. Dans Canva, la planche d'identité montre « Inter » pour le texte courant : dans l'appli, la police système joue ce rôle.

## Maquettes et supports (Canva)

Créés dans Canva le 31/10/2026, éditables depuis ces liens :

- Planche d'identité (logo, palette, typographies) : https://canva.link/t6xcprrtibtj1ai
- Maquettes d'écrans (accueil, exercice aléatoire, régie, cahier de coach) : https://canva.link/v0augi1wzo8npkj
- Affiche : https://canva.link/jhlc421bxhniea0
- Fiche d'exercice imprimable (A4, exemple : fiche 3-7 « Le banc des solutions ») : https://canva.link/3fvp30hgwmk05dc

Les maquettes sont une direction visuelle, pas une source de vérité : le code du dépôt fait foi.
