'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, reloadApp, openSeance, openTab } = require('./helpers.cjs');

async function chooseGroup(page, id) {
  await page.locator('#groupProfile').selectOption(id);
  await expect(page.locator('#groupProfile')).toHaveValue(id);
}

test('carnet de bord : ce qui a marché, qui a brillé et phrase pour les parents', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await openTab(page, 'Historique');
  const card = page.locator('#historyResult .card').first();
  await card.locator('.history-review > summary').click();
  await card.getByLabel('Ce qui a marché').fill('Les scènes à deux <b>');
  await card.getByLabel('Qui a brillé').fill('Lina et Sam');
  await card.getByLabel('À retravailler').fill('Les fins de scène');
  await card.getByRole('button', { name: 'Enregistrer le carnet' }).click();
  await expect(card.locator('.history-review > summary')).toContainText('rempli');
  const sentence = card.getByLabel('Phrase pour les parents');
  await expect(sentence).toHaveValue(/Club collège/);
  await expect(sentence).toHaveValue(/Ce qui a bien marché : Les scènes à deux <b>\./);
  await expect(sentence).toHaveValue(/Bravo à Lina et Sam\./);
  await expect(sentence).toHaveValue(/objectif/);

  await reloadApp(page);
  await openTab(page, 'Historique');
  const again = page.locator('#historyResult .card').first();
  await again.locator('.history-review > summary').click();
  await expect(again.getByLabel('Qui a brillé')).toHaveValue('Lina et Sam');
  await expect(again.getByLabel('À retravailler')).toHaveValue('Les fins de scène');
  await expect(page.locator('#historyResult b')).toHaveCount(0);
});

test('écarter un jeu pour un groupe : il n’est plus proposé à ce groupe, mais reste proposé aux autres', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await chooseGroup(page, 'copains');
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const firstCard = page.locator('#plan>.card:not(.session-objective)').first();
  const title = (await firstCard.locator('h3').textContent()).trim();
  await firstCard.getByRole('button', { name: /^Écarter exercice 1 pour ce groupe$/ }).click();
  await expect(page.locator('#planSummary')).toContainText('Copains');
  await expect(firstCard.locator('h3')).not.toHaveText(title);
  await expect(page.locator('#groupExcludedInfo')).toBeVisible();
  await expect(page.locator('#groupExcludedInfo')).toContainText('1 jeu écarté');

  const excludedRaw = await page.evaluate(() => JSON.parse(localStorage.getItem('impro-group-excluded-v1')).copains);
  expect(excludedRaw).toHaveLength(1);
  for (let round = 0; round < 6; round++) {
    await page.getByRole('button', { name: 'Générer ma séance' }).click();
    const titles = (await page.locator('#plan>.card:not(.session-objective) h3').allTextContents()).map(t => t.trim());
    expect(titles).not.toContain(title);
  }

  await chooseGroup(page, 'college');
  await expect(page.locator('#groupExcludedInfo')).toBeHidden();
  const visibleForClub = await page.evaluate(name => readExcluded().includes(name), excludedRaw[0]);
  expect(visibleForClub).toBe(false);

  await chooseGroup(page, 'copains');
  await page.getByRole('button', { name: 'Tout réautoriser' }).click();
  await expect(page.locator('#groupExcludedInfo')).toBeHidden();
  expect(await page.evaluate(() => readExcluded())).toEqual([]);
});

test('partager une séance : résumé lisible et fichier importable via la feuille de partage', async ({ page }) => {
  await page.addInitScript(() => {
    window.__shared = [];
    navigator.share = async data => { window.__shared.push({ title: data.title, text: data.text, files: (data.files || []).map(f => ({ name: f.name, type: f.type })) }); };
    navigator.canShare = data => !!(data && data.files);
  });
  await openApp(page);
  await openSeance(page);
  await chooseGroup(page, 'asso');
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const titles = (await page.locator('#plan>.card:not(.session-objective) h3').allTextContents()).map(t => t.trim());
  await page.getByRole('button', { name: 'Partager la séance' }).click();
  await expect(page.locator('#planSummary')).toContainText('partagée');
  const shared = await page.evaluate(() => window.__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].text).toContain('Association');
  for (const t of titles) expect(shared[0].text).toContain(t);
  expect(shared[0].files).toEqual([{ name: 'impro-lab-seance.json', type: 'application/json' }]);
});

