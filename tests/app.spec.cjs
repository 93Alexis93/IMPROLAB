const {test,expect}=require('@playwright/test');
const {openTab, setDuration, openFineSettings, openApp,reloadApp,libraryCount,openSeance}=require('./helpers.cjs');
test.beforeEach(async({page},testInfo)=>{await openApp(page,{dismissWelcome:!testInfo.title.includes('tutoriel d’accueil')})});
test('bibliothèque et générateur',async({page})=>{await expect(page.locator('#manualGame option')).toHaveCount(libraryCount);await openSeance(page);await page.evaluate(()=>generate());await expect(page.locator('#plan .card')).toHaveCount(6);await expect(page.locator('#plan .session-objective')).toBeVisible();await expect(page.locator('#plan .session-objective')).toContainText('Fil conducteur')});
test('durées libres : répartition exacte et scène finale de 15 minutes minimum',async({page})=>{const result=await page.evaluate(()=>{const values=[...document.querySelectorAll('#duration option')].map(o=>Number(o.value));return {values,allocations:values.map(duration=>({duration,parts:buildTimelineMinutes(duration)}))}});expect(result.values).toHaveLength(18);expect(result.values[0]).toBe(35);expect(result.values.at(-1)).toBe(120);for(const item of result.allocations){expect(item.parts.reduce((sum,n)=>sum+n,0)).toBe(item.duration);expect(item.parts.at(-1)).toBeGreaterThanOrEqual(15)}await openSeance(page);await setDuration(page,'75');await page.evaluate(()=>generate());await expect(page.locator('#plan .session-objective')).toBeVisible();await expect(page.locator('#duration')).toHaveValue('75')});
test('huit catégories et 400 mots sans doublons',async({page})=>{const result=await page.evaluate(()=>({keys:Object.keys(DRAW_DEFAULTS),words:DRAW_DEFAULTS.Mot}));expect(result.keys).toHaveLength(8);expect(result.keys).not.toContain('Genre');expect(result.words).toHaveLength(400);expect(new Set(result.words.map(x=>x.toLowerCase())).size).toBe(400);await page.evaluate(()=>drawAll());await expect(page.locator('#drawResults .draw-result')).toHaveCount(8)});
test('restauration de la liste par défaut reste sauvegardée',async({page})=>{await page.evaluate(()=>{document.getElementById('drawEditCategory').value='6';drawShowEditor();document.getElementById('drawEditor').value='Unique';drawSaveEditor();drawResetEditor()});await reloadApp(page);await expect(page.locator('#libraryStatus')).toContainText(`${libraryCount} exercices`);const words=await page.evaluate(()=>drawLists.Mot.length);expect(words).toBe(400)});
test('répartition de cinq joueurs en trios',async({page})=>{const groups=await page.evaluate(()=>{rosterState.college=['A','B','C','D','E'].map(name=>({name,present:true}));document.getElementById('rosterType').value='college';document.getElementById('rosterFormat').value='3';rosterDraw();return [...document.querySelectorAll('#groupsResult .card p')].map(p=>p.textContent.split(' · ').length)});expect(groups.sort()).toEqual([2,3])});
test('chronomètre libre démarre et se met en pause',async({page})=>{await page.evaluate(()=>{document.getElementById('liveMode').value='free';liveModeChange();liveToggle()});await expect.poll(()=>page.evaluate(()=>liveRunning)).toBe(true);await page.waitForTimeout(1100);await page.evaluate(()=>liveToggle());expect(await page.evaluate(()=>liveElapsed())).toBeGreaterThan(900)});
test('séance sauvegardée ne réinjecte pas de HTML actif',async({page})=>{await page.evaluate(()=>{localStorage.setItem('impro-history',JSON.stringify([{date:new Date().toISOString(),html:'<div class="card"><h3>Test</h3><p><img src=x onerror=alert(1)>Texte</p></div>'}]));loadSession(0)});expect(await page.locator('#plan img').count()).toBe(0);await expect(page.locator('#plan h3')).toHaveText('Test')});
test('interface mobile sans débordement horizontal majeur',async({page})=>{await page.setViewportSize({width:390,height:844});await reloadApp(page);await expect(page.locator('#libraryStatus')).toContainText(`${libraryCount} exercices`);const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);expect(widths[0]).toBeLessThanOrEqual(widths[1]+3)});

test('régie V3 : présence et groupes synchronisés',async({page})=>{await page.evaluate(()=>{rosterState.college=['A','B','C','D'].map(name=>({name,present:true}));document.getElementById('liveRosterType').value='college';liveRosterRefresh()});await expect(page.locator('#livePlayersCount')).toHaveText('4 présents');await page.evaluate(()=>liveRosterPresence(0,false));await expect(page.locator('#livePlayersCount')).toHaveText('3 présents');await page.evaluate(()=>{document.getElementById('liveRosterFormat').value='2';liveRosterDraw()});await expect(page.locator('#liveGroupsResult .card')).toHaveCount(2)});

