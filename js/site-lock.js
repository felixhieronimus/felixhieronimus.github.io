// ==============================================================================
// PROTECTION "SITE EN CONSTRUCTION" — verrou par mot de passe côté client
// ==============================================================================
// ATTENTION : ceci n'est PAS une vraie sécurité. Le site est statique (GitHub
// Pages) : n'importe qui peut télécharger tout le HTML/CSS/JS/images, y
// compris ce fichier et le mot de passe qu'il contient, sans jamais avoir à
// le "casser". C'est un simple filtre poli pour décourager les visiteurs non
// invités tant que le site est en construction — à retirer une fois le site
// prêt à être rendu public.
(function () {
  const PASSWORD    = "Felix";
  const STORAGE_KEY = "site-unlocked";

  if (localStorage.getItem(STORAGE_KEY) === "true") return;

  // Masque la page immédiatement (avant même que le <body> soit parsé, ce
  // script doit être placé tout en haut du <head>) pour éviter un flash de
  // contenu non protégé.
  document.documentElement.style.visibility = "hidden";

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "site-lock-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      color: #fff;
      font-family: "Ridley Grotesk", sans-serif;
      text-transform: uppercase;
    `;

    overlay.innerHTML = `
      <form id="site-lock-form" style="display:flex; flex-direction:column; align-items:center; gap:20px; width:90vw; max-width:320px;">
        <p style="margin:0; font-size:11px; letter-spacing:1px; opacity:0.6;">Site en construction</p>
        <input
          type="password"
          id="site-lock-input"
          placeholder="Mot de passe"
          autocomplete="off"
          spellcheck="false"
          style="width:100%; box-sizing:border-box; background:none; border:none; border-bottom:1px solid #fff; color:#fff; font-size:14px; text-align:center; padding:10px 0; outline:none; text-transform:uppercase;"
        />
        <p id="site-lock-error" style="margin:0; font-size:10px; color:#ff477e; opacity:0; transition:opacity 0.3s;">Mot de passe incorrect</p>
        <button
          type="submit"
          style="background:#fff; color:#000; border:none; padding:10px 25px; font-size:11px; letter-spacing:0.5px; cursor:pointer; text-transform:uppercase;"
        >Entrer</button>
      </form>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    document.documentElement.style.visibility = "visible";

    const form  = overlay.querySelector("#site-lock-form");
    const input = overlay.querySelector("#site-lock-input");
    const error = overlay.querySelector("#site-lock-error");

    input.focus();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value.trim() === PASSWORD) {
        localStorage.setItem(STORAGE_KEY, "true");
        overlay.style.transition = "opacity 0.4s ease";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          document.body.style.overflow = "";
        }, 400);
      } else {
        error.style.opacity = "1";
        input.value = "";
        input.focus();
      }
    });
  }

  if (document.body) buildOverlay();
  else document.addEventListener("DOMContentLoaded", buildOverlay);
})();
