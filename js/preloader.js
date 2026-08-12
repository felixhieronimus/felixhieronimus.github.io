// ==============================================================================
// PRELOADER "CHAOS TO ORDER" - VERSION SÉCURISÉE BARBA.JS
// ==============================================================================

// On ajoute "context" pour ne chercher que dans la nouvelle page chargée
window.triggerPreloader = function(context = document) {
  window.isPreloaderActive = true; 
  initPreloader(context);
};

// APRÈS
document.addEventListener("DOMContentLoaded", function() {
  const path = window.location.pathname;
  if (path === "/" || path.includes("index.html")) {
    window.isPreloaderActive = true;
    initPreloader(document);
  }
});

function initPreloader(context) {
  const preloader = document.createElement('div');
  preloader.id = 'preloader';
  preloader.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #ffffff; z-index: 20000;
  `;
  document.body.prepend(preloader);
  document.body.style.pointerEvents = 'none';

  const imagesContainer = document.createElement('div');
  imagesContainer.id = 'preloader-images';
  preloader.appendChild(imagesContainer);

  // On cherche UNIQUEMENT dans la nouvelle page pour éviter les doublons
  const containers = context.querySelectorAll('.gallery-track .gallery-item:not(.is-clone) .relative-home');
  const clones = [];

  containers.forEach((container, index) => {
    const originalImg = container.querySelector('.initial-image');
    if (!originalImg) return;

    // On cache l'originale pour l'instant (Ghosting)
    gsap.set(originalImg, { opacity: 0 });

    const cloneWrapper = document.createElement('div');
    cloneWrapper.style.cssText = `
      position: fixed; 
      width: 10px; height: 10px;
      top: 50%; left: 50%;
      overflow: hidden;
      opacity: 0;
      z-index: ${20000 + index};
      will-change: transform, width, height, top, left;
    `;
    
    // Centrage GSAP propre
    gsap.set(cloneWrapper, { xPercent: -50, yPercent: -50 });

    const cloneImg = originalImg.cloneNode();
    cloneImg.style.cssText = `
      width: 100%; height: 100%; object-fit: cover;
      transform: scale(2); 
    `;

    cloneWrapper.appendChild(cloneImg);
    imagesContainer.appendChild(cloneWrapper);
    clones.push({ cloneWrapper, cloneImg, originalContainer: container, originalImg });
  });

  // SÉCURITÉ : Si aucune image n'est trouvée, on débloque tout immédiatement
  if (clones.length === 0) {
    preloader.remove();
    document.body.style.pointerEvents = 'all';
    window.isPreloaderActive = false;
    return;
  }

  const customEase = "expo.inOut"; 

const tl = gsap.timeline({
    onComplete: () => {
      
      // 1. LE PASSAGE DE RELAIS (POUR LES IMAGES)
      clones.forEach(c => {
        gsap.set(c.originalImg, { opacity: 1, visibility: "visible" });
        gsap.set(c.originalContainer, { opacity: 1, y: 0, clearProps: "transform" });
      });

      // 2. ON RALLUME LE RESTE DU SITE (HEADER, UI, ETC.)
      const elements = document.querySelectorAll('.opacityhome');
      elements.forEach(el => {
        el.classList.add('page-loaded');
        // On fait un joli fondu pour que le header apparaisse en douceur
        gsap.to(el, { opacity: 1, duration: 1.2, ease: "expo.inOut" });
      });
      
      // 3. DISPARITION DU PRELOADER
      gsap.to(preloader, { 
        opacity: 0, 
        duration: 0.8, 
        onComplete: () => {
          preloader.remove();
          document.body.style.pointerEvents = 'all';
          window.isPreloaderActive = false; // On libère le scroll
        } 
      });
    }
  });

  // 1. Apparition
  tl.to(clones.map(c => c.cloneWrapper), {
    opacity: 1, duration: 0.5, stagger: 0.008, ease: "power2.inOut"
  });

  // 2. Explosion en particules
  tl.to(clones.map(c => c.cloneWrapper), {
    left: () => `${Math.random() * 80 + 10}vw`,
    top: () => `${Math.random() * 80 + 10}vh`,
    duration: 1.2, ease: customEase, stagger: 0.005
  });

  // 3. Grossissement
  tl.to(clones.map(c => c.cloneWrapper), {
    width: "10vw", height: "13vw", duration: 1.2, ease: customEase, stagger: 0.005
  }, "+=0.4");

  // 4. Placement Final
  tl.add("finalPlacement", "+=0.3");

  clones.forEach((clone) => {
    tl.to(clone.cloneWrapper, {
      top: () => clone.originalContainer.getBoundingClientRect().top,
      left: () => clone.originalContainer.getBoundingClientRect().left,
      width: () => clone.originalContainer.getBoundingClientRect().width,
      height: () => clone.originalContainer.getBoundingClientRect().height,
      xPercent: 0, // <--- ANNULE LE DÉCALAGE POUR QU'ELLES SOIENT COLLÉES EN BAS
      yPercent: 0,
      duration: 2, ease: customEase
    }, "finalPlacement");

    tl.to(clone.cloneImg, {
      transform: () => clone.originalImg.style.transform || "scale(1.5)",
      duration: 2, ease: customEase
    }, "finalPlacement");
  });
}
