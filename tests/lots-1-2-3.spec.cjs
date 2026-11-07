'use strict';

// Lots 1 à 3 du 2026-11-07 (DECISIONS D23 à D25) : rappel de sauvegarde, avis pris en Régie,
// prénoms à la première séance, signal de fin, séance par groupe, noms de groupes, bilan du trimestre.
const { test, expect } = require('@playwright/test');
const { openApp, reloadApp, openSeance, openTab } = require('./helpers.cjs');

async function chooseGroup(page, id) {
  await page.locator('#groupProfile').selectOption(id);
  await expect(page.locator('#groupProfile')).toHaveValue(id);
}
const planTitles = page => page.locator('#plan > .card h3').allTextContents();

test('rappel de sauvegarde : absent sans données, présent après 7 jours sans sauvegarde, disparaît après la sauvegarde', async ({ page }) => {
  await openApp(page);
  const reminder = page.locator('#backupReminder');
  await expect(reminder).toBeHidden();
  await expect(page.locator('#backupLast')).toContainText('Aucune sauvegarde');

  await page.evaluate(() => localStorage.setItem('impro-history', JSON.stringify([{ date: new Date().toISOString(), html: '', groupe: 'Club collège' }])));
  await reloadApp(page);
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText('jamais sauvegardé');

  await page.evaluate(() => localStorage.setItem('improlab-backup-last', new Date(Date.now() - 10 * 86400000).toISOString()));
  await reloadApp(page);
  await expect(reminder).toContainText('il y a 10 jours');

  await page.evaluate(() => localStorage.setItem('improlab-backup-last', new Date(Date.now() - 2 * 86400000).toISOString()));
  await reloadApp(page);
  await expect(reminder).toBeHidden();
  await expect(page.locator('#backupLast')).toContainText('il y a 2 jours');

  // La sauvegarde elle-même met la date à jour et retire le bandeau.
  await page.evaluate(() => localStorage.setItem('improlab-backup-last', new Date(Date.now() - 30 * 86400000).toISOString()));
  await reloadApp(page);
  await expect(reminder).toBeVisible();
  await page.evaluate(() => { navigator.share = undefined; });
  const download = page.waitForEvent('download');
  await reminder.getByRole('button', { name: /Sauvegarder maintenant/ }).click();
  await download;
  await expect(reminder).toBeHidden();
  await expect(page.locator('#backupLast')).toContainText('aujourd’hui');
  const box = await reminder.evaluate(el => el.hidden);
  expect(box).toBe(true);
  // La date de sauvegarde ne fait pas partie de la sauvegarde.
  expect(await page.evaluate(() => backupKeys().includes('improlab-backup-last'))).toBe(false);
});

test('première séance d’un groupe : un jeu pour apprendre les prénoms est placé au début', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  // Deux générations de suite : chacune reçoit un des deux jeux de prénoms, sans casser la rotation.
  for (let round = 0; round < 2; round++) {
    await page.evaluate(() => localStorage.removeItem('impro-history'));
    await page.getByRole('button', { name: 'Générer ma séance' }).click();
    const firstTwo = await page.evaluate(() => [...document.querySelectorAll('#plan>.card[data-stage-index]')].slice(0, 2).map(c => {
      const t = c.querySelector('h3').textContent; const g = data.find(x => displayTitle(x[0]) === t); return g ? gameUsages(g) : [];
    }));
    expect(firstTwo.some(u => u.includes('apprentissage des prénoms'))).toBe(true);
    await expect(page.locator('#planSummary')).toContainText('apprendre les prénoms');
  }
});

test('Régie : 👍 et note rapide pendant le jeu, versés dans le carnet de bord à l’enregistrement', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const first = (await planTitles(page))[0];
  await openTab(page, 'Régie');
  const up = page.locator('#liveVoteUp');
  await expect(up).toBeVisible();
  expect((await up.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await up.click();
  await expect(up).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#liveNoteInput').fill('Très belle écoute');
  await page.getByRole('button', { name: '＋ Noter' }).click();
  await expect(page.locator('#liveFeedbackStatus')).toContainText('Note ajoutée');

  // Le même avis se retrouve dans le plein écran.
  await page.getByRole('button', { name: 'Plein écran' }).click();
  await expect(page.locator('#stageVoteUp')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#stageView').getByRole('button', { name: '✕ Quitter' }).click();

  await openSeance(page);
  await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  await openTab(page, 'Historique');
  const card = page.locator('#historyResult .card').first();
  await card.locator('.history-review > summary').click();
  await expect(card.getByLabel('Notes prises pendant la séance')).toHaveValue(first + ' : Très belle écoute');
  await expect(card.getByRole('button', { name: 'A bien marché : ' + first })).toHaveAttribute('aria-pressed', 'true');
  const fb = await page.evaluate(t => { const g = gameByShownTitle(t); return readGroupFeedback('college')[g[0]]; }, first);
  expect(fb).toBe(1);
  // Les avis de Régie sont remis à zéro après l'enregistrement.
  expect(await page.evaluate(() => localStorage.getItem('impro-live-notes-v1'))).toBeNull();
});

test('Régie : le chrono pulse à l’échéance et s’arrête de pulser à la pause', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Régie');
  // Réglages repliés dans la Régie : on passe par les mêmes fonctions que les menus.
  await page.evaluate(() => { document.getElementById('liveMode').value = 'free'; liveModeChange(); document.getElementById('liveMinutes').value = '0.02'; liveSetDuration(); });
  await page.locator('#liveStart').click();
  await expect(page.locator('#liveClock')).toHaveClass(/clock-over/, { timeout: 5000 });
  await page.locator('#liveStart').click();
  await expect(page.locator('#liveClock')).not.toHaveClass(/clock-over/);
  await expect(page.locator('#liveWarn')).toBeChecked();
});

test('séance par groupe : changer de groupe garde la séance préparée de chacun', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const club = await planTitles(page);
  expect(club.length).toBe(5);
  await chooseGroup(page, 'copains');
  await expect(page.locator('#plan > .card')).toHaveCount(0);
  await expect(page.locator('#groupProfileStatus')).toContainText('Pas encore de séance');
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const copains = await planTitles(page);
  await chooseGroup(page, 'college');
  expect(await planTitles(page)).toEqual(club);
  await reloadApp(page);
  await openSeance(page);
  expect(await planTitles(page)).toEqual(club);
  await chooseGroup(page, 'copains');
  expect(await planTitles(page)).toEqual(copains);
});

