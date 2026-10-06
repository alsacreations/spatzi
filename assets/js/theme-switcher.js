// Encapsulation du code dans une fonction immédiatement invoquée
(function () {
  // Déclaration des variables
  const themeSwitcher = {
    button: document.querySelector(".js-theme-switcher"),
    label: document.querySelector(".js-theme-switcher-label"),
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)"),
    currentTheme: null,
  };

  // Initialisation du thème
  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {}
    if (stored) {
      themeSwitcher.currentTheme = stored;
    } else if (themeSwitcher.prefersDark.matches) {
      themeSwitcher.currentTheme = "dark";
    } else {
      themeSwitcher.currentTheme = "light";
    }
    setTheme(themeSwitcher.currentTheme, false);
  }

  // Gestion du clic sur le bouton
  themeSwitcher.button.addEventListener("click", function () {
    themeSwitcher.currentTheme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    setTheme(themeSwitcher.currentTheme, true);
  });

  // Gestion du changement de préférence système
  themeSwitcher.prefersDark.addEventListener("change", function (event) {
    themeSwitcher.currentTheme = event.matches ? "dark" : "light";
    setTheme(themeSwitcher.currentTheme, false);
  });

  // Fonction pour définir le thème (le bouton annonce le thème cible)
  function setTheme(theme, persist) {
    const isDark = theme === "dark";
    const action = isDark ? "Passer au thème clair" : "Passer au thème sombre";
    document.documentElement.setAttribute("data-theme", theme);
    themeSwitcher.button.setAttribute("aria-label", action);
    themeSwitcher.button.setAttribute("title", action);
    themeSwitcher.label.textContent = isDark ? "Clair" : "Sombre";
    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch {}
    }
  }

  // Initialisation
  initTheme();
})();
