import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { header, syncAppearance, syncLinkArrows } from "./navigation.mjs";

const script = readFileSync(new URL("../src/site/assets/theme.js", import.meta.url), "utf8");
const key = "cloud-first-color-theme";

test("About relationship cards keep padding around their themed surfaces", () => {
  const css = readFileSync(new URL("../src/site/assets/experience.css", import.meta.url), "utf8");
  const card = css.match(/\.editorial-site:has\(\.personal-profile\) \.service-card\{([^}]+)\}/)?.[1];
  assert(card);
  assert.match(card, /padding:32px/);
  assert.match(card, /border:1px solid var\(--line\)/);
  assert.match(card, /background:var\(--panel\)/);
  assert.doesNotMatch(css, /service-card>h3\{padding-inline:4px/);
  assert.match(css, /\.service-card>p:last-child\{margin-bottom:0\}/);
});

test("controls share one shape system and the search dialog stays minimal", () => {
  const css = readFileSync(new URL("../src/site/assets/experience.css", import.meta.url), "utf8");
  const theme = readFileSync(new URL("../src/site/assets/theme.css", import.meta.url), "utf8");
  const search = readFileSync(new URL("../src/site/assets/search.js", import.meta.url), "utf8");
  const shapes = css.slice(css.indexOf("/* Shape system."));
  assert(shapes.length > 100, "Shape system block is present");
  const radiusFor = name => [...shapes.matchAll(/html :is\(([^)]*(?:\([^)]*\))?[^)]*)\)\{border-radius:([^;}]+)/g)].find(([, list]) => list.split(",").includes(name))?.[2];
  for (const pill of [".product-tags>a", ".platform-products a", ".mobile-browse-topics", ".skip-link", ".editorial-site .directory-row nav a"]) assert.equal(radiusFor(pill), "999px", `${pill} is a pill`);
  for (const circle of [".theme-toggle", ".search-close", ".mobile-sheet-close"]) assert.equal(radiusFor(circle), "50%", `${circle} is a circle`);
  for (const card of [".catalog-card", ".engagement-card", ".source-entry", ".related-card"]) assert.equal(radiusFor(card), "20px", `${card} uses the card radius`);
  assert.match(theme, /\.theme-toggle\{[^}]*border-radius:999px/, "Header theme toggle is round from first paint");
  assert(!/Ctrl K|search-footer|to move|<kbd/.test(search), "Search dialog has no keyboard hint row");
  assert(/class="search-close" type="button" aria-label="Close search"><svg/.test(search), "Search closes with a labelled X icon");
  assert(!/search-toggle-key|search-footer/.test(css), "Retired search hint styles are removed");
});

test("shared mobile assets load once before theme overrides", () => {
  const html = '<html><head><link rel="stylesheet" href="assets/styles.css"></head><body></body></html>';
  const once = syncAppearance(html);
  assert.equal(syncAppearance(once), once);
  assert.equal([...once.matchAll(/src="assets\/mobile.js"/g)].length, 1);
  assert.equal([...once.matchAll(/href="assets\/mobile.css"/g)].length, 1);
  assert(once.indexOf('href="assets/mobile.css"') < once.indexOf('href="assets/theme.css"'));
  assert(once.includes('src="assets/mobile.js" type="module"'));
});

function browser({ saved, systemDark = false, loading = false, storageError } = {}) {
  const storage = new Map(saved === undefined ? [] : [[key, saved]]);
  const window = new EventTarget();
  const system = Object.assign(new EventTarget(), { matches: systemDark });
  const button = Object.assign(new EventTarget(), {
    hidden: true,
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); }
  });
  const meta = { content: "#0078d4" };
  const document = Object.assign(new EventTarget(), {
    readyState: loading ? "loading" : "complete",
    documentElement: { dataset: {} },
    querySelector: () => meta,
    querySelectorAll: () => document.readyState === "loading" ? [] : [button]
  });
  const warnings = [];
  window.matchMedia = () => system;
  const localStorage = {
    getItem(name) {
      if (storageError) throw storageError;
      return storage.get(name) ?? null;
    },
    setItem(name, value) {
      if (storageError) throw storageError;
      storage.set(name, value);
    }
  };
  runInNewContext(script, { window, document, localStorage, CustomEvent, DOMException, console: { warn: message => warnings.push(message) } });
  return {
    document, button, storage, warnings, meta,
    theme: () => document.documentElement.dataset.theme,
    click: () => button.dispatchEvent(new Event("click")),
    systemChange(dark) {
      system.matches = dark;
      system.dispatchEvent(new Event("change"));
    },
    storageChange(value) {
      if (value === null) storage.delete(key);
      else storage.set(key, value);
      window.dispatchEvent(Object.assign(new Event("storage"), { key }));
    }
  };
}

