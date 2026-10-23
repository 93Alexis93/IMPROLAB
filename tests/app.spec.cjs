const {test,expect}=require('@playwright/test');
const {openApp,reloadApp,libraryCount}=require('./helpers.cjs');
test.beforeEach(async({page},testInfo)=>{await openApp(page,{dismissWelcome:!testInfo.title.includes('tutoriel d’accueil')})});
test('bibliothèque et générateur',async({page})=>{await expect(page.locator('#manualGame option')).toHaveCount(libraryCount);await page.evaluate(()=>generate());await expect(page.locator('#plan .card')).toHaveCount(6);await expect(page.locator('#plan .session-objective')).toBeVisible();await expect(page.locator('#plan .session-objective')).toContainText('Objectif principal de la séance')});
test('durées libres : répartition exacte et scène finale de 15 minutes minimum',async({page})=>{const result=await page.evaluate(()=>{const values=[...document.querySelectorAll('#duration option')].map(o=>Number(o.value));return {values,allocations:values.map(duration=>({duration,parts:buildTimelineMinutes(duration)}))}});expect(result.values).toHaveLength(18);expect(result.values[0]).toBe(35);expect(result.values.at(-1)).toBe(120);for(const item of result.allocations){expect(item.parts.reduce((sum,n)=>sum+n,0)).toBe(item.duration);expect(item.parts.at(-1)).toBeGreaterThanOrEqual(15)}await page.locator('#duration').selectOption('75');await page.evaluate(()=>generate());await expect(page.locator('#plan .session-objective')).toBeVisible();await expect(page.locator('#duration')).toHaveValue('75')});
test('huit catégories et 400 mots sans doublons',async({page})=>{const result=await page.evaluate(()=>({keys:Object.keys(DRAW_DEFAULTS),words:DRAW_DEFAULTS.Mot}));expect(result.keys).toHaveLength(8);expect(result.keys).not.toContain('Genre');expect(result.words).toHaveLength(400);expect(new Set(result.words.map(x=>x.toLowerCase())).size).toBe(400);await page.evaluate(()=>drawAll());await expect(page.locator('#drawResults .draw-result')).toHaveCount(8)});
test('restauration de la liste par défaut reste sauvegardée',async({page})=>{await page.evaluate(()=>{document.getElementById('drawEditCategory').value='6';drawShowEditor();document.getElementById('drawEditor').value='Unique';drawSaveEditor();drawResetEditor()});await reloadApp(page);await expect(page.locator('#libraryStatus')).toContainText(`${libraryCount} exercices`);const words=await page.evaluate(()=>drawLists.Mot.length);expect(words).toBe(400)});
test('répartition de cinq joueurs en trios',async({page})=>{const groups=await page.evaluate(()=>{rosterState.college=['A','B','C','D','E'].map(name=>({name,present:true}));document.getElementById('rosterType').value='college';document.getElementById('rosterFormat').value='3';rosterDraw();return [...document.querySelectorAll('#groupsResult .card p')].map(p=>p.textContent.split(' · ').length)});expect(groups.sort()).toEqual([2,3])});
test('chronomètre libre démarre et se met en pause',async({page})=>{await page.evaluate(()=>{document.getElementById('liveMode').value='free';liveModeChange();liveToggle()});await expect.poll(()=>page.evaluate(()=>liveRunning)).toBe(true);await page.waitForTimeout(1100);await page.evaluate(()=>liveToggle());expect(await page.evaluate(()=>liveElapsed())).toBeGreaterThan(900)});
test('séance sauvegardée ne réinjecte pas de HTML actif',async({page})=>{await page.evaluate(()=>{localStorage.setItem('impro-history',JSON.stringify([{date:new Date().toISOString(),html:'<div class="card"><h3>Test</h3><p><img src=x onerror=alert(1)>Texte</p></div>'}]));loadSession(0)});expect(await page.locator('#plan img').count()).toBe(0);await expect(page.locator('#plan h3')).toHaveText('Test')});
test('interface mobile sans débordement horizontal majeur',async({page})=>{await page.setViewportSize({width:390,height:844});await reloadApp(page);await expect(page.locator('#libraryStatus')).toContainText(`${libraryCount} exercices`);const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);expect(widths[0]).toBeLessThanOrEqual(widths[1]+3)});

test('régie V3 : présence et groupes synchronisés',async({page})=>{await page.evaluate(()=>{rosterState.college=['A','B','C','D'].map(name=>({name,present:true}));document.getElementById('liveRosterType').value='college';liveRosterRefresh()});await expect(page.locator('#livePlayersCount')).toHaveText('4 présents');await page.evaluate(()=>liveRosterPresence(0,false));await expect(page.locator('#livePlayersCount')).toHaveText('3 présents');await page.evaluate(()=>{document.getElementById('liveRosterFormat').value='2';liveRosterDraw()});await expect(page.locator('#liveGroupsResult .card')).toHaveCount(2)});

