const {test,expect}=require('@playwright/test');
const {openApp,reloadApp,libraryCount,originCount,library}=require('./helpers.cjs');
for(const duration of ['45','55','60','90']){
 test('durée exacte '+duration+' min',async({page})=>{
  await openApp(page);
  
  await page.locator('#duration').selectOption(duration);
  await page.getByRole('button',{name:'Générer ma séance'}).click();
  await expect(page.locator('#planSummary')).toContainText(duration+' minutes');
  await expect(page.locator('#plan>.card')).toHaveCount(5);
  const names=await page.locator('#plan>.card h3').allTextContents();
  expect(new Set(names).size).toBe(5);
 });
}
test('mode Coach accessible dans chaque exercice de la séance',async({page})=>{
 await openApp(page);
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const cards=page.locator('#plan>.card:not(.session-objective)');
 await expect(cards).toHaveCount(5);
 for(let i=0;i<5;i++){
  const card=cards.nth(i);
  const coach=card.locator('details.session-coach');
  await expect(coach).toHaveCount(1);
  await coach.locator('summary').click();
  await expect(coach).toContainText('Consigne de la fiche');
  await expect(coach).toContainText('Pour relancer');
  await expect(coach).toContainText('À surveiller');
  await expect(coach).toContainText('pistes génériques');
 }
});
test('édition, suppression, rechargement, groupe et export',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await page.locator('#plan>.card').last().getByRole('button',{name:'✕'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(4);
 await reloadApp(page);
 await expect(page.locator('#plan>.card')).toHaveCount(4);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Exporter la séance/}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('impro-lab-seance.json');
 await page.getByRole('button',{name:'Groupes'}).click();
 await page.locator('#rosterInput').fill(Array.from({length:13},(_,i)=>'Élève '+(i+1)).join('\n'));
 await page.getByRole('button',{name:/Ajouter/}).click();
 await page.locator('#rosterFormat').selectOption('3');
 await page.getByRole('button',{name:/Tirer les groupes/}).click();
 await expect(page.locator('#groupsResult .card')).toHaveCount(4);
 const content=await page.locator('#groupsResult').innerText();
 for(let i=1;i<=13;i++)expect(content).toContain('Élève '+i);
});
test('effacement en un clic de toute la séance sans supprimer l’historique',async({page})=>{
 await openApp(page);
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(5);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:/Effacer toute la séance/}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(0);
 await expect(page.locator('#planSummary')).toContainText('Aucun exercice');
 await page.getByRole('button',{name:'Historique'}).click();
 await expect(page.getByRole('button',{name:'Réutiliser'})).toBeVisible();
 await reloadApp(page);
 await expect(page.locator('#plan>.card')).toHaveCount(0);
 await expect(page.locator('#planSummary')).toContainText('Aucun exercice');
});

test('navigation clavier du mode animateur',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await page.getByRole('button',{name:/Régie d’impro|Animateur/}).click();
 await page.locator('body').click({position:{x:5,y:5}});
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('#liveProgress')).toContainText('Exercice 2 / 5');
 await page.keyboard.press('ArrowLeft');
 await expect(page.locator('#liveProgress')).toContainText('Exercice 1 / 5');
});

test('filtres bibliothèque par origine et objectif',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Jeux'}).click();
 await page.locator('#sourceFilter').selectOption('recherche_web');
 await expect(page.locator('#games .card')).toHaveCount(originCount('recherche_web'));
 await page.locator('#sourceFilter').selectOption('notes_personnelles');
 await expect(page.locator('#games .card')).toHaveCount(originCount('notes_personnelles'));
 await page.locator('#categoryFilter').selectOption('Écoute');
 await expect(page.locator('#games .card').first()).toBeVisible();
 const n=await page.locator('#games .card').count();expect(n).toBeGreaterThan(0);expect(n).toBeLessThan(originCount('notes_personnelles'));
});
test('générateur respecte les cinq étapes de la timeline',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const labels=await page.locator('#plan>.card small').allTextContents();
 expect(labels).toHaveLength(5);
 expect(labels.map(x=>x.split('·')[1].trim())).toEqual(['Mise en énergie','Connexion collective','Exploration','Improvisation','Final collectif']);
});

