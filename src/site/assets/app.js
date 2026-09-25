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
    const height = stickyHeader.getBoundingClientRect().height;
    const offset = getComputedStyle(stickyHeader).position === "sticky" ? height : 0;
    document.documentElement.style.setProperty("--header-height", `${height}px`);
    document.documentElement.style.setProperty("--header-scroll-offset", `${offset}px`);
  };
  updateScrollOffset();
  new ResizeObserver(updateScrollOffset).observe(stickyHeader);
}

// Background video plays only when motion and data preferences allow, and can always be paused.
const heroVideo = document.querySelector(".hero-video");
const heroVideoToggle = document.querySelector(".hero-video-toggle");
if (heroVideo && heroVideoToggle) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let userPaused = reducedMotion.matches || navigator.connection?.saveData === true;
  let visible = true;
  const render = () => {
    const playing = !heroVideo.paused;
    heroVideoToggle.setAttribute("aria-label", playing ? "Pause background video" : "Play background video");
    heroVideoToggle.classList.toggle("is-paused", !playing);
  };
  const sync = () => {
    if (userPaused || !visible || document.hidden) heroVideo.pause();
    else heroVideo.play().catch(() => { userPaused = true; render(); });
  };
  heroVideo.addEventListener("play", render);
  heroVideo.addEventListener("pause", render);
  heroVideoToggle.hidden = false;
  heroVideoToggle.addEventListener("click", () => {
    userPaused = !heroVideo.paused;
    sync();
    render();
  });
  reducedMotion.addEventListener("change", event => { if (event.matches) { userPaused = true; sync(); } });
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(heroVideo);
  render();
}

// Section indexes follow the reader so the current section is always clear.
for (const practiceNav of document.querySelectorAll(".practice-nav, .faq-index")) {
  if (!("IntersectionObserver" in window)) break;
  const links = [...practiceNav.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.getAttribute("href").slice(1))).filter(Boolean);
  const inView = new Set();
  const spy = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) inView.add(entry.target);
      else inView.delete(entry.target);
    }
    const current = sections.find(section => inView.has(section));
    for (const link of links) {
      const active = current && link.getAttribute("href") === `#${current.id}`;
      if (active) {
        if (link.getAttribute("aria-current") !== "true" && practiceNav.scrollWidth > practiceNav.clientWidth) {
          practiceNav.scrollTo({ left: link.offsetLeft - 24, behavior: "smooth" });
        }
        link.setAttribute("aria-current", "true");
      } else link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-30% 0px -60% 0px" });
  sections.forEach(section => spy.observe(section));
}

// Articles get a desktop table of contents that tracks the section being read.
const articleBody = document.querySelector(".article-body");
const articleAside = document.querySelector(".article-layout > .article-aside");
if (articleBody) {
  const headings = [...articleBody.querySelectorAll("h2")];
  // Match the reading anchors created for the mobile index so shared links work everywhere.
  headings.forEach((heading, position) => {
    if (heading.id) return;
    let id = `reading-${position + 1}`;
    while (document.getElementById(id)) id += "-section";
    heading.id = id;
  });
  if (articleAside && headings.length >= 3) {
    const rail = document.createElement("div");
    rail.className = "article-rail";
    const toc = document.createElement("nav");
    toc.className = "article-toc";
    toc.setAttribute("aria-label", "On this page");
    const title = document.createElement("p");
    title.className = "article-toc-title";
    title.textContent = "On this page";
    const list = document.createElement("ol");
    const links = headings.map(heading => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.replace(/\s+/g, " ").trim();
      item.append(link);
      list.append(item);
      return link;
    });
    toc.append(title, list);
    articleAside.before(rail);
    rail.append(toc, articleAside);
    let pending = false;
    const highlight = () => {
      pending = false;
      const limit = window.innerHeight * 0.3;
      let current = -1;
      headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top < limit) current = index; });
      links.forEach((link, index) => {
        if (index === Math.max(current, 0)) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };
    window.addEventListener("scroll", () => { if (!pending) { pending = true; requestAnimationFrame(highlight); } }, { passive: true });
    highlight();
  }
}

if (stickyHeader && window.matchMedia) {
  const compact = window.matchMedia("(max-width: 900px)");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  // On phones the header slides away while reading down and returns as soon as the reader scrolls up.
  let lastY = window.scrollY;
  let queued = false;
  // Arriving on a section link (for example the founder profile) keeps the header in place until the reader scrolls.
  let landing = Boolean(location.hash);
  const settle = () => { landing = false; lastY = window.scrollY; };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(type => window.addEventListener(type, settle, { once: true, passive: true }));
  const conceal = () => {
    queued = false;
    const y = window.scrollY;
    const delta = y - lastY;
    const allowed = compact.matches && !calm.matches && !landing && !document.body.classList.contains("navigation-open")
      && !stickyHeader.contains(document.activeElement);
    if (!allowed || y < 120) document.documentElement.classList.remove("header-concealed");
    else if (delta > 8) document.documentElement.classList.add("header-concealed");
    else if (delta < -8) document.documentElement.classList.remove("header-concealed");
    if (Math.abs(delta) > 8 || y < 120) lastY = y;
  };
  window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(conceal); } }, { passive: true });
  stickyHeader.addEventListener("focusin", () => document.documentElement.classList.remove("header-concealed"));

  // A compact contact shortcut appears on long mobile pages and steps aside near closing calls to action.
  const contactLink = stickyHeader.querySelector(".button.nav-direct");
  if (contactLink && !contactLink.hasAttribute("aria-current") && "IntersectionObserver" in window) {
    const shortcut = document.createElement("a");
    shortcut.className = "floating-cta";
    shortcut.href = contactLink.href;
    shortcut.append("Let's talk ");
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2192";
    shortcut.append(arrow);
    shortcut.inert = true;
    document.body.append(shortcut);
    const blockers = new Set();
    let shortcutQueued = false;
    const place = () => {
      shortcutQueued = false;
      const show = compact.matches && window.scrollY > window.innerHeight * 0.9 && blockers.size === 0
        && !document.body.classList.contains("navigation-open");
      shortcut.classList.toggle("is-visible", show);
      shortcut.inert = !show;
    };
    const watch = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) blockers.add(entry.target);
        else blockers.delete(entry.target);
      }
      place();
    });
    document.querySelectorAll(".closing-section, .service-next, .next-article, .site-footer, .react-contact-form").forEach(element => watch.observe(element));
    window.addEventListener("scroll", () => { if (!shortcutQueued) { shortcutQueued = true; requestAnimationFrame(place); } }, { passive: true });
    compact.addEventListener("change", place);
  }
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
const scrollDestinations = `${highlightedDestinations}, .resource-hub-group, .practice, .catalog-group, .product-guide-group, .use-case, .engagement-card, .article-body, .personal-profile`;

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
    const fragment = fragmentTarget();
    const target = fragment?.closest(".personal-profile") || fragment;
    if (target?.closest(scrollDestinations)) target.scrollIntoView({ block: "start", behavior: "instant" });
  }));
}
window.addEventListener("load", scrollToDestination);
