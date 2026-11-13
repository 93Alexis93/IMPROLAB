'use strict';
// Refonte « écrans légers » (D36) : en-tête compact, barre en bas, fiches repliées, défi du jour, masque d'ouverture.
const { test, expect } = require('@playwright/test');
const { openApp, openTab, libraryCount } = require('./helpers.cjs');

test('barre de navigation en bas de l’écran, menu Plus ouvert vers le haut', async ({ page }) => {
  await openApp(page);
  const nav = page.locator('nav[aria-label="Navigation principale"]');
  const box = await nav.boundingBox(), vh = page.viewportSize().height;
  expect(Math.abs(box.y + box.height - vh)).toBeLessThanOrEqual(1);
  await nav.locator('.more-navigation > summary').click();
  const menu = await nav.locator('.more-navigation-menu').boundingBox();
  expect(menu.y + menu.height).toBeLessThanOrEqual(box.y + 1);
  for (const b of await nav.locator('.more-navigation-menu button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await nav.getByRole('button', { name: 'Spectacle', exact: true }).click();
  await expect(page.locator('#spectacle')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('en-tête complet à l’Accueil, compact ailleurs, « Tout replier » referme la page', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('body > header .header-slogan')).toBeVisible();
  await openTab(page, 'Régie');
  await expect(page.locator('body > header .header-slogan')).toBeHidden();
  expect((await page.locator('body > header').boundingBox()).height).toBeLessThanOrEqual(56);
  const replier = page.getByRole('button', { name: 'Tout replier', exact: true });
  await expect(replier).toBeVisible();
  expect((await replier.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await replier.click();
  await expect(page.locator('#live details[open]')).toHaveCount(0);
  await expect(replier).toBeHidden();
});

test('bibliothèque : une ligne par jeu, la fiche se déplie au toucher, une recherche précise l’ouvre seule', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  const cards = page.locator('#games .card');
  await expect(cards).toHaveCount(libraryCount);
  await expect(page.locator('#games .card.rf-open')).toHaveCount(0);
  const first = cards.first(), title = first.locator('.exercise-title');
  await expect(first.locator('button.favorite')).toBeHidden();
  expect((await first.boundingBox()).height).toBeLessThan(170);
  await expect(title).toHaveAttribute('aria-expanded', 'false');
  await title.click();
  await expect(title).toHaveAttribute('aria-expanded', 'true');
  await expect(first.locator('button.favorite')).toBeVisible();
  // Le favori redessine la liste : la fiche reste ouverte.
  await first.locator('button.favorite').click();
  await expect(cards.first().locator('button.favorite')).toBeVisible();
  await page.getByRole('button', { name: 'Tout déplier', exact: true }).click();
  await expect(page.locator('#games .card.rf-open')).toHaveCount(libraryCount);
  await page.getByRole('button', { name: 'Tout replier', exact: true }).first().click();
  await expect(page.locator('#games .card.rf-open')).toHaveCount(0);
  await page.locator('#search').fill('zombie');
  const found = await cards.count();
  expect(found).toBeGreaterThan(0);
  if (found <= 3) await expect(page.locator('#games .card.rf-open')).toHaveCount(found);
});

test('cahier de coach : listes repliées, dépliées au toucher', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Cahier de coach');
  const card = page.locator('#cahier .coach-list-card').first();
  await expect(card.locator('.coach-chip').first()).toBeHidden();
  await card.locator('.coach-list-heading').click();
  await expect(card.locator('.coach-chip').first()).toBeVisible();
});

test('préparer : actions de séance masquées tant que la séance est vide, aide sur demande', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Préparer');
  const exporter = page.locator('#seance button[onclick="exportSession()"]');
  await expect(exporter).toBeHidden();
  await expect(page.locator('#seance button[onclick="saveSession()"]')).toBeHidden();
  await expect(page.locator('#seance .guided-heading > p')).toBeHidden();
  await page.getByRole('button', { name: 'Afficher ou cacher l’aide de cette page' }).click();
  await expect(page.locator('#seance .guided-heading > p')).toBeVisible();
  await page.evaluate(() => generate());
  await expect(exporter).toBeVisible();
  await expect(page.locator('#seance button[onclick="saveSession()"]')).toBeVisible();
});

test('défi du jour : tiré des listes de tirage, identique à la réouverture, renouvelable', async ({ page }) => {
  await openApp(page);
  const defi = page.locator('#rfDefi');
  await defi.locator('summary').click();
  const lignes = defi.locator('.rf-defi-carte p');
  await expect(lignes).toHaveCount(4);
  const premier = await lignes.allTextContents();
  const listes = await page.evaluate(() => drawLists);
  for (const cle of ['Lieu', 'Personnage', 'Émotion', 'Contrainte']) {
    const ligne = premier.find(t => t.startsWith(cle));
    expect(listes[cle]).toContain(ligne.slice(cle.length));
  }
  await defi.locator('summary').click();
  await defi.locator('summary').click();
  expect(await lignes.allTextContents()).toEqual(premier);
  await defi.getByRole('button', { name: /Un autre défi/ }).click();
  await expect(lignes).toHaveCount(4);
});

test('masque d’ouverture : apparaît, ne bloque aucun toucher, disparaît en deux secondes environ', async ({ page }) => {
  await openApp(page, { dismissWelcome: false });
  await page.getByRole('button', { name: 'Entrer dans IMPRO LAB' }).click();
  const scene = page.locator('.rf-scene');
  await expect(scene.locator('.rf-masque')).toHaveCount(1);
  expect(await scene.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await page.getByRole('button', { name: 'Tirer un exercice ↗' }).click();
  await expect(page.locator('#homeQuickResult h4')).toBeVisible();
  await expect(scene).toHaveCount(0, { timeout: 4000 });
});

test('masque d’ouverture coupé quand l’appareil demande moins d’animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { dismissWelcome: false });
  await page.getByRole('button', { name: 'Entrer dans IMPRO LAB' }).click();
  await expect(page.locator('#welcomeScreen')).toBeHidden();
  await expect(page.locator('.rf-scene')).toHaveCount(0);
});

test('aide de page derrière « ? » sur Groupes, curseurs du tirage repliés, ajout de joueurs replié quand l’effectif existe', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Groupes');
  const intro = page.locator('#groupes > h2 + p.muted');
  await expect(intro).toBeHidden();
  const aide = page.locator('#groupes > h2 .rf-aide');
  expect((await aide.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await aide.click();
  await expect(intro).toBeVisible();
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

test('tirage de l’Accueil : le titre défile puis s’arrête, le vrai titre ne change pas', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Tirer un exercice ↗' }).click();
  const h4 = page.locator('#homeQuickResult h4');
  await expect(h4).toBeVisible();
  const titre = await h4.evaluate(el => el.firstChild.textContent);
  await expect(page.locator('#homeQuickResult .rf-rouleau')).toHaveCount(0, { timeout: 3000 });
  await expect(h4).toHaveText(titre);
  await expect(h4).not.toHaveClass(/rf-roule/);
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
