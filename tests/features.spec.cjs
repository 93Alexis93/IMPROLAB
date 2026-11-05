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
