'use strict';

const { test, expect } = require('@playwright/test');
const { openApp, reloadApp, openSeance, openTab } = require('./helpers.cjs');

async function chooseGroup(page, id) {
  await page.locator('#groupProfile').selectOption(id);
  await expect(page.locator('#groupProfile')).toHaveValue(id);
}

test('carnet de bord : ce qui a marché, qui a brillé et phrase pour les parents', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  await openTab(page, 'Historique');
  const card = page.locator('#historyResult .card').first();
  await card.locator('.history-review > summary').click();
  await card.getByLabel('Ce qui a marché').fill('Les scènes à deux <b>');
  await card.getByLabel('Qui a brillé').fill('Lina et Sam');
  await card.getByLabel('À retravailler').fill('Les fins de scène');
  await card.getByRole('button', { name: 'Enregistrer le carnet' }).click();
  await expect(card.locator('.history-review > summary')).toContainText('rempli');
  const sentence = card.getByLabel('Phrase pour les parents');
  await expect(sentence).toHaveValue(/Club collège/);
  await expect(sentence).toHaveValue(/Ce qui a bien marché : Les scènes à deux <b>\./);
  await expect(sentence).toHaveValue(/Bravo à Lina et Sam\./);
  await expect(sentence).toHaveValue(/objectif/);

  await reloadApp(page);
  await openTab(page, 'Historique');
  const again = page.locator('#historyResult .card').first();
  await again.locator('.history-review > summary').click();
  await expect(again.getByLabel('Qui a brillé')).toHaveValue('Lina et Sam');
  await expect(again.getByLabel('À retravailler')).toHaveValue('Les fins de scène');
  await expect(page.locator('#historyResult b')).toHaveCount(0);
});

test('écarter un jeu pour un groupe : il n’est plus proposé à ce groupe, mais reste proposé aux autres', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await chooseGroup(page, 'copains');
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const firstCard = page.locator('#plan>.card:not(.session-objective)').first();
  const title = (await firstCard.locator('h3').textContent()).trim();
  await firstCard.getByRole('button', { name: /^Écarter exercice 1 pour ce groupe$/ }).click();
  await expect(page.locator('#planSummary')).toContainText('Copains');
  await expect(firstCard.locator('h3')).not.toHaveText(title);
  await expect(page.locator('#groupExcludedInfo')).toBeVisible();
  await expect(page.locator('#groupExcludedInfo')).toContainText('1 jeu écarté');

  const excludedRaw = await page.evaluate(() => JSON.parse(localStorage.getItem('impro-group-excluded-v1')).copains);
  expect(excludedRaw).toHaveLength(1);
  for (let round = 0; round < 6; round++) {
    await page.getByRole('button', { name: 'Générer ma séance' }).click();
    const titles = (await page.locator('#plan>.card:not(.session-objective) h3').allTextContents()).map(t => t.trim());
    expect(titles).not.toContain(title);
  }

  await chooseGroup(page, 'college');
  await expect(page.locator('#groupExcludedInfo')).toBeHidden();
  const visibleForClub = await page.evaluate(name => readExcluded().includes(name), excludedRaw[0]);
  expect(visibleForClub).toBe(false);

  await chooseGroup(page, 'copains');
  await page.getByRole('button', { name: 'Tout réautoriser' }).click();
  await expect(page.locator('#groupExcludedInfo')).toBeHidden();
  expect(await page.evaluate(() => readExcluded())).toEqual([]);
});

test('partager une séance : résumé lisible et fichier importable via la feuille de partage', async ({ page }) => {
  await page.addInitScript(() => {
    window.__shared = [];
    navigator.share = async data => { window.__shared.push({ title: data.title, text: data.text, files: (data.files || []).map(f => ({ name: f.name, type: f.type })) }); };
    navigator.canShare = data => !!(data && data.files);
  });
  await openApp(page);
  await openSeance(page);
  await chooseGroup(page, 'asso');
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const titles = (await page.locator('#plan>.card:not(.session-objective) h3').allTextContents()).map(t => t.trim());
  await page.getByRole('button', { name: 'Partager la séance' }).click();
  await expect(page.locator('#planSummary')).toContainText('partagée');
  const shared = await page.evaluate(() => window.__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].text).toContain('Association');
  for (const t of titles) expect(shared[0].text).toContain(t);
  expect(shared[0].files).toEqual([{ name: 'impro-lab-seance.json', type: 'application/json' }]);
});

