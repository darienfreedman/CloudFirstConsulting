import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expandAcronyms } from "./acronyms.mjs";
import { normalizeProductNames } from "./public-copy.mjs";
import { resourceMenuGroups, perspectiveLinks, header, syncResourceBreadcrumbs, syncInsightCards, consolidateResourceLinks } from "./navigation.mjs";
import { technologyTopicIds, technologyTopics } from "../shared/resource-topics.mjs";
import { industryGroups } from "../shared/industry-groups.mjs";
import { escapeHtml } from "../shared/html.mjs";
import { frameworks, renderFrameworkGuide } from "./frameworks.mjs";
import vm from "node:vm";
import { linkProductNames, productLink, products, renderProductGuide, syncHomepageProducts, homepageProductGroups, productsInGroup } from "./products.mjs";

const text = html => html.replace(/<[^>]+>/g, "");

test("content cards share blue hover and keyboard-focus outlines without outlining forms or sections", () => {
  const css = readFileSync(new URL("../docs/assets/production.css", import.meta.url), "utf8");
  const rule = css.split("\n").find(line => line.includes(":is(.service-card,") && line.includes("outline:"));
  assert(rule);
  for (const selector of [
    ".service-card", ".platform-group", ".ai-focus-card", ".catalog-card", ".engagement-card",
    ".source-entry", ".use-case", ".provider-card", ".react-finder-result", ".article-aside",
    ".resource-hub-links>a", ".capability-links>a"
  ]) assert(rule.includes(selector), selector);
  assert(rule.includes(":is(:hover,:focus-within)"));
  assert(rule.includes("outline:2px solid var(--accent)"));
  for (const selector of [".practice", ".resource-hub-group", ".react-contact-form", ".microsoft-form-frame", ".catalog-toolbar"]) {
    assert(!rule.includes(selector), selector);
  }
  assert(!/:is\([^}]*\.practice[^}]*\)\.is-highlighted/.test(css));
});

test("FAQs cover delivery decisions and accountable AI operations, not product explainers", () => {
  const html = readFileSync(new URL("../docs/faq.html", import.meta.url), "utf8");
  const items = [...html.matchAll(/<details><summary>([^<]+)<\/summary><div>([\s\S]*?)<\/div><\/details>/g)];
  assert.equal(items.length, 14);
  const questions = items.map(([, question]) => question);
  assert.equal(new Set(questions).size, questions.length);
  for (const [, question, answer] of items) {
    assert(question.endsWith("?"), question);
    assert(text(answer).split(/\s+/).length >= 45, question);
    for (const product of products) {
      assert(!question.toLowerCase().includes(product.name.toLowerCase()), `${question}: product explanations belong in Products explained`);
    }
  }
  for (const topic of [
    /internal team/, /scope change/, /licensing/, /existing provider/, /acceptance/,
    /ongoing support/, /business case/, /pilot stop/, /policy exception/,
    /unapproved AI/, /approver is unavailable/, /challenge an AI-assisted/,
    /supplier changes/, /unexpected action/
  ]) {
    assert(questions.some(question => topic.test(question)), `Missing FAQ topic: ${topic}`);
  }
  assert.match(html, /This website is not an emergency response channel/);
  assert.match(html, /cannot override a legal obligation/);
});

