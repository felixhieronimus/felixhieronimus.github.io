// ==============================================================================
// VARIABLES GLOBALES
// ==============================================================================
let currentWheelHandler = null;
let scrollAccumulator    = 0;
let isNavigatingNext     = false;

let isVerticalGlobal     = false;
let lenis;
let galleryRAF;
let galleryWheelHandler;

// Fix #1 — updateClock : référence unique pour éviter les chaînes parallèles
let clockTimeout = null;

// Fix #2 — initComingSoonAnimations : référence unique pour clearInterval
let comingSoonInterval = null;

// Fix #3 — adjustTextOpacity : on stocke les listeners pour pouvoir les retirer
let textOpacityListeners = [];

// Fix #4 — initMenu : guard pour ne pas empiler les listeners sur le même nœud DOM
let menuInitialized = false;

// Historique des projets visités (pour ne jamais retomber deux fois sur le même)
let visitedProjects = [];


// ==============================================================================
// MODALE "À PROPOS" - MASTERCLASS (FIX CLONES INVISIBLES & RADAR 2D)
// ==============================================================================
function initAboutMagic() {
  const aboutBtn = document.getElementById("about-btn");
  if (!aboutBtn) return;

  const newAboutBtn = aboutBtn.cloneNode(true);
  aboutBtn.parentNode.replaceChild(newAboutBtn, aboutBtn);

  let isOpen = false;
  let isAboutAnimating = false;
  let overlay = null;
  let clonesContainer = null;
  let originalImagesData = [];
  let miniNavWasVisible = false;
  let aboutTargets = [];
  let aboutResizeRAF = null;

  const elementsToHide = ".menu a:not(#about-btn), .custom-gallery, .sectionprojet, .indicator-container, .project-counter, .flexgrid, .inner-project, .project-header-spacer, footer, #next-project-trigger, .scroll-percentage, .hp-projet";

  // Les carrés atterrissent sur .about-bullet-target via un tween GSAP figé en
  // pixels : sans ça, ils ne suivent plus les blocs de texte si la fenêtre est
  // redimensionnée pendant que la modale est ouverte (colonnes qui bougent,
  // repli en mode mobile, etc). On les recale en direct au resize.
  const repositionAboutSquares = () => {
    if (!isOpen || isAboutAnimating || !aboutTargets.length) return;
    originalImagesData.forEach((data, i) => {
      const rect = aboutTargets[i % aboutTargets.length].getBoundingClientRect();
      gsap.set(data.wrapper, { top: rect.top, left: rect.left });
    });
  };

  window.addEventListener('resize', () => {
    if (aboutResizeRAF) return;
    aboutResizeRAF = requestAnimationFrame(() => {
      repositionAboutSquares();
      aboutResizeRAF = null;
    });
  });

  newAboutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (isAboutAnimating) return;
    
    const customEase = "expo.inOut";

    // ==========================================================================
    // FERMETURE (RETOUR À L'ORDRE)
    // ==========================================================================
    if (isOpen) {
      isAboutAnimating = true;
      isOpen = false;
      if (window.i18n) window.i18n.setRollingText(newAboutBtn, window.i18n.t("nav.about", window.i18n.getLang()));
      else newAboutBtn.innerText = "à propos";
      
      const closeTl = gsap.timeline({
        onComplete: () => {
          originalImagesData.forEach(data => {
            if (!data.isDuplicate) gsap.set(data.originalImg, { autoAlpha: 1 });
          });
          
          if (overlay) overlay.remove();
          if (clonesContainer) clonesContainer.remove();
          
          gsap.set(elementsToHide, { clearProps: "opacity,visibility" });
          const miniNav = document.querySelector('.project-mini-nav') || document.querySelector('.mini-nav-container');
          if (miniNav) gsap.set(miniNav, { clearProps: "opacity,visibility" });
          
          if (typeof lenis !== 'undefined' && lenis) lenis.start();
          document.body.style.overflow = ""; 
          isAboutAnimating = false; 
        }
      });

      closeTl.to(overlay.querySelectorAll('.about-text, .about-text *'), { opacity: 0, duration: 0.4, ease: "power2.in" });

      originalImagesData.forEach((data, i) => {
        if (data.isDuplicate) {
          closeTl.to(data.wrapper, { opacity: 0, duration: 0.6 }, 0.2);
        }

        closeTl.to(data.wrapper, {
          top: () => data.originalContainer.getBoundingClientRect().top,
          left: () => data.originalContainer.getBoundingClientRect().left,
          width: () => data.originalContainer.getBoundingClientRect().width,
          height: () => data.originalContainer.getBoundingClientRect().height,
          duration: 1.2,
          ease: customEase
        }, 0.2 + (i * 0.005));
        
        const currentTransform = window.getComputedStyle(data.originalImg).transform;
        const exactMatrix = currentTransform !== 'none' ? currentTransform : 'scale(1)';

        closeTl.to(data.img, { 
          transform: () => exactMatrix, 
          duration: 1.2, 
          ease: customEase 
        }, 0.2 + (i * 0.005));
      });

      closeTl.to(overlay, { opacity: 0, duration: 0.4 }, 1.0);
      closeTl.to(elementsToHide, { opacity: 1, duration: 0.4 }, 1.0);
      
      const miniNav = document.querySelector('.project-mini-nav') || document.querySelector('.mini-nav-container');
      if (miniNav && miniNavWasVisible) {
        closeTl.to(miniNav, { opacity: 1, duration: 0.4 }, 1.0);
      }

      return;
    }

    // ==========================================================================
    // OUVERTURE (LE CHAOS TO ORDER)
    // ==========================================================================
    isAboutAnimating = true;
    isOpen = true;
    if (window.i18n) window.i18n.setRollingText(newAboutBtn, window.i18n.t("nav.about.close", window.i18n.getLang()));
    else newAboutBtn.innerText = "Fermer";
    if (typeof lenis !== 'undefined' && lenis) lenis.stop();
    document.body.style.overflow = "hidden"; 

    // 🛡️ FIX 1 : On enlève le :not(.is-clone) pour attraper toutes les images de la Home !
    let originalContainers = Array.from(document.querySelectorAll('.custom-gallery .gallery-item .relative-home'));
    
    if (originalContainers.length === 0) {
      const heroImage = document.querySelector('.hp-projet');
      const projectImages = Array.from(document.querySelectorAll('.sectionprojet img'));
      originalContainers = [];
      if (heroImage) originalContainers.push(heroImage); 
      originalContainers = originalContainers.concat(projectImages);
    }

    overlay = document.createElement('div');
    overlay.id = 'about-magic-overlay';
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9998; pointer-events: all; display: flex; justify-content: center; align-items: center; background: var(--beige, #ffffff); opacity: 0;`;

    overlay.innerHTML = `
      <button type="button" class="about-close-btn" data-i18n="nav.about.close">Fermer</button>
      <div class="about-content">
        <div class="about-col about-col-bio">
          <div class="about-heading">
            <div class="about-bullet-target"></div>
            <h3 class="about-text about-label" data-i18n="about.bio.label">Bio</h3>
          </div>
          <p class="about-text about-body" data-i18n="about.bio.text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.
          </p>
        </div>
        <div class="about-col about-col-clients">
          <div class="about-heading">
            <div class="about-bullet-target"></div>
            <h3 class="about-text about-label" data-i18n="about.clients.label">Selected Clients</h3>
          </div>
          <div class="about-text about-body about-clients-list">
            <span>(01) BUREAU JOIE</span>
            <span>(02) PAUL PEINTURE</span>
            <span>(03) SOPHIE DELAPORTE</span>
            <span>(04) BE DANDY</span>
            <span>(05) PARIS ATTITUDE</span>
            <span>(06) OSE</span>
            <span>(07) ORPHIE</span>
            <span>(08) MADAME C CONSEILLE</span>
          </div>
        </div>
        <div class="about-col about-col-links">
          <div class="about-heading-split">
             <div class="about-heading">
               <div class="about-bullet-target"></div>
               <h3 class="about-text about-label" data-i18n="about.awwwards.label">Awwwards</h3>
             </div>
             <div class="about-heading">
               <div class="about-bullet-target"></div>
               <h3 class="about-text about-label" data-i18n="about.contact.label">Contact</h3>
             </div>
          </div>
          <p class="about-text about-body about-links-row">
            <span class="about-links-col">
              <span>Young Jury 21-26</span>
              <span>5x Honors</span>
              <span>2x Mobile Exc.</span>
            </span>
            <span class="about-links-col">
              <a href="mailto:felixhieronimus@gmail.com">Email</a>
              <a href="https://www.instagram.com/hieronimusfelix/" target="_blank">Instagram</a>
            </span>
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    if (window.i18n) window.i18n.translate(window.i18n.getLang(), overlay, { fade: false });

    // Sur mobile, .menu (donc le lien "Fermer" du header) est masqué : sans
    // ce bouton, impossible de refermer la modale une fois ouverte. Il
    // délègue simplement au vrai bouton "à propos", qui porte toute la
    // logique de fermeture (identique au clic normal en le rouvrant).
    const closeBtn = overlay.querySelector('.about-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        newAboutBtn.click();
      });
    }

    clonesContainer = document.createElement('div');
    clonesContainer.id = "about-clones-container";
    clonesContainer.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; pointer-events: none;";
    document.body.appendChild(clonesContainer);

    originalImagesData = [];
    let clonesCount = 0;

    originalContainers.forEach((container) => {
      let originalImg = container.querySelector('.initial-image');
      if (!originalImg) originalImg = container;

      const rect = container.getBoundingClientRect();
      
      // 🛡️ FIX 2 : Le Radar 2D ! On vérifie si l'image est dans l'écran ou proche (marge de 300px)
      // Ça marche aussi bien pour la Home (horizontal) que pour les Projets (vertical)
      const isVisible = (
        rect.top < window.innerHeight + 300 &&
        rect.bottom > -300 &&
        rect.left < window.innerWidth + 300 &&
        rect.right > -300
      );

      // Si l'image n'est pas visible, on l'ignore (sauf si on a besoin de remplir les 4 puces !)
      if (!isVisible && clonesCount >= 4) return;
      
      // Sécurité anti-lag : On n'anime jamais plus de 24 images à la fois
      if (clonesCount >= 24) return;

      const cloneWrapper = document.createElement('div');
      cloneWrapper.style.cssText = `position: absolute; top: ${rect.top}px; left: ${rect.left}px; width: ${rect.width}px; height: ${rect.height}px; overflow: hidden; z-index: ${10000 + clonesCount};`;

      let cloneImg;
      const currentTransform = window.getComputedStyle(originalImg).transform;
      const exactMatrix = currentTransform !== 'none' ? currentTransform : 'scale(1)';

      if (originalImg.tagName.toLowerCase() === 'div') {
        cloneImg = document.createElement('div');
        cloneImg.style.backgroundImage = originalImg.style.backgroundImage;
        cloneImg.style.cssText += `width: 100%; height: 100%; background-size: cover; background-position: center; transform: ${exactMatrix}; transform-origin: center center; margin: 0; padding: 0;`;
      } else {
        cloneImg = originalImg.cloneNode(true);
        cloneImg.style.cssText = `width: 100%; height: 100%; object-fit: cover; transform: ${exactMatrix}; transform-origin: center center; margin: 0; padding: 0;`;
      }

      cloneWrapper.appendChild(cloneImg);
      clonesContainer.appendChild(cloneWrapper);
      
      originalImagesData.push({ wrapper: cloneWrapper, img: cloneImg, originalImg, originalContainer: container, isDuplicate: false });
      clonesCount++;
    });

    if (originalImagesData.length > 0 && originalImagesData.length < 4) {
      const missing = 4 - originalImagesData.length;
      const realCount = originalImagesData.length;
      for (let i = 0; i < missing; i++) {
        const baseData = originalImagesData[i % realCount];
        const newWrapper = baseData.wrapper.cloneNode(true);
        const newImg = newWrapper.firstChild;
        clonesContainer.appendChild(newWrapper);
        originalImagesData.push({
          wrapper: newWrapper,
          img: newImg,
          originalImg: baseData.originalImg,
          originalContainer: baseData.originalContainer,
          isDuplicate: true 
        });
      }
    }

    const openTl = gsap.timeline({ onComplete: () => { isAboutAnimating = false; }});
    aboutTargets = Array.from(overlay.querySelectorAll('.about-bullet-target'));
    const targets = aboutTargets;

    openTl.to(overlay, { opacity: 1, duration: 0.3 }, 0);
    openTl.to(elementsToHide, { opacity: 0, duration: 0.3 }, 0);
    
    const miniNav = document.querySelector('.project-mini-nav') || document.querySelector('.mini-nav-container');
    if (miniNav) {
      miniNavWasVisible = parseFloat(window.getComputedStyle(miniNav).opacity) > 0;
      openTl.to(miniNav, { opacity: 0, duration: 0.3 }, 0);
    }

    openTl.add(() => {
      originalImagesData.forEach(data => {
        if (!data.isDuplicate) gsap.set(data.originalImg, { autoAlpha: 0 });
      });
    }, 0.1);

    originalImagesData.forEach((data, i) => {
      const targetIndex = i % targets.length;
      
      openTl.to(data.wrapper, {
        left: `${Math.random() * 80 + 10}vw`,
        top: `${Math.random() * 80 + 10}vh`,
        width: "10px", height: "10px", 
        duration: 0.8, ease: customEase
      }, 0.1 + (i * 0.01));

      openTl.to(data.img, { 
        transform: "translate3d(0px, 0px, 0px) scale(2)", 
        duration: 0.8, ease: customEase 
      }, 0.1 + (i * 0.01));

      openTl.to(data.wrapper, {
        top: () => targets[targetIndex].getBoundingClientRect().top,
        left: () => targets[targetIndex].getBoundingClientRect().left,
        duration: 1.2, ease: customEase
      }, 0.9);
    });

    openTl.to(overlay.querySelectorAll('.about-text, .about-text *'), { opacity: 1, duration: 0.8, stagger: 0.03, ease: "expo.out" }, 1.4);
  });
}

// ==============================================================================
// Pull Next image
// ==============================================================================


function animateNextProjectHero(data) {
  const nextContainer = data.next.container;
  const nextHero = nextContainer.querySelector('.hp-projet');
  
  if (!nextHero) {
    gsap.to(data.current.container, { opacity: 0 });
    gsap.set(nextContainer, { opacity: 1 });
    return;
  }

  let bgUrl = "";
  const match = nextHero.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
  if (match) bgUrl = match[1];

  const flyer = document.createElement('div');
  flyer.style.cssText = `
    position: fixed; 
    top: 50%; left: 50%; 
    width: 10px; height: 10px;
    background-image: url('${bgUrl}');
    background-size: cover; 
    background-position: center;
    z-index: 10000; /* Toujours au-dessus du voile blanc */
    opacity: 0;
    will-change: width, height, top, left;
  `;
  document.body.appendChild(flyer);

  gsap.set(flyer, { xPercent: -50, yPercent: -50 });

  const customEase = "expo.inOut";
  const tl = gsap.timeline(); // Plus de onComplete global ici !

  // ÉTAPE 1 : Apparition au centre
  tl.to(flyer, { 
      opacity: 1, 
      duration: 0.5,
      ease: "power2.inOut" 
    })
  
  // ÉTAPE 2 : Grossissement 10x13vw
    .to(flyer, { 
      width: "10vw", 
      height: "13vw", 
      duration: 1.2, 
      ease: customEase 
    })
  
  // ÉTAPE 3 : Placement final
    .to(flyer, {
      width: "100vw", 
      height: "50vh",
      left: "50%", 
      top: "25vh", 
      duration: 2, 
      ease: customEase
    });

  // ÉTAPE 4 : LE RELAIS DÉCALÉ (Le secret anti-flash)
  // tl.call() s'exécute à la toute fin de la timeline.
  // Cela dit à Barba : "C'est bon, lance l'apparition de la page (afterEnter)".
tl.call(() => {
    
    // LA MAGIE EST LÀ : On décroche le clone de l'écran pour l'accrocher au document.
    // S'il scrolle, le clone scrollera avec la page de manière synchronisée !
    flyer.style.position = "absolute";
    
    // On force la nouvelle image à ignorer le CSS qui la rend transparente
    nextHero.style.animation = "none";
    gsap.set(nextHero, { opacity: 1 });

    // On laisse le clone solide à 100% le temps que Barba affiche la page en dessous.
    // Au bout de 0.6s, on le supprime.
    gsap.delayedCall(0.6, () => {
      flyer.remove();
    });
    
  });

  return tl;
}



// Affiche ou masque le groupe "Grid mode" avec un fondu
function toggleGridButton(path) {
  // On cible le parent qui contient le bouton ET le cercle
  const container = document.querySelector('.flexgrid');
  if (!container) return;
  
  const isHome = path === "/" || path.endsWith("index.html");
  
  if (isHome) {
    // On réaffiche en fondu
    container.style.display = "flex"; // Ou votre display d'origine
    setTimeout(() => {
      container.style.opacity = "1";
      container.style.pointerEvents = "all";
    }, 10);
  } else {
    // On lance le fade out
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    // On attend la fin de la transition CSS (300ms) avant de mettre en display none
    setTimeout(() => {
      if (container.style.opacity === "0") {
        container.style.display = "none";
      }
    }, 1000);
  }
}

// ==============================================================================
// vignettes projet
// ==============================================================================
// ==============================================================================
// VIGNETTES PROJET (VERSION SÉCURISÉE BARBA)
// ==============================================================================
function initProjectMiniNav(container = document) {
  // 1. NETTOYAGE : On efface les anciens calculs de l'ancienne page
  if (window.miniNavScrollHandler) {
    window.removeEventListener('scroll', window.miniNavScrollHandler);
    window.removeEventListener('resize', window.miniNavResizeHandler);
  }

  // Sur mobile, le scrubber est masqué en CSS et les images projet passent à
  // 100% de largeur (voir .project-mini-nav / .sectionprojet .w-100) : inutile
  // de calculer positions/scroll listeners pour un élément jamais affiché.
  if (window.matchMedia("(max-width: 768px)").matches) return;

  // 2. SCOPING : On cherche uniquement dans le container de la NOUVELLE page
  const sectionProjet = container.querySelector('.sectionprojet');
  const miniNav = container.querySelector('.project-mini-nav');
  const miniTrack = miniNav?.querySelector('.mini-nav-track');

  // Petite sécurité pour les IDs (si Barba a du mal à nettoyer l'ancien ID)
  const percentEl = container.querySelector('#percent-value') || document.getElementById('percent-value');
  const percentContainer = container.querySelector('.scroll-percentage');

  if (!sectionProjet || !miniNav || !miniTrack) return;

  const images = sectionProjet.querySelectorAll('img, video');
  if (images.length < 2) return;

  miniTrack.innerHTML = "";
  miniTrack.style.position = "relative"; 

  let isNavigatingClick = false;
  let clickTimeout = null;

  const highlighter = document.createElement('div');
  highlighter.style.cssText = `
    position: absolute; top: 0; left: 50%;
    background: none; border: 1px solid rgba(0, 0, 0, 0.5);
    pointer-events: none; z-index: 10; box-sizing: border-box;
    transition: transform 0.6s cubic-bezier(0.85, 0, 0.15, 1);
  `;
  miniTrack.appendChild(highlighter);
  
  const allMinis = [];

  // Miniatures = petits fichiers "-mini.webp" dédiés (300px), jamais l'image/
  // vidéo plein format : la charger juste pour l'afficher en 6vw téléchargeait
  // et décodait des méga-octets pour chaque vignette, d'où le freeze au
  // moment où le scrubber apparaissait (toutes décodées d'un coup).
  images.forEach((media, index) => {
    const mini = document.createElement('div');
    mini.classList.add('mini-item');
    const miniSrc = media.src.replace(/\.[^./]+$/, '-mini.webp');
    mini.innerHTML = `<img src="${miniSrc}" loading="lazy">`;

    mini.addEventListener('click', () => {
      if (lenis) {
        lenis.scrollTo(media, { 
            offset: -100, duration: 2.5, 
            easing: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
            lock: true, immediate: false
        });

        isNavigatingClick = true;
        highlighter.style.transition = "transform 2.5s cubic-bezier(0.85, 0, 0.15, 1)";
        miniTrack.style.transition = "transform 2.5s cubic-bezier(0.85, 0, 0.15, 1)";

        const targetCenter = mini.offsetTop + (mini.offsetHeight / 2);
        const hHeight = parseFloat(highlighter.style.height) || 30;
        highlighter.style.transform = `translate(-50%, ${targetCenter - (hHeight / 2)}px)`;
        miniTrack.style.transform = `translateY(${(containerHeight / 2) - targetCenter}px)`;

        if(clickTimeout) clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          isNavigatingClick = false;
          highlighter.style.transition = "transform 0.6s cubic-bezier(0.85, 0, 0.15, 1)";
          miniTrack.style.transition = "transform 0.5s cubic-bezier(0.85, 0, 0.15, 1)";
        }, 2500);
      }
    });
    miniTrack.appendChild(mini);
    allMinis.push(mini);
  });

  let imagePositions = [];
  let sectionHeight = 0;
  let containerHeight = 0;
  let lastActiveIdx = -1;

  const calculateMetrics = () => {
    imagePositions = Array.from(images).map(img => img.offsetTop);
    const firstImgTop = imagePositions[0] || 0;
    const lastImg = images[images.length - 1];

    sectionHeight = lastImg ? (lastImg.offsetTop + lastImg.offsetHeight) - firstImgTop : 0;

    const winH = window.innerHeight;
    const trackHeight = miniTrack.offsetHeight;
    containerHeight = miniNav.clientHeight || winH * 0.8;

    // Borné entre 30px et la hauteur totale du track : sans plafond, un projet
    // avec peu d'images (donc une sectionHeight faible face au winH) pouvait
    // donner un highlighter de plusieurs centaines de pixels, bien plus grand
    // que le track lui-même.
    const highlighterHeight = Math.min(Math.max((winH / sectionHeight) * trackHeight, 30), trackHeight) || 30;
    highlighter.style.height = `${highlighterHeight}px`;
    highlighter.style.width = "calc(5vw + 30px)";
  };

  const firstImage = images[0];
  const lastImage  = images[images.length - 1];
  const triggerImage = images[1] || images[0]; 

  const handleScrollEffects = () => {
    const scrollTop = window.scrollY;
    const winH = window.innerHeight;

    const startPoint = firstImage.offsetTop - winH;
    const endPoint = lastImage.offsetTop; 
    let scrollPercent = 0;
    if (scrollTop > startPoint) {
      scrollPercent = Math.min(Math.round(((scrollTop - startPoint) / (endPoint - startPoint)) * 100), 100);
    }
    if (percentEl) percentEl.textContent = scrollPercent;

    const triggerPos = triggerImage.getBoundingClientRect().top;
    const isStarted = triggerPos < (winH * 0.5);
    const isFinished = scrollPercent >= 99; 

    if (percentContainer) percentContainer.style.opacity = (isStarted && !isFinished) ? "1" : "0";
    if (miniNav) miniNav.style.opacity = isStarted ? "1" : "0"; 
    if (isFinished) miniNav.style.opacity = "0";

    const viewCenter = scrollTop + (winH / 2);
    let currentIdx = 0;
    
    for (let i = 0; i < imagePositions.length; i++) {
      if (imagePositions[i] <= viewCenter) {
        currentIdx = i;
      }
    }

    if (currentIdx !== lastActiveIdx) {
      allMinis[lastActiveIdx]?.classList.remove('is-active');
      if (allMinis[lastActiveIdx]) allMinis[lastActiveIdx].style.opacity = "0.2";
      allMinis[currentIdx]?.classList.add('is-active');
      if (allMinis[currentIdx]) allMinis[currentIdx].style.opacity = "1";
      lastActiveIdx = currentIdx;
    }

    if (!isNavigatingClick) {
      const activeMini = allMinis[currentIdx];
      if (activeMini) {
        const activeCenter = activeMini.offsetTop + (activeMini.offsetHeight / 2);
        const hHeight = parseFloat(highlighter.style.height) || 30;

        highlighter.style.transform = `translate(-50%, ${activeCenter - (hHeight / 2)}px)`;

        // Fait glisser la piste elle-même pour garder la vignette active
        // centrée dans le conteneur — indispensable quand il y a beaucoup
        // d'images (le highlighter seul finissait hors champ).
        const trackShift = (containerHeight / 2) - activeCenter;
        miniTrack.style.transform = `translateY(${trackShift}px)`;
      }
    }
  };

  // rAF-throttle : évite de recalculer à chaque event "scroll" (Lenis en émet
  // beaucoup) et garde l'animation fluide même avec de nombreuses vignettes.
  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      handleScrollEffects();
      scrollTicking = false;
    });
  };

  // 3. SAUVEGARDE DES ÉCOUTEURS pour pouvoir les détruire à la prochaine page
  window.miniNavScrollHandler = onScroll;
  window.miniNavResizeHandler = calculateMetrics;

  window.addEventListener('scroll', window.miniNavScrollHandler, { passive: true });
  window.addEventListener('resize', window.miniNavResizeHandler);

  // Délai un peu plus long pour s'assurer que Barba a fini de peindre les images
  setTimeout(() => {
    calculateMetrics();
    handleScrollEffects();
  }, 300);
}
// ==============================================================================
// 1. SMOOTH SCROLL (LENIS) — ACTIVÉ HORS HOME
// ==============================================================================
// Déclarée hors de initSmoothScroll() : il faut la MÊME référence de fonction
// à chaque appel pour que gsap.ticker.remove(updateLenis) retire bien le
// callback ajouté par l'appel précédent (sinon les callbacks s'empilent à
// chaque changement de page et continuent de tourner même après que `lenis`
// soit repassé à null, d'où le "Cannot read properties of null (reading 'raf')").
function updateLenis(time) {
  if (lenis) lenis.raf(time * 1000);
}

function initSmoothScroll() {
  const isHome = window.location.pathname === "/" || window.location.pathname.endsWith("index.html");

  // Nettoyage : détruire l'ancien scroll pour éviter les doublons
  if (lenis) {
    lenis.destroy();
    gsap.ticker.remove(updateLenis);
    lenis = null;
  }

  // On s'arrête ici sur la Home (le slider custom gère le scroll)
  if (isHome) return;

  lenis = new Lenis({
    duration:        1.2,
    easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel:     true,
    wheelMultiplier: 1,
    smoothTouch:     false, // Toujours laisser le tactile natif sur mobile
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add(updateLenis);
  gsap.ticker.lagSmoothing(0);
}


// ==============================================================================
// 2. GALERIE INFINIE (Smooth Infinite Gallery)
// ==============================================================================
// ==============================================================================
// 2. GALERIE INFINIE (Smooth Infinite Gallery)
// ==============================================================================
// ==============================================================================
// 2. GALERIE INFINIE (Smooth Infinite Gallery)
// ==============================================================================
// ==============================================================================
// 2. GALERIE INFINIE (Smooth Infinite Gallery) - VERSION AWWWARDS MASTERCLASS
// ==============================================================================
// Met à jour le libellé du bouton List/Slide selon la langue courante et l'état
// d'affichage (vertical = liste, horizontal = slide). Appelée au (ré)init de la
// galerie ET par i18n.js juste après un changement de langue.
function updateChangeLayoutBtnLabel() {
  const btn     = document.getElementById('changeLayoutBtn');
  const gallery = document.querySelector('.custom-gallery');
  if (!btn || !gallery) return;

  const lang        = window.i18n ? window.i18n.getLang() : "fr";
  const isVertical  = gallery.classList.contains('is-vertical');
  const key         = isVertical ? "gallery.slide" : "gallery.list";
  btn.textContent   = window.i18n ? window.i18n.t(key, lang) : (isVertical ? "Slide" : "Liste");
}
window.refreshGridButtonLabel = updateChangeLayoutBtnLabel;

function initSmoothGallery() {
  const gallery       = document.querySelector('.custom-gallery');
  const track         = document.querySelector('.gallery-track');
  const btn           = document.getElementById('changeLayoutBtn');
  const miniContainer = document.querySelector('.mini-nav-container:not(.project-mini-nav)'); 
  const miniTrack     = miniContainer?.querySelector('.mini-nav-track');

  if (galleryRAF) cancelAnimationFrame(galleryRAF);
  if (galleryWheelHandler) window.removeEventListener('wheel', galleryWheelHandler);
  if (window._galleryResizeObserver) {
    window._galleryResizeObserver.disconnect();
    window._galleryResizeObserver = null;
  }
  if (window._galleryLayoutResizeHandler) {
    window.removeEventListener('resize', window._galleryLayoutResizeHandler);
    window._galleryLayoutResizeHandler = null;
  }

  if (!gallery || !track) return;

  // Mobile : liste simple, en flux normal, avec le scroll natif du
  // navigateur (parfait au doigt, aucune simulation JS nécessaire). La
  // suite de cette fonction (clones "infinis" + molette + boucle de rendu)
  // ne s'applique qu'au slider desktop, qui est en position: fixed — sur
  // mobile ça bloquait tout scroll tactile ET sortait le footer du flux
  // normal du document (un élément fixed ne prend aucune place dans la page,
  // donc le footer, qui le suit dans le HTML, remontait juste sous le header).
  if (window.matchMedia("(max-width: 768px)").matches) {
    isVerticalGlobal = true;
    gallery.classList.add('is-vertical');
    track.querySelectorAll('.is-clone').forEach(clone => clone.remove());
    updateChangeLayoutBtnLabel();
    return;
  }

  if (isVerticalGlobal) gallery.classList.add('is-vertical');
  else gallery.classList.remove('is-vertical');
  updateChangeLayoutBtnLabel();

  const originalItems = Array.from(track.querySelectorAll('.gallery-item:not(.is-clone)'));
  track.querySelectorAll('.is-clone').forEach(clone => clone.remove());
  
  const N = originalItems.length;

  const createMainSet = (className) => originalItems.map(item => {
    const c = item.cloneNode(true);
    c.classList.add('is-clone', className);
    return c;
  });

  const setBefore2 = createMainSet('clone-before-2');
  const setBefore1 = createMainSet('clone-before-1');
  const setAfter1  = createMainSet('clone-after-1');
  const setAfter2  = createMainSet('clone-after-2');

  const refNode = originalItems[0];
  setBefore2.forEach(c => track.insertBefore(c, refNode));
  setBefore1.forEach(c => track.insertBefore(c, refNode));
  setAfter1.forEach(c => track.appendChild(c));
  setAfter2.forEach(c => track.appendChild(c));

  let isVertical         = gallery.classList.contains('is-vertical');
  let current            = 0;
  let target             = 0;
  const ease             = 0.08;
  let totalOriginalSize  = 0;
  let totalMiniSize      = 0; 
  let layoutTransition   = { value: isVertical ? 1 : 0 };
  let isGalleryAnimating = false; 
  let isNavigatingClick  = false; 
  let currentActiveMiniIndex = N; 
  let loopJumped         = false;

  function calculateBounds() {
    const firstOrig  = originalItems[0];
    const firstAfter = setAfter1[0];
    
    if (firstOrig && firstAfter) {
      totalOriginalSize = isVertical
        ? firstAfter.offsetTop  - firstOrig.offsetTop
        : firstAfter.offsetLeft - firstOrig.offsetLeft;
    }

    const allMinis = miniTrack?.querySelectorAll('.mini-item');
    if (allMinis && allMinis.length >= N * 2) {
      const firstMiniSet1 = allMinis[0];
      const firstMiniSet2 = allMinis[N];
      if (firstMiniSet1 && firstMiniSet2) {
        totalMiniSize = firstMiniSet2.offsetTop - firstMiniSet1.offsetTop;
      }
    }

    if (current === 0 && totalOriginalSize > 0) {
      current = totalOriginalSize * 2;
      target = totalOriginalSize * 2;
    }
  }

  track.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', calculateBounds);
  });

  if (miniTrack && N > 0) {
    miniTrack.innerHTML = "";
    
    if (miniContainer) {
      miniContainer.style.overflow = "hidden";
      miniContainer.style.width = "80px"; 
      miniContainer.style.right = "20px";
    }
    miniTrack.style.position = "relative"; 

    const createMiniSet = (items, setType, offsetIndex) => {
      items.forEach((item, index) => {
        const mini = document.createElement('div');
        mini.classList.add('mini-item', setType !== 'original' ? 'is-clone' : 'real');
        // Même correctif que le scrubber projet : une vraie petite vignette
        // dédiée plutôt que l'image plein format (répétée x3 pour la boucle
        // infinie du mini-nav, donc x3 le coût de décodage inutile).
        const imgSrc = item.querySelector('.initial-image')?.src || "";
        const miniSrc = imgSrc ? imgSrc.replace(/\.[^./]+$/, '-mini.webp') : "";
        mini.innerHTML = `<img src="${miniSrc}" loading="lazy">`;
        
        // 🛡️ FIX 2 : On injecte la courbe de Bézier "Expo.inOut" pour l'opacité
        mini.style.transition = "opacity 0.6s cubic-bezier(0.87, 0, 0.13, 1)";
        
        mini.addEventListener('click', () => scrollToProject(offsetIndex + index));
        miniTrack.appendChild(mini);
      });
    };

    createMiniSet(originalItems, 'clone-before', 0);
    createMiniSet(originalItems, 'original', N);
    createMiniSet(originalItems, 'clone-after', N * 2);

    miniTrack.querySelectorAll('img').forEach(img => {
      if (!img.complete) img.addEventListener('load', calculateBounds);
    });

    const scrollToProject = (absoluteIndex) => {
      if (totalOriginalSize === 0 || totalMiniSize === 0) calculateBounds();

      // 🛡️ FIX 1 : LE HOMING MISSILE
      // Au lieu de cibler le clone cliqué, on calcule l'image correspondante dans le SET CENTRAL !
      const realIndex = absoluteIndex % N;
      const allMainItems = track.querySelectorAll('.gallery-item');
      const targetItem = allMainItems[(2 * N) + realIndex]; // 2*N = le cœur du Buffer

      const viewportCenter = isVertical ? window.innerHeight / 2 : window.innerWidth / 2;
      const itemCenterAbs = isVertical
        ? targetItem.offsetTop + targetItem.offsetHeight / 2
        : targetItem.offsetLeft + targetItem.offsetWidth / 2;

      const baseTarget = itemCenterAbs - viewportCenter;

      // On s'assure de prendre le chemin le plus court pour faire l'illusion d'aller au bon clone
      const potentialTargets = [
        baseTarget - totalOriginalSize,
        baseTarget,
        baseTarget + totalOriginalSize
      ];

      const goingDown = absoluteIndex > currentActiveMiniIndex;
      let validTargets = goingDown
        ? potentialTargets.filter(t => t > current)
        : potentialTargets.filter(t => t < current);

      if (validTargets.length === 0) validTargets = potentialTargets;

      const newTarget = validTargets.reduce((prev, curr) =>
        Math.abs(curr - current) < Math.abs(prev - current) ? curr : prev
      );

      isGalleryAnimating = true; 
      isNavigatingClick = true;

      const highlighter = miniTrack.querySelector('.nav-highlighter');
      if (highlighter) {
        // Courbe "Expo.inOut" pendant l'animation longue
        highlighter.style.transition = "all 2.5s cubic-bezier(0.87, 0, 0.13, 1)";
        const allMinis = miniTrack.querySelectorAll('.mini-item');
        const targetMini = allMinis[absoluteIndex]; 
        
        if (targetMini) {
          const targetCenter = targetMini.offsetTop + (targetMini.offsetHeight / 2);
          const hHeight = targetMini.offsetHeight + 14;
          const hWidth = targetMini.offsetWidth + 14;
          highlighter.style.height = `${hHeight}px`;
          highlighter.style.width = `${hWidth}px`;
          highlighter.style.transform = `translate(-50%, ${targetCenter - (hHeight / 2)}px)`;
        }
      }

      const proxy = { val: current }; 
      gsap.to(proxy, {
        val: newTarget,
        duration: 2.5, 
        ease: "expo.inOut", 
        onUpdate: () => {
          current = proxy.val;
          target = proxy.val; 
        },
        onComplete: () => {
          isGalleryAnimating = false; 
          isNavigatingClick = false; 
          if (highlighter) {
            // Courbe "Expo.inOut" rapide de retour à la normale
            highlighter.style.transition = "all 0.6s cubic-bezier(0.87, 0, 0.13, 1)";
          }
        }
      });
    };

    const highlighter = document.createElement('div');
    highlighter.classList.add('nav-highlighter');
    highlighter.style.cssText = `
      position: absolute; top: 0; left: 50%;
      background: none; border: 1px solid rgba(0, 0, 0, 0.5);
      pointer-events: none; z-index: 10; box-sizing: border-box;
      transition: all 0.6s cubic-bezier(0.87, 0, 0.13, 1);
    `;
    miniTrack.appendChild(highlighter);
  }

  if (btn) {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    const circleGrid = newBtn.parentNode.querySelector('.circlegrid');

    // Animation "chaos to order" du passage slide <-> liste. Factorisée pour
    // être appelée aussi bien par le clic sur le bouton que par le resize
    // (repli automatique en liste si la fenêtre devient trop étroite).
    const applyGalleryLayout = (vertical) => {
      if (gallery.classList.contains('is-switching') || vertical === isVertical) return;

      const currentItems = Array.from(track.querySelectorAll('.gallery-item'));
      gallery.classList.add('is-switching');

      const itemsState = currentItems.map(item => ({ el: item, rect: item.getBoundingClientRect() }));

      isVertical = vertical;
      isVerticalGlobal = isVertical;
      gallery.classList.toggle('is-vertical', isVertical);

      updateChangeLayoutBtnLabel();
      if (isVertical) circleGrid?.classList.add('activegrid');
      else circleGrid?.classList.remove('activegrid');

      calculateBounds();
      target = totalOriginalSize * 2;
      current = totalOriginalSize * 2;
      track.style.transform = isVertical ? `translate3d(0, -${current}px, 0)` : `translate3d(-${current}px, 0, 0)`;

      gsap.to(layoutTransition, { value: isVertical ? 1 : 0, duration: 1.2, ease: "expo.inOut" });

      itemsState.forEach((state, index) => {
        const newRect = state.el.getBoundingClientRect();
        gsap.fromTo(state.el,
          { x: state.rect.left - newRect.left, y: state.rect.top - newRect.top },
          {
            x: 0, y: 0, duration: 1.2, delay: index * 0.02, ease: "expo.inOut",
            onComplete: () => {
              if (index === currentItems.length - 1) gallery.classList.remove('is-switching');
            }
          }
        );
      });
    };

    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      applyGalleryLayout(!isVertical);
    });

    // Fenêtre réduite sous le seuil mobile : bascule automatiquement en
    // liste (avec la même animation), sans attendre un rechargement/nav.
    window._galleryLayoutResizeHandler = () => {
      if (window.innerWidth <= 768 && !isVertical) applyGalleryLayout(true);
    };
    window.addEventListener('resize', window._galleryLayoutResizeHandler);
  }

  function render() {
    current += (target - current) * ease;
    loopJumped = false;

    if (!isGalleryAnimating && totalOriginalSize > 0) {
      if (current > totalOriginalSize * 2.5) { 
        current -= totalOriginalSize; 
        target  -= totalOriginalSize;
        if (window._galleryScrollProxy) window._galleryScrollProxy.val -= totalOriginalSize;
        loopJumped = true; 
      } else if (current < totalOriginalSize * 1.5) { 
        current += totalOriginalSize; 
        target  += totalOriginalSize;
        if (window._galleryScrollProxy) window._galleryScrollProxy.val += totalOriginalSize;
        loopJumped = true; 
      }
    }

    const roundedCurrent = Math.round(current * 100) / 100;
    track.style.transform = isVertical
      ? `translate3d(0, ${-roundedCurrent}px, 0)`
      : `translate3d(${-roundedCurrent}px, 0, 0)`;

    let minDistance = Infinity;
    let activeIdx = 0;
    
    const viewCenterTrack = current + (isVertical ? window.innerHeight / 2 : window.innerWidth / 2);
    const allGalleryItems = track.querySelectorAll('.gallery-item');

    allGalleryItems.forEach((item, idx) => {
      const itemCenter = isVertical 
        ? item.offsetTop + item.offsetHeight / 2 
        : item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(itemCenter - viewCenterTrack);
      if (distance < minDistance) {
        minDistance = distance;
        activeIdx = idx;
      }
    });

    const realIndex = activeIdx % N;

    if (window.lastGalleryIndex !== realIndex) {
      const prevIndex = window.lastGalleryIndex !== undefined ? window.lastGalleryIndex : realIndex;
      window.lastGalleryIndex = realIndex;

      const currEl = document.getElementById("currentSlide");
      const totEl  = document.getElementById("totalSlides");
      if (currEl) currEl.textContent = realIndex + 1;
      if (totEl)  totEl.textContent  = N;

      const circle = document.querySelector(".progress-circle");
      if (circle) {
        const r = parseFloat(circle.getAttribute('r')) || 18;
        const C = 2 * Math.PI * r;
        const progress = (realIndex + 1) / N;
        const newDash = progress * C;

        circle.style.transition = "none"; 
        circle.setAttribute("stroke", "var(--pink, #ff477e)");

        const isForwardLoop  = (prevIndex === N - 1 && realIndex === 0);
        const isBackwardLoop = (prevIndex === 0 && realIndex === N - 1);

        if (isForwardLoop) {
          gsap.fromTo(circle, 
            { strokeDasharray: `${C}, ${C}`, strokeDashoffset: 0 },
            { strokeDasharray: `${newDash}, ${C}`, strokeDashoffset: -C, duration: 0.6, ease: "power2.inOut", onComplete: () => gsap.set(circle, { strokeDashoffset: 0 }) }
          );
        } else if (isBackwardLoop) {
          const oldDash = (1 / N) * C; 
          gsap.fromTo(circle, 
            { strokeDasharray: `${oldDash}, ${C}`, strokeDashoffset: -C },
            { strokeDasharray: `${C}, ${C}`, strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }
          );
        } else {
          gsap.to(circle, { strokeDasharray: `${newDash}, ${C}`, strokeDashoffset: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        }
      }
    }

    if (isVertical && miniTrack && totalMiniSize > 0) {
      const allMinis = miniTrack.querySelectorAll('.mini-item');
      const containerHeight = miniContainer ? miniContainer.offsetHeight : window.innerHeight * 0.8;
      const firstMini = allMinis[0];
      const centerOffset = firstMini ? (containerHeight / 2) - (firstMini.offsetHeight / 2) : 0;

      const miniCurrent = (current - totalOriginalSize) * (totalMiniSize / totalOriginalSize);
      const translateY = -miniCurrent + centerOffset;
      miniTrack.style.transform = `translate3d(0, ${translateY}px, 0)`;

      currentActiveMiniIndex = activeIdx - N; 

      allMinis.forEach((mini, idx) => {
        mini.style.opacity = (idx === currentActiveMiniIndex) ? 1 : 0.2; 
      });

      const highlighter = miniTrack.querySelector('.nav-highlighter');
      if (highlighter && !isNavigatingClick) {
        if (loopJumped) {
          highlighter.style.transition = 'none';
          highlighter.offsetHeight; // Force reflow
        } else {
          // Courbe Expo.inOut constante
          highlighter.style.transition = 'all 0.6s cubic-bezier(0.87, 0, 0.13, 1)';
        }
        const activeMini = allMinis[currentActiveMiniIndex];
        if (activeMini) {
          const hHeight = activeMini.offsetHeight + 14;
          const hWidth  = activeMini.offsetWidth  + 14;
          highlighter.style.height = `${hHeight}px`;
          highlighter.style.width  = `${hWidth}px`;
          highlighter.style.transform = `translate(-50%, ${activeMini.offsetTop + activeMini.offsetHeight / 2 - hHeight / 2}px)`;
        }
      }
    }

    track.querySelectorAll('.initial-image').forEach(img => {
      const item  = img.closest('.gallery-item');
      const rect  = item.getBoundingClientRect();
      const distX = (rect.left + rect.width  / 2) - (window.innerWidth  / 2);
      const distY = (rect.top  + rect.height / 2) - (window.innerHeight / 2);
      img.style.transform = `translate3d(${(distX * 0.08) * (1 - layoutTransition.value)}px, ${(distY * 0.08) * layoutTransition.value }px, 0) scale(1.5)`;
    });

    galleryRAF = requestAnimationFrame(render);
  }

  galleryWheelHandler = (e) => {
    if (isGalleryAnimating) return;
    if (gallery.contains(e.target)) e.preventDefault();
    target += e.deltaY + e.deltaX;
  };

  window.addEventListener('wheel', galleryWheelHandler, { passive: false });
  window._galleryResizeObserver = new ResizeObserver(() => calculateBounds());
  window._galleryResizeObserver.observe(track);
  if (miniTrack) window._galleryResizeObserver.observe(miniTrack);

  calculateBounds();
  render();
}

// ==============================================================================
// 3. ANIMATIONS DE TEXTE ET D'INTERFACE
// ==============================================================================

// Hover projet → texte flottant
function initProjectHoverAnimation() {
  const hoverTextContainer = document.getElementById("hoverTextContainer");
  const gallery            = document.querySelector('.custom-gallery');
  if (!hoverTextContainer || !gallery) return;

  hoverTextContainer.style.zIndex      = "99999";
  hoverTextContainer.style.pointerEvents = "none";

  // Délégation via .onmouseover/.onmouseout pour éviter l'empilement de listeners
  gallery.onmouseover = null;
  gallery.onmouseout  = null;

  gallery.onmouseover = (e) => {
    const container = e.target.closest('.thumbContainer');
    if (!container) return;
    if (e.relatedTarget && container.contains(e.relatedTarget)) return;

    const isV    = gallery.classList.contains('is-vertical');
    const rawText = container.querySelector(".info-projet p")?.innerHTML || "";
    const title  = container.querySelector('.titre-projet')?.innerText || "";

    hoverTextContainer.style.top  = "";
    hoverTextContainer.style.left = "";
    hoverTextContainer.innerHTML  = "";

    if (isV) {
      const cleanDesc = rawText.replace(/<br\s*\/?>/gi, " ");
      hoverTextContainer.innerHTML = `<strong>${title}</strong> — ${cleanDesc}`;
    } else {
      const fragment = document.createDocumentFragment();
      rawText.replace(/<br\s*\/?>/gi, "||br||").split("||br||").forEach((lineText, index) => {
        const lineDiv = document.createElement("div");
        lineDiv.classList.add("line");
        lineDiv.style.setProperty("--line-index", index);
        const tempDiv     = document.createElement("div");
        tempDiv.innerHTML = lineText;
        lineDiv.textContent = tempDiv.textContent || "";
        fragment.appendChild(lineDiv);
      });
      hoverTextContainer.appendChild(fragment);
    }

    hoverTextContainer.style.display = "block";
    setTimeout(() => { hoverTextContainer.style.opacity = "1"; }, 10);
  };

  gallery.onmouseout = (e) => {
    const container = e.target.closest('.thumbContainer');
    if (!container) return;
    if (e.relatedTarget && container.contains(e.relatedTarget)) return;

    hoverTextContainer.style.opacity = "0";
    setTimeout(() => {
      if (hoverTextContainer.style.opacity === "0") hoverTextContainer.style.display = "none";
    }, 300);
  };
}



// Rolling Text (lettre par lettre)
function rollingText() {
  document.querySelectorAll(".rolling-text").forEach((element) => {
    if (element.querySelector('.block')) return; // Déjà initialisé

    const innerText     = element.innerText;
    element.innerHTML   = "";
    const textContainer = document.createElement("div");
    textContainer.classList.add("block");

    for (const letter of innerText) {
      const span       = document.createElement("span");
      span.innerText   = letter.trim() === "" ? "\xa0" : letter;
      span.classList.add("letter");
      textContainer.appendChild(span);
    }

    element.appendChild(textContainer);
    const clonedContainer = textContainer.cloneNode(true);
    clonedContainer.classList.add("cloned-text");
    element.appendChild(clonedContainer);

    element.addEventListener("mouseover", () => {
      element.querySelectorAll(".letter").forEach((letter, index) => {
        setTimeout(() => {
          letter.style.transform  = "translateY(-100%)";
          letter.style.transition = "transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)";
        }, index * 15);
      });
    });

    element.addEventListener("mouseout", () => {
      element.querySelectorAll(".letter").forEach((letter, index) => {
        setTimeout(() => {
          letter.style.transform  = "";
          letter.style.transition = "transform 1.1s cubic-bezier(0.76, 0, 0.24, 1)";
        }, index * 15);
      });
    });
  });
}

// Révélation des mots au scroll (opacité dynamique)
function adjustTextOpacity() {
  // Fix : nettoyer les anciens listeners avant d'en ajouter de nouveaux
  textOpacityListeners.forEach(({ handler }) => {
    window.removeEventListener("scroll", handler, { passive: true });
    window.removeEventListener("resize", handler, { passive: true });
  });
  textOpacityListeners = [];

  document.querySelectorAll(".dynamicText").forEach((textContainer) => {
    if (!textContainer.dataset.initialized) {
      const text = textContainer.textContent;
      textContainer.innerHTML = text
        .split(/\s+/)
        .map(word => `<span style="opacity: 0.2; transition: opacity 0.5s;">${word}</span>`)
        .join(" ");
      textContainer.dataset.initialized = "true";
    }

    const adjustWordOpacity = () => {
      const spans        = textContainer.querySelectorAll("span");
      const viewportH    = window.innerHeight;
      const { top }      = textContainer.getBoundingClientRect();
      const targetTop    = viewportH * 0.2;
      const progress     = Math.min(Math.max((viewportH - top) / (viewportH - targetTop), 0), 1);
      const wordsToReveal = Math.floor(spans.length * progress);
      spans.forEach((span, index) => {
        span.style.opacity = index < wordsToReveal ? 1 : 0.2;
      });
    };

    window.addEventListener("scroll", adjustWordOpacity, { passive: true });
    window.addEventListener("resize", adjustWordOpacity, { passive: true });
    textOpacityListeners.push({ handler: adjustWordOpacity });
    adjustWordOpacity();
  });
}

// Révélation des éléments à l'entrée dans le viewport (Intersection Observer)
function animateTextOnEnter() {
  const delayIncrement = 100;
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const container  = entry.target;
      const firstChild = container.firstChild;
      if (firstChild) {
        const animationName = firstChild.tagName === "HR" ? "expandRight" : "slideInText";
        const delay = Array.from(container.parentNode.children).indexOf(container) * delayIncrement;
        firstChild.style.animation = `${animationName} 1s ${delay}ms ease-out forwards`;
      }
      obs.unobserve(container);
    });
  }, { rootMargin: "0px 0px -3% 0px", threshold: 0.04 });

  document.querySelectorAll(
    "main h1, main h2, main h3, main p, main li, main hr, main a," +
    "footer h1, footer h2, footer h3, footer p, footer li, footer hr, footer a"
  ).forEach((el) => {
    if (!el.classList.contains("noSlide") && !el.parentNode.classList.contains("containerSlide")) {
      el.style.opacity = "0";
      const container  = document.createElement("div");
      container.className = "containerSlide";
      el.parentNode.insertBefore(container, el);
      container.appendChild(el);
      observer.observe(container);
    }
  });
}


// ==============================================================================
// 4. EFFETS VISUELS (Parallax, Coming Soon, Stickers)
// ==============================================================================

// Animation "Coming Soon" (éléments aléatoires)
function initComingSoonAnimations() {
  const container = document.querySelector("#comingSoonContainer");
  if (!container) return;

  // Fix : un seul interval à la fois
  if (comingSoonInterval) clearInterval(comingSoonInterval);

  comingSoonInterval = setInterval(() => {
    const element = document.createElement("div");
    element.style.cssText = `
      position: absolute; font-size: 20px; text-transform: uppercase;
      left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
      transform: translate(-50%, -50%) rotate(${Math.random() * 20 - 10}deg);
      color: #FF477E; opacity: 0; transition: opacity 0.5s ease-in-out;
    `;
    element.innerText = "Coming Soon";
    container.appendChild(element);

    setTimeout(() => { element.style.opacity = 1; }, 50);
    setTimeout(() => {
      element.style.opacity = 0;
      setTimeout(() => element.remove(), 500);
    }, 2500);
  }, 100);
}

// Parallax sur les images (.parallax-image)
function initParallaxEffect() {
  const images = document.querySelectorAll(".parallax-image");

  const updateWrapperAndImage = (image) => {
    const containerHeight = image.offsetHeight * 0.9;
    let wrapper = image.closest(".parallax-container");

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.classList.add("parallax-container");
      wrapper.style.cssText = "display:flex;justify-content:center;align-items:center;overflow:hidden;position:relative;max-width:100vw;";
      image.parentNode.insertBefore(wrapper, image);
      wrapper.appendChild(image);
    }
    wrapper.style.width  = "100%";
    wrapper.style.height = `${containerHeight}px`;

    const parallaxRange = parseFloat(image.getAttribute('data-parallax-range') || "0.1") * containerHeight;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const windowHeight  = window.innerHeight;
        const containerRect = wrapper.getBoundingClientRect();
        if (containerRect.bottom > 0 && containerRect.top < windowHeight) {
          const pct = Math.min(windowHeight - containerRect.top, windowHeight) / (windowHeight + containerHeight);
          image.style.transform = `translateY(${-(parallaxRange * pct)}px)`;
        }
        ticking = false;
      });
    }, { passive: true });
  };

  images.forEach(image => {
    if (image.complete) updateWrapperAndImage(image);
    else image.onload = () => updateWrapperAndImage(image);
  });
}

function initParallaxEffectForDivsAndTitles() {
  document.querySelectorAll(" .background-clone").forEach(div => {
    // On capture la hauteur initiale définie lors de la transition Barba
    const initialHeight = div.offsetHeight;

    const adjustDivHeight = () => {
      if (window.innerWidth < 768) {
        // Mode Mobile : Hauteur fixe à 32vh
        div.style.setProperty('height', '32vh', 'important');
      } else {
        // Mode Desktop : Réduction de la hauteur au scroll
        const scrollDistance = window.scrollY;
        const newHeight      = Math.max(initialHeight - scrollDistance * 0.5, initialHeight * 0.5);
        div.style.setProperty('height', `${newHeight}px`, 'important');
      }
    };

    // Écouteurs d'événements pour mettre à jour la taille dynamiquement
    window.addEventListener('scroll', adjustDivHeight, { passive: true });
    window.addEventListener('resize', adjustDivHeight, { passive: true });
    
    // Initialisation immédiate au chargement de la page
    adjustDivHeight();
  });
}


// ==============================================================================
// 5. EFFET "PULL TO NEXT PROJECT"
// ==============================================================================
function initPullToNextProject(container = document) {
  // Nettoyage de l'événement précédent
  if (currentWheelHandler) {
    window.removeEventListener('wheel', currentWheelHandler);
    currentWheelHandler = null;
  }
  scrollAccumulator = 0;
  isNavigatingNext  = false;

  // Nettoyage de l'overlay précédent au changement de page
  document.querySelectorAll('.pull-transition-overlay').forEach(overlay => {
    gsap.to(overlay, { opacity: 0, duration: 0.5, onComplete: () => overlay.remove() });
  });

  const trigger = container.querySelector("#next-project-trigger");
  const fill    = container.querySelector("#next-progress-fill");
  if (!trigger || !fill) return;

  // Positionnement pour passer au-dessus du verre dépoli (mais sans bouger)
  trigger.style.position = "relative";
  trigger.style.zIndex = "9999"; 
  trigger.style.backgroundColor = "transparent";

  // Reset initial
  gsap.set(fill, { scaleX: 0 });

  // --- 1. CRÉATION DU VERRE DÉPOLI ---
  const glassOverlay = document.createElement('div');
  glassOverlay.classList.add('pull-transition-overlay');
  glassOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(255, 255, 255, 0); 
    backdrop-filter: blur(0px); 
    -webkit-backdrop-filter: blur(0px); 
    z-index: 9998; 
    pointer-events: none;
  `;
  document.body.appendChild(glassOverlay);

  // --- 2. SÉLECTION DU PROJET ---
  const allProjects = [
    "arizonalove",
    "ilebleue",
    "elma",
    "rt20",
    "joie",
    "paul",
    "sophie",
  ];
  const projectNames = {
    "arizonalove": "Arizona Love",
    "ilebleue":    "L'île Bleue",
    "elma":         "Elma",
    "rt20":         "RT20",
    "joie":         "Bureau Joie",
    "paul":         "Paul Peinture",
    "sophie":       "Sophie Delaporte",
  };
  const scrollTarget = 2000;

  const currentPage = allProjects.find(p => window.location.pathname.includes(p));
  if (currentPage && !visitedProjects.includes(currentPage)) {
    visitedProjects.push(currentPage);
  }

  let pool = allProjects.filter(p => !visitedProjects.includes(p));
  if (pool.length === 0) {
    visitedProjects = currentPage ? [currentPage] : [];
    pool = allProjects.filter(p => !visitedProjects.includes(p));
  }
  const nextUrl = pool[Math.floor(Math.random() * pool.length)];
  const nextName = projectNames[nextUrl] || nextUrl;

  const nameEl = trigger.querySelector("#next-project-name");
  if (nameEl) {
    nameEl.textContent = nextName;
    gsap.fromTo(nameEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.3 });
  }

  // Flash de flou blanc puis navigation — partagé par le déclenchement au
  // scroll (desktop) et au tap (mobile).
  const goToNext = () => {
    if (isNavigatingNext) return;
    isNavigatingNext = true;
    if (currentWheelHandler) {
      window.removeEventListener('wheel', currentWheelHandler);
      currentWheelHandler = null;
    }
    gsap.to(glassOverlay, { backgroundColor: "var(--beige, #ffffff)", backdropFilter: "blur(40px)", duration: 0.3 });
    gsap.to(trigger, { opacity: 0, duration: 0.3, ease: "power2.in" });
    setTimeout(() => barba.go(nextUrl), 200);
  };

  // Sur mobile, pas de molette : accumuler un geste de scroll pour remplir
  // une jauge n'a pas de sens au tactile. Le bloc devient un simple bouton :
  // un tap déclenche directement la navigation (la barre de progression est
  // masquée en CSS, inutile sans mécanique de scroll à jauger).
  if (window.matchMedia("(max-width: 768px)").matches) {
    trigger.style.cursor = "pointer";
    trigger.addEventListener('click', goToNext);
    return;
  }

  // --- 3. ANIMATION AU SCROLL (desktop) ---
  currentWheelHandler = (e) => {
    if (isNavigatingNext) return;

    const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);

    if (!isAtBottom && scrollAccumulator === 0) return;

    if (e.deltaY > 0 && isAtBottom) {
      e.preventDefault();
      scrollAccumulator += e.deltaY;
    } else if (e.deltaY < 0 && scrollAccumulator > 0) {
      // Reversibilité : on annule
      e.preventDefault();
      scrollAccumulator += e.deltaY;
      if (scrollAccumulator < 0) scrollAccumulator = 0;
    } else {
      // Nettoyage de sécurité si on remonte violemment
      if (scrollAccumulator > 0) {
        scrollAccumulator = 0;
        gsap.to(fill, { scaleX: 0, duration: 0.3 });
        gsap.to(glassOverlay, { backgroundColor: "rgba(255, 255, 255, 0)", backdropFilter: "blur(0px)", duration: 0.3 });
      }
      return;
    }

    const progress = Math.min(scrollAccumulator / scrollTarget, 1);

    // La jauge se remplit en fonction du scroll
    gsap.to(fill, { scaleX: progress, duration: 0.1, overwrite: true });

    // Le verre s'opacifie et se floute
    gsap.to(glassOverlay, {
      backgroundColor: `rgba(255, 255, 255, ${progress * 0.95})`,
      backdropFilter: `blur(${progress * 25}px)`,
      duration: 0.1,
      overwrite: true
    });

    if (progress >= 0.99) goToNext();
  };

  window.addEventListener('wheel', currentWheelHandler, { passive: false });
}


