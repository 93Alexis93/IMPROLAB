'use strict';
// D44 : « Accueil plus » — défi du jour modifiable, mot d'accueil, visite guidée, écrans vides, recherche globale.
const { test, expect } = require('@playwright/test');
const { openApp, openTab } = require('./helpers.cjs');

test('défi du jour : en changer, le relever, revenir à celui de la date', async ({ page }) => {
  await openApp(page);
  const box = page.locator('#homeChallenge');
  const first = (await box.locator('h3').textContent()).trim();
  await box.getByRole('button', { name: /Un autre défi/ }).click();
  const second = (await box.locator('h3').textContent()).trim();
  expect(second).not.toBe(first);
  // Le choix tient après un changement d'onglet et un rechargement.
  await page.evaluate(() => { tab('seance'); tab('home'); });
  await expect(box.locator('h3')).toHaveText(second);
  await page.reload();
  await expect(box.locator('h3')).toHaveText(second);
  // Relever : compteur, série, bouton coché.
  await box.getByRole('button', { name: /Je l’ai relevé/ }).click();
  await expect(box.getByRole('button', { name: /Relevé/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(box.locator('.ap-defi-bilan')).toContainText('1 / ');
  await expect(box.locator('.ap-defi-bilan')).toContainText('1 jour de suite');
  // Retour au défi de la date.
  await box.getByRole('button', { name: /revenir au défi de la date/ }).click();
  await expect(box.locator('h3')).toHaveText(first);
  // « Un autre défi » évite les défis déjà relevés.
  const avoided = await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('impro-defi-v1'));
    e.faits = HOME_CHALLENGES.map(c => c[0]).filter(t => t !== 'Dis oui' && t !== 'Trois secondes');
    e.choix = 'Dis oui'; e.jour = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date());
    localStorage.setItem('impro-defi-v1', JSON.stringify(e));
    apDefiAutre();
    return document.querySelector('#homeChallenge h3').textContent;
  });
  expect(avoided).toBe('Trois secondes');
});

test('défi du jour : familles et défis personnels, compris dans la sauvegarde', async ({ page }) => {
  await openApp(page);
  const box = page.locator('#homeChallenge');
  await box.locator('.ap-defi-plus > summary').click();
  await box.getByRole('button', { name: 'Audace', exact: true }).click();
  await expect(box.locator('.ap-famille')).toHaveText('Audace');
  for (let i = 0; i < 4; i++) {
    await box.getByRole('button', { name: /Un autre défi/ }).click();
    await expect(box.locator('.ap-famille')).toHaveText('Audace');
  }
  // Défi personnel.
  if (!(await box.locator('.ap-defi-plus').evaluate(d => d.open))) await box.locator('.ap-defi-plus > summary').click();
  await box.getByLabel('Titre de ton défi').fill('Le regard franc');
  await box.getByLabel('Ce qu’il faut faire').fill('Regarde ton partenaire dans les yeux à chaque réplique.');
  await box.getByRole('button', { name: /Ajouter mon défi/ }).click();
  await expect(box.locator('h3')).toHaveText('Le regard franc');
  await expect(box.locator('.ap-famille')).toHaveText('Mes défis');
  const saved = await page.evaluate(() => backupPayload());
  expect(JSON.stringify(saved)).toContain('Le regard franc');
  // Retrait.
  page.once('dialog', d => d.accept());
  if (!(await box.locator('.ap-defi-plus').evaluate(d => d.open))) await box.locator('.ap-defi-plus > summary').click();
  await box.getByRole('button', { name: 'Retirer le défi Le regard franc' }).click();
  await expect(box.locator('h3')).not.toHaveText('Le regard franc');
});

test('chaque défi de base appartient à une famille', async ({ page }) => {
  await openApp(page);
  const orphans = await page.evaluate(() => {
    const out = [];
    // On passe par la recherche, qui affiche la famille de chaque défi trouvé.
    for (const c of HOME_CHALLENGES) {
      apRecherche();
      const champ = document.getElementById('apChercheChamp');
      champ.value = c[0]; champ.dispatchEvent(new Event('input'));
      const items = [...document.querySelectorAll('.ap-cherche-groupe')].filter(g => g.querySelector('h3').textContent.includes('Défis'));
      const hit = items.length && [...items[0].querySelectorAll('.ap-cherche-item')].find(b => b.querySelector('b').textContent === c[0]);
      if (!hit || hit.querySelector('small').textContent === 'Défi') out.push(c[0]);
    }
    return out;
  });
  expect(orphans).toEqual([]);
});

