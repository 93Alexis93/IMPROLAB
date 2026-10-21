'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');
const library = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'library.json'), 'utf8'));
const libraryCount = library.exercices.length;
const originCount = origin => library.exercices.filter(item => item.origine === origin).length;

async function waitForReady(page, { dismissWelcome = true } = {}) {
  await expect(page.locator('#libraryStatus')).toContainText(`${libraryCount} exercices`, { timeout: 15000 });
  const screen = page.locator('#welcomeScreen');
  const enter = page.getByRole('button', { name: 'Entrer dans IMPRO LAB' });
  if (dismissWelcome) {
    if (await enter.isVisible().catch(() => false)) await enter.click();
    await expect(screen).toBeHidden({ timeout: 5000 });
  } else {
    await expect(screen).toBeVisible({ timeout: 5000 });
  }
}

async function openApp(page, options = {}) {
  // Chaque test commence avec un stockage propre. Le marqueur de session évite
  // de vider à nouveau le stockage lors d'un reload effectué pendant le test.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__improlab_test_storage_initialized') !== '1') {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__improlab_test_storage_initialized', '1');
    }
  });
  await page.goto('/');
  await waitForReady(page, options);
}

async function reloadApp(page, options = {}) {
  await page.reload();
  await waitForReady(page, options);
}

module.exports = { openApp, reloadApp, libraryCount, originCount, library, waitForReady };
