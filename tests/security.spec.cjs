const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { openApp, reloadApp, waitForReady, library } = require('./helpers.cjs');

const validPayload = html => ({ format: 'impro-lab-session', version: 1, exportedAt: '2026-10-21T00:00:00.000Z', html });
const oneCard = '<div class="card"><small>5 min · Corps</small><h3>Exercice de test</h3><p>Une règle de test.</p></div>';

async function submitImport(page, payload, filename = 'session.json') {
  const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));
  await page.locator('#importSession').setInputFiles({ name: filename, mimeType: 'application/json', buffer });
}
async function expectImportAlert(page, payload, expectedMessage) {
  const dialogPromise = page.waitForEvent('dialog');
  const submitPromise = submitImport(page, payload);
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('alert');
  expect(dialog.message()).toContain(expectedMessage);
  await dialog.accept();
  await submitPromise;
}

test('import hostile : HTML actif rendu comme texte, sans exécution', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.__improLabXss = 0; });
  const hostile = validPayload('<div class="card"><small>5 min</small><h3><img src=x onerror="window.__improLabXss=1">Titre</h3><p><script>window.__improLabXss=2</script>Règle</p></div>');
  await submitImport(page, hostile);
  await expect(page.locator('#plan .card h3')).toContainText('Titre');
  const result = await page.evaluate(() => ({ images: document.querySelectorAll('#plan img').length, scripts: document.querySelectorAll('#plan script').length, executed: window.__improLabXss }));
  expect(result).toEqual({ images: 0, scripts: 0, executed: 0 });
});

test('import refuse un fichier de plus de 150 000 octets', async ({ page }) => {
  await openApp(page);
  await expectImportAlert(page, Buffer.from('x'.repeat(150001)), 'Fichier trop volumineux');
});
test('import refuse un format non reconnu', async ({ page }) => {
  await openApp(page);
  await expectImportAlert(page, { format: 'autre-format', version: 1, html: oneCard }, 'Format non reconnu');
});
test('import refuse plus de 30 cartes', async ({ page }) => {
  await openApp(page);
  const html = Array.from({ length: 31 }, (_, i) => `<div class="card"><h3>Exercice ${i + 1}</h3><p>Règle</p></div>`).join('');
  await expectImportAlert(page, validPayload(html), 'Nombre d’exercices invalide');
});
test('export puis import : les cartes exportées sont identiques', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const before = await page.locator('#plan>.card').evaluateAll(cards => cards.map(card => ({ small: card.querySelector('small')?.textContent || '', title: card.querySelector('h3')?.textContent || '', rule: card.querySelector('p')?.textContent || '' })));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exporter la séance/ }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(exported.format).toBe('impro-lab-session');
  await page.evaluate(() => document.getElementById('plan').replaceChildren());
  await expect(page.locator('#plan>.card')).toHaveCount(0);
  await submitImport(page, Buffer.from(JSON.stringify(exported)), 'roundtrip.json');
  await expect(page.locator('#plan>.card')).toHaveCount(before.length);
  const after = await page.locator('#plan>.card').evaluateAll(cards => cards.map(card => ({ small: card.querySelector('small')?.textContent || '', title: card.querySelector('h3')?.textContent || '', rule: card.querySelector('p')?.textContent || '' })));
  expect(after).toEqual(before);
});
test('aucune fiche non éligible ne figure dans une séance générée', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const titles = await page.locator('#plan>.card h3').allTextContents();
  expect(titles).toHaveLength(5);
  const selected = await page.evaluate(names => names.map(name => {
    const item = data.find(entry => entry[0] === name);
    return { title: name, found: Boolean(item), eligible: Boolean(item && item[6] === true) };
  }), titles);
  expect(selected.every(item => item.found && item.eligible), JSON.stringify(selected)).toBe(true);
  for (const title of titles) {
    const fiche = library.exercices.find(item => item.titre === title);
    if (fiche) expect(fiche.eligible_generateur, `Fiche ${fiche.id}`).toBe(true);
  }
});

const STORAGE_KEYS = [
  'impro-session-dynamics-v1', 'impro-recent-games', 'impro-game-usage-v1',
  'impro-last-plan', 'impro-favorites', 'impro-history', 'impro-random-dynamics-v1',
  'impro-draw-lists-v4', 'impro-draw-lists-v3', 'impro-draw-lists-v2', 'impro-draw-enabled-v2'
];
for (const key of STORAGE_KEYS) {
  test(`stockage corrompu : ${key} ne provoque pas de pageerror`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(storageKey => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__improlab_test_storage_initialized', '1');
      localStorage.setItem(storageKey, '{ JSON volontairement invalide');
    }, key);
    await page.goto('/');
    await waitForReady(page);
    expect(errors, `pageerror avec ${key}`).toEqual([]);
    await expect(page.locator('#libraryStatus')).toContainText(`${library.exercices.length} exercices`);
  });
}
test('mode hors ligne : le service worker conserve la bibliothèque après rechargement', async ({ page, context }) => {
  await openApp(page);
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        setTimeout(resolve, 5000);
      });
    }
    return Boolean(navigator.serviceWorker.controller);
  });
  expect(swReady, 'service worker actif et contrôlant la page').toBe(true);
  await context.setOffline(true);
  // Navigation vers la même URL : WebKit peut renvoyer une erreur interne à page.reload() hors ligne.
  await openApp(page);
  await expect(page.locator('#libraryStatus')).toContainText(`${library.exercices.length} exercices`);
  await page.getByRole('button', { name: 'Jeux' }).click();
  expect(await page.locator('#games .card').count()).toBeGreaterThan(0);
});
