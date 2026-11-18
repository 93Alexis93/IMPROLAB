'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, openTab, reloadApp } = require('./helpers.cjs');

// Pistes improwiki, interview d'Alexis du 18 novembre 2026 : fiches 3-15 à 3-18,
// liste de tirage « Routine » et phrase ajoutée au principe « Le oui, et… ».
const FICHES = [
  ['3-15', 'Les prénoms en geste', 'Syllabes des prénoms'],
  ['3-16', 'Prénom adjectivé', 'Prénoms allitérés'],
  ['3-17', 'Émotion circulaire', 'Cercle des émotions 2'],
  ['3-18', 'Statut haut, statut bas', 'Votre Excellence'],
];
const PHRASE = 'Tout ce qu’un comédien peut dire ou faire sur la scène devient immédiatement vrai, et ses partenaires doivent l’intégrer comme vrai.';

test('fiches 3-15 à 3-18 : données, recherche par titre et par nom improwiki', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page);
  const lib = await page.evaluate(async () => (await fetch('library.json', { cache: 'no-store' })).json());
  for (const [id, titre, alias] of FICHES) {
    const f = lib.exercices.find(e => e.id === id);
    expect(f.titre).toBe(titre);
    expect(f.aussi_appele).toEqual([alias]);
    expect(f.origine).toBe('interview_alexis');
    expect(f.contact_physique).toBe('aucun');
    expect(f.eligible_generateur).toBe(true);
  }
  // Aucun geste dans Prénom adjectivé ni dans Émotion circulaire.
  for (const id of ['3-16', '3-17']) expect(JSON.stringify(lib.exercices.find(e => e.id === id)).toLowerCase()).not.toContain('geste');
  // Les deux jeux de prénoms sont marqués voisins de 2-36.
  for (const id of ['3-15', '3-16']) expect(lib.exercices.find(e => e.id === id).voisin_de).toEqual(['2-36']);
  expect(lib.exercices.find(e => e.id === '3-18').effectif_conseille).toBe('2 joueurs, le reste du groupe regarde');

  await openTab(page, 'Bibliothèque');
  const search = page.locator('#search');
  for (const [, titre, alias] of FICHES) {
    await search.fill(titre);
    await expect(page.locator('#games .card').first()).toContainText(titre);
    await search.fill(alias);
    await expect(page.locator('#games .card').first()).toContainText(titre);
  }
  await search.fill('');
  expect(errors).toEqual([]);
});

test('régie : la liste « Routine » est décochée au départ et ne double pas « Activité »', async ({ page }) => {
  await openApp(page);
  const state = await page.evaluate(() => ({
    keys: Object.keys(DRAW_DEFAULTS),
    routine: DRAW_DEFAULTS['Routine'],
    activite: DRAW_DEFAULTS['Activité'],
    enabled: drawEnabled['Routine'],
    stored: drawLists['Routine'],
  }));
  expect(state.keys.at(-1)).toBe('Routine');
  expect(state.keys).toContain('Activité');
  expect(state.routine).toHaveLength(18);
  expect(state.routine.slice(0, 3)).toEqual(['Un footing le dimanche matin', 'Le cinéma du mardi soir', 'Mettre de la crème anti-rides le matin']);
  expect(new Set(state.routine).size).toBe(18);
  const act = new Set(state.activite.map(x => x.toLowerCase()));
  for (const r of state.routine) expect(act.has(r.toLowerCase())).toBe(false);
  expect(state.enabled).toBe(false);
  expect(state.stored).toEqual(state.routine);

  // Des listes déjà enregistrées sur l'appareil (sans Routine) reçoivent la liste une fois, sans perdre le reste.
  await page.evaluate(() => {
    const lists = JSON.parse(localStorage.getItem('impro-draw-lists-v4') || '{}');
    delete lists['Routine'];
    lists['Lieu'] = ['Mon lieu à moi'];
    localStorage.setItem('impro-draw-lists-v4', JSON.stringify(lists));
  });
  await reloadApp(page);
  const after = await page.evaluate(() => ({ routine: drawLists['Routine'], lieu: drawLists['Lieu'] }));
  expect(after.routine).toHaveLength(18);
  expect(after.lieu).toContain('Mon lieu à moi');

  // Cochée, elle se tire.
  await openTab(page, 'Régie');
  await page.locator('#live .regie-draw > summary').click();
  await page.evaluate(() => { const d = document.querySelector('.draw-cats-fold'); if (d) d.open = true; });
  await page.locator('#drawCategories label', { hasText: 'Routine' }).locator('input').check();
  await page.getByRole('button', { name: /Tout tirer/ }).click();
  await expect(page.locator('#drawResults .draw-result')).toHaveCount(1);
  await expect(page.locator('#drawResults')).toContainText('Routine');
});

test('principe « Le oui, et… » : la phrase est ajoutée, le reste ne bouge pas', async ({ page }) => {
  await openApp(page);
  const p = await page.evaluate(async () => (await (await fetch('principes-impro.json', { cache: 'no-store' })).json()).principes.find(x => x.id === 2));
  expect(p.principe.endsWith(PHRASE)).toBe(true);
  expect(p.formulation_originale).toBe('Oui, et… : accepter, amplifier, construire.');
  expect(p.statut).toBe('validé');
  await page.evaluate(() => { tab('principes'); openPrincipesView('principesContent'); });
  await expect(page.locator('#principesContent')).toContainText(PHRASE);
  // La recherche des principes la trouve aussi.
  await page.evaluate(() => { tab('principes'); });
  await page.evaluate(() => { const b = document.querySelector('#principesView .principes-back'); if (b && b.offsetParent) b.click(); });
  await page.locator('#principesSearch').fill('immédiatement vrai');
  await expect(page.locator('#principesSearchResults')).toContainText('Le « oui, et… »');
});
