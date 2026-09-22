"use strict";

const legacyPages = document.documentElement.dataset.legacyPages?.split(" ") || [];
if (legacyPages.length) {
  const root = new URL("../", document.currentScript.src);
  const current = new URL(window.location.href);
  if (current.origin === root.origin && current.pathname.startsWith(root.pathname)) {
    const page = current.pathname.slice(root.pathname.length);
    if (legacyPages.includes(page)) {
      const destination = new URL(page === "index.html" ? "./" : `${page.slice(0, -5)}/`, root);
      destination.search = current.search;
      destination.hash = current.hash;
      window.location.replace(destination.href);
    }
  }
}