// ==============================================================================
// 6. COMPOSANTS UI (Menu, Horloge, Vidéo)
// ==============================================================================

// Menu mobile : le carré noir (#mobile-menu) grandit depuis le coin haut-droit
// (top/right fixes, seuls width/height animent) pour libérer de la place en
// bas-gauche et accueillir les liens. Même easing "expo.inOut" que le reste
// du site (modale à propos, transition pull-to-next-project).
function initMenu() {
  const menuBtn    = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (!menuBtn || !mobileMenu) return;

  // Fix : empêche d'empiler plusieurs listeners sur le même élément DOM persistant.
  // Le flag vit sur l'élément lui-même (pas la variable partagée menuInitialized,
  // remise à false à chaque transition Barba) car #mobile-menu et #menu-btn ne
  // sont jamais remplacés d'une page à l'autre (ils sont hors du container Barba).
  if (mobileMenu.dataset.menuBound) return;
  mobileMenu.dataset.menuBound = "true";

  const menuLinks     = mobileMenu.querySelectorAll(".mobile-menu-inner a:not(.about-btn-mobile)");
  const mobileAboutBtn = mobileMenu.querySelector(".about-btn-mobile");
  let menuOpen = false;

  const CLOSED_SIZE    = 10; // même taille que .circlegrid
  const CORNER_GROWTH  = 6;  // px gagnés vers le haut/droite à l'ouverture, pour que
                              // le carré noir déborde du carré blanc de fermeture au
                              // lieu de s'arrêter pile à son coin (meilleure lisibilité)
  const customEase  = "expo.inOut";

  gsap.set(mobileMenu, { top: CLOSED_SIZE, right: CLOSED_SIZE, width: CLOSED_SIZE, height: CLOSED_SIZE });

  const tl = gsap.timeline({ paused: true })
    .to(mobileMenu, {
      top:    CLOSED_SIZE - CORNER_GROWTH,
      right:  CLOSED_SIZE - CORNER_GROWTH,
      width:  () => Math.min(window.innerWidth * 0.82, 380),
      height: () => Math.min(window.innerHeight * 0.62, 460),
      duration: 0.9,
      ease: customEase,
    })
    .to(mobileMenu.querySelectorAll(".mobile-menu-inner a"), {
      opacity: 1,
      duration: 0.5,
      stagger: 0.06,
      ease: "power2.out",
    }, "-=0.45");

  const closeMenu = () => {
    if (!menuOpen) return;
    menuOpen = false;
    menuBtn.setAttribute("aria-expanded", "false");
    tl.reverse();
  };

  menuBtn.addEventListener("click", () => {
    menuOpen = !menuOpen;
    menuBtn.setAttribute("aria-expanded", String(menuOpen));
    menuOpen ? tl.play() : tl.reverse();
  });

  menuLinks.forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // "à propos" mobile : ferme le panneau et délègue au vrai bouton desktop
  // (c'est lui qui porte toute la logique de la modale "à propos").
  if (mobileAboutBtn) {
    mobileAboutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
      document.getElementById("about-btn")?.click();
    });
  }
}