test("contact embed sizes follow the form width without disabling scrolling or its fallback", () => {
  const css = readFileSync(new URL("../ui/ui.css", import.meta.url), "utf8");
  const jsx = readFileSync(new URL("../ui/index.jsx", import.meta.url), "utf8");
  assert.match(css, /\.microsoft-contact-form\{[^}]*container:contact-form \/ inline-size/);
  assert.match(css, /\.microsoft-form-frame\{[^}]*height:1340px/);
  assert.match(css, /@container contact-form \(min-width:768px\)\{\.microsoft-form-frame\{height:1580px\}\}/);
  assert.match(css, /@container contact-form \(max-width:500px\)\{\.microsoft-form-frame\{height:1380px\}\}/);
  assert.match(css, /@container contact-form \(max-width:400px\)\{\.microsoft-form-frame\{height:1480px\}\}/);
  assert.match(css, /@container contact-form \(max-width:350px\)\{\.microsoft-form-frame\{height:1520px\}\}/);
  assert.doesNotMatch(css, /\.microsoft-(?:contact-form|form-frame)\{[^}]*(?:overflow[^:]*:\s*(?:hidden|clip)|max-height)/);
  const iframe = jsx.match(/<iframe[\s\S]*?\/>/)[0];
  assert.match(iframe, /title="Contact Cloud First Consulting"/);
  assert.doesNotMatch(iframe, /scrolling\s*=\s*["']no/);
  assert.match(jsx, /id="microsoft-form-open" href=\{form.responseUrl\}/);
});

test("footer links are alphabetical within categories without a duplicate Privacy link", () => {
  const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  const footer = html.match(/<footer class="site-footer[\s\S]*?<\/footer>/)[0];
  for (const [, group] of footer.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)) {
    const labels = [...group.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(([, label]) => label);
    assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  }
  assert.equal([...footer.matchAll(/href="trust.html"/g)].length, 1);
  assert(footer.includes('href="trust.html">Privacy information</a>'));
  assert(!footer.match(/<div class="footer-bottom">[\s\S]*?<a\b/));
});

test("Insights category introductions share a heading with supporting text underneath", () => {
  for (const page of ["perspectives", "solutions-in-practice", "technology-deep-dives"]) {
    const html = readFileSync(new URL(`../docs/${page}.html`, import.meta.url), "utf8");
    const intro = html.match(/<div class="insight-collection-intro">([\s\S]*?)<\/div>/)?.[1];
    assert(intro, page);
    assert.match(intro, /^<p class="eyebrow">[^<]+<\/p><h2 id="[^"]+">[^<]+<\/h2><p>[^<]+<\/p>$/);
    assert(!intro.includes("<br>"));
  }
});

test("Insights collections live on separate pages with correct article ancestry", () => {
  const categories = [
    ["perspectives.html", perspectiveLinks.length, "insight-"],
    ["solutions-in-practice.html", 3, "scenario-"],
    ["technology-deep-dives.html", technologyTopics.length, "deep-dive-"]
  ];
  assert.deepEqual(resourceMenuGroups.find(group => group.id === "insights").links.map(([href]) => href), categories.map(([href]) => href));
  for (const [file, count, prefix] of categories) {
    const html = readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8");
    const cards = [...html.matchAll(/<article class="service-card editorial-card"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, count, file);
    for (const [, card] of cards) {
      const article = card.match(/href="([^"]+)"/)[1];
      assert(article.startsWith(prefix), article);
      const content = readFileSync(new URL(`../docs/${article}`, import.meta.url), "utf8");
      const breadcrumbs = content.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)[0];
      assert(breadcrumbs.includes(`href="${file}"`), article);
    }
  }
});

test("old Insights category bookmarks redirect to standalone pages", () => {
  const script = readFileSync(new URL("../docs/assets/app.js", import.meta.url), "utf8");
  for (const id of ["perspectives", "solutions-in-practice", "technology-deep-dives"]) {
    let redirected;
    const link = { dataset: { resourceFragment: id }, href: `https://demo.github.io/demo/${id}/` };
    vm.runInNewContext(script, {
      URL, document: {
        documentElement: { classList: { add() {} } }, getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: selector => selector === "[data-resource-fragment]" ? [link] : [],
        addEventListener() {}
      }, window: { location: { hash: `#${id}`, search: "?from=bookmark", replace: value => { redirected = value; } }, addEventListener() {} }
    });
    assert.equal(redirected, `https://demo.github.io/demo/${id}/?from=bookmark`);
  }
});

test("technology and solution cards have distinct names and article destinations", () => {
  const html = readFileSync(new URL("../docs/technology-deep-dives.html", import.meta.url), "utf8");
  for (const topic of technologyTopics) {
    const card = html.match(new RegExp(`<article class="service-card editorial-card" id="${topic.id}">([\\s\\S]*?)</article>`))[1];
    assert(card.includes(`<p class="card-kicker">${escapeHtml(topic.name)}</p>`));
    assert(card.includes(`href="deep-dive-${topic.id}.html"`));
    assert(!card.includes('class="article-body"'));
    const page = readFileSync(new URL(`../docs/deep-dive-${topic.id}.html`, import.meta.url), "utf8");
    assert.equal(syncResourceBreadcrumbs(page, `deep-dive-${topic.id}.html`), page);
    assert(page.includes('href="technology-deep-dives.html">Technology deep dives</a>'));
  }
  for (const name of ["AI portfolio governance", "Protected knowledge", "Security modernization"]) {
    assert(readFileSync(new URL("../docs/solutions-in-practice.html", import.meta.url), "utf8").includes(`<p class="card-kicker">${name}</p>`));
  }
  assert(!html.includes('<p class="card-kicker">Solution example</p>'));
});

test("Insights has three category links and products occupy a standalone page", () => {
  const insights = readFileSync(new URL("../docs/insights.html", import.meta.url), "utf8");
  const productsPage = readFileSync(new URL("../docs/sources.html", import.meta.url), "utf8");
  const resources = readFileSync(new URL("../docs/resources.html", import.meta.url), "utf8");
  const directory = resources.match(/<section class="resource-hub-group" id="insights"[\s\S]*?<\/section>/)[0];
  assert.deepEqual([...directory.matchAll(/href="([^"]+)"/g)].map(([, href]) => href),
    ["perspectives.html", "solutions-in-practice.html", "technology-deep-dives.html"]);
  assert(!insights.includes('class="service-card editorial-card"'));
  for (const id of technologyTopicIds) {
    assert(readFileSync(new URL("../docs/technology-deep-dives.html", import.meta.url), "utf8").includes(`<article class="service-card editorial-card" id="${id}">`));
    assert(!productsPage.includes(`<section id="${id}">`));
  }
  assert(productsPage.includes('<h1 id="product-guide-title">Start with the problem, then choose the product.</h1>'));
  assert(!productsPage.includes("<h1>Products explained</h1>"));
  assert(!productsPage.includes("Find the problem each product solves"));
  assert(!productsPage.includes("For broader concepts and terminology"));
  assert(!productsPage.includes('aria-label="Technical resources sections"'));
  assert.deepEqual(resourceMenuGroups.find(group => group.id === "guidance").links.map(([, name]) => name),
    ["Products explained", "Security and privacy", "Website privacy"]);
  const css = readFileSync(new URL("../docs/assets/production.css", import.meta.url), "utf8");
  assert(/\.product-guide\{padding-top:0\}/.test(css));
  assert(!/\.resource-section-nav\{[^}]*border-bottom/.test(css));
});

test("bookmarked glossary fragments redirect from products without affecting product anchors", () => {
  const script = readFileSync(new URL("../docs/assets/app.js", import.meta.url), "utf8");
  for (const [fragment, target] of [
    ["technology-glossary", "technology-deep-dives"], ["mcp-servers", "mcp-servers"],
    ["azure", null], ["product-group-0", null], ["", null]
  ]) {
    let redirected;
    const document = {
      hidden: false,
      documentElement: { classList: { add() {} } },
      getElementById: id => id === "legacy-topic-destination" ? {
        href: "https://demo.github.io/demo/technology-deep-dives/",
        dataset: { topics: technologyTopicIds.join(" ") }
      } : null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
    };
    vm.runInNewContext(script, { document, URL, window: {
      location: { hash: fragment ? `#${fragment}` : "", search: "?from=bookmark", replace: url => { redirected = url; } },
      addEventListener() {}
    } });
    assert.equal(redirected, target ? `https://demo.github.io/demo/technology-deep-dives/?from=bookmark${target === "technology-deep-dives" ? "" : `#${target}`}` : undefined);
  }
});

test("industry navigation groups every industry under a working category link", () => {
  const industries = JSON.parse(readFileSync(new URL("../content/industries.json", import.meta.url), "utf8"));
  const nav = header("index.html");
  const panel = nav.match(/id="nav-panel-industries"[\s\S]*?(?=<div class="nav-entry" data-nav-section="resources")/)[0];
  assert(!panel.includes("<input"));
  assert(!panel.includes("Find your industry"));
  const directory = readFileSync(new URL("../docs/industries.html", import.meta.url), "utf8");
  for (const group of industryGroups) {
    assert(panel.includes(`href="industries.html#${group.id}"`));
    const column = panel.match(new RegExp(`<section class="nav-column"><h3><a href="industries.html#${group.id}">[\\s\\S]*?</section>`))[0];
    for (const industry of industries) {
      assert.equal(column.includes(`href="industry-${industry.slug}.html"`), industry.segment === group.title);
    }
    assert(directory.includes(`id="${group.id}" data-catalog-group`));
  }
});

test("consolidated resources retain content and redirect old links with fragments", () => {
  const insights = readFileSync(new URL("../docs/solutions-in-practice.html", import.meta.url), "utf8");
  const sources = readFileSync(new URL("../docs/sources.html", import.meta.url), "utf8");
  assert(insights.includes('id="solutions-in-practice"'));
  for (const slug of ["security", "data-ai", "ai-governance"]) assert(insights.includes(`href="scenario-${slug}.html"`));
  assert(!sources.includes('id="technology-glossary"'));
  assert(!sources.includes('id="technology-deep-dives"'));
  assert(readFileSync(new URL("../docs/technology-deep-dives.html", import.meta.url), "utf8").includes('id="technology-deep-dives"'));
  const input = '<a href="stories.html">Examples</a><a href="technology-explained.html#grounding">Grounding</a>';
  assert.equal(consolidateResourceLinks(input), '<a href="solutions-in-practice.html">Examples</a><a href="technology-deep-dives.html#grounding">Grounding</a>');
  assert.equal(consolidateResourceLinks('<a href="sources.html#grounding">Topic</a><a href="sources.html#azure">Product</a>'),
    '<a href="technology-deep-dives.html#grounding">Topic</a><a href="sources.html#azure">Product</a>');
  const script = readFileSync(new URL("../docs/assets/resource-redirect.js", import.meta.url), "utf8");
  for (const [destination, hash, expected] of [
    ["technology-deep-dives/", "#mcp-servers", "technology-deep-dives/?from=bookmark#mcp-servers"],
    ["technology-deep-dives/", "#technology-glossary", "technology-deep-dives/?from=bookmark#technology-deep-dives"],
    ["technology-deep-dives/", "#technology-glossary-title", "technology-deep-dives/?from=bookmark#technology-deep-dives"],
    ["solutions-in-practice/", "", "solutions-in-practice/?from=bookmark"]
  ]) {
    let redirected;
    vm.runInNewContext(script, {
      URL, document: { getElementById: () => ({ href: `https://demo.github.io/demo/${destination}` }) },
      window: { location: { hash, search: "?from=bookmark", replace: value => { redirected = value; } } }
    });
    assert.equal(redirected, `https://demo.github.io/demo/${expected}`);
  }
});

test("resource migrations preserve queries and point directly to the current destinations", () => {
  for (const [oldHref, newHref] of [
    ["technology-explained.html?from=service&amp;view=all#ai-security", "technology-deep-dives.html?from=service&amp;view=all#ai-security"],
    ["sources.html?from=article#grounding", "technology-deep-dives.html?from=article#grounding"],
    ["sources.html?from=article#entra", "sources.html?from=article#entra"],
    ["insights.html?from=menu#perspectives", "perspectives.html?from=menu"],
    ["insights.html?from=menu#ai-governance", "technology-deep-dives.html?from=menu#ai-governance"],
    ["insights.html?from=menu#insights", "resources.html?from=menu#insights"],
    ["insights.html?from=menu", "resources.html?from=menu#insights"],
    ["stories.html?from=menu#solutions-in-practice", "solutions-in-practice.html?from=menu#solutions-in-practice"]
  ]) {
    const result = consolidateResourceLinks(`<a href="${oldHref}">Read</a>`);
    assert.equal(result, `<a href="${newHref}">Read</a>`);
    assert.equal(consolidateResourceLinks(result), result);
  }
  const security = readFileSync(new URL("../docs/security.html", import.meta.url), "utf8");
  assert(security.includes('href="technology-deep-dives.html#ai-security">AI and integration terms explained'));
});

test("Resources links and Insights cards use the same alphabetical topic order", () => {
  assert.deepEqual(resourceMenuGroups.map(group => group.title), ["Planning", "Insights", "Guidance"]);
  for (const group of resourceMenuGroups) {
    assert.equal(group.links.length, 3);
    const labels = group.links.map(([, label]) => label);
    assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  }
  const html = readFileSync(new URL("../docs/perspectives.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article class="service-card editorial-card">([\s\S]*?)<\/article>/g)];
  const links = cards.map(([, card]) => card.match(/href="([^"]+)"/)[1]).filter(href => href.startsWith("insight-"));
  assert.deepEqual(links, perspectiveLinks.map(([href]) => href));
  assert.equal(syncInsightCards(html), html);
  assert.throws(() => syncInsightCards("<main></main>"), /must match/);
});

test("technology deep-dive articles preserve definitions and links to perspectives", () => {
  const html = readFileSync(new URL("../docs/technology-deep-dives.html", import.meta.url), "utf8");
  for (const [id, insight] of [
    ["copilot", "copilot-readiness"], ["copilot-model-choice", "ai-governance"],
    ["copilot-evaluation", "copilot-readiness"], ["modern-workplace", "copilot-readiness"],
    ["ai-security", "ai-security"], ["ai-governance", "ai-governance"],
    ["ai-agents", "ai-governance"], ["mcp-servers", "ai-security"],
    ["orchestration", "ai-security"], ["grounding", "copilot-readiness"],
    ["access-and-data-protection", "identity-security"], ["secure-access", "global-secure-access"]
  ]) {
    assert(html.includes(`id="${id}"`), `Keep existing deep link: ${id}`);
    const article = readFileSync(new URL(`../docs/deep-dive-${id}.html`, import.meta.url), "utf8");
    const section = article.match(/<article class="article-body">([\s\S]*?)<\/article>/)[1];
    assert(section.includes(`href="insight-${insight}.html"`), id);
    assert(section.includes("<h2>Further reading</h2>"), `Keep related guidance discoverable: ${id}`);
  }
  for (const phrase of ["Before deployment:", "At release:", "During operation:", "Reduce standing access:", "Review the provider:"]) {
    assert(!html.includes(phrase), `Remove repeated procedural guidance: ${phrase}`);
  }
});

test("all technology deep dives provide structured technical explanations and examples", () => {
  for (const topic of technologyTopics) {
    const html = readFileSync(new URL(`../docs/deep-dive-${topic.id}.html`, import.meta.url), "utf8");
    const article = html.match(/<article class="article-body">([\s\S]*?)<\/article>/)[1];
    const headings = [...article.matchAll(/<h2>([^<]+)<\/h2>/g)].map(([, heading]) => heading);
    assert.equal(headings.length, 5, topic.id);
    assert(headings.some(heading => heading.startsWith("Example:")), topic.id);
    assert.equal(headings.at(-1), "Further reading");
    const wordCount = text(article).split(/\s+/).filter(Boolean).length;
    assert(wordCount >= 300 && wordCount <= 650, `${topic.id}: expected a substantive but focused article, got ${wordCount} words`);
    assert(article.includes("<a href="), `${topic.id}: preserve further reading`);
    assert(!html.includes('class="article-meta"'));
  }
});

test("Insights has one overview destination and all registered perspectives are discoverable", () => {
  const group = resourceMenuGroups.find(group => group.id === "insights");
  assert.equal(group.href, "resources.html#insights");
  assert.equal(group.links.length, 3);
  assert(!group.links.some(([href]) => href === group.href));
  assert(!header("insights.html").includes("All insights"));
  const overview = readFileSync(new URL("../docs/insights.html", import.meta.url), "utf8");
  const main = overview.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.equal([...main.matchAll(/class="service-card"/g)].length, 0);
  assert(main.includes('id="insights-destination" href="resources.html#insights"'));
  assert(overview.includes('<meta name="robots" content="noindex">'));
  const perspectives = readFileSync(new URL("../docs/perspectives.html", import.meta.url), "utf8");
  for (const [page] of perspectiveLinks) {
    assert(perspectives.includes(`href="${page}"`));
    const html = readFileSync(new URL(`../docs/${page}`, import.meta.url), "utf8");
    assert.equal(syncResourceBreadcrumbs(html, page), html);
    assert(!html.includes('class="article-meta"'));
  }
  assert.equal(syncResourceBreadcrumbs(overview, "insights.html"), overview);
  for (const [page, phrases] of [
    ["insight-ai-security.html", ["Agent 365", "sources.html#entra", "sources.html#purview", "security.html#ai-security"]],
    ["insight-global-secure-access.html", ["Entra ID Governance", "Zero Trust Network Access", "secure web gateway", "security.html#secure-access"]]
  ]) {
    const html = readFileSync(new URL(`../docs/${page}`, import.meta.url), "utf8");
    for (const phrase of phrases) assert(html.includes(phrase), `${page}: ${phrase}`);
  }
});

test("compliance readiness distinguishes obligations and Microsoft shared responsibilities", () => {
  const html = readFileSync(new URL("../docs/insight-compliance-readiness.html", import.meta.url), "utf8");
  assert(html.includes('<h1>Make compliance<br><span class="accent">an operating discipline.</span></h1>'));
  assert(html.includes('class="section-wrap article-layout"><article class="article-body">'));
  const article = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  for (const phrase of ["NIST", "CMMC", "ISO/IEC 27001", "CJIS", "Revision 2", "Revision 3",
    "customer-managed", "shared controls", "not a certification", "does not guarantee compliance"]) {
    assert(article.includes(phrase), phrase);
  }
  assert(perspectiveLinks.some(([page]) => page === "insight-compliance-readiness.html"));
  const security = readFileSync(new URL("../docs/security.html", import.meta.url), "utf8");
  assert(security.includes('href="insight-compliance-readiness.html"'));
  assert(html.includes('href="security.html#data-security"'));
});

test("the compliance guide includes ten alphabetical anchored references and real industry examples", () => {
  const industries = JSON.parse(readFileSync(new URL("../content/industries.json", import.meta.url), "utf8"));
  const html = readFileSync(new URL("../docs/insight-compliance-readiness.html", import.meta.url), "utf8");
  const guide = renderFrameworkGuide(industries);
  const labels = frameworks.map(item => item.name);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  assert.equal([...html.matchAll(/class="framework-card source-entry editorial-card"/g)].length, 10);
  for (const framework of frameworks) {
    const card = html.match(new RegExp(`<section class="framework-card source-entry editorial-card" id="${framework.id}">([\\s\\S]*?)</section>`))?.[1];
    assert(card, framework.id);
    assert(card.includes("<h4>Industry examples</h4>"), framework.id);
    assert(html.includes(`href="#${framework.id}"`), framework.id);
    for (const [, href] of framework.sources) assert(card.includes(`href="${escapeHtml(href)}"`));
    for (const [, slug, position] of card.matchAll(/href="industry-([^"]+)\.html#use-case-(\d+)"/g)) {
      const item = industries.find(industry => industry.slug === slug).cases[Number(position) - 1];
      assert(item.frameworks.some(reference => reference.id === framework.id));
    }
    assert(guide.includes(`id="${framework.id}"`));
  }
  assert(html.includes("4.0.1"));
  assert(html.includes("Version 6.0 is a reference baseline"));
  assert(html.includes("not automated compliance scores"));
});

test("framework cards follow the complete article and sidebar in a responsive full-width section", () => {
  const html = readFileSync(new URL("../docs/insight-compliance-readiness.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../docs/assets/editorial.css", import.meta.url), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const section = main.indexOf('<section class="section-wrap article-body framework-section"');
  assert(section > main.indexOf("</article>"));
  assert(section > main.indexOf("</aside>"));
  for (const heading of ["Reuse evidence", "Use Microsoft capabilities", "Make readiness sustainable", "Further reading"]) {
    assert(main.indexOf(heading) < section, heading);
  }
  assert.match(main, /<!-- framework-guide:end -->\s*<\/section>\s*$/);
  assert(!main.match(/<article class="article-body">[\s\S]*?framework-guide[\s\S]*?<\/article>/));
  assert(css.includes(".framework-section{max-width:var(--max);padding-bottom:72px}"));
  assert.match(css, /\.framework-guide\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert(css.includes("@media(max-width:900px){.framework-guide{grid-template-columns:minmax(0,1fr)}}"));
});

test("MITRE deep dive distinguishes mapped techniques from tested detection and intelligence", () => {
  const html = readFileSync(new URL("../docs/deep-dive-mitre-attack.html", import.meta.url), "utf8");
  const article = html.match(/<article class="article-body">([\s\S]*?)<\/article>/)[1];
  for (const phrase of ["MITRE ATT&amp;CK", "Sentinel", "Defender XDR", "threat analytics",
    "Available content is not deployed protection", "provenance", "confidence", "expiry",
    "controlled environment", "mapped, deployed, tested, and operationally supported"]) {
    assert(article.includes(phrase), phrase);
  }
  assert(technologyTopics.some(topic => topic.id === "mitre-attack"));
  const security = readFileSync(new URL("../docs/security.html", import.meta.url), "utf8");
  assert(security.includes('href="technology-deep-dives.html#mitre-attack"'));
  assert(html.includes('href="security.html#threat-protection"'));
});

test("brief calls to action prioritize online reading and related services", () => {
  const briefs = JSON.parse(readFileSync(new URL("../content/briefs.json", import.meta.url), "utf8"));
  const library = readFileSync(new URL("../docs/briefs.html", import.meta.url), "utf8");
  for (const brief of briefs) {
    assert(library.includes(`<a class="button" href="brief-${brief.slug}.html">Read online`));
    assert(library.includes(`<a class="text-link" href="downloads/cloud-first-${brief.slug}-brief.pdf" download>Download PDF`));
    const html = readFileSync(new URL(`../docs/brief-${brief.slug}.html`, import.meta.url), "utf8");
    assert(html.includes('<p class="brief-brand">Cloud First <span>Consulting</span></p>'));
    const actions = html.match(/<div class="brief-actions">([\s\S]*?)<\/div>/)[1];
    assert(actions.startsWith(`<a class="button" href="${brief.service}">Explore the related service`));
    assert(actions.includes(`<a class="text-link" href="downloads/cloud-first-${brief.slug}-brief.pdf" download>Download one-page PDF`));
  }
  const css = readFileSync(new URL("../docs/assets/briefs.css", import.meta.url), "utf8");
  const sizes = [...css.matchAll(/\.brief-brand span\{([^}]+)\}/g)];
  assert.equal(sizes.length, 1);
  assert(sizes[0][1].includes("font-size:inherit"));
  assert(!sizes[0][1].includes("margin-left"));
  assert(library.includes("<h1>Service briefs</h1>"));
  assert(!library.includes("Download service briefs"));
});

test("Perspectives contains articles without the unrelated resource cards", () => {
  const html = readFileSync(new URL("../docs/perspectives.html", import.meta.url), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert(!main.includes('aria-label="Further resources"'));
  for (const slug of ["copilot-readiness", "identity-security", "ai-governance"]) {
    assert(main.includes(`href="insight-${slug}.html"`));
  }
});

test("all industry use-case technologies have exact product explanations and rendered links", () => {
  const industries = JSON.parse(readFileSync(new URL("../content/industries.json", import.meta.url), "utf8"));
  const guide = renderProductGuide();
  let cases = 0;
  let links = 0;
  for (const industry of industries) {
    const html = readFileSync(new URL(`../docs/industry-${industry.slug}.html`, import.meta.url), "utf8");
    industry.cases.forEach((useCase, index) => {
      const card = html.match(new RegExp(`<article class="use-case catalog-card" id="use-case-${index + 1}"[\\s\\S]*?</article>`))?.[0];
      assert(card, `${industry.slug}: ${useCase.title}`);
      const tags = card.match(/<div class="product-tags">([\s\S]*?)<\/div>/)?.[1];
      assert(tags, `${industry.slug}: missing product list`);
      assert.equal([...tags.matchAll(/<a\b/g)].length, useCase.tech.length);
      for (const label of useCase.tech) {
        const name = normalizeProductNames(label);
        const product = products.find(product => product.name === name);
        assert(product, `${industry.slug}: ${useCase.title}: ${name} needs its own explanation`);
        assert(tags.includes(productLink(label)), `${industry.slug}: incorrect ${name} link`);
        assert(guide.includes(`id="${product.id}"`));
        links++;
      }
      cases++;
    });
  }
  assert.equal(industries.length, 19);
  assert.equal(cases, 152);
  assert.equal(links, 360);
});

test("endpoint use cases use the consolidated Defender XDR explanation", () => {
  assert(!products.some(product => product.id === "defender-for-endpoint"));
  const industries = JSON.parse(readFileSync(new URL("../content/industries.json", import.meta.url), "utf8"));
  for (const industry of industries) {
    for (const useCase of industry.cases) {
      assert(!useCase.tech.includes("Defender for Endpoint"));
      if (useCase.service === "security.html#endpoints") {
        assert(useCase.tech.includes("Defender XDR"));
      }
    }
  }
});

test("homepage categories match the explanations with Azure services summarized by Azure", () => {
  const home = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  const seen = [];
  for (const [id, category] of Object.entries(homepageProductGroups)) {
    const card = home.match(new RegExp(`<article class="platform-group" aria-labelledby="${id}">([\\s\\S]*?)</article>`))[1];
    const names = [...card.matchAll(/<li><a[^>]+>([^<]+)<\/a><\/li>/g)].map(([, name]) => name);
    assert.deepEqual(names, productsInGroup(category).filter(product => !product.name.startsWith("Azure ")).map(product => product.name));
    seen.push(...names);
  }
  const expectedCount = products.filter(product => !product.name.startsWith("Azure ")).length;
  assert.equal(seen.length, expectedCount);
  assert.equal(new Set(seen).size, expectedCount);
  assert(seen.includes("Azure"));
  assert(!seen.some(name => name.startsWith("Azure ")));
  for (const product of products.filter(product => product.name.startsWith("Azure "))) {
    assert(renderProductGuide().includes(`id="${product.id}"`));
  }
  assert.equal(syncHomepageProducts(home), home);
  assert.throws(() => syncHomepageProducts("<main></main>"), /Missing homepage product box/);
});

test("Security Copilot is connected to security services and the operations brief", () => {
  const link = productLink("Security Copilot");
  const home = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  const card = home.match(/<article class="platform-group" aria-labelledby="platform-security-title">([\s\S]*?)<\/article>/)[1];
  assert(card.includes(link));
  const security = readFileSync(new URL("../docs/security.html", import.meta.url), "utf8");
  const service = security.match(/<section class="practice" id="threat-protection"[\s\S]*?<\/section>/)[0];
  assert(service.includes(link));
  assert(service.includes("analyst review criteria"));
  const briefs = JSON.parse(readFileSync(new URL("../content/briefs.json", import.meta.url), "utf8"));
  const brief = briefs.find(brief => brief.slug === "modern-secops");
  assert(brief.technologies.includes("Security Copilot"));
  assert(brief.capabilities.some(capability => capability.includes("Security Copilot")));
  assert(readFileSync(new URL("../docs/brief-modern-secops.html", import.meta.url), "utf8").includes(link));
});

test("GitHub Copilot connects developer services, product guidance, and the platform brief", () => {
  const product = products.find(product => product.id === "github-copilot");
  assert.equal(product.name, "GitHub Copilot");
  assert.equal(product.group, "Cloud, data, and AI platforms");
  assert.equal(product.service, "cloud-platforms.html#ai-platforms");
  assert.equal(product.details.length, 3);
  const link = productLink("GitHub Copilot");
  assert.equal(link, '<a href="sources.html#github-copilot">GitHub Copilot</a>');
  for (const page of ["cloud-platforms.html", "deep-dive-copilot.html", "brief-ai-platforms.html"]) {
    assert(readFileSync(new URL(`../docs/${page}`, import.meta.url), "utf8").includes(link), page);
  }
  const briefs = JSON.parse(readFileSync(new URL("../content/briefs.json", import.meta.url), "utf8"));
  const brief = briefs.find(brief => brief.slug === "ai-platforms");
  assert(brief.technologies.includes("GitHub Copilot"));
  assert(brief.capabilities.some(capability => capability.includes("GitHub Copilot")));
});

test("Defender explanations stand alone and describe proactive protection", () => {
  const xdr = products.find(product => product.id === "defender");
  const cloud = products.find(product => product.id === "defender-for-cloud");
  for (const [product, other] of [[xdr, cloud], [cloud, xdr]]) {
    const copy = [product.problem, product.solution, ...product.details, ...product.additionalDocs.flat()].join(" ");
    assert(!copy.includes(other.name));
    assert(!copy.includes(`sources.html#${other.id}`));
  }
  assert(xdr.solution.includes("email, endpoints, identities, and cloud applications"));
  assert(xdr.details.some(detail => detail.startsWith("Automatic attack disruption:")));
  assert(xdr.details.some(detail => detail.startsWith("Predictive shielding:")));
});

test("Security Copilot belongs to the security group and has its own explanation link", () => {
  const product = products.find(product => product.id === "security-copilot");
  assert.equal(product.group, "Threat protection and data security");
  assert.equal(productLink("Security Copilot"), '<a href="sources.html#security-copilot">Security Copilot</a>');
  assert.equal(product.details.length, 3);
  const guide = renderProductGuide();
  assert(guide.indexOf('id="purview"') < guide.indexOf('id="security-copilot"'));
  assert(guide.indexOf('id="security-copilot"') < guide.indexOf('id="sentinel"'));
});

test("expanded product cards have comparable detail to their alphabetical neighbors", () => {
  const words = product => [product.problem, product.solution, ...(product.details || [])].join(" ").split(/\s+/).length;
  for (const [id, neighbor, details] of [
    ["github", "github-copilot", 3],
    ["dynamics-365", "copilot-studio", 1],
    ["power-apps", "microsoft-365-copilot", 3],
    ["azure-backup", "azure", 2],
    ["azure-sql", "azure-policy", 2]
  ]) {
    const product = products.find(product => product.id === id);
    const adjacent = products.find(product => product.id === neighbor);
    assert.equal(product.details.length, details);
    assert(words(product) >= words(adjacent) * 0.8);
    assert(words(product) <= words(adjacent) * 1.3);
    assert.equal(product.additionalDocs.length, adjacent.additionalDocs.length);
  }
});

test("Power Platform is covered through specific products rather than a duplicate card", () => {
  assert(!products.some(product => product.id === "power-platform"));
  assert(!renderProductGuide().includes('id="power-platform"'));
  for (const id of ["power-apps", "power-automate", "power-bi"]) {
    assert(products.some(product => product.id === id));
  }
  for (const file of ["brief-ai-business.html", "ai-business.html", "industry-media-entertainment.html"]) {
    const html = readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8");
    assert(!html.includes('href="sources.html#power-platform"'), file);
    assert(html.includes(productLink("Power Apps")), file);
    assert(html.includes(productLink("Power Automate")), file);
  }
});

test("service product chips are alphabetical and keep their explanation destinations", () => {
  const source = '<div class="product-tags"><span>Entra</span><span>Defender</span><span>Purview</span><span>Foundry</span></div>';
  const result = linkProductNames(source);
  assert.equal(result, '<div class="product-tags">' +
    ["Defender XDR", "Entra", "Foundry", "Purview"].map(productLink).join("") + "</div>");
  assert.equal(linkProductNames(result), result);
  for (const file of ["security.html", "ai-business.html", "cloud-platforms.html"]) {
    const html = readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8");
    for (const [, group] of html.matchAll(/<div class="product-tags">([\s\S]*?)<\/div>/g)) {
      const names = [...group.matchAll(/<a[^>]+>([^<]+)<\/a>/g)].map(([, name]) => name);
      assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true })), file);
    }
  }
});

test("connected capability products are alphabetical by displayed name", () => {
  const source = '<ul class="platform-products"><li><span>Microsoft 365 Copilot</span></li><li><span>Copilot Studio</span></li><li><span>Agent 365</span></li></ul>';
  const result = linkProductNames(source);
  assert.deepEqual([...result.matchAll(/<a[^>]+>([^<]+)<\/a>/g)].map(([, name]) => name),
    ["Agent 365", "Copilot Studio", "Microsoft 365 Copilot"]);
  assert.equal(linkProductNames(result), result);
  const home = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  for (const [, list] of home.matchAll(/<ul class="platform-products">([\s\S]*?)<\/ul>/g)) {
    const names = [...list.matchAll(/<a[^>]+>([^<]+)<\/a>/g)].map(([, name]) => name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true })));
  }
});