test("theme follows the device before a manual choice", () => {
  const page = browser({ systemDark: true });
  assert.equal(page.theme(), "dark");
  assert.equal(page.button.attributes.get("aria-pressed"), "true");
  assert.equal(page.meta.content, "#111827");
  assert.equal(page.button.hidden, false);
  assert.equal(page.storage.size, 0);
  page.systemChange(false);
  assert.equal(page.theme(), "light");
});

test("toggle remembers a manual choice without following later device changes", () => {
  const page = browser({ saved: "light", systemDark: true });
  assert.equal(page.theme(), "light");
  page.click();
  assert.equal(page.theme(), "dark");
  assert.equal(page.storage.get(key), "dark");
  assert.equal(page.button.title, "Switch to light mode");
  page.systemChange(false);
  assert.equal(page.theme(), "dark");
  page.click();
  assert.equal(page.theme(), "light");
  assert.equal(page.storage.get(key), "light");
});

test("theme is applied before the document finishes loading", () => {
  const page = browser({ saved: "dark", loading: true });
  assert.equal(page.theme(), "dark");
  assert.equal(page.button.hidden, true);
  page.document.readyState = "complete";
  page.document.dispatchEvent(new Event("DOMContentLoaded"));
  assert.equal(page.button.hidden, false);
  assert.equal(page.button.attributes.get("aria-pressed"), "true");
});

test("storage changes synchronize tabs and clearing restores the device default", () => {
  const page = browser({ saved: "dark" });
  page.storageChange("light");
  assert.equal(page.theme(), "light");
  page.storageChange(null);
  page.systemChange(true);
  assert.equal(page.theme(), "dark");
});

test("unavailable or invalid storage is reported without disabling the toggle", () => {
  const blocked = browser({ storageError: new DOMException("Blocked", "SecurityError") });
  blocked.click();
  assert.equal(blocked.theme(), "dark");
  assert.equal(blocked.warnings.length, 2);
  const invalid = browser({ saved: "unexpected", systemDark: true });
  assert.equal(invalid.theme(), "dark");
  assert.equal(invalid.warnings.length, 1);
  assert.throws(() => browser({ storageError: new Error("Unexpected storage failure") }), /Unexpected storage failure/);
});

test("appearance assets are ordered and not duplicated by repeated builds", () => {
  const html = '<head><link rel="stylesheet" href="assets/styles.css"><link rel="stylesheet" href="assets/production.css"></head><!-- theme-toggle -->';
  const result = syncAppearance(html);
  assert.equal(syncAppearance(result), result);
  assert(result.indexOf('src="assets/theme.js"') < result.indexOf('href="assets/styles.css"'));
  assert(result.indexOf('href="assets/theme.css"') > result.indexOf('href="assets/production.css"'));
  assert.equal([...result.matchAll(/class="theme-toggle"/g)].length, 1);
});

test("Fluent surfaces and card outlines keep their shared visual contract", () => {
  const css = readFileSync(new URL("../ui/ui.css", import.meta.url), "utf8");
  assert.match(css, /\.react-surface\.fui-FluentProvider\{background-color:transparent\}/);
  assert.match(css, /\.react-surface \.fui-Card\{--fui-Card--border-radius:20px;/);
  assert.match(css, /\.react-surface \.fui-Card::after\{border-color:var\(--line\)\}/);
  for (const [, declarations] of css.matchAll(/\.(?:ai-focus-card|contact-receipt|react-finder-result)\{([^}]+)\}/g)) {
    assert(!/(?:^|;)border-radius:/.test(declarations), "Card radii must use Fluent's token so the clipped outline matches");
  }
  assert(css.includes(".react-surface a:not(.fui-Button)"), "Link rules must not recolor Fluent action buttons");
});

test("mobile service tabs align short and wrapped labels in equal grid cells", () => {
  const css = readFileSync(new URL("../ui/ui.css", import.meta.url), "utf8");
  const mobile = css.split("\n").find(line => line.startsWith("@media(max-width:600px)") && line.includes(".react-service-tabs"));
  assert(mobile);
  assert(mobile.includes("grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr"));
  assert(mobile.includes(".react-service-tabs button{justify-content:start;text-align:left;width:100%}"));
  assert(mobile.includes(".react-service-tabs :is(.fui-Tab__content,.fui-Tab__content--reserved-space){white-space:normal;text-align:left}"));
});

