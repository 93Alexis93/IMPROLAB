'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const lib = JSON.parse(fs.readFileSync('library.json', 'utf8'));
const baseline = JSON.parse(fs.readFileSync('tests/library.baseline.json', 'utf8'));
const script = html.split('<script>')[1]?.split('</script>')[0];

assert.ok(script, 'Script absent');
new Function(script);

assert.equal(lib.exercices.length, baseline.nombre_fiches, 'Nombre de fiches différent de la référence d’intégrité');
assert.equal(lib.exercices.length, Object.keys(baseline.fiches).length, 'La référence ne protège pas toutes les fiches');
const ids = lib.exercices.map(e => e.id);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
for (const id of new Set(duplicateIds)) assert.fail(`Fiche ${id}, champ « id » : identifiant dupliqué`);
const originCounts = {};
for (const e of lib.exercices) { const origin = e.origine || '(absente)'; originCounts[origin] = (originCounts[origin] || 0) + 1; }
const sortedOriginCounts = Object.fromEntries(Object.entries(originCounts).sort(([a],[b]) => a.localeCompare(b)));
assert.deepEqual(sortedOriginCounts, baseline.comptages_origine, 'Répartition des fiches par origine différente de la référence');

assert.ok(lib.exercices.filter(e => e.origine === 'notes_personnelles' && e.regle_clarifiee).length >= 22, 'Pas assez de règles personnelles clarifiées');
for (const e of lib.exercices) assert.equal(typeof e.texte_original, 'string', `Fiche ${e.id}, champ « texte_original » : doit être une chaîne`);
for (const fn of ['generate','refreshEditor','moveExercise','changeMinutes','replaceExercise','removeExercise','clearSession','exportSession','importSession','liveNext','livePrevious','liveToggle','loadLibrary']) assert.ok(script.includes('function '+fn+'('), 'Fonction manquante : '+fn);
for (const name of ['seance','jeux','groupes','historique','live']) assert.ok(html.includes('id="'+name+'"'), 'Section absente : '+name);
for (const name of ['principes','cahier','random','public','plan','manualGame','libraryStatus','liveStart','randomExerciseUse']) assert.ok(html.includes('id="'+name+'"'), 'Élément absent : '+name);
for (const file of ['sw.js','manifest.webmanifest','icon.svg']) assert.ok(fs.existsSync(file), 'Fichier manquant : '+file);
for (const e of lib.exercices) {
  assert.ok(e.id && e.titre, `Fiche ${e.id || '(sans id)'}, champ « id/titre » : fiche mal formée`);
  assert.equal(typeof e.eligible_generateur, 'boolean', `Fiche ${e.id}, champ « eligible_generateur » : booléen attendu`);
}
assert.ok(lib.exercices.some(e => e.eligible_generateur), 'Le générateur ne possède aucune fiche éligible');
const durationStart = html.indexOf('<select id="duration" aria-label="Durée de la séance">');
const durationEnd = html.indexOf('</select>', durationStart);
const durationMarkup = durationStart < 0 || durationEnd < 0 ? '' : html.slice(durationStart, durationEnd);
const durationOptions = [...durationMarkup.matchAll(/<option value="(\d+)"/g)].map(match => Number(match[1]));
assert.equal(durationOptions.length, 18, 'Le menu doit proposer 18 durées');
assert.equal(durationOptions[0], 35, 'La durée minimale doit être de 35 minutes');
assert.equal(durationOptions.at(-1), 120, 'La durée maximale doit être de 120 minutes');
assert.ok(durationOptions.every((duration, index) => index === 0 || duration - durationOptions[index - 1] === 5), 'Les durées doivent progresser par pas de 5 minutes');
assert.match(durationMarkup, /value="55" selected/, 'La durée par défaut doit être de 55 minutes');
assert.ok(script.includes('function buildTimelineMinutes(duration)'), 'Répartition dynamique des durées absente');
const timelineSource = script.match(/function buildTimelineMinutes\(duration\)\{[\s\S]*?\n\}/);
assert.ok(timelineSource, 'La fonction de répartition des durées doit pouvoir être isolée pour les tests');
const buildTimelineMinutes = new Function(timelineSource[0] + '; return buildTimelineMinutes;')();
for (let duration = 35; duration <= 120; duration += 5) {
  const parts = buildTimelineMinutes(duration);
  assert.equal(parts.length, 5, `Séance de ${duration} min : cinq étapes attendues`);
  assert.ok(parts.every(minutes => Number.isInteger(minutes) && minutes >= 5 && minutes % 5 === 0), `Séance de ${duration} min : chaque étape doit être un multiple de 5 positif`);
  assert.equal(parts.reduce((sum, minutes) => sum + minutes, 0), duration, `Séance de ${duration} min : le total doit rester exact`);
  assert.ok(parts[4] >= 15, `Séance de ${duration} min : la scène finale doit durer au moins 15 minutes`);
}

