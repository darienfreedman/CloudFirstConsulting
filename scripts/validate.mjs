import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCatalogs, validateCatalogs } from "./catalogs.mjs";
import { resourceMenuGroups, serviceMenuGroups, syncResourceBreadcrumbs } from "./navigation.mjs";
import { normalizeProductNames } from "./public-copy.mjs";
import { products, productLink, homepageProductGroups, homepageProductsInGroup } from "./products.mjs";
import { expandAcronyms } from "./acronyms.mjs";
import { technologyTopics } from "../shared/resource-topics.mjs";

const site = fileURLToPath(new URL("../src/site", import.meta.url));
const catalogs = await readCatalogs();
validateCatalogs(catalogs);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(target));
    else {
      assert(!entry.isSymbolicLink(), `Do not publish symlinks: ${target}`);
      files.push(target);
    }
  }
  return files;
}

const files = await collect(site);
assert(!files.some(file => /^(?:sample-.+|deliverables)\.html$/.test(path.basename(file))), "Removed sample pages must not be published");
const approvedImages = new Set(["ai-planning-640.webp", "ai-planning-1440.webp", "Logo.png"]);
assert(!files.some(file => file.startsWith(path.join(site, "assets", "images") + path.sep) && !approvedImages.has(path.basename(file))), "Unexpected image asset");
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const pages = new Map();
for (const file of files) {
  if (file.endsWith(".png")) {
    const bytes = await readFile(file);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `Invalid PNG: ${file}`);
    continue;
  }
  if (file.endsWith(".webp")) {
    const bytes = await readFile(file);
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF", `Invalid image container: ${file}`);
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP", `Invalid WebP: ${file}`);
    assert(bytes.length < 500000, `Image needs optimization: ${file}`);
    continue;
  }
  if (file.endsWith(".pdf")) {
    assert.equal(path.dirname(file), path.join(site, "downloads"), `PDF outside downloads directory: ${file}`);
    assert(catalogs.briefs.some(brief => path.basename(file) === `cloud-first-${brief.slug}-brief.pdf`), `Unexpected or obsolete PDF in public downloads: ${file}`);
    const bytes = await readFile(file);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", `Invalid PDF: ${file}`);
    assert.equal([...bytes.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length, 1, `Service brief must be one page: ${file}`);
    continue;
  }
  assert(/\.(?:html|css|js|svg)$/.test(file) || [".nojekyll", "CNAME", "robots.txt", "THIRD_PARTY_NOTICES.txt"].includes(path.basename(file)), `Unexpected public asset: ${file}`);
  const text = await readFile(file, "utf8");
  assert(!/microsoft(?:-my)?\.sharepoint\.com|catalog\.ms|BEGIN (?:RSA |EC )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20}/i.test(text), `Review possible internal content or credentials: ${file}`);
  if (file.endsWith(".html")) {
    assert.equal([...text.matchAll(/<script src="assets\/theme\.js"><\/script>/g)].length, 1, `Missing early appearance script: ${file}`);
    assert(text.indexOf('src="assets/theme.js"') < text.indexOf('href="assets/styles.css"'), `Theme must initialize before styles load: ${file}`);
    assert.equal([...text.matchAll(/class="theme-toggle"/g)].length, 1, `Expected one appearance toggle: ${file}`);
    const stylesheets = [...text.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)];
    assert.equal(stylesheets.at(-1)?.[1], "assets/theme.css", `Theme styles must load last: ${file}`);
    const copy = text.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ");
    assert(!/artificial intelligence\s*\(AI\)/i.test(copy), `AI should not be expanded: ${file}`);
    assert(!text.includes('data-acronym="AI"'), `AI expansion marker remains: ${file}`);
    if (/^insight(?:s|-.*)\.html$/.test(path.basename(file))) {
      assert(!/<time\b|class="article-meta"/.test(text), `Remove dates from perspectives: ${file}`);
    }
    assert.equal(normalizeProductNames(copy), copy, `Inconsistent product prefix in visible copy: ${file}`);
    assert(!/\bMicrosoft\s+(?!365\b|Corporation\b)[A-Z][A-Za-z]+/.test(copy), `Review an unexpected Microsoft-prefixed name: ${file}`);
    for (const [, value] of text.matchAll(/\b(?:aria-label|alt|title|placeholder)="([^"]*)"/g)) {
      assert.equal(normalizeProductNames(value), value, `Inconsistent accessible product name: ${file}`);
    }
    const description = text.match(/<meta name="description" content="([^"]*)"/)?.[1];
    if (description) assert.equal(normalizeProductNames(description), description, `Inconsistent product name in metadata: ${file}`);
    assert(!/\b[A-Za-z]+(?:['\u2019]|&(?:apos|rsquo);|&#(?:39|8217);)(?:S|T|RE|VE|LL|D|M)\b/.test(copy), `Capitalized contraction or possessive suffix: ${file}`);
    assert(!/\bPut IT into practice\b/.test(copy), `Pronoun incorrectly capitalized as an acronym: ${file}`);
    const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size, `Duplicate IDs: ${file}`);
    assert.equal([...text.matchAll(/<h1(?:\s|>)/g)].length, 1, `Expected one h1: ${file}`);
    assert(text.includes('lang="en"'), `Missing page language: ${file}`);
    assert(text.includes("Content-Security-Policy"), `Missing resource policy: ${file}`);
    assert(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(text), `Inline executable script: ${file}`);
    assert(!/\s(?:style|on\w+)=/i.test(text), `Inline styles/event handlers conflict with CSP: ${file}`);
    assert(!/<\/[a-z][a-z0-9]*\s+[^>\s]/i.test(text), `Malformed closing tag: ${file}`);
    assert(!/\b(?:fictional|illustrative|preview|demonstration|partners?)\b|Patriot|BlueVoyant|Netrix|[—–·]|&(?:mdash|ndash|middot);|&#(?:183|8211|8212);/i.test(text), `Non-production copy or punctuation: ${file}`);
    assert(!/\bEASM\b|external-attack-surface-management|external attack surface management/i.test(text), `Out-of-scope EASM content: ${file}`);
    for (const match of text.matchAll(/\bcloud\s+(?:and|&amp;)\s+ai\b/gi)) assert.equal(match[0], "Cloud and AI", `Inconsistent terminology: ${file}`);
    assert(!/\b(?:than|with|for|to|build|create|start|make|use|define)\s+A\s+[a-z]/.test(text), `Incorrect article capitalization: ${file}`);
    for (const image of text.matchAll(/<img\b[^>]*>/g)) {
      assert(/\balt="[^"]+"/.test(image[0]), `Image needs descriptive alt text: ${file}`);
      assert(/\bwidth="\d+"/.test(image[0]) && /\bheight="\d+"/.test(image[0]), `Image needs layout dimensions: ${file}`);
    }
    pages.set(file, { text, ids: new Set(ids) });
  }
}

let links = 0;
for (const [file, { text, ids }] of pages) {
  for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll("&amp;", "&");
    if (/^https:\/\//.test(value)) continue;
    assert(!value.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/i.test(value), `Nonportable or unsupported URL in ${file}: ${value}`);
    const [pathname, fragment] = value.split("#");
    const target = path.resolve(path.dirname(file), decodeURIComponent(pathname || path.basename(file)));
    assert(target === site || target.startsWith(`${site}${path.sep}`), `URL escapes public directory: ${value}`);
    const metadata = await stat(target);
    const resolved = metadata.isDirectory() ? path.join(target, "index.html") : target;
    assert(files.includes(resolved), `Missing asset: ${value} in ${file}`);
    if (fragment) assert(pages.get(resolved)?.ids.has(fragment), `Missing anchor ${value} in ${file}`);
    links += 1;
  }
  for (const match of text.matchAll(/\b(?:aria-controls|aria-labelledby)="([^"]+)"/g)) {
    for (const id of match[1].split(/\s+/)) assert(ids.has(id), `Missing ARIA target ${id} in ${file}`);
  }
  for (const match of text.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) {
      const [asset, descriptor] = candidate.trim().split(/\s+/);
      assert(/^\d+w$/.test(descriptor), `Invalid responsive image descriptor: ${file}`);
      assert(files.includes(path.resolve(path.dirname(file), asset)), `Missing responsive image: ${asset}`);
    }
  }
}

