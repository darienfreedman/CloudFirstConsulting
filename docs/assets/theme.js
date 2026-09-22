"use strict";

(() => {
  const storageKey = "cloud-first-color-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");

  function storageWarning(error) {
    if (!(error instanceof DOMException) || !["SecurityError", "QuotaExceededError"].includes(error.name)) throw error;
    console.warn("Appearance preference storage is unavailable. Theme changes apply to this page only.");
  }

  function readPreference() {
    try {
      const value = localStorage.getItem(storageKey);
      if (value === "light" || value === "dark") return value;
      if (value !== null) console.warn("Ignoring an invalid saved appearance preference.");
      return null;
    } catch (error) {
      storageWarning(error);
      return null;
    }
  }

  let preference = readPreference();
  function applyTheme() {
    const theme = preference || (system.matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#111827" : "#0078d4";
    for (const button of document.querySelectorAll(".theme-toggle")) {
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }
    window.dispatchEvent(new CustomEvent("cloud-first:themechange", { detail: { theme } }));
  }

  // Run before styles and page content load to avoid a light flash on dark pages.
  applyTheme();
  system.addEventListener("change", () => {
    if (preference === null) applyTheme();
  });
  window.addEventListener("storage", event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = readPreference();
    applyTheme();
  });

  function initializeToggle() {
    for (const button of document.querySelectorAll(".theme-toggle")) {
      button.hidden = false;
      button.addEventListener("click", () => {
        preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme();
        try {
          localStorage.setItem(storageKey, preference);
        } catch (error) {
          storageWarning(error);
        }
      });
    }
    applyTheme();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeToggle, { once: true });
  } else {
    initializeToggle();
  }
})();