test('badges de compétences : par joueur, conservés au rechargement, sans note', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Groupes');
  await page.locator('#rosterInput').fill('Lina\nSam <i>');
  await page.locator('#groupes button[onclick="rosterAdd()"]').click();
  await page.locator('#badgesPanel > summary').click();
  const lina = page.getByRole('group', { name: 'Compétences de Lina' });
  await lina.getByRole('button', { name: /Écoute/ }).click();
  await lina.getByRole('button', { name: /Oser/ }).click();
  await expect(lina.getByRole('button', { name: /Écoute/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(lina.getByRole('button', { name: /Accepter/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#badgesList .badge-player').first()).toContainText('2/4');
  await lina.getByRole('button', { name: /Oser/ }).click();
  await expect(page.locator('#badgesList .badge-player').first()).toContainText('1/4');
  await expect(page.locator('#badgesList i')).toHaveCount(0);

  await reloadApp(page);
  await openTab(page, 'Groupes');
  await page.locator('#badgesPanel > summary').click();
  await expect(page.getByRole('group', { name: 'Compétences de Lina' }).getByRole('button', { name: /Écoute/ })).toHaveAttribute('aria-pressed', 'true');
});

test('navigation compacte sur iPhone : une ligne de cinq cibles de 44 px, menu Plus utilisable', async ({ page }) => {
  await openApp(page);
  const nav = page.locator('nav[aria-label="Navigation principale"]');
  const box = await nav.boundingBox();
  expect(box.height).toBeLessThanOrEqual(64);
  for (const item of await nav.locator(':scope > button, :scope > details > summary').all()) {
    const b = await item.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await openTab(page, 'Historique');
  await expect(page.locator('#historique')).toBeVisible();
});

test('match d’impro : score, tirage catégorie et thème de l’asso, lancement du chrono, conservé au rechargement', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Régie');
  await page.locator('#matchPanel > summary').click();
  await page.getByLabel('Nom de l’équipe 1').fill('Les Bleus');
  await page.getByLabel('Nom de l’équipe 2').fill('Les Rouges <s>');
  await page.locator('#matchPanel .regie-options > summary').click();
  await page.locator('#matchCategories').fill('Chantée');
  await page.locator('#matchCategories').dispatchEvent('change');
  await page.locator('#matchThemes').fill('Le dernier métro');
  await page.locator('#matchThemes').dispatchEvent('change');
  await page.locator('#matchMinutes').fill('2');
  await page.locator('#matchMinutes').dispatchEvent('change');

  const blue = page.locator('.match-score > div').first();
  await blue.getByRole('button', { name: '＋ Point' }).click();
  await blue.getByRole('button', { name: '＋ Point' }).click();
  await page.locator('.match-score > div').nth(1).getByRole('button', { name: '＋ Point' }).click();
  await blue.getByRole('button', { name: 'Retirer un point à l’équipe 1' }).click();
  await expect(page.locator('#matchScoreA')).toHaveText('1');
  await expect(page.locator('#matchScoreB')).toHaveText('1');
  await expect(page.locator('#matchNameB')).toHaveText('Les Rouges <s>');

  await page.getByRole('button', { name: 'Tirer catégorie et thème' }).click();
  await expect(page.locator('#matchCurrent')).toHaveText('Catégorie : Chantée · Thème : Le dernier métro · 2 min');
  await page.getByRole('button', { name: 'Lancer l’impro au chrono' }).click();
  await expect(page.locator('#liveMode')).toHaveValue('free');
  await expect(page.locator('#liveTitle')).toHaveText('Chantée');
  await expect(page.locator('#liveInfo')).toHaveText('Thème : Le dernier métro');
  await expect(page.locator('#liveClock')).toHaveText('02:00');

  await reloadApp(page);
  await openTab(page, 'Régie');
  await page.locator('#matchPanel > summary').click();
  await expect(page.locator('#matchScoreA')).toHaveText('1');
  await expect(page.locator('#matchNameA')).toHaveText('Les Bleus');
  await page.getByRole('button', { name: 'Score à zéro' }).click();
  await expect(page.locator('#matchScoreA')).toHaveText('0');
});

test('partager une séance sans feuille de partage : le fichier est téléchargé', async ({ page }) => {
  await page.addInitScript(() => { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch {} navigator.share = undefined; });
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Partager la séance' }).click();
  expect((await download).suggestedFilename()).toBe('impro-lab-seance.json');
  await expect(page.locator('#planSummary')).toContainText('téléchargé');
});
