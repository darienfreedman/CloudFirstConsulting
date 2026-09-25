"use strict";

// Progressive, reduced-motion-aware effects. Content is fully visible without this script.
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches || !("IntersectionObserver" in window) || !root.animate) return;

  const singles = [
    ".section-heading", ".challenge-copy", ".signal-map", ".company-grid", ".closing-section",
    ".service-hero>.service-photo", ".blueprint-heading", ".blueprint-note", ".practice-intro", ".practice-detail", ".service-next",
    ".article-body>h2", ".article-aside", ".resource-hub-group>h2", ".resource-hub-group>p", ".faq-group-heading", ".faq-index", ".contact-steps", ".faq-list", ".engagement-finder", ".catalog-toolbar",
    ".contact-aside", ".personal-profile", ".service-assurance", ".outcome-strip", ".catalog-group>.section-heading"
  ];
  const staggered = [
    ".card-grid>*", ".platform-grid>*", ".home-steps>li", ".catalog-grid>*", ".brief-grid>*", ".engagement-grid>*",
    ".use-case-grid>*", ".sector-hub-grid>*", ".source-list>*", ".approach-grid>*", ".resource-hub-links>*",
    ".blueprint-flow>li", ".ai-focus-cards>*", ".signal-tags>li", ".home-stats li", ".service-directory>*"
  ];
  const excluded = ".mobile-rail, .mobile-practices, .mobile-disclosure, dialog, .nav-panel, [hidden], [inert]";
  const ease = "cubic-bezier(.2,.7,.2,1)";

  function unmask(image, delay) {
    const radius = getComputedStyle(image).borderRadius || "0px";
    image.animate([
      { clipPath: `inset(7% 7% 7% 7% round ${radius})`, transform: "scale(1.06)" },
      { clipPath: `inset(0 0 0 0 round ${radius})`, transform: "none" }
    ], { duration: 1100, delay, easing: ease, fill: "backwards" });
  }

  function reveal(element, delay) {
    delete element.dataset.reveal;
    element.animate([
      { opacity: 0, transform: "translateY(28px)" },
      { opacity: 1, transform: "none" }
    ], { duration: 700, delay, easing: ease, fill: "backwards" });
    element.querySelectorAll(":scope > img, :scope > figure > img, .service-photo img").forEach(image => unmask(image, delay));
  }

  const observer = new IntersectionObserver(entries => {
    const batches = new Map();
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const parent = entry.target.parentElement;
      batches.set(parent, [...(batches.get(parent) || []), entry.target]);
    }
    for (const batch of batches.values()) batch.forEach((element, index) => reveal(element, Math.min(index, 5) * 90));
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.1 });

  const belowFold = element => element.getBoundingClientRect().top > window.innerHeight * 0.9;

  function prime() {
    document.querySelectorAll(`main :is(${[...singles, ...staggered].join(",")})`).forEach(element => {
      if (element.dataset.revealPrimed || element.closest(excluded) || element.parentElement.closest("[data-reveal]")) return;
      element.dataset.revealPrimed = "";
      if (!belowFold(element)) return;
      element.dataset.reveal = "pending";
      observer.observe(element);
    });
  }

  // Numbers ease up from zero the first time they enter the viewport.
  const counters = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    counters.unobserve(entry.target);
    const element = entry.target;
    const target = Number(element.dataset.countTo);
    const start = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - start) / 1600);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });

  // Filtered cards, menus, and switched tab panels fade in instead of appearing abruptly.
  const fadeIn = element => element.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: ease });
  new MutationObserver(records => {
    for (const { target } of records) {
      if (!target.hidden && target.matches(".catalog-card, .catalog-group, .nav-panel, .react-finder-result")) fadeIn(target);
    }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("click", event => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    requestAnimationFrame(() => {
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (panel && !panel.hidden) fadeIn(panel);
    });
  });

  // Homepage topic chips glide past on phones instead of spilling off the edge of the hero card.
  const topics = document.querySelector(".hero-topics");
  const phone = window.matchMedia("(max-width: 900px)");
  if (topics) {
    const links = [...topics.querySelectorAll(":scope > a")];
    let viewport;
    const build = () => {
      if (viewport || !phone.matches) return;
      viewport = document.createElement("div");
      viewport.className = "hero-topics-viewport";
      const track = document.createElement("div");
      track.className = "hero-topics-track";
      const first = document.createElement("div");
      first.className = "hero-topics-set";
      first.append(...links);
      const copy = first.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.inert = true;
      copy.querySelectorAll("a").forEach(link => link.tabIndex = -1);
      track.append(first, copy);
      viewport.append(track);
      topics.append(viewport);
      topics.classList.add("is-marquee");
      track.style.setProperty("--marquee-duration", `${Math.max(18, Math.round(first.scrollWidth / 30))}s`);
    };
    const unbuild = () => {
      if (!viewport) return;
      topics.append(...links);
      viewport.remove();
      viewport = null;
      topics.classList.remove("is-marquee");
    };
    build();
    phone.addEventListener("change", () => (phone.matches ? build() : unbuild()));
  }

  // Diagrams animate only while visible, which saves battery on phones.
  if ("IntersectionObserver" in window) {
    const visibility = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle("is-offscreen", !entry.isIntersecting)), { rootMargin: "80px 0px" });
    document.querySelectorAll(".page-visual, .signal-map, .practice-visual").forEach(diagram => visibility.observe(diagram));
    // Step sequences draw their connecting line once they come into view.
    const drawing = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-drawn");
      drawing.unobserve(entry.target);
    }), { threshold: 0.35 });
    document.querySelectorAll(".home-steps, .contact-steps").forEach(steps => {
      steps.classList.add("draws");
      drawing.observe(steps);
    });
  }

  // Answers in expandable sections slide open.
  document.addEventListener("toggle", event => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open || details.closest("dialog")) return;
    [...details.children].filter(child => child.tagName !== "SUMMARY")
      .forEach(child => child.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: ease }));
  }, true);

  function start() {
    prime();
    // Lazy photos fade in as they arrive instead of popping into place.
    document.querySelectorAll('main img[loading="lazy"]').forEach(image => {
      if (image.complete) return;
      image.addEventListener("load", () => image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: "ease-out" }), { once: true });
    });
    document.querySelectorAll("[data-count-to]").forEach(element => {
      if (element.dataset.countPrimed) return;
      element.dataset.countPrimed = "";
      if (belowFold(element)) { element.textContent = "0"; counters.observe(element); }
    });
  }
  // Wait for layout scripts such as mobile carousels to settle before measuring positions.
  // A slow third-party request can hold back the load event, so never wait longer than 1.5 seconds.
  let started = false;
  const run = () => {
    if (started) return;
    started = true;
    requestAnimationFrame(() => requestAnimationFrame(start));
  };
  if (document.readyState === "complete") run();
  else {
    window.addEventListener("load", run, { once: true });
    setTimeout(run, 1500);
  }
  // Layout changes (rotation, resizing across breakpoints) move content; show anything still waiting.
  const revealAll = () => document.querySelectorAll('[data-reveal="pending"]').forEach(element => {
    observer.unobserve(element);
    delete element.dataset.reveal;
  });
  window.matchMedia("(max-width: 900px)").addEventListener("change", revealAll);
  window.addEventListener("pagehide", revealAll);
  window.addEventListener("beforeprint", revealAll);
})();