test('badges de compétences : par joueur, conservés au rechargement, sans note', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Groupes');
  await page.locator('#rosterInput').fill('Lina\nSam <i>');
  await page.locator('#groupes button[onclick="rosterAdd()"]').click();
  await page.locator('#badgesPanel > summary').click();
  const lina = page.getByRole('group', { name: 'Compétences de Lina' });
  await lina.getByRole('button', { name: /Écoute/ }).click();
  await lina.getByRole('button', { name: /Oser/ }).click();
  await expect(lina.getByRole('button', { name: /Écoute/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(lina.getByRole('button', { name: /Accepter/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#badgesList .badge-player').first()).toContainText('2/4');
  await lina.getByRole('button', { name: /Oser/ }).click();
  await expect(page.locator('#badgesList .badge-player').first()).toContainText('1/4');
  await expect(page.locator('#badgesList i')).toHaveCount(0);

  await reloadApp(page);
  await openTab(page, 'Groupes');
  await page.locator('#badgesPanel > summary').click();
  await expect(page.getByRole('group', { name: 'Compétences de Lina' }).getByRole('button', { name: /Écoute/ })).toHaveAttribute('aria-pressed', 'true');
});

test('navigation compacte sur iPhone : une ligne de cinq cibles de 44 px, menu Plus utilisable', async ({ page }) => {
  await openApp(page);
  const nav = page.locator('nav[aria-label="Navigation principale"]');
  const box = await nav.boundingBox();
  expect(box.height).toBeLessThanOrEqual(64);
  for (const item of await nav.locator(':scope > button, :scope > details > summary').all()) {
    const b = await item.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await openTab(page, 'Historique');
  await expect(page.locator('#historique')).toBeVisible();
});

test('match d’impro : score, tirage catégorie et thème de l’asso, lancement du chrono, conservé au rechargement', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Régie');
  await page.locator('#matchPanel > summary').click();
  await page.getByLabel('Nom de l’équipe 1').fill('Les Bleus');
  await page.getByLabel('Nom de l’équipe 2').fill('Les Rouges <s>');
  await page.locator('#matchPanel .regie-options > summary').click();
  await page.locator('#matchCategories').fill('Chantée');
  await page.locator('#matchCategories').dispatchEvent('change');
  await page.locator('#matchThemes').fill('Le dernier métro');
  await page.locator('#matchThemes').dispatchEvent('change');
  await page.locator('#matchMinutes').fill('2');
  await page.locator('#matchMinutes').dispatchEvent('change');

  const blue = page.locator('.match-score > div').first();
  await blue.getByRole('button', { name: '＋ Point' }).click();
  await blue.getByRole('button', { name: '＋ Point' }).click();
  await page.locator('.match-score > div').nth(1).getByRole('button', { name: '＋ Point' }).click();
  await blue.getByRole('button', { name: 'Retirer un point à l’équipe 1' }).click();
  await expect(page.locator('#matchScoreA')).toHaveText('1');
  await expect(page.locator('#matchScoreB')).toHaveText('1');
  await expect(page.locator('#matchNameB')).toHaveText('Les Rouges <s>');

  await page.getByRole('button', { name: 'Tirer catégorie et thème' }).click();
  await expect(page.locator('#matchCurrent')).toHaveText('Catégorie : Chantée · Thème : Le dernier métro · 2 min');
  await page.getByRole('button', { name: 'Lancer l’impro au chrono' }).click();
  await expect(page.locator('#liveMode')).toHaveValue('free');
  await expect(page.locator('#liveTitle')).toHaveText('Chantée');
  await expect(page.locator('#liveInfo')).toHaveText('Thème : Le dernier métro');
  await expect(page.locator('#liveClock')).toHaveText('02:00');

  await reloadApp(page);
  await openTab(page, 'Régie');
  await page.locator('#matchPanel > summary').click();
  await expect(page.locator('#matchScoreA')).toHaveText('1');
  await expect(page.locator('#matchNameA')).toHaveText('Les Bleus');
  await page.getByRole('button', { name: 'Score à zéro' }).click();
  await expect(page.locator('#matchScoreA')).toHaveText('0');
});

test('enregistrer la séance : bouton unique et visible juste sous la séance, la séance arrive dans l’Historique', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.accept(); });
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const save = page.getByRole('button', { name: 'Enregistrer la séance', exact: true });
  await expect(save).toHaveCount(1);
  await expect(save).toBeVisible();
  const actions = page.locator('#plan + .edit-actions');
  await expect(actions.getByRole('button').first()).toHaveText(/Enregistrer la séance/);
  const box = await save.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await save.click();
  expect(dialogs.at(-1)).toContain('Historique');
  await openTab(page, 'Historique');
  await expect(page.locator('#historyResult .card')).toHaveCount(1);
});

test('mode soirée : jeux validés au hasard, sans répétition, aucun jeu écarté selon le nombre de joueurs, envoyés dans la Régie', async ({ page }) => {
  const { library } = require('./helpers.cjs');
  await openApp(page);
  await openSeance(page);
  await page.locator('#groupProfile').selectOption('copains');
  await page.evaluate(() => { rosterState.copains = ['Max', 'Jo', 'Ali'].map(name => ({ name, present: true })); rosterRender(); });
  await openTab(page, 'Régie');
  await page.locator('#soireePanel > summary').click();
  await expect(page.locator('#soireePlayers')).toHaveValue('3');

  await page.getByRole('button', { name: 'Jeu suivant' }).click();
  await expect(page.locator('#liveMode')).toHaveValue('free');
  await expect(page.locator('#soireeStatus')).toContainText('Jeu n° 1 ce soir');
  const first = (await page.locator('#liveTitle').textContent()).trim();
  await expect(page.locator('#soireeStatus')).toContainText(first);
  expect((await page.locator('#liveInfo').textContent()).trim().length).toBeGreaterThan(10);

  const eligibleTitles = await page.evaluate(() => data.filter(g => soireeEligible(g)).map(g => displayTitle(g[0])));
  expect(await page.evaluate(() => data.filter(g => soireeEligible(g)).some(g => g[8] === 'creation_improlab'))).toBe(true);
  expect(await page.evaluate(() => data.filter(g => soireeEligible(g)).every(g => ['notes_personnelles', 'creation_improlab'].includes(g[8])))).toBe(true);
  const titles = [first];
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Jeu suivant' }).click();
    titles.push((await page.locator('#liveTitle').textContent()).trim());
  }
  expect(new Set(titles).size).toBe(10);
  for (const t of titles) expect(eligibleTitles).toContain(t);
  await expect(page.locator('#soireeStatus')).toContainText('Jeu n° 10 ce soir');

  const tooBig = library.exercices.find(e => e.eligible_generateur && e.effectif_conseille === '4–8 joueurs');
  const excluded = library.exercices.find(e => e.eligible_generateur && e.origine === 'notes_personnelles' && e.id !== tooBig?.id);
  await page.evaluate(name => writeExcluded([name]), excluded.titre);
  await page.getByRole('button', { name: 'Nouvelle soirée' }).click();
  await expect(page.locator('#soireeStatus')).toContainText('aucun jeu tiré');
  await page.locator('#soireePlayers').fill('2');
  const drawn = await page.evaluate(() => { const out = []; for (let i = 0; i < 130; i++) { soireeNext(); out.push(document.getElementById('liveTitle').textContent.trim()); } return out; });
  const [excludedTitle, tooBigTitle] = await page.evaluate(names => names.map(n => n ? displayTitle(n) : null), [excluded.titre, tooBig?.titre]);
  expect(drawn).not.toContain(excludedTitle);
  // Décision d'Alexis : le nombre de joueurs n'écarte aucun jeu. Le jeu « 4–8 joueurs » reste tirable à deux.
  if (tooBigTitle) expect(drawn).toContain(tooBigTitle);
});

async function consigneCourte(page) {
  return page.evaluate(() => { const t = document.getElementById('liveTitle').textContent.trim(); const g = data.find(x => displayTitle(x[0]) === t); return (g[10] && g[10].consigne_courte) || g[2]; });
}

test('plein écran de séance : consigne en grand, chrono synchronisé, navigation, paysage', async ({ page }) => {
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await openTab(page, 'Régie');
  await page.getByRole('button', { name: 'Plein écran' }).click();
  const stage = page.locator('#stageView');
  await expect(stage).toBeVisible();
  const vp = page.viewportSize();
  const box = await stage.boundingBox();
  expect(Math.round(box.width)).toBe(vp.width);
  expect(Math.round(box.height)).toBe(vp.height);
  await expect(page.locator('#stageTitle')).toHaveText((await page.locator('#liveTitle').textContent()).trim());
  await expect(page.locator('#stageConsigne')).toHaveText(await consigneCourte(page));
  await expect(page.locator('#stageProgress')).toHaveText('Exercice 1 / 5');
  await expect(page.locator('#stageRole')).toBeHidden();
  for (const b of await stage.getByRole('button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);

  await stage.getByRole('button', { name: /Démarrer/ }).click();
  await expect(page.locator('#stageStart')).not.toHaveText(/Démarrer/);
  await expect(page.locator('#stageClock')).not.toHaveText('05:00', { timeout: 4000 });
  await expect(page.locator('#stageClock')).toHaveText(await page.locator('#liveClock').textContent());

  await stage.getByRole('button', { name: 'Exercice suivant' }).click();
  await expect(page.locator('#stageProgress')).toHaveText('Exercice 2 / 5');
  await expect(page.locator('#stageTitle')).toHaveText((await page.locator('#liveTitle').textContent()).trim());

  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => page.locator('.stage-body').evaluate(el => getComputedStyle(el).flexDirection)).toBe('row');
  expect(await stage.evaluate(el => el.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize(vp);

  await stage.getByRole('button', { name: '✕ Quitter' }).click();
  await expect(stage).toBeHidden();
  await expect(page.locator('#live')).toBeVisible();
});

test('élève animateur : consigne courte en grand, pas de navigation, sortie confirmée', async ({ page }) => {
  const dialogs = [];
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  await openTab(page, 'Régie');
  await page.getByRole('button', { name: 'Élève animateur' }).click();
  const stage = page.locator('#stageView');
  await expect(stage).toBeVisible();
  await expect(page.locator('#stageRole')).toHaveText('À toi de mener l’échauffement !');
  await expect(page.locator('#stageConsigne')).toHaveText(await consigneCourte(page));
  await expect(page.locator('#stagePrev')).toBeHidden();
  await expect(page.locator('#stageNext')).toBeHidden();
  await expect(stage.getByRole('button', { name: /Démarrer/ })).toBeVisible();

  page.once('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  await stage.getByRole('button', { name: '✕ Quitter' }).click();
  await expect(stage).toBeVisible();
  page.once('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await stage.getByRole('button', { name: '✕ Quitter' }).click();
  await expect(stage).toBeHidden();
  expect(dialogs).toEqual(['Reprendre la main sur la Régie ?', 'Reprendre la main sur la Régie ?']);
});

test('favoris par groupe : un favori du Club n’apparaît pas chez les Copains, et revient avec le Club', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Bibliothèque');
  await expect(page.locator('#favoritesGroup')).toHaveText('(groupe Club collège)');
  const first = page.locator('#games .card').first();
  const title = (await first.locator('h3').first().textContent()).trim();
  await first.getByRole('button', { name: /Ajouter aux favoris/ }).click();
  await page.locator('#favoritesOnly').check();
  await expect(page.locator('#games .card')).toHaveCount(1);

  await openSeance(page);
  await page.locator('#groupProfile').selectOption('copains');
  await openTab(page, 'Bibliothèque');
  await expect(page.locator('#favoritesGroup')).toHaveText('(groupe Copains)');
  await expect(page.locator('#games .card')).toHaveCount(0);

  await openSeance(page);
  await page.locator('#groupProfile').selectOption('college');
  await openTab(page, 'Bibliothèque');
  await expect(page.locator('#games .card')).toHaveCount(1);
  await expect(page.locator('#games .card h3').first()).toHaveText(title);
});

test('contraintes de main en main : tirages cochés en plein écran, « Suivant » relance', async ({ page }) => {
  await openApp(page);
  await openTab(page, 'Régie');
  await page.locator('#live .regie-draw > summary').click();
  await page.getByRole('button', { name: /de main en main/ }).click();
  const view = page.locator('#passView');
  await expect(view).toBeVisible();
  const enabled = await page.evaluate(() => Object.keys(DRAW_DEFAULTS).filter(k => drawEnabled[k] !== false).length);
  await expect(page.locator('#passList .pass-item')).toHaveCount(enabled);
  const before = await page.locator('#passList .pass-val').allTextContents();
  let changed = false;
  for (let i = 0; i < 5 && !changed; i++) {
    await view.getByRole('button', { name: /Suivant/ }).click();
    changed = (await page.locator('#passList .pass-val').allTextContents()).some((v, j) => v !== before[j]);
  }
  expect(changed).toBe(true);
  const nextBox = await view.getByRole('button', { name: /Suivant/ }).boundingBox();
  expect(nextBox.height).toBeGreaterThanOrEqual(64);
  await view.getByRole('button', { name: '✕ Quitter' }).click();
  await expect(view).toBeHidden();
});

test('fil rouge : la séance suivante suit les priorités du trimestre et varie d’après la dernière séance', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await openSeance(page);
  await page.locator('#filRouge > summary').click();
  await page.locator('#filTrimester').selectOption('0');
  await expect(page.locator('#filFocus')).toHaveText('1er trimestre : Écoute, Énergie');
  await page.getByRole('button', { name: /Proposer la séance suivante/ }).click();
  await expect(page.locator('#plan>.card:not(.session-objective)')).toHaveCount(5);
  const values = await page.evaluate(() => SLIDER_GROUPS.map((g, i) => [g.name, Number(document.getElementById('dynamic' + i).value)]));
  for (const [name, v] of values) expect(v).toBe(['Écoute', 'Énergie'].includes(name) ? (v === 70 ? 70 : 90) : 30);
  await expect(page.locator('#filStatus')).toContainText('séance n° 1 pour Club collège');

  await page.getByRole('button', { name: 'Enregistrer la séance', exact: true }).click();
  await page.getByRole('button', { name: /Proposer la séance suivante/ }).click();
  await expect(page.locator('#filStatus')).toContainText('séance n° 2');

  await page.locator('#filRouge .fil-edit > summary').click();
  await page.locator('#filEditor fieldset').nth(1).getByLabel('Imaginaire').check();
  await page.locator('#filTrimester').selectOption('1');
  await expect(page.locator('#filFocus')).toHaveText('2e trimestre : Construction, Scène, Imaginaire');
  await page.locator('#groupProfile').selectOption('copains');
  await page.locator('#filTrimester').selectOption('1');
  await expect(page.locator('#filFocus')).toHaveText('2e trimestre : Scène, Construction');
});

test('spectacle : numéros ordonnés, distribution des joueurs et feuille de régie imprimable', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await openApp(page);
  await page.evaluate(() => { rosterState.troupe = ['Lina', 'Sam', 'Max'].map(name => ({ name, present: true })); rosterSave(); });
  await openSeance(page);
  await page.locator('#groupProfile').selectOption('asso');
  await openTab(page, 'Spectacle');
  await expect(page.locator('#showRoster')).toHaveValue('troupe');
  await page.getByLabel('Titre du spectacle').fill('Soirée <b>impro</b>');
  await page.getByRole('button', { name: /Ajouter un numéro/ }).click();
  await page.getByLabel('Format du numéro 1').fill('Chantée');
  await page.getByLabel('Format du numéro 1').dispatchEvent('change');
  await page.getByRole('group', { name: 'Joueurs du numéro 1' }).getByRole('button', { name: 'Lina' }).click();
  await page.getByRole('group', { name: 'Joueurs du numéro 1' }).getByRole('button', { name: 'Sam' }).click();
  await page.getByRole('button', { name: /Ajouter un numéro/ }).click();
  await page.getByLabel('Format du numéro 2').fill('Comparée');
  await page.getByLabel('Format du numéro 2').dispatchEvent('change');
  await page.getByLabel('Durée du numéro 2 (min)').fill('8');
  await page.getByLabel('Durée du numéro 2 (min)').dispatchEvent('change');
  await page.getByRole('group', { name: 'Joueurs du numéro 2' }).getByRole('button', { name: 'Lina' }).click();
  await expect(page.locator('#showSummary')).toContainText('2 numéros · 13 min au total');
  await expect(page.locator('#showSummary')).toContainText('Lina 2');
  await expect(page.locator('#showSummary')).toContainText('Sans passage : Max');

  await page.getByRole('button', { name: 'Monter le numéro 2' }).click();
  await expect(page.getByLabel('Format du numéro 1')).toHaveValue('Comparée');

  await reloadApp(page);
  await openTab(page, 'Spectacle');
  await expect(page.getByLabel('Titre du spectacle')).toHaveValue('Soirée <b>impro</b>');
  await expect(page.getByLabel('Format du numéro 2')).toHaveValue('Chantée');

  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole('button', { name: /Imprimer la feuille de régie/ }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#showSheet')).toBeVisible();
  await expect(page.locator('#showItems')).toBeHidden();
  await expect(page.locator('#showSheet tbody tr')).toHaveCount(2);
  await expect(page.locator('#showSheet tbody tr').first()).toContainText('Comparée');
  await expect(page.locator('#showSheet tbody tr').nth(1)).toContainText('Lina, Sam');
  await expect(page.locator('#showSheet h2')).toHaveText('Soirée <b>impro</b>');
  await expect(page.locator('#showSheet')).toContainText('Durée totale : 13 min');
  await page.emulateMedia({ media: 'screen' });
});

test('partager une séance sans feuille de partage : le fichier est téléchargé', async ({ page }) => {
  await page.addInitScript(() => { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch {} navigator.share = undefined; });
  await openApp(page);
  await openSeance(page);
  await page.getByRole('button', { name: 'Générer ma séance' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Partager la séance' }).click();
  expect((await download).suggestedFilename()).toBe('impro-lab-seance.json');
  await expect(page.locator('#planSummary')).toContainText('téléchargé');
});
