import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { header, footer, resourceMenuGroups } from "./navigation.mjs";
import { publicCopy } from "./public-copy.mjs";
import { escapeHtml as escape } from "../shared/html.mjs";
import { renderIcon } from "./icons.mjs";
import { productLink } from "./products.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
export const categories = ["Security", "AI Business Solutions", "Cloud and AI Platforms"];
const segments = ["Business & services", "Public & social", "Industry & infrastructure"];
const list = (items) => `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`;
const tags = (items) => `<div class="product-tags">${items.map((item) => `<span>${escape(item)}</span>`).join("")}</div>`;

export async function readCatalogs() {
  return {
    industries: JSON.parse(await readFile(path.join(root, "content", "industries.json"), "utf8")),
    briefs: JSON.parse(await readFile(path.join(root, "content", "briefs.json"), "utf8"))
  };
}

export function validateCatalogs({ industries, briefs }) {
  assert(Array.isArray(industries) && industries.length > 0, "Expected a nonempty industry catalog");
  assert.equal(briefs.length, 12, "Expected three overview and nine capability briefs");
  for (const collection of [industries, briefs]) {
    assert.equal(new Set(collection.map((item) => item.slug)).size, collection.length, "Catalog slugs must be unique");
    for (const item of collection) assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug), "Invalid catalog slug");
  }
  const text = (value) => assert(typeof value === "string" && value.trim().length > 0, "Catalog text must not be empty");
  for (const brief of briefs) {
    assert(categories.includes(brief.category));
    assert(["Overview", "Capability"].includes(brief.kind));
    for (const key of ["title", "headline", "summary", "outcome", "startingPoint", "prepare", "service"]) text(brief[key]);
    for (const key of ["capabilities", "deliverables", "technologies"]) {
      assert(Array.isArray(brief[key]) && brief[key].length >= 3);
      brief[key].forEach(text);
    }
  }
  for (const category of categories) {
    const group = briefs.filter((brief) => brief.category === category);
    assert.equal(group.length, 4);
    assert.equal(group.filter((brief) => brief.kind === "Overview").length, 1);
  }
  for (const industry of industries) {
    text(industry.name); text(industry.intro);
    assert(segments.includes(industry.segment));
    assert.equal(industry.priorities.length, 3); industry.priorities.forEach(text);
    assert(Array.isArray(industry.cases) && industry.cases.length >= 4, "Each industry needs at least four use cases");
    assert.equal(new Set(industry.cases.map((item) => item.title)).size, industry.cases.length);
    for (const useCase of industry.cases) {
      for (const key of ["title", "challenge", "approach", "measure", "guardrail", "service"]) text(useCase[key]);
      assert(briefs.some((brief) => brief.slug === useCase.brief));
      assert(useCase.deliverables.length >= 2); useCase.deliverables.forEach(text);
      assert(useCase.tech.length >= 2); useCase.tech.forEach(text);
    }
  }
}

function page(filename, title, description, body, extraCss = "catalog.css", script = false) {
  return publicCopy(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description)}"><meta name="theme-color" content="#0078d4"><meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>${escape(title)} | Cloud First Consulting</title><link rel="icon" href="assets/favicon.png" type="image/png" sizes="64x64"><link rel="stylesheet" href="assets/styles.css"><link rel="stylesheet" href="assets/${extraCss}"><script src="assets/app.js" defer></script>${script ? '<script src="assets/react-ui.js" defer></script>' : ""}
</head>
<body><a class="skip-link" href="#main">Skip to content</a>${header(filename)}
<main id="main">${body}</main>${footer}
</body></html>
`, filename);
}

function crumbs(label, parent) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span>${parent ? `<a href="${parent[0]}">${escape(parent[1])}</a><span aria-hidden="true">/</span>` : ""}<span aria-current="page">${escape(label)}</span></nav>`;
}

function controls(label, filters) {
  return `<div class="catalog-toolbar" data-catalog-controls hidden><div class="catalog-search"><label for="catalog-search">${escape(label)}</label><input type="search" id="catalog-search" placeholder="Search by name, topic, or technology" aria-controls="catalog-items" autocomplete="off"></div><div class="catalog-filters" role="group" aria-label="Filter catalog"><button type="button" data-filter="all" aria-pressed="true" aria-controls="catalog-items">All</button>${filters.map((filter) => `<button type="button" data-filter="${escape(filter)}" aria-pressed="false" aria-controls="catalog-items">${escape(filter)}</button>`).join("")}</div><button class="secondary-button catalog-clear" type="button" id="catalog-clear">Clear filters</button></div>`;
}

