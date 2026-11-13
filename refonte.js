/* IMPRO LAB : refonte « écrans légers » (D36, 13 novembre 2026).
   Ce fichier ne touche ni aux données ni au générateur de séance : il range
   l'affichage (en-tête compact, barre en bas, replis) et ajoute un peu de vie.
   Écrit en clair, non minifié, pour rester lisible et facile à retirer. */
(function () {
  'use strict';
  var doc = document, body = doc.body;
  var calme = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function sur(fn) { try { return fn(); } catch (e) { console.warn('refonte.js', e); } }

  /* ---------- Onglet courant : sert à l'en-tête compact et à l'entrée des pages ---------- */
  var tabOrigine = window.tab;
  function ongletVisible() { var s = $$('main > section, body > section').filter(function (x) { return !x.hidden; })[0]; return s ? s.id : 'home'; }
  if (typeof tabOrigine === 'function') {
    window.tab = function (id) {
      var avant = body.dataset.tab;
      var r = tabOrigine.apply(this, arguments);
      body.dataset.tab = id;
      if (avant !== id) {
        var s = doc.getElementById(id);
        if (s && !calme) { s.classList.remove('rf-arrive'); void s.offsetWidth; s.classList.add('rf-arrive'); }
        window.scrollTo(0, 0);
      }
      if (id === 'groupes' && avant !== id) sur(function () { majAjoutJoueurs(); });
      majToutReplier();
      return r;
    };
  }
  body.dataset.tab = ongletVisible();

  /* ---------- Bouton « Tout replier » dans l'en-tête ---------- */
  var boutonReplier = el('button', 'rf-fold-all', 'Tout replier');
  boutonReplier.type = 'button'; boutonReplier.hidden = true;
  function ouverts() {
    var s = doc.getElementById(body.dataset.tab); if (!s) return [];
    return $$('details[open]', s).concat($$('.rf-open', s));
  }
  function majToutReplier() { boutonReplier.hidden = ouverts().length === 0; }
  boutonReplier.addEventListener('click', function () {
    ouverts().forEach(function (n) { if (n.tagName === 'DETAILS') n.open = false; else fermer(n); });
    cartesOuvertes.clear();
    majToutReplier(); window.scrollTo(0, 0);
  });
  sur(function () { $('body > header').appendChild(boutonReplier); });
  doc.addEventListener('toggle', function () { majToutReplier(); }, true);

  /* ---------- Cartes repliables (Bibliothèque, Cahier de coach) ---------- */
  function ouvrir(carte) { carte.classList.add('rf-open'); var t = carte.firstElementChild; if (t) t.setAttribute('aria-expanded', 'true'); }
  function fermer(carte) { carte.classList.remove('rf-open'); var t = carte.firstElementChild; if (t) t.setAttribute('aria-expanded', 'false'); }
  function preparerTitre(t) { t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0'); t.setAttribute('aria-expanded', 'false'); }
  function brancher(conteneur, selCarte, selTitre, auChangement) {
    function basculer(ev) {
      var titre = ev.target.closest && ev.target.closest(selTitre); if (!titre || !conteneur.contains(titre)) return;
      if (ev.type === 'keydown') { if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); }
      var carte = titre.closest(selCarte); if (!carte) return;
      if (carte.classList.contains('rf-open')) fermer(carte); else ouvrir(carte);
      if (auChangement) auChangement(carte);
      majToutReplier();
    }
    conteneur.addEventListener('click', basculer);
    conteneur.addEventListener('keydown', basculer);
  }

  // Bibliothèque : 103 fiches ouvertes faisaient 130 écrans de haut. Une ligne par jeu.
  var cartesOuvertes = new Set();
  var jeux = doc.getElementById('games');
  var boutonBiblio;
  function majBoutonBiblio() {
    if (!boutonBiblio) return;
    var cartes = $$('.card', jeux), toutes = cartes.length && cartes.every(function (c) { return c.classList.contains('rf-open'); });
    boutonBiblio.textContent = toutes ? 'Tout replier' : 'Tout déplier';
    boutonBiblio.parentNode.hidden = cartes.length < 2;
  }
  function rangerBiblio() {
    var cartes = $$('.card', jeux);
    cartes.forEach(function (c) {
      var t = $('.exercise-title', c); if (!t) return;
      preparerTitre(t);
      if (cartes.length <= 3 || cartesOuvertes.has(t.textContent)) ouvrir(c);
    });
    majBoutonBiblio(); majToutReplier();
  }
  if (jeux) {
    var outils = el('div', 'rf-library-tools'); boutonBiblio = el('button', '', 'Tout déplier'); boutonBiblio.type = 'button';
    outils.appendChild(boutonBiblio); jeux.parentNode.insertBefore(outils, jeux);
    boutonBiblio.addEventListener('click', function () {
      var cartes = $$('.card', jeux), toutes = cartes.every(function (c) { return c.classList.contains('rf-open'); });
      cartesOuvertes.clear();
      cartes.forEach(function (c) { if (toutes) fermer(c); else { ouvrir(c); cartesOuvertes.add($('.exercise-title', c).textContent); } });
      majBoutonBiblio(); majToutReplier();
    });
    brancher(jeux, '.card', '.exercise-title', function (carte) {
      var nom = $('.exercise-title', carte).textContent;
      if (carte.classList.contains('rf-open')) cartesOuvertes.add(nom); else cartesOuvertes.delete(nom);
      majBoutonBiblio();
    });
    new MutationObserver(rangerBiblio).observe(jeux, { childList: true });
    rangerBiblio();
  }

  // Cahier de coach : chaque liste se déplie au toucher.
  var cahier = doc.getElementById('coachResourceContent');
  if (cahier) {
    brancher(cahier, '.coach-list-card', '.coach-list-heading');
    var rangerCahier = function () { $$('.coach-list-card > .coach-list-heading', cahier).forEach(preparerTitre); };
    new MutationObserver(rangerCahier).observe(cahier, { childList: true, subtree: true });
    rangerCahier();
  }

  /* ---------- Préparer : actions masquées tant que la séance est vide, aide sur demande ---------- */
  var plan = doc.getElementById('plan');
  function majPlan() {
    var n = sur(function () { return typeof planCards === 'function' ? planCards().length : $$('.card', plan).length; }) || 0;
    body.classList.toggle('rf-plan-vide', n === 0);
  }
  if (plan) { new MutationObserver(majPlan).observe(plan, { childList: true }); majPlan(); }
  // Le texte d'introduction de chaque page passe derrière un bouton « ? ».
  $$('body > section, main > section').forEach(function (page) {
    sur(function () {
      var h2 = $(':scope > h2', page); if (!h2) return;
      var suivant = h2.nextElementSibling;
      if (page.id !== 'seance' && !(suivant && suivant.matches('p.muted'))) return;
      var aide = el('button', 'rf-aide', '?'); aide.type = 'button';
      aide.setAttribute('aria-label', 'Afficher ou cacher l’aide de cette page'); aide.setAttribute('aria-expanded', 'false');
      aide.addEventListener('click', function () { aide.setAttribute('aria-expanded', String(page.classList.toggle('rf-aide-ouverte'))); });
      h2.appendChild(aide);
    });
  });

  /* ---------- Exercice aléatoire : les six curseurs repliés, le bouton de tirage remonte ---------- */
  sur(function () { var mood = doc.getElementById('randomSettingsFold'); if (mood) mood.open = false; });

  /* ---------- Groupes : l'ajout de joueurs se replie dès que l'effectif existe ---------- */
  var ajoutJoueurs;
  sur(function () {
    var carte = $('#groupes > .card'), liste = doc.getElementById('rosterList'); if (!carte || !liste) return;
    var champ = $$(':scope > label', carte).filter(function (l) { return $('textarea', l); })[0]; if (!champ) return;
    var bouton = champ.nextElementSibling; if (!bouton || bouton.tagName !== 'BUTTON') return;
    ajoutJoueurs = el('details', 'rf-ajout-joueurs'); ajoutJoueurs.appendChild(el('summary', '', '＋ Ajouter des joueurs'));
    carte.insertBefore(ajoutJoueurs, champ); ajoutJoueurs.appendChild(champ); ajoutJoueurs.appendChild(bouton);
    ajoutJoueurs.open = true;
  });
  function majAjoutJoueurs() { // à l'arrivée sur l'onglet : ouvert si l'effectif est vide, replié sinon
    var liste = doc.getElementById('rosterList'); if (ajoutJoueurs && liste) ajoutJoueurs.open = liste.children.length === 0;
  }

  /* ---------- Accueil : le défi du jour, tiré de tes propres listes ---------- */
  function hasard(graine) { // petit générateur reproductible : même défi toute la journée
    var a = graine >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function tirerDefi(graine) {
    var listes = sur(function () { return drawLists; }) || {};
    var alea = hasard(graine), d = {};
    ['Lieu', 'Personnage', 'Émotion', 'Contrainte'].forEach(function (k) {
      var l = Array.isArray(listes[k]) ? listes[k] : []; if (l.length) d[k] = l[Math.floor(alea() * l.length)];
    });
    return d;
  }
  sur(function () {
    var actions = $('#home .home-actions'); if (!actions) return;
    var bloc = el('details', 'rf-defi'), resume = el('summary', '', '🎭 Défi du jour'), carte = el('div', 'rf-defi-carte');
    bloc.id = 'rfDefi'; bloc.appendChild(resume); bloc.appendChild(carte);
    var jour = new Date(), graine = jour.getFullYear() * 10000 + (jour.getMonth() + 1) * 100 + jour.getDate(), tour = 0;
    function afficher() {
      var d = tirerDefi(graine + tour * 7919), cles = Object.keys(d);
      carte.replaceChildren();
      if (!cles.length) { carte.appendChild(el('small', '', 'Tes listes de tirage sont vides pour l’instant.')); return; }
      cles.forEach(function (k) { var p = el('p'); var b = el('small', '', k); p.appendChild(b); p.appendChild(doc.createTextNode(d[k])); carte.appendChild(p); });
      carte.appendChild(el('small', '', 'Tiré de tes listes de tirage. Le même pour toute la journée, sauf si tu en redemandes un.'));
      var autre = el('button', '', '🎲 Un autre défi'); autre.type = 'button';
      autre.addEventListener('click', function () { tour++; afficher(); carte.style.animation = 'none'; void carte.offsetWidth; carte.style.animation = ''; });
      carte.appendChild(autre);
    }
    bloc.addEventListener('toggle', function () { if (bloc.open) afficher(); });
    actions.parentNode.insertBefore(bloc, actions.nextSibling);
  });

  /* ---------- Un peu de vie : masque, confettis, petit mot ---------- */
  var COULEURS = ['#ffd21f', '#ff526e', '#d52cff', '#138bff', '#39f5c8', '#8f2433'];
  function scene(duree) {
    var s = el('div', 'rf-scene'); s.setAttribute('aria-hidden', 'true'); body.appendChild(s);
    setTimeout(function () { s.remove(); }, duree); return s;
  }
  function eclats(s, combien, retard) {
    for (var i = 0; i < combien; i++) {
      var e = el('i', 'rf-eclat' + (i % 3 === 0 ? ' rf-rond' : '')), angle = Math.random() * Math.PI * 2, loin = 90 + Math.random() * 260;
      e.style.setProperty('--x', Math.cos(angle) * loin + 'px');
      e.style.setProperty('--y', (Math.sin(angle) * loin + 60) + 'px');
      e.style.setProperty('--a', (Math.random() * 720 - 360) + 'deg');
      e.style.setProperty('--c', COULEURS[i % COULEURS.length]);
      e.style.setProperty('--t', (7 + Math.random() * 9) + 'px');
      e.style.setProperty('--d', (0.6 + Math.random() * 0.5) + 's');
      e.style.setProperty('--r', (retard + Math.random() * 0.08) + 's');
      s.appendChild(e);
    }
  }
  // Le masque arrive, tremble, puis éclate en deux : deux secondes en tout.
  function masqueQuiEclate() {
    if (calme) return;
    var s = scene(2100), m = el('div', 'rf-masque');
    m.appendChild(el('div', 'rf-gauche')); m.appendChild(el('div', 'rf-droite'));
    s.appendChild(m); eclats(s, 34, 1.3);
  }
  function confettis() { if (calme) return; eclats(scene(1500), 40, 0); }
  function pluieDeMasques() {
    if (calme) return;
    var s = scene(3600);
    for (var i = 0; i < 16; i++) {
      var p = el('i', 'rf-pluie');
      p.style.setProperty('--l', (Math.random() * 92) + 'vw'); p.style.setProperty('--t', (24 + Math.random() * 30) + 'px');
      p.style.setProperty('--d', (1.8 + Math.random() * 1.4) + 's'); p.style.setProperty('--r', (Math.random() * 0.9) + 's');
      p.style.setProperty('--a', (Math.random() * 500 - 250) + 'deg'); s.appendChild(p);
    }
  }
  function petitMot(texte) {
    $$('.rf-mot').forEach(function (n) { n.remove(); });
    var m = el('div', 'rf-mot', texte); m.setAttribute('role', 'status'); body.appendChild(m);
    setTimeout(function () { m.remove(); }, 3700);
  }

  // À l'ouverture : après « Entrer dans IMPRO LAB », ou tout de suite si l'accueil a déjà été vu.
  var entrerOrigine = window.enterApp;
  if (typeof entrerOrigine === 'function') {
    window.enterApp = function () { var la = !!doc.getElementById('welcomeScreen'); var r = entrerOrigine.apply(this, arguments); if (la) masqueQuiEclate(); return r; };
  }
  if (!doc.getElementById('welcomeScreen')) masqueQuiEclate();

  // Chrono de la Régie à zéro : confettis, et le chrono bat quatre fois.
  sur(function () {
    var chrono = doc.getElementById('liveClock'); if (!chrono) return;
    var avant = chrono.textContent;
    new MutationObserver(function () {
      var maintenant = chrono.textContent;
      var tourne = sur(function () { return liveRunning; });
      var decompte = (doc.getElementById('liveClockMode') || {}).value === 'down';
      if (maintenant === '00:00' && avant !== '00:00' && tourne && decompte) {
        confettis(); chrono.classList.remove('rf-zero'); void chrono.offsetWidth; chrono.classList.add('rf-zero');
      }
      avant = maintenant;
    }).observe(chrono, { childList: true, characterData: true, subtree: true });
  });

  // Logo touché cinq fois de suite : pluie de masques et une de tes citations.
  sur(function () {
    var logo = $('body > header .header-logo'); if (!logo) return;
    var coups = 0, minuterie;
    logo.addEventListener('click', function () {
      coups++; clearTimeout(minuterie); minuterie = setTimeout(function () { coups = 0; }, 1600);
      if (coups < 5) return; coups = 0;
      var citations = $$('body > header blockquote').map(function (b) { return b.textContent.trim(); }).filter(Boolean);
      pluieDeMasques();
      if (citations.length) petitMot('« ' + citations[Math.floor(Math.random() * citations.length)].replace(/^«\s*|\s*»$/g, '') + ' »');
    });
  });

  // Le rideau s'ouvre à l'entrée en plein écran (séance ou Régie).
  sur(function () {
    var etait = false;
    new MutationObserver(function () {
      var plein = body.classList.contains('stage-open') || body.classList.contains('regie-full');
      if (plein && !etait && !calme) { var s = scene(1100); s.appendChild(el('div', 'rf-rideau rf-g')); s.appendChild(el('div', 'rf-rideau rf-d')); }
      etait = plein;
    }).observe(body, { attributes: true, attributeFilter: ['class'] });
  });

  // Tirage de l'Accueil : les titres défilent une demi-seconde avant de s'arrêter sur le bon.
  // Le vrai titre est déjà en place dessous ; seul l'habillage défile.
  var tirageOrigine = window.quickDraw;
  if (typeof tirageOrigine === 'function') {
    window.quickDraw = function () {
      var r = tirageOrigine.apply(this, arguments);
      sur(function () {
        var h4 = $('#homeQuickResult h4'); if (!h4 || calme) return;
        var titres = sur(function () { return data.map(function (g) { return displayTitle(g[0]); }); }) || []; if (titres.length < 5) return;
        var rouleau = el('span', 'rf-rouleau'); rouleau.setAttribute('aria-hidden', 'true');
        h4.classList.add('rf-roule'); h4.appendChild(rouleau);
        var tic = setInterval(function () { rouleau.textContent = titres[Math.floor(Math.random() * titres.length)]; }, 70);
        setTimeout(function () { clearInterval(tic); rouleau.remove(); h4.classList.remove('rf-roule'); h4.style.animation = 'none'; void h4.offsetWidth; h4.style.animation = ''; }, 560);
      });
      return r;
    };
  }

  // Séance enregistrée : un coup de tampon.
  var enregistrerOrigine = window.saveSession;
  if (typeof enregistrerOrigine === 'function') {
    window.saveSession = function () {
      var n = sur(function () { return planCards().length; }) || 0;
      var r = enregistrerOrigine.apply(this, arguments);
      if (n > 0 && !calme) scene(1500).appendChild(el('div', 'rf-tampon', 'Séance enregistrée'));
      return r;
    };
  }

  window.improLabRefonte = { masque: masqueQuiEclate, confettis: confettis, pluie: pluieDeMasques };
})();
