/* IMPRO LAB : « Accueil plus » (D44, 18 novembre 2026).
   Prise en main et défi du jour, écrit en clair pour rester lisible et facile à retirer :
   1. Défi du jour : en changer, le cocher « relevé », la série de jours, les familles, tes propres défis, le partager.
   2. Mot d'accueil en haut de l'Accueil : une seule action principale selon le moment.
   3. Visite guidée en quelques bulles (premier lancement, puis depuis « Plus »).
   4. Écrans vides utiles (Historique, Joueurs).
   5. Recherche globale (loupe de l'en-tête) : exercices, principes, conseils, défis.
   6. Petits retours : vibration légère, confettis quand un défi est relevé.
   Ne touche ni à library.json ni aux fiches. Les données restent sur l'appareil (clé « impro-defi-v1 »,
   comprise dans « Tout sauvegarder » comme toutes les clés « impro-… »). */
(function () {
  'use strict';
  var doc = document, body = doc.body;
  var calme = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CLE = 'impro-defi-v1';
  var CLE_VISITE = 'improlab-visite-vue';

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sur(fn) { try { return fn(); } catch (e) { console.warn('accueil-plus.js', e); } }
  function sans(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' '); }
  function vibre(ms) { sur(function () { if (navigator.vibrate) navigator.vibrate(ms || 12); }); }
  function jourLocal(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* ======================================================================
     1. Défi du jour
     ====================================================================== */
  // Familles des 60 défis (rangées par titre, pour survivre à un réordonnancement de la liste).
  var FAMILLES = {
    ecoute: { nom: 'Écoute', couleur: '#0d6f6a', titres: ['Dis oui', 'Les prénoms', 'Écoute entière', 'Le détail', 'Une offre pour l’autre', 'Réagis d’abord', 'Soutiens', 'Une vraie curiosité', 'Reprise transformée', 'Le non qui aide', 'Le tour des regards', 'Remercie', 'Dis ce que tu vois', 'On va le découvrir', 'La question ouverte', 'Laisse-toi guider'] },
    corps: { nom: 'Corps et voix', couleur: '#a8402a', titres: ['Montre, ne raconte pas', 'Une démarche', 'Le lieu en trois gestes', 'Ralentis', 'L’objet précis', 'Commence par un geste', 'À pleine voix', 'Le corps d’abord', 'Trois respirations', 'Réponds par un geste', 'Le lieu qui change'] },
    scene: { nom: 'Personnage et scène', couleur: '#a62d68', titres: ['Trois secondes', 'Moitié moins de mots', 'Face au public', 'Statut haut, voix calme', 'Statut bas, mais gagnant', 'La relation d’abord', 'La dernière image', 'L’émotion qui monte', 'Un secret', 'Même scène, autre émotion', 'Une voix inconnue', 'Le calme', 'Le point de vue d’un objet', 'À toute vitesse', 'Cinq mots', 'Entre, puis sors', 'Un vrai souvenir'] },
    audace: { nom: 'Audace', couleur: '#265da0', titres: ['L’erreur cadeau', 'Le contraire du réflexe', 'Ose le premier', 'Un petit risque', 'Joue le plaisir'] },
    animer: { nom: 'Pour animer', couleur: '#863894', titres: ['Un compliment précis', 'Le bilan qui compte', 'Cadre en deux phrases', 'Couper à temps', 'Le tour des prénoms', 'Un temps pour souffler', 'Moins d’explications', 'D’abord en petit groupe', 'Un jeu jamais animé', 'Une trace', 'Le regard du public'] },
    perso: { nom: 'Mes défis', couleur: '#74232d', titres: [] }
  };
  var ORDRE_FAMILLES = ['ecoute', 'corps', 'scene', 'audace', 'animer', 'perso'];

  function lireEtat() {
    var e = null;
    sur(function () { e = JSON.parse(localStorage.getItem(CLE) || 'null'); });
    if (!e || typeof e !== 'object') e = {};
    if (!Array.isArray(e.faits)) e.faits = [];
    if (!Array.isArray(e.jours)) e.jours = [];
    if (!Array.isArray(e.perso)) e.perso = [];
    e.perso = e.perso.filter(function (d) { return Array.isArray(d) && typeof d[0] === 'string' && typeof d[1] === 'string' && d[0].trim(); });
    if (typeof e.famille !== 'string' || !FAMILLES[e.famille]) e.famille = '';
    return e;
  }
  function ecrireEtat(e) {
    sur(function () { localStorage.setItem(CLE, JSON.stringify(e)); });
  }

  function tousLesDefis(e) {
    var base = (typeof HOME_CHALLENGES !== 'undefined' && Array.isArray(HOME_CHALLENGES)) ? HOME_CHALLENGES : [];
    return base.map(function (d) { return { titre: d[0], texte: d[1], famille: familleDe(d[0]) }; })
      .concat(e.perso.map(function (d) { return { titre: d[0], texte: d[1], famille: 'perso' }; }));
  }
  function familleDe(titre) {
    for (var i = 0; i < ORDRE_FAMILLES.length; i++) {
      var f = FAMILLES[ORDRE_FAMILLES[i]];
      if (f.titres.indexOf(titre) >= 0) return ORDRE_FAMILLES[i];
    }
    return '';
  }
  function reserve(e) {
    var tous = tousLesDefis(e);
    if (!e.famille) return tous;
    var f = tous.filter(function (d) { return d.famille === e.famille; });
    return f.length ? f : tous;
  }
  function trouver(e, titre) {
    return tousLesDefis(e).filter(function (d) { return d.titre === titre; })[0] || null;
  }
  function numeroDuJour() { return typeof homeDayNumber === 'function' ? homeDayNumber() : Math.floor(Date.now() / 864e5); }

  // Le défi affiché : celui choisi aujourd'hui, sinon celui de la date (comme avant), filtré par famille si besoin.
  function defiCourant(e) {
    if (e.jour === jourLocal() && e.choix) {
      var c = trouver(e, e.choix);
      if (c) return { defi: c, choisi: true };
    }
    var jour = numeroDuJour() + 3;
    if (!e.famille && typeof challengeOfDay === 'function') {
      var d = challengeOfDay(jour);
      return { defi: { titre: d[0], texte: d[1], famille: familleDe(d[0]) }, choisi: false };
    }
    var r = reserve(e), n = r.length;
    return { defi: r[((jour % n) + n) % n], choisi: false };
  }

  function serie(e) {
    // Jours de suite (jusqu'à aujourd'hui, ou hier si rien n'est encore relevé aujourd'hui).
    var jours = {}; e.jours.forEach(function (j) { jours[j] = true; });
    var d = new Date(), n = 0;
    if (!jours[jourLocal(d)]) d.setDate(d.getDate() - 1);
    while (jours[jourLocal(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function puce(famille) {
    var f = FAMILLES[famille]; if (!f) return '';
    return '<span class="ap-famille" style="--ap-c:' + f.couleur + '">' + esc(f.nom) + '</span>';
  }

  function rendreDefi(animer) {
    var box = doc.getElementById('homeChallenge'); if (!box) return;
    var e = lireEtat(), cur = defiCourant(e), d = cur.defi;
    if (!d) return;
    var fait = e.faits.indexOf(d.titre) >= 0;
    var total = tousLesDefis(e).length;
    var nbFaits = e.faits.filter(function (t) { return !!trouver(e, t); }).length;
    var s = serie(e);
    var html = '';
    html += '<div class="ap-defi-tete"><span class="home-step">🎯 DÉFI DU JOUR</span>' + puce(d.famille) + '</div>';
    html += '<h3>' + esc(d.titre) + '</h3><p>' + esc(d.texte) + '</p>';
    html += '<div class="ap-defi-actions">';
    html += '<button type="button" class="ap-defi-autre" onclick="apDefiAutre()">🔄 Un autre défi</button>';
    html += '<button type="button" class="ap-defi-fait' + (fait ? ' ap-fait' : '') + '" aria-pressed="' + fait + '" onclick="apDefiReleve()">' + (fait ? '✅ Relevé !' : '✓ Je l’ai relevé') + '</button>';
    html += '</div>';
    html += '<div class="ap-defi-bilan">' + nbFaits + ' / ' + total + ' défis relevés' + (s > 0 ? ' · <b>🔥 ' + s + ' jour' + (s > 1 ? 's' : '') + ' de suite</b>' : '') +
      (cur.choisi ? ' · <button type="button" class="ap-lien" onclick="apDefiRetour()">revenir au défi de la date</button>' : '') + '</div>';
    // Réglages repliés : famille, partager, mes défis.
    html += '<details class="ap-defi-plus"' + (box.dataset.apOuvert === '1' ? ' open' : '') + '><summary>Choisir une famille, écrire mon défi</summary>';
    html += '<div class="ap-familles" role="group" aria-label="Famille de défis">';
    html += '<button type="button" aria-pressed="' + (!e.famille) + '" onclick="apDefiFamille(\'\')">Toutes</button>';
    ORDRE_FAMILLES.forEach(function (k) {
      if (k === 'perso' && !e.perso.length) return;
      html += '<button type="button" style="--ap-c:' + FAMILLES[k].couleur + '" aria-pressed="' + (e.famille === k) + '" onclick="apDefiFamille(\'' + k + '\')">' + esc(FAMILLES[k].nom) + '</button>';
    });
    html += '</div>';
    html += '<form class="ap-defi-form" onsubmit="event.preventDefault();apDefiAjouter(this)">';
    html += '<label>Titre de ton défi<input name="titre" maxlength="40" required placeholder="Ex. : Le regard franc"></label>';
    html += '<label>Ce qu’il faut faire<textarea name="texte" maxlength="220" rows="2" required placeholder="Une phrase, à la deuxième personne : « Regarde… »"></textarea></label>';
    html += '<button type="submit" class="btn-primary">＋ Ajouter mon défi</button><div class="ap-defi-msg" aria-live="polite"></div></form>';
    if (e.perso.length) {
      html += '<ul class="ap-mes-defis" aria-label="Mes défis">' + e.perso.map(function (p, i) {
        return '<li><button type="button" class="ap-lien" onclick="apDefiChoisir(' + i + ')">' + esc(p[0]) + '</button><button type="button" class="ap-suppr" aria-label="Retirer le défi ' + esc(p[0]) + '" onclick="apDefiRetirer(' + i + ')">✕</button></li>';
      }).join('') + '</ul>';
    }
    if (navigator.share) html += '<button type="button" class="ap-partager" onclick="apDefiPartager()">📤 Partager ce défi avec la troupe</button>';
    html += '</details>';
    box.innerHTML = html;
    box.hidden = false;
    box.classList.toggle('ap-defi-releve', fait);
    var plus = $('.ap-defi-plus', box);
    if (plus) plus.addEventListener('toggle', function () { box.dataset.apOuvert = plus.open ? '1' : ''; });
    if (animer && !calme) { box.classList.remove('ap-retourne'); void box.offsetWidth; box.classList.add('ap-retourne'); }
  }

  window.apDefiAutre = function () {
    var e = lireEtat(), cur = defiCourant(e).defi;
    var r = reserve(e).filter(function (d) { return !cur || d.titre !== cur.titre; });
    var neufs = r.filter(function (d) { return e.faits.indexOf(d.titre) < 0; });
    var choix = (neufs.length ? neufs : r);
    if (!choix.length) return;
    var d = choix[Math.floor(Math.random() * choix.length)];
    e.jour = jourLocal(); e.choix = d.titre;
    ecrireEtat(e); vibre(10); rendreDefi(true);
  };
  window.apDefiRetour = function () {
    var e = lireEtat(); e.choix = null; ecrireEtat(e); rendreDefi(true);
  };
  window.apDefiReleve = function () {
    var e = lireEtat(), d = defiCourant(e).defi; if (!d) return;
    var i = e.faits.indexOf(d.titre), today = jourLocal();
    if (i >= 0) {
      e.faits.splice(i, 1);
    } else {
      e.faits.push(d.titre);
      if (e.jours.indexOf(today) < 0) e.jours.push(today);
      e.jours = e.jours.slice(-120);
      // Garder le défi relevé à l'écran toute la journée.
      e.jour = today; e.choix = d.titre;
    }
    // Tour complet : on repart de zéro pour la famille choisie (ou pour tous).
    var r = reserve(e), complet = r.length && r.every(function (x) { return e.faits.indexOf(x.titre) >= 0; });
    ecrireEtat(e);
    rendreDefi(false);
    if (i < 0) {
      vibre([12, 40, 18]);
      confettis($('#homeChallenge .ap-defi-fait'));
      if (complet) {
        var msg = el('div', 'ap-defi-tour', '🎉 Tour complet : tous les défis' + (e.famille ? ' de cette famille' : '') + ' sont relevés ! Le compteur repart à zéro demain.');
        var box = doc.getElementById('homeChallenge'); if (box) box.appendChild(msg);
        e.faits = e.faits.filter(function (t) { return !r.some(function (x) { return x.titre === t; }); });
        ecrireEtat(e);
      }
    }
  };
  window.apDefiFamille = function (k) {
    var e = lireEtat(); e.famille = FAMILLES[k] ? k : '';
    var cur = e.jour === jourLocal() && e.choix ? trouver(e, e.choix) : null;
    if (cur && e.famille && cur.famille !== e.famille) e.choix = null;
    ecrireEtat(e); rendreDefi(true);
  };
  window.apDefiAjouter = function (form) {
    var titre = String(form.titre.value || '').trim().slice(0, 40), texte = String(form.texte.value || '').trim().slice(0, 220);
    var msg = $('.ap-defi-msg', form);
    if (!titre || texte.length < 8) { if (msg) msg.textContent = 'Écris un titre et une phrase d’au moins quelques mots.'; return; }
    var e = lireEtat();
    if (trouver(e, titre)) { if (msg) msg.textContent = 'Un défi porte déjà ce titre.'; return; }
    e.perso.push([titre, texte]); e.jour = jourLocal(); e.choix = titre;
    ecrireEtat(e); vibre(10); rendreDefi(true);
  };
  window.apDefiChoisir = function (i) {
    var e = lireEtat(); if (!e.perso[i]) return;
    e.jour = jourLocal(); e.choix = e.perso[i][0]; ecrireEtat(e); rendreDefi(true);
  };
  window.apDefiRetirer = function (i) {
    var e = lireEtat(); if (!e.perso[i]) return;
    if (!confirm('Retirer le défi « ' + e.perso[i][0] + ' » ?')) return;
    var t = e.perso[i][0]; e.perso.splice(i, 1);
    if (e.choix === t) e.choix = null;
    e.faits = e.faits.filter(function (x) { return x !== t; });
    if (e.famille === 'perso' && !e.perso.length) e.famille = '';
    ecrireEtat(e); rendreDefi(false);
  };
  window.apDefiPartager = function () {
    var d = defiCourant(lireEtat()).defi; if (!d || !navigator.share) return;
    navigator.share({ title: 'Défi du jour IMPRO LAB', text: '🎯 Défi du jour : ' + d.titre + '\n' + d.texte }).catch(function () {});
  };

  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

  // Confettis aux couleurs du logo, partant du bouton.
  function confettis(depuis) {
    if (calme || !depuis) return;
    var r = depuis.getBoundingClientRect(), couleurs = ['#ffd21f', '#ff526e', '#d52cff', '#138bff', '#39f5c8'];
    var zone = el('div', 'ap-confettis'); zone.setAttribute('aria-hidden', 'true');
    zone.style.left = (r.left + r.width / 2) + 'px'; zone.style.top = (r.top + r.height / 2) + 'px';
    for (var i = 0; i < 22; i++) {
      var c = el('i'); var a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 90;
      c.style.background = couleurs[i % couleurs.length];
      c.style.setProperty('--x', Math.round(Math.cos(a) * v) + 'px');
      c.style.setProperty('--y', Math.round(Math.sin(a) * v - 40) + 'px');
      c.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
      c.style.animationDelay = Math.round(Math.random() * 80) + 'ms';
      zone.appendChild(c);
    }
    body.appendChild(zone);
    setTimeout(function () { zone.remove(); }, 1300);
  }

  // Remplace l'affichage du défi (index.html appelle homeChallengeRender depuis homeRender).
  window.homeChallengeRender = function () { sur(function () { rendreDefi(false); }); };

  /* ======================================================================
     2. Mot d'accueil : une seule action principale selon le moment
     ====================================================================== */
  function salutation() {
    var h = new Date().getHours();
    return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  }
  function rendreBonjour() {
    var home = doc.getElementById('home'); if (!home) return;
    var box = doc.getElementById('apBonjour');
    if (!box) {
      box = el('article', 'ap-bonjour'); box.id = 'apBonjour';
      box.setAttribute('aria-label', 'Par où commencer');
      var ancre = $('.home-actions', home);
      home.insertBefore(box, ancre || home.firstChild);
    }
    var nb = sur(function () { return typeof planCards === 'function' ? planCards().length : 0; }) || 0;
    var hist = sur(function () { return typeof readHistory === 'function' ? readHistory() : []; }) || [];
    var date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    var html = '<span class="ap-bonjour-date">' + esc(salutation()) + ' · ' + esc(date) + '</span>';
    if (nb > 0) {
      html += '<h3>Ta séance est prête</h3><p>' + nb + ' exercice' + (nb > 1 ? 's' : '') + ' t’attendent. La Régie enchaîne le chrono et les consignes.</p>' +
        '<div class="ap-bonjour-actions"><button type="button" class="btn-primary" onclick="tab(\'live\')">🎬 Lancer la Régie</button><button type="button" onclick="tab(\'seance\')">🗓 Revoir la séance</button></div>';
    } else if (hist.length) {
      var der = hist[0], quand = sur(function () { return new Date(der.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }) || '';
      var groupe = typeof der.groupe === 'string' && der.groupe ? ' avec ' + esc(der.groupe) : '';
      html += '<h3>On remet ça ?</h3><p>Dernière séance le ' + esc(quand) + groupe + '. Prépare la suivante en trois étapes.</p>' +
        '<div class="ap-bonjour-actions"><button type="button" class="btn-primary" onclick="tab(\'seance\')">🗓 Préparer la séance suivante</button><button type="button" onclick="tab(\'historique\')">📜 Historique</button></div>';
    } else {
      html += '<h3>Par où commencer ?</h3><p>Choisis ton groupe et une durée : IMPRO LAB te propose une séance complète, à adapter.</p>' +
        '<div class="ap-bonjour-actions"><button type="button" class="btn-primary" onclick="tab(\'seance\')">🗓 Créer ma première séance</button><button type="button" onclick="apVisite()">🧭 Visite guidée</button></div>';
    }
    box.innerHTML = html;
  }

  /* ======================================================================
     3. Sauvegarde plus discrète : l'état tient dans le titre du repli
     ====================================================================== */
  function rendreSauvegarde() {
    var sum = $('#home details.home-backup > summary'); if (!sum) return;
    var last = sur(function () { return typeof backupLastDate === 'function' ? backupLastDate() : null; });
    var jours = last && typeof backupDaysSince === 'function' ? backupDaysSince(last) : null;
    var etat = !last ? 'jamais' : jours >= 7 ? 'ancienne' : 'ok';
    var txt = !last ? 'aucune' : jours === 0 ? 'aujourd’hui' : 'il y a ' + jours + ' j';
    var pastille = $('.ap-sauve', sum);
    if (!pastille) { pastille = el('span', 'ap-sauve'); sum.appendChild(pastille); }
    pastille.className = 'ap-sauve ap-sauve-' + etat;
    pastille.textContent = txt;
  }

  /* ======================================================================
     4. Visite guidée
     ====================================================================== */
  var ETAPES = [
    { cible: '#apBonjour', titre: 'Ton point de départ', texte: 'Chaque jour, l’Accueil te dit quoi faire : créer, reprendre ou lancer ta séance.' },
    { cible: '#homeChallenge', titre: 'Un défi par jour', texte: 'Il ne te plaît pas ? « Un autre défi ». Tu l’as fait ? Coche-le et tiens ta série 🔥.' },
    { cible: 'nav[aria-label="Navigation principale"] button[onclick="tab(\'seance\')"]', titre: 'Préparer', texte: 'Groupe, durée, envie du jour : une séance complète en trois étapes.' },
    { cible: 'nav[aria-label="Navigation principale"] button[onclick="tab(\'random\')"]', titre: 'Exercice aléatoire', texte: 'Pas le temps de préparer ? Tire un exercice adapté à ton groupe.' },
    { cible: 'nav[aria-label="Navigation principale"] button[onclick="tab(\'live\')"]', titre: 'Régie', texte: 'Pendant la séance : chrono, consignes en grand, tirages au sort.' },
    { cible: '.ap-loupe', titre: 'Tout chercher', texte: 'Un exercice, un principe, un défi : tape un mot, IMPRO LAB trouve.' },
    { cible: 'nav[aria-label="Navigation principale"] .more-navigation > summary', titre: 'Et le reste', texte: 'Bibliothèque, joueurs, historique, spectacle, cahier de coach… et cette visite, à revoir quand tu veux.' }
  ];
  var visite = null;
  function finVisite() {
    if (!visite) return;
    visite.voile.remove(); visite.bulle.remove();
    doc.removeEventListener('keydown', visite.clavier);
    window.removeEventListener('resize', visite.placer);
    var retour = visite.retour; visite = null;
    sur(function () { localStorage.setItem(CLE_VISITE, '1'); });
    if (retour && retour.focus) sur(function () { retour.focus(); });
  }
  function montrerEtape(i) {
    if (!visite) return;
    // Sauter les étapes dont la cible est absente ou cachée.
    while (i < ETAPES.length) {
      var t = $(ETAPES[i].cible);
      if (t && t.getClientRects().length) break;
      i++;
    }
    if (i >= ETAPES.length) { finVisite(); return; }
    visite.i = i;
    var etape = ETAPES[i], cible = $(etape.cible);
    var haute = cible.getBoundingClientRect().height > window.innerHeight * 0.45;
    if (cible.scrollIntoView) cible.scrollIntoView({ block: haute ? 'start' : 'center', behavior: calme ? 'auto' : 'smooth' });
    var b = visite.bulle;
    b.innerHTML = '<p class="ap-visite-num">' + (i + 1) + ' / ' + ETAPES.length + '</p><h3 id="apVisiteTitre">' + esc(etape.titre) + '</h3><p>' + esc(etape.texte) + '</p>' +
      '<div class="ap-visite-actions"><button type="button" class="ap-visite-passer">Passer</button><button type="button" class="btn-primary ap-visite-suivant">' + (i === ETAPES.length - 1 ? 'C’est parti !' : 'Suivant →') + '</button></div>';
    $('.ap-visite-passer', b).onclick = finVisite;
    $('.ap-visite-suivant', b).onclick = function () { montrerEtape(visite.i + 1); };
    visite.cible = cible;
    setTimeout(function () { if (visite) { visite.placer(); var s = $('.ap-visite-suivant', b); if (s) s.focus(); } }, calme ? 0 : 320);
    visite.placer();
  }
  window.apVisite = function () {
    if (visite) return;
    sur(function () { if (typeof tab === 'function' && body.dataset.tab !== 'home') tab('home'); });
    var voile = el('div', 'ap-visite-voile'); voile.setAttribute('aria-hidden', 'true');
    var bulle = el('div', 'ap-visite-bulle'); bulle.setAttribute('role', 'dialog'); bulle.setAttribute('aria-modal', 'true'); bulle.setAttribute('aria-labelledby', 'apVisiteTitre');
    body.appendChild(voile); body.appendChild(bulle);
    visite = { voile: voile, bulle: bulle, i: 0, cible: null, retour: doc.activeElement };
    visite.placer = function () {
      if (!visite || !visite.cible) return;
      var r = visite.cible.getBoundingClientRect(), m = 6;
      voile.style.left = (r.left - m) + 'px'; voile.style.top = (r.top - m) + 'px';
      voile.style.width = (r.width + 2 * m) + 'px'; voile.style.height = (r.height + 2 * m) + 'px';
      var h = bulle.offsetHeight, vh = window.innerHeight, w = Math.min(340, window.innerWidth - 32);
      bulle.style.width = w + 'px';
      bulle.style.left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2)) + 'px';
      var nav = $('nav[aria-label="Navigation principale"]'), basNav = nav ? Math.max(0, vh - nav.getBoundingClientRect().top) : 0;
      var enBas = r.bottom + 14 + h < vh - basNav - 8, enHaut = r.top - h - 14 > 8, top;
      if (enBas) top = r.bottom + 14;
      else if (enHaut) top = r.top - h - 14;
      else top = Math.max(12, vh - basNav - h - 12); // cible très haute : la bulle se pose en bas de l'écran
      bulle.style.top = top + 'px';
      bulle.dataset.cote = enBas ? 'bas' : enHaut ? 'haut' : 'dessus';
    };
    visite.clavier = function (ev) { if (ev.key === 'Escape') finVisite(); };
    doc.addEventListener('keydown', visite.clavier);
    window.addEventListener('resize', visite.placer);
    window.addEventListener('scroll', function suivre() { if (!visite) { window.removeEventListener('scroll', suivre); return; } visite.placer(); }, { passive: true });
    montrerEtape(0);
  };
  // Premier lancement : la visite démarre après l'écran d'entrée (pas pendant les tests automatiques).
  function visiteVue() { var v = null; sur(function () { v = localStorage.getItem(CLE_VISITE); }); return v === '1'; }
  if (typeof window.enterApp === 'function') {
    var enterOrigine = window.enterApp;
    window.enterApp = function () {
      var r = enterOrigine.apply(this, arguments);
      if (!visiteVue() && !navigator.webdriver) setTimeout(function () { if (body.dataset.tab === 'home' || !body.dataset.tab) window.apVisite(); }, 700);
      return r;
    };
  }
  // « Revoir la visite » dans le menu « Plus ».
  sur(function () {
    var menu = $('nav[aria-label="Navigation principale"] .more-navigation-menu'); if (!menu || $('.ap-menu-visite', menu)) return;
    var b = el('button', 'ap-menu-visite'); b.type = 'button';
    b.innerHTML = '<span class="nav-ico" aria-hidden="true">🧭</span>Visite guidée';
    b.addEventListener('click', function () { var d = b.closest('details'); if (d) d.open = false; window.apVisite(); });
    menu.appendChild(b);
  });

  /* ======================================================================
     5. Écrans vides utiles
     ====================================================================== */
  function videHistorique() {
    var out = doc.getElementById('historyResult'); if (!out) return;
    if (out.querySelector('.card') || out.querySelector('.ap-vide')) return;
    if (!/Aucune séance enregistrée/.test(out.textContent)) return;
    out.innerHTML = '<div class="ap-vide"><span aria-hidden="true">📜</span><p><b>Aucune séance enregistrée.</b> Après une séance, « Enregistrer » la range ici avec ton carnet : ce qui a marché, ce qu’il faut changer.</p><button type="button" class="btn-primary" onclick="tab(\'seance\')">🗓 Préparer une séance</button></div>';
  }
  function videJoueurs() {
    // L'aide se place juste après la liste (et non dedans : refonte.js compte les joueurs de #rosterList).
    var list = doc.getElementById('rosterList'); if (!list || !list.parentNode) return;
    var aide = doc.getElementById('apRosterVide');
    if (!aide) {
      aide = el('p', 'ap-vide ap-vide-court'); aide.id = 'apRosterVide';
      aide.innerHTML = '<span aria-hidden="true">👥</span> Personne pour l’instant. Ajoute tes joueurs un par un, ou colle toute une liste d’un coup : les équipes et les tirages de la Régie s’en serviront.';
      list.parentNode.insertBefore(aide, list.nextSibling);
    }
    aide.hidden = list.children.length > 0;
  }
  if (typeof window.renderHistory === 'function') {
    var histOrigine = window.renderHistory;
    window.renderHistory = function () { var r = histOrigine.apply(this, arguments); sur(videHistorique); return r; };
  }
  if (typeof window.rosterRender === 'function') {
    var rosterOrigine = window.rosterRender;
    window.rosterRender = function () { var r = rosterOrigine.apply(this, arguments); sur(videJoueurs); return r; };
  }

  /* ======================================================================
     6. Recherche globale
     ====================================================================== */
  var principes = null;
  function chargerPrincipes() {
    if (principes) return;
    principes = [];
    fetch('principes-impro.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (p && Array.isArray(p.principes)) principes = p.principes.filter(function (x) { return x.statut === 'validé'; });
      var input = $('#apChercheChamp'); if (input && input.value) chercher(input.value);
    }).catch(function () {});
  }
  function ouvrirRecherche() {
    chargerPrincipes();
    var d = doc.getElementById('apCherche');
    if (!d) {
      d = el('div', 'ap-cherche'); d.id = 'apCherche';
      d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Rechercher dans IMPRO LAB');
      d.innerHTML = '<div class="ap-cherche-boite"><div class="ap-cherche-barre"><label for="apChercheChamp" class="ap-invisible">Rechercher</label>' +
        '<input id="apChercheChamp" type="search" autocomplete="off" enterkeyhint="search" placeholder="Un exercice, un principe, un défi…">' +
        '<button type="button" class="ap-cherche-fermer" aria-label="Fermer la recherche">✕</button></div>' +
        '<div id="apChercheRes" class="ap-cherche-res" aria-live="polite"></div></div>';
      body.appendChild(d);
      var champ = $('#apChercheChamp', d);
      champ.addEventListener('input', function () { chercher(champ.value); });
      $('.ap-cherche-fermer', d).onclick = fermerRecherche;
      d.addEventListener('click', function (ev) { if (ev.target === d) fermerRecherche(); });
      d.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fermerRecherche(); });
    }
    d.hidden = false; body.classList.add('ap-cherche-ouverte');
    var c = $('#apChercheChamp', d); c.value = ''; chercher('');
    setTimeout(function () { c.focus(); }, 30);
  }
  function fermerRecherche() {
    var d = doc.getElementById('apCherche'); if (d) d.hidden = true;
    body.classList.remove('ap-cherche-ouverte');
    var l = $('.ap-loupe'); if (l) l.focus();
  }
  window.apRecherche = ouvrirRecherche;

  function correspond(mots, texte) { var t = sans(texte); return mots.every(function (m) { return t.indexOf(m) >= 0; }); }
  function chercher(q) {
    var out = doc.getElementById('apChercheRes'); if (!out) return;
    var mots = sans(q).split(/\s+/).filter(function (m) { return m.length > 1; });
    if (!mots.length) {
      out.innerHTML = '<p class="ap-cherche-aide">Essaie : <button type="button" class="ap-lien" data-q="écoute">écoute</button>, <button type="button" class="ap-lien" data-q="statut">statut</button>, <button type="button" class="ap-lien" data-q="échauffement">échauffement</button>, <button type="button" class="ap-lien" data-q="émotion">émotion</button>.</p>';
      $$('[data-q]', out).forEach(function (b) { b.onclick = function () { var c = $('#apChercheChamp'); c.value = b.dataset.q; chercher(b.dataset.q); c.focus(); }; });
      return;
    }
    var groupes = [];
    // Exercices (titre d'abord, puis catégorie et description).
    var jeux = (typeof data !== 'undefined' && Array.isArray(data)) ? data : [];
    var ex = jeux.filter(function (g) { return correspond(mots, (g[0] || '') + ' ' + (g[1] || '') + ' ' + (g[2] || '')); })
      .sort(function (a, b) { return (correspond(mots, b[0]) ? 1 : 0) - (correspond(mots, a[0]) ? 1 : 0); }).slice(0, 8);
    if (ex.length) groupes.push({ nom: '📚 Exercices', items: ex.map(function (g) { return { titre: typeof displayTitle === 'function' ? displayTitle(g[0]) : g[0], sous: g[1] || '', action: function () { allerExercice(g[0]); }, titreFiche: g[0] }; }) });
    var pr = (principes || []).filter(function (p) { return correspond(mots, (p.titre || '') + ' ' + (p.formulation_originale || '') + ' ' + (p.principe || '')); }).slice(0, 5);
    if (pr.length) groupes.push({ nom: '🧭 Principes', items: pr.map(function (p) { return { titre: p.titre, sous: 'Principe', action: function () { allerPrincipe(p.titre); } }; }) });
    var conseils = (typeof IMPRO_ADVICE !== 'undefined' && Array.isArray(IMPRO_ADVICE)) ? IMPRO_ADVICE : [];
    var co = conseils.filter(function (a) { return correspond(mots, (a.title || '') + ' ' + (a.body || '')); }).slice(0, 5);
    if (co.length) groupes.push({ nom: '💡 Conseils', items: co.map(function (a) { return { titre: a.title, sous: a.level || 'Conseil', action: function () { allerPrincipe(a.title); } }; }) });
    var e = lireEtat();
    var df = tousLesDefis(e).filter(function (d) { return correspond(mots, d.titre + ' ' + d.texte); })
      .sort(function (a, b) { return (correspond(mots, b.titre) ? 1 : 0) - (correspond(mots, a.titre) ? 1 : 0); }).slice(0, 5);
    if (df.length) groupes.push({ nom: '🎯 Défis', items: df.map(function (d) { return { titre: d.titre, sous: (FAMILLES[d.famille] || {}).nom || 'Défi', action: function () { var s = lireEtat(); s.jour = jourLocal(); s.choix = d.titre; ecrireEtat(s); fermerRecherche(); tab('home'); rendreDefi(true); var b = doc.getElementById('homeChallenge'); if (b) b.scrollIntoView({ block: 'center' }); } }; }) });
    if (!groupes.length) { out.innerHTML = '<p class="ap-cherche-aide">Rien trouvé pour « ' + esc(q.trim()) + ' ». Essaie un mot plus court.</p>'; return; }
    out.innerHTML = '<p id="apChercheAjout" class="ap-cherche-msg" aria-live="polite"></p>';
    groupes.forEach(function (g) {
      var sec = el('section', 'ap-cherche-groupe'); sec.appendChild(el('h3', '', g.nom));
      var ul = el('ul');
      g.items.forEach(function (it) {
        var li = el('li'), b = el('button', 'ap-cherche-item'); b.type = 'button';
        b.appendChild(el('b', '', it.titre)); if (it.sous) b.appendChild(el('small', '', it.sous));
        b.onclick = it.action; li.appendChild(b);
        // D45 : ajouter l'exercice à la séance en cours sans quitter la recherche.
        if (it.titreFiche && typeof window.sessionAddByTitle === 'function') {
          li.className = 'ap-cherche-ligne';
          var deja = typeof window.sessionHasGame === 'function' && window.sessionHasGame(jeux.filter(function (g) { return g[0] === it.titreFiche; })[0]);
          var a = el('button', 'ap-cherche-ajout', deja ? '✓ Séance' : '＋ Séance'); a.type = 'button';
          a.setAttribute('aria-label', (deja ? 'Déjà dans la séance : ' : 'Ajouter à la séance : ') + it.titre); a.disabled = !!deja;
          a.onclick = function () {
            var r = window.sessionAddByTitle(it.titreFiche);
            var st = doc.getElementById('apChercheAjout'); if (st) st.textContent = r.msg;
            if (r.ok) { a.disabled = true; a.textContent = '✓ Séance'; a.setAttribute('aria-label', 'Déjà dans la séance : ' + it.titre); }
          };
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      sec.appendChild(ul); out.appendChild(sec);
    });
  }
  function allerExercice(titre) {
    fermerRecherche();
    tab('jeux');
    var s = doc.getElementById('search');
    if (s) { s.value = titre; s.dispatchEvent(new Event('input', { bubbles: true })); }
    setTimeout(function () { var c = $('#games .card'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'start', behavior: calme ? 'auto' : 'smooth' }); }, 80);
  }
  function allerPrincipe(titre) {
    fermerRecherche();
    tab('principes');
    var s = doc.getElementById('principesSearch');
    if (s) { s.value = titre; s.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  // Loupe dans l'en-tête.
  sur(function () {
    var h = $('body > header'); if (!h || $('.ap-loupe', h)) return;
    var b = el('button', 'ap-loupe'); b.type = 'button'; b.setAttribute('aria-label', 'Rechercher dans IMPRO LAB');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
    b.addEventListener('click', ouvrirRecherche);
    h.appendChild(b);
  });

  /* ======================================================================
     7. Branchements : l'Accueil se met à jour à chaque passage
     ====================================================================== */
  if (typeof window.homeRender === 'function') {
    var homeOrigine = window.homeRender;
    window.homeRender = function () { var r = homeOrigine.apply(this, arguments); sur(rendreBonjour); sur(rendreSauvegarde); return r; };
  }
  if (typeof window.backupReminderRender === 'function') {
    var sauveOrigine = window.backupReminderRender;
    window.backupReminderRender = function () { var r = sauveOrigine.apply(this, arguments); sur(rendreSauvegarde); return r; };
  }
  // Retour léger au toucher sur les boutons principaux (Android ; iPhone ignore la vibration).
  doc.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('button.btn-primary'); if (b) vibre(8); }, true);

  sur(rendreBonjour);
  sur(function () { rendreDefi(false); });
  sur(rendreSauvegarde);
  sur(videJoueurs);
})();
