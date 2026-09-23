import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSiteUrl } from "./build.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const decodeAttribute = value => value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");

async function collect(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), `Do not publish symlinks: ${entry.name}`);
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await collect(path.join(directory, entry.name), `${name}/`));
    else files.push(name);
  }
  return files;
}

export async function validatePages(directory, siteUrl) {
  const base = new URL(normalizeSiteUrl(siteUrl));
  const files = new Set(await collect(directory));
  assert(files.has("index.html") && files.has("404.html"), "Pages needs a homepage and custom 404");
  assert(files.has(".nojekyll"), "Publish .nojekyll for static hosting");
  const documents = new Map();
  const anchors = new Map();
  for (const file of files) {
    if (!/\.(?:html|css)$/.test(file)) continue;
    const text = await readFile(path.join(directory, ...file.split("/")), "utf8");
    documents.set(file, text);
    if (file.endsWith(".html")) {
      assert(file === "404.html" || file === "index.html" || file.endsWith("/index.html"), `Page must use a clean directory route: ${file}`);
      anchors.set(file, new Set([...text.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => decodeAttribute(id))));
    }
  }
  let links = 0;
  function check(value, pageUrl, source) {
    value = decodeAttribute(value);
    if (/^(?:data:|mailto:|tel:)/i.test(value)) return;
    assert(!value.includes("\\"), `Backslash in public URL: ${source}: ${value}`);
    const url = new URL(value, pageUrl);
    assert.equal(url.protocol, "https:", `Unsupported public URL: ${source}: ${value}`);
    if (url.origin !== base.origin) return;
    assert(url.pathname.startsWith(base.pathname), `URL escapes GitHub Pages base path: ${source}: ${value}`);
    assert(!url.pathname.endsWith(".html") || url.pathname === `${base.pathname}404.html`, `Public link still exposes .html: ${source}: ${value}`);
    let target = decodeURIComponent(url.pathname.slice(base.pathname.length));
    if (!target || target.endsWith("/")) target += "index.html";
    // Compare exact names even when validation runs on a case-insensitive filesystem.
    assert(files.has(target), `Missing or incorrectly cased Pages asset: ${source}: ${value}`);
    if (url.hash) {
      assert(anchors.get(target)?.has(decodeURIComponent(url.hash.slice(1))), `Missing Pages anchor: ${source}: ${value}`);
    }
    links += 1;
  }
  for (const [file, text] of documents) {
    const pageUrl = new URL(file === "index.html" ? "" : file.replace(/\/index\.html$/, "/"), base);
    if (file.endsWith(".css")) {
      for (const [, value] of text.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/g)) {
        check(value, pageUrl, file);
      }
      continue;
    }
    assert(!/<base\b/i.test(text), `Do not override relative navigation with a base element: ${file}`);
    const references = [...text.matchAll(/\b(?:href|src|action)="([^"]+)"/g)].map(([, value]) => value);
    for (const [, srcset] of text.matchAll(/\bsrcset="([^"]+)"/g)) {
      references.push(...srcset.split(",").map(candidate => candidate.trim().split(/\s+/)[0]));
    }
    for (const value of references) {
      check(value, pageUrl, file);
      if (file === "404.html") {
        check(value, new URL("missing/deep/page.html", base), `${file} at a nested missing URL`);
      }
    }
  }
  return { pages: anchors.size, links };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.env.SITE_URL, "Set SITE_URL to the Pages deployment URL before validating dist.");
  const result = await validatePages(path.join(root, "dist"), process.env.SITE_URL);
  console.log(`Validated GitHub Pages dist: ${result.pages} pages and ${result.links} local references, including nested 404 recovery.`);
}