function useCaseSearchText(item) {
  return [item.title, item.challenge, item.approach, ...item.deliverables, ...item.tech, item.brief.replaceAll("-", " ")].join(" ");
}

export function renderIndustries(industries) {
  const useCaseCount = industries.reduce((total, industry) => total + industry.cases.length, 0);
  const cards = [...industries].sort((a, b) => a.name.localeCompare(b.name)).map((industry) => `<article class="catalog-card industry-card" data-category="${escape(industry.segment)}" data-search="${escape([industry.name, industry.intro, ...industry.priorities, ...industry.cases.map(useCaseSearchText)].join(" "))}">${renderIcon(industry.slug)}<p class="eyebrow">${escape(industry.segment)}</p><h2><a href="industry-${industry.slug}.html">${escape(industry.name)}</a></h2><p>${escape(industry.intro)}</p>${list(industry.priorities)}<a class="card-link" href="industry-${industry.slug}.html">Explore ${industry.cases.length} use cases <span aria-hidden="true">&#8599;</span></a></article>`).join("\n");
  return page("industries.html", "Industry use cases", `Explore ${useCaseCount} practical security, business AI, and cloud use cases across ${industries.length} industry and business portfolios.`, `
    <section class="section-wrap page-hero">${crumbs("Industries")}<p class="eyebrow">Industry solutions</p><h1>Technology for your industry</h1><p>Explore security, AI, and cloud use cases for ${industries.length} industries. Find relevant services, delivery requirements, and measures for your organization.</p></section>
    <section class="section-wrap section-space" data-catalog="industry" aria-label="Industry directory">${controls("Find your industry", segments)}<p class="catalog-status" id="catalog-status" role="status" aria-live="polite">${industries.length} industries with ${useCaseCount} defined use cases</p><div class="catalog-grid" id="catalog-items">${cards}</div><div class="catalog-empty" id="catalog-empty" hidden><h2>No matching industries</h2><p>Try a broader term or clear the filters.</p></div></section>
    <section class="section-wrap closing-section"><div><p class="eyebrow">Start with your priorities</p><h2>Turn a relevant use case<br>into a focused conversation.</h2></div><a class="button" href="contact.html">Contact us <span aria-hidden="true">&#8599;</span></a></section>`, "catalog.css", true);
}

export function renderIndustry(industry, briefs) {
  const availableCategories = categories.filter((category) => industry.cases.some((item) => briefs.find((brief) => brief.slug === item.brief).category === category));
  const useCases = industry.cases.map((item, index) => {
    const brief = briefs.find((entry) => entry.slug === item.brief);
    return `<article class="use-case catalog-card" id="use-case-${index + 1}" data-category="${escape(brief.category)}" data-search="${escape(`${useCaseSearchText(item)} ${brief.category}`)}"><p class="eyebrow">${escape(brief.category)}</p><h2>${escape(item.title)}</h2><p class="use-case-challenge">${escape(item.challenge)}</p><h3>Approach</h3><p>${escape(item.approach)}</p><h3>Deliverables</h3>${list(item.deliverables)}<p class="use-case-measure"><strong>Success measures:</strong> ${escape(item.measure)}</p><details class="use-case-requirements"><summary>Requirements to consider</summary><p>${escape(item.guardrail)}</p></details>${tags(item.tech)}<div class="use-case-links"><a href="${escape(item.service)}">Related service <span aria-hidden="true">&#8599;</span></a><a href="brief-${item.brief}.html">Read the one-pager <span aria-hidden="true">&#8599;</span></a></div></article>`;
  }).join("\n");
  return page(`industry-${industry.slug}.html`, `${industry.name} use cases`, industry.intro, `
    <section class="section-wrap page-hero">${crumbs(industry.name, ["industries.html", "Industries"])}${renderIcon(industry.slug)}<p class="eyebrow">Industry solutions</p><h1>${escape(industry.name)}</h1><p>${escape(industry.intro)}</p><div class="priority-tags">${industry.priorities.map((priority) => `<span>${escape(priority)}</span>`).join("")}</div></section>
    <section class="section-wrap section-space" data-catalog="use-case" aria-label="${escape(industry.name)} use cases">${controls(`Find a use case for ${industry.name}`, availableCategories)}<p class="catalog-status" id="catalog-status" role="status" aria-live="polite">${industry.cases.length} use cases across ${availableCategories.length} service areas</p><div class="use-case-grid" id="catalog-items">${useCases}</div><div class="catalog-empty" id="catalog-empty" hidden><h2>No matching use cases</h2><p>Try a broader topic or Microsoft technology, or clear the filters.</p></div></section>
    <section class="section-wrap service-next"><div><p class="eyebrow">From context to a next step</p><h2>Choose the challenge<br>that matters to your organization.</h2><p>Bring the business owner, relevant systems and data, and your constraints. Define a bounded assessment or pilot with success criteria and an accountable decision.</p><a class="button" href="contact.html">Prepare a conversation <span aria-hidden="true">&#8599;</span></a></div><aside><h3>Explore further</h3><a href="engagements.html">Engagement options <span>&#8599;</span></a><a href="briefs.html">All service one-pagers <span>&#8599;</span></a><a href="industries.html">Browse all industries <span>&#8599;</span></a></aside></section>`, "catalog.css", true);
}