test('générateur privilégie les notes personnelles et respecte les étapes',async({page})=>{
 await openApp(page);
 
 await expect(page.locator('#includeExternal')).not.toBeChecked();
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const labels=await page.locator('#plan>.card small').allTextContents();
 expect(labels).toHaveLength(5);
 expect(labels.every(x=>x.includes('Mes notes'))).toBe(true);
 expect(['Mise en énergie','Connexion collective']).toContain(labels[0].split('·')[1].trim());
 expect(labels.at(-1).split('·')[1].trim()).toBe('Final collectif');
 await page.locator('#includeExternal').check();
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(5);
});
test('rotation équitable entre séances consécutives',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const first=await page.locator('#plan>.card h3').allTextContents();
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const second=await page.locator('#plan>.card h3').allTextContents();
 expect(second.filter(x=>first.includes(x))).toHaveLength(0);
 const counts=await page.evaluate(()=>JSON.parse(localStorage.getItem('impro-game-usage-v1')));
 expect(Object.values(counts).reduce((a,b)=>a+b,0)).toBe(10);
});

test('les neuf catégories et les catégories secondaires sont filtrables',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Jeux'}).click();
 const filter=page.locator('#categoryFilter');
 await expect(filter.locator('option')).toHaveCount(library.categories_pedagogiques.length+1);
 await filter.selectOption('Amusement');
 await expect(page.locator('#games')).toContainText('Ceci est un');
 await filter.selectOption('Lâcher-prise');
 await expect(page.locator('#games')).toContainText('zombie');
 await filter.selectOption('Cohésion');
 await expect(page.locator('#games')).toContainText('voyant');
});

test('dix curseurs compacts 0-100, persistance et timeline souple',async({page})=>{
 await openApp(page);
 
 const sliders=page.locator('#seance .dynamic-grid input[type=range]');
 await expect(sliders).toHaveCount(10);
 for(const slider of await sliders.all()){await expect(slider).toHaveAttribute('max','100');await expect(slider).toHaveAttribute('step','1')}
 await page.locator('#dynamic9').fill('87');
 await expect(page.locator('#dynamicValue9')).toHaveText('87 %');
 await reloadApp(page);
 await expect(page.locator('#dynamic9')).toHaveValue('87');
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(5);
 await expect(page.locator('#planSummary')).toContainText('55 minutes');
 await page.getByRole('button',{name:/Réinitialiser/}).click();
 await expect(page.locator('#dynamic9')).toHaveValue('60');
});

test('timeline souple : cinq étapes et priorité Imaginaire',async({page})=>{
 await openApp(page);
 
 await page.locator('#dynamic9').fill('100');
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(5);
 for(const label of ['Mise en énergie','Connexion collective','Exploration','Improvisation','Final collectif'])await expect(page.locator('#plan>.card small').filter({hasText:label})).toHaveCount(1);
 await page.getByRole('button',{name:'Jeux'}).click();
 await page.locator('#categoryFilter').selectOption('Imaginaire');
 await expect(page.locator('#categoryFilter')).toHaveValue('Imaginaire');
});


test('déplacement et remplacement d’un exercice conservent une séance cohérente',async({page})=>{
 await openApp(page);
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const cards=page.locator('#plan>.card:not(.session-objective)');
 await expect(cards).toHaveCount(5);
 const initial=await cards.locator('h3').allTextContents();
 await cards.nth(0).getByRole('button',{name:'Descendre exercice 1'}).click();
 await expect(cards.nth(0).locator('h3')).toHaveText(initial[1]);
 await expect(cards.nth(1).locator('h3')).toHaveText(initial[0]);
 await page.evaluate(()=>{Math.random=()=>0});
 const oldTitle=await cards.nth(0).locator('h3').textContent();
 await cards.nth(0).getByRole('button',{name:/Remplacer/}).click();
 const newTitle=(await cards.nth(0).locator('h3').textContent()).trim();
 expect(newTitle).not.toBe(oldTitle);
 const replacement=await page.evaluate(title=>{
  const item=data.find(entry=>entry[0]===title||displayTitle(entry[0])===title);
  return item?{eligible:item[6]===true,rule:item[2]}:null;
 },newTitle);
 expect(replacement, 'L’exercice remplacé doit appartenir à la bibliothèque').not.toBeNull();
 expect(replacement.eligible).toBe(true);
 await expect(cards.nth(0).locator('.coach-quick').filter({hasText:'Explication complète du jeu'})).toContainText(replacement.rule);
 await reloadApp(page);
 await expect(page.locator('#plan>.card:not(.session-objective)')).toHaveCount(5);
 await expect(page.locator('#plan>.card:not(.session-objective)').first().locator('h3')).toHaveText(newTitle);
});


