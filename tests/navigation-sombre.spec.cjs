'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openSeance, openTab } = require('./helpers.cjs');

// Chantier 2 (D37) : barre d'onglets en bas, thème sombre qui suit le réglage de l'iPhone.

const NAV = 'nav[aria-label="Navigation principale"]';

function contrastOf(fg, bg) {
  const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => { const [r, g, b] = parse(c).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const a = lum(fg), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

for (const [name, width, height] of [['iPhone SE', 375, 667], ['iPhone 13', 390, 844]]) {
  test(`barre en bas (${name}) : cinq onglets de 44 px, collée au bas pendant le défilement`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openApp(page);
    await openSeance(page);
    await page.getByRole('button', { name: 'Générer ma séance' }).click();
    await page.evaluate(() => scrollTo(0, 1500));
    const nav = page.locator(NAV);
    const box = await nav.boundingBox();
    expect(Math.round(box.y + box.height)).toBe(height);
    const items = nav.locator(':scope > button, :scope > details > summary');
    await expect(items).toHaveCount(5);
    for (const item of await items.all()) {
      const b = await item.boundingBox();
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    // Le dernier bouton de la page n'est pas caché sous la barre.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const last = await page.locator('#seance button:visible').last().boundingBox();
    expect(last.y + last.height).toBeLessThanOrEqual(box.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test('menu « Plus » : s’ouvre au-dessus de la barre, se ferme d’un toucher à côté, onglet actif marqué', async ({ page }) => {
  await openApp(page);
  const more = page.locator(`${NAV} .more-navigation`);
  await more.locator('summary').click();
  const menu = more.locator('.more-navigation-menu');
  await expect(menu).toBeVisible();
  const navBox = await page.locator(NAV).boundingBox();
  const menuBox = await menu.boundingBox();
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(navBox.y);
  for (const b of await menu.locator('button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.locator('#homeNext h3').click();
  await expect(more).not.toHaveAttribute('open', '');
  await openTab(page, 'Bibliothèque');
  await expect(page.locator('#jeux')).toBeVisible();
  await expect(more).not.toHaveAttribute('open', '');
  // L'onglet « Plus » est en couleur quand l'écran ouvert est dans son menu.
  const bg = await more.locator('summary').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  // Les noms accessibles des onglets ne changent pas avec les icônes.
  await openTab(page, 'Exercice aléatoire');
  await expect(page.locator('#random')).toBeVisible();
});

test('régie : le chrono reste en haut, la barre en bas ne le cache pas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await openTab(page, 'Régie');
  await page.evaluate(() => scrollTo(0, 1200));
  await page.waitForTimeout(100);
  const start = await page.locator('#liveStart').boundingBox();
  const nav = await page.locator(NAV).boundingBox();
  expect(start.y).toBeGreaterThanOrEqual(0);
  expect(start.y + start.height).toBeLessThanOrEqual(nav.y);
});

test('thème sombre : suit le réglage de l’iPhone, textes lisibles', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page);
  const look = await page.evaluate(() => {
    const s = el => getComputedStyle(el);
    return {
      html: s(document.documentElement).backgroundColor,
      body: s(document.body).color,
      h3: s(document.querySelector('#homeNext h3')).color,
      nav: s(document.querySelector('nav[aria-label="Navigation principale"]')).backgroundColor,
      navText: s(document.querySelector('nav[aria-label="Navigation principale"] > button:not([aria-current])')).color,
      scheme: s(document.documentElement).colorScheme
    };
  });
  expect(look.scheme).toContain('dark');
  expect(contrastOf(look.h3, look.html)).toBeGreaterThanOrEqual(4.5);
  expect(contrastOf(look.body, look.html)).toBeGreaterThanOrEqual(4.5);
  expect(contrastOf(look.navText, look.nav)).toBeGreaterThanOrEqual(4.5);
  // Fiche courte et chrono en sombre.
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const fiche = await page.locator('#plan details.fiche-more > summary').first().evaluate(el => { let n = el; let bg = 'rgba(0, 0, 0, 0)'; while (n && /rgba\(0, 0, 0, 0\)/.test(bg)) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; } return { fg: getComputedStyle(el).color, bg }; });
  expect(contrastOf(fiche.fg, fiche.bg)).toBeGreaterThanOrEqual(4.5);
  await openTab(page, 'Régie');
  const clock = await page.locator('#liveClock').evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el.closest('.live-deck')).backgroundColor }));
  expect(contrastOf(clock.fg, clock.bg)).toBeGreaterThanOrEqual(4.5);
});

test('thème clair : inchangé quand l’iPhone est en clair', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page);
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(bg).toBe('rgb(247, 241, 231)');
});
