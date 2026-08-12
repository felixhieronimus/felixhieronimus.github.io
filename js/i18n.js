// ==============================================================================
// I18N — Switch de langue FR / EN, sans rechargement, avec fade
// ==============================================================================
// Utilisation dans le HTML :
//   <p data-i18n="nav.contact">Contact</p>
//   <a data-i18n-toggle-lang href="#">EN</a>   <-- bouton qui affiche la langue CIBLE
//
// Le texte présent dans le HTML sert de fallback FR si la clé est absente du
// dictionnaire ci-dessous.
// ==============================================================================

(function () {

  const STORAGE_KEY = "site-lang";
  const FADE_MS = 260;

  // ----------------------------------------------------------------------------
  // Dictionnaire — mots/blocs communs à tout le site + textes propres à chaque page
  // ----------------------------------------------------------------------------
  const dict = {

    // --- Navigation (header + menu mobile), présent sur toutes les pages ---
    "nav.projects":     { fr: "Projets",            en: "Projects" },
    "nav.about":         { fr: "à propos",           en: "About" },
    "nav.about.close":   { fr: "Fermer",              en: "Close" },
    "nav.contact":       { fr: "Contact",             en: "Contact" },
    "nav.lab":           { fr: "Lab",                 en: "Lab" },
    "nav.menu":          { fr: "Menu",                en: "Menu" },
    "gallery.slide":     { fr: "Slide",               en: "Slide" },
    "gallery.list":      { fr: "Liste",               en: "List" },
    "gallery.grid":      { fr: "Grid mode",           en: "Grid mode" },

    // --- Footer, présent sur toutes les pages ---
    "footer.clients":    { fr: "Clients",             en: "Clients" },
    "footer.awwwards":   { fr: "Awwwards",            en: "Awwwards" },
    "footer.social":     { fr: "Réseaux Sociaux",     en: "Social Media" },
    "footer.contact":    { fr: "Contact",             en: "Contact" },
    "footer.form":       { fr: "Formulaire",          en: "Contact form" },
    "footer.legal":      { fr: "mentions légales",   en: "legal notice" },
    "footer.privacy":    { fr: "Confidentialité",    en: "Privacy" },
    "footer.jury":       { fr: "Awwwards young jury 2021-2024", en: "Awwwards Young Jury 2021–2024" },
    "footer.honors":     { fr: "5 honors",            en: "5 honors" },
    "footer.mobileexc":  { fr: "2 mobile EXCELLENCE", en: "2 mobile Excellence" },

    // --- Bloc projet (pages détail) ---
    "project.viewsite":  { fr: "Voir le site",        en: "View website" },
    "project.credits":   { fr: "crédits",             en: "credits" },
    "project.client":    { fr: "Client",              en: "Client" },
    "project.with":      { fr: "Avec",                en: "With" },
    "project.date":      { fr: "Date",                en: "Date" },
    "project.expertise": { fr: "Expertises",          en: "Expertise" },
    "project.next":      { fr: "Projet suivant",      en: "Next project" },

    // --- Descriptions de projet (une clé dédiée par projet : le texte FR
    //     de chaque page est désormais différent, donc plus question de
    //     partager "desc.lorem" comme avant) ---
    "desc.arizonalove": {
      fr: "Le projet consistait à refondre intégralement son univers digital et son site marchand. L'enjeu principal était d'imaginer une expérience e-commerce solaire, intuitive et sensorielle, capable d'incarner fidèlement l'esprit libre, audacieux et désirable de l'enseigne.",
      en: "The project involved a complete overhaul of the brand's digital universe and online store. The main challenge was to design a sun-drenched, intuitive and sensory e-commerce experience, capable of faithfully embodying the free-spirited, bold and desirable spirit of the brand."
    },
    "desc.elma": {
      fr: "Réalisé dans le cadre d'un projet d'école de fin d'études pour le collectif de designers Hall Haus, ce travail visait à démocratiser le design d'auteur auprès des jeunes actifs nomades. L'objectif était de concevoir le système de mobilier modulaire ELMA ainsi que l'intégralité de son univers visuel, afin de désacraliser l'objet et de proposer une alternative éco conçue à la fast furniture.",
      en: "Created as a final-year school project for the design collective Hall Haus, this work aimed to make designer furniture more accessible to young, nomadic professionals. The goal was to design the ELMA modular furniture system along with its entire visual identity, demystifying the object and offering an eco-conscious alternative to fast furniture."
    },
    "desc.ilebleue": {
      fr: "Enseigne bordelaise d'objets et de textiles artisanaux, nous a contactés pour moderniser son image vieillissante. L'enjeu principal était de repenser l'ensemble de sa communication visuelle et de la décliner de manière harmonieuse sur tous ses supports, du print au e-commerce.",
      en: "A Bordeaux-based brand of handcrafted objects and textiles reached out to us to modernise its ageing image. The main challenge was to rethink its entire visual communication and apply it harmoniously across all its media, from print to e-commerce."
    },
    "desc.joie": {
      fr: "Joie, bureau de création, spécialisée dans la création de marques, d'emballages, de campagnes de communication, et bien plus encore. J'ai travaillé en étroite collaboration avec l'équipe de l'agence pour la réalisation d'un site web reflétant leurs dynamismes et leurs créativités.",
      en: "Joie is a creative studio specialising in brand creation, packaging design, communication campaigns and much more. I worked closely with the agency's team to design a website reflecting their dynamism and creativity."
    },
    "desc.paul": {
      fr: "La mission était de créer le nouveau site web de Paul Peinture, qui souhaitait un site vivant correspondant pleinement à son état d'esprit et à ses valeurs. Le résultat est un site web coloré et dynamique, qui présente de manière claire et attrayante ses différents services.",
      en: "The mission was to create Paul Peinture's new website, as they wanted a lively site that fully matched their spirit and values. The result is a colourful, dynamic website that presents their range of services in a clear and appealing way."
    },
    "desc.rt20": {
      fr: "Dans le cadre d'un projet, nous avons pour mission d'analyser et de recréer l'identité visuelle fictive d'un objet de design, tout en tenant compte de son contexte historique, artistique et graphique. Ce travail inclut une étude approfondie du visuel, du style, des créateurs, ainsi que des choix typographiques et colorimétriques.",
      en: "As part of a project, the brief was to analyse and recreate the fictional visual identity of a design object, taking into account its historical, artistic and graphic context. This work includes an in-depth study of the visuals, style and creators involved, as well as the typographic and colour choices."
    },
    "desc.sophie": {
      fr: "En collaboration avec Bureau Joie, nous avons identifié les besoins de Sophie pour développer un site web à la hauteur de ses attentes. Le résultat est un site épuré et accessible, conçu pour valoriser ses photographies et offrir une expérience utilisateur optimale.",
      en: "In collaboration with Bureau Joie, we identified Sophie's needs to develop a website that lived up to her expectations. The result is a clean, accessible site designed to showcase her photography and offer an optimal user experience."
    },

    // --- Expertises par projet (format harmonisé : Titre Case, séparateur
    //     " / ", "UI/UX" toujours en un seul bloc) ---
    "expertise.webdesign":       { fr: "Webdesign / UI/UX",                          en: "Web design / UI/UX" },
    "expertise.ilebleue":        { fr: "Webdesign / UI/UX / Packaging / DA",         en: "Web design / UI/UX / Packaging / Art direction" },
    "expertise.objet3d":         { fr: "Identité / DA Print & Web / Objet",          en: "Branding / Art direction Print & Web / Product" },
    "expertise.rt20":            { fr: "DA / Identité / RS / Webdesign",             en: "Art direction / Branding / Social media / Web design" },
    "expertise.joie":            { fr: "Web development / Webdesign / UI/UX",        en: "Web development / Web design / UI/UX" },
    "expertise.paul":            { fr: "Web development / Webdesign / UI/UX",        en: "Web development / Web design / UI/UX" },
    "expertise.sophie":          { fr: "Web development / Webdesign / UI/UX",        en: "Web development / Web design / UI/UX" },

    // --- Modale "à propos" (générée en JS) ---
    "about.bio.label":      { fr: "Bio",              en: "Bio" },
    "about.bio.text": {
      fr: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.",
      en: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip."
    },
    "about.clients.label":  { fr: "Selected Clients", en: "Selected Clients" },
    "about.awwwards.label": { fr: "Awwwards",         en: "Awwwards" },
    "about.contact.label":  { fr: "Contact",          en: "Contact" },
  };

  // ----------------------------------------------------------------------------
  // Etat / helpers
  // ----------------------------------------------------------------------------
  function getLang() {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute("lang", lang);
  }

  function t(key, lang) {
    const entry = dict[key];
    if (!entry) return null;
    return entry[lang] || entry.fr;
  }

  // Reconstruit un élément .rolling-text (lettres découpées en spans) sans
  // toucher aux listeners mouseover/mouseout déjà attachés à l'élément.
  function setRollingText(element, text) {
    element.innerHTML = "";

    const buildBlock = (extraClass) => {
      const block = document.createElement("div");
      block.classList.add("block");
      if (extraClass) block.classList.add(extraClass);
      for (const letter of text) {
        const span = document.createElement("span");
        span.innerText = letter.trim() === "" ? "\xa0" : letter;
        span.classList.add("letter");
        block.appendChild(span);
      }
      return block;
    };

    element.appendChild(buildBlock());
    element.appendChild(buildBlock("cloned-text"));
  }

  function setElementText(el, text) {
    if (el.classList.contains("rolling-text")) {
      setRollingText(el, text);
    } else {
      el.textContent = text;
      // .dynamicText (la longue description projet) est ré-emballée mot par
      // mot en <span> par adjustTextOpacity() dans script.js, avec un flag
      // dataset.initialized qui l'empêche de repasser dessus. Comme on vient
      // d'écraser ces <span> avec du texte brut, il faut retirer le flag pour
      // que le prochain appel à adjustTextOpacity() (déclenché juste après
      // par switchLang) reconstruise l'effet sur le nouveau texte au lieu de
      // laisser le paragraphe sans animation ni style.
      if (el.classList.contains("dynamicText")) {
        delete el.dataset.initialized;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Traduction d'un sous-arbre du DOM
  // fade:true  -> utilisé lors d'un clic utilisateur (transition visible)
  // fade:false -> utilisé au chargement / après une transition barba (pas de flash)
  // ----------------------------------------------------------------------------
  function translate(lang, root, opts) {
    root = root || document;
    const fade = !!(opts && opts.fade);
    const els = Array.from(root.querySelectorAll("[data-i18n]"));
    if (els.length === 0) return;

    const apply = () => {
      els.forEach((el) => {
        const value = t(el.getAttribute("data-i18n"), lang);
        if (value == null) return;
        setElementText(el, value);
        if (fade) el.style.opacity = "1";
      });
    };

    if (!fade) {
      apply();
      return;
    }

    els.forEach((el) => {
      el.style.transition = `opacity ${FADE_MS}ms ease`;
      el.style.opacity = "0";
    });
    setTimeout(apply, FADE_MS);
  }

  function updateToggleButtons(lang) {
    const target = lang === "fr" ? "en" : "fr";
    const label = target === "en" ? "EN" : "FR";
    document.querySelectorAll("[data-i18n-toggle-lang]").forEach((btn) => {
      setElementText(btn, label);
    });
  }

  function switchLang() {
    const next = getLang() === "fr" ? "en" : "fr";
    setLang(next);
    translate(next, document, { fade: true });
    updateToggleButtons(next);
    // Éléments contrôlés dynamiquement par script.js (pas de simple data-i18n)
    if (typeof window.refreshGridButtonLabel === "function") window.refreshGridButtonLabel();
    // translate({fade:true}) remplace le texte après FADE_MS (le temps du
    // fondu) : on attend ce même délai avant de relancer adjustTextOpacity(),
    // qui réemballe .dynamicText en mots <span> et réattache l'effet de
    // révélation au scroll sur le texte fraîchement traduit.
    if (typeof window.adjustTextOpacity === "function") {
      setTimeout(() => window.adjustTextOpacity(), FADE_MS);
    }
  }

  function init() {
    const lang = getLang();
    document.documentElement.setAttribute("lang", lang);
    translate(lang, document, { fade: false });
    updateToggleButtons(lang);

    // Délégation d'événement : couvre le bouton desktop + mobile, et survit
    // aux transitions Barba (le header n'est jamais retiré du DOM).
    if (!window.__langToggleBound) {
      window.__langToggleBound = true;
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-i18n-toggle-lang]");
        if (!btn) return;
        e.preventDefault();
        switchLang();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  // API exposée pour js/script.js (modale "à propos", hooks Barba, etc.)
  window.i18n = { getLang, setLang, t, translate, setRollingText, updateToggleButtons };

})();
