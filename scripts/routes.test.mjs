import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { pagePath, pageHref, localContactEndpoint } from "../shared/urls.mjs";
import { rewritePageLinks } from "./routes.mjs";

test("every authored page is reachable or an intentional compatibility or error page", () => {
  const directory = new URL("../docs/", import.meta.url);
  const pages = new Map(readdirSync(directory).filter(name => name.endsWith(".html"))
    .map(name => [name, readFileSync(new URL(name, directory), "utf8")]));
  const reserved = new Set(["404.html", "industry-professional-services.html", "insights.html", "stories.html", "technology-explained.html"]);
  const reached = new Set();
  const pending = ["index.html"];
  while (pending.length) {
    const page = pending.pop();
    if (reached.has(page)) continue;
    assert(pages.has(page), `Linked page is missing: ${page}`);
    reached.add(page);
    for (const [, destination] of pages.get(page).matchAll(/href="([a-z0-9-]+\.html)(?:[?#][^"]*)?"/g)) {
      pending.push(destination);
    }
  }
  for (const page of pages.keys()) assert(reached.has(page) || reserved.has(page), `Unused page: ${page}`);
  for (const page of reserved) assert(pages.has(page), `Preserve reserved route: ${page}`);
});

test("every source page has an extensionless public route except the required 404 file", () => {
  const pages = readdirSync(new URL("../docs", import.meta.url)).filter(name => name.endsWith(".html"));
  for (const page of pages) {
    const route = pagePath(page);
    assert.equal(route, page === "index.html" ? "" : page === "404.html" ? page : `${page.slice(0, -5)}/`);
  }
  assert.equal(pagePath("security.html?from=menu#identity"), "security/?from=menu#identity");
});

test("directory pages rebase navigation, assets, downloads and responsive images", () => {
  const source = '<html lang="en"><a href="index.html">Home</a><a href="sources.html#entra">Entra</a><a href="#identity">Identity</a><script src="assets/app.js"></script><img src="assets/Logo.png" srcset="assets/small.webp 640w, assets/large.webp 1440w"><a href="downloads/brief.pdf">PDF</a></html>';
  const html = rewritePageLinks(source, "security.html");
  for (const expected of [
    'data-site-root="../"', 'href="../"', 'href="../sources/#entra"', 'href="#identity"',
    'src="../assets/app.js"', 'src="../assets/Logo.png"',
    'srcset="../assets/small.webp 640w, ../assets/large.webp 1440w"', 'href="../downloads/brief.pdf"'
  ]) assert(html.includes(expected), expected);
});

test("homepage navigation remains under the project root and external URLs stay intact", () => {
  const source = '<html lang="en"><a href="index.html">Home</a><a href="security.html?x=1&amp;y=2#identity">Security</a><a href="https://example.com/guide.html?a=1&amp;b=2">External</a></html>';
  const html = rewritePageLinks(source, "index.html");
  assert(html.includes('data-site-root="./"'));
  assert(html.includes('href="./"'));
  assert(html.includes('href="security/?x=1&amp;y=2#identity"'));
  assert(html.includes('href="https://example.com/guide.html?a=1&amp;b=2"'));
});

test("React links and the native contact API resolve at project and domain roots", () => {
  for (const base of ["https://demo.github.io/demo/", "https://demo.example.com/"]) {
    assert.equal(new URL(pageHref("security.html#ai-security", "./"), base).href, `${base}security/#ai-security`);
    assert.equal(new URL(pageHref("trust.html", "../"), `${base}contact/`).href, `${base}trust/`);
    assert.equal(localContactEndpoint(`${base}contact/`, "../"), `${base}api/contact`);
  }
  assert.equal(pageHref("trust.html"), "trust.html", "Unbuilt source previews keep their authoring links");
  assert.equal(localContactEndpoint("http://127.0.0.1:1234/contact.html"), "http://127.0.0.1:1234/api/contact");
  const ui = readFileSync(new URL("../ui/index.jsx", import.meta.url), "utf8");
  assert(!/href="[^"]+\.html/.test(ui), "React must not bypass the public route helper");
});