test("header focus order follows the visual order and the menu shows its state", () => {
  const html = header("index.html");
  const nav = html.match(/<nav id="primary-nav"[\s\S]*<\/nav>/)[0];
  assert(/^<nav id="primary-nav" aria-label="Main navigation"><button class="theme-toggle"[\s\S]*?Dark mode<\/span><\/button><button class="search-toggle"[^>]*>[\s\S]*?<\/button><div class="nav-entry"/.test(nav), "Theme and search lead the navigation, just before Services");
  const controls = html.match(/<div class="header-controls">([\s\S]*?)<\/nav>/)[1];
  assert(controls.indexOf("theme-toggle-compact") < controls.indexOf("search-toggle-compact") && controls.indexOf("search-toggle-compact") < controls.indexOf("menu-toggle"), "Phone header shows theme, search, then menu");
  assert(!html.includes(">Menu<"), "Menu button is icon only");
  assert(!/<kbd|Ctrl K/.test(html), "Search button shows no keyboard shortcut");
  assert(!html.includes("search-toggle-label"), "Search is an icon button like the theme toggle");
  assert(html.indexOf('class="menu-toggle"') < html.indexOf('id="primary-nav"'), "Menu button precedes the menu it opens");
  assert(!/class="menu-toggle"[^>]*hidden/.test(html), "Menu button reserves its space before scripts run");
  assert(html.includes('class="menu-icon-open"') && html.includes('class="menu-icon-close"'));
  assert.equal([...html.matchAll(/class="nav-chevron"/g)].length, 3);
  assert.match(syncAppearance('<link rel="icon" href="x.png">'), /<link rel="apple-touch-icon" href="assets\/apple-touch-icon.png">/);
});