test('régie compacte : panneaux repliables et bouton Plan supprimé',async({page})=>{await page.evaluate(()=>tab('live'));expect(await page.locator('#live button').allTextContents()).not.toContain('📋 Plan');await expect(page.locator('#live .regie-fold')).toHaveCount(4);await expect(page.locator('#live .regie-fold.regie-draw')).not.toHaveAttribute('open');await page.locator('#live .regie-fold.regie-draw > summary').click();await expect(page.locator('#live .regie-fold.regie-draw')).toHaveAttribute('open','');await expect(page.locator('#live #liveStart')).toBeVisible()});

test('tutoriel d’accueil et curseurs indépendants',async({page})=>{await expect(page.locator('#welcomeScreen')).toBeVisible();await expect(page.locator('#welcomeScreen .welcome-tutorial')).toContainText('les curseurs du générateur et ceux de la séance sont indépendants');await page.locator('#welcomeScreen .welcome-enter').click();await expect(page.locator('#welcomeScreen')).toHaveCount(0);await page.evaluate(()=>{document.getElementById('dynamic1').value=22;updateDynamic(1);document.getElementById('randomDynamic1').value=88;updateRandomDynamic(1)});expect(await page.locator('#dynamic1').inputValue()).toBe('22');expect(await page.locator('#randomDynamic1').inputValue()).toBe('88');await reloadApp(page);await expect(page.locator('#dynamic1')).toHaveValue('22');await expect(page.locator('#randomDynamic1')).toHaveValue('88')});
test('tirage aléatoire filtré : validation ajoute à la séance et à la régie',async({page})=>{await page.evaluate(()=>tab('random'));await page.evaluate(()=>{for(let i=0;i<10;i++)document.getElementById('randomDynamic'+i).value=0;document.getElementById('randomDynamic1').value=100;updateRandomDynamic(1)});await page.evaluate(()=>pickRandomExercise());await expect(page.locator('#randomExerciseResult')).not.toContainText('Aucun exercice validé');await expect(page.locator('#randomExerciseUse')).toBeVisible();const before=await page.locator('#plan .card').count();await page.evaluate(()=>useRandomExercise());await expect(page.locator('#plan .card')).toHaveCount(before+1);await expect(page.locator('#liveMode')).toHaveValue('session');await expect(page.locator('#liveTitle')).not.toHaveText('Prêt à jouer !');await expect(page.locator('#liveInfo')).not.toBeEmpty()});
test('boutons sous le chrono restent sur une seule ligne sans plein écran',async({page})=>{await page.setViewportSize({width:390,height:844});await page.evaluate(()=>tab('live'));await expect(page.locator('#liveFullButton')).toHaveCount(0);const result=await page.evaluate(()=>{const b=[...document.querySelectorAll('#liveActions button')].map(x=>x.getBoundingClientRect());return {count:b.length,top:new Set(b.map(x=>Math.round(x.top))).size,scroll:document.documentElement.scrollWidth,width:innerWidth}});expect(result.top).toBe(1);expect(result.scroll).toBeLessThanOrEqual(result.width+3)});


