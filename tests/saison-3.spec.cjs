'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openTab, openSeance } = require('./helpers.cjs');

// Saison 3 (18 novembre 2026) : sept exercices (3-8 à 3-14) et cinq principes tirés des notes d’Alexis.
const NEW_TITLES = ['Cercle des fous', 'Action puis réplique', 'Les cadeaux', 'Description factuelle', 'Le triangle des Persrudes', 'Scène sans P', 'La piscine du kiff'];

function openFilters(page) {
  return page.evaluate(() => { const d = document.querySelector('#filterFold'); if (d) d.open = true; });
}

test('saison 3 : les nouvelles fiches se cherchent, se filtrent et s’ajoutent à la séance', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  const search = page.locator('#search');
  for (const title of NEW_TITLES) {
    await search.fill(title);
    await expect(page.locator('#games .card').first()).toContainText(title);
  }
  // Recherche par un mot de la règle.
  await search.fill('Persrudes');
  await expect(page.locator('#games .card')).toHaveCount(1);
  await search.fill('aucun exercice ne contient ceci');
  await expect(page.locator('#games .card')).toHaveCount(0);
  await search.fill('');

  // Usage « cercle de clôture » : uniquement La piscine du kiff.
  await openFilters(page);
  await page.locator('#usageFilter').selectOption('cercle de clôture');
  await expect(page.locator('#games .card')).toHaveCount(1);
  await expect(page.locator('#games .card')).toContainText('La piscine du kiff');
  await page.locator('#usageFilter').selectOption('');

  // Catégorie + niveau : Le triangle des Persrudes est en Émotions, ★★★.
  await page.locator('#categoryFilter').selectOption('Émotions');
  await page.locator('#levelFilter').selectOption('3');
  await expect(page.locator('#games')).toContainText('Le triangle des Persrudes');
  await page.locator('#categoryFilter').selectOption('');
  await page.locator('#levelFilter').selectOption('');

  // Contact : les sept sont « sans contact ».
  await page.locator('#contactFilter').selectOption('aucun');
  await search.fill('Scène sans P');
  await expect(page.locator('#games .card').first()).toContainText('Scène sans P');
  await page.locator('#contactFilter').selectOption('');
  await search.fill('');

  // Ajout à la main dans une séance.
  await openSeance(page);
  await page.evaluate(() => { document.querySelector('#seance details.add-exercise').open = true; });
  const value = await page.locator('#manualGame option', { hasText: 'Cercle des fous' }).first().getAttribute('value');
  await page.locator('#manualGame').selectOption(value);
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.locator('#plan')).toContainText('Cercle des fous');
  expect(errors).toEqual([]);
});

test('saison 3 : les cinq principes apparaissent dans les notes personnelles', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Principes et conseils');
  await page.locator('#principesHome .principes-entry').nth(0).click();
  await expect(page.locator('#principesContent .principle-card').first()).toBeVisible();
  const notes = page.locator('#principesContent .principle-reference', { hasText: 'Autres notes personnelles' });
  await notes.locator(':scope > summary').click();
  for (const title of ['Tout vous touche en bien comme en mal', 'Votre meilleur jeu est dans l’autre', 'La plus grande des actions peut arriver si elle ne touche pas le personnage', 'Jouer l’immaturité', 'Le triangle des Persrudes']) {
    await expect(notes).toContainText(title);
  }
});