test('régie compacte : panneaux repliables et bouton Plan supprimé',async({page})=>{await page.evaluate(()=>tab('live'));expect(await page.locator('#live button').allTextContents()).not.toContain('📋 Plan');await expect(page.locator('#live .regie-fold')).toHaveCount(4);await expect(page.locator('#live .regie-fold.regie-draw')).not.toHaveAttribute('open');await page.locator('#live .regie-fold.regie-draw > summary').click();await expect(page.locator('#live .regie-fold.regie-draw')).toHaveAttribute('open','');await expect(page.locator('#live #liveStart')).toBeVisible()});

// Depuis 52bda99, les curseurs Séance et Exercice aléatoire sont volontairement synchronisés.
test('tutoriel d’accueil et curseurs synchronisés',async({page})=>{await expect(page.locator('#welcomeScreen')).toBeVisible();await expect(page.locator('#welcomeScreen .welcome-tutorial')).toContainText('Tire un exercice');await page.locator('#welcomeScreen .welcome-enter').click();await expect(page.locator('#welcomeScreen')).toHaveCount(0);await page.evaluate(()=>{document.getElementById('dynamic1').value=22;updateDynamic(1);document.getElementById('randomDynamic1').value=88;updateRandomDynamic(1)});expect(await page.locator('#dynamic1').inputValue()).toBe('88');expect(await page.locator('#randomDynamic1').inputValue()).toBe('88');await reloadApp(page);await expect(page.locator('#dynamic1')).toHaveValue('88');await expect(page.locator('#randomDynamic1')).toHaveValue('88')});
test('tirage aléatoire filtré : validation ajoute à la séance et à la régie',async({page})=>{await page.evaluate(()=>tab('random'));await page.evaluate(()=>{for(let i=0;i<10;i++)document.getElementById('randomDynamic'+i).value=0;document.getElementById('randomDynamic1').value=100;updateRandomDynamic(1)});await page.evaluate(()=>pickRandomExercise());await expect(page.locator('#randomExerciseResult')).not.toContainText('Aucun exercice validé');await expect(page.locator('#randomExerciseUse')).toBeVisible();const before=await page.locator('#plan .card').count();await page.evaluate(()=>useRandomExercise());await expect(page.locator('#plan .card')).toHaveCount(before+1);await expect(page.locator('#liveMode')).toHaveValue('session');await expect(page.locator('#liveTitle')).not.toHaveText('Prêt à jouer !');await expect(page.locator('#liveInfo')).not.toBeEmpty()});
test('boutons sous le chrono restent sur une seule ligne sans plein écran',async({page})=>{await page.setViewportSize({width:390,height:844});await page.evaluate(()=>tab('live'));await expect(page.locator('#liveFullButton')).toHaveCount(0);const result=await page.evaluate(()=>{const b=[...document.querySelectorAll('#liveActions button')].map(x=>x.getBoundingClientRect());return {count:b.length,top:new Set(b.map(x=>Math.round(x.top))).size,scroll:document.documentElement.scrollWidth,width:innerWidth}});expect(result.top).toBe(1);expect(result.scroll).toBeLessThanOrEqual(result.width+3)});