assert.ok(/function buildPrincipalObjective\(games(?:,parts=\[\])?\)/.test(script), 'Objectif pédagogique principal absent');
assert.ok(script.includes('function coachDetailsHtml(') && script.includes('class="coach-quick"') && script.includes('🎓 Consigne') && script.includes('📖 Explication complète du jeu'),'Fiche d’accompagnement pédagogique absente des exercices de séance');
assert.ok(/buildPrincipalObjective\(selectedGames(?:,parts)?\)/.test(script), 'Objectif calculé à partir des exercices sélectionnés absent');
for (const feature of ['touchstart','touchend','Date.now()-liveAnchor','impro-favorites','impro-recent-games','serviceWorker.register','planSummary']) assert.ok(html.includes(feature), 'Fonction manquante : '+feature);
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone','Manifest : champ « display » doit valoir standalone');
assert.ok(fs.readFileSync('sw.js','utf8').includes('library.json'),'Service worker : bibliothèque absente du cache');
assert.ok(fs.existsSync('schemas.json'), 'Schémas pédagogiques absents');
const schemaData = JSON.parse(fs.readFileSync('schemas.json', 'utf8'));
assert.equal(Object.keys(schemaData.fiches || {}).length, 13, 'Le premier lot doit contenir 13 schémas');
const supportedSchemaTypes = new Set(['circle-transmission','circle-duel','circle-direction','diamond-leader','square-pairs','four-zones','two-lines','stage-entries','line-center-pair']);
for (const [id, schema] of Object.entries(schemaData.fiches)) {
  assert.ok(lib.exercices.some(exercice => exercice.id === id), `Schéma sans fiche correspondante : ${id}`);
  assert.ok(schema && typeof schema.type === 'string' && supportedSchemaTypes.has(schema.type), `Type de schéma non rendu : ${id} (${schema?.type})`);
  assert.ok(typeof schema.caption === 'string' && schema.caption.trim().length > 0, `Légende de schéma absente : ${id}`);
}
assert.ok(schemaData.fiches['1-12'].caption.includes('quatre') && schemaData.fiches['1-12'].caption.includes('huit'), 'Le schéma 1-12 doit rappeler le doublement des frappes');
assert.ok(schemaData.fiches['1-42'].caption.includes('libéré'), 'Le schéma 1-42 doit rappeler la délivrance');
assert.ok(schemaData.fiches['1-49'].caption.includes('pile') && schemaData.fiches['1-49'].caption.includes('avance'), 'Le schéma 1-49 doit rappeler le signal et l’avancée de l’équipe');
assert.ok(fs.readFileSync('sw.js','utf8').includes('schemas.json'), 'Service worker : schémas absents du cache');
assert.ok(html.includes('id="guidedDuration"') && html.includes('data-ambiance="energy"'), 'Préparation guidée absente');
assert.ok(fs.readFileSync('styles.css','utf8').includes('label[hidden]'), 'Les labels masqués doivent rester masqués malgré les styles globaux');
const stylesheet = fs.readFileSync('styles.css','utf8');
assert.ok(stylesheet.includes('@page{size:A4'), 'Mise en page A4 à l’impression absente');
assert.ok(stylesheet.includes('@media print{') && stylesheet.includes('#plan>.card'), 'Styles d’impression des séances absents');
assert.ok(stylesheet.includes('.exercise-schema svg{max-width:32mm'), 'Les schémas doivent être adaptés à l’impression');
assert.ok(script.includes('function applyAmbiances()'), 'Application des ambiances absente');
assert.ok(script.includes('if(!checked.length){for(let i=0;i<IMPRO_CATEGORIES.length;i++){const c=IMPRO_CATEGORIES[i],main=document.getElementById(\'dynamic\'+i);if(main){main.value=DEFAULT_DYNAMICS[c]*20;updateDynamic(i)}}status.textContent=\'Aucune ambiance sélectionnée : priorités habituelles restaurées.\';return}'), 'Sans ambiance sélectionnée, les curseurs doivent retrouver les priorités habituelles');
assert.ok(script.includes("function resetDynamics(){") && script.includes("document.querySelectorAll('[data-ambiance]').forEach(el=>el.checked=false)"), 'La réinitialisation doit effacer les ambiances sélectionnées');
assert.ok(script.includes("const AMBIANCE_CATEGORIES="), 'Correspondance entre ambiances et catégories absente');
for (const key of ['energy','listen','release','story','stage','emotion']) assert.ok(html.includes('data-ambiance="'+key+'"'), 'Ambiance guidée absente : '+key);
assert.ok(script.includes("localStorage.setItem('impro-session-dynamics-v1'") && script.includes("localStorage.setItem('impro-random-dynamics-v1'"), 'Persistance partagée des curseurs absente');
assert.ok(script.includes("other.value=n") && script.includes("document.getElementById('dynamic'+i)"), 'Synchronisation des curseurs entre les deux générateurs absente');
assert.ok(html.includes('min-height:44px') || fs.readFileSync('styles.css','utf8').includes('min-height:44px'), 'Cibles tactiles de 44 px absentes');

