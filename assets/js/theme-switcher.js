// Encapsulation du code dans une fonction immédiatement invoquée
(function () {
  // Déclaration des variables
  const themeSwitcher = {
    button: document.querySelector(".js-theme-switcher"),
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)"),
    currentTheme: null,
  };

  // Initialisation du thème
  function initTheme() {
    if (localStorage.getItem("theme")) {
      themeSwitcher.currentTheme = localStorage.getItem("theme");
    } else if (themeSwitcher.prefersDark.matches) {
      themeSwitcher.currentTheme = "dark";
    } else {
      themeSwitcher.currentTheme = "light";
    }
    setTheme(themeSwitcher.currentTheme);
  }

  // Gestion du clic sur le bouton
  themeSwitcher.button.addEventListener("click", function () {
    themeSwitcher.currentTheme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    setTheme(themeSwitcher.currentTheme);
  });

  // Gestion du changement de préférence système
  themeSwitcher.prefersDark.addEventListener("change", function (event) {
    themeSwitcher.currentTheme = event.matches ? "dark" : "light";
    setTheme(themeSwitcher.currentTheme);
  });

  // Fonction pour définir le thème
  function setTheme(theme) {
    const pressed = theme === "dark" ? "true" : "false";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeSwitcher.button.setAttribute("aria-pressed", pressed);
  }

  // Initialisation
  initTheme();
})();
