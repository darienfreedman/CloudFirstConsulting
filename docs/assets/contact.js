"use strict";

(() => {
  const settings = window.cloudFirstIntegrations;
  const results = new Map();
  function destination(key) {
    if (results.has(key)) return results.get(key);
    const value = settings?.[key];
    if (value === "") {
      results.set(key, null);
      return null;
    }
    let url;
    let error;
    if (typeof value !== "string") {
      error = "Contact integration must contain an approved URL.";
    } else {
      try {
        url = new URL(value);
      } catch (exception) {
        if (!(exception instanceof TypeError)) throw exception;
        error = "Contact integration URL is invalid.";
      }
      if (url && (url.protocol !== "https:" || url.username || url.password)) {
        error = "Contact integration requires HTTPS without embedded credentials.";
      }
    }
    if (error) {
      console.error(error);
      const notice = document.querySelector("[data-contact-error]");
      if (notice) {
        notice.textContent = "Contact options are temporarily unavailable. You can still explore our services and engagement guides below.";
        notice.hidden = false;
      }
      results.set(key, null);
      return null;
    }
    results.set(key, url.href);
    return url.href;
  }
  document.querySelectorAll("[data-provider]").forEach((container) => {
    const url = destination(container.dataset.provider);
    if (!url) return;
    const link = container.matches("a") ? container : container.querySelector("[data-provider-link]");
    if (!link) throw new Error("Contact action is missing its destination link.");
    link.href = url;
    link.rel = "noreferrer";
    container.hidden = false;
  });
  document.querySelectorAll("[data-provider-group]").forEach((group) => {
    group.hidden = !group.querySelector("[data-provider]:not([hidden])");
  });
})();
