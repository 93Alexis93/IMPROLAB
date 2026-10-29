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

// Ouvre un onglet par son libellé : Accueil, Préparer, Exercice aléatoire et
// Régie sont visibles ; les autres sont rangés dans le menu « Plus ».
async function openTab(page, name) {
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  const button = nav.getByRole('button', { name, exact: true });
  if (!(await button.isVisible())) await nav.locator('.more-navigation > summary').click();
  await button.click();
}

// Le générateur de séance (durée, curseurs, bouton) est dans l'onglet Préparer.
async function openSeance(page) {
  await openTab(page, 'Préparer');
  await expect(page.locator('#seance')).toBeVisible();
}

// La préparation guidée propose quelques durées ; les autres passent par
// « Autre durée (réglage fin) », qui affiche la liste complète #duration.
async function setDuration(page, minutes) {
  const value = String(minutes);
  const guided = page.locator('#guidedDuration');
  const offered = await guided.locator('option').evaluateAll(options => options.map(o => o.value));
  if (offered.includes(value)) {
    await guided.selectOption(value);
  } else {
    await guided.selectOption('custom');
    await page.locator('#duration').selectOption(value);
  }
  await expect(page.locator('#duration')).toHaveValue(value);
}

// Les dix curseurs de catégories sont repliés dans « Réglages fins ».
async function openFineSettings(page) {
  const details = page.locator('#seance details.advanced-dynamics');
  if (!(await details.evaluate(el => el.open))) await details.locator(':scope > summary').click();
}

async function reloadApp(page, options = {}) {
  await page.reload();
  await waitForReady(page, options);
}

module.exports = { openTab, openSeance, setDuration, openFineSettings, openApp, reloadApp, libraryCount, originCount, library, waitForReady };
