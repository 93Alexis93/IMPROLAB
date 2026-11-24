'use strict';
// D45 : « Séance plus » — ajout depuis la Bibliothèque et la recherche globale, recherche dans l'ajout à la main, fiche coach imprimable.
const { test, expect } = require('@playwright/test');
const { openApp, openTab, openSeance } = require('./helpers.cjs');

const planTitles = page => page.locator('#plan>.card h3').allTextContents();

test('Bibliothèque : ajouter un exercice à la séance sans quitter l’écran', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  await page.locator('#search').fill('Sa, Mu');
  const card = page.locator('#games .card').first();
  const add = card.getByRole('button', { name: /Ajouter à la séance/ });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await add.click();
  await expect(card.locator('.lib-add-status')).toContainText('ajouté à la séance du groupe Club collège · 1 exercice, 8 min');
  await expect(card.locator('.lib-add')).toHaveText('✓ Dans la séance');
  await expect(card.locator('.lib-add')).toBeDisabled();
  await expect(page.locator('#jeux')).toBeVisible();
  // La séance contient l'exercice, avec la durée de la fiche et la fiche dépliable.
  await openSeance(page);
  expect(await planTitles(page)).toEqual(['Sa, Mu, Raï !']);
  await expect(page.locator('#plan>.card').first().locator('small').first()).toHaveText('8 min');
  await expect(page.locator('#plan>.card .fiche-more').first()).toBeAttached();
  // Retour dans la Bibliothèque : le bouton reste « Dans la séance » ; après un rechargement aussi.
  await page.reload();
  await openTab(page, 'Bibliothèque');
  await page.locator('#search').fill('Sa, Mu');
  await expect(page.locator('#games .card').first().locator('.lib-add')).toHaveText('✓ Dans la séance');
});

test('recherche globale : « ＋ Séance » ajoute l’exercice et reste dans la recherche', async ({ page }) => {
  await openApp(page);
  await page.locator('.ap-loupe').click();
  await page.locator('#apChercheChamp').fill('samouraï sa mu');
  await page.locator('#apChercheChamp').fill('Sa, Mu');
  const add = page.getByRole('button', { name: /Ajouter à la séance : Sa, Mu, Raï/ });
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.locator('#apChercheAjout')).toContainText('ajouté à la séance');
  await expect(page.getByRole('button', { name: /Déjà dans la séance : Sa, Mu, Raï/ })).toBeDisabled();
  await expect(page.locator('#apCherche')).toBeVisible();
  await page.locator('.ap-cherche-fermer').click();
  await openSeance(page);
  expect(await planTitles(page)).toEqual(['Sa, Mu, Raï !']);
});

test('ajout à la main : recherche sans accents, autre nom, filtre par objectif', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.locator('.add-exercise > summary').click();
  const search = page.locator('#manualSearch');
  await expect(search).toBeVisible();
  await search.fill('samourai');
  await expect(page.locator('#manualGame option')).toHaveCount(1);
  await expect(page.locator('#manualGame option').first()).toContainText('Sa, Mu, Raï');
  await expect(page.locator('#manualCount')).toHaveText('1 exercice trouvé');
  await expect(page.locator('#manualMins')).toHaveValue('8');
  await page.locator('#manualAdd').click();
  expect(await planTitles(page)).toEqual(['Sa, Mu, Raï !']);
  await expect(page.locator('#manualCount')).toContainText('ajouté à la séance');
  // Rien trouvé : bouton désactivé.
  await search.fill('zzzz');
  await expect(page.locator('#manualGame option')).toHaveCount(0);
  await expect(page.locator('#manualAdd')).toBeDisabled();
  await expect(page.locator('#manualCount')).toContainText('Aucun exercice trouvé');
  // Filtre par objectif seul : tous les exercices de cet objectif, principal ou secondaire.
  await search.fill('');
  await page.locator('#manualCategory').selectOption('Écoute');
  const expected = await page.evaluate(() => data.filter(g => g[1] === 'Écoute' || (g[11] || []).includes('Écoute')).length);
  await expect(page.locator('#manualGame option')).toHaveCount(expected);
  await page.locator('#manualCategory').selectOption('');
  const all = await page.evaluate(() => data.length);
  await expect(page.locator('#manualGame option')).toHaveCount(all);
});

test('fiche coach : consignes, conseils pour coacher et conseils du groupe, impression seule', async ({ page }) => {
  await openApp(page);
  // Historique : une séance du groupe avec avis 👍 et carnet rempli ; notes perso sur la fiche.
  await page.evaluate(() => {
    localStorage.setItem('impro-history', JSON.stringify([{ date: '2026-11-10T10:00:00.000Z', groupe: 'Club collège', groupeId: 'college', html: '<div class="card"><small>8 min</small><h3>Sa, Mu, Raï !</h3></div>', bilan: { retours: { 'Sa, Mu, Raï !': 1 }, retravailler: 'Écouter avant de parler', marche: 'L’énergie du début' } }]));
    rebuildGroupFeedback('college');
    localStorage.setItem('impro-my-notes-v1', JSON.stringify({ '1-1': 'Parfait pour réveiller le groupe.' }));
  });
  await openSeance(page);
  await page.evaluate(() => generate());
  await page.evaluate(() => sessionAddByTitle('Sa, Mu, Raï !'));
  const n = await page.locator('#plan>.card h3').count();
  // Bouton visible, et la fiche coach n'apparaît pas à l'écran.
  await expect(page.getByRole('button', { name: /Fiche coach \(PDF\)/ })).toBeVisible();
  await page.evaluate(() => { window.print = () => { window.__printed = document.body.className; }; });
  await page.getByRole('button', { name: /Fiche coach \(PDF\)/ }).click();
  expect(await page.evaluate(() => window.__printed)).toContain('print-coach');
  await expect(page.locator('#coachSheet')).toBeHidden();
  const sheet = page.locator('#coachSheet');
  await expect(sheet.locator('.coach-jeu')).toHaveCount(n);
  await expect(sheet.locator('h1')).toContainText('Fiche coach · séance du');
  await expect(sheet.locator('.coach-meta')).toContainText('Groupe Club collège · ' + n + ' exercices');
  await expect(sheet.locator('.coach-groupe')).toContainText('À retravailler : Écouter avant de parler');
  const sa = sheet.locator('.coach-jeu', { hasText: 'Sa, Mu, Raï' });
  await expect(sa).toContainText('Consigne à donner : En cercle, envoie « Sa »');
  await expect(sa).toContainText('Si ça coince : Jouez d’abord sans élimination');
  await expect(sa).toContainText('Vigilance :');
  await expect(sa.locator('.coach-perso')).toContainText('Déjà joué une fois avec ce groupe, la dernière le 10 novembre');
  await expect(sa.locator('.coach-perso')).toContainText('Il a bien marché avec ce groupe (1 avis positif)');
  await expect(sa.locator('.coach-perso')).toContainText('Mes notes : Parfait pour réveiller le groupe.');
  // En mode impression : seule la fiche coach est visible.
  await page.evaluate(() => document.body.classList.add('print-coach'));
  await page.emulateMedia({ media: 'print' });
  await expect(sheet).toBeVisible();
  await expect(page.locator('#plan')).toBeHidden();
  await expect(page.locator('body > header')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden();
});

test('fiche coach : séance vide refusée avec un message', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  const messages = [];
  page.on('dialog', d => { messages.push(d.message()); d.dismiss(); });
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole('button', { name: /Fiche coach \(PDF\)/ }).click();
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toContain('Crée une séance avant d’imprimer la fiche coach');
  expect(await page.evaluate(() => window.__printed)).toBeFalsy();
});
