'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openTab, reloadApp } = require('./helpers.cjs');

// Pistes improwiki (nov. 2026) : suggestion du public, nouvelles listes, repères de genre,
// « Aussi appelé », trames de spectacle et principes avec lien « Pour aller plus loin ».

async function openDraw(page) {
  await openApp(page);
  await openTab(page, 'Régie');
  await page.locator('#live .regie-draw > summary').click();
}

test('régie : la suggestion du public se tape, s’affiche sous le chrono et va dans le carnet', async ({ page }) => {
  await openDraw(page);
  const question = page.locator('#audienceQuestion');
  const result = page.locator('#audienceResult');
  const underClock = page.locator('#liveAudience');
  await expect(result).toBeHidden();
  await expect(underClock).toBeHidden();
  // La question se coche (plus de bouton 🔄).
  await expect(page.getByRole('button', { name: 'Autre question à poser au public' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Relation' }).check();
  const previous = (await question.textContent()).trim();
  expect(previous).toBe('Un lien entre deux personnes ?');
  // Ce que la salle a dit s'affiche sous le chrono, et sur l'écran de la Régie.
  const input = page.getByLabel('Ce que le public a dit');
  expect((await input.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await input.fill('Une boulangerie sur la Lune');
  await input.press('Enter');
  await expect(underClock).toBeVisible();
  await expect(underClock).toContainText('Une boulangerie sur la Lune');
  await expect(result.locator('.audience-a')).toHaveText('Une boulangerie sur la Lune');
  await expect(result.locator('.audience-q')).toHaveText(previous);
  await expect(input).toHaveValue('');
  const notes = await page.evaluate(() => liveNotesRead().notes.map(n => n.text));
  expect(notes).toContain('Suggestion du public : ' + previous + ' → Une boulangerie sur la Lune');
  // Effacer retire l'affichage.
  await page.getByRole('button', { name: 'Effacer', exact: true }).first().click();
  await expect(underClock).toBeHidden();
  // Quand la salle ne répond pas, l'appli tire à sa place.
  await page.getByRole('button', { name: /Tirer à la place du public/ }).click();
  await expect(underClock).toBeVisible();
  await expect(result.locator('.audience-q')).toContainText('tiré par l’appli');
  expect((await result.locator('.audience-a').textContent()).trim().length).toBeGreaterThan(1);
});

test('« Aussi appelé » apparaît au tirage et en Régie', async ({ page }) => {
  await openApp(page);
  const game = await page.evaluate(() => data.find(g => g[17].includes('Heureusement, malheureusement'))[0]);
  // Exercice aléatoire : chaque jeu tiré qui a d'autres noms les montre.
  let shown = 0;
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate(() => { pickRandomExercise(); return { n: gameAliases(randomExerciseCurrent[0]).length, html: document.getElementById('randomExerciseResult').innerHTML }; });
    expect(state.html.includes('Aussi appelé')).toBe(state.n > 0);
    if (state.n) shown++;
  }
  expect(shown).toBeGreaterThan(0);
  // Envoyé en Régie : la ligne s'affiche sous le titre.
  await page.evaluate(t => { randomExerciseCurrent = data.find(g => g[0] === t); useRandomExercise(); }, game);
  await expect(page.locator('#liveAka')).toBeVisible();
  await expect(page.locator('#liveAka')).toHaveText('Aussi appelé : Heureusement, malheureusement');
  // Un jeu sans autre nom n'affiche rien.
  await page.evaluate(() => { randomExerciseCurrent = data.find(g => !g[17].length && g[2] && g[2].length > 20); useRandomExercise(); });
  await expect(page.locator('#liveAka')).toBeHidden();
  // Tirage de l'Accueil : tant qu'un jeu avec autre nom sort, la ligne est là.
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) {
    await page.evaluate(() => quickDraw());
    const title = (await page.locator('#homeQuickResult h4').textContent()).trim();
    const has = await page.evaluate(t => gameAliases(t).length > 0, title);
    await expect(page.locator('#homeQuickResult .exercise-aliases')).toHaveCount(has ? 1 : 0);
    seen = has;
  }
  expect(seen).toBe(true);
});

test('régie : onze catégories de tirage, les trois nouvelles décochées au départ', async ({ page }) => {
  await openDraw(page);
  const state = await page.evaluate(() => ({
    cats: Object.keys(DRAW_DEFAULTS),
    off: Object.keys(DRAW_DEFAULTS).filter(k => drawEnabled[k] === false),
    sizes: Object.fromEntries(['Genre', 'Métier', 'Activité', 'Lieu', 'Émotion'].map(k => [k, drawLists[k].length]))
  }));
  expect(state.cats).toHaveLength(11);
  expect(state.off.sort()).toEqual(['Activité', 'Genre', 'Métier']);
  expect(state.sizes['Métier']).toBe(40);
  expect(state.sizes['Activité']).toBe(40);
  expect(state.sizes['Genre']).toBeGreaterThanOrEqual(32);
  expect(state.sizes['Lieu']).toBeGreaterThanOrEqual(50);
  expect(state.sizes['Émotion']).toBeGreaterThanOrEqual(50);
  await expect(page.locator('#live .regie-draw > summary')).toContainText('11 catégories');
  await page.getByRole('button', { name: /Tout tirer/ }).click();
  await expect(page.locator('#drawResults .draw-result')).toHaveCount(8);
});

test('régie : un genre tiré affiche trois repères pour le jouer', async ({ page }) => {
  await openDraw(page);
  await page.evaluate(() => { const d = document.querySelector('.draw-cats-fold'); if (d) d.open = true; }); await page.locator('#drawCategories label', { hasText: 'Genre' }).locator('input').check();
  await page.getByRole('button', { name: /Tout tirer/ }).click();
  await expect(page.locator('#drawResults .draw-result')).toHaveCount(9);
  await expect(page.locator('#drawResults .genre-reperes li')).toHaveCount(3);
  // Chaque genre de la liste par défaut possède ses trois repères.
  const missing = await page.evaluate(() => DRAW_DEFAULTS['Genre'].filter(g => !Array.isArray(GENRE_REPERES[g]) || GENRE_REPERES[g].length !== 3));
  expect(missing).toEqual([]);
  const labels = await page.evaluate(() => [genreReperesHtml('Western'), genreReperesHtml('Jazz'), genreReperesHtml('Genre inconnu')]);
  expect(labels[0]).toContain('Décor');
  expect(labels[1]).toContain('Rythme');
  expect(labels[2]).toBe('');
});

test('régie : les compléments rejoignent une fois les listes déjà personnalisées', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    const lists = JSON.parse(localStorage.getItem('impro-draw-lists-v4') || '{}');
    lists['Lieu'] = ['Mon lieu à moi'];
    localStorage.setItem('impro-draw-lists-v4', JSON.stringify(lists));
    localStorage.removeItem('impro-draw-additions-v1');
  });
  await reloadApp(page);
  let lieux = await page.evaluate(() => drawLists['Lieu']);
  expect(lieux).toContain('Mon lieu à moi');
  expect(lieux).toContain('Laverie automatique');
  // Une proposition retirée ensuite par l'utilisateur ne revient pas.
  await page.evaluate(() => {
    const lists = JSON.parse(localStorage.getItem('impro-draw-lists-v4'));
    lists['Émotion'] = lists['Émotion'].filter(x => x !== 'Trac');
    localStorage.setItem('impro-draw-lists-v4', JSON.stringify(lists));
  });
  await reloadApp(page);
  expect(await page.evaluate(() => drawLists['Émotion'].includes('Trac'))).toBe(false);
});