export function renderBrief(brief) {
  return page(`brief-${brief.slug}.html`, `${brief.title} brief`, brief.summary, `
    <div class="section-wrap brief-page">${crumbs(brief.title, ["briefs.html", "Service briefs"])}<p class="brief-format-note">Read the guide below or download it in Portable Document Format (PDF).</p>
    <article class="brief-sheet"><p class="brief-brand">Cloud First <span>CONSULTING</span></p><p class="brief-kicker">${escape(brief.category)}</p><h1>${escape(brief.title)}</h1><p class="brief-lead">${escape(brief.summary)}</p><div class="brief-columns"><section><h2>Capabilities</h2>${list(brief.capabilities)}</section><section><h2>Deliverables</h2>${list(brief.deliverables)}<h2>Business value</h2><p>${escape(brief.outcome)}</p></section></div><section class="brief-next"><h2>${escape(brief.startingPoint)}</h2><p>${escape(brief.prepare)}</p></section><p class="brief-platforms">${brief.technologies.map(productLink).join(", ")}</p><p class="brief-disclosure">&copy; 2026 Cloud First Consulting</p></article>
    <div class="brief-actions"><a class="button" href="downloads/cloud-first-${brief.slug}-brief.pdf" download>Download one-page PDF <span aria-hidden="true">&#8595;</span></a><a class="text-link" href="${escape(brief.service)}">Explore the related service <span aria-hidden="true">&#8599;</span></a></div></div>`, "briefs.css");
}

