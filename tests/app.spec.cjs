const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8765/';
async function libraryCount(page){return page.evaluate(async()=>((await (await fetch('library.json')).json()).exercices||[]).length)}
async function expectLibraryCount(page){const count=await libraryCount(page);await expect(page.locator('#libraryStatus')).toContainText(count+' exercices',{timeout:15000});return count}
test.beforeEach(async({page})=>{await page.goto(base);await expectLibraryCount(page)});
test('bibliothèque et générateur',async({page})=>{await expect(page.locator('#manualGame option')).toHaveCount(await libraryCount(page));await page.evaluate(()=>generate());await expect(page.locator('#plan .card')).toHaveCount(5)});
test('huit catégories et 400 mots sans doublons',async({page})=>{const result=await page.evaluate(()=>({keys:Object.keys(DRAW_DEFAULTS),words:DRAW_DEFAULTS.Mot}));expect(result.keys).toHaveLength(8);expect(result.keys).not.toContain('Genre');expect(result.words).toHaveLength(400);expect(new Set(result.words.map(x=>x.toLowerCase())).size).toBe(400);await page.evaluate(()=>drawAll());await expect(page.locator('#drawResults .draw-result')).toHaveCount(8)});
test('restauration de la liste par défaut reste sauvegardée',async({page})=>{await page.evaluate(()=>{document.getElementById('drawEditCategory').value='6';drawShowEditor();document.getElementById('drawEditor').value='Unique';drawSaveEditor();drawResetEditor()});await page.reload();await expectLibraryCount(page);const words=await page.evaluate(()=>drawLists.Mot.length);expect(words).toBe(400)});
test('répartition de cinq joueurs en trios',async({page})=>{const groups=await page.evaluate(()=>{rosterState.college=['A','B','C','D','E'].map(name=>({name,present:true}));document.getElementById('rosterType').value='college';document.getElementById('rosterFormat').value='3';rosterDraw();return [...document.querySelectorAll('#groupsResult .card p')].map(p=>p.textContent.split(' · ').length)});expect(groups.sort()).toEqual([2,3])});
test('chronomètre libre démarre et se met en pause',async({page})=>{await page.evaluate(()=>{document.getElementById('liveMode').value='free';liveModeChange();liveToggle()});await expect.poll(()=>page.evaluate(()=>liveRunning)).toBe(true);await page.waitForTimeout(1100);await page.evaluate(()=>liveToggle());expect(await page.evaluate(()=>liveElapsed())).toBeGreaterThan(900)});
test('séance sauvegardée ne réinjecte pas de HTML actif',async({page})=>{await page.evaluate(()=>{localStorage.setItem('impro-history',JSON.stringify([{date:new Date().toISOString(),html:'<div class="card"><h3>Test</h3><p><img src=x onerror=alert(1)>Texte</p></div>'}]));loadSession(0)});expect(await page.locator('#plan img').count()).toBe(0);await expect(page.locator('#plan h3')).toHaveText('Test')});
test('interface mobile sans débordement horizontal majeur',async({page})=>{await page.setViewportSize({width:390,height:844});await page.reload();await expectLibraryCount(page);const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);expect(widths[0]).toBeLessThanOrEqual(widths[1]+3)});

test('régie V3 : présence et groupes synchronisés',async({page})=>{await page.evaluate(()=>{rosterState.college=['A','B','C','D'].map(name=>({name,present:true}));document.getElementById('liveRosterType').value='college';liveRosterRefresh()});await expect(page.locator('#livePlayersCount')).toHaveText('4 présents');await page.evaluate(()=>liveRosterPresence(0,false));await expect(page.locator('#livePlayersCount')).toHaveText('3 présents');await page.evaluate(()=>{document.getElementById('liveRosterFormat').value='2';liveRosterDraw()});await expect(page.locator('#liveGroupsResult .card')).toHaveCount(2)});

test('régie compacte : panneaux repliables et bouton Plan supprimé',async({page})=>{await page.evaluate(()=>tab('live'));expect(await page.locator('#live button').allTextContents()).not.toContain('📋 Plan');await expect(page.locator('#live .regie-fold')).toHaveCount(4);await expect(page.locator('#live .regie-fold.regie-draw')).not.toHaveAttribute('open');await page.locator('#live .regie-fold.regie-draw > summary').click();await expect(page.locator('#live .regie-fold.regie-draw')).toHaveAttribute('open','');await expect(page.locator('#live #liveStart')).toBeVisible()});

test('Concentration reste une étiquette sans effet sur la séance générée',async({page})=>{
 const result=await page.evaluate(()=>{
  const originalData=data.map(g=>g.slice()), originalRandom=Math.random;
  const savedUsage=localStorage.getItem('impro-game-usage-v1'), savedRecent=localStorage.getItem('impro-recent-games');
  const snapshot=()=>[...document.querySelectorAll('#plan .card')].map(card=>[card.querySelector('h3')?.textContent,card.querySelector('small')?.textContent]);
  const hasLabel=originalData.some(g=>(g[11]||[]).includes('Concentration'));
  Math.random=()=>0.37;localStorage.removeItem('impro-game-usage-v1');localStorage.removeItem('impro-recent-games');
  generate();const withLabel=snapshot();
  data=originalData.map(g=>g.slice().map((v,i)=>i===11&&Array.isArray(v)?v.filter(tag=>tag!=='Concentration'):v));
  localStorage.removeItem('impro-game-usage-v1');localStorage.removeItem('impro-recent-games');
  generate();const withoutLabel=snapshot();
  data=originalData;Math.random=originalRandom;
  if(savedUsage===null)localStorage.removeItem('impro-game-usage-v1');else localStorage.setItem('impro-game-usage-v1',savedUsage);
  if(savedRecent===null)localStorage.removeItem('impro-recent-games');else localStorage.setItem('impro-recent-games',savedRecent);
  return {hasLabel,withLabel,withoutLabel};
 });
 expect(result.hasLabel).toBe(true);expect(result.withLabel).toHaveLength(5);expect(result.withoutLabel).toEqual(result.withLabel);
});
