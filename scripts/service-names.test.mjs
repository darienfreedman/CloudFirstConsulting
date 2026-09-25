import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { serviceAreas, serviceAreaByKey, standardizeServiceNames } from "../shared/services.mjs";
import { serviceOptions } from "../shared/inquiry.mjs";
import { publicCopy } from "./public-copy.mjs";
import { categories, readCatalogs } from "./catalogs.mjs";
import { serviceMenuGroups } from "./navigation.mjs";
import { products, homepageProductGroups } from "./products.mjs";

test("all service surfaces share the approved names and stable route keys", async () => {
  assert.deepEqual(serviceAreas.map(area => area.label), ["Security", "AI Business Solutions", "Cloud & AI"]);
  assert.deepEqual(serviceAreas.map(area => area.key), ["security", "business", "cloud"]);
  assert.deepEqual(serviceAreas.map(area => area.href), ["security.html", "ai-business.html", "cloud-platforms.html"]);
  assert.deepEqual(categories, serviceAreas.map(area => area.label));
  assert.deepEqual(serviceMenuGroups.map(group => group.title), categories);
  assert.deepEqual(serviceMenuGroups.map(group => group.cta), serviceAreas.map(area => area.cta));
  for (const brief of (await readCatalogs()).briefs) assert(categories.includes(brief.category));
  assert.equal(homepageProductGroups["platform-cloud-title"], serviceAreaByKey.cloud.label);
  assert.equal(products.find(product => product.id === "azure").group, serviceAreaByKey.cloud.label);
  for (const [key, area] of [["security", "security"], ["ai", "business"], ["cloud", "cloud"]]) {
    assert.equal(serviceOptions.find(([value]) => value === key)[1], serviceAreaByKey[area].label);
  }
});

test("legacy display names normalize without inventing short mobile aliases", () => {
  for (const label of ["AI & work", "AI &amp; work", "AI Business services", "AI Business Solutions"]) {
    assert.equal(standardizeServiceNames(label), "AI Business Solutions");
  }
  for (const label of ["Cloud and AI Platforms", "Cloud &amp; AI", "Cloud & data", "Cloud &amp; data", "Cloud, data, and AI platforms"]) {
    assert.equal(standardizeServiceNames(label), "Cloud & AI");
    assert.equal(standardizeServiceNames(label, { html: true }), "Cloud &amp; AI");
  }
  assert.equal(standardizeServiceNames("Cloud &amp; AI", { html: true }), "Cloud &amp; AI");
  assert.equal(standardizeServiceNames("Explore AI Business services"), "Explore AI Business Solutions");
  assert.equal(standardizeServiceNames("Explore Cloud and AI services"), "Explore Cloud & AI");
  assert.equal(standardizeServiceNames("Explore Security services"), "Explore Security");
  assert.equal(standardizeServiceNames("Cloud modernization and AI application platforms"), "Cloud modernization and AI application platforms");
});

test("HTML normalization covers metadata and filter values without changing URLs or search aliases", () => {
  const html = '<meta name="description" content="Cloud and AI Platforms"><a href="cloud-platforms.html#operations" aria-label="Cloud and AI Platforms">Explore Cloud and AI services</a><article data-category="Cloud and AI Platforms" data-search="Microsoft Azure Cloud and AI Platforms"></article>';
  const result = publicCopy(html, "services.html");
  assert(result.includes('content="Cloud &amp; AI"'));
  assert(result.includes('href="cloud-platforms.html#operations"'));
  assert(result.includes('aria-label="Cloud &amp; AI"'));
  assert(result.includes('data-category="Cloud &amp; AI"'));
  assert(result.includes('data-search="Microsoft Azure Cloud &amp; AI"'));
  assert(result.includes(">Explore Cloud &amp; AI</a>"));
  assert.equal(publicCopy(result, "services.html"), result);
});

test("generated pages and interactive code contain no obsolete category labels", () => {
  const obsolete = /\b(?:Cloud and AI Platforms|Cloud (?:&amp;|&) data|AI (?:&amp;|&) work|AI Business services|Cloud and AI services|Cloud, data, and AI platforms)\b/i;
  const directory = new URL("../src/site/", import.meta.url);
  for (const filename of readdirSync(directory).filter(file => file.endsWith(".html"))) {
    const html = readFileSync(new URL(filename, directory), "utf8");
    assert.doesNotMatch(html, obsolete, filename);
  }
  for (const filename of ["index.jsx", "service-carousel.jsx"]) {
    assert.doesNotMatch(readFileSync(new URL(`../ui/${filename}`, import.meta.url), "utf8"), obsolete, filename);
  }
});