export function renderBriefs(briefs) {
  const groups = categories.map((category) => `<section class="catalog-group" data-catalog-group><div class="section-heading"><h2>${escape(category)}</h2><p>Service overviews and capability guides.</p></div><div class="brief-grid">${briefs.filter((brief) => brief.category === category).map((brief) => `<article class="catalog-card brief-card" data-category="${escape(category)}" data-search="${escape(`${brief.title} ${brief.summary} ${brief.technologies.join(" ")}`)}"><p class="eyebrow">${escape(brief.kind)} brief</p><h3>${escape(brief.title)}</h3><p>${escape(brief.summary)}</p><div class="brief-card-actions"><a class="button" href="downloads/cloud-first-${brief.slug}-brief.pdf" download>Download PDF <span aria-hidden="true">&#8595;</span></a><a class="text-link" href="brief-${brief.slug}.html">Read online <span aria-hidden="true">&#8599;</span></a></div></article>`).join("\n")}</div></section>`).join("\n");
  return page("briefs.html", "Download service briefs", "Twelve one-page service briefs covering Security, AI Business Solutions, and Cloud and AI Platforms, with accessible web versions.", `
    <section class="section-wrap page-hero">${crumbs("Service briefs", ["resources.html#plan-your-project", "Plan your project"])}<p class="eyebrow">Service guides</p><h1>Download a service brief</h1><p>Review the scope, deliverables, and requirements for each service. Download a one-page guide in Portable Document Format (PDF), or read the web version.</p></section>
    <section class="section-wrap section-space" data-catalog="brief" aria-label="Service brief library">${controls("Find a service brief", categories)}<p class="catalog-status" id="catalog-status" role="status" aria-live="polite">12 briefs across 3 service areas</p><div id="catalog-items">${groups}</div><div class="catalog-empty" id="catalog-empty" hidden><h2>No matching briefs</h2><p>Try a broader term or clear the filters.</p></div></section>`, "catalog.css", true);
}

export function renderProfessionalServicesHub(industries) {
  const slugs = ["legal", "accounting-advisory", "architecture-engineering", "staffing-recruitment"];
  const sectors = slugs.map(slug => {
    const sector = industries.find(industry => industry.slug === slug);
    assert(sector, `Missing professional-services sector: ${slug}`);
    return sector;
  });
  return page("industry-professional-services.html", "Professional services", "Find technology use cases for legal, accounting, architecture, engineering, staffing, and recruitment organizations.", `
    <section class="section-wrap page-hero">${crumbs("Professional services", ["industries.html", "Industries"])}<p class="eyebrow">Choose your area of practice</p><h1>Professional services</h1><p>Explore more specific guidance for your organization. Each practice area has its own security, data, and AI use cases.</p></section>
    <section class="section-wrap section-space"><div class="sector-hub-grid">${sectors.map(sector => `<article class="service-card">${renderIcon(sector.slug)}<h2>${escape(sector.name)}</h2><p>${escape(sector.intro)}</p><a class="card-link" href="industry-${sector.slug}.html">Explore ${sector.cases.length} use cases <span aria-hidden="true">&#8599;</span></a></article>`).join("")}</div></section>`);
}

export function renderResources() {
  return page("resources.html", "Resources", "Plan your project, explore insights, and find practical technology and product guidance.", `
    <section class="section-wrap page-hero">${crumbs("Resources")}<p class="eyebrow">Explore and prepare</p><h1>Resources</h1><p>Find the right starting point, understand your options, and prepare for the next decision.</p></section>
    <div class="section-wrap section-space resource-hub">${resourceMenuGroups.map(group => `<section class="resource-hub-group" id="${group.id}" aria-labelledby="resource-title-${group.id}"><h2 id="resource-title-${group.id}">${escape(group.title)}</h2><p>${escape(group.description)}</p><div class="resource-hub-links">${group.links.map(([href, label]) => `<a href="${escape(href)}">${escape(label)} <span aria-hidden="true">&#8599;</span></a>`).join("")}</div></section>`).join("")}</div>`, "editorial.css");
}

export async function generateCatalogs() {
  const catalogs = await readCatalogs();
  validateCatalogs(catalogs);
  const outputs = [
    ["resources.html", renderResources()],
    ["industries.html", renderIndustries(catalogs.industries)],
    ["briefs.html", renderBriefs(catalogs.briefs)],
    ["industry-professional-services.html", renderProfessionalServicesHub(catalogs.industries)],
    ...catalogs.industries.map((industry) => [`industry-${industry.slug}.html`, renderIndustry(industry, catalogs.briefs)]),
    ...catalogs.briefs.map((brief) => [`brief-${brief.slug}.html`, renderBrief(brief)])
  ];
  for (const [filename, content] of outputs) await writeFile(path.join(root, "site", filename), content);
  for (const [index, filename] of ["security.html", "ai-business.html", "cloud-platforms.html"].entries()) {
    const location = path.join(root, "site", filename);
    const source = await readFile(location, "utf8");
    const briefs = catalogs.briefs.filter((brief) => brief.category === categories[index]);
    const block = `<!-- capability-briefs:start --><section class="section-wrap capability-library" aria-label="Downloadable capability briefs"><p class="eyebrow">Service guides</p><h2>${escape(categories[index])} briefs</h2><div class="capability-links">${briefs.map((brief) => `<a href="brief-${brief.slug}.html"><strong>${escape(brief.title)}</strong><span>Read online or download a guide <span aria-hidden="true">&#8599;</span></span></a>`).join("")}</div></section><!-- capability-briefs:end -->\n    `;
    const updated = source.replace(/<!-- capability-briefs:start -->[\s\S]*?<!-- capability-briefs:end -->\s*|(?=<section class="section-wrap service-next">)/, block);
    if (source !== updated) await writeFile(location, updated);
  }
  return catalogs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateCatalogs();
