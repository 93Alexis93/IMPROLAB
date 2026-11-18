'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openSeance, openTab, reloadApp } = require('./helpers.cjs');

// Chantier « La séance d'abord » (D36) : chrono en haut de la Régie, fiche courte partout,
// tirage animé, Accueil sans tirage, enregistrement refusé signalé, restauration annulable.

async function generated(page) {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await expect(page.locator('#plan>.card[data-stage-index]')).toHaveCount(5);
}

for (const [name, width, height] of [['iPhone SE', 375, 667], ['iPhone 13', 390, 844]]) {
  test(`régie (${name}) : chrono et ▶ visibles sans défiler, et encore après défilement`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await generated(page);
    await openTab(page, 'Régie');
    for (const id of ['#liveClock', '#liveStart']) {
      const box = await page.locator(id).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
    await page.evaluate(() => scrollTo(0, 900));
    await page.waitForTimeout(100);
    const after = await page.locator('#liveStart').boundingBox();
    expect(after.y).toBeGreaterThanOrEqual(0);
    expect(after.y + after.height).toBeLessThanOrEqual(height);
    expect(after.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test('en-tête réduit hors de l’Accueil', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('header .header-slogan')).toBeVisible();
  await openTab(page, 'Régie');
  await expect(page.locator('header .header-slogan')).toBeHidden();
  expect((await page.locator('header').boundingBox()).height).toBeLessThan(60);
});

test('fiche courte en séance : titre, durée, aussi appelé ; le reste se déroule et se referme', async ({ page }) => {
  await generated(page);
  const card = page.locator('#plan>.card[data-stage-index]').first();
  await expect(card.locator(':scope>small')).toContainText('min');
  await expect(card.locator(':scope>h3')).toBeVisible();
  const title = (await card.locator(':scope>h3').textContent()).trim();
  const aka = await page.evaluate(t => gameAliases(t).length, title);
  await expect(card.locator(':scope>.exercise-aliases')).toHaveCount(aka ? 1 : 0);
  const more = card.locator(':scope>details.fiche-more');
  await expect(more).toHaveCount(1);
  await expect(more).not.toHaveAttribute('open', '');
  // (WebKit : Playwright juge « visible » le contenu d'un repli fermé ; on mesure la hauteur du repli.)
  expect((await more.boundingBox()).height).toBeLessThan(60);
  expect((await more.locator(':scope>summary').boundingBox()).height).toBeGreaterThanOrEqual(44);
  await more.locator(':scope>summary').click();
  for (const label of ['🎓 Consigne', '🔀 Variante', '🎯 Objectif du prof', '📝 Mes notes']) await expect(more.locator('summary', { hasText: label })).toBeVisible();
  // Changer d'écran referme tout.
  await openTab(page, 'Accueil');
  await openTab(page, 'Préparer');
  await expect(more).not.toHaveAttribute('open', '');
  // Une carte de séance repliée tient en moins d'un demi-écran d'iPhone 13.
  expect((await card.boundingBox()).height).toBeLessThan(422);
});

test('remplacer un exercice garde une seule fiche repliée, sans ancien schéma', async ({ page }) => {
  await generated(page);
  const card = page.locator('#plan>.card[data-stage-index]').first();
  const before = (await card.locator(':scope>h3').textContent()).trim();
  await card.getByRole('button', { name: '🔄 Remplacer' }).click();
  await expect(card.locator(':scope>h3')).not.toHaveText(before);
  await expect(card.locator('details.fiche-more')).toHaveCount(1);
  expect(await card.locator('figure.exercise-schema').count()).toBeLessThanOrEqual(1);
  expect(await card.locator(':scope>.exercise-aliases').count()).toBeLessThanOrEqual(1);
  // L'ordre reste : fiche puis boutons d'édition.
  expect(await card.evaluate(c => [...c.children].indexOf(c.querySelector(':scope>.fiche-more')) < [...c.children].indexOf(c.querySelector(':scope>.edit-actions')))).toBe(true);
});

test('une ancienne séance enregistrée sans repli est repliée à l’ouverture', async ({ page }) => {
  await generated(page);
  // Simule une séance d'avant D36 : détails posés à plat dans la carte.
  await page.evaluate(() => {
    document.querySelectorAll('#plan>.card details.fiche-more').forEach(d => { const body = d.querySelector('.fiche-more-body'); d.replaceWith(...body.children); });
    localStorage.setItem('impro-last-plan', document.getElementById('plan').innerHTML);
  });
  await reloadApp(page);
  await openSeance(page);
  const card = page.locator('#plan>.card[data-stage-index]').first();
  await expect(card.locator(':scope>details.fiche-more')).toHaveCount(1);
  await expect(card.locator(':scope>details.coach-quick')).toHaveCount(0);
});

test('régie : la consigne courte reste visible, le reste dans « Voir la fiche complète »', async ({ page }) => {
  await generated(page);
  await openTab(page, 'Régie');
  await expect(page.locator('#liveCoachPanel .fiche-consigne')).toBeVisible();
  await expect(page.locator('#liveCoachPanel .fiche-consigne')).toContainText('Consigne :');
  await expect(page.locator('#liveCoachPanel details.fiche-more')).not.toHaveAttribute('open', '');
  await expect(page.locator('#liveCoachPanel details.fiche-more summary', { hasText: '🎓 Consigne' })).toHaveCount(0);
});

test('bibliothèque : fiches courtes, 20 à la fois, « Voir plus », la recherche repart de 20', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  await expect(page.locator('#games .card:visible')).toHaveCount(20);
  const first = page.locator('#games .card').first();
  await expect(first.locator('.duration-pill')).toContainText('min');
  await expect(first.locator('.favorite')).toBeVisible();
  await expect(first.locator('details.fiche-more')).not.toHaveAttribute('open', '');
  await page.locator('.library-more').click();
  await expect(page.locator('#games .card:visible')).toHaveCount(40);
  await first.locator('.favorite').click();
  await expect(page.locator('#games .card:visible')).toHaveCount(40);
  await page.locator('#search').fill('a');
  expect(await page.locator('#games .card:visible').count()).toBeLessThanOrEqual(20);
});

test('exercice aléatoire : les titres défilent puis s’arrêtent sur le jeu tiré', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Exercice aléatoire');
  await page.getByRole('button', { name: '🎲 Tirer un exercice' }).click();
  await expect(page.locator('#randomExerciseResult .reel-window')).toBeVisible();
  await expect(page.locator('#randomExerciseUse')).toBeHidden();
  const picked = await page.evaluate(() => displayTitle(randomExerciseCurrent[0]));
  await expect(page.locator('#randomExerciseResult .reel')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('#randomExerciseResult b').first()).toHaveText(picked);
  await expect(page.locator('#randomExerciseUse')).toBeVisible();
  await expect(page.locator('#randomExerciseResult details.fiche-more')).toHaveCount(1);
});

