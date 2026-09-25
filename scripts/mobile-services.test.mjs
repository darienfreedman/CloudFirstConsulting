import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fluent from "@fluentui/react-components";
import { serviceAreas } from "../shared/services.mjs";

const { FluentProvider, webLightTheme } = fluent;

const html = readFileSync(new URL("../src/site/services.html", import.meta.url), "utf8");
const rows = [...html.matchAll(/<section class="directory-row"([^>]*)>([\s\S]*?)<\/section>/g)];
const areas = rows.map(([, attributes, content], index) => ({
  key: ["security", "business", "cloud"][index],
  shortLabel: serviceAreas[index].label,
  label: serviceAreas[index].label,
  headline: ["Protect what matters.", "Make room for better work.", "Build for your next chapter."][index],
  description: attributes.match(/data-mobile-summary="([^"]+)"/)[1],
  href: content.match(/class="button" href="([^"]+)"/)[1],
  cta: "Explore services",
  links: [...content.match(/<nav\b[\s\S]*?<\/nav>/)[0].matchAll(/<a href="([^"]+)">([^<]+)/g)]
    .map(([, href, label]) => ({ href, label: label.trim() }))
}));
const compiled = buildSync({
  entryPoints: [fileURLToPath(new URL("../ui/service-carousel.jsx", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external"
}).outputFiles[0].text;
const module = { exports: {} };
runInNewContext(compiled, { module, exports: module.exports, require: createRequire(import.meta.url) });
const rendered = renderToStaticMarkup(React.createElement(FluentProvider, { theme: webLightTheme },
  React.createElement(module.exports.MobileServiceExplorer, { areas })));

test("mobile services render all three areas with concise source-owned descriptions", () => {
  assert.equal(areas.length, 3);
  assert.equal([...rendered.matchAll(/aria-roledescription="slide"/g)].length, 3);
  assert.equal([...rendered.matchAll(/<svg\b/g)].length, 3);
  for (const area of areas) {
    assert(area.description.split(/\s+/).length <= 30, area.key);
    assert(rendered.includes(area.description), area.key);
    assert(rendered.includes(`href="${area.href}"`), area.key);
  }
});

test("carousel retains every service destination and exposes separate detail sheets", () => {
  assert.equal(areas.flatMap(area => area.links).length, 18);
  assert.equal([...rendered.matchAll(/aria-haspopup="dialog"/g)].length, 3);
  assert.doesNotMatch(rendered, /<details\b/);
  for (const area of areas) {
    for (const link of area.links) assert(html.includes(`href="${link.href}"`), link.href);
  }
  // The unenhanced directory remains readable when scripting is unavailable.
  assert(rows.every(([, attributes]) => !attributes.includes("hidden")));
});

test("carousel exposes navigation and keeps off-screen slides out of keyboard focus", () => {
  assert.match(rendered, /aria-label="Explore our services" aria-roledescription="carousel"/);
  assert.match(rendered, /aria-live="polite" aria-atomic="true"/);
  assert.equal([...rendered.matchAll(/ inert=""/g)].length, 2);
  assert.equal([...rendered.matchAll(/aria-pressed="true"/g)].length, 1);
  assert.equal([...rendered.matchAll(/class="carousel-dot"/g)].length, 3);
  assert.equal([...rendered.matchAll(/aria-current="true"/g)].length, 1);
  assert.match(rendered, /aria-label="Go to card 3 of 3: Cloud &amp; AI"/);
  assert.doesNotMatch(rendered, /Previous service|Next service|service-carousel-controls/);
  assert.match(rendered, /tabindex="0" aria-label="Service cards/);
});

const aiCompiled = buildSync({
  entryPoints: [fileURLToPath(new URL("../ui/ai-focus-guide.jsx", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external"
}).outputFiles[0].text;
const aiModule = { exports: {} };
const viewport = { matches: true };
runInNewContext(aiCompiled, {
  module: aiModule, exports: aiModule.exports, require: createRequire(import.meta.url),
  window: { matchMedia: () => viewport }
});
function renderAI(mobile) {
  viewport.matches = mobile;
  return renderToStaticMarkup(React.createElement(FluentProvider, { theme: webLightTheme },
    React.createElement(aiModule.exports.AIFocusGuide, { pageLink: value => `/preview/${value}` })));
}

test("AI starting point offers a compact mobile journey selector and two accessible slides", () => {
  const mobile = renderAI(true);
  assert.match(mobile, /<select[^>]*id="ai-journey"/);
  for (const key of ["copilot", "agents", "scale"]) assert(mobile.includes(`value="${key}"`));
  assert.equal([...mobile.matchAll(/aria-roledescription="slide"/g)].length, 2);
  assert.equal([...mobile.matchAll(/ inert=""/g)].length, 1);
  assert.equal([...mobile.matchAll(/aria-pressed="true"/g)].length, 1);
  assert.equal([...mobile.matchAll(/class="carousel-dot"/g)].length, 2);
  assert.equal([...mobile.matchAll(/aria-current="true"/g)].length, 1);
  assert.match(mobile, /aria-label="Go to card 2 of 2: AI Governance"/);
  assert.doesNotMatch(mobile, /Previous AI topic|Next AI topic/);
  assert.match(mobile, /aria-live="polite" aria-atomic="true"/);
  assert.equal([...mobile.matchAll(/class="capability-icon"/g)].length, 2);
  assert.doesNotMatch(mobile, /data-visual=|card-visual|<img/);
  for (const fragment of ["ai-security", "ai-governance"]) {
    assert(mobile.includes(`href="/preview/security.html#${fragment}"`));
  }
});

test("sitewide carousels preserve simple icons and give every other card its own drawn icon", () => {
  const script = readFileSync(new URL("../src/site/assets/mobile.js", import.meta.url), "utf8");
  assert(script.includes('track.dataset.cardStyle !== "type" && !slide.querySelector(".capability-icon")'));
  assert(script.includes('svg.setAttribute("viewBox", "0 0 280 64")'));
  assert(script.includes("const usedIcons = new Set();") && script.includes("pickIcon(`${title(slide)} ${kicker}`, usedIcons)"), "Icons are chosen per card without repeats in a carousel");
  const icons = [...script.matchAll(/\[\/[^\n]*?, "(M[^"]+)"\]/g)].map(([, path]) => path);
  assert(icons.length >= 20 && new Set(icons).size === icons.length, "Every icon in the library is distinct");
  assert.doesNotMatch(script, /createCardVisual|createAboutCardPhoto|card-visual-data/);
  const css = readFileSync(new URL("../src/site/assets/experience.css", import.meta.url), "utf8");
  assert(css.includes('.editorial-site .mobile-rail-card>.editorial-photo{display:none}'));
});

test("desktop AI starting point retains all three tabs and both readable cards", () => {
  const desktop = renderAI(false);
  assert.equal([...desktop.matchAll(/role="tab"/g)].length, 3);
  assert.match(desktop, /role="tabpanel" aria-labelledby="ai-priority-copilot"/);
  assert.doesNotMatch(desktop, /inert=|aria-roledescription="slide"|id="ai-journey"/);
  assert(desktop.includes(aiModule.exports.aiPriorities.copilot.security));
  assert(desktop.includes(aiModule.exports.aiPriorities.copilot.governance));
  assert(desktop.includes('href="/preview/technology-explained.html"'));
  assert.doesNotMatch(desktop, /carousel-pagination|carousel-dot/);
});

test("pagination hides scrollbars and visual counts without disabling swiping", () => {
  const css = readFileSync(new URL("../src/site/assets/mobile.css", import.meta.url), "utf8");
  assert.match(css, /\.mobile-rail\.mobile-rail\{[^}]*overflow-x:auto[^}]*scrollbar-width:none/);
  assert(css.includes(".mobile-rail::-webkit-scrollbar{display:none}"));
  assert.match(css, /\.carousel-dot\{[^}]*width:44px;min-height:44px/);
  assert.match(css, /\.carousel-dot\[aria-current="true"\]>span\{background:currentColor\}/);
  assert.match(css, /\.carousel-status\{[^}]*clip-path:inset\(50%\)/);
  const script = readFileSync(new URL("../src/site/assets/mobile.js", import.meta.url), "utf8");
  assert.doesNotMatch(script, /"Previous"|"Next"|mobile-rail-controls/);
  assert.doesNotMatch(css, /\.mobile-rail-card(?::nth-child\([^)]*\))?::before/);
});

test("mobile topic navigation uses inline choices or a picker instead of a duplicate dropdown", () => {
  const script = readFileSync(new URL("../src/site/assets/mobile.js", import.meta.url), "utf8");
  assert.doesNotMatch(script, /Jump to a topic|mobile-rail-label|create\("select"\)/);
  assert(script.includes("const inlineTopics = all.length <= 4"));
  assert(script.includes('"mobile-topic-tab"'));
  assert(script.includes('"mobile-browse-topics", "Browse topics"'));
  assert(script.includes("const labels = topicLabels(visible)"));
  assert(script.includes('choice.setAttribute("aria-current", "true")'));
  assert.doesNotMatch(script, /"mobile-topic-current"|"Current"/);
  assert(script.includes("heading.append(view)"));
  assert(script.includes("topicSheet.close()"));
  assert.doesNotMatch(script, /tabs\.scrollTo/);
  const css = readFileSync(new URL("../src/site/assets/mobile.css", import.meta.url), "utf8");
  assert.match(css, /\.mobile-topic-tabs\{[^}]*flex-wrap:wrap/);
  assert.match(css, /\.mobile-topic-tab\{[^}]*border-radius:999px/);
  assert.match(css, /\.mobile-topic-tab\[aria-current="true"\]\{background:var\(--text\);color:var\(--bg\)/);
});

test("mobile header links wrap as chips and detail panes have no search controls", () => {
  const css = readFileSync(new URL("../src/site/assets/mobile.css", import.meta.url), "utf8");
  assert.match(css, /\.breadcrumbs\{flex-wrap:wrap/);
  assert.match(css, /\.product-guide-nav,\.framework-index\{flex-wrap:wrap/);
  assert.match(css, /\.product-guide-nav a,\.framework-index a,\.breadcrumbs a\{[^}]*border-radius:999px/);
  for (const file of ["mobile.js", "mobile-sheet.js"]) {
    const source = readFileSync(new URL(`../src/site/assets/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /type\s*=\s*["']search|mobile-topic-search|Search topics/);
  }
});

test("engagement cards use four distinct subject icons and retain their preparation details", () => {
  const html = readFileSync(new URL("../src/site/engagements.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article class="engagement-card" id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map(([, , body]) => body.match(/data-icon="([^"]+)"/)[1]), ["security", "data", "governance", "cloud"]);
  assert(cards.every(([, , body]) => body.includes("Prepare for the conversation")));
});

test("service chips stay in summaries and detailed content opens fully expanded", () => {
  const script = readFileSync(new URL("../src/site/assets/mobile.js", import.meta.url), "utf8");
  assert.doesNotMatch(script, /fold\(\[\.\.\.practice\.querySelectorAll\("\.practice-intro > \.product-tags"\)/);
  assert(script.includes("trigger: button, expandDetails: true"));
  assert(script.includes(".approach-grid,.blueprint-flow"));
  const sheet = readFileSync(new URL("../src/site/assets/mobile-sheet.js", import.meta.url), "utf8");
  assert(sheet.includes('body.querySelectorAll("details")'));
  assert(sheet.includes('section.className = "mobile-sheet-section"'));
  assert(sheet.includes("section.replaceWith(details)"));
});
