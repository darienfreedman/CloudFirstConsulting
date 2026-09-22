"use strict";

if (document.documentElement.dataset?.siteRoot !== undefined && window.location.pathname.endsWith("/index.html")) {
  const destination = new URL(window.location.href);
  destination.pathname = destination.pathname.slice(0, -"index.html".length);
  window.location.replace(destination.href);
}

document.documentElement.classList.add("js");
const followMovedCategory = () => {
  const link = [...document.querySelectorAll("[data-resource-fragment]")]
    .find(link => `#${link.dataset.resourceFragment}` === window.location.hash);
  if (link) {
    const destination = new URL(link.href);
    destination.search = window.location.search;
    window.location.replace(destination.href);
  }
};
followMovedCategory();
window.addEventListener("hashchange", followMovedCategory);
const legacyTopicDestination = document.getElementById("legacy-topic-destination");
if (legacyTopicDestination) {
  const followMovedTopic = () => {
    const fragment = window.location.hash.slice(1);
    const topics = legacyTopicDestination.dataset.topics.split(" ");
    if (topics.includes(fragment) || ["technology-glossary", "technology-glossary-title"].includes(fragment)) {
      const destination = new URL(legacyTopicDestination.href);
      if (topics.includes(fragment)) destination.hash = fragment;
      destination.search = window.location.search;
      window.location.replace(destination.href);
    }
  };
  followMovedTopic();
  window.addEventListener("hashchange", followMovedTopic);
}
const insightsDestination = document.getElementById("insights-destination");
if (insightsDestination) {
  const fragment = window.location.hash.slice(1);
  const isCategory = [...document.querySelectorAll("[data-resource-fragment]")]
    .some(link => link.dataset.resourceFragment === fragment);
  const isTopic = legacyTopicDestination?.dataset.topics.split(" ").includes(fragment)
    || ["technology-glossary", "technology-glossary-title"].includes(fragment);
  if (!isCategory && !isTopic) {
    const destination = new URL(insightsDestination.href);
    destination.search = window.location.search;
    window.location.replace(destination.href);
  }
}
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("primary-nav");

if (menuButton && navigation) {
  const header = document.querySelector(".site-header");
  const desktop = window.matchMedia("(min-width: 901px)");
  const groups = [...navigation.querySelectorAll("[data-nav-section]")].map(element => ({
    element,
    trigger: element.querySelector("[data-nav-trigger]"),
    panel: element.querySelector(".nav-panel"),
    fallback: element.querySelector(".nav-fallback")
  }));
  function closePanels() {
    for (const group of groups) {
      group.trigger.setAttribute("aria-expanded", "false");
      group.panel.hidden = true;
    }
  }
  function openPanel(group) {
    closePanels();
    group.trigger.setAttribute("aria-expanded", "true");
    group.panel.hidden = false;
  }
  function closeNavigation() {
    closePanels();
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
    document.body.classList.remove("navigation-open");
  }
  for (const group of groups) {
    group.fallback.hidden = true;
    group.trigger.hidden = false;
    group.trigger.addEventListener("click", () => {
      if (group.panel.hidden) openPanel(group);
      else closePanels();
    });
    group.trigger.addEventListener("keydown", event => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      openPanel(group);
      (group.panel.querySelector("input") || group.panel.querySelector("a")).focus();
    });
  }
  menuButton.hidden = false;
  menuButton.addEventListener("click", () => {
    if (menuButton.getAttribute("aria-expanded") === "true") { closeNavigation(); return; }
    menuButton.setAttribute("aria-expanded", "true");
    navigation.classList.add("is-open");
    document.body.classList.toggle("navigation-open", !desktop.matches);
  });
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) closeNavigation();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const open = groups.find(group => !group.panel.hidden);
    if (open) { closePanels(); open.trigger.focus(); }
    else if (menuButton.getAttribute("aria-expanded") === "true") { closeNavigation(); menuButton.focus(); }
  });
  document.addEventListener("pointerdown", event => {
    if (!header.contains(event.target)) closeNavigation();
  });
  document.addEventListener("focusin", event => {
    const open = groups.find(group => !group.panel.hidden);
    if (open && !open.element.contains(event.target)) closePanels();
    if (!header.contains(event.target) && menuButton.getAttribute("aria-expanded") === "true") closeNavigation();
  });
  desktop.addEventListener("change", closeNavigation);
}

const stickyHeader = document.querySelector(".site-header");
if (stickyHeader) {
  const updateScrollOffset = () => {
    document.documentElement.style.setProperty("--header-scroll-offset", `${stickyHeader.getBoundingClientRect().height}px`);
  };
  updateScrollOffset();
  new ResizeObserver(updateScrollOffset).observe(stickyHeader);
}

function fragmentTarget() {
  try {
    return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    console.warn("Unable to navigate to an invalid page fragment.");
    return null;
  }
}

const highlightedDestinations = ".product-entry, .editorial-card";
const scrollDestinations = `${highlightedDestinations}, .resource-hub-group, .practice, .catalog-group, .product-guide-group, .use-case`;

function clearDestinationHighlight() {
  document.querySelectorAll(".is-highlighted").forEach(card => card.classList.remove("is-highlighted"));
}

function highlightDestination() {
  clearDestinationHighlight();
  const target = fragmentTarget();
  const panel = target?.closest(highlightedDestinations);
  if (!document.hidden && panel) panel.classList.add("is-highlighted");
}

highlightDestination();
window.addEventListener("hashchange", () => {
  highlightDestination();
  scrollToDestination();
});
window.addEventListener("pagehide", clearDestinationHighlight);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearDestinationHighlight();
});
document.addEventListener("click", event => {
  if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
  const destination = new URL(link.href, window.location.href);
  if (destination.origin === window.location.origin && destination.pathname === window.location.pathname
    && destination.search === window.location.search && destination.hash === window.location.hash) {
    highlightDestination();
    scrollToDestination();
  }
});
function scrollToDestination() {
  // Let native fragment scrolling, collapsed menus, and filtered groups settle first.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = fragmentTarget();
    if (target?.closest(scrollDestinations)) target.scrollIntoView({ block: "start", behavior: "instant" });
  }));
}
window.addEventListener("load", scrollToDestination);
