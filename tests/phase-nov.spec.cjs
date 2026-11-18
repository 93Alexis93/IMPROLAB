'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openSeance, reloadApp } = require('./helpers.cjs');

// Phase autonome de novembre : tirage repliable, échauffement, jeu seul en Régie, soirée, mes notes, fiche élève.

test('échauffement : ↺ garde le jeu, 🔄 en tire un autre, jamais « Impro libre »', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /J’ai 5 minutes/ }).click();
  await expect(page.locator('#stageView')).toBeVisible();
  const first = (await page.locator('#stageTitle').textContent()).trim();
  await page.getByRole('button', { name: 'Remettre le chrono à zéro' }).click();
  await expect(page.locator('#stageTitle')).toHaveText(first);
  await expect(page.locator('#stageProgress')).toHaveText('Échauffement express');
  const redraw = page.locator('#stageRedraw');
  await expect(redraw).toBeVisible();
  const seen = new Set([first]);
  let prev = first;
  for (let i = 0; i < 6; i++) {
    await redraw.click();
    const t = (await page.locator('#stageTitle').textContent()).trim();
    expect(t).not.toBe('Impro libre');
    expect(t).not.toBe(prev);
    expect((await page.locator('#stageConsigne').textContent()).trim().length).toBeGreaterThan(10);
    seen.add(t); prev = t;
  }
  expect(seen.size).toBeGreaterThan(2);
  await expect(page.locator('#stageClock')).toHaveText('05:00');
});

test('mode soirée : titre, consigne et explication complète sous le chrono', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { tab('live'); document.getElementById('soireePanel').open = true; });
  await page.getByRole('button', { name: /Jeu suivant/ }).click();
  const under = page.locator('#liveUnderClock');
  await expect(under).toBeVisible();
  const title = (await page.locator('#liveTitle').textContent()).trim();
  await expect(under.locator('.under-clock-title')).toHaveText(title);
  await expect(under.locator('.under-clock-consigne')).not.toBeEmpty();
  const more = under.locator('details.under-clock-more');
  await more.locator('summary').click();
  await expect(more).toContainText('Règle complète');
  // Depuis D36, le chrono reste collé en haut : on vérifie l'ordre dans la page, pas la position à l'écran.
  expect(await page.evaluate(() => Boolean(document.getElementById('liveClock').compareDocumentPosition(document.getElementById('liveUnderClock')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await page.evaluate(() => liveReset());
  await expect(page.locator('#liveTitle')).toHaveText(title);
  await expect(under.locator('.under-clock-title')).toHaveText(title);
  await under.getByRole('button', { name: /Autre jeu/ }).click();
  await expect(page.locator('#liveTitle')).not.toHaveText(title);
  await page.evaluate(() => { const m = document.getElementById('liveMode'); m.value = 'session'; m.dispatchEvent(new Event('change')); m.value = 'free'; m.dispatchEvent(new Event('change')); });
  await expect(page.locator('#liveTitle')).toHaveText('Impro libre');
  await expect(under).toBeHidden();
});

test('tirage en Régie : la séance préparée reste identique', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const titles = await page.locator('#plan .card h3').allTextContents();
  await page.evaluate(() => { tab('random'); pickRandomExercise(); });
  await page.locator('#randomExerciseUse').click();
  await expect(page.locator('#live')).toBeVisible();
  await expect(page.locator('#liveMode')).toHaveValue('free');
  expect(await page.locator('#plan .card h3').allTextContents()).toEqual(titles);
  const stored = await page.evaluate(() => localStorage.getItem('impro-current-plan') || '');
  for (const t of titles) expect(stored.includes(t) || stored === '').toBe(true);
});

test('mes notes : note d’origine et note perso gardée après rechargement', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.locator('#plan details.fiche-more').first().locator('summary').first().click();
  const notes = page.locator('#plan details.coach-notes').first();
  await notes.locator('summary').click();
  await expect(notes).toContainText('Ma note d’origine');
  const area = notes.locator('textarea');
  await area.fill('Super avec les 5e, finir plus tôt');
  const id = await area.getAttribute('data-my-note');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('impro-my-notes-v1') || '{}'));
  expect(stored[id]).toBe('Super avec les 5e, finir plus tôt');
  const keys = await page.evaluate(() => backupKeys());
  expect(keys).toContain('impro-my-notes-v1');
  await page.evaluate(() => tab('jeux'));
  const lib = page.locator(`#games textarea[data-my-note="${id}"]`);
  await expect(lib).toHaveValue('Super avec les 5e, finir plus tôt');
});

test('fiche élève : une seule page, objectif et fil conducteur, deux encadrés par ligne', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole('button', { name: /Fiches élèves/ }).click();
  await expect(page.locator('#studentSheets .student-page')).toHaveCount(1);
  await expect(page.locator('#studentSheets .student-head')).toContainText('Objectif de la séance');
  await expect(page.locator('#studentSheets .student-head')).toContainText('Fil conducteur');
  const n = await page.locator('#plan>.card:not(.session-objective) h3').count();
  await expect(page.locator('#studentSheets .student-sheet')).toHaveCount(n);
  await page.emulateMedia({ media: 'print' });
  const boxes = await page.locator('#studentSheets .student-sheet').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: r.width })));
  const xs = new Set(boxes.map(b => b.x));
  expect(xs.size).toBe(2);
  if (boxes.length > 1) expect(boxes[1].y).toBe(boxes[0].y);
  await page.emulateMedia({ media: 'screen' });
});

test('titres renommés : les données gardées sur l’appareil suivent le nouveau titre', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('impro-test-renames', JSON.stringify(['Le zombie a dit ton nom !', 'Ah, c’est super !', 'Cinq idées, zéro seconde pour réfléchir'])));
  await reloadApp(page);
  const v = await page.evaluate(() => JSON.parse(localStorage.getItem('impro-test-renames') || '[]'));
  expect(v).toEqual(['Le zombie', 'Le super mime', 'Le jeu des listes']);
  const titles = await page.evaluate(() => ['1-5', '1-38', '2-29'].map(id => libraryPayload.exercices.find(e => e.id === id).titre));
  expect(titles).toEqual(['Le zombie', 'Le jeu des listes', 'Le super mime']);
});

test('contact physique : filtre de la bibliothèque et tous les jeux dans le générateur', async ({ page }) => {
  await openApp(page);
  const stats = await page.evaluate(() => ({ off: libraryPayload.exercices.filter(e => !e.eligible_generateur).length, light: data.filter(g => g[16] === 'léger').length }));
  expect(stats.off).toBe(0);
  // 6 fiches en contact léger dans library.json, dont une mise de côté dans l’appli (D35).
  expect(stats.light).toBe(5);
  await page.evaluate(() => tab('jeux'));
  await page.evaluate(() => { const d = document.querySelector('#filterFold'); if (d) d.open = true; }); await page.selectOption('#contactFilter', 'léger');
  await expect(page.locator('#games .card')).toHaveCount(5);
  await expect(page.locator('#games .card').first()).toContainText('Contact léger');
  await page.evaluate(() => { const d = document.querySelector('#filterFold'); if (d) d.open = true; }); await page.selectOption('#contactFilter', 'aucun');
  // 98 avant la saison 3, plus 3-8 à 3-14 (18 nov.), plus 3-15 à 3-18 (pistes improwiki, 18 nov.) : toutes sans contact.
  await expect(page.locator('#games .card')).toHaveCount(109);
});
