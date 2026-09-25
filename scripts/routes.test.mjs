import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { pagePath, pageHref, localContactEndpoint } from "../shared/urls.mjs";
import { rewritePageLinks, socialMeta } from "./routes.mjs";

test("the Actions artifact contains generated directory indexes, not flat authoring pages", () => {
  const source = new URL("../src/site/", import.meta.url);
  const output = new URL("../dist/", import.meta.url);
  const pages = readdirSync(source).filter(name => name.endsWith(".html"));
  assert.deepEqual(readdirSync(output).filter(name => name.endsWith(".html")).sort(), ["404.html", "index.html"]);
  for (const page of pages) {
    const route = pagePath(page);
    const file = route.endsWith("/") || !route ? `${route}index.html` : route;
    assert(existsSync(new URL(file, output)), file);
    const html = readFileSync(new URL(file, output), "utf8");
    assert(html.includes("data-site-root="), file);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (!/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) assert(!/\.html(?:[?#]|$)/.test(href), `${file}: ${href}`);
    }
  }
  assert(existsSync(new URL(".nojekyll", output)));
});

test("build and workflow use only the Actions artifact, not branch publishing", () => {
  const build = readFileSync(new URL("./build.mjs", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert(!build.includes("branchDestination"));
  assert(!build.includes('"docs"'));
  assert(!("validate:docs" in pkg.scripts));
  assert(workflow.includes("uses: actions/configure-pages@v5"));
  assert(workflow.includes("path: dist"));
  assert(workflow.includes("uses: actions/deploy-pages@v4"));
  assert(!workflow.includes("build_type"));
  assert(!workflow.includes("validate:docs"));
});

test("legacy HTML bookmarks redirect only to known clean pages under the same site root", () => {
  const script = readFileSync(new URL("../src/site/assets/legacy-page-redirect.js", import.meta.url), "utf8");
  for (const base of ["https://demo.github.io/project/", "https://example.com/"]) {
    for (const [requested, expected] of [
      ["security.html?from=bookmark#identity", "security/?from=bookmark#identity"],
      ["index.html?from=bookmark", "?from=bookmark"],
      ["missing.html", null], ["nested/security.html", null], ["404.html", null]
    ]) {
      let redirected;
      vm.runInNewContext(script, {
        URL,
        document: { documentElement: { dataset: { legacyPages: "index.html security.html" } }, currentScript: { src: `${base}assets/legacy-page-redirect.js` } },
        window: { location: { href: base + requested, replace: value => { redirected = value; } } }
      });
      assert.equal(redirected, expected === null ? undefined : base + expected);
    }
  }
});

test("every authored page is reachable or an intentional compatibility or error page", () => {
  const directory = new URL("../src/site/", import.meta.url);
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
  const pages = readdirSync(new URL("../src/site", import.meta.url)).filter(name => name.endsWith(".html"));
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

test("deployed pages get canonical and share previews with absolute URLs", () => {
  const source = '<html><head><title>Security consulting | CFC</title><meta name="description" content="Protect people &amp; data."></head><body></body></html>';
  const html = socialMeta(source, "security.html", "https://demo.github.io/demo/");
  assert(html.includes('<link rel="canonical" href="https://demo.github.io/demo/security/">'));
  assert(html.includes('<meta property="og:title" content="Security consulting">'));
  assert(html.includes('<meta property="og:description" content="Protect people &amp; data.">'));
  assert(html.includes('<meta property="og:image" content="https://demo.github.io/demo/assets/images/share-card.jpg">'));
  assert(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.equal(socialMeta(html, "security.html", "https://demo.github.io/demo/"), html);
  assert(socialMeta(source, "index.html", "https://demo.github.io/demo/").includes('href="https://demo.github.io/demo/"'));
  assert.equal(socialMeta(source, "404.html", "https://demo.github.io/demo/"), source);
  assert.equal(socialMeta(source, "security.html", null), source, "Local previews do not invent a public URL");
});