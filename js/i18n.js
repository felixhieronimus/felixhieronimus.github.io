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

    // --- Descriptions de projet ---
    "desc.lorem": {
      fr: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore",
      en: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore"
    },
    "desc.joie": {
      fr: "Bureau Joie, une nouvelle agence de communication, spécialisée dans la création de marques, d'emballages, de campagnes de communication, et bien plus encore. J'ai travaillé en étroite collaboration avec l'équipe de l'agence pour comprendre leurs univers et proposer un site web reflétant leurs dynamismes et leurs créativités",
      en: "Bureau Joie is a new communication agency specializing in brand creation, packaging design, communication campaigns, and much more. I worked closely with the agency's team to understand their world and design a website reflecting their dynamism and creativity."
    },

    // --- Expertises par projet ---
    "expertise.webdesign":       { fr: "Webdesign / UI UX",                    en: "Web design / UI UX" },
    "expertise.ilebleue":        { fr: "DA / print / Webdesign / UI UX",       en: "Art direction / print / Web design / UI UX" },
    "expertise.joie":            { fr: "Web development / Webdesign",         en: "Web development / Web design" },
    "expertise.lorem":           { fr: "Lorem / Ipsum",                        en: "Lorem / Ipsum" },
    "expertise.identite":        { fr: "Identité / Packaging / UI/UX",         en: "Branding / Packaging / UI/UX" },
    "expertise.objet3d":         { fr: "Objet / DA / Print / 3D",              en: "Product / Art direction / Print / 3D" },

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
