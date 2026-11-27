'use strict';

const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { openApp, openSeance, openTab, waitForReady } = require('./helpers.cjs');

// Journal des séances (D48) : « Clore la séance », présences, exercices joués ou non,
// hors plan, Historique (modifier, supprimer), sauvegarde et restauration.

const KEY = 'impro-session-log-v1';
const readLog = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), KEY);

async function prepareWithRoster(page, names) {
  await openSeance(page);
  await page.locator('#groupProfile').selectOption('college');
  await page.evaluate(list => { rosterState.college = list.map(name => ({ name, present: true })); rosterSave(); }, names);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await expect(page.locator('#plan > .card h3').first()).toBeVisible();
  return page.locator('#plan > .card:not(.session-objective) h3').allTextContents();
}

test('clore une séance : présents cochés, exercice non joué, hors plan, puis retrouvée dans l’Historique', async ({ page }) => {
  await openApp(page);
  const planTitles = await prepareWithRoster(page, ['Inès', 'Malik', 'Sacha']);
  expect(planTitles.length).toBeGreaterThan(1);

  const close = page.getByRole('button', { name: 'Clore la séance' });
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await close.tap();

  await expect(page.locator('#journal')).toBeVisible();
  await expect(page.locator('#journalDate')).toHaveValue(await page.evaluate(() => localDay()));
  await expect(page.locator('#journalGroup')).toHaveValue('college');
  await expect(page.locator('.journal-students li')).toHaveCount(3);
  await expect(page.locator('.journal-exercise')).toHaveCount(planTitles.length);

  // Présences : Malik est absent.
  await page.locator('.journal-students label', { hasText: 'Malik' }).tap();
  await expect(page.locator('#journalCount')).toHaveText('2 présents sur 3');

  // Le deuxième exercice n'a pas été joué, avec un commentaire.
  await page.getByRole('checkbox', { name: planTitles[1] + ' : joué' }).uncheck();
  await page.getByRole('textbox', { name: 'Commentaire sur ' + planTitles[1] }).fill('Plus le temps');
  await page.getByRole('textbox', { name: 'Commentaire sur ' + planTitles[0] }).fill('Très bonne énergie');

  // Hors plan : un exercice de la bibliothèque et un en texte libre.
  await page.locator('#journalExtraFold > summary').tap();
  const libraryOption = await page.locator('#journalExtraLibrary option').nth(1).textContent();
  await page.locator('#journalExtraLibrary').selectOption({ label: libraryOption });
  await page.getByRole('button', { name: 'Ajouter', exact: true }).tap();
  await expect(page.locator('#journalExtraStatus')).toContainText(libraryOption);
  await page.locator('#journalExtraFree').fill('Le miroir inventé');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).tap();
  await expect(page.locator('.journal-hors-plan')).toHaveCount(2);
  // Les choix déjà faits restent après l'ajout (le formulaire est redessiné).
  await expect(page.getByRole('checkbox', { name: planTitles[1] + ' : joué' })).not.toBeChecked();
  await expect(page.locator('#journalCount')).toHaveText('2 présents sur 3');

  await page.locator('#journalComment').fill('Groupe calme, bonne écoute.');
  await page.getByRole('button', { name: /Enregistrer au journal/ }).tap();

  // Historique : l'entrée est ouverte, en tête.
  await expect(page.locator('#historique')).toBeVisible();
  await expect(page.locator('#journalHistoryStatus')).toContainText('Séance close');
  const entry = page.locator('#journalHistory .journal-entry').first();
  await expect(entry).toHaveAttribute('open', '');
  await expect(entry).toContainText('Inès, Sacha');
  await expect(entry).toContainText('Absents : Malik');
  await expect(entry.locator('.journal-pas-joue')).toContainText(planTitles[1]);
  await expect(entry.locator('.journal-pas-joue')).toContainText('Plus le temps');
  await expect(entry).toContainText('Le miroir inventé');
  await expect(entry).toContainText('hors plan');
  await expect(entry).toContainText('Groupe calme, bonne écoute.');

  // Stockage : titres en clair, prévu / joué, présents et absents.
  const log = await readLog(page);
  expect(log).toHaveLength(1);
  const e = log[0];
  expect(e).toMatchObject({ groupe: 'Club collège', groupeId: 'college', presents: ['Inès', 'Sacha'], absents: ['Malik'], commentaire: 'Groupe calme, bonne écoute.' });
  expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(typeof e.id).toBe('string');
  expect(isNaN(new Date(e.creeLe))).toBe(false);
  expect(e.exercices.map(x => x.titre)).toEqual([...planTitles, libraryOption, 'Le miroir inventé']);
  expect(e.exercices[0]).toEqual({ titre: planTitles[0], prevu: true, joue: true, commentaire: 'Très bonne énergie' });
  expect(e.exercices[1]).toEqual({ titre: planTitles[1], prevu: true, joue: false, commentaire: 'Plus le temps' });
  expect(e.exercices.at(-1)).toEqual({ titre: 'Le miroir inventé', prevu: false, joue: true, commentaire: '' });

  // Le plan et l'historique existants ne sont pas touchés.
  expect(await page.evaluate(() => localStorage.getItem('impro-history'))).toBeNull();
  expect(await page.evaluate(() => planCards().length)).toBeGreaterThan(1);
});

