const {test,expect}=require('@playwright/test');
const {openApp,reloadApp,libraryCount,originCount}=require('./helpers.cjs');
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
test('édition, suppression, rechargement, groupe et export',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await page.locator('#plan>.card').last().getByRole('button',{name:'✕'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(4);
 await reloadApp(page)
 await expect(page.locator('#plan>.card')).toHaveCount(4);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Exporter la séance/}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('impro-lab-seance.json');
 await page.getByRole('button',{name:'Groupes'}).click();
 await page.locator('#names').fill(Array.from({length:13},(_,i)=>'Élève '+(i+1)).join('\n'));
 await page.locator('#groupCount').fill('3');
 await page.getByRole('button',{name:'Répartir'}).click();
 await expect(page.locator('#groupsResult .card')).toHaveCount(3);
 const content=await page.locator('#groupsResult').innerText();
 for(let i=1;i<=13;i++)expect(content).toContain('Élève '+i);
});
test('navigation clavier du mode animateur',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await page.getByRole('button',{name:/Animateur/}).click();
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
 const n=await page.locator('#games .card').count();expect(n).toBeGreaterThan(0);expect(n).toBeLessThan(105);
});
test('générateur respecte la catégorie des cinq étapes',async({page})=>{
 await openApp(page);
 
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const labels=await page.locator('#plan>.card small').allTextContents();
 expect(labels).toHaveLength(5);
 expect(labels.map(x=>x.split('·')[1].trim())).toEqual(['Énergie','Écoute','Corps','Construction','Scène']);
});

test('générateur privilégie les notes personnelles et respecte les étapes',async({page})=>{
 await openApp(page);
 
 await expect(page.locator('#includeExternal')).not.toBeChecked();
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 const labels=await page.locator('#plan>.card small').allTextContents();
 expect(labels).toHaveLength(5);
 expect(labels.every(x=>x.includes('Mes notes'))).toBe(true);
 expect(['Énergie','Corps']).toContain(labels[0].split('·')[1].trim());
 expect(labels.at(-1).split('·')[1].trim()).toBe('Scène');
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
 
 await page.getByRole('button',{name:'Jeux',exact:true}).click();
 const filter=page.locator('#categoryFilter');
 await expect(filter.locator('option')).toHaveCount(10);
 await filter.selectOption('Amusement');
 await expect(page.locator('#games')).toContainText('Ceci est un');
 await filter.selectOption('Lâcher-prise');
 await expect(page.locator('#games')).toContainText('zombie');
 await filter.selectOption('Cohésion');
 await expect(page.locator('#games')).toContainText('voyant');
});

test('dix curseurs compacts 0-100, persistance et timeline souple',async({page})=>{
 await openApp(page);
 
 const sliders=page.locator('.dynamic-grid input[type=range]');
 await expect(sliders).toHaveCount(10);
 for(const slider of await sliders.all()){await expect(slider).toHaveAttribute('max','100');await expect(slider).toHaveAttribute('step','1')}
 await page.locator('#dynamic9').fill('87');
 await expect(page.locator('#dynamicValue9')).toHaveText('87 %');
 await reloadApp(page)
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