test('noms de groupes : renommer garde les séances, les avis et le fil rouge du groupe', async ({ page }) => {
  let answer = 'Impro 5e';
  page.on('dialog', dialog => dialog.type() === 'prompt' ? dialog.accept(answer) : dialog.accept());
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  await page.getByRole('button', { name: '✏️ Renommer ce groupe' }).click();
  await expect(page.locator('#groupProfile option[value="college"]')).toHaveText('Impro 5e');
  await expect(page.locator('#groupProfileStatus')).toContainText('Impro 5e');
  await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  await openTab(page, 'Historique');
  // L'ancienne séance (enregistrée sous « Club collège ») et la nouvelle s'affichent sous le nouveau nom.
  await expect(page.locator('#historyResult .card h3').nth(0)).toContainText('Impro 5e');
  await expect(page.locator('#historyResult .card h3').nth(1)).toContainText('Impro 5e');
  expect(await page.evaluate(() => readHistory().map(historyGroupId))).toEqual(['college', 'college']);
  await reloadApp(page);
  await expect(page.locator('#groupProfile option[value="college"]')).toHaveText('Impro 5e');
  // Un nom déjà pris par un autre groupe est refusé ; un nom vide rend le nom d'origine.
  await openSeance(page);
  answer = 'Copains';
  await page.getByRole('button', { name: '✏️ Renommer ce groupe' }).click();
  await expect(page.locator('#groupProfileStatus')).toContainText('déjà celui d’un autre groupe');
  answer = '';
  await page.getByRole('button', { name: '✏️ Renommer ce groupe' }).click();
  await expect(page.locator('#groupProfile option[value="college"]')).toHaveText('Club collège');
});

test('exercice aléatoire : choix du groupe synchronisé avec Préparer, jeux écartés jamais tirés', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Exercice aléatoire');
  await page.locator('#randomGroupProfile').selectOption('copains');
  await openSeance(page);
  await expect(page.locator('#groupProfile')).toHaveValue('copains');
  await chooseGroup(page, 'asso');
  await expect(page.locator('#randomGroupProfile')).toHaveValue('asso');
  // On écarte tous les jeux tirables sauf un : le tirage ne propose que celui-là.
  const keep = await page.evaluate(() => {
    const pool = data.filter(g => g[6] && g[5] && g[2] && g[2].trim().length > 20 && !['notes originales', 'proposition à valider', 'à confirmer'].includes((g[12] || '').toLowerCase()));
    writeExcluded(pool.slice(1).map(g => g[0]), 'asso');
    return displayTitle(pool[0][0]);
  });
  await openTab(page, 'Exercice aléatoire');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '🎲 Tirer un exercice' }).click();
    await expect(page.locator('#randomExerciseResult b').first()).toHaveText(keep);
  }
});

test('bilan du trimestre : séances, avis et présences du groupe, prêt à copier', async ({ page, context }) => {
  page.on('dialog', dialog => dialog.accept());
  await openApp(page);
  await page.evaluate(() => {
    rosterState.college = [{ name: 'Lina', present: true }, { name: 'Sam', present: true }];
    rosterSave();
    const today = localDay();
    localStorage.setItem('impro-attendance-v1', JSON.stringify({ college: [{ date: today, present: ['Lina'] }] }));
  });
  await openSeance(page);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Générer ma séance' }).click();
    await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  }
  await openTab(page, 'Historique');
  const card = page.locator('#historyResult .card').first();
  await card.locator('.history-review > summary').click();
  await card.locator('.review-vote-buttons button').first().click();
  await openTab(page, 'Historique');
  const report = page.locator('#termReport');
  await report.locator('summary').click();
  await expect(page.locator('#termReportBody')).toContainText('Club collège');
  await expect(page.locator('#termReportBody')).toContainText('2 séances enregistrées');
  await expect(page.locator('#termReportBody')).toContainText('1 👍');
  await expect(page.locator('#termReportBody')).toContainText('Lina 1/1');
  await expect(page.locator('#termReportBody')).toContainText('Sam 0/1');
  // Un autre groupe sans séance : message clair.
  await page.locator('#termGroup').selectOption('copains');
  await expect(page.locator('#termReportBody')).toContainText('Aucune séance');
});
