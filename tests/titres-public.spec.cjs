'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openTab, reloadApp } = require('./helpers.cjs');

// Titres du public (12 nov. 2026) : questions cochées, deux mots du public mélangés en titres,
// titres de films et de chansons, Mes titres, thème du match et lien depuis le Spectacle.

async function openAudience(page) {
  await openApp(page);
  await openTab(page, 'Régie');
  await page.locator('#live .regie-draw > summary').click();
}

async function sayWord(page, word) {
  const input = page.getByLabel('Ce que le public a dit');
  await input.fill(word);
  await input.press('Enter');
}

async function sayWord2(page, word) {
  const input = page.getByLabel('Un 2e mot du public, pour en faire un titre');
  await input.fill(word);
  await page.getByRole('button', { name: /Mélanger/ }).click();
}

test('question : on coche Lieu, Relation ou Mot, les autres sont repliées, le choix reste', async ({ page }) => {
  await openAudience(page);
  // Plus de bouton 🔄 : la question se coche.
  await expect(page.getByRole('button', { name: 'Autre question à poser au public' })).toHaveCount(0);
  const main = page.locator('#audienceChoices input[type=radio]');
  await expect(main).toHaveCount(3);
  const names = await page.locator('#audienceChoices label').allTextContents();
  expect(names.map(n => n.trim())).toEqual(['Lieu', 'Relation', 'Mot']);
  await expect(page.getByRole('radio', { name: 'Lieu' })).toBeChecked();
  await expect(page.locator('#audienceQuestion')).toHaveText('Un lieu ?');
  expect((await page.locator('#audienceChoices label').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.getByRole('radio', { name: 'Mot' }).check();
  await expect(page.locator('#audienceQuestion')).toHaveText('Un mot, n’importe lequel ?');
  // Les huit autres questions sont repliées au départ.
  const more = page.locator('#audienceMore');
  await expect(more).not.toHaveAttribute('open', '');
  await expect(page.locator('#audienceChoicesMore input[type=radio]')).toHaveCount(8);
  await page.locator('#audienceMore > summary').click();
  await page.getByRole('radio', { name: 'Titre de film' }).check();
  await expect(page.locator('#audienceQuestion')).toHaveText('Un titre de film ?');
  // Une seule question cochée à la fois.
  await expect(page.locator('.audience-box input[type=radio]:checked')).toHaveCount(1);
  await reloadApp(page);
  await openTab(page, 'Régie');
  await page.locator('#live .regie-draw > summary').click();
  // Une question rangée dans « Autres questions » rouvre ce repli.
  await expect(page.locator('#audienceMore')).toHaveAttribute('open', '');
  await expect(page.getByRole('radio', { name: 'Titre de film' })).toBeChecked();
  // Le tirage de secours puise dans la liste de la question cochée.
  await page.evaluate(() => { tab('live'); audienceSuggest(); });
  const drawn = await page.evaluate(() => audienceWord.a);
  expect(await page.evaluate(t => AUDIENCE_LISTS['Titre de film'].includes(t), drawn)).toBe(true);
});

test('deux mots du public deviennent des titres, à choisir, corriger et noter dans le carnet', async ({ page }) => {
  await openAudience(page);
  await sayWord(page, 'étoilé');
  // Pas de tirage pour le 2e mot : il vient toujours du public.
  await expect(page.locator('#audienceResult .audience-mix button')).toHaveCount(1);
  await sayWord2(page, 'chalutier');
  const picks = page.locator('#audienceResult .audience-pick');
  await expect(picks).toHaveCount(4);
  const first = await picks.allTextContents();
  expect(first).toContain('Le chalutier étoilé');
  expect(first).toContain('Une étoile dans le chalutier');
  expect((await picks.first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Le premier titre est choisi d'office et s'affiche sous le chrono.
  await expect(picks.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#liveAudience strong')).toHaveText(first[0]);
  await expect(page.locator('#liveAudience .audience-live-label')).toContainText('étoilé + chalutier');
  // Toucher un autre titre le choisit.
  await picks.nth(1).click();
  await expect(page.locator('#liveAudience strong')).toHaveText(first[1]);
  await expect(page.locator('#audienceResult .audience-chosen')).toHaveText('« ' + first[1] + ' »');
  // 🔄 propose quatre autres titres.
  await page.getByRole('button', { name: /Autres titres/ }).click();
  const second = await picks.allTextContents();
  expect(second).toHaveLength(4);
  expect(second.some(t => first.includes(t))).toBe(false);
  // ✏️ corrige le titre à la main.
  await page.getByRole('button', { name: /Corriger/ }).click();
  const edit = page.getByLabel('Corriger le titre');
  await edit.fill('Le chalutier des étoiles filantes');
  await edit.press('Enter');
  await expect(page.locator('#liveAudience strong')).toHaveText('Le chalutier des étoiles filantes');
  // Une seule note dans le carnet, mise à jour avec le titre retenu.
  const notes = await page.evaluate(() => liveNotesRead().notes.map(n => n.text).filter(t => t.startsWith('Suggestion du public')));
  expect(notes).toHaveLength(1);
  expect(notes[0]).toContain('étoilé + chalutier → « Le chalutier des étoiles filantes »');
  // ↩ revient au premier mot pour en recevoir un autre.
  await page.getByRole('button', { name: /Autre 2e mot/ }).click();
  await expect(page.locator('#liveAudience strong')).toHaveText('étoilé');
  await expect(page.getByLabel('Un 2e mot du public, pour en faire un titre')).toBeVisible();
});

test('grammaire des titres : le, la, l’, pluriel et h aspiré devinés sans aide', async ({ page }) => {
  await openApp(page);
  const t = await page.evaluate(() => ({
    hibou: audienceMixTitles('hibou', 'école', 'Mot', false),
    pirates: audienceMixTitles('les pirates', 'lune', 'Mot', false),
    gare: audienceMixTitles('Gare', 'parapluie', 'Lieu', true),
    adj: audienceMixTitles('mystérieuse', 'valise', 'Mot', false),
    deux: audienceMixTitles('triste', 'glacé', 'Mot', false)
  }));
  expect(t.hibou).toContain('Le hibou de l’école');
  expect(t.hibou).toContain('Mon école, mon hibou et moi');
  expect(t.pirates).toContain('Les pirates qui voulaient être une lune');
  expect(t.pirates).toContain('Quand les pirates rencontrent la lune');
  expect(t.gare).toContain('Un parapluie dans la gare');
  expect(t.adj).toContain('La valise mystérieuse');
  expect(t.deux).toContain('Ni triste ni glacé');
  for (const list of Object.values(t)) {
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(new Set(list.map(x => x.toLowerCase())).size).toBe(list.length);
  }
});

test('deux films ou deux chansons : titres mélangés et « à la manière de »', async ({ page }) => {
  await openAudience(page);
  await page.evaluate(() => audienceChoose('Titre de film'));
  await sayWord(page, 'Titanic');
  await sayWord2(page, 'Les Bronzés');
  const all = await page.evaluate(() => audienceWord.titles);
  expect(all).toContain('Titanic 2 : le retour des Bronzés');
  expect(all).toContain('Quand Les Bronzés rencontrent Titanic');
  expect(all).toContain('« Titanic » à la manière de « Les Bronzés »');
  const songs = await page.evaluate(() => audienceMixTitles('La Bohème', 'Alexandrie Alexandra', 'Titre de chanson', false));
  expect(songs).toContain('La Bohème (feat. Alexandrie Alexandra)');
  expect(songs).toContain('La Bohème sur l’air d’Alexandrie Alexandra');
  expect(songs).toContain('« Alexandrie Alexandra » à la manière de « La Bohème »');
  // Les listes de secours existent pour les quatre nouvelles questions.
  const sizes = await page.evaluate(() => Object.fromEntries(Object.entries(AUDIENCE_LISTS).map(([k, v]) => [k, v.length])));
  expect(sizes).toEqual({ 'Objet': 40, 'Époque': 24, 'Titre de film': 40, 'Titre de chanson': 40 });
});

test('Mes titres : ☆ garde un titre, il reste après rechargement et se tire plus tard', async ({ page }) => {
  await openAudience(page);
  await sayWord(page, 'étoilé');
  await sayWord2(page, 'chalutier');
  const title = await page.evaluate(() => audienceWord.title);
  await page.getByRole('button', { name: /Garder dans Mes titres/ }).click();
  await expect(page.getByRole('button', { name: /Dans Mes titres/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#myTitlesCount')).toHaveText('1');
  await reloadApp(page);
  await openTab(page, 'Régie');
  await page.locator('#live .regie-draw > summary').click();
  await page.locator('#myTitlesBox > summary').click();
  await expect(page.locator('#myTitlesList .my-title span')).toHaveText(title);
  await page.getByRole('button', { name: /Tirer un de mes titres/ }).click();
  await expect(page.locator('#liveAudience strong')).toHaveText(title);
  // Un titre tiré de la réserve ne rejoue pas la note dans le carnet.
  const notes = await page.evaluate(() => liveNotesRead().notes.filter(n => n.text.includes('Un de mes titres')).length);
  expect(notes).toBe(0);
  await page.getByRole('button', { name: 'Retirer « ' + title + ' » de Mes titres' }).click();
  await expect(page.locator('#myTitlesCount')).toHaveText('0');
  // Mes titres et les questions cochées partent dans la sauvegarde complète.
  const keys = await page.evaluate(() => BACKUP_DATA_KEYS);
  expect(keys).toContain('impro-my-titles-v1');
  expect(keys).toContain('impro-audience-q-v1');
});

test('match : le titre du public devient le thème de l’impro', async ({ page }) => {
  await openAudience(page);
  await sayWord(page, 'hibou');
  await sayWord2(page, 'école');
  const title = await page.evaluate(() => audienceWord.title);
  await page.getByRole('button', { name: /Thème du match/ }).click();
  await expect(page.locator('#matchPanel')).toHaveAttribute('open', '');
  await expect(page.locator('#matchCurrent')).toContainText('Thème : ' + title);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('impro-match-v1')).current.theme)).toBe(title);
});

test('spectacle : le numéro « Accueil et suggestion du public » ouvre l’outil dans la Régie', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Spectacle');
  await page.evaluate(() => { document.getElementById('showTemplatesFold').open = true; }); await page.locator('#showTemplate').selectOption({ label: 'La Ronde' });
  await page.getByRole('button', { name: /Remplir l’ordre de passage/ }).click();
  const open = page.getByRole('button', { name: /Ouvrir la suggestion du public/ });
  await expect(open).toHaveCount(1);
  expect((await open.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await open.click();
  await expect(page.locator('#live')).toBeVisible();
  await expect(page.locator('#live .regie-draw')).toHaveAttribute('open', '');
  await expect(page.getByLabel('Ce que le public a dit')).toBeVisible();
});
