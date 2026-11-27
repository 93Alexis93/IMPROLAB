'use strict';

const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { openApp, openSeance, openTab, setDuration, waitForReady, reloadApp } = require('./helpers.cjs');

// D49 : plans qui tiennent dans la durée réelle (installation, clôture verrouillée, « à sauter si retard »,
// horaires), déroulé fidèle aux cartes, jeux récents sans doublon, titres sans espaces en trop.

const planState = page => page.evaluate(() => planCards().map(c => ({
  title: c.querySelector('h3').textContent.trim(),
  minutes: cardMinutes(c),
  closing: isClosingCard(c),
  skip: c.dataset.skip === '1',
  time: c.querySelector('.plan-time')?.textContent || ''
})));

async function generate(page) {
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await expect(page.locator('#plan>.card.plan-closing')).toHaveCount(1);
}

test('un plan de 55 min a toujours une installation, une clôture et un total égal à la durée', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await setDuration(page, '55');
  await expect(page.locator('#planSetup')).toHaveValue('5');
  await expect(page.locator('#planClosing')).toHaveValue('3');
  for (let run = 0; run < 4; run++) {
    await generate(page);
    const cards = await planState(page);
    const last = cards.at(-1);
    expect(last).toMatchObject({ closing: true, minutes: 3, title: 'Clôture' });
    expect(cards.filter(c => c.closing)).toHaveLength(1);
    expect(cards.reduce((s, c) => s + c.minutes, 0) + 5).toBe(55);
    // Horaires continus : 0 à a, a à b… jusqu'à 50.
    let t = 0;
    for (const c of cards) { expect(c.time).toBe(`${t} à ${t + c.minutes} min`); t += c.minutes; }
    expect(t).toBe(50);
  }
  await expect(page.locator('#planSummary')).toContainText('50 min de jeu + 5 min d’installation et rangement = 55 minutes / 55 minutes ✓');

  // Réglages : 8 min d'installation, 4 min de clôture. La clôture garde sa durée, le jeu se resserre.
  await page.locator('#planSetup').fill('8');
  await page.locator('#planSetup').dispatchEvent('change');
  await page.locator('#planClosing').fill('4');
  await page.locator('#planClosing').dispatchEvent('change');
  for (const duration of ['35', '45', '60', '90']) {
    await setDuration(page, duration);
    await generate(page);
    const cards = await planState(page);
    expect(cards.at(-1)).toMatchObject({ closing: true, minutes: 4 });
    expect(cards.reduce((s, c) => s + c.minutes, 0) + 8).toBe(Number(duration));
    expect(cards.filter(c => !c.closing).every(c => c.minutes >= 3)).toBe(true);
  }
  await reloadApp(page);
  await openSeance(page);
  await expect(page.locator('#planSetup')).toHaveValue('8');
  await expect(page.locator('#plan>.card').last()).toHaveClass(/plan-closing/);
});

test('la clôture reste en dernier, et un dépassement est signalé au lieu d’un plan intenable', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await generate(page);
  const closing = page.locator('#plan>.card.plan-closing');
  await expect(closing.locator('.edit-actions')).toHaveCount(0);
  // L'exercice juste avant la clôture ne peut pas descendre.
  const beforeClosing = page.locator('#plan>.card:not(.session-objective):not(.plan-closing)').last();
  await expect(beforeClosing.getByRole('button', { name: /Descendre exercice/ })).toBeDisabled();
  // Un exercice ajouté à la main se place avant la clôture.
  await page.evaluate(() => { const d = document.querySelector('.add-exercise'); if (d) d.open = true; });
  await page.locator('#manualMins').fill('4');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.locator('#plan>.card').last()).toHaveClass(/plan-closing/);
  await expect(page.locator('#planSummary')).toHaveClass(/plan-overflow/);
  await expect(page.locator('#planSummary')).toContainText('Plan intenable : 4 min de trop');
  await expect(page.locator('#planSummary')).toHaveAttribute('role', 'alert');
  // On retire 4 minutes : le plan tient de nouveau.
  // On retire 4 minutes à l'exercice le plus long (la scène finale en général).
  const longest = await page.evaluate(() => { const cards = planCards().filter(c => !isClosingCard(c)); const m = cards.map(cardMinutes); return m.indexOf(Math.max(...m)); });
  const target = page.locator('#plan>.card:not(.session-objective):not(.plan-closing)').nth(longest);
  for (let i = 0; i < 4; i++) await target.getByRole('button', { name: '− 1 min' }).click();
  await expect(page.locator('#planSummary')).toContainText('= 55 minutes / 55 minutes ✓');
  await expect(page.locator('#planSummary')).not.toHaveClass(/plan-overflow/);
  // Durée trop courte pour l'installation et la clôture : rien n'est produit.
  await page.locator('#planSetup').fill('30');
  await page.locator('#planSetup').dispatchEvent('change');
  await setDuration(page, '35');
  const before = await planState(page);
  page.once('dialog', d => { expect(d.message()).toContain('Séance trop courte'); d.accept(); });
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  expect(await planState(page)).toHaveLength(before.length);
});

