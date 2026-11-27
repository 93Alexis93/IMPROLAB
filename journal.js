/* IMPRO LAB : journal des séances (D48, 27 novembre 2026).
   Sur la séance préparée, « Clore la séance » ouvre un écran court :
   date, groupe et présents, exercices joués ou non (avec un commentaire), exercices joués hors plan,
   commentaire général. L'entrée est rangée dans la clé « impro-session-log-v1 » et s'affiche en tête
   de Plus → Historique, de la plus récente à la plus ancienne, avec Modifier et Supprimer.
   Les titres des exercices sont stockés en clair : une entrée reste lisible même si la bibliothèque change.
   La clé commence par « impro- » : « Tout sauvegarder » et « Restaurer » l'emportent comme les autres.
   Ne touche ni à library.json, ni au plan (impro-last-plan), ni aux séances enregistrées (impro-history),
   ni aux présences de l'onglet Groupes (impro-attendance-v1). */
(function () {
  'use strict';
  var doc = document;
  var CLE = 'impro-session-log-v1';
  var MAX_TEXTE = 500, MAX_COURT = 200, MAX_NOM = 80;

  function $(id) { return doc.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sur(fn) { try { return fn(); } catch (e) { console.warn('journal.js', e); } }
  function texte(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
  function jourLocal(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dateValide(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00')); }
  function dateLisible(s) { return dateValide(s) ? new Date(s + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date inconnue'; }
  function nouvelId() { return 'j-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function prenoms(s) {
    var vus = {}, out = [];
    String(s || '').split(/\n|,|;/).forEach(function (n) { n = n.trim().slice(0, MAX_NOM); var k = n.toLowerCase(); if (n && !vus[k]) { vus[k] = 1; out.push(n); } });
    return out;
  }
  function listeNoms(a) { return (Array.isArray(a) ? a : []).map(function (n) { return texte(n, MAX_NOM); }).filter(Boolean).slice(0, 300); }

  /* ---------- Stockage ---------- */
  function propre(x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
    var ex = (Array.isArray(x.exercices) ? x.exercices : []).filter(function (e) { return e && typeof e === 'object' && texte(e.titre, MAX_COURT); }).slice(0, 60).map(function (e) {
      return { titre: texte(e.titre, MAX_COURT), prevu: e.prevu !== false, joue: e.joue !== false, commentaire: texte(e.commentaire, MAX_COURT) };
    });
    return {
      id: texte(x.id, 60) || nouvelId(),
      date: dateValide(x.date) ? x.date : jourLocal(),
      groupe: texte(x.groupe, MAX_NOM),
      groupeId: texte(x.groupeId, 20),
      presents: listeNoms(x.presents),
      absents: listeNoms(x.absents),
      exercices: ex,
      commentaire: texte(x.commentaire, MAX_TEXTE),
      creeLe: texte(x.creeLe, 40) || new Date().toISOString(),
      modifieLe: texte(x.modifieLe, 40)
    };
  }
  function lire() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(CLE) || '[]'); } catch (e) { v = []; }
    return Array.isArray(v) ? v.map(propre).filter(Boolean) : [];
  }
  function ecrire(list) {
    try { localStorage.setItem(CLE, JSON.stringify(list)); return true; }
    catch (e) { sur(function () { if (typeof storageWarn === 'function') storageWarn(); }); return false; }
  }
  function triees(list) {
    return list.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || String(b.creeLe).localeCompare(String(a.creeLe)); });
  }

  /* ---------- Ce que l'appli sait déjà : groupes, effectifs, plan, bibliothèque ---------- */
  function profils() { return sur(function () { return GROUP_PROFILES.map(function (p) { return { id: p.id, nom: profileName(p.id), roster: p.roster }; }); }) || []; }
  function profilActif() { return sur(function () { return activeProfileId(); }) || ''; }
  function effectif(groupeId) {
    var p = profils().filter(function (x) { return x.id === groupeId; })[0];
    if (!p) return [];
    var a = sur(function () { return rosterState[p.roster]; });
    return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x.name === 'string' && x.name.trim(); }).map(function (x) { return { nom: x.name.trim().slice(0, MAX_NOM), present: x.present !== false }; });
  }
  function nomGroupe(groupeId) { var p = profils().filter(function (x) { return x.id === groupeId; })[0]; return p ? p.nom : ''; }
  function exercicesDuPlan() {
    var cartes = sur(function () { return planCards(); }) || [];
    return cartes.map(function (c) { var h = c.querySelector('h3'); return h ? h.textContent.trim().slice(0, MAX_COURT) : ''; }).filter(Boolean);
  }
  function titresBibliotheque() {
    var vus = {}, out = [];
    sur(function () { (Array.isArray(data) ? data : []).forEach(function (g) { var t = typeof displayTitle === 'function' ? displayTitle(g[0]) : g[0]; if (t && !vus[t]) { vus[t] = 1; out.push(t); } }); });
    return out.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
  }

  /* ---------- Écran « Clore la séance » ---------- */
  var brouillon = null;

  function brouillonDepuisPlan() {
    var gid = profilActif();
    var eleves = effectif(gid);
    return {
      id: '', creeLe: '', date: jourLocal(), groupeId: gid, eleves: eleves,
      librePresents: '', libreAbsents: '',
      exercices: exercicesDuPlan().map(function (t) { return { titre: t, prevu: true, joue: true, commentaire: '' }; }),
      commentaire: ''
    };
  }
  function brouillonDepuisEntree(e) {
    // Groupe connu : la liste à cocher reprend les présents et absents de l'entrée.
    // Sans groupe : les prénoms reviennent dans les deux champs libres, pour pouvoir en ajouter.
    var connu = profils().some(function (p) { return p.id === e.groupeId; });
    var eleves = connu ? e.presents.map(function (n) { return { nom: n, present: true }; }).concat(e.absents.map(function (n) { return { nom: n, present: false }; })) : [];
    return {
      id: e.id, creeLe: e.creeLe, date: e.date, groupeId: connu ? e.groupeId : '', groupeLibre: connu ? '' : e.groupe,
      eleves: eleves, librePresents: connu ? '' : e.presents.join('\n'), libreAbsents: connu ? '' : e.absents.join('\n'),
      exercices: e.exercices.map(function (x) { return { titre: x.titre, prevu: x.prevu, joue: x.joue, commentaire: x.commentaire }; }),
      commentaire: e.commentaire
    };
  }

  function lireFormulaire() {
    if (!brouillon) return;
    var d = $('journalDate'); if (d) brouillon.date = d.value;
    var g = $('journalGroup'); if (g) brouillon.groupeId = g.value;
    var gl = $('journalGroupFree'); if (gl) brouillon.groupeLibre = gl.value;
    brouillon.eleves.forEach(function (el, i) { var c = $('journalStudent' + i); if (c) el.present = c.checked; });
    var lp = $('journalFreePresent'); if (lp) brouillon.librePresents = lp.value;
    var la = $('journalFreeAbsent'); if (la) brouillon.libreAbsents = la.value;
    brouillon.exercices.forEach(function (x, i) {
      var j = $('journalPlayed' + i); if (j) x.joue = j.checked;
      var c = $('journalNote' + i); if (c) x.commentaire = c.value;
    });
    var cg = $('journalComment'); if (cg) brouillon.commentaire = cg.value;
  }

  function htmlEleves() {
    var b = brouillon;
    if (b.eleves.length) {
      var n = b.eleves.filter(function (e) { return e.present; }).length;
      return '<p class="journal-count" id="journalCount">' + n + ' présent' + (n > 1 ? 's' : '') + ' sur ' + b.eleves.length + '</p>' +
        '<div class="journal-actions-line"><button type="button" onclick="journalAll(true)">Tous présents</button><button type="button" onclick="journalAll(false)">Tous absents</button></div>' +
        '<ul class="journal-students">' + b.eleves.map(function (e, i) {
          return '<li><label class="journal-check"><input type="checkbox" id="journalStudent' + i + '"' + (e.present ? ' checked' : '') + ' onchange="journalCount()"><span>' + esc(e.nom) + '</span></label></li>';
        }).join('') + '</ul>';
    }
    var aide = b.groupeId ? 'Aucun joueur dans l’effectif de ce groupe (onglet Groupes). Écris les prénoms ici, un par ligne ou séparés par des virgules.' : 'Écris les prénoms, un par ligne ou séparés par des virgules.';
    return '<p class="muted">' + aide + '</p>' +
      '<label>Présents<textarea id="journalFreePresent" rows="3" maxlength="4000" autocomplete="off">' + esc(b.librePresents) + '</textarea></label>' +
      '<label>Absents (facultatif)<textarea id="journalFreeAbsent" rows="2" maxlength="4000" autocomplete="off">' + esc(b.libreAbsents) + '</textarea></label>';
  }

  function htmlExercices() {
    var b = brouillon;
    if (!b.exercices.length) return '<p class="muted">Aucun exercice pour l’instant. Ajoute ceux que vous avez joués ci-dessous.</p>';
    return '<ol class="journal-exercises">' + b.exercices.map(function (x, i) {
      return '<li class="journal-exercise' + (x.prevu ? '' : ' journal-hors-plan') + '">' +
        '<div class="journal-exercise-head"><span class="journal-exercise-title">' + esc(x.titre) + '</span>' + (x.prevu ? '' : '<span class="journal-tag">hors plan</span>') + '</div>' +
        '<div class="journal-exercise-line"><label class="journal-check"><input type="checkbox" id="journalPlayed' + i + '"' + (x.joue ? ' checked' : '') + ' aria-label="' + esc(x.titre) + ' : joué"><span>Joué</span></label>' +
        (x.prevu ? '' : '<button type="button" class="journal-remove" onclick="journalRemoveExtra(' + i + ')" aria-label="Retirer ' + esc(x.titre) + '">✕ Retirer</button>') + '</div>' +
        '<input type="text" id="journalNote' + i + '" maxlength="' + MAX_COURT + '" value="' + esc(x.commentaire) + '" placeholder="Commentaire court (facultatif)" aria-label="Commentaire sur ' + esc(x.titre) + '" autocomplete="off">' +
        '</li>';
    }).join('') + '</ol>';
  }

  function rendreFormulaire() {
    var root = $('journalForm'); if (!root || !brouillon) return;
    var b = brouillon;
    var options = profils().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === b.groupeId ? ' selected' : '') + '>' + esc(p.nom) + '</option>'; }).join('') +
      '<option value=""' + (b.groupeId ? '' : ' selected') + '>Sans groupe</option>';
    var biblio = titresBibliotheque().map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    root.innerHTML =
      '<div class="card journal-block"><label>Date<input type="date" id="journalDate" value="' + esc(b.date) + '" required></label>' +
      '<label>Groupe<select id="journalGroup" onchange="journalGroupChange()">' + options + '</select></label>' +
      (b.groupeId ? '' : '<label>Nom du groupe (facultatif)<input type="text" id="journalGroupFree" maxlength="' + MAX_NOM + '" value="' + esc(b.groupeLibre || '') + '" autocomplete="off"></label>') +
      '</div>' +
      '<div class="card journal-block"><h3>Présences</h3><div id="journalStudents">' + htmlEleves() + '</div></div>' +
      '<div class="card journal-block"><h3>Exercices</h3><p class="muted">Décoche ce qui n’a pas été joué.</p><div id="journalExercises">' + htmlExercices() + '</div>' +
      '<details class="journal-extra" id="journalExtraFold"><summary>＋ Ajouter un exercice joué hors plan</summary>' +
      '<label>Dans la bibliothèque<select id="journalExtraLibrary"><option value="">Choisir un exercice…</option>' + biblio + '</select></label>' +
      '<label>Ou en texte libre<input type="text" id="journalExtraFree" maxlength="' + MAX_COURT + '" placeholder="Nom de l’exercice" autocomplete="off"></label>' +
      '<button type="button" onclick="journalAddExtra()">Ajouter</button><p id="journalExtraStatus" class="muted" aria-live="polite"></p></details></div>' +
      '<div class="card journal-block"><label>Commentaire général (facultatif)<textarea id="journalComment" rows="3" maxlength="' + MAX_TEXTE + '">' + esc(b.commentaire) + '</textarea></label></div>' +
      '<p id="journalStatus" class="journal-status" role="status" aria-live="polite"></p>' +
      '<div class="journal-actions"><button type="button" class="btn-primary" onclick="journalSave()">✓ ' + (b.id ? 'Enregistrer les modifications' : 'Enregistrer au journal') + '</button><button type="button" onclick="journalCancel()">Annuler</button></div>';
    var titre = $('journalTitle'); if (titre) titre.textContent = b.id ? 'Modifier la séance' : 'Clore la séance';
  }

  function ouvrir(b) {
    brouillon = b;
    rendreFormulaire();
    sur(function () { tab('journal'); });
    sur(function () { window.scrollTo(0, 0); });
  }

  window.journalOpen = function () { ouvrir(brouillonDepuisPlan()); };
  window.journalEdit = function (id) {
    var e = lire().filter(function (x) { return x.id === id; })[0];
    if (e) ouvrir(brouillonDepuisEntree(e));
  };
  window.journalCount = function () {
    lireFormulaire();
    var c = $('journalCount'); if (!c || !brouillon) return;
    var n = brouillon.eleves.filter(function (e) { return e.present; }).length;
    c.textContent = n + ' présent' + (n > 1 ? 's' : '') + ' sur ' + brouillon.eleves.length;
  };
  window.journalAll = function (present) {
    if (!brouillon) return;
    brouillon.eleves.forEach(function (e, i) { var c = $('journalStudent' + i); if (c) c.checked = present; });
    window.journalCount();
  };
  window.journalGroupChange = function () {
    lireFormulaire();
    brouillon.eleves = effectif(brouillon.groupeId);
    rendreFormulaire();
  };
  window.journalAddExtra = function () {
    lireFormulaire();
    var lib = $('journalExtraLibrary'), libre = $('journalExtraFree'), st = $('journalExtraStatus');
    var titre = texte(libre && libre.value, MAX_COURT) || texte(lib && lib.value, MAX_COURT);
    if (!titre) { if (st) st.textContent = 'Choisis un exercice ou écris son nom.'; return; }
    brouillon.exercices.push({ titre: titre, prevu: false, joue: true, commentaire: '' });
    rendreFormulaire();
    var fold = $('journalExtraFold'); if (fold) fold.open = true;
    var st2 = $('journalExtraStatus'); if (st2) st2.textContent = '« ' + titre + ' » ajouté.';
  };
  window.journalRemoveExtra = function (i) {
    lireFormulaire();
    var x = brouillon.exercices[i];
    if (!x || x.prevu) return;
    brouillon.exercices.splice(i, 1);
    rendreFormulaire();
  };
  window.journalCancel = function () {
    var etaitModif = brouillon && brouillon.id;
    brouillon = null;
    sur(function () { tab(etaitModif ? 'historique' : 'seance'); });
  };
  window.journalSave = function () {
    lireFormulaire();
    var b = brouillon, st = $('journalStatus');
    if (!b) return;
    if (!dateValide(b.date)) { if (st) st.textContent = 'Indique la date de la séance.'; var d = $('journalDate'); if (d) d.focus(); return; }
    var presents, absents;
    if (b.eleves.length) {
      presents = b.eleves.filter(function (e) { return e.present; }).map(function (e) { return e.nom; });
      absents = b.eleves.filter(function (e) { return !e.present; }).map(function (e) { return e.nom; });
    } else {
      presents = prenoms(b.librePresents);
      var dejaLa = {}; presents.forEach(function (n) { dejaLa[n.toLowerCase()] = 1; });
      absents = prenoms(b.libreAbsents).filter(function (n) { return !dejaLa[n.toLowerCase()]; });
    }
    var maintenant = new Date().toISOString();
    var entree = propre({
      id: b.id || nouvelId(),
      date: b.date,
      groupe: b.groupeId ? nomGroupe(b.groupeId) : texte(b.groupeLibre, MAX_NOM),
      groupeId: b.groupeId,
      presents: presents, absents: absents,
      exercices: b.exercices,
      commentaire: b.commentaire,
      creeLe: b.creeLe || maintenant,
      modifieLe: b.id ? maintenant : ''
    });
    var list = lire();
    var i = list.map(function (x) { return x.id; }).indexOf(entree.id);
    if (i >= 0) list[i] = entree; else list.push(entree);
    if (!ecrire(list)) { if (st) st.textContent = '⚠️ Pas enregistré : cet appareil refuse d’enregistrer (stockage plein ou navigation privée).'; return; }
    brouillon = null;
    ouvertApres = entree.id;
    messageApres = (b.id ? 'Séance modifiée.' : 'Séance close et rangée dans le journal.');
    sur(function () { tab('historique'); });
  };
  window.journalDelete = function (id) {
    var list = lire(), e = list.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (!confirm('Supprimer la séance du ' + dateLisible(e.date) + (e.groupe ? ' (' + e.groupe + ')' : '') + ' du journal ? Cette action est définitive.')) return;
    if (!ecrire(list.filter(function (x) { return x.id !== id; }))) return;
    messageApres = 'Séance supprimée du journal.';
    rendreHistorique();
  };

  /* ---------- Historique : le journal en tête de l'écran ---------- */
  var ouvertApres = '', messageApres = '';

  function htmlEntree(e) {
    var joues = e.exercices.filter(function (x) { return x.joue; }).length;
    var resume = [e.groupe || 'Sans groupe'];
    if (e.presents.length || e.absents.length) resume.push(e.presents.length + ' présent' + (e.presents.length > 1 ? 's' : ''));
    if (e.exercices.length) resume.push(joues + ' / ' + e.exercices.length + ' exercice' + (e.exercices.length > 1 ? 's' : '') + ' joué' + (joues > 1 ? 's' : ''));
    var ex = e.exercices.length ? '<ul class="journal-detail-exercises">' + e.exercices.map(function (x) {
      return '<li class="' + (x.joue ? 'journal-joue' : 'journal-pas-joue') + '"><span class="journal-mark" aria-hidden="true">' + (x.joue ? '✓' : '✗') + '</span><span><b>' + esc(x.titre) + '</b>' +
        ' <span class="journal-etat">' + (x.joue ? 'joué' : 'pas joué') + (x.prevu ? '' : ', hors plan') + '</span>' +
        (x.commentaire ? '<br><span class="journal-note">' + esc(x.commentaire) + '</span>' : '') + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun exercice noté.</p>';
    return '<details class="journal-entry" data-id="' + esc(e.id) + '"' + (e.id === ouvertApres ? ' open' : '') + '>' +
      '<summary><span class="journal-entry-date">' + esc(dateLisible(e.date)) + '</span><span class="journal-entry-sum">' + esc(resume.join(' · ')) + '</span></summary>' +
      '<div class="journal-entry-body">' +
      '<p><b>Présents :</b> ' + (e.presents.length ? esc(e.presents.join(', ')) : '<span class="muted">aucun noté</span>') + '</p>' +
      (e.absents.length ? '<p><b>Absents :</b> ' + esc(e.absents.join(', ')) + '</p>' : '') +
      ex +
      (e.commentaire ? '<p class="journal-comment"><b>Commentaire :</b> ' + esc(e.commentaire) + '</p>' : '') +
      '<div class="journal-actions-line"><button type="button" onclick="journalEdit(\'' + esc(e.id) + '\')">✏️ Modifier</button><button type="button" class="journal-delete" onclick="journalDelete(\'' + esc(e.id) + '\')">🗑 Supprimer</button></div>' +
      '</div></details>';
  }

  function rendreHistorique() {
    var root = $('journalHistory'); if (!root) return;
    var list = triees(lire());
    var corps = list.length ? list.map(htmlEntree).join('') :
      '<p class="journal-vide">Aucune séance close pour l’instant. Sur une séance préparée, « Clore la séance » range ici la date, les présents, les exercices joués et tes commentaires.</p>' +
      '<button type="button" onclick="tab(\'seance\')">🗓 Aller à la séance</button>';
    root.innerHTML = '<h3>📓 Journal des séances' + (list.length ? ' <small>(' + list.length + ')</small>' : '') + '</h3>' +
      '<p id="journalHistoryStatus" class="journal-status" role="status" aria-live="polite">' + esc(messageApres) + '</p>' + corps;
    messageApres = '';
    if (ouvertApres) {
      var el = root.querySelector('.journal-entry[open]');
      ouvertApres = '';
      if (el) sur(function () { el.scrollIntoView({ block: 'start' }); });
    }
  }

  if (typeof window.renderHistory === 'function') {
    var histOrigine = window.renderHistory;
    window.renderHistory = function () { var r = histOrigine.apply(this, arguments); sur(rendreHistorique); return r; };
  }
  window.journalRead = lire;
})();