const homepage = pages.get(path.join(site, "index.html")).text;
const hero = homepage.match(/<section class="hero home-hero[^"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert(hero?.includes("AI Security &amp; AI Governance Consulting"), "Homepage must lead with AI Security and AI Governance consulting");
assert(!hero.includes('class="hero-footnote"'), "Removed delivery-stage tagline must not return");
assert(hero.includes("operationalize agentic AI."), "Preserve the homepage hero's explicit agentic AI exception");
assert(!hero.includes("agentic <span"), "Do not expand the homepage hero's agentic AI wording");
assert(!homepage.includes("data-react-product"), "Homepage must not contain the removed sample widget");
assert.equal([...homepage.matchAll(/class="service-card home-service"/g)].length, 3, "Expected three homepage service summaries");
assert(homepage.indexOf('aria-labelledby="expertise-title"') < homepage.indexOf('aria-labelledby="platform-title"'), "Lead with services before the product ecosystem");
assert(homepage.indexOf('aria-labelledby="platform-title"') < homepage.indexOf("data-react-ai-focus"), "Introduce the offering before the interactive AI guide");
const platformGroups = [...homepage.matchAll(/<article class="platform-group" aria-labelledby="([^"]+)">([\s\S]*?)<\/article>/g)];
assert.equal(platformGroups.length, 4, "Group the Microsoft ecosystem into four customer capabilities");
assert.deepEqual(platformGroups.map(([, id]) => id), [
  "platform-workplace-title", "platform-security-title", "platform-agents-title", "platform-cloud-title"
], "Ecosystem boxes must follow the requested desktop and mobile reading order");
for (const [, id, group] of platformGroups) {
  const category = homepageProductGroups[id];
  assert(category, `Unexpected ecosystem category: ${id}`);
  assert.equal(group.match(/<p class="eyebrow">([^<]+)<\/p>/)?.[1], category.replaceAll("&", "&amp;"), `Incorrect ecosystem label: ${id}`);
  const links = [...group.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
  assert.deepEqual(links.map(([, , label]) => label), homepageProductsInGroup(category).map(product => product.name), `Missing, misplaced, or unsorted products in ${id}`);
  for (const [, href, label] of links) assert.equal(`<a href="${href}">${label}</a>`, productLink(label), `Product needs its explanation: ${label}`);
  assert(!/\bM365\b/.test(homepage), "Use Microsoft 365 in homepage product names and copy");
  assert(!/home-copilot|copilot-callout|copilot-explained-title/.test(homepage), "Removed homepage Copilot callout must not return");
}
assert(!/class="engagement-card"|<details>|role="tabpanel"|class="industry-card"/.test(homepage), "Detailed content belongs on dedicated pages");
assert([...homepage.matchAll(/href="(#[^"]+)"/g)].every((match) => match[1] === "#main"), "Homepage links should navigate to pages, except the skip link");
const engagements = pages.get(path.join(site, "engagements.html")).text;
assert.equal([...engagements.matchAll(/class="engagement-card"/g)].length, 4, "Expected four customer engagement outlines");
assert(!/<form\b|<input\b/i.test(engagements.match(/<main\b[\s\S]*?<\/main>/)[0]), "Engagement planning must not collect personal data");
assert.equal([...pages.get(path.join(site, "faq.html")).text.matchAll(/<details>/g)].length, 14, "Expected fourteen FAQs on their own page");
assert.equal([...pages.get(path.join(site, "industries.html")).text.matchAll(/class="catalog-card industry-card"/g)].length, catalogs.industries.length, "Industry directory must include every catalog entry");
for (const industry of catalogs.industries) {
  const page = pages.get(path.join(site, `industry-${industry.slug}.html`));
  assert(page, `Missing industry page: ${industry.slug}`);
  assert.equal([...page.text.matchAll(/class="use-case catalog-card"/g)].length, industry.cases.length, `Incomplete use-case content: ${industry.slug}`);
}
for (const [page, expectedPractices] of [["security.html", 8], ["ai-business.html", 5], ["cloud-platforms.html", 5]]) {
  const content = pages.get(path.join(site, page))?.text;
  assert(content, `Missing customer service page: ${page}`);
  assert.equal([...content.matchAll(/class="practice"/g)].length, expectedPractices, `Incomplete service portfolio: ${page}`);
  assert.equal([...content.matchAll(/<div class="practice-intro">\s*<div class="icon-label">/g)].length, expectedPractices, `Every service capability needs an icon-label heading: ${page}`);
  assert(!/<p class="eyebrow">\d+\s*\//.test(content), `Numbered capability label remains: ${page}`);
  assert(content.includes('href="engagements.html'), `Missing engagement path: ${page}`);
  assert(homepage.includes(`href="${page}"`), `Service page not discoverable from homepage: ${page}`);
}
const directory = pages.get(path.join(site, "services.html")).text;
assert.equal([...directory.matchAll(/<section class="directory-row"[^>]*>\s*<div><div class="icon-label">/g)].length, 3, "Every service directory heading needs an icon-label row");
assert(!/<p class="eyebrow">\d+\s*\//.test(directory), "Numbered service directory label remains");
const directoryRows = [...directory.matchAll(/<section class="directory-row"[^>]*>([\s\S]*?)<\/section>/g)];
for (const [index, group] of serviceMenuGroups.entries()) {
  const content = pages.get(path.join(site, group.href)).text;
  assert.equal(content.match(/<h1(?:\s[^>]*)?>([^<]+)<\/h1>/)?.[1], `${group.title} consulting`, `Standardize the consulting page title: ${group.href}`);
  assert.equal(content.match(/<title>([^<]+)<\/title>/)?.[1], `${group.title} consulting | CFC`, `Standardize the browser title: ${group.href}`);
  const sections = [...content.matchAll(/<section class="practice" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  assert.deepEqual(sections.map(([, id]) => `${group.href}#${id}`), group.links.map(([href]) => href), `Capability ordering differs from the service catalog: ${group.href}`);
  assert.deepEqual(sections.map(([, , section]) => section.match(/<p class="eyebrow">([^<]+)<\/p>/)?.[1]), group.links.map(([, title]) => title), `Capability titles differ from the service catalog: ${group.href}`);
  const practiceNav = content.match(/<nav class="practice-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert(practiceNav, `Missing in-page capability navigation: ${group.href}`);
  const localLinks = [...practiceNav.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(([, href, title]) => [group.href + href, title]);
  assert.deepEqual(localLinks, group.links, `In-page navigation differs from capability sections: ${group.href}`);
  const row = directoryRows[index][1];
  assert.equal(row.match(/<p class="eyebrow">([^<]+)<\/p>/)?.[1], group.title, "Service categories must use the same names and order");
  const nav = row.match(new RegExp(`<nav data-service-group="${group.key}"[^>]*>([\\s\\S]*?)</nav>`))?.[1];
  assert(nav, `Missing directory group ${group.key}`);
  const directoryLinks = [...nav.matchAll(/<a href="([^"]+)">([^<]+)<span/g)].map(([, href, title]) => [href, title.trim()]);
  assert.deepEqual(directoryLinks, group.links, `Service directory differs from consulting page: ${group.href}`);
  for (const html of [homepage, directory]) {
    assert(html.includes(`href="${group.href}">${group.cta} <span`), `Inconsistent service CTA: ${group.href}`);
  }
}
const technologyGuide = pages.get(path.join(site, "technology-deep-dives.html")).text;
for (const topic of technologyTopics) {
  assert(technologyGuide.includes(`id="${topic.id}"`), `Preserve topic bookmark: ${topic.id}`);
  assert(technologyGuide.includes(`href="deep-dive-${topic.id}.html"`), `Missing deep-dive card: ${topic.id}`);
  assert(pages.has(path.join(site, `deep-dive-${topic.id}.html`)), `Missing deep-dive article: ${topic.id}`);
}
for (const file of ["index.html", "ai-business.html", "sources.html", "brief-ai-business.html"]) {
  assert(pages.get(path.join(site, file)).text.includes("Viva"), `Missing Viva coverage: ${file}`);
}
const secureAccess = pages.get(path.join(site, "security.html")).text.match(/<section class="practice" id="secure-access"[\s\S]*?<\/section>/)?.[0];
for (const term of ["Entra Private Access", "Entra Internet Access", "ZTNA", "SWG", "SSE", "SASE", "VPN"]) {
  assert(secureAccess?.includes(term), `Missing secure-access explanation: ${term}`);
}
for (const [file, { text }] of pages) {
  assert.equal(expandAcronyms(text, path.basename(file)), text, `Acronym explanations must be stable across builds: ${file}`);
  assert.equal(syncResourceBreadcrumbs(text, path.basename(file)), text, `Resource breadcrumbs must match the navigation hierarchy: ${file}`);
  for (const [, group] of text.matchAll(/<div class="product-tags">([\s\S]*?)<\/div>/g)) {
    assert(!/<span>/.test(group), `Unlinked product name: ${file}`);
    for (const [, href, name] of group.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)) {
      assert.equal(`<a href="${href}">${name}</a>`, productLink(name), `Incorrect product destination: ${file}`);
    }
  }
  for (const row of text.matchAll(/<div class="icon-label">([\s\S]*?)<\/div>/g)) {
    assert(/^<span class="capability-icon"[^>]*><svg\b[\s\S]*?<\/svg><\/span><p class="(?:eyebrow|card-kicker)">[^<]*<\/p>$/.test(row[1]), `Malformed icon-label row: ${file}`);
  }
}
const resources = pages.get(path.join(site, "sources.html"));
for (const product of products) assert(resources.ids.has(product.id), `Missing product explanation: ${product.name}`);
const resourceHub = pages.get(path.join(site, "resources.html"));
assert(resourceHub, "Missing Resources hub");
for (const group of resourceMenuGroups) {
  assert(resourceHub.ids.has(group.id), `Missing resource category: ${group.title}`);
  for (const [href] of group.links) assert(resourceHub.text.includes(`href="${href}"`), `Missing resource hub destination: ${href}`);
}
for (const [file, { text }] of pages) {
  assert(!/href="(?:sample-[^"]+|deliverables\.html)"|data-react-product|Sample deliverables/i.test(text), `Removed sample content remains: ${file}`);
  for (const brand of text.matchAll(/<a class="brand" href="([^"]+)"/g)) assert.equal(brand[1], "index.html", `Logo must open the home page explicitly: ${file}`);
  assert(!/data-agent=|data-scenario-link=|developer-CEO|agent workforce|demo lab|#experience|#agents/i.test(text), "Internal operating model or demo navigation must not appear in customer pages");
  assert(!/href="index\.html#/.test(text), `Outdated homepage section link: ${file}`);
  if (path.basename(file) === "404.html") continue;
  const navigation = text.match(/<nav id="primary-nav"[\s\S]*?<\/nav>/)?.[0];
  assert(navigation, `Missing primary navigation: ${file}`);
  for (const section of ["services", "industries", "resources"]) {
    assert(navigation.includes(`data-nav-trigger="${section}"`) && navigation.includes(`id="nav-panel-${section}"`), `Missing navigation section ${section}: ${file}`);
  }
  const destinations = new Set([...navigation.matchAll(/href="([^"]+)"/g)].map((match) => match[1]));
  for (const href of ["services.html", "industries.html", "resources.html", "resources.html#insights", "about.html", "contact.html", ...catalogs.industries.map(industry => `industry-${industry.slug}.html`), ...serviceMenuGroups.flatMap(group => [group.href, ...group.links.map(([href]) => href)]), ...resourceMenuGroups.flatMap(group => [group.href, ...group.links.map(([href]) => href)])]) {
    assert(destinations.has(href), `Navigation hides destination ${href}: ${file}`);
  }
  if (path.basename(file) !== "index.html") assert(text.includes('aria-label="Breadcrumb"'), `Missing breadcrumbs: ${file}`);
}
for (const page of ["security.html", "ai-business.html", "cloud-platforms.html"]) {
  const content = pages.get(path.join(site, page)).text;
  assert.equal([...content.matchAll(/class="service-blueprint"/g)].length, 1, `Expected one service diagram: ${page}`);
}
for (const { slug: domain } of catalogs.briefs) {
  assert(files.includes(path.join(site, "downloads", `cloud-first-${domain}-brief.pdf`)), `Missing PDF brief: ${domain}`);
  assert(pages.has(path.join(site, `brief-${domain}.html`)), `Missing accessible HTML brief: ${domain}`);
}
for (const page of ["contact.html", "booking.html", "trust-center.html", "insights.html", "stories.html"]) {
  assert(pages.has(path.join(site, page)), `Missing customer journey: ${page}`);
}
for (const name of ["scenario-security", "scenario-data-ai", "scenario-ai-governance"]) {
  assert(/Solution example/i.test(pages.get(path.join(site, `${name}.html`)).text), `Scenario must remain an example, not a fabricated client result: ${name}`);
}
const contact = pages.get(path.join(site, "contact.html")).text;
assert(contact.includes("data-react-contact") && contact.includes('src="assets/react-ui.js"'), "Contact page must load the React inquiry form");
assert(contact.includes("form-action 'none'") && contact.includes("connect-src 'self'"), "Contact submission must be controlled by the React API client");
assert(contact.includes("style-src 'self' 'unsafe-inline'"), "Fluent UI requires its runtime style injection policy");
assert(!contact.includes('data-provider="contactFormUrl"'), "Do not duplicate the embedded form with a separate inquiry card");
assert(contact.includes('data-provider="bookingUrl" hidden'), "Booking must stay hidden until an approved URL is available");
assert(pages.get(path.join(site, "services.html")).text.includes("data-service-controls"), "Missing service selector");
assert(engagements.includes("data-engagement-finder"), "Missing engagement finder");
assert(homepage.includes("data-react-ai-focus"), "Missing AI priority guide");
assert(pages.has(path.join(site, "technology-explained.html")), "Missing plain-language technology guide");
assert(pages.has(path.join(site, "industry-professional-services.html")), "Keep the previous professional-services route available");
const css = await readFile(path.join(site, "assets", "styles.css"), "utf8");
assert(!/@import|url\(\s*['"]?https?:/i.test(css), "Styles must not load remote assets");
console.log(`Validated ${htmlFiles.length} pages, ${links} local links, public asset boundaries, and content structure.`);
