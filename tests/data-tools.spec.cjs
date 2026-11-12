'use strict';

const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { openApp, openSeance, openTab, waitForReady } = require('./helpers.cjs');

// Sauvegarde complète, avis 👍/👎, présences, caucus, échauffement express, fiches élèves.

test('sauvegarde complète : un fichier avec toutes les données, puis restauration après effacement', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await openSeance(page);
  await page.locator('#groupProfile').selectOption('copains');
  await page.evaluate(() => { rosterState.copains = ['Max', 'Jo'].map(name => ({ name, present: true })); rosterSave(); localStorage.setItem('impro-show-v1', JSON.stringify({ title: 'Gala', when: '', roster: 'troupe', items: [] })); });
  await openTab(page, 'Accueil');
  await page.evaluate(() => { navigator.share = undefined; });
  const download = page.waitForEvent('download');
  await page.evaluate(() => { const d = document.querySelector('.home-backup'); if (d) d.open = true; }); await page.getByRole('button', { name: /Tout sauvegarder/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^impro-lab-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();
  const backup = JSON.parse(fs.readFileSync(path, 'utf8'));
  expect(backup.format).toBe('impro-lab-sauvegarde');
  expect(Object.keys(backup.data)).toEqual(expect.arrayContaining(['impro-rosters-v1', 'impro-group-profiles-v1', 'impro-show-v1']));
  expect(Object.keys(backup.data).every(k => k.startsWith('impro-'))).toBe(true);
  await expect(page.locator('#backupStatus')).toContainText('Sauvegarde téléchargée');

  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('impro-')) localStorage.removeItem(k); });
  await page.reload();
  await waitForReady(page);
  await openTab(page, 'Accueil');
  await page.locator('#backupImport').setInputFiles({ name: 'faux.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"autre"}') });
  await expect(page.locator('#backupStatus')).toContainText('Restauration impossible');

  const reloaded = page.waitForEvent('load');
  await page.locator('#backupImport').setInputFiles(path);
  await reloaded;
  await waitForReady(page);
  await openSeance(page);
  await expect(page.locator('#groupProfile')).toHaveValue('copains');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterList')).toContainText('Max');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('impro-show-v1')).title)).toBe('Gala');
});

test('avis 👍/👎 : enregistrés par exercice, orientent le générateur du groupe, proposent d’écarter après deux 👎', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  await page.evaluate(() => { const a = readHistory(); a.unshift(JSON.parse(JSON.stringify(a[0]))); localStorage.setItem('impro-history', JSON.stringify(a)); });
  await openTab(page, 'Historique');
  const first = page.locator('#historyResult .card').nth(0), second = page.locator('#historyResult .card').nth(1);
  await first.locator('.history-review > summary').click();
  await second.locator('.history-review > summary').click();
  const titles = await first.locator('.review-vote > span:first-child').allTextContents();
  expect(titles).toHaveLength(5);

  await first.getByRole('button', { name: 'A bien marché : ' + titles[0] }).click();
  await expect(first.getByRole('button', { name: 'A bien marché : ' + titles[0] })).toHaveAttribute('aria-pressed', 'true');
  const bonus = await page.evaluate(t => { const g = data.find(x => displayTitle(x[0]) === t); return gameFeedbackBonus(g[0], readGroupFeedback()); }, titles[0]);
  expect(bonus).toBeGreaterThan(0);

  await first.getByRole('button', { name: 'À revoir : ' + titles[1] }).click();
  await expect(first.locator('.review-votes [aria-live]')).not.toContainText('L’écarter');
  await second.getByRole('button', { name: 'À revoir : ' + titles[1] }).click();
  await second.getByRole('button', { name: /L’écarter pour ce groupe/ }).click();
  const excluded = await page.evaluate(t => { const g = data.find(x => displayTitle(x[0]) === t); return readExcluded('college').includes(g[0]); }, titles[1]);
  expect(excluded).toBe(true);
  expect(await page.evaluate(t => { const g = data.find(x => displayTitle(x[0]) === t); return gameFeedbackBonus(g[0], readGroupFeedback()); }, titles[1])).toBeLessThan(0);

  await first.getByRole('button', { name: 'A bien marché : ' + titles[0] }).click();
  await expect(first.getByRole('button', { name: 'A bien marché : ' + titles[0] })).toHaveAttribute('aria-pressed', 'false');
});

test('présences : une feuille par jour et par effectif, avec le décompte par joueur', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { rosterState.college = ['Lina', 'Sam', 'Max'].map(name => ({ name, present: name !== 'Max' })); rosterSave(); rosterRender(); });
  await openTab(page, 'Groupes');
  await page.locator('#attendancePanel > summary').click();
  await expect(page.locator('#attendanceSummary')).toContainText('Aucune présence');
  await page.getByRole('button', { name: /Enregistrer les présences du jour/ }).click();
  await expect(page.locator('#attendanceStatus')).toContainText('2 présents');
  await expect(page.locator('#attendanceSummary')).toContainText('1 séance enregistrée');
  await expect(page.locator('#attendanceSummary')).toContainText('Lina : 1 / 1');
  await expect(page.locator('#attendanceSummary')).toContainText('Max : 0 / 1');
  await page.getByRole('button', { name: /Enregistrer les présences du jour/ }).click();
  await expect(page.locator('#attendanceSummary')).toContainText('1 séance enregistrée');
  await page.locator('#rosterType').selectOption('troupe');
  await expect(page.locator('#attendanceSummary')).toContainText('Aucune présence');
});

test('caucus de match : 20 secondes puis fin annoncée', async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await openTab(page, 'Régie');
  await page.locator('#matchPanel > summary').click();
  await page.getByRole('button', { name: /Caucus 20 s/ }).click();
  await expect(page.locator('#matchCaucusClock')).toHaveText('Caucus : 20 s');
  await page.clock.runFor(5000);
  await expect(page.locator('#matchCaucusClock')).toHaveText('Caucus : 15 s');
  await page.clock.runFor(16000);
  await expect(page.locator('#matchCaucusClock')).toHaveText('Fin du caucus : on joue !');
});

test('échauffement express : un jeu d’énergie validé, 5 minutes, en plein écran', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /J’ai 5 minutes/ }).click();
  await expect(page.locator('#stageView')).toBeVisible();
  await expect(page.locator('#stageProgress')).toHaveText('Échauffement express');
  await expect(page.locator('#liveMode')).toHaveValue('free');
  await expect(page.locator('#stageClock')).toHaveText('05:00');
  const ok = await page.evaluate(() => { const t = document.getElementById('stageTitle').textContent.trim(); const g = data.find(x => displayTitle(x[0]) === t); return !!g && ['Énergie', 'Lâcher-prise', 'Amusement'].includes(g[1]) && isEligibleGame(g, { includeExternal: false, includeIncomplete: false }); });
  expect(ok).toBe(true);
  expect((await page.locator('#stageConsigne').textContent()).trim().length).toBeGreaterThan(10);
});

test('fiches élèves : une fiche par exercice, seules imprimées', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole('button', { name: /Fiches élèves/ }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  await expect(page.locator('body')).toHaveClass(/print-students/);
  const titles = (await page.locator('#plan>.card:not(.session-objective) h3').allTextContents()).map(t => t.trim());
  await expect(page.locator('#studentSheets .student-sheet h2')).toHaveText(titles);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#studentSheets')).toBeVisible();
  await expect(page.locator('#plan')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('body')).not.toHaveClass(/print-students/);
  await expect(page.locator('#studentSheets')).toBeHidden();
});
