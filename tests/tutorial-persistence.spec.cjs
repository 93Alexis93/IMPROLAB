const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const library = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'library.json'), 'utf8'));

test('le tutoriel apparaît à la première visite puis reste fermé après rechargement', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__tutorial_test_initialized') !== '1') {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__tutorial_test_initialized', '1');
    }
  });
  await page.goto('/');
  await expect(page.locator('#libraryStatus')).toContainText(`${library.exercices.length} exercices`, { timeout: 15000 });
  await expect(page.locator('#welcomeScreen')).toBeVisible();
  await page.getByRole('button', { name: 'Entrer dans IMPRO LAB' }).click();
  await expect(page.locator('#welcomeScreen')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#welcomeScreen')).toHaveCount(0);
  await expect(page.locator('#libraryStatus')).toContainText(`${library.exercices.length} exercices`, { timeout: 15000 });
});
