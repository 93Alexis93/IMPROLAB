// Report du Google Sheet « IMPRO LAB — Revue des catégories et des filtres » (lu le 8 novembre 2026).
// - « Dans le générateur » : toutes les fiches à Oui (demande d'Alexis rappelée dans l'onglet Légende) : 12 fiches passent à true.
// - « Contact physique » : nouveau champ contact_physique (« aucun », « léger », « fort »), inséré après effectif_conseille.
// Catégories principales, secondaires et usages : identiques aux « Valeurs d'origine » (aucune modification d'Alexis), rien n'est changé.
const fs = require('fs');
const [file, sheetFile] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(sheetFile, 'utf8')).values.slice(1);
const raw = fs.readFileSync(file, 'utf8');
const lib = JSON.parse(raw);
const by = Object.fromEntries(rows.map(r => [r[0], r]));
let gen = [], contact = {};
lib.exercices = lib.exercices.map(e => {
  const r = by[e.id];
  if (!r) throw new Error('fiche absente du Sheet ' + e.id);
  if (r[4] === 'Oui' && !e.eligible_generateur) gen.push(e.id);
  const c = String(r[9] || 'Aucun').trim().toLowerCase();
  if (!['aucun', 'léger', 'fort'].includes(c)) throw new Error('contact inconnu ' + e.id + ' ' + c);
  contact[c] = (contact[c] || 0) + 1;
  const out = {};
  for (const [k, v] of Object.entries(e)) {
    out[k] = k === 'eligible_generateur' ? (r[4] === 'Oui' ? true : v) : v;
    if (k === 'effectif_conseille') out.contact_physique = c;
  }
  if (!('contact_physique' in out)) out.contact_physique = c;
  return out;
});
const indent = raw.match(/\n( +)"/)[1].length;
fs.writeFileSync(file, JSON.stringify(lib, null, indent) + (raw.endsWith('\n') ? '\n' : ''));
console.log('générateur → true :', gen.join(' '));
console.log('contact :', JSON.stringify(contact));