function autoplayVideoWhenVisible() {
  const video = document.querySelector("video");
  if (!video) return;

  video.pause();
  video.currentTime = 0;

  if (window.videoObserver) window.videoObserver.disconnect();

  window.videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) video.play().catch(e => console.error("Auto-play error", e));
      else video.pause();
    });
  }, { threshold: 0.5 });

  window.videoObserver.observe(video);
}



// Fix : chaîne unique, référence stockée pour éviter les doublons
function updateClock() {
  if (clockTimeout) clearTimeout(clockTimeout);
  const franceTime = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" });
  document.querySelectorAll(".clock").forEach(el => { el.textContent = franceTime; });
  clockTimeout = setTimeout(updateClock, 1000);
}


// ==============================================================================
// 7. INITIALISATIONS GLOBALES & SWIPER
// ==============================================================================
function initializtions() {
  const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Swiper infini principal
  const swiperConfig = {
    loopedSlides: 8, direction: "horizontal", loop: true,
    slidesPerView: "auto", freeMode: true, cssMode: true,
    mousewheel: { speed: 700 },
    on: {
      init: function () { this.slideTo(this.loopedSlides); },
      slideChange: function () {
        const currEl = document.getElementById("currentSlide");
        const totEl  = document.getElementById("totalSlides");
        if (currEl) currEl.textContent = this.realIndex + 1;
        if (totEl)  totEl.textContent  = this.loopedSlides;
      },
    },
    breakpoints: !isDesktop ? { 768: { slidesPerView: 2, spaceBetween: 20, loop: false } } : {},
  };

  const mainSwiper = document.querySelector('.infinite-container')
    ? new Swiper(".infinite-container", swiperConfig)
    : null;

  if (mainSwiper) {
    mainSwiper.on("slideChange", function () {
      const progress     = (this.realIndex + 1) / (this.slides.length / 2.5);
      const circle       = document.querySelector(".progress-circle");
      if (circle) {
        const circumference = 2 * Math.PI * 18;
        circle.setAttribute("stroke-dasharray", `${progress * circumference}, ${circumference}`);
        circle.setAttribute("stroke", "rgba(255, 71, 126, 1)");
      }
    });
  }

  // Text Hover Blocks (hors galerie)
  const hoverTextContainer = document.getElementById("hoverTextContainer");
  document.querySelectorAll(".thumbContainer").forEach(container => {
    // Lu à chaque survol (et non mis en cache ici) pour refléter la langue courante
    container.addEventListener("mouseenter", () => {
      if (!hoverTextContainer) return;
      const textHtml = container.querySelector(".info-projet p")?.innerHTML.replace(/<br\s*\/?>/gi, "||br||") || "";
      hoverTextContainer.innerHTML = "";
      const fragment = document.createDocumentFragment();
      textHtml.split("||br||").forEach((lineText, index) => {
        const lineDiv      = document.createElement("div");
        lineDiv.classList.add("line");
        lineDiv.style.setProperty("--line-index", index);
        const tempDiv      = document.createElement("div");
        tempDiv.innerHTML  = lineText;
        lineDiv.textContent = tempDiv.textContent || "";
        fragment.appendChild(lineDiv);
      });
      hoverTextContainer.appendChild(fragment);
      hoverTextContainer.style.display = "block";
    });

    container.addEventListener("mouseleave", () => {
      if (hoverTextContainer) hoverTextContainer.style.display = "none";
    });
  });

  // Sliders Main & Thumb (pages projet)
  if (document.querySelector('.main-slider') && document.querySelector('.thumb-slider')) {
    const mainSlider = new Swiper(".main-slider", {
      direction: "vertical", slidesPerView: "auto", centeredSlides: true,
      mousewheel: true, spaceBetween: 10, freeMode: true,
      keyboard: { enabled: true, onlyInViewport: true },
    });

    const thumbSlider = new Swiper(".thumb-slider", {
      direction: "vertical", slidesPerView: "auto", centeredSlides: true, spaceBetween: 10,
    });

    mainSlider.controller.control  = thumbSlider;
    thumbSlider.controller.control = mainSlider;

    document.querySelectorAll(".thumb-slider .swiper-slide").forEach((slide, i) => {
      slide.style.opacity   = 0;
      slide.style.animation = `slideUp 0.5s ease forwards ${i * 0.3}s`;
    });
    document.querySelectorAll(".main-slider .swiper-slide").forEach((slide, i) => {
      slide.style.opacity   = 0;
      slide.style.animation = `slideUp 1.5s ease forwards ${i * 0.3}s`;
    });
  }
}


