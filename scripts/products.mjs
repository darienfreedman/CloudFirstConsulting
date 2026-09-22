import { readFileSync } from "node:fs";
import { escapeHtml } from "../shared/html.mjs";
import { normalizeProductNames } from "./public-copy.mjs";

export const products = JSON.parse(readFileSync(new URL("../content/products.json", import.meta.url), "utf8"));
const byName = new Map();
for (const product of products) {
  for (const name of [product.name, ...(product.aliases || [])]) {
    if (byName.has(name)) throw new Error(`Duplicate product name: ${name}`);
    byName.set(name, product);
  }
}

export function productLink(name) {
  const label = normalizeProductNames(name);
  const product = byName.get(label);
  if (!product) throw new Error(`Missing product explanation: ${label}`);
  return `<a href="sources.html#${product.id}">${escapeHtml(label)}</a>`;
}

export function linkProductNames(html) {
  return html.replace(/(<(?:div class="product-tags"|ul class="platform-products")>)([\s\S]*?)(<\/(?:div|ul)>)/g, (_, open, content, close) =>
    open + content.replace(/<(?:span|a)\b[^>]*>([^<]+)<\/(?:span|a)>/g, (_, name) => productLink(name)) + close
  );
}

export function renderProductGuide() {
  const groups = [...new Set(products.map(product => product.group))];
  const navigation = `<nav class="product-guide-nav" aria-label="Product groups">${groups.map((group, index) => `<a href="#product-group-${index}">${escapeHtml(group)}</a>`).join("")}</nav>`;
  return `<section class="section-wrap section-space product-guide" aria-labelledby="product-guide-title"><p class="eyebrow">Products explained</p><h2 id="product-guide-title">Start with the problem, then choose the product.</h2><p>Select a product from a service page to learn what it helps solve, where it fits, and which consulting capability supports it. Features and licensing vary by product and configuration. For broader concepts and terminology, read <a href="technology-explained.html">Technology Explained</a>.</p>${navigation}${groups.map((group, index) =>
    `<section class="product-guide-group" aria-labelledby="product-group-${index}"><h2 id="product-group-${index}">${escapeHtml(group)}</h2><div class="source-list">${products.filter(product => product.group === group).map(product =>
      `<article class="source-entry product-entry" id="${product.id}"><h3>${escapeHtml(product.name)}</h3><p><strong>The problem:</strong> ${escapeHtml(product.problem)}</p><p>${escapeHtml(product.solution)}</p>${product.details ? `<ul>${product.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}<div class="product-resource-links"><a href="${escapeHtml(product.service)}">Explore related consulting</a><a href="${escapeHtml(product.docs)}" rel="noreferrer">Read official documentation</a>${(product.additionalDocs || []).map(([label, href]) => `<a href="${escapeHtml(href)}" rel="noreferrer">${escapeHtml(label)}</a>`).join("")}</div></article>`
    ).join("")}</div></section>`
  ).join("")}</section>`;
}