test('exercice aléatoire : sans animation si l’iPhone réduit les animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await page.evaluate(() => { tab('random'); pickRandomExercise(); });
  expect(await page.locator('#randomExerciseResult .reel').count()).toBe(0);
  await expect(page.locator('#randomExerciseUse')).toBeVisible();
});

test('accueil : plus de tirage ni de séance ; échauffement express, principe du jour, défi du jour', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#home').getByRole('button', { name: /Tirer un exercice/ })).toHaveCount(0);
  await expect(page.locator('#homeNext')).toHaveCount(0);
  await expect(page.locator('#home')).not.toContainText('Ta prochaine séance');
  await expect(page.locator('#home').getByRole('button', { name: /J’ai 5 minutes/ })).toBeVisible();
  await expect(page.locator('#homePrinciple')).toBeVisible();
  const principle = (await page.locator('#homePrinciple h3').textContent()).trim();
  const validated = await page.evaluate(async () => (await (await fetch('principes-impro.json')).json()).principes.filter(p => p.statut === 'validé').map(p => p.titre));
  expect(validated).toContain(principle);
  await expect(page.locator('#homeChallenge')).toBeVisible();
  await expect(page.locator('#homeChallenge')).toContainText('DÉFI DU JOUR');
  expect((await page.locator('#homeChallenge h3').textContent()).trim().length).toBeGreaterThan(2);
  expect((await page.locator('#homeChallenge p').textContent()).trim().length).toBeGreaterThan(20);
  // Les trois blocs se suivent : échauffement, principe, défi.
  const order = await page.evaluate(() => ['.home-actions', '#homePrinciple', '#homeChallenge'].map(q => document.querySelector(q).getBoundingClientRect().top));
  expect(order[0]).toBeLessThan(order[1]);
  expect(order[1]).toBeLessThan(order[2]);
});

