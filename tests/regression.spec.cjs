const {test,expect,devices}=require('@playwright/test');
for(const duration of ['45','55','60','90']){
 test('durée exacte '+duration+' min',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#libraryStatus')).toContainText('122 exercices');
  await page.locator('#duration').selectOption(duration);
  await page.getByRole('button',{name:'Générer ma séance'}).click();
  await expect(page.locator('#planSummary')).toContainText(duration+' minutes');
  await expect(page.locator('#plan>.card')).toHaveCount(5);
  const names=await page.locator('#plan>.card h3').allTextContents();
  expect(new Set(names).size).toBe(5);
 });
}
test('édition, suppression, rechargement, groupe et export',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#libraryStatus')).toContainText('122 exercices');
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await page.locator('#plan>.card').last().getByRole('button',{name:'✕'}).click();
 await expect(page.locator('#plan>.card')).toHaveCount(4);
 await page.reload();
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
 await page.goto('/');
 await expect(page.locator('#libraryStatus')).toContainText('122 exercices');
 await page.getByRole('button',{name:'Générer ma séance'}).click();
 await page.getByRole('button',{name:/Animateur/}).click();
 await page.locator('body').click({position:{x:5,y:5}});
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('#liveProgress')).toContainText('Exercice 2 / 5');
 await page.keyboard.press('ArrowLeft');
 await expect(page.locator('#liveProgress')).toContainText('Exercice 1 / 5');
});