test('le badge « à sauter si retard » apparaît à l’écran et dans la version imprimée, et se déplace d’un geste', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await generate(page);
  const exercises = page.locator('#plan>.card:not(.session-objective):not(.plan-closing)');
  const n = await exercises.count();
  // Par défaut : l'exercice juste avant la scène finale.
  await expect(page.locator('#plan>.card[data-skip="1"]')).toHaveCount(1);
  await expect(exercises.nth(n - 2)).toHaveAttribute('data-skip', '1');
  const badge = exercises.nth(n - 2).locator('.skip-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('⏭ À sauter si retard');

  await page.emulateMedia({ media: 'print' });
  await expect(badge).toBeVisible();
  await expect(page.locator('#plan .skip-toggle').first()).toBeHidden();
  await expect(exercises.first().locator('.plan-time')).toBeVisible();
  await expect(page.locator('#planSummary')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });

  // Un geste : le badge passe sur le premier exercice.
  const toggle = exercises.first().locator('.skip-toggle');
  const box = await toggle.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await toggle.tap();
  await expect(page.locator('#plan>.card[data-skip="1"]')).toHaveCount(1);
  await expect(exercises.first().locator('.skip-badge')).toBeVisible();
  await expect(exercises.nth(n - 2).locator('.skip-badge')).toHaveCount(0);
  await reloadApp(page);
  await openSeance(page);
  await expect(page.locator('#plan>.card:not(.session-objective)').first()).toHaveAttribute('data-skip', '1');
  await expect(page.locator('#plan>.card.plan-closing')).toHaveCount(1);
});

test('le texte d’introduction suit l’ordre réel des cartes et leur catégorie', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await generate(page);
  const check = async () => {
    const r = await page.evaluate(() => {
      const cards = planCards().filter(c => !isClosingCard(c));
      const titles = cards.map(c => c.querySelector('h3').textContent.trim());
      const cats = cards.map(c => gameOfCard(c)?.[1]);
      return { titles, cats, flow: document.querySelector('#plan .plan-flow')?.textContent || '' };
    });
    let pos = -1;
    r.titles.forEach((t, i) => {
      const at = r.flow.indexOf('« ' + t + ' » (' + r.cats[i] + ')');
      expect(at, 'présent dans le déroulé : ' + t).toBeGreaterThan(pos);
      pos = at;
    });
    expect(r.flow.startsWith('On démarre avec « ' + r.titles[0] + ' »')).toBe(true);
    return r;
  };
  const before = await check();
  await page.locator('#plan>.card:not(.session-objective)').first().getByRole('button', { name: /Descendre exercice/ }).click();
  const after = await check();
  expect(after.titles[0]).toBe(before.titles[1]);
  // L'étiquette de la carte affiche la vraie catégorie du jeu.
  const labels = await page.locator('#plan>.card[data-stage-index]>small').allTextContents();
  labels.forEach((l, i) => expect(l.split(' · ')[2]).toBe(after.cats[i]));
  await reloadApp(page);
  await openSeance(page);
  await check();
});