// ==============================================================================
// 8. TRANSITION BARBA — IMAGE ZOOM
// ==============================================================================
function transitionWithBackgroundImage(imgToAnimate, callback) {
  if (!imgToAnimate) { callback?.(); return; }

  const imageContainer   = imgToAnimate.closest('.relative-home') || imgToAnimate;
  const rect             = imageContainer.getBoundingClientRect();
  const imgComputedStyle = window.getComputedStyle(imgToAnimate);

  // Enveloppe de transition (le masque)
  const cloneWrapper = document.createElement("div");
  cloneWrapper.classList.add("background-clone", "from-image-transition");
  cloneWrapper.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    z-index: 100;
    margin: 0;
    overflow: hidden;
  `;

  // Image clonée en haute définition
  const cloneImg = document.createElement("img");
  let imageUrl   = imgToAnimate.src;
  const extIndex = imageUrl.lastIndexOf(".");
  cloneImg.src   = `${imageUrl.substring(0, extIndex)}-h${imageUrl.substring(extIndex)}`;
  cloneImg.style.cssText = `
    width: 100%; height: 100%; object-fit: cover;
    position: absolute; top: 0; left: 0;
    transform: ${imgComputedStyle.transform};
  `;

  cloneWrapper.appendChild(cloneImg);
  document.body.appendChild(cloneWrapper);

  // Masque l'originale pour éviter le "fantôme"
  imgToAnimate.style.opacity = "0";

  const isMobile    = window.innerWidth < 768;
  // Doit correspondre exactement aux valeurs CSS de .imgClonedResize (voir
  // style.css, règle de base et son override mobile) : sinon le tween GSAP
  // s'arrête à une position différente de celle où la classe CSS "snap"
  // ensuite, ce qui recrée un petit saut résiduel à la fin de l'animation.
  const targetConfig = isMobile
    ? { width: "calc(100% - 20px)", height: "32vh", top: "100px", left: "10px", right: "10px" }
    : { width: "100vw", height: "50vh", top: "0px", left: "0px", right: "0px", opacity: 1 };

  // A. Animation du cadre
  gsap.to(cloneWrapper, {
    x: isMobile ? 0 : window.innerWidth  / 2 - rect.width  / 2 - rect.left,
    y: isMobile ? 0 : window.innerHeight / 2 - rect.height / 2 - rect.top,
    scale: isMobile ? 1 : 1.1,
    duration: 1.5,
    ease: "expo.inOut",
    onComplete: () => {
      // Sur les deux, un second tween anime réellement vers la taille/position
      // finale (bannière plein écran) — sans lui, .imgClonedResize (qui n'a
      // pas de transition CSS) applique ses valeurs instantanément : d'où le
      // "saut" observé sur mobile, qui sautait cette étape auparavant.
      gsap.to(cloneWrapper, {
        ...targetConfig, x: 0, y: 0, scale: 1, zIndex: -2, duration: 1.2, ease: "expo.inOut",
        onComplete: () => {
          setTimeout(() => {
            cloneWrapper.style.position = "absolute";
            cloneWrapper.classList.add("imgClonedResize");
            callback();
          }, 100);
        },
      });
    },
  });

  // B. Annulation douce de la parallaxe
  gsap.to(cloneImg, {
    transform: "matrix(1, 0, 0, 1, 0, 0)",
    duration: 1.5,
    ease: "expo.inOut",
  });

  // Disparition du reste de la page
  gsap.to(".indicator-container, .custom-gallery, #hoverTextContainer, .main-content", {
    opacity: 0, duration: 0.8,
  });
}



// ==============================================================================
// 9. BARBA.JS — TRANSITIONS DE PAGES
// ==============================================================================
// ==============================================================================
// 9. BARBA.JS — TRANSITIONS DE PAGES
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {

  // Préchargement des images haute définition (une seule fois)
  if (!localStorage.getItem("imagesPreloaded")) {
    document.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src");
      if (src) {
        const ext = src.substring(src.lastIndexOf("."));
        new Image().src = `${src.substring(0, src.lastIndexOf("."))}-h${ext}`;
      }
    });
    localStorage.setItem("imagesPreloaded", true);
  }

  // Rafraîchit ScrollTrigger quand une image finit de charger
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', () => ScrollTrigger.refresh());
  });

  const toggleNoOverlayClass = () => {
    const pagesWithNoOverlay = ["/index.html", "/", "/ai.html", "/contact.html", "/merci.html", "/ai", "/contact", "/merci"];
    document.body.classList.toggle(
      "noOverlay",
      pagesWithNoOverlay.some(p => window.location.pathname.endsWith(p))
    );
  };

  // ----------------------------------------------------------------------------
  // A. HOOKS GLOBAUX : S'exécutent pour TOUTES les transitions (y compris Pull to Next)
  // ----------------------------------------------------------------------------
  
  barba.hooks.beforeEnter((data) => {
    gsap.set(data.next.container, { opacity: 0 });
    if (data.next.url.path === "/" || data.next.url.path.endsWith("index.html")) {
      gsap.set(data.next.container.querySelectorAll(".gallery-item"), { y: "50vh", opacity: 0 });
    }
  });

  barba.hooks.afterEnter((data) => {
    window.scrollTo(0, 0);
    const nextContainer = data.next.container;

    // Réapplique la langue courante au nouveau contenu injecté par Barba
    // (le fetch renvoie le HTML source, donc toujours en FR par défaut)
    if (window.i18n) window.i18n.translate(window.i18n.getLang(), nextContainer, { fade: false });

    // Définition propre des variables de page
    const path = data.next.url.path;
    const isHome = path === "/" || path.endsWith("index.html");
    const isArchive = data.next.namespace === "archive"; 

    toggleGridButton(path);
    menuInitialized = false;

    // Initialisations communes
    initMenu();
    initSmoothScroll();
    updateClock();
    rollingText();
    autoplayVideoWhenVisible();
    toggleNoOverlayClass();
    initializtions();

    // Routage selon la page
    if (isHome) {
      initSmoothGallery();
      initProjectHoverAnimation();
      initPullToNextProject(nextContainer);
      if (typeof initComingSoonAnimations === "function") initComingSoonAnimations();
      adjustTextOpacity();
      animateTextOnEnter();

      const items = nextContainer.querySelectorAll(".gallery-item");
      gsap.to(items, {
        y: 0, opacity: 1, duration: 1.2, stagger: 0.05, ease: "power4.out", delay: 0.2,
        onComplete: () => gsap.set(items, { clearProps: "transform" }),
      });
      
    } else if (isArchive) {
      // Lance Matter.js si on arrive sur la page archive
      if (typeof initArchivePhysics === "function") initArchivePhysics();
      
    } else {
      // Projets classiques
      initPullToNextProject(nextContainer); // <--- Dissipe le voile blanc ici !
      initParallaxEffect();
      initProjectMiniNav(nextContainer);
      initSmoothGallery();
      initParallaxEffectForDivsAndTitles();
      adjustTextOpacity();
      animateTextOnEnter();
    }

    gsap.to(nextContainer, { opacity: 1, duration: 0.5 });
    document.querySelectorAll(".sticker").forEach(s => s.remove());
    document.querySelectorAll(".opacityhome").forEach(el => el.classList.remove("opacityhome"));
  });

  barba.hooks.beforeLeave(() => {
    const clone = document.querySelector(".background-clone.from-image-transition");
    if (clone) gsap.to(clone, { duration: 0.1, opacity: 0, onComplete: () => clone.remove() });
  });

  // ----------------------------------------------------------------------------
  // B. DÉFINITION DES TRANSITIONS
  // ----------------------------------------------------------------------------
  barba.init({
    preventRunning: true,
    transitions: [
      {
        name: 'next-project-transition',
        from: { namespace: ['detailpage'] },
        to: { namespace: ['detailpage'] },
        
        async leave(data) {
          const done = this.async();
          // On cache l'ancien contenu sous le voile blanc
          await gsap.to(data.current.container, { opacity: 0, duration: 0.5 });
          done();
        },

        async enter(data) {
          // Lancement de l'animation du "petit carré" vers le haut de page
          if (typeof animateNextProjectHero === "function") {
            await animateNextProjectHero(data);
          }
        }
      },
      {
        name: 'fade',
        once() {
          initializtions();
          initPullToNextProject();
          initAboutMagic()
          initProjectMiniNav();
          initMenu();
          autoplayVideoWhenVisible();
          toggleGridButton(window.location.pathname);
          updateClock();
          adjustTextOpacity();
          initProjectHoverAnimation();
          rollingText();
          if (typeof initComingSoonAnimations === "function") initComingSoonAnimations();
          initSmoothGallery();
          animateTextOnEnter();
          initParallaxEffect();
          initParallaxEffectForDivsAndTitles();
          initSmoothScroll();

          // Sécurité pour la page archive au rafraîchissement (F5)
          if (window.location.pathname.includes("archive") && typeof initArchivePhysics === "function") {
            initArchivePhysics();
          }
        },

        async leave(data) {
          const done = this.async();

          if (currentWheelHandler) {
            window.removeEventListener('wheel', currentWheelHandler);
            currentWheelHandler = null;
          }

          document.dispatchEvent(new Event("cleanOverlays"));

          if (galleryRAF) {
            cancelAnimationFrame(galleryRAF);
            galleryRAF = null;
          }

          ScrollTrigger.getAll().forEach(t => t.kill());

          const hasTrigger   = data.trigger && typeof data.trigger.querySelector === 'function';
          const imgToAnimate = hasTrigger ? data.trigger.querySelector("img") : null;

          if (imgToAnimate && data.current.namespace === 'homepage') {
            await transitionWithBackgroundImage(imgToAnimate, () => done());
          } else {
            await gsap.to(data.current.container, { opacity: 0, duration: 0.3, ease: "power2.inOut" });
            done();
          }
        }
      }
    ]
  });
});