test('remplacement : admissibilité, catégorie, étape et anti-doublon',async({page})=>{
 test.setTimeout(120000);
 await openApp(page);
 await page.locator('#includeExternal').uncheck();
 for(let i=0;i<10;i++)await page.locator('#dynamic'+i).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},i===0?'100':'0');
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const cards=page.locator('#plan>.card:not(.session-objective)');
 await expect(cards).toHaveCount(5);
 for(let cardIndex=0;cardIndex<5;cardIndex++){
  for(let turn=0;turn<20;turn++){
   const card=cards.nth(cardIndex);
   const before=await card.locator('h3').textContent();
   const stage=await card.getAttribute('data-stage-index');
   const category=await card.getAttribute('data-category');
   await card.getByRole('button',{name:'🔄 Remplacer'}).click();
   const title=(await card.locator('h3').textContent()).trim();
   expect(title).not.toBe(before);
   expect(await card.getAttribute('data-stage-index')).toBe(stage);
   expect(await card.getAttribute('data-category')).toBe(category);
   const state=await page.evaluate(({title,category,before})=>{
    const item=data.find(g=>displayTitle(g[0])===title||g[0]===title);
    const eligible=g=>!!(g&&g[6]&&g[5]&&g[2]&&g[2].trim().length>20&&!['notes originales','proposition à valider','à confirmer'].includes((g[12]||'').toLowerCase())&&g[9]!=='incomplète'&&g[8]==='notes_personnelles');
    const peers=Array.from(document.querySelectorAll('#plan>.card h3')).map(n=>n.textContent.trim());
    const primary=data.filter(g=>eligible(g)&&g[1]===category&&displayTitle(g[0])!==before&&g[0]!==before&&!peers.filter(x=>x!==title).includes(displayTitle(g[0]))&&!peers.filter(x=>x!==title).includes(g[0]));
    const secondary=data.filter(g=>eligible(g)&&(g[11]||[]).includes(category)&&displayTitle(g[0])!==before&&g[0]!==before&&!peers.filter(x=>x!==title).includes(displayTitle(g[0]))&&!peers.filter(x=>x!==title).includes(g[0]));
    return {item:item&&{eligible:eligible(item),category:item[1],secondary:item[11]||[]},primaryAvailable:primary.length>0,secondaryAvailable:secondary.length>0,peers};
   },{title,category,before});
   expect(state.item,'remplaçant trouvé dans la bibliothèque').toBeTruthy();
   expect(state.item.eligible,'aucune fiche inadmissible').toBe(true);
   expect(state.peers.length).toBe(new Set(state.peers).size);
   if(state.primaryAvailable)expect(state.item.category).toBe(category);
   else if(state.secondaryAvailable)expect(state.item.secondary).toContain(category);
  }
 }
 const manualIndex=await page.evaluate(()=>{
  const used=Array.from(document.querySelectorAll('#plan>.card h3')).map(n=>n.textContent.trim());
  return data.findIndex(g=>g[6]&&g[5]&&g[2]&&g[2].trim().length>20&&!['notes originales','proposition à valider','à confirmer'].includes((g[12]||'').toLowerCase())&&g[8]==='notes_personnelles'&&!used.includes(g[0])&&!used.includes(displayTitle(g[0])));
 });
 expect(manualIndex).toBeGreaterThanOrEqual(0);
 await page.locator('#manualGame').selectOption(String(manualIndex));
 await page.getByRole('button',{name:/Ajouter/}).click();
 const manualCard=page.locator('#plan>.card').filter({has:page.locator('h3')}).last();
 const manualTitle=await manualCard.locator('h3').textContent();
 await manualCard.getByRole('button',{name:'🔄 Remplacer'}).click();
 expect((await manualCard.locator('h3').textContent()).trim()).not.toBe(manualTitle.trim());
 await reloadApp(page);
 await page.locator('#plan>.card').filter({has:page.locator('h3')}).first().getByRole('button',{name:'🔄 Remplacer'}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 await page.getByRole('button',{name:'Historique'}).click();
 await page.getByRole('button',{name:'Réutiliser'}).click();
 await page.locator('#plan>.card').filter({has:page.locator('h3')}).first().getByRole('button',{name:'🔄 Remplacer'}).click();
 await expect(page.locator('#plan>.card h3').first()).toBeVisible();
 const legacyHtml='<div class="card"><small>8 min</small><h3>Exercice ancien</h3><p>Ancienne règle de test suffisamment longue pour l’import.</p></div>';
 const legacyPayload=JSON.stringify({format:'impro-lab-session',version:1,html:legacyHtml});
 await page.locator('#importSession').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(legacyPayload)});
 await expect(page.locator('#plan>.card h3')).toHaveText('Exercice ancien');
 await page.locator('#plan>.card').first().getByRole('button',{name:'🔄 Remplacer'}).click();
 await expect(page.locator('#plan>.card h3').first()).not.toHaveText('Exercice ancien');
 await page.evaluate(()=>{for(const g of data)g[6]=false});
 await page.locator('#plan>.card').first().getByRole('button',{name:'🔄 Remplacer'}).click();
 await expect(page.locator('#planSummary')).toContainText('Aucun autre jeu admissible disponible');
});