test('historique : état vide, ordre du plus récent au plus ancien, modifier et supprimer avec confirmation', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Historique');
  await expect(page.locator('#journalHistory')).toContainText('Aucune séance close');
  await expect(page.locator('#journalHistory .journal-entry')).toHaveCount(0);

  await page.evaluate(k => localStorage.setItem(k, JSON.stringify([
    { id: 'a', date: '2026-10-05', groupe: 'Copains', groupeId: 'copains', presents: ['Jo'], absents: [], exercices: [{ titre: 'Le zip zap boing', prevu: true, joue: true, commentaire: '' }], commentaire: '', creeLe: '2026-10-05T18:00:00.000Z' },
    { id: 'b', date: '2026-11-20', groupe: 'Club collège', groupeId: 'college', presents: ['Inès'], absents: ['Malik'], exercices: [{ titre: 'Un titre qui n’existe plus', prevu: true, joue: false, commentaire: 'reporté' }], commentaire: 'Bien', creeLe: '2026-11-20T13:00:00.000Z' },
    { id: 'c', date: '2026-11-02', groupe: '', groupeId: '', presents: ['Lou', 'Max'], absents: [], exercices: [], commentaire: '', creeLe: '2026-11-02T10:00:00.000Z' }
  ])), KEY);
  await openTab(page, 'Accueil');
  await openTab(page, 'Historique');
  const dates = page.locator('#journalHistory .journal-entry-date');
  await expect(dates).toHaveCount(3);
  await expect(dates.nth(0)).toContainText('20 novembre 2026');
  await expect(dates.nth(1)).toContainText('2 novembre 2026');
  await expect(dates.nth(2)).toContainText('5 octobre 2026');
  // Un titre absent de la bibliothèque reste lisible.
  await page.locator('#journalHistory .journal-entry').nth(0).locator('summary').tap();
  await expect(page.locator('#journalHistory .journal-entry').nth(0)).toContainText('Un titre qui n’existe plus');

  // Modifier l'entrée sans groupe : les prénoms reviennent dans la saisie libre.
  await page.locator('#journalHistory .journal-entry').nth(1).locator('summary').tap();
  await page.locator('#journalHistory .journal-entry').nth(1).getByRole('button', { name: /Modifier/ }).tap();
  await expect(page.locator('#journalTitle')).toHaveText('Modifier la séance');
  await expect(page.locator('#journalGroup')).toHaveValue('');
  await expect(page.locator('#journalFreePresent')).toHaveValue('Lou\nMax');
  await page.locator('#journalFreePresent').fill('Lou, Max, Zoé');
  await page.locator('#journalFreeAbsent').fill('Max, Nina');
  await page.locator('#journalDate').fill('2026-11-03');
  await page.getByRole('button', { name: /Enregistrer les modifications/ }).tap();
  await expect(page.locator('#journalHistoryStatus')).toContainText('Séance modifiée');
  let log = await readLog(page);
  const c = log.find(x => x.id === 'c');
  expect(c).toMatchObject({ date: '2026-11-03', presents: ['Lou', 'Max', 'Zoé'], absents: ['Nina'], creeLe: '2026-11-02T10:00:00.000Z' });
  expect(c.modifieLe).toBeTruthy();
  expect(log).toHaveLength(3);

  // Supprimer : refus, puis confirmation.
  const first = page.locator('#journalHistory .journal-entry').nth(0);
  await first.locator('summary').tap();
  page.once('dialog', d => d.dismiss());
  await first.getByRole('button', { name: /Supprimer/ }).tap();
  expect(await readLog(page)).toHaveLength(3);
  page.once('dialog', d => { expect(d.message()).toContain('20 novembre 2026'); d.accept(); });
  await first.getByRole('button', { name: /Supprimer/ }).tap();
  await expect(page.locator('#journalHistory .journal-entry')).toHaveCount(2);
  log = await readLog(page);
  expect(log.map(x => x.id).sort()).toEqual(['a', 'c']);
});