test('bibliothèque : la recherche trouve un jeu par son autre nom', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  const search = page.locator('#search');
  await search.fill('Freeze Tag');
  await expect(page.locator('#games .card')).toHaveCount(2);
  await expect(page.locator('#games .card h3').first()).toContainText('Impro clap');
  await expect(page.locator('#games .card .exercise-aliases').first()).toContainText('Aussi appelé');
  await search.fill('heureusement, malheureusement');
  await expect(page.locator('#games .card')).toHaveCount(1);
  await expect(page.locator('#games .card h3')).toContainText('Bonne nouvelle');
  await search.fill('');
  // Les fiches sans autre nom n'affichent pas la ligne.
  const withAlias = await page.locator('#games .card .exercise-aliases').count();
  expect(withAlias).toBe(29);
});

test('spectacle : une trame remplit l’ordre de passage et s’ajoute à la suite', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Spectacle');
  await page.evaluate(() => { const d = document.querySelector('#showTemplatesFold'); if (d) d.open = true; }); const box = page.locator('#showTemplates');
  await expect(box.locator('h3')).toHaveText('Trames toutes prêtes');
  await expect(page.locator('#showTemplate option')).toHaveCount(5);
  const link = box.locator('a.more-link');
  await expect(link).toHaveAttribute('href', /^https:\/\/improwiki\.com\/fr\/wiki\//);
  await expect(link).toHaveAttribute('rel', /noopener/);
  expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.locator('#showTemplate').selectOption({ label: 'La Ronde' });
  await page.getByRole('button', { name: /Remplir l’ordre de passage/ }).click();
  await expect(page.locator('#showItems .show-item')).toHaveCount(7);
  await expect(page.getByLabel('Titre du spectacle')).toHaveValue('La Ronde');
  await expect(page.locator('#showSummary')).toContainText('7 numéros · 24 min');
  await page.locator('#showTemplate').selectOption({ label: 'Feu de camp' });
  await expect(page.locator('#showTemplateInfo')).toContainText('3 joueurs');
  await page.getByRole('button', { name: /Remplir l’ordre de passage/ }).click();
  await expect(page.locator('#showItems .show-item')).toHaveCount(15);
  await expect(page.locator('#showTemplateStatus')).toContainText('à la suite des 7');
  await expect(page.getByLabel('Titre du spectacle')).toHaveValue('La Ronde');
  // Toutes les trames respectent les limites de la feuille de régie.
  const bad = await page.evaluate(() => SHOW_TEMPLATES.flatMap(t => t.items.filter(x => x[0].length > 80 || x[2].length > 300 || !(x[1] > 0 && x[1] <= 120)).map(x => t.nom + ' : ' + x[0])));
  expect(bad).toEqual([]);
});

test('principes : six nouveaux principes avec un lien « Pour aller plus loin »', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { tab('principes'); openPrincipesView('principesContent'); });
  const root = page.locator('#principesContent');
  await expect(root.locator('.principle-card')).toHaveCount(13);
  for (const title of ['Le statut', 'Le blocage', 'Les routines', 'L’arc narratif', 'La tension', 'La présence']) {
    await expect(root.locator('.principle-title', { hasText: title })).toHaveCount(1);
  }
  const links = root.locator('.principle-more a');
  await expect(links).toHaveCount(6);
  for (const href of await links.evaluateAll(els => els.map(a => a.href))) expect(href).toMatch(/^https:\/\/improwiki\.com\/fr\/wiki\/[a-z-]+$/);
  expect((await links.first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(root.locator('.principle-draft')).toHaveCount(6);
  // Les sept principes validés gardent leur formulation originale.
  await expect(root.locator('.principle-source:not(.principle-draft)')).toHaveCount(7);
  const levels = await root.locator('.principle-level').allTextContents();
  expect(levels).toEqual([...levels].sort((a, b) => ['Débutant', 'Moyen', 'Pro'].indexOf(a) - ['Débutant', 'Moyen', 'Pro'].indexOf(b)));
});