test('jeux récents sans doublon, le plus récent d’abord, et titres sans espaces en trop', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('impro-recent-games', JSON.stringify(['Doublage ', 'Doublage', 'Duel au cercle', 'Duel au cercle', 'Convergence '])));
  await reloadApp(page);
  await openSeance(page);
  for (let i = 0; i < 3; i++) await generate(page);
  const recent = await page.evaluate(() => JSON.parse(localStorage.getItem('impro-recent-games')));
  expect(new Set(recent).size).toBe(recent.length);
  expect(recent.every(t => t === t.trim())).toBe(true);
  const lastPlan = await page.evaluate(() => planCards().filter(c => !isClosingCard(c)).map(c => gameOfCard(c)[0]));
  expect(recent.slice(0, lastPlan.length).sort()).toEqual([...lastPlan].sort());
  expect(recent).not.toContain('Clôture');
  // Titres de la bibliothèque : plus d'espace final en mémoire, favori ancien reconnu.
  const titles = await page.evaluate(() => data.map(g => g[0]));
  expect(titles.filter(t => t !== t.trim())).toEqual([]);
  expect(titles).toContain('Doublage');
  await page.evaluate(() => localStorage.setItem('impro-favorites', JSON.stringify(['Doublage '])));
  expect(await page.evaluate(() => isFavorite('Doublage'))).toBe(true);
});

test('journal : l’exercice « à sauter si retard » non lancé en Régie arrive en « pas joué »', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await generate(page);
  const skipTitle = (await page.locator('#plan>.card[data-skip="1"] h3').textContent()).trim();
  // Sans Régie : rien n'est deviné.
  await page.getByRole('button', { name: 'Clore la séance' }).click();
  await expect(page.getByRole('checkbox', { name: skipTitle + ' : joué' })).toBeChecked();
  await page.getByRole('button', { name: 'Annuler' }).click();
  // En Régie : chrono lancé sur le premier exercice, puis on passe directement à la suite.
  await openTab(page, 'Régie');
  await page.locator('#liveStart').click();
  await page.locator('#liveStart').click();
  await openSeance(page);
  await page.getByRole('button', { name: 'Clore la séance' }).click();
  await expect(page.getByRole('checkbox', { name: skipTitle + ' : joué' })).not.toBeChecked();
  const firstTitle = await page.locator('.journal-exercise-title').first().textContent();
  await expect(page.getByRole('checkbox', { name: firstTitle + ' : joué' })).toBeChecked();
  await expect(page.locator('.journal-exercise').filter({ hasText: skipTitle })).toContainText('à sauter si retard');
  await page.getByRole('button', { name: /Enregistrer au journal/ }).click();
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('impro-session-log-v1')));
  expect(log[0].exercices.find(x => x.titre === skipTitle)).toEqual({ titre: skipTitle, prevu: true, joue: false, commentaire: '' });
  expect(log[0].exercices.at(-1)).toMatchObject({ titre: 'Clôture', joue: true });
});

test('sauvegarde : un aller-retour export/import conserve le plan, ses marques, les réglages et le journal', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await openSeance(page);
  await page.locator('#planSetup').fill('7');
  await page.locator('#planSetup').dispatchEvent('change');
  await generate(page);
  await page.locator('#plan>.card:not(.session-objective)').first().locator('.skip-toggle').click();
  await page.getByRole('button', { name: 'Clore la séance' }).click();
  await page.getByRole('button', { name: /Enregistrer au journal/ }).click();
  const snapshot = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('impro-')).sort().map(k => [k, localStorage.getItem(k)])));
  const before = await snapshot();
  expect(Object.keys(before)).toEqual(expect.arrayContaining(['impro-plan-timing-v1', 'impro-last-plan', 'impro-session-log-v1', 'impro-recent-games']));
  const planBefore = await planState(page);

  await openTab(page, 'Accueil');
  await page.evaluate(() => { navigator.share = undefined; const d = document.querySelector('.home-backup'); if (d) d.open = true; });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Tout sauvegarder/ }).click();
  const path = await (await download).path();
  const backup = JSON.parse(fs.readFileSync(path, 'utf8'));
  expect(backup.data).toEqual(before);

  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('impro-')) localStorage.removeItem(k); });
  await page.reload();
  await waitForReady(page);
  await openTab(page, 'Accueil');
  const reloaded = page.waitForEvent('load');
  await page.locator('#backupImport').setInputFiles(path);
  await reloaded;
  await waitForReady(page);
  const after = await snapshot();
  for (const k of Object.keys(before)) if (k !== 'impro-last-plan') expect(after[k], k).toBe(before[k]);
  await openSeance(page);
  await expect(page.locator('#planSetup')).toHaveValue('7');
  expect(await planState(page)).toEqual(planBefore);
});
