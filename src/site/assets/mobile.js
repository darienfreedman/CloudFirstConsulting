import { createCarouselController } from "./carousel.js";
import { closeMobileDetails, showMobileDetails } from "./mobile-sheet.js";

const mobile = window.matchMedia("(max-width: 900px)");
const cleanups = [];
let rails = [];
let sequence = 0;

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function title(element) {
  const heading = element.querySelector("h2,h3")?.cloneNode(true);
  heading?.querySelectorAll("br").forEach(br => br.replaceWith(" "));
  return (heading?.textContent || element.getAttribute("aria-label") || "More to explore").replace(/\s+/g, " ").trim();
}

function shortTopic(label) {
  const trimmed = label.replace(/ Solutions$/, "");
  return label.length > 18 ? label.split(/\s+(?:and|&)\s+/)[0].replace(/ Solutions$/, "") : trimmed;
}

function unique(labels) {
  return new Set(labels).size === labels.length;
}

function topicLabels(cards) {
  const titles = cards.map(title);
  const kickers = cards.map((card, index) => {
    const label = card.querySelector(":scope > .card-kicker, :scope > .eyebrow, :scope > .icon-label .card-kicker, :scope > .icon-label .eyebrow, :scope > .practice-intro .eyebrow");
    return label?.textContent.trim() || titles[index];
  });
  // Tabs share one row, so long names keep their leading words ("Threat protection and data security" -> "Threat protection").
  const automatic = [kickers.map(shortTopic), kickers, titles.map(shortTopic), titles].find(unique) || titles;
  // Authors can name a tab directly when the card's own label is too long for a phone.
  const chosen = cards.map((card, index) => card.dataset.tabLabel || automatic[index]);
  return unique(chosen) ? chosen : automatic;
}

// Rows that cannot show every label in full move to two columns, then one, instead of cutting words off.
function fitTopicTabs(tabs) {
  tabs.classList.remove("mobile-topic-tabs-paired", "mobile-topic-tabs-stacked");
  const clipped = () => [...tabs.children].some(tab => tab.scrollWidth > tab.clientWidth + 1);
  if (!tabs.offsetParent || !clipped()) return;
  tabs.classList.add("mobile-topic-tabs-paired");
  if (clipped()) tabs.classList.replace("mobile-topic-tabs-paired", "mobile-topic-tabs-stacked");
}