test("phone header logo scales with the header so the three buttons never wrap to a second row", () => {
  const theme = readFileSync(new URL("../src/site/assets/theme.css", import.meta.url), "utf8");
  const phone = [...theme.matchAll(/@media\(max-width:480px\)\{([\s\S]*?)\n\}/g)].map(([, block]) => block).join("\n");
  assert.match(phone, /\.site-header\{container-type:inline-size;/);
  assert.match(phone, /\.site-header>\.brand\{[^}]*font-size:clamp\(16px,[^;]*vw[^;]*,26px\);font-size:clamp\(16px,[^;]*cqi[^;]*,26px\)/, "Viewport units back up container units");
  assert.match(phone, /\.site-header \.brand-mark\{width:1\.92em;height:1\.92em\}/, "The logo mark scales with the wordmark");
  assert.match(phone, /\.site-header \.brand-sub\{font-size:clamp\(9px,\.56em,12px\)\}/, "CONSULTING never outgrows Cloud First");
  assert.doesNotMatch(theme, /@media\(max-width:360px\)\{\s*\.site-header/, "No fixed-size logo step that can overflow between breakpoints");
});

test("internal links use a forward arrow and external or download links keep the outward arrow", () => {
  const source = '<a href="security.html">Explore <span aria-hidden="true">&#8599;</span></a><a href="https://learn.microsoft.com/">Docs <span aria-hidden="true">&#8599;</span></a><a class="text-link" href="brief.pdf" download>PDF <span>&#8599;</span></a><a href="trust.html" target="_blank">Privacy <span>&#8599;</span></a>';
  const result = syncLinkArrows(source);
  assert(result.includes('href="security.html">Explore <span aria-hidden="true">&#8594;</span>'));
  assert(result.includes('Docs <span aria-hidden="true">&#8599;</span>'));
  assert(result.includes('PDF <span>&#8599;</span>'));
  assert(result.includes('Privacy <span>&#8599;</span>'));
  assert.equal(syncLinkArrows(result), result);
});

test("theme script marks scripted pages before first paint", () => {
  const classes = new Set();
  const document = Object.assign(new EventTarget(), {
    readyState: "loading", documentElement: { dataset: {}, classList: { add: name => classes.add(name) } },
    querySelector: () => null, querySelectorAll: () => []
  });
  const window = Object.assign(new EventTarget(), { matchMedia: () => Object.assign(new EventTarget(), { matches: false }) });
  runInNewContext(script, { window, document, localStorage: { getItem: () => null }, CustomEvent, DOMException, console });
  assert(classes.has("js"));
});
test("homepage video waits for motion and data preferences and can always be paused", () => {
  const home = readFileSync(new URL("../src/site/index.html", import.meta.url), "utf8");
  const video = home.match(/<video\b[^>]*>/)?.[0];
  assert(video, "Homepage needs its background video");
  assert(!/\sautoplay\b/.test(video), "Scripts start playback only when motion is allowed");
  for (const attribute of ["muted", "loop", "playsinline", 'preload="none"', 'poster="assets/images/home-hero-poster-1280.webp"', 'aria-hidden="true"']) assert(video.includes(attribute), attribute);
  assert(home.includes('<button class="hero-video-toggle" type="button" aria-label="Pause background video" hidden>'));
  const app = readFileSync(new URL("../src/site/assets/app.js", import.meta.url), "utf8");
  assert(app.includes("prefers-reduced-motion: reduce") && app.includes("saveData"));
  const css = readFileSync(new URL("../src/site/assets/experience.css", import.meta.url), "utf8");
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\s*\.signal-pulse\{display:none\}/);
});
test("scroll and page motion is progressive, opt-out aware, and loaded once per page", () => {
  const motion = readFileSync(new URL("../src/site/assets/motion.js", import.meta.url), "utf8");
  assert(motion.includes('matchMedia("(prefers-reduced-motion: reduce)")') && motion.includes("if (reduced.matches"), "Reduced motion skips every scripted effect");
  assert(motion.includes('beforeprint'), "Printing never hides pending content");
  const html = syncAppearance('<head><link rel="stylesheet" href="assets/styles.css"></head>');
  assert.equal(syncAppearance(html), html);
  assert.equal([...html.matchAll(/src="assets\/motion\.js"/g)].length, 1);
  const css = readFileSync(new URL("../src/site/assets/experience.css", import.meta.url), "utf8");
  assert.match(css, /\[data-reveal="pending"\]\{opacity:0\}/);
  assert.match(css, /@media\(prefers-reduced-motion:no-preference\)\{\s*@view-transition\{navigation:auto\}/);
  const styles = readFileSync(new URL("../src/site/assets/styles.css", import.meta.url), "utf8");
  assert(styles.includes("@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation:none!important;transition:none!important}}"), "Reduced motion disables every CSS animation and transition");
});

test("homepage stats come from the catalogs and stay readable to assistive technology", () => {
  const home = readFileSync(new URL("../src/site/index.html", import.meta.url), "utf8");
  const industries = JSON.parse(readFileSync(new URL("../content/industries.json", import.meta.url), "utf8"));
  const products = JSON.parse(readFileSync(new URL("../content/products.json", import.meta.url), "utf8"));
  const values = [...home.matchAll(/data-count-to="(\d+)" aria-hidden="true">(\d+)<\/span><span class="sr-only">(\d+) <\/span>/g)];
  assert.equal(values.length, 4);
  for (const [, target, shown, spoken] of values) assert(target === shown && shown === spoken);
  assert.deepEqual(values.map(([, value]) => Number(value)), [18, industries.length, industries.reduce((total, industry) => total + industry.cases.length, 0), products.length]);
});
test("deep dives and perspectives link to the next article in a closed loop", async () => {
  const { syncNextArticle } = await import("./navigation.mjs");
  const { technologyTopics } = await import("../shared/resource-topics.mjs");
  const pages = technologyTopics.map(topic => `deep-dive-${topic.id}.html`);
  const next = pages.map(page => readFileSync(new URL(`../src/site/${page}`, import.meta.url), "utf8").match(/class="next-article-card" href="([^"]+)"/)?.[1]);
  assert.deepEqual(next, [...pages.slice(1), pages[0]]);
  const sample = readFileSync(new URL(`../src/site/${pages[0]}`, import.meta.url), "utf8");
  assert.equal(syncNextArticle(sample, pages[0]).match(/next-article:start/g).length, 1, "Rebuilding replaces the card instead of stacking copies");
  assert.equal(syncNextArticle("<main></main>", "faq.html"), "<main></main>");
  const app = readFileSync(new URL("../src/site/assets/app.js", import.meta.url), "utf8");
  assert(app.includes('toc.setAttribute("aria-label", "On this page")') && app.includes("reading-${position + 1}"), "Desktop contents share the mobile reading anchors");
  assert(app.includes('"(prefers-reduced-motion: reduce)"') && app.includes("header-concealed"), "The mobile header only slides away when motion is allowed");
});