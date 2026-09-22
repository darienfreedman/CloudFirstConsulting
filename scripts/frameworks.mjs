import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { escapeHtml as escape } from "../shared/html.mjs";

export const frameworks = JSON.parse(readFileSync(new URL("../content/frameworks.json", import.meta.url), "utf8"))
  .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
assert.equal(new Set(frameworks.map(item => item.id)).size, frameworks.length, "Framework IDs must be unique");
for (const item of frameworks) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id), "Invalid framework ID");
  for (const field of ["name", "title", "kind", "summary", "application"]) {
    assert(typeof item[field] === "string" && item[field].trim(), `Missing framework ${field}: ${item.id}`);
  }
  assert(Array.isArray(item.sources) && item.sources.length, `Missing framework sources: ${item.id}`);
  for (const [label, href] of item.sources) {
    assert(typeof label === "string" && label.trim(), `Missing source label: ${item.id}`);
    const url = new URL(href);
    assert(url.protocol === "https:" && !url.username && !url.password, `Invalid framework source: ${item.id}`);
  }
}

export function frameworkById(id) {
  const item = frameworks.find(item => item.id === id);
  assert(item, `Unknown framework: ${id}`);
  return item;
}

export function frameworkHref(id) {
  return `insight-compliance-readiness.html#${frameworkById(id).id}`;
}

export function frameworkSearchText(items = []) {
  return items.flatMap(({ id, reason }) => {
    const item = frameworkById(id);
    return [item.name, item.title, item.kind, reason];
  }).join(" ");
}

export function renderFrameworkConnections(items = []) {
  if (!items.length) return "";
  const ordered = [...items].sort((a, b) => frameworkById(a.id).name.localeCompare(frameworkById(b.id).name, "en", { sensitivity: "base" }));
  return `<div class="use-case-frameworks"><h3>Framework connections</h3><ul>${ordered.map(({ id, reason }) =>
    `<li><a href="${escape(frameworkHref(id))}">${escape(frameworkById(id).name)}</a><span>${escape(reason)}</span></li>`
  ).join("")}</ul></div>`;
}

export function renderFrameworkGuide(industries) {
  const index = `<nav class="framework-index" aria-label="Framework references">${frameworks.map(item => `<a href="#${item.id}">${escape(item.name)}</a>`).join("")}</nav>`;
  const cards = frameworks.map(item => {
    const examples = industries.flatMap(industry => {
      const index = industry.cases.findIndex(useCase => useCase.frameworks?.some(reference => reference.id === item.id));
      return index < 0 ? [] : [{ industry, index }];
    }).sort((a, b) => a.industry.name.localeCompare(b.industry.name, "en", { sensitivity: "base" })).slice(0, 3);
    const links = examples.map(({ industry, index }) =>
      `<li><a href="industry-${industry.slug}.html#use-case-${index + 1}">${escape(industry.name)}: ${escape(industry.cases[index].title)}</a></li>`
    ).join("");
    return `<section class="framework-card source-entry editorial-card" id="${item.id}"><p class="eyebrow">${escape(item.kind)}</p><h3>${escape(item.title)}</h3><p>${escape(item.summary)}</p><p>${escape(item.application)}</p><div class="framework-sources">${item.sources.map(([label, href]) => `<a href="${escape(href)}" rel="noreferrer">${escape(label)}</a>`).join("")}</div>${links ? `<h4>Industry examples</h4><ul>${links}</ul>` : ""}</section>`;
  }).join("\n");
  return `${index}<div class="framework-guide">${cards}</div>`;
}