test('titres des fiches : article affiché et couleur de catégorie principale',async({page})=>{const result=await page.evaluate(()=>{const titles=data.map(g=>displayTitle(g[0]));const missing=titles.filter(t=>! /^(?:Le |La |Les |Un\b|Une\b|Des |L['’])/i.test(t));const cardHtml=card(data.find(g=>g[0]==='Duel au cercle'));return {count:titles.length,missing,display:displayTitle('Abécédaire'),hasColor:cardHtml.includes('color:'+categoryColor('Énergie'))};});expect(result.count).toBeGreaterThanOrEqual(122);expect(result.missing).toEqual([]);expect(result.display).toBe('L’Abécédaire');expect(result.hasColor).toBe(true)});

test('accueil ouvre le premier bouton et recherche principes/conseils',async({page})=>{
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#seance')).toBeHidden();
  await expect(page.locator('nav button').first()).toHaveAttribute('aria-current','page');
  await openTab(page,'Principes et conseils');
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
  await expect(page.locator('header .home-motto')).toHaveText('L’impro, c’est l’école de la vie : on apprend à écouter, oser et construire ensemble.');
  await openTab(page,'Principes et conseils');
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
// Page refaite le 22/10 (commit 1987273) : sept fiches issues de principes-impro.json,
// chacune avec un niveau, un exemple et des conseils repliables par niveau.
test('principes classés par niveau avec principe et exemple repliables',async({page})=>{await page.evaluate(()=>{tab('principes');openPrincipesView('principesContent')});const root=page.locator('#principesContent');await expect(root.locator('.principle-card')).toHaveCount(7);await expect(root.locator('.principle-example')).toHaveCount(7);const levels=await root.locator('.principle-level').allTextContents();expect(levels).toHaveLength(7);expect([...new Set(levels)].sort()).toEqual(['Débutant','Moyen','Pro']);await expect(root.locator('.principle-advice')).toHaveCount(21);await expect(root.locator('.principle-advice[open]')).toHaveCount(0);const advice=root.locator('.principle-advice').first();await advice.locator(':scope > summary').click();await expect(advice).toHaveAttribute('open','');await expect(root).toContainText('Depuis trente ans qu’on se connaît, j’ai toujours eu du mal avec ton prénom !');await expect(root).toContainText('Montre, ne raconte pas');await expect(root).toContainText('L’art de rater')});

test('ambiances guidées : application cohérente et réinitialisation',async({page})=>{
  await openSeance(page);
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
  await page.locator('[data-ambiance="stage"]').uncheck();
  await page.locator('[data-ambiance="listen"]').uncheck();
  await page.getByRole('button',{name:'Appliquer les ambiances'}).click();
  const restored=await page.evaluate(()=>Object.fromEntries(IMPRO_CATEGORIES.map((c,i)=>[c,Number(document.getElementById('dynamic'+i).value)])));
  const defaults=await page.evaluate(()=>Object.fromEntries(IMPRO_CATEGORIES.map(c=>[c,DEFAULT_DYNAMICS[c]*20])));
  expect(restored).toEqual(defaults);
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

test('mise en page responsive : 360, 390, 768 et 1280 px',async({page})=>{
  for(const width of [360,390,768,1280]){
    await page.setViewportSize({width,height:900});
    await reloadApp(page);
    const metrics=await page.evaluate(()=>({
      viewport:innerWidth,
      document:document.documentElement.scrollWidth,
      body:document.body.scrollWidth
    }));
    expect(metrics.document, `Débordement horizontal à ${width}px`).toBeLessThanOrEqual(width+3);
    expect(metrics.body, `Débordement du body à ${width}px`).toBeLessThanOrEqual(width+3);
  }
});

test('impression A4 : séance et schéma restent visibles',async({page})=>{
  await page.evaluate(()=>{tab('seance');generate()});
  await page.emulateMedia({media:'print'});
  await expect(page.locator('#seance')).toBeVisible();
  await expect(page.locator('#plan .card').first()).toBeVisible();
  const printStyles=await page.locator('#plan .card').first().evaluate(el=>({
    pageRule:[...document.styleSheets].some(sheet=>{try{return [...sheet.cssRules].some(rule=>rule.type===CSSRule.PAGE_RULE&&/A4/i.test(rule.cssText))}catch{return false}}),
    display:getComputedStyle(el).display,
    color:getComputedStyle(el).color
  }));
  expect(printStyles.pageRule).toBe(true);
  expect(printStyles.display).not.toBe('none');
  await page.evaluate(()=>tab('jeux'));
  await expect.poll(()=>page.locator('#jeux .exercise-schema svg').count()).toBeGreaterThan(0);
  await expect(page.locator('#jeux .exercise-schema').first()).toBeVisible();
});
test('navigation principale : aucune erreur JavaScript de page',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  for(const section of ['home','seance','jeux','live','random','groupes','cahier','principes','historique']){
    await page.evaluate(id=>tab(id),section);
    await expect(page.locator('#'+section)).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('tirage rapide depuis l’accueil : exercice validé et accès à sa fiche',async({page})=>{
  await page.evaluate(()=>tab('home'));
  await page.getByRole('button',{name:/Tirer un exercice/}).last().click();
  const result=page.locator('#homeQuickResult');
  await expect(result.locator('h4')).toBeVisible();
  await expect(result.locator('p').first()).toBeVisible();
  const title=await result.locator('h4').innerText();
  const rawTitle=await page.evaluate(name=>{
    const game=data.find(g=>displayTitle(g[0])===name);
    if(!game||!isEligibleGame(game,{includeExternal:false,includeIncomplete:false}))return null;
    return game[0];
  },title);
  expect(rawTitle).not.toBeNull();
  await result.getByRole('button',{name:'Voir la fiche'}).click();
  await expect(page.locator('#jeux')).toBeVisible();
  await expect(page.locator('#search')).toHaveValue(rawTitle);
  await expect(page.locator('#games')).toContainText(title);
});

test('séance : ouverture énergisante et dernière fiche de catégorie principale Scène',async({page})=>{await page.evaluate(()=>generate());const result=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#plan>.card[data-stage-index]')];const title=card=>card.querySelector('h3')?.textContent;const first=data.find(g=>displayTitle(g[0])===title(cards[0]));const last=data.find(g=>displayTitle(g[0])===title(cards.at(-1)));return {count:cards.length,first:first&&{primary:first[1],secondary:first[11]||[]},last:last&&{primary:last[1],secondary:last[11]||[]}}});expect(result.count).toBe(5);expect(['Énergie','Lâcher-prise','Amusement'].some(c=>result.first?.primary===c||result.first?.secondary.includes(c))).toBe(true);expect(result.last?.primary).toBe('Scène')});
