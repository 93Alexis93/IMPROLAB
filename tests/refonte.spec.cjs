'use strict';
// Refonte « écrans légers » (D36), ce qui reste après la fusion du 18 novembre (D40) : cahier replié, Préparer allégé, aide « ? »,
// groupes, masque d'ouverture, rideau, tampon. La barre du bas, l'en-tête, la Bibliothèque et le défi du jour sont testés dans
// navigation-sombre.spec.cjs et seance-dabord.spec.cjs.
const { test, expect } = require('@playwright/test');
const { openApp, openTab } = require('./helpers.cjs');

test('cahier de coach : listes repliées, dépliées au toucher', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Cahier de coach');
  const card = page.locator('#cahier .coach-list-card').first();
  await expect(card.locator('.coach-chip').first()).toBeHidden();
  await card.locator('.coach-list-heading').click();
  await expect(card.locator('.coach-chip').first()).toBeVisible();
});

test('préparer : actions de séance masquées tant que la séance est vide, introduction visible', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Préparer');
  const exporter = page.locator('#seance button[onclick="exportSession()"]');
  await expect(exporter).toBeHidden();
  await expect(page.locator('#seance button[onclick="saveSession()"]')).toBeHidden();
  // D41 : plus de bouton « ? », le texte d'introduction reste affiché.
  await expect(page.locator('#seance .guided-heading > p')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Afficher ou cacher l’aide de cette page' })).toHaveCount(0);
  await page.evaluate(() => generate());
  await expect(exporter).toBeVisible();
  await expect(page.locator('#seance button[onclick="saveSession()"]')).toBeVisible();
});

test('masque d’ouverture : apparaît, ne bloque aucun toucher, disparaît en deux secondes environ', async ({ page }) => {
  await openApp(page, { dismissWelcome: false });
  await page.getByRole('button', { name: 'Entrer dans IMPRO LAB' }).click();
  const scene = page.locator('.rf-scene');
  await expect(scene.locator('.rf-masque')).toHaveCount(1);
  expect(await scene.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await page.getByRole('button', { name: 'Tous les principes' }).click();
  await expect(page.locator('#principes')).toBeVisible();
  await expect(scene).toHaveCount(0, { timeout: 4000 });
});

test('masque d’ouverture coupé quand l’appareil demande moins d’animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { dismissWelcome: false });
  await page.getByRole('button', { name: 'Entrer dans IMPRO LAB' }).click();
  await expect(page.locator('#welcomeScreen')).toBeHidden();
  await expect(page.locator('.rf-scene')).toHaveCount(0);
});

test('groupes : introduction visible, curseurs du tirage repliés, ajout de joueurs replié quand l’effectif existe', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Groupes');
  const intro = page.locator('#groupes > h2 + p.muted');
  await expect(intro).toBeVisible();
  await expect(page.locator('#groupes .rf-aide')).toHaveCount(0);
  // Effectif vide : l'ajout est ouvert. Après un ajout et un retour sur l'onglet : replié.
  const ajout = page.locator('#groupes details.rf-ajout-joueurs');
  await expect(ajout).toHaveAttribute('open', '');
  await ajout.locator('textarea').fill('Camille\nSam');
  await ajout.getByRole('button', { name: /Ajouter/ }).click();
  await expect(page.locator('#rosterCount')).toContainText('2 inscrits');
  await expect(ajout).toHaveAttribute('open', '');
  await openTab(page, 'Accueil');
  await openTab(page, 'Groupes');
  await expect(ajout).not.toHaveAttribute('open', '');
  await openTab(page, 'Exercice aléatoire');
  await expect(page.locator('#randomSettingsFold')).not.toHaveAttribute('open', '');
  await expect(page.locator('#random').getByRole('button', { name: /Tirer un exercice/ })).toBeVisible();
});

test('rideau au plein écran et tampon à l’enregistrement : présents puis retirés, sans bloquer', async ({ page }) => {
  await openApp(page);
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { tab('seance'); generate(); });
  await page.evaluate(() => saveSession());
  await expect(page.locator('.rf-tampon')).toHaveCount(1);
  await expect(page.locator('.rf-tampon')).toHaveCount(0, { timeout: 4000 });
  await page.evaluate(() => document.body.classList.add('regie-full'));
  await expect(page.locator('.rf-rideau')).toHaveCount(2);
  expect(await page.locator('.rf-scene').first().evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(page.locator('.rf-rideau')).toHaveCount(0, { timeout: 4000 });
  await page.evaluate(() => document.body.classList.remove('regie-full'));
});
