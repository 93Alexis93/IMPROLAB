'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openTab, openSeance, library } = require('./helpers.cjs');

// 26/11 : variante « Avec du game » sur 2-9 (IAO), exercices liés sous un principe, filtre par principe.
const IAO = 'Iya ! L’énergie passe, les règles s’empilent';
const DRE = /Le game dans le jeu\s*:\s*la méthode DRE/;

test('données : seule 2-9 porte des variantes nommées', () => {
  const withVariants = library.exercices.filter(e => 'variantes' in e);
  expect(withVariants.map(e => e.id)).toEqual(['2-9']);
  const v = withVariants[0].variantes;
  expect(v).toHaveLength(1);
  expect(v[0].nom).toBe('Avec du game');
  expect(v[0].texte_original.startsWith('IAO classique')).toBe(true);
  expect(withVariants[0].aussi_appele).toEqual(['IAO']);
});

test('Bibliothèque : « IAO » trouve 2-9, qui montre la variante « Avec du game »', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  await page.locator('#search').fill('IAO');
  const card = page.locator('#games .card', { hasText: IAO }).first();
  await expect(card).toBeVisible();
  await card.locator('details.fiche-more > summary').click();
  const variant = card.locator('.exercise-variant');
  await expect(variant).toHaveCount(1);
  await expect(variant).toContainText('Variante « Avec du game » :');
  await expect(variant).toContainText('canne à pêche');
  // Une fiche sans variante nommée n’en affiche pas.
  await page.locator('#search').fill('Le jeu des chaises');
  const other = page.locator('#games .card', { hasText: 'Le jeu des chaises' }).first();
  await other.locator('details.fiche-more > summary').click();
  await expect(other.locator('.exercise-variant')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('séance : la fiche complète de 2-9 propose la variante « Avec du game »', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  const html = await page.evaluate(t => coachDetailsHtml(t), IAO);
  expect(html).toContain('🔀 Variante « Avec du game »');
  expect(html).toContain('canne à pêche');
  const none = await page.evaluate(() => coachDetailsHtml('Le jeu des chaises'));
  expect(none).not.toContain('Variante « ');
});

test('principe : « Exercices liés » ouvre la fiche, seulement sous la méthode DRE', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page);
  await openTab(page, 'Principes et conseils');
  await page.locator('#principesHome .principes-entry').nth(0).click();
  const notes = page.locator('#principesContent .principle-reference', { hasText: 'Autres notes personnelles' });
  await notes.locator(':scope > summary').click();
  await expect(notes.locator('.linked-exercises')).toHaveCount(1);
  const article = notes.locator('article', { has: page.locator('h3', { hasText: DRE }) });
  const pill = article.locator('.linked-exercises button');
  await expect(pill).toHaveCount(1);
  await expect(pill).toHaveText('L’expert et ses fans');
  expect((await pill.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await pill.click();
  await expect(page.locator('#jeux')).toBeVisible();
  const card = page.locator('#games .card', { hasText: 'L’expert et ses fans' }).first();
  await expect(card.locator('details.fiche-more')).toHaveJSProperty('open', true);
  await expect(card.locator('.worked-principles')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Bibliothèque : le filtre par principe ne garde que les exercices liés', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  await page.evaluate(() => { const d = document.querySelector('#filterFold'); if (d) d.open = true; });
  const sel = page.locator('#principleFilter');
  // Seuls les principes reliés à au moins un exercice sont proposés.
  await expect(sel.locator('option')).toHaveCount(2);
  await expect(sel.locator('option').nth(1)).toHaveText(DRE);
  const value = await sel.locator('option').nth(1).getAttribute('value');
  await sel.selectOption(value);
  await expect(page.locator('#games .card')).toHaveCount(1);
  await expect(page.locator('#games .card')).toContainText('L’expert et ses fans');
  await expect(page.locator('#filtersActive')).toHaveText('1 actif');
  await sel.selectOption('');
  await expect(page.locator('#filtersActive')).toHaveText('aucun');
  expect(await page.locator('#games .card').count()).toBeGreaterThan(1);
});