assert.ok(script.includes('data.filter(g=>isEligibleGame(g,{includeExternal:false,includeIncomplete:false}))'), 'Le tirage rapide doit réutiliser les règles canoniques d’éligibilité');


for (const e of lib.exercices) {
  assert.ok(e.conseils_animation, `Fiche ${e.id}, champ « conseils_animation » : conseils manquants`);
  for (const key of ['consigne_courte','variante_facile','variante_difficile','points_vigilance','statut']) assert.ok(e.conseils_animation[key], `Fiche ${e.id}, champ « conseils_animation.${key} » : conseil manquant`);
}
assert.ok(html.includes('Fiche animateur'),'Fiches animateur absentes');
assert.ok(script.includes('return schemaMarkup([ex.titre])+menu('), 'Les schémas doivent aussi être disponibles dans les fiches coach');
assert.equal(lib.categories_pedagogiques.length,10,'Nombre de catégories pédagogiques inattendu');
const categories = ['Énergie','Écoute','Corps','Construction','Scène','Émotions','Amusement','Lâcher-prise','Cohésion','Imaginaire'];
assert.deepEqual(lib.categories_pedagogiques,categories,'Liste des catégories pédagogiques modifiée');
assert.ok(!lib.categories_pedagogiques.includes('Concentration'),'Concentration ne doit pas être une catégorie pédagogique');
for (const e of lib.exercices.filter(item => item.eligible_generateur)) {
  assert.ok(categories.includes(e.objectif_pedagogique), `Fiche ${e.id}, champ « objectif_pedagogique » : catégorie de génération inconnue « ${e.objectif_pedagogique} »`);
  assert.ok(!(e.categories_secondaires || []).includes('Concentration'), `Fiche ${e.id}, champ « categories_secondaires » : Concentration est interdite dans les catégories de génération`);
}
for (const category of categories) assert.ok(html.includes('<option>'+category+'</option>') && html.includes('"'+category+'"'), 'Catégorie absente du flux : '+category);
assert.ok(!html.includes('<option>Concentration</option>'),'Catégorie non reconnue encore présente dans le filtre');

