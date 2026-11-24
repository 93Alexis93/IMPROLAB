/* IMPRO LAB : « Séance plus » (D45, 24 novembre 2026).
   1. Ajouter un exercice à la séance en cours depuis la Bibliothèque et depuis la recherche globale.
   2. Chercher (et filtrer par objectif) dans « Ajouter un exercice à la main ».
   3. Fiche coach imprimable (PDF par l'impression du navigateur) : jeux, consignes,
      conseils pour coacher, et ce que l'appli sait du groupe (avis de la Régie, carnet, notes perso).
   Ce fichier ne modifie pas library.json : il lit les fiches et l'historique déjà présents.
   Écrit en clair, non minifié, pour rester lisible et facile à retirer. */
(function () {
  'use strict';
  var doc = document;

  function sans(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fiche(titre) {
    var all = (typeof libraryPayload !== 'undefined' && libraryPayload && Array.isArray(libraryPayload.exercices)) ? libraryPayload.exercices : [];
    for (var i = 0; i < all.length; i++) if (all[i].titre === titre || displayTitle(all[i].titre) === titre) return all[i];
    return null;
  }
  function texte(v) { return typeof v === 'string' ? v.trim() : ''; }
  function minutesPlan() {
    return planCards().reduce(function (n, c) { return n + (+((c.querySelector('small') || {}).textContent || '').match(/\d+/)?.[0] || 5); }, 0);
  }
  function titresPlan() { return planCards().map(function (c) { return (c.querySelector('h3') || {}).textContent.trim(); }); }
  function dansSeance(g) { return titresPlan().indexOf(displayTitle(g[0])) >= 0; }
  function dureeFiche(g) { var m = Math.round(Number((fiche(g[0]) || {}).duree_minutes) || 0); return m > 0 && m <= 60 ? m : 8; }

  /* ---------- 1. Ajout à la séance en cours (mêmes règles que l'ajout à la main) ---------- */
  function ajouterJeu(g, minutes) {
    if (!g) return { ok: false, msg: 'Exercice introuvable.' };
    if (!isEligibleGame(g, { includeExternal: false })) return { ok: false, msg: 'Cet exercice ne peut pas être ajouté : sa fiche ne respecte pas les critères d’admissibilité du générateur.' };
    var m = Math.max(1, Math.min(60, Math.round(+minutes) || 8));
    doc.getElementById('plan').insertAdjacentHTML('beforeend', '<div class="card"><small>' + m + ' min</small><h3 class="exercise-title" style="color:' + categoryColor(g[1]) + '">' + escapeText(displayTitle(g[0])) + '</h3>' + coachDetailsHtml(g[0], g[3]) + '</div>');
    persistPlan();
    var n = planCards().length;
    return { ok: true, msg: '« ' + displayTitle(g[0]) + ' » ajouté à la séance du groupe ' + profileName(activeProfileId()) + ' · ' + n + ' exercice' + (n > 1 ? 's' : '') + ', ' + minutesPlan() + ' min.' };
  }
  window.sessionAddGame = ajouterJeu;
  window.sessionHasGame = function (g) { return !!g && dansSeance(g); };
  window.sessionAddButton = function (i) {
    var g = data[i]; if (!g || !isEligibleGame(g, { includeExternal: false })) return '';
    return dansSeance(g)
      ? '<button type="button" class="lib-add" disabled aria-label="Déjà dans la séance : ' + escapeText(displayTitle(g[0])) + '">✓ Dans la séance</button>'
      : '<button type="button" class="lib-add" onclick="libraryAdd(' + i + ',this)" aria-label="Ajouter à la séance : ' + escapeText(displayTitle(g[0])) + '">＋ Ajouter à la séance</button>';
  };
  window.libraryAdd = function (i, btn) {
    var g = data[i]; var r = ajouterJeu(g, dureeFiche(g));
    var card = btn && btn.closest('.card');
    var st = card && card.querySelector('.lib-add-status');
    if (card && !st) { st = doc.createElement('p'); st.className = 'lib-add-status'; st.setAttribute('aria-live', 'polite'); btn.insertAdjacentElement('afterend', st); }
    if (st) st.textContent = r.msg;
    if (r.ok && btn) { btn.disabled = true; btn.textContent = '✓ Dans la séance'; btn.setAttribute('aria-label', 'Déjà dans la séance : ' + displayTitle(g[0])); }
    return r;
  };
  // Pour la recherche globale (accueil-plus.js) : par titre de fiche.
  window.sessionAddByTitle = function (titre) {
    var g = Array.isArray(data) ? data.find(function (x) { return x[0] === titre; }) : null;
    if (g && dansSeance(g)) return { ok: true, deja: true, msg: '« ' + displayTitle(g[0]) + ' » est déjà dans la séance.' };
    return ajouterJeu(g, g ? dureeFiche(g) : 8);
  };

  /* ---------- 2. Recherche et filtre dans « Ajouter un exercice à la main » ---------- */
  window.manualFilter = function () {
    var sel = doc.getElementById('manualGame'); if (!sel || !Array.isArray(data)) return;
    var q = sans((doc.getElementById('manualSearch') || {}).value).trim();
    var cat = (doc.getElementById('manualCategory') || {}).value || '';
    var mots = q.split(/\s+/).filter(Boolean);
    var avant = sel.value;
    var liste = data.map(function (g, i) { return { g: g, i: i }; }).filter(function (x) {
      var g = x.g;
      if (cat && g[1] !== cat && (g[11] || []).indexOf(cat) < 0) return false;
      if (!mots.length) return true;
      var h = sans(g[0] + ' ' + displayTitle(g[0]) + ' ' + (g[17] || []).join(' '));
      return mots.every(function (m) { return h.indexOf(m) >= 0; });
    });
    // Les titres qui commencent par la recherche passent devant.
    if (mots.length) liste.sort(function (a, b) {
      var A = sans(displayTitle(a.g[0])).indexOf(q) === 0 || sans(a.g[0]).indexOf(q) === 0 ? 0 : 1;
      var B = sans(displayTitle(b.g[0])).indexOf(q) === 0 || sans(b.g[0]).indexOf(q) === 0 ? 0 : 1;
      return A - B;
    });
    sel.innerHTML = liste.map(function (x) { return '<option value="' + x.i + '" style="color:' + categoryColor(x.g[1]) + '">' + escapeText(displayTitle(x.g[0])) + (x.g[13] ? ' ' + levelStars(x.g) : '') + '</option>'; }).join('');
    if (liste.some(function (x) { return String(x.i) === avant; }) && !mots.length) sel.value = avant;
    var btn = doc.getElementById('manualAdd'); if (btn) btn.disabled = !liste.length;
    var out = doc.getElementById('manualCount');
    if (out) out.textContent = (q || cat) ? (liste.length ? liste.length + ' exercice' + (liste.length > 1 ? 's' : '') + ' trouvé' + (liste.length > 1 ? 's' : '') : 'Aucun exercice trouvé. Essaie un mot plus court.') : '';
    manualMinutes();
  };
  // La durée proposée suit la fiche choisie ; tu peux toujours la changer.
  function manualMinutes() {
    var sel = doc.getElementById('manualGame'), mins = doc.getElementById('manualMins');
    var g = sel && data[+sel.value];
    if (g && mins) mins.value = dureeFiche(g);
  }
  window.manualMinutes = manualMinutes;
  window.manualAdd = function () {
    var sel = doc.getElementById('manualGame'); var g = sel && sel.value !== '' ? data[+sel.value] : null;
    var r = ajouterJeu(g, (doc.getElementById('manualMins') || {}).value);
    var out = doc.getElementById('manualCount');
    if (r.ok) { if (out) out.textContent = r.msg; }
    else if (g) doc.getElementById('planSummary').textContent = r.msg;
  };

  /* ---------- 3. Fiche coach imprimable ---------- */
  function historiqueGroupe() {
    var id = activeProfileId();
    return readHistory().filter(function (v) { return historyGroupId(v) === id; });
  }
  function joue(hist, titreAffiche) {
    var fois = 0, dernier = null;
    hist.forEach(function (v) { if (historyExercises(v).indexOf(titreAffiche) >= 0) { fois++; var d = new Date(v.date); if (!isNaN(d) && (!dernier || d > dernier)) dernier = d; } });
    return { fois: fois, dernier: dernier };
  }
  function dateCourte(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }
  function ligne(label, valeur) { return valeur ? '<p><b>' + label + ' :</b> ' + escapeText(valeur) + '</p>' : ''; }
  function utile(v) { var t = texte(v); return t && !/^(aucune?|correct|ok|rien|non|à évaluer)\.?$/i.test(t) ? t : ''; }

  function conseilsGroupe(g, titreAffiche, hist, avis, notesRegie) {
    var out = [];
    var score = Number(avis[g[0]]) || 0;
    var j = joue(hist, titreAffiche);
    if (!j.fois) out.push('Nouveau pour ce groupe : montre-le une fois avec deux volontaires avant de lancer tout le monde.');
    else out.push('Déjà joué ' + (j.fois === 1 ? 'une fois' : j.fois + ' fois') + ' avec ce groupe' + (j.dernier ? ', la dernière le ' + dateCourte(j.dernier) : '') + ' : rappelle la règle en une phrase et lance vite.');
    if (score > 0) out.push('Il a bien marché avec ce groupe (' + score + ' avis positif' + (score > 1 ? 's' : '') + ') : tu peux viser la version plus difficile.');
    if (score < 0) out.push('Il a coincé avec ce groupe (' + (-score) + ' avis à revoir) : commence par la version facile et coupe tôt si ça ne prend pas.');
    notesRegie.forEach(function (n) { out.push('Noté en Régie : ' + n); });
    var ex = fiche(g[0]); var mine = ex && ex.id ? texte(myNotesRead()[ex.id]) : '';
    if (mine) out.push('Mes notes : ' + mine);
    return out;
  }

  function coachSheetHtml() {
    var cards = planCards();
    var obj = doc.querySelector('#plan .session-objective');
    var fil = ((obj && obj.querySelector('strong') || {}).textContent || '').replace(/^Fil conducteur( de la séance)?\s*:?\s*/i, '').trim();
    var but = ((obj && obj.querySelector('p') || {}).textContent || '').trim();
    if (/^La séance n’a pas encore/.test(but)) but = '';
    var hist = historiqueGroupe();
    var avis = readGroupFeedback();
    var live = liveNotesRead();
    var groupe = profileName(activeProfileId());
    var total = minutesPlan();
    var jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Dernier carnet de bord rempli pour ce groupe.
    var carnet = null;
    for (var k = 0; k < hist.length && !carnet; k++) { var r = historyReview(hist[k]); if (r.retravailler || r.marche || r.brille) carnet = { r: r, date: new Date(hist[k].date) }; }

    var tete = '<div class="coach-head"><h1>Fiche coach · séance du ' + escapeText(jour) + '</h1>' +
      '<p class="coach-meta">Groupe ' + escapeText(groupe) + ' · ' + cards.length + ' exercice' + (cards.length > 1 ? 's' : '') + ' · ' + total + ' min</p>' +
      ligne('Objectif', but.replace(/^Aujourd’hui, l’objectif est de /, '').replace(/^./, function (m) { return m.toUpperCase(); })) +
      ligne('Fil conducteur', fil) + '</div>';
    var groupeBloc = '';
    if (carnet) {
      groupeBloc = '<section class="coach-groupe"><h2>Ce groupe, d’après ton carnet du ' + escapeText(isNaN(carnet.date) ? '' : dateCourte(carnet.date)) + '</h2>' +
        ligne('À retravailler', carnet.r.retravailler) + ligne('Ce qui a marché', carnet.r.marche) + ligne('Qui a brillé', carnet.r.brille) + '</section>';
    } else if (!hist.length) {
      groupeBloc = '<section class="coach-groupe"><h2>Ce groupe</h2><p>Première séance enregistrée pour ce groupe : observe qui ose, qui écoute, qui reste en retrait, et note-le dans le carnet de bord après la séance.</p></section>';
    }

    var debut = 0;
    var jeux = cards.map(function (c, i) {
      var t = (c.querySelector('h3') || {}).textContent.trim();
      var m = +(((c.querySelector('small') || {}).textContent || '').match(/\d+/)?.[0] || 5);
      var g = gameByShownTitle(t);
      var ex = g ? fiche(g[0]) : null;
      var ca = (ex && ex.conseils_animation) || {};
      var ap = (ex && ex.accompagnement_pedagogique) || {};
      var vc = (ex && ex.validation_coach) || {};
      var consigne = texte(ap.consigne) || texte(vc.consigne) || texte(ca.consigne_courte) || texte(vc.consigne_courte);
      var regle = texte(ex && ex.regle_clarifiee) || (g ? texte(g[2]) : '');
      var infos = [g && g[1], g && g[13] ? 'niveau ' + levelStars(g) : '', g && g[16] && g[16] !== 'aucun' ? 'contact ' + g[16] : '', ex && utile(ex.effectif_conseille) ? ex.effectif_conseille : ''].filter(Boolean).join(' · ');
      var plage = debut + ' à ' + (debut + m) + ' min'; debut += m;
      var coacher = [
        utile(ca.points_vigilance) ? 'Vigilance : ' + texte(ca.points_vigilance) : '',
        utile(ca.variante_facile) ? 'Si ça coince : ' + texte(ca.variante_facile) : '',
        utile(ca.variante_difficile) ? 'Si ça roule : ' + texte(ca.variante_difficile) : (utile(vc.complexification) ? 'Si ça roule : ' + texte(vc.complexification) : ''),
        utile(ap.variante) ? 'Variante : ' + texte(ap.variante) : '',
        ex && utile(ex.remarque_coach) ? 'Remarque de coach : ' + texte(ex.remarque_coach) : ''
      ].filter(Boolean);
      var notesRegie = (live.notes || []).filter(function (n) { return n && n.ex === t && texte(n.text); }).map(function (n) { return texte(n.text); });
      var perso = g ? conseilsGroupe(g, t, hist, avis, notesRegie) : [];
      return '<article class="coach-jeu">' +
        '<h2><span class="coach-num">' + (i + 1) + '.</span> ' + escapeText(t) + '<span class="coach-duree">' + m + ' min · ' + plage + '</span></h2>' +
        (infos ? '<p class="coach-infos">' + escapeText(infos) + '</p>' : '') +
        ligne('Consigne à donner', consigne) +
        (regle && regle !== consigne ? ligne('Règle complète', regle) : '') +
        ligne('Objectif', texte(ap.objectif_prof)) +
        (coacher.length ? '<div class="coach-bloc"><h3>Pour coacher</h3><ul>' + coacher.map(function (x) { return '<li>' + escapeText(x) + '</li>'; }).join('') + '</ul></div>' : '') +
        (perso.length ? '<div class="coach-bloc coach-perso"><h3>Avec ce groupe</h3><ul>' + perso.map(function (x) { return '<li>' + escapeText(x) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<p class="coach-notes">Notes :</p></article>';
    }).join('');
    return '<div class="coach-page">' + tete + groupeBloc + jeux + '</div>';
  }
  window.coachSheetHtml = coachSheetHtml;

  window.printCoachSheet = function () {
    if (!planCards().length) { alert('Crée une séance avant d’imprimer la fiche coach.'); return; }
    var box = doc.getElementById('coachSheet'); if (!box) return;
    box.innerHTML = coachSheetHtml();
    var titreAvant = doc.title;
    // Le titre de la page devient le nom proposé pour le fichier PDF.
    doc.title = 'Fiche coach ' + profileName(activeProfileId()) + ' ' + new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    doc.body.classList.add('print-coach');
    var fini = function () { doc.body.classList.remove('print-coach'); doc.title = titreAvant; window.removeEventListener('afterprint', fini); };
    window.addEventListener('afterprint', fini);
    window.print();
  };

  // La bibliothèque a pu charger avant ce fichier.
  if (Array.isArray(window.data) || (typeof data !== 'undefined' && Array.isArray(data) && data.length)) { try { window.manualFilter(); } catch (e) {} }
})();