test('défi du jour : 60 défis différents, un par jour, le même toute la journée', async ({ page }) => {
  await openApp(page);
  const info = await page.evaluate(() => ({
    n: HOME_CHALLENGES.length,
    titles: new Set(HOME_CHALLENGES.map(c => c[0])).size,
    texts: new Set(HOME_CHALLENGES.map(c => c[1])).size,
    empty: HOME_CHALLENGES.filter(c => !c[0].trim() || c[1].trim().length < 20).length,
    d0: challengeOfDay(100)[0], d1: challengeOfDay(101)[0], back: challengeOfDay(100 + HOME_CHALLENGES.length)[0], neg: challengeOfDay(-1)[0]
  }));
  expect(info.n).toBeGreaterThanOrEqual(50);
  expect(info.titles).toBe(info.n);
  expect(info.texts).toBe(info.n);
  expect(info.empty).toBe(0);
  expect(info.d0).not.toBe(info.d1);
  expect(info.back).toBe(info.d0);
  expect(typeof info.neg).toBe('string');
  const first = (await page.locator('#homeChallenge h3').textContent()).trim();
  await page.evaluate(() => { tab('seance'); tab('home'); });
  expect((await page.locator('#homeChallenge h3').textContent()).trim()).toBe(first);
});

test('enregistrement refusé par l’appareil : un message le dit', async ({ page }) => {
  await openApp(page);
  // Simule un stockage plein, uniquement pour la clé des favoris.
  await page.evaluate(() => {
    const patched = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'impro-favorites') { try { patched.call(this, k, 'x'.repeat(20 * 1024 * 1024)); } catch (e) { throw e; } } return patched.call(this, k, v); };
  });
  await openTab(page, 'Bibliothèque');
  await page.locator('#games .favorite').first().click();
  await expect(page.locator('#storageWarn')).toBeVisible();
  await expect(page.locator('#storageWarn')).toContainText('Pas enregistré');
  await page.locator('#storageWarn').getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#storageWarn')).toBeHidden();
});

test('restauration : les données d’avant sont gardées et la restauration s’annule', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('impro-show-v1', JSON.stringify({ title: 'Avant', items: [] })));
  const backup = { format: 'impro-lab-sauvegarde', version: 1, exportedAt: new Date().toISOString(), data: { 'impro-show-v1': JSON.stringify({ title: 'Restauré', items: [] }) } };
  const reloaded = page.waitForEvent('load');
  await page.locator('#backupImport').setInputFiles({ name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await reloaded;
  await expect(page.locator('#libraryStatus')).toContainText('exercices', { timeout: 15000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('impro-show-v1')).title)).toBe('Restauré');
  await expect(page.locator('#backupUndo')).toBeVisible();
  const back = page.waitForEvent('load');
  await page.locator('#backupUndo').getByRole('button', { name: /Annuler la restauration/ }).click();
  await back;
  await expect(page.locator('#libraryStatus')).toContainText('exercices', { timeout: 15000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('impro-show-v1')).title)).toBe('Avant');
  expect(await page.evaluate(() => localStorage.getItem('improlab-restore-undo'))).toBeNull();
});