// Each card banner gets its own drawn icon, matched to its subject and never repeated within one carousel.
const cardIcons = [
  [/engagement|starting|plan/i, "M8 5H6v16h12V5h-2M9 3h6v4H9zM9 11h6M9 15h4"],
  [/question|faq/i, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5M12 17h.01"],
  [/brief|pdf|download|one-pager/i, "M6 3h8l4 4v14H6zM14 3v4h4M12 10v6M9.5 13.5 12 16l2.5-2.5"],
  [/insight|perspective|idea/i, "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"],
  [/solution|practice|example|scenario/i, "M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z"],
  [/deep dive|technolog|how it works/i, "M7 7h10v10H7zM10 10h4v4h-4zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"],
  [/guidance|product|explain|glossary|guide/i, "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7M8 11h5"],
  [/threat|incident|detect|operations|monitor/i, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12l6-6"],
  [/security|protect|defen/i, "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6zM9 12l2 2 4-4"],
  [/privacy|trust|website|confiden/i, "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3"],
  [/identity|access|sign-in|permission/i, "M7.5 20a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.7 12.3 19 4M16 7l2 2M13.5 9.5l1.5 1.5"],
  [/data|information|record|knowledge/i, "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
  [/cloud|platform|infrastructure|foundation/i, "M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.4 1.5A3.5 3.5 0 0 1 17.5 18z"],
  [/copilot|agent|\bai\b|artificial/i, "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"],
  [/govern|complian|legal|policy/i, "M12 4v16M7 20h10M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"],
  [/people|team|work|staff|employee|collaborat/i, "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6"],
  [/roadmap|strategy|modern|journey|next/i, "M12 3v18M12 5h7l2 2.5-2 2.5h-7M12 13H5l-2 2.5L5 18h7"],
  [/assess|posture|readiness|review/i, "M4 18a8 8 0 1 1 16 0M12 18l3.5-5.5M7 13.5h.01M9 9.5h.01M15 9.5h.01"],
  [/evaluat|measure|value|result/i, "M4 20h16M7 16v-4M12 16V8M17 16v-7"],
  [/network|global|internet|connect/i, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"],
  [/device|endpoint|laptop|windows/i, "M5 5h14v10H5zM2 19h20"],
  [/industr|business|organi[sz]ation|company/i, "M4 21V8l8-5 8 5v13M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01"],
  [/contact|conversation|talk|chat/i, "M4 5h16v11H9l-5 4zM8 9h8M8 12h5"],
  [/process|automat|workflow/i, "M4 7h11l-3-3M20 17H9l3 3"]
];
const spareIcons = ["M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z", "M5 21V4h12l-2 4 2 4H5", "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"];

function pickIcon(text, used) {
  const match = cardIcons.find(([pattern, path]) => pattern.test(text) && !used.has(path));
  const path = match ? match[1] : [...cardIcons.map(([, icon]) => icon), ...spareIcons].find(icon => !used.has(icon));
  used.add(path);
  return path;
}

function fold(elements, label) {
  if (!elements.length) return;
  const details = create("details", "mobile-disclosure");
  details.append(create("summary", "", label));
  const positions = elements.map(element => {
    const marker = document.createComment("mobile-detail");
    element.before(marker);
    return { element, marker };
  });
  elements[0].before(details);
  details.append(...elements);
  cleanups.push(() => {
    for (const { element, marker } of positions) marker.replaceWith(element);
    details.remove();
  });
}

function prepareSummaryCard(card) {
  const paragraphs = [...card.querySelectorAll(":scope > p:not(.eyebrow):not(.card-kicker), :scope > .practice-intro > p:not(.eyebrow)")];
  if (card.dataset.mobileSummary && paragraphs.length) {
    const summary = create("p", "mobile-card-summary", card.dataset.mobileSummary);
    paragraphs[0].before(summary);
    fold(paragraphs, "Full overview");
    cleanups.push(() => summary.remove());
  } else if (paragraphs.length > 1) {
    fold(paragraphs.slice(1), "More context");
  }
  const details = [...card.querySelectorAll(".mobile-disclosure")].filter(detail => !detail.parentElement.closest(".mobile-disclosure"));
  if (details.length) {
    const storage = create("div", "mobile-detail-storage");
    storage.hidden = true;
    const positions = details.map(detail => {
      const marker = document.createComment("mobile-summary-detail");
      detail.before(marker);
      storage.append(detail);
      return { detail, marker };
    });
    const button = create("button", "mobile-details-trigger", "View details");
    const detailTitle = card.matches(".practice") ? topicLabels([card])[0] : title(card);
    button.type = "button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", `View details: ${detailTitle}`);
    card.append(button, storage);
    const open = () => showMobileDetails({ title: detailTitle, nodes: details, trigger: button, expandDetails: true });
    button.addEventListener("click", open);
    cleanups.push(() => {
      positions.forEach(({ detail, marker }) => marker.replaceWith(detail));
      button.remove();
      storage.remove();
    });
  }
  const links = [...card.children].filter(child => child.matches("a,.brief-card-actions,.use-case-links,.product-resource-links,.resource-hub-links,.mobile-details-trigger"));
  if (links.length) {
    const actions = create("div", "mobile-card-actions");
    const positions = links.map(link => {
      const marker = document.createComment("mobile-card-action");
      link.before(marker);
      actions.append(link);
      return { link, marker };
    });
    card.append(actions);
    cleanups.push(() => {
      positions.forEach(({ link, marker }) => marker.replaceWith(link));
      actions.remove();
    });
  }
}

function enhanceRail(track, name) {
  const all = [...track.children];
  if (all.length < 2) return;
  all.forEach(prepareSummaryCard);
  const attributes = ["role", "aria-label", "aria-roledescription", "tabindex", "inert", "id"];
  const originals = [track, ...all].map(element => ({
    element, values: attributes.map(attribute => [attribute, element.getAttribute(attribute)])
  }));
  const id = track.id || `mobile-collection-${++sequence}`;
  track.id = id;
  track.classList.add("mobile-rail");
  track.setAttribute("role", "region");
  track.setAttribute("aria-roledescription", "carousel");
  track.setAttribute("aria-label", name);
  track.tabIndex = 0;
  all.forEach(slide => {
    slide.classList.add("mobile-rail-card");
    // Articles keep their native role, which already permits a slide description; other elements become groups.
    if (slide.tagName !== "ARTICLE") slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
  });
  const usedIcons = new Set();
  const visuals = all.filter(slide => track.dataset.cardStyle !== "type" && !slide.querySelector(".capability-icon")).map(slide => {
    const visual = create("div", "mobile-card-visual");
    visual.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 280 64");
    svg.setAttribute("focusable", "false");
    const kicker = slide.querySelector(".card-kicker, .eyebrow")?.textContent || "";
    const icon = pickIcon(`${title(slide)} ${kicker}`, usedIcons);
    for (const [tag, attributes] of [
      ["path", { d: "M0 16h280M0 48h280M40 0v64M100 0v64M180 0v64M240 0v64", class: "mobile-visual-grid" }],
      ["path", { d: "M62 32h52m52 0h52", class: "mobile-visual-line mobile-visual-rail" }],
      ["circle", { cx: "58", cy: "32", r: "4", class: "mobile-visual-dot" }],
      ["circle", { cx: "222", cy: "32", r: "4", class: "mobile-visual-dot" }],
      ["circle", { cx: "140", cy: "32", r: "25" }],
      ["path", { d: icon, class: "mobile-visual-line mobile-visual-icon", transform: "translate(128 20)" }]
    ]) {
      const shape = document.createElementNS(svg.namespaceURI, tag);
      Object.entries(attributes).forEach(([attribute, value]) => shape.setAttribute(attribute, value));
      svg.append(shape);
    }
    visual.append(svg);
    slide.prepend(visual);
    return visual;
  });

  const toolbar = create("div", "mobile-rail-toolbar");
  const inlineTopics = all.length <= 4;
  const tabs = create("div", "mobile-topic-tabs");
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", `Topics in ${name}`);
  const browse = create("button", "mobile-browse-topics", "Browse topics");
  browse.type = "button";
  browse.setAttribute("aria-haspopup", "dialog");
  browse.setAttribute("aria-label", `Browse topics in ${name}`);
  const view = create("button", "mobile-view-toggle", "Show all");
  view.type = "button";
  view.setAttribute("aria-pressed", "false");
  view.setAttribute("aria-controls", id);
  toolbar.append(tabs, browse);
  let heading = track.parentElement.querySelector(":scope > .section-heading");
  let headingWrapper;
  if (!heading) {
    const title = track.parentElement.querySelector(":scope > h2");
    if (title) {
      headingWrapper = create("div", "mobile-carousel-heading");
      title.before(headingWrapper);
      headingWrapper.append(title);
      heading = headingWrapper;
    }
  }
  if (heading) {
    heading.classList.add("has-carousel-action");
    heading.append(view);
  } else toolbar.append(view);
  track.before(toolbar);

  const controls = create("div", "carousel-pagination");
  const dots = create("div", "carousel-dots");
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", `Choose a card in ${name}`);
  const status = create("span", "carousel-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  controls.append(dots, status);
  track.after(controls);
  let list = false;
  let currentSlide;
  let topicSheet;
  const items = () => all.filter(slide => !slide.hidden);

  function renderSelection(selected, slides) {
    currentSlide = slides[selected];
    controls.hidden = list || slides.length < 2;
    view.hidden = slides.length < 2;
    toolbar.hidden = slides.length < 2 || (list && !!heading);
    tabs.hidden = list || !inlineTopics;
    browse.hidden = list || inlineTopics;
    [...tabs.children].forEach((tab, index) => {
      if (index === selected) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    });
    status.textContent = slides.length ? `Card ${selected + 1} of ${slides.length}: ${title(slides[selected])}` : "No matching cards";
    [...dots.children].forEach((dot, index) => {
      if (index === selected) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    all.forEach(slide => {
      slide.inert = !list && slide !== slides[selected];
      const number = slides.indexOf(slide);
      slide.setAttribute("aria-label", `${number + 1} of ${slides.length}: ${title(slide)}`);
    });
  }

  function updateOptions() {
    topicSheet?.close();
    const visible = items();
    tabs.replaceChildren(...(inlineTopics ? topicLabels(visible).map((label, index) => {
      const tab = create("button", "mobile-topic-tab", label);
      tab.type = "button";
      tab.setAttribute("aria-controls", id);
      tab.addEventListener("click", () => controller.moveTo(index));
      return tab;
    }) : []));
    fitTopicTabs(tabs);
    dots.replaceChildren(...visible.map((slide, index) => {
      const dot = create("button", "carousel-dot");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to card ${index + 1} of ${visible.length}: ${title(slide)}`);
      dot.setAttribute("aria-controls", id);
      const marker = create("span");
      marker.setAttribute("aria-hidden", "true");
      dot.append(marker);
      dot.addEventListener("click", () => controller.moveTo(index));
      return dot;
    }));
  }
  updateOptions();
  const controller = createCarouselController(track, { items, onChange: renderSelection });
  browse.addEventListener("click", () => {
    const visible = items();
    const labels = topicLabels(visible);
    const picker = create("div", "mobile-topic-picker");
    const choices = create("div", "mobile-topic-list");
    visible.forEach((slide, index) => {
      const choice = create("button", "mobile-topic-choice");
      choice.type = "button";
      choice.append(create("span", "", labels[index]));
      if (slide === currentSlide) {
        choice.setAttribute("aria-current", "true");
      }
      choice.addEventListener("click", () => {
        topicSheet.close();
        controller.moveTo(index, "instant");
      });
      choices.append(choice);
    });
    picker.append(choices);
    topicSheet = showMobileDetails({ title: name, nodes: [picker], trigger: browse });
  });
  view.addEventListener("click", () => {
    list = !list;
    track.classList.toggle("mobile-rail-list", list);
    track.setAttribute("aria-roledescription", list ? "collection" : "carousel");
    view.textContent = list ? "Show cards" : "Show all";
    view.setAttribute("aria-pressed", String(list));
    controller.refresh();
  });
  const observer = new MutationObserver(() => { updateOptions(); controller.refresh(); });
  observer.observe(track, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
  // Refit only when the row's width changes; refitting changes its height, which must not trigger another pass.
  let fittedWidth = -1;
  const tabSizer = "ResizeObserver" in window ? new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width === fittedWidth) return;
    fittedWidth = width;
    fitTopicTabs(tabs);
  }) : null;
  tabSizer?.observe(tabs);
  document.fonts?.ready.then(() => fitTopicTabs(tabs));
  rails.push({
    track,
    reveal(target) {
      controller.refresh();
      controller.reveal(target);
    }
  });
  cleanups.push(() => {
    observer.disconnect();
    tabSizer?.disconnect();
    controller.destroy();
    topicSheet?.close();
    view.remove();
    heading?.classList.remove("has-carousel-action");
    if (headingWrapper) {
      headingWrapper.before(...headingWrapper.children);
      headingWrapper.remove();
    }
    toolbar.remove();
    controls.remove();
    track.classList.remove("mobile-rail", "mobile-rail-list");
    visuals.forEach(visual => visual.remove());
    all.forEach(slide => slide.classList.remove("mobile-rail-card"));
    for (const { element, values } of originals) {
      for (const [attribute, value] of values) {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      }
    }
  });
}

function enhancePractices() {
  const navigation = document.querySelector(".practice-nav");
  if (!navigation) return;
  const practices = [...navigation.parentElement.querySelectorAll(":scope > .practice")];
  if (!practices.length) return;
  const track = create("div", "mobile-practices");
  navigation.after(track);
  const markers = practices.map(element => {
    const marker = document.createComment("mobile-practice");
    element.before(marker);
    track.append(element);
    return { element, marker };
  });
  const hidden = navigation.hidden;
  navigation.hidden = true;
  cleanups.push(() => {
    navigation.hidden = hidden;
    markers.forEach(({ element, marker }) => marker.replaceWith(element));
    track.remove();
  });
  practices.forEach(practice => {
    fold([...practice.querySelectorAll(":scope > .practice-detail")], "Scope, deliverables & next steps");
  });
  enhanceRail(track, navigation.getAttribute("aria-label"));
  fold([...document.querySelectorAll(".service-hero > .service-blueprint, .service-hero > .outcome-strip")], "See how the approach works");
}

function enhanceDetails() {
  document.querySelectorAll(".engagement-card > dl").forEach(element => fold([element], "Scope & preparation"));
  document.querySelectorAll(".platform-group > .platform-products").forEach(element => fold([element], "Explore the connected tools"));
  document.querySelectorAll(".industry-card > ul").forEach(element => fold([element], "Industry priorities"));
  document.querySelectorAll(".use-case").forEach(card => {
    const details = [...card.children].filter(element =>
      !element.matches(".eyebrow,h2,.use-case-challenge,.use-case-links"));
    fold(details, "Approach, deliverables & requirements");
  });
  document.querySelectorAll(".product-entry").forEach(card => {
    const paragraphs = [...card.querySelectorAll(":scope > p")];
    fold([...paragraphs.slice(1), ...card.querySelectorAll(":scope > ul, :scope > .product-resource-links")], "How it helps");
  });
  document.querySelectorAll(".framework-card").forEach(card => {
    const intro = card.querySelector(":scope > p:not(.eyebrow)");
    const children = [...card.children];
    if (intro) fold(children.slice(children.indexOf(intro) + 1), "Scope, considerations & sources");
  });
  document.querySelectorAll(".engagement-finder").forEach(element => fold([element], "Find the right engagement"));
}

function enhanceReading() {
  const article = document.querySelector(".article-body");
  if (!article) return;
  const headings = [...article.querySelectorAll("h2")];
  if (headings.length < 3) return;
  const index = create("details", "mobile-reading-index");
  index.append(create("summary", "", "On this page"));
  const nav = create("nav");
  nav.setAttribute("aria-label", "Article sections");
  headings.forEach(heading => {
    const link = create("a", "", heading.textContent);
    link.href = `#${heading.id}`;
    link.addEventListener("click", () => { index.open = false; });
    nav.append(link);
  });
  index.append(nav);
  article.before(index);
  cleanups.push(() => index.remove());
}

function revealFragment() {
  if (!mobile.matches || !window.location.hash) return;
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); }
  catch (error) {
    if (!(error instanceof URIError)) throw error;
    console.warn("Unable to reveal an invalid mobile page fragment.");
    return;
  }
  const fragment = document.getElementById(id);
  const target = fragment?.closest(".personal-profile") || fragment;
  if (!target) return;
  const rail = rails.find(rail => rail.track.contains(target));
  if (target.closest(".catalog-card[hidden]")) {
    document.dispatchEvent(new CustomEvent("cloud-first:catalog-reveal", { detail: target }));
  }
  requestAnimationFrame(() => {
    rail?.reveal(target);
    const storage = target.closest(".mobile-detail-storage");
    if (storage) storage.parentElement.querySelector(".mobile-details-trigger").click();
    else {
      let details = target.closest("details");
      while (details) { details.open = true; details = details.parentElement.closest("details"); }
    }
    target.scrollIntoView({ block: "start", behavior: "instant" });
  });
}

function clear() {
  closeMobileDetails();
  while (cleanups.length) cleanups.pop()();
  rails = [];
}

function update() {
  clear();
  if (!mobile.matches) return;
  enhanceDetails();
  enhancePractices();
  const selectors = ".card-grid,.catalog-grid,.brief-grid,.use-case-grid,.engagement-grid,.platform-grid,.sector-hub-grid,.source-list,.resource-hub,.framework-guide,.approach-grid,.blueprint-flow";
  document.querySelectorAll(`main :is(${selectors})`).forEach(track => {
    if (track.closest("[data-react-ai-focus]") || track.querySelector(".mobile-rail")) return;
    const context = track.closest("section");
    enhanceRail(track, context?.getAttribute("aria-label") || (context ? title(context) : title(track)));
  });
  enhanceReading();
  document.querySelectorAll(".footer-directory > nav").forEach(nav => {
    fold([...nav.children].filter(element => element.matches("a")), nav.querySelector("h2").textContent);
    nav.classList.add("mobile-footer-nav");
    cleanups.push(() => nav.classList.remove("mobile-footer-nav"));
  });
  revealFragment();
}

// Generate the same reading anchors on desktop and mobile for shareable links.
document.querySelectorAll(".article-body h2").forEach((heading, position) => {
  if (heading.id) return;
  let id = `reading-${position + 1}`;
  while (document.getElementById(id)) id += "-section";
  heading.id = id;
});
mobile.addEventListener("change", update);
window.addEventListener("beforeprint", clear);
window.addEventListener("afterprint", update);
window.addEventListener("hashchange", revealFragment);
document.addEventListener("click", event => {
  if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
  const destination = new URL(link.href);
  if (destination.origin === location.origin && destination.pathname === location.pathname && destination.hash === location.hash) revealFragment();
});
update();