test('titres des fiches : article affiché et couleur de catégorie principale',async({page})=>{const result=await page.evaluate(()=>{const titles=data.map(g=>displayTitle(g[0]));const missing=titles.filter(t=>! /^(?:Le |La |Les |Un\b|Une\b|Des |L['’])/i.test(t));const cardHtml=card(data.find(g=>g[0]==='Duel au cercle'));return {count:titles.length,missing,display:displayTitle('Abécédaire'),hasColor:cardHtml.includes('color:'+categoryColor('Énergie'))};});expect(result.count).toBeGreaterThanOrEqual(122);expect(result.missing).toEqual([]);expect(result.display).toBe('L’Abécédaire');expect(result.hasColor).toBe(true)});

test('accueil ouvre le premier bouton et recherche principes/conseils',async({page})=>{
  await expect(page.locator('#random')).toBeVisible();
  await expect(page.locator('#seance')).toBeHidden();
  await expect(page.locator('nav button').first()).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'🧭 Principes et conseils'}).click();
  await page.locator('#principesSearch').fill('dragon');
  await expect(page.locator('#principesSearchResults')).toBeVisible();
  await expect(page.locator('#principesSearchResults')).toContainText('Le « oui, et… »');
  await expect(page.locator('#principesSearchResults')).toContainText('Exemple concret');
  await expect(page.locator('#principesSearchCount')).toContainText('résultat');
  await page.locator('#principesSearch').fill('silence');
  await expect(page.locator('#principesSearchResults')).toContainText('Ose les silences');
  await page.locator('#principesSearch').fill('mot-clé introuvable xyz');
  await expect(page.locator('#principesSearchResults')).toContainText('Aucun principe ni conseil');
  await page.locator('#principesSearch').fill('');
  await expect(page.locator('#principesHome')).toBeVisible();
});
test('principes et conseils accessibles en deux entrées',async({page})=>{
  await expect(page.locator('header .home-motto')).toHaveText('L’impro c’est l’art de rater !');
  await page.getByRole('button',{name:'🧭 Principes et conseils'}).click();
  await expect(page.locator('#principes')).toBeVisible();
  await expect(page.locator('#principesHome .principes-entry')).toHaveCount(2);
  await expect(page.locator('#principesView')).toBeHidden();
  await page.locator('#principesHome .principes-entry').nth(0).click();
  await expect(page.locator('#principesContent')).toBeVisible();
  await expect(page.locator('#principesContent')).toContainText('Le oui et');
  await page.locator('#principesView .principes-back').click();
  await page.locator('#principesHome .principes-entry').nth(1).click();
  await expect(page.locator('#adviceContent')).toBeVisible();
  await expect(page.locator('#adviceBeginnerContent .advice-card')).toHaveCount(10);
  await expect(page.locator('#adviceMediumContent .advice-card')).toHaveCount(10);
  await expect(page.locator('#adviceProContent .advice-card')).toHaveCount(10);
  await expect(page.locator('#adviceMediumContent')).toContainText('Engage-toi dans tes choix');
  await expect(page.locator('#adviceBeginnerContent .advice-card-content details')).toHaveCount(20);
});
test('principes classés par niveau avec principe et exemple repliables',async({page})=>{await page.evaluate(()=>{tab('principes');openPrincipesView('principesContent')});const root=page.locator('#principesContent');await expect(root.locator('.principle-level')).toHaveCount(4);await expect(root.locator('.principle-level:not(.principle-extra) .principle-item')).toHaveCount(17);await expect(root.locator('.principle-example')).toHaveCount(17);await expect(root.locator('.principle-example').first()).not.toHaveAttribute('open','');await root.locator('.principle-level').first().locator(':scope > summary').click();await expect(root.locator('.principle-level').first()).toHaveAttribute('open','');await root.locator('.principle-item').first().locator('> summary').click();await expect(root.locator('.principle-item').first()).toHaveAttribute('open','');await root.locator('.principle-example').first().locator('> summary').click();await expect(root.locator('.principle-example').first()).toHaveAttribute('open','');await expect(root).toContainText('Depuis trente ans qu’on se connaît, j’ai toujours eu du mal avec ton prénom !');await expect(root).toContainText('Montre, ne raconte pas');await expect(root).toContainText('Respecte la logique de ton univers');await expect(root).toContainText('Laisse les conséquences transformer le monde');const colors=await root.locator('.principle-item > summary b').evaluateAll(nodes=>[...new Set(nodes.map(n=>getComputedStyle(n).color))]);expect(colors).toHaveLength(3)});

test('ambiances guidées : application cohérente et réinitialisation',async({page})=>{
  await page.locator('[data-ambiance="stage"]').check();
  await page.locator('[data-ambiance="listen"]').check();
  await page.getByRole('button',{name:'Appliquer les ambiances'}).click();
  const values=await page.evaluate(()=>Object.fromEntries(IMPRO_CATEGORIES.map((c,i)=>[c,Number(document.getElementById('dynamic'+i).value)])));
  expect(values['Scène']).toBe(80);
  expect(values['Écoute']).toBe(80);
  expect(values['Cohésion']).toBe(80);
  expect(values['Énergie']).toBe(20);
  expect(values['Corps']).toBe(20);
  expect(await page.locator('#randomDynamic0').inputValue()).toBe(await page.locator('#dynamic0').inputValue());
  await page.evaluate(()=>tab('random'));
  await page.locator('#random').getByRole('button',{name:/Réinitialiser/}).click();
  await expect(page.locator('[data-ambiance="stage"]')).not.toBeChecked();
  await expect(page.locator('[data-ambiance="listen"]')).not.toBeChecked();
  await expect(page.locator('#ambianceStatus')).toContainText('restaurées');
});

test('schémas indicatifs accessibles dans la bibliothèque',async({page})=>{
  await page.evaluate(()=>tab('jeux'));
  await expect.poll(()=>page.locator('#jeux .exercise-schema svg').count()).toBeGreaterThan(0);
  const schema=page.locator('#jeux .exercise-schema svg').first();
  await expect(schema).toHaveAttribute('role','img');
  await expect(schema).toHaveAttribute('aria-label',/^Schéma :/);
  await expect(page.locator('#jeux .exercise-schema figcaption').first()).toContainText('Schéma indicatif');
});
