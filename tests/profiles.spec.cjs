'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, reloadApp, openSeance, openFineSettings, setDuration, openTab, waitForReady } = require('./helpers.cjs');

// Profils de groupe : Club collège, Copains, Association.
// Chaque groupe garde ses six priorités, sa durée et sa rotation d'exercices.

async function chooseGroup(page, id) {
  await page.locator('#groupProfile').selectOption(id);
  await expect(page.locator('#groupProfile')).toHaveValue(id);
}

test('profils de groupe : priorités et durée propres à chaque groupe, conservées au rechargement', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await expect(page.locator('#groupProfile')).toHaveValue('college');
  await expect(page.locator('#groupProfile option')).toHaveText(['Club collège', 'Copains', 'Association']);

  await openFineSettings(page);
  await page.locator('#dynamic0').fill('90');
  await setDuration(page, 90);

  await chooseGroup(page, 'copains');
  await expect(page.locator('#groupProfileStatus')).toContainText('Copains');
  await expect(page.locator('#dynamic0')).toHaveValue('60');
  await expect(page.locator('#guidedDuration')).toHaveValue('55');
  await expect(page.locator('#duration')).toHaveValue('55');
  await openFineSettings(page);
  await page.locator('#dynamic0').fill('15');
  await setDuration(page, 75);
  await expect(page.locator('#randomDynamic0')).toHaveValue('15');

  await chooseGroup(page, 'college');
  await expect(page.locator('#dynamic0')).toHaveValue('90');
  await expect(page.locator('#randomDynamic0')).toHaveValue('90');
  await expect(page.locator('#duration')).toHaveValue('90');

  await chooseGroup(page, 'copains');
  await expect(page.locator('#dynamic0')).toHaveValue('15');
  await expect(page.locator('#guidedDuration')).toHaveValue('custom');
  await expect(page.locator('#duration')).toHaveValue('75');

  await reloadApp(page);
  await openSeance(page);
  await expect(page.locator('#groupProfile')).toHaveValue('copains');
  await expect(page.locator('#dynamic0')).toHaveValue('15');
  await chooseGroup(page, 'college');
  await expect(page.locator('#dynamic0')).toHaveValue('90');
});

test('profils de groupe : la rotation des exercices est séparée par groupe', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  const readRecent = () => page.evaluate(() => JSON.parse(localStorage.getItem('impro-recent-games') || '[]'));
  const readUsage = () => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('impro-game-usage-v1') || '{}')).reduce((a, b) => a + b, 0));

  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const clubRecent = await readRecent();
  expect(clubRecent).toHaveLength(5);
  expect(await readUsage()).toBe(5);

  await chooseGroup(page, 'asso');
  expect(await readRecent()).toEqual([]);
  expect(await readUsage()).toBe(0);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  expect(await readRecent()).toHaveLength(5);
  expect(await readUsage()).toBe(5);

  await chooseGroup(page, 'college');
  expect(await readRecent()).toEqual(clubRecent);
  expect(await readUsage()).toBe(5);
});

test('profils de groupe : une séance enregistrée indique son groupe dans l’historique', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await openApp(page);
  await openSeance(page);
  await chooseGroup(page, 'asso');
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await openTab(page, 'Historique');
  await expect(page.locator('#historyResult .card h3').first()).toContainText('Association');
});

test('effectifs : un effectif par groupe, suivi par Groupes et la Régie, conservé au rechargement', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterType option')).toHaveText(['Club collège', 'Copains', 'Association (troupe adulte)']);
  await expect(page.locator('#rosterType')).toHaveValue('college');
  await page.locator('#rosterInput').fill('Lina\nSam');
  await page.locator('#groupes button[onclick="rosterAdd()"]').click();

  await openSeance(page);
  await chooseGroup(page, 'copains');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterType')).toHaveValue('copains');
  await expect(page.locator('#rosterList .roster-person')).toHaveCount(0);
  await page.locator('#rosterInput').fill('Max\nJo\nAli');
  await page.locator('#groupes button[onclick="rosterAdd()"]').click();
  await expect(page.locator('#rosterList .roster-person')).toHaveCount(3);
  await expect(page.locator('#liveRosterType')).toHaveValue('copains');

  await openSeance(page);
  await chooseGroup(page, 'asso');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterType')).toHaveValue('troupe');
  await expect(page.locator('#rosterList .roster-person')).toHaveCount(0);

  await reloadApp(page);
  await openSeance(page);
  await chooseGroup(page, 'college');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterList')).toContainText('Lina');
  await expect(page.locator('#rosterList .roster-person')).toHaveCount(2);
  await openSeance(page);
  await chooseGroup(page, 'copains');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterList .roster-person')).toHaveCount(3);
});

test('effectifs : les anciennes données (Collège, Troupe adulte) sont conservées, la troupe devient l’Association', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__improlab_test_storage_initialized') === '1') return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('__improlab_test_storage_initialized', '1');
    localStorage.setItem('impro-rosters-v1', JSON.stringify({ college: [{ name: 'Élève 1', present: true }], troupe: [{ name: 'Adulte 1', present: false }], history: { college: [], troupe: [] }, saved: { college: [], troupe: [{ name: 'Équipes du 01/10', date: '2026-10-01', fmt: 'teams', groups: [['Adulte 1']] }] } }));
  });
  await page.goto('/');
  await waitForReady(page);
  await openSeance(page);
  await chooseGroup(page, 'asso');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterList')).toContainText('Adulte 1');
  await expect(page.locator('#rosterSaved')).toContainText('Équipes du 01/10');
  await openSeance(page);
  await chooseGroup(page, 'copains');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterList .roster-person')).toHaveCount(0);

  await page.locator('#rosterImport').setInputFiles({ name: 'ancien.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, college: [{ name: 'Importé collège' }], troupe: [{ name: 'Importé asso' }] })) });
  await openSeance(page);
  await chooseGroup(page, 'asso');
  await openTab(page, 'Groupes');
  await expect(page.locator('#rosterList')).toContainText('Importé asso');
});

test('profils de groupe : une mémoire de profils corrompue ne bloque pas l’application', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('__improlab_test_storage_initialized', '1');
    localStorage.setItem('impro-group-profiles-v1', JSON.stringify({ active: 'inconnu', profiles: { copains: { rotation: 'pas un objet', dynamics: 12, guidedDuration: '999' } } }));
  });
  await page.goto('/');
  await waitForReady(page);
  await openSeance(page);
  await expect(page.locator('#groupProfile')).toHaveValue('college');
  await chooseGroup(page, 'copains');
  await expect(page.locator('#dynamic0')).toHaveValue('60');
  await expect(page.locator('#guidedDuration')).toHaveValue('55');
  expect(errors).toEqual([]);
});