test('plan sans groupe ni effectif : saisie libre des prénoms', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await expect(page.getByRole('button', { name: 'Clore la séance' })).toBeHidden(); // séance vide
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.getByRole('button', { name: 'Clore la séance' }).tap();
  await expect(page.locator('.journal-students')).toHaveCount(0);
  await expect(page.locator('#journalFreePresent')).toBeVisible();
  await page.locator('#journalGroup').selectOption('');
  await page.locator('#journalGroupFree').fill('Stage du samedi');
  await page.locator('#journalFreePresent').fill('Lou\nMax, lou');
  await page.getByRole('button', { name: /Enregistrer au journal/ }).tap();
  const [e] = await readLog(page);
  expect(e).toMatchObject({ groupe: 'Stage du samedi', groupeId: '', presents: ['Lou', 'Max'], absents: [] });
  await expect(page.locator('#journalHistory .journal-entry').first()).toContainText('Stage du samedi');
});

test('sauvegarde : le journal exporté puis réimporté est restitué à l’identique', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await prepareWithRoster(page, ['Inès', 'Malik']);
  await page.getByRole('button', { name: 'Clore la séance' }).tap();
  await page.locator('#journalComment').fill('Séance « test » avec des guillemets et un saut\nde ligne');
  await page.getByRole('button', { name: /Enregistrer au journal/ }).tap();
  await expect(page.locator('#journalHistory .journal-entry')).toHaveCount(1);
  const before = await page.evaluate(k => localStorage.getItem(k), KEY);
  expect(JSON.parse(before)).toHaveLength(1);

  await openTab(page, 'Accueil');
  await page.evaluate(() => { navigator.share = undefined; const d = document.querySelector('.home-backup'); if (d) d.open = true; });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Tout sauvegarder/ }).click();
  const path = await (await download).path();
  const backup = JSON.parse(fs.readFileSync(path, 'utf8'));
  expect(backup.format).toBe('impro-lab-sauvegarde');
  expect(backup.data[KEY]).toBe(before);

  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('impro-')) localStorage.removeItem(k); });
  await page.reload();
  await waitForReady(page);
  await openTab(page, 'Historique');
  await expect(page.locator('#journalHistory')).toContainText('Aucune séance close');

  await openTab(page, 'Accueil');
  const reloaded = page.waitForEvent('load');
  await page.locator('#backupImport').setInputFiles(path);
  await reloaded;
  await waitForReady(page);
  expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBe(before);
  await openTab(page, 'Historique');
  await expect(page.locator('#journalHistory .journal-entry')).toHaveCount(1);
  await expect(page.locator('#journalHistory')).toContainText('Inès, Malik');
});

test('journal illisible ou de forme incorrecte : l’appli reste utilisable', async ({ page }) => {
  await openApp(page);
  await page.evaluate(k => localStorage.setItem(k, '{pas du json'), KEY);
  await openTab(page, 'Historique');
  await expect(page.locator('#journalHistory')).toContainText('Aucune séance close');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify([null, 3, { exercices: 'non', presents: [1, 'Lou'] }])), KEY);
  await openTab(page, 'Accueil');
  await openTab(page, 'Historique');
  await expect(page.locator('#journalHistory .journal-entry')).toHaveCount(1);
  await expect(page.locator('#journalHistory .journal-entry')).toContainText('Sans groupe');
});