test('mot d’accueil : une action principale selon le moment', async ({ page }) => {
  await openApp(page);
  const hello = page.locator('#apBonjour');
  await expect(hello).toBeVisible();
  await expect(hello).toContainText('Par où commencer');
  await expect(hello.getByRole('button', { name: /Créer ma première séance/ })).toBeVisible();
  // Placé avant l'échauffement express.
  const order = await page.evaluate(() => ['#apBonjour', '.home-actions'].map(q => document.querySelector(q).getBoundingClientRect().top));
  expect(order[0]).toBeLessThan(order[1]);
  await hello.getByRole('button', { name: /Créer ma première séance/ }).click();
  await expect(page.locator('#seance')).toBeVisible();
  // Avec un historique : « On remet ça ? ».
  await page.evaluate(() => { localStorage.setItem('impro-history', JSON.stringify([{ date: new Date().toISOString(), html: '', groupe: 'Club collège' }])); tab('home'); });
  await expect(hello).toContainText('On remet ça');
  await expect(hello).toContainText('Club collège');
});

test('visite guidée : se lance depuis l’Accueil, se passe, se retrouve dans « Plus »', async ({ page }) => {
  await openApp(page);
  await page.locator('#apBonjour').getByRole('button', { name: /Visite guidée/ }).click();
  const bubble = page.locator('.ap-visite-bulle');
  await expect(bubble).toBeVisible();
  await expect(bubble).toContainText('1 / ');
  await bubble.getByRole('button', { name: /Suivant/ }).click();
  await expect(bubble).toContainText('Un défi par jour');
  await page.keyboard.press('Escape');
  await expect(bubble).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('improlab-visite-vue'))).toBe('1');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await nav.locator('.more-navigation > summary').click();
  await nav.getByRole('button', { name: /Visite guidée/ }).click();
  await expect(bubble).toBeVisible();
  await bubble.getByRole('button', { name: 'Passer' }).click();
  await expect(bubble).toHaveCount(0);
});

test('écrans vides : Historique et Joueurs proposent quoi faire', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Historique');
  await expect(page.locator('#historyResult .ap-vide')).toContainText('Aucune séance enregistrée');
  await expect(page.locator('#historyResult .card')).toHaveCount(0);
  await page.locator('#historyResult').getByRole('button', { name: /Préparer une séance/ }).click();
  await expect(page.locator('#seance')).toBeVisible();
  await page.evaluate(() => tab('groupes'));
  await expect(page.locator('#apRosterVide')).toBeVisible();
  await page.evaluate(() => { document.getElementById('rosterInput').value = 'Camille\nSam'; rosterAdd(); });
  await expect(page.locator('#apRosterVide')).toBeHidden();
});

test('recherche globale : exercices, défis, et ouverture du résultat', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Rechercher dans IMPRO LAB' }).click();
  const dialog = page.getByRole('dialog', { name: 'Rechercher dans IMPRO LAB' });
  await expect(dialog).toBeVisible();
  await dialog.locator('#apChercheChamp').fill('statut');
  await expect(dialog).toContainText('Exercices');
  await expect(dialog).toContainText('Statut haut, voix calme');
  await dialog.locator('#apChercheChamp').fill('zzzzqq');
  await expect(dialog).toContainText('Rien trouvé');
  await dialog.locator('#apChercheChamp').fill('statut');
  await dialog.locator('.ap-cherche-groupe').first().locator('.ap-cherche-item').first().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#jeux')).toBeVisible();
  await expect(page.locator('#search')).not.toHaveValue('');
  // Un défi trouvé devient le défi du jour.
  await page.getByRole('button', { name: 'Rechercher dans IMPRO LAB' }).click();
  await dialog.locator('#apChercheChamp').fill('trois respirations');
  await dialog.getByRole('button', { name: /Trois respirations/ }).click();
  await expect(page.locator('#homeChallenge h3')).toHaveText('Trois respirations');
});

test('cibles tactiles des nouveautés : au moins 44 px', async ({ page }) => {
  await openApp(page);
  await page.locator('#homeChallenge .ap-defi-plus > summary').click();
  const small = await page.evaluate(() => [...document.querySelectorAll('#apBonjour button, #homeChallenge .ap-defi-actions button, #homeChallenge .ap-familles button, #homeChallenge .ap-defi-form button, .ap-loupe')]
    .filter(b => b.getClientRects().length).map(b => [b.textContent.trim().slice(0, 20), Math.round(b.getBoundingClientRect().height)]).filter(x => x[1] < 44));
  expect(small).toEqual([]);
});