const firstNameGame = lib.exercices.find(e => e.id === '2-36');
assert.ok(firstNameGame, 'Fiche 2-36 absente');
assert.equal(firstNameGame.statut,'validée par le coach','Fiche 2-36, champ « statut » inattendu');
assert.equal(firstNameGame.eligible_generateur,true,'Fiche 2-36, champ « eligible_generateur » inattendu');
assert.equal(firstNameGame.objectif_pedagogique,'Écoute','Fiche 2-36, champ « objectif_pedagogique » inattendu');
assert.deepEqual(firstNameGame.categories_secondaires,['Cohésion','Énergie'],'Fiche 2-36, champ « categories_secondaires » inattendu');
const pendingGame = lib.exercices.find(e => e.id === '2-20');
assert.ok(pendingGame, 'Fiche 2-20 absente');
assert.equal(pendingGame.statut,'à confirmer','Fiche 2-20, champ « statut » : doit rester en attente');
assert.equal(pendingGame.eligible_generateur,false,'Fiche 2-20, champ « eligible_generateur » : doit rester non éligible');

for (const e of lib.exercices) {
  if (e.categories_secondaires) {
    assert.ok(Array.isArray(e.categories_secondaires), `Fiche ${e.id}, champ « categories_secondaires » : tableau attendu`);
    for (const category of e.categories_secondaires) {
      assert.ok(categories.includes(category), `Fiche ${e.id}, champ « categories_secondaires » : catégorie inconnue « ${category} »`);
      assert.notEqual(category,e.objectif_pedagogique,`Fiche ${e.id}, champ « categories_secondaires » : doublon de l’objectif principal`);
    }
  }
}
assert.ok(script.includes('(x.g[11]||[]).includes(cat)'),'Filtre secondaire absent');
assert.ok(script.includes('function gameAffinity(g,category)'),'Prise en compte des catégories secondaires absente');
assert.ok(script.includes('SOFT_TIMELINE') && script.includes('chooseTimelineGame'),'Timeline souple manquante');
for (let i=0;i<10;i++) assert.ok(html.includes('id="dynamic'+i+'"'),'Curseur dynamique absent : '+i);
assert.ok(script.includes('buildTimelineMinutes(duration)') && /buildPrincipalObjective\(selectedGames(?:,parts)?\)/.test(script), 'Générateur adaptatif et objectif pédagogique absents');

assert.ok(script.includes('impro-session-dynamics-v1') && script.includes('impro-random-dynamics-v1') && script.includes('chooseDynamicGame'),'Curseurs indépendants absents');
assert.ok(html.includes('Trois repères pour commencer') && html.includes('welcome-tutorial'),'Tutoriel d’accueil absent');
assert.equal(lib.ressource_cahier_coach.listes.Mot.length,20,'Liste de mots du cahier de coach : longueur inattendue');
for (const word of ['Transmission','Crépitement','Mirage']) assert.ok(lib.ressource_cahier_coach.listes.Mot.includes(word),'Mot du cahier de coach manquant : '+word);
assert.ok(html.includes('id="randomExerciseCategories"') && html.includes('function pickRandomExercise(') && html.includes('function useRandomExercise('),'Générateur d’exercice aléatoire absent');
for (let i=0;i<10;i++) assert.ok(html.includes('id="randomDynamic'+i+'"'),'Curseur du générateur absent : '+i);
assert.ok(script.includes('function getRandomDynamics()') && script.includes('function updateRandomDynamic(i)'),'Priorités du générateur absentes');
assert.ok(html.includes('Object.prototype.hasOwnProperty.call(DRAW_DEFAULTS,category)'),'Les listes du cahier ne doivent pas créer de catégories de tirage inconnues');


const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
assert.match(sw, /const CACHE='impro-lab-offline-v36-refonte-ux-ui'/, 'Version du cache hors ligne inattendue');
assert.ok(html.includes("serviceWorker.register('./sw.js?v=20261024-v36-refonte-ux-ui'"), 'L’URL du service worker doit être versionnée avec la refonte');
for (const asset of ['./index.html','./styles.css','./schemas.json','./library.json']) {
  assert.ok(sw.includes("'"+asset+"'"), 'Ressource essentielle absente du cache hors ligne : '+asset);
}
assert.ok(sw.includes("caches.match(e.request,{ignoreSearch:true})"), 'Le cache hors ligne doit ignorer les paramètres de requête');
assert.ok(sw.includes("caches.delete(k)"), 'Le service worker doit supprimer les anciens caches');

console.log('IMPRO LAB : contrôles statiques et cohérence des données OK');
console.log('Timeline souple et dix curseurs OK');
