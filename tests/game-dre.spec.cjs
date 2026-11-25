'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openTab, library } = require('./helpers.cjs');

// Séance du 25/11 : 3-19 « Le jeu des chaises », 3-20 « L’expert et ses fans »,
// principe « Le game dans le jeu : la méthode DRE » et section « Principes travaillés ».
const DRE = /Le game dans le jeu\s*:\s*la méthode DRE/;

async function openFiche(page, title) {
  await openTab(page, 'Bibliothèque');
  await page.locator('#search').fill(title);
  const card = page.locator('#games .card', { hasText: title }).first();
  await expect(card).toBeVisible();
  await card.locator('details.fiche-more > summary').click();
  return card;
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('données : deux fiches et un principe ajoutés, un seul lien vers un principe', () => {
  const ids = library.exercices.map(e => e.id);
  expect(new Set(ids).size).toBe(ids.length);
  const chaises = library.exercices.find(e => e.id === '3-19');
  const expert = library.exercices.find(e => e.id === '3-20');
  expect(chaises.titre).toBe('Le jeu des chaises');
  expect(chaises.objectif_pedagogique).toBe('Corps');
  expect(chaises.categories_secondaires).toEqual(['Écoute', 'Cohésion']);
  expect(expert.titre).toBe('L’expert et ses fans');
  expect(expert.objectif_pedagogique).toBe('Scène');
  for (const e of [chaises, expert]) {
    expect(e.statut).toBe('clarifié');
    expect(e.effectif_conseille).toBe('à évaluer');
    expect(library.categories_pedagogiques).toContain(e.objectif_pedagogique);
  }
  const dre = library.principes_improvisation.filter(p => DRE.test(p.titre));
  expect(dre).toHaveLength(1);
  expect(dre[0].titre).toBe('Le game dans le jeu : la méthode DRE');
  const linked = library.exercices.filter(e => 'principes_travailles' in e);
  expect(linked.map(e => e.id)).toEqual(['3-20']);
  expect(expert.principes_travailles).toEqual([dre[0].titre]);
});

test('la fiche « L’expert et ses fans » montre sa pastille, qui ouvre le principe', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page);
  const card = await openFiche(page, 'L’expert et ses fans');
  const section = card.locator('.worked-principles');
  await expect(section).toBeVisible();
  await expect(section).toContainText('Principes travaillés');
  const pill = section.locator('button.worked-principle-pill');
  await expect(pill).toHaveCount(1);
  await expect(pill).toHaveText(DRE);

  // Cible tactile ≥ 44 px, sans débordement de la fiche ni de la page.
  const box = await pill.boundingBox();
  const cardBox = await card.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(cardBox.x);
  expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await pill.click();
  await expect(page.locator('#principes')).toBeVisible();
  const article = page.locator('#principesContent article[data-note-principe]', { hasText: 'La méthode DRE donne les différents types de games' });
  await expect(article).toBeVisible();
  await expect(article.locator('h3')).toHaveText(DRE);
  await expect(article).toHaveClass(/worked-principle-target/);
  expect(errors).toEqual([]);
});

test('une fiche sans lien n’affiche pas la section, et un titre inconnu n’affiche rien', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page);
  const card = await openFiche(page, 'Le jeu des chaises');
  await expect(card.locator('.fiche-more-body')).toBeVisible();
  await expect(card.locator('.worked-principles')).toHaveCount(0);
  // Sur toute la bibliothèque, une seule fiche produit la section.
  const withSection = await page.evaluate(() => data.filter(g => workedPrinciplesHtml(g[0])).map(g => g[0]));
  expect(withSection).toEqual(['L’expert et ses fans']);
  // Titre de principe inconnu : pas de pastille, pas d’erreur.
  const unknown = await page.evaluate(() => {
    const ex = libraryPayload.exercices.find(e => e.id === '3-20');
    const saved = ex.principes_travailles;
    ex.principes_travailles = ['Principe qui n’existe pas'];
    const html = workedPrinciplesHtml(ex.titre);
    ex.principes_travailles = saved;
    return html;
  });
  expect(unknown).toBe('');
  expect(errors).toEqual([]);
});

for (const scheme of ['light', 'dark']) {
  test(`pastille lisible en thème ${scheme === 'light' ? 'clair' : 'sombre'} (contraste ≥ 4,5)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openApp(page);
    const card = await openFiche(page, 'L’expert et ses fans');
    const colors = await card.locator('button.worked-principle-pill').evaluate(el => {
      const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      return { fg: parse(getComputedStyle(el).color), bg: parse(getComputedStyle(el).backgroundColor) };
    });
    const [a, b] = [luminance(colors.fg), luminance(colors.bg)].sort((x, y) => y - x);
    expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
}

test('les deux fiches se trouvent par la recherche et le principe est dans les notes personnelles', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  await page.locator('#search').fill('fans');
  await expect(page.locator('#games .card').first()).toContainText('L’expert et ses fans');
  await page.locator('#search').fill('chaise');
  await expect(page.locator('#games')).toContainText('Le jeu des chaises');
  await openTab(page, 'Principes et conseils');
  await page.locator('#principesHome .principes-entry').nth(0).click();
  const notes = page.locator('#principesContent .principle-reference', { hasText: 'Autres notes personnelles' });
  await notes.locator(':scope > summary').click();
  await expect(notes).toContainText(DRE);
});