test("product explanations are alphabetical within the existing category order", () => {
  const guide = renderProductGuide();
  const groups = [...guide.matchAll(/<section class="product-guide-group"[\s\S]*?<\/section>/g)].map(([group]) => group);
  assert.equal(groups.length, 4);
  const expectedGroups = [...new Set(products.map(product => product.group))];
  groups.forEach((group, index) => {
    const names = [...group.matchAll(/<h3>([^<]+)<\/h3>/g)].map(([, name]) => name);
    const expected = products.filter(product => product.group === expectedGroups[index]).map(product => product.name)
      .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }));
    assert.deepEqual(names, expected);
  });
  assert.equal(products.find(product => product.id === "power-bi").group, "Cloud, data, and AI platforms");
});

test("homepage introductions explain outcomes before products and match capability order", () => {
  const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article class="service-card home-service">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 3);
  for (const [, card] of cards) assert(!/Microsoft 365|Viva|Copilot|Azure|Fabric|Foundry/.test(text(card)));
  assert(html.includes("We connect productivity, security, artificial intelligence, and cloud into a practical delivery plan."));
  assert(!html.includes("modern work,"));
});

test("the sections around Clear scope do not add a dividing border", () => {
  const production = readFileSync(new URL("../docs/assets/production.css", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../docs/assets/styles.css", import.meta.url), "utf8");
  assert(!/\.ai-focus-section\s*\{[^}]*border/.test(production));
  assert(/\.home-company\s*\{[^}]*border-block:0/.test(styles));
});

test("Defender XDR is the canonical label without renaming separate products", () => {
  const product = products.find(product => product.id === "defender");
  assert.equal(product.name, "Defender XDR");
  assert.equal(productLink("Defender"), '<a href="sources.html#defender">Defender XDR</a>');
  assert.equal(productLink("Defender for Cloud"), '<a href="sources.html#defender-for-cloud">Defender for Cloud</a>');
  const briefs = JSON.parse(readFileSync(new URL("../content/briefs.json", import.meta.url), "utf8"));
  const threat = briefs.find(brief => brief.slug === "threat-protection");
  assert(threat.technologies.includes("Defender XDR"));
  assert(!JSON.stringify(threat).includes("Defender for Office 365"));
});

test("Azure Policy has explanatory depth comparable to Azure", () => {
  const wordCount = id => {
    const product = products.find(product => product.id === id);
    return [product.problem, product.solution, ...(product.details || [])].join(" ").split(/\s+/).length;
  };
  assert(wordCount("azure-policy") >= wordCount("azure") * 0.8);
  assert(wordCount("azure-policy") <= wordCount("azure") * 1.3);
  const policy = products.find(product => product.id === "azure-policy");
  assert.equal(policy.details.length, 2);
  assert(policy.details.join(" ").includes("Remediation and exceptions"));
});

test("Defender for Cloud has a distinct explanation and service destination", () => {
  const product = products.find(product => product.id === "defender-for-cloud");
  assert.equal(product.name, "Defender for Cloud");
  assert.equal(product.service, "security.html#cloud-security");
  assert.equal(product.group, "Threat protection and data security");
  assert.equal(product.details.length, 3);
  assert(!products.find(product => product.id === "defender").aliases.includes(product.name));
  assert.equal(productLink("Microsoft Defender for Cloud"), '<a href="sources.html#defender-for-cloud">Defender for Cloud</a>');
  assert(renderProductGuide().includes('id="defender-for-cloud"'));
});

test("cloud capabilities and briefs connect to Defender for Cloud", () => {
  const home = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  const securityCard = home.match(/<article class="platform-group" aria-labelledby="platform-security-title">([\s\S]*?)<\/article>/)[1];
  assert(securityCard.includes(productLink("Defender for Cloud")));
  const cloud = readFileSync(new URL("../docs/cloud-platforms.html", import.meta.url), "utf8");
  for (const id of ["landing-zones", "modernization", "operations"]) {
    const section = cloud.match(new RegExp(`<section class="practice" id="${id}"[\\s\\S]*?</section>`))[0];
    assert(section.includes(productLink("Defender for Cloud")), id);
  }
  const briefs = JSON.parse(readFileSync(new URL("../content/briefs.json", import.meta.url), "utf8"));
  for (const slug of ["cloud-platforms", "cloud-modernization"]) {
    const brief = briefs.find(brief => brief.slug === slug);
    assert(brief.technologies.includes("Defender for Cloud"));
    assert(brief.capabilities.some(item => item.includes("Defender for Cloud")));
  }
});

test("technical acronyms are spelled out before later shorthand", () => {
  const html = "<main><p>Use ZTNA instead of broad VPN access. ZTNA needs a pilot.</p><p>Test the VPN transition.</p></main>";
  const result = expandAcronyms(html);
  assert.equal(text(result), "Use Zero Trust Network Access (ZTNA) instead of broad virtual private network (VPN) access. ZTNA needs a pilot.Test the VPN transition.");
  assert.equal(expandAcronyms(result), result);
});

test("AI stays short across pages and removes previously generated definitions", () => {
  const source = '<main><p>Use AI and artificial intelligence (AI).</p><article><p>Use <span data-acronym="AI">artificial intelligence</span>.</p></article><p>We connect artificial intelligence and cloud.</p></main>';
  const result = expandAcronyms(source);
  assert.equal(result, '<main><p>Use AI and AI.</p><article><p>Use AI.</p></article><p>We connect artificial intelligence and cloud.</p></main>');
  assert.equal(expandAcronyms(result), result);
});

test("terms used once do not introduce unnecessary shorthand", () => {
  const result = expandAcronyms("<main><p>Plan DLP and CRM integration.</p></main>");
  assert.equal(text(result), "Plan data loss prevention and customer relationship management integration.");
  assert.equal(expandAcronyms(result), result);
});

test("later product names and resource links count as acronym reuse", () => {
  const result = expandAcronyms('<main><article><p>Use extended detection and response (XDR).</p><p class="brief-platforms">Defender XDR</p><a href="guide.html">XDR guidance</a></article></main>');
  assert(text(result).includes("extended detection and response (XDR)"));
  assert(result.includes('<p class="brief-platforms">Defender XDR</p>'));
  assert.equal(expandAcronyms(result), result);
});
test("existing definitions and standalone cards retain correct first-use explanations", () => {
  const html = "<main><article><p>Zero Trust Network Access (ZTNA) limits access. Use ZTNA deliberately.</p></article><article><p>ZTNA needs testing.</p></article></main>";
  const result = expandAcronyms(html);
  assert.equal(text(result), "Zero Trust Network Access (ZTNA) limits access. Use ZTNA deliberately.Zero Trust Network Access needs testing.");
  assert.equal(expandAcronyms(result), result);
});

test("existing prose definitions do not become duplicated or leave stray commas", () => {
  const html = "<main><p><strong>DLP</strong>, or data loss prevention, protects information. Apply DLP policies.</p><p><strong>Model Context Protocol</strong>, often shortened to MCP, connects tools. Review MCP servers.</p></main>";
  const result = expandAcronyms(html);
  assert.equal(text(result), "Data loss prevention (DLP) protects information. Apply DLP policies.Model Context Protocol (MCP) connects tools. Review MCP servers.");
  assert.equal(expandAcronyms(result), result);
});
test("acronym edits preserve links, labels, branded names, and contextual IP meaning", () => {
  const html = '<main><h1>AI Security</h1><p class="eyebrow">AI Governance</p><p>Use Defender XDR, Power BI, and Azure SQL. Review IP addresses and API access.</p><p>Protect engineering IP.</p><a href="https://example.com/API">API</a></main>';
  const result = expandAcronyms(html);
  assert(result.includes("<h1>AI Security</h1>"));
  assert(result.includes('<p class="eyebrow">AI Governance</p>'));
  assert(result.includes("Defender XDR, Power BI, and Azure SQL"));
  assert(result.includes("Internet Protocol"));
  assert(result.includes("intellectual property"));
  assert(result.includes("application programming interface"));
  assert(result.includes('href="https://example.com/API"'));
});

test("each product name has a problem-focused explanation and stable links", () => {
  assert.equal(new Set(products.map(product => product.id)).size, products.length);
  const guide = renderProductGuide();
  for (const product of products) {
    assert(product.problem.length > 30 && product.solution.length > 50);
    assert(guide.includes(`id="${product.id}"`));
    assert(product.docs.startsWith("https://"));
    for (const name of [product.name, ...(product.aliases || [])]) {
      assert(productLink(name).includes(`href="sources.html#${product.id}"`));
    }
  }
  assert.equal(productLink("Microsoft Entra Suite"), '<a href="sources.html#entra">Entra Suite</a>');
  assert.throws(() => productLink("Unknown product"), /Missing product explanation/);
});

test("product chips become links without changing other labels or nesting anchors", () => {
  const source = '<div class="product-tags"><span>Entra Private Access</span><span>Microsoft 365</span></div><span>Ordinary text</span>';
  const result = linkProductNames(source);
  assert(result.includes('href="sources.html#entra"'));
  assert(result.includes('href="sources.html#microsoft-365"'));
  assert(result.endsWith("<span>Ordinary text</span>"));
  assert.equal(linkProductNames(result), result);
});

test("Purview and Sentinel have substantive coverage comparable to their adjacent products", () => {
  const words = id => {
    const product = products.find(product => product.id === id);
    return [product.problem, product.solution, ...(product.details || [])].join(" ").split(/\s+/).length;
  };
  for (const [id, adjacent] of [["purview", "entra"], ["sentinel", "defender"]]) {
    assert(words(id) >= words(adjacent) * 0.8, `${id} needs comparable explanatory detail`);
    assert(words(id) <= words(adjacent) * 1.3, `${id} should remain balanced with ${adjacent}`);
  }
});

test("technical resources use the homepage Copilot group name without a duplicate guidance section", () => {
  const guide = renderProductGuide();
  assert(guide.includes('<h2 id="product-group-2">Copilot &amp; agents</h2>'));
  assert(guide.includes('<a href="#product-group-2">Copilot &amp; agents</a>'));
  assert.equal(products.filter(product => product.group === "Copilot & agents").length, 7);
  const source = readFileSync(new URL("../docs/sources.html", import.meta.url), "utf8");
  assert(!source.includes("Further planning and architecture guidance"));
  assert(!guide.includes("For broader concepts and terminology"));
});

test("planning references and unique capabilities live in the relevant product cards", () => {
  const references = [
    ["viva", "/viva/microsoft-viva-overview"],
    ["entra", "/entra/global-secure-access/overview-what-is-global-secure-access"],
    ["entra", "/security/zero-trust/zero-trust-overview"],
    ["defender", "/security/business/solutions/security-for-ai"],
    ["windows-365", "/windows-365/overview"],
    ["foundry", "/azure/ai-foundry/what-is-azure-ai-foundry"],
    ["microsoft-365-copilot", "/copilot/microsoft-365/microsoft-365-copilot-architecture"],
    ["microsoft-365-copilot", "/copilot/overview"],
    ["microsoft-365-copilot", "/copilot/microsoft-365/microsoft-365-copilot-setup"],
    ["copilot-studio", "/microsoft-copilot-studio/authoring-select-agent-model"],
    ["agent-365", "/microsoft-agent-365/overview"],
    ["agent-365", "/insidetrack/blog/becoming-a-frontier-firm-a-guide-for-deploying-ai-agents-based-on-our-experience-at-microsoft/"],
    ["agent-framework", "/agent-framework/overview/"],
    ["agent-framework", "/docs/learn/architecture"],
    ["fabric", "/fabric/fundamentals/microsoft-fabric-overview"],
    ["azure", "/azure/cloud-adoption-framework/ready/landing-zone/"],
    ["azure", "/azure/well-architected/"]
  ];
  const guide = renderProductGuide();
  for (const [id, path] of references) {
    const product = products.find(product => product.id === id);
    const urls = [product.docs, ...(product.additionalDocs || []).map(([, url]) => url)];
    const url = urls.find(url => new URL(url).pathname.replace(/^\/en-us(?=\/)/, "") === path);
    assert(url, `${id} must retain ${path}`);
    const card = guide.match(new RegExp(`<article[^>]+id="${id}">([\\s\\S]*?)</article>`))[1];
    assert(card.includes(`href="${url}"`));
  }
  for (const [id, concept] of [
    ["entra", "assume breach"],
    ["defender", "Security for AI"],
    ["microsoft-365-copilot", "Copilot Chat"],
    ["microsoft-365-copilot", "Readiness and adoption"],
    ["copilot-studio", "regional availability"],
    ["agent-365", "user training"],
    ["agent-framework", "Model Context Protocol"],
    ["azure", "Landing zones"],
    ["azure", "Well-Architected Framework"]
  ]) {
    const product = products.find(product => product.id === id);
    assert([product.solution, ...(product.details || [])].join(" ").includes(concept));
  }
});
