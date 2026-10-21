#!/usr/bin/env node
'use strict';
// Intégrité exhaustive de library.json : chaque champ, l'ordre des fiches et les sections hors fiches.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const LIBRARY_PATH = path.join(__dirname, '..', 'library.json');
const BASELINE_PATH = path.join(__dirname, 'library.baseline.json');
const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function snapshot(library) {
  if (!library || !Array.isArray(library.exercices)) throw new Error('library.json doit contenir un tableau « exercices ».');
  const fiches = {}, duplicates = new Set();
  for (const exercice of library.exercices) {
    if (!exercice || typeof exercice.id !== 'string' || !exercice.id) throw new Error('Une fiche ne possède pas d’identifiant textuel valide.');
    if (Object.prototype.hasOwnProperty.call(fiches, exercice.id)) duplicates.add(exercice.id);
    const fields = {};
    for (const key of Object.keys(exercice).sort()) fields[key] = sha(exercice[key]);
    fiches[exercice.id] = fields;
  }
  const sections_hors_fiches = {};
  for (const key of Object.keys(library).sort()) if (key !== 'exercices') sections_hors_fiches[key] = sha(library[key]);
  const comptages_origine = {};
  for (const exercice of library.exercices) { const origin = exercice.origine || '(absente)'; comptages_origine[origin] = (comptages_origine[origin] || 0) + 1; }
  return {version:1, nombre_fiches:library.exercices.length, ordre_ids:sha(library.exercices.map(e=>e.id)), fiches, sections_hors_fiches, comptages_origine:Object.fromEntries(Object.entries(comptages_origine).sort(([a],[b])=>a.localeCompare(b))), duplicate_ids:[...duplicates].sort()};
}
function main() {
  const library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
  const current = snapshot(library);
  if (process.argv.includes('--update')) {
    if (process.env.CI) { console.error('REFUS : --update est interdit lorsque CI est défini.'); process.exitCode=2; return; }
    delete current.duplicate_ids;
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(current,null,2)+'\n');
    console.log('Référence d’intégrité régénérée explicitement :', BASELINE_PATH);
    console.log('Vérifier le diff avant tout commit.'); return;
  }
  const reference = JSON.parse(fs.readFileSync(BASELINE_PATH,'utf8')), errors=[];
  for (const id of current.duplicate_ids) errors.push(`Fiche ${id} : identifiant dupliqué dans library.json`);
  if (reference.nombre_fiches !== current.nombre_fiches) errors.push(`Nombre de fiches : référence ${reference.nombre_fiches}, actuel ${current.nombre_fiches}`);
  if (reference.ordre_ids !== current.ordre_ids) errors.push('Ordre ou liste des identifiants modifié');
  if (JSON.stringify(reference.comptages_origine) !== JSON.stringify(current.comptages_origine)) errors.push('Répartition des fiches par origine modifiée');
  for (const key of new Set([...Object.keys(reference.sections_hors_fiches),...Object.keys(current.sections_hors_fiches)]))
    if (reference.sections_hors_fiches[key] !== current.sections_hors_fiches[key]) errors.push(`Section hors fiches « ${key} » : ajoutée, supprimée ou modifiée`);
  for (const id of new Set([...Object.keys(reference.fiches),...Object.keys(current.fiches)])) {
    if (!Object.prototype.hasOwnProperty.call(reference.fiches,id)) { errors.push(`Fiche ${id} : AJOUTÉE`); continue; }
    if (!Object.prototype.hasOwnProperty.call(current.fiches,id)) { errors.push(`Fiche ${id} : SUPPRIMÉE`); continue; }
    const before=reference.fiches[id], after=current.fiches[id];
    for (const key of new Set([...Object.keys(before),...Object.keys(after)])) if (before[key] !== after[key]) {
      const change=!Object.prototype.hasOwnProperty.call(before,key)?'AJOUTÉ':!Object.prototype.hasOwnProperty.call(after,key)?'SUPPRIMÉ':'MODIFIÉ';
      errors.push(`Fiche ${id}, champ « ${key} » : ${change}`);
    }
  }
  if (errors.length) { console.error(`INTÉGRITÉ ÉCHOUÉE (${errors.length} écart(s)) :\n - ${errors.join('\n - ')}`); process.exitCode=1; return; }
  console.log(`Intégrité OK : ${current.nombre_fiches} fiches, ${Object.keys(current.sections_hors_fiches).length} sections hors fiches ; tous les champs et leur ordre sont protégés.`);
}
try { main(); } catch(error) { console.error('Contrôle d’intégrité impossible :',error.message); process.exitCode=1; }
