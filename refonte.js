/* IMPRO LAB : refonte « écrans légers » (D36, 13 novembre 2026), allégée le 18 novembre (D40) :
   la barre du bas, l'en-tête réduit, les fiches courtes de la Bibliothèque, le défi du jour et le tirage de
   l'Accueil sont maintenant dans index.html et styles.css (D37 à D39).
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
      return r;
    };
  }
  body.dataset.tab = ongletVisible();

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
    }
    conteneur.addEventListener('click', basculer);
    conteneur.addEventListener('keydown', basculer);
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
