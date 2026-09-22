import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { normalizeSiteUrl, resolveErrorPageLinks, sitemap } from "./build.mjs";
import { contentPolicy } from "./integrations.mjs";
import { microsoftFormsUrls } from "../shared/forms.mjs";
import { replaceIcons } from "./icons.mjs";
import { publicCopy } from "./public-copy.mjs";
import { syncAppearance } from "./navigation.mjs";
import { rewritePageLinks } from "./routes.mjs";
import { pagePath } from "../shared/urls.mjs";

test("retired menu, orbital hero, and resource layouts do not leave unused styles", () => {
  const styles = readdirSync(new URL("../docs/assets", import.meta.url))
    .filter(name => name.endsWith(".css") && name !== "react-ui.css")
    .map(name => readFileSync(new URL(`../docs/assets/${name}`, import.meta.url), "utf8"))
    .join("\n");
  for (const name of [
    "service-nav-item", "service-menu-toggle", "service-menu", "service-menu-link",
    "hero-visual", "orbital-art", "orbit-label", "platform-strip", "service-icon",
    "resource-section-nav", "resource-grid", "resource-format", "nav-industry-search",
    "nav-industry-list", "use-case-boundary", "document-hero"
  ]) {
    assert(!new RegExp(`\\.${name}(?![a-z0-9-])`).test(styles), name);
  }
});

test("engagement highlights belong to recommendations, not URL fragments", () => {
  const styles = readdirSync(new URL("../docs/assets", import.meta.url))
    .filter(name => name.endsWith(".css"))
    .map(name => readFileSync(new URL(`../docs/assets/${name}`, import.meta.url), "utf8"))
    .join("\n");
  assert(!/\.engagement-card:target\b/.test(styles), "Deep links must not leave a second highlight behind");
  assert(styles.includes(".engagement-card.is-recommended"), "Submitted recommendations need a visible highlight");
});

test("blue labels share a row with their icons across repeated builds", () => {
  for (const labelClass of ["eyebrow", "card-kicker"]) {
    const label = `<p class="${labelClass}">AI Security</p>`;
    const source = `<article><!-- icon:ai-security -->${label}<h2>Protect your AI</h2></article>`;
    const result = replaceIcons(source);
    assert(result.includes('<div class="icon-label"><span class="capability-icon"'));
    assert(result.includes(`${label}</div><h2>Protect your AI</h2>`));
    assert.equal(replaceIcons(result), result);
  }
});

test("icons without blue labels retain their layout", () => {
  const result = replaceIcons('<article><!-- icon:security --><h3>Security</h3></article>');
  assert(!result.includes('class="icon-label"'));
  assert(result.includes('</span><h3>Security</h3>'));
});

test("label grouping cannot cross an unrelated icon or card", () => {
  const first = '<article><!-- icon:security --><h3>Security</h3></article>';
  const second = '<article><!-- icon:ai --><p class="card-kicker">Business AI</p></article>';
  const result = replaceIcons(first + second);
  assert(result.startsWith(replaceIcons(first)));
  assert.equal(result, replaceIcons(first) + replaceIcons(second));
  assert.equal(replaceIcons(result), result);
});

test("normalizes both GitHub project and custom-domain URLs", () => {
  assert.equal(normalizeSiteUrl("https://example.github.io/cloud-first"), "https://example.github.io/cloud-first/");
  assert.equal(normalizeSiteUrl("https://demo.example.com"), "https://demo.example.com/");
  assert.equal(normalizeSiteUrl(undefined), null);
});

test("rejects insecure or ambiguous deployment URLs", () => {
  for (const value of ["http://example.com", "file:///demo", "/cloud-first", "https://user:pass@example.com", "https://example.com/?q=x", "https://example.com/#hash"]) {
    assert.throws(() => normalizeSiteUrl(value), undefined, value);
  }
});

test("sitemap retains the project base path and excludes error pages", () => {
  const xml = sitemap("https://example.github.io/cloud-first/");
  assert(xml.includes("<loc>https://example.github.io/cloud-first/</loc>"));
  assert(xml.includes("<loc>https://example.github.io/cloud-first/sources/</loc>"));
  assert(xml.includes("<loc>https://example.github.io/cloud-first/trust/</loc>"));
  assert(!xml.includes("404.html"));
});

test("sitemap escapes XML attributes in paths", () => {
  assert(sitemap("https://example.com/a&b/").includes("a&amp;b/"));
});

test("sitemap includes every customer page", () => {
  const pages = readdirSync(new URL("../docs", import.meta.url)).filter((name) => name.endsWith(".html") && name !== "404.html"
    && !readFileSync(new URL(`../docs/${name}`, import.meta.url), "utf8").includes('<meta name="robots" content="noindex">'));
  const base = "https://example.github.io/cloud-first/";
  const xml = sitemap(base);
  for (const page of pages) {
    assert(xml.includes(`<loc>${base}${pagePath(page)}</loc>`), `Missing sitemap page: ${page}`);
  }
  assert.equal([...xml.matchAll(/<loc>/g)].length, pages.length);
});

test("error-page assets and navigation resolve from nested missing paths", () => {
  const source = readFileSync(new URL("../docs/404.html", import.meta.url), "utf8");
  for (const base of ["https://example.github.io/cloud-first/", "https://demo.example.com/"]) {
    const html = resolveErrorPageLinks(rewritePageLinks(source, "404.html"), base);
    assert(html.includes(`href="${base}assets/styles.css"`));
    assert(html.includes(`href="${base}assets/favicon.png"`));
    assert(html.includes(`href="${base}assets/theme.css"`));
    assert(html.includes(`src="${base}assets/theme.js"`));
    assert(html.includes(`href="${base}services/"`));
    assert(html.includes(`href="${base}" data-site-home`));
    assert(!/\b(?:href|src)="(?!https:)/.test(html), "Error page must not depend on the missing URL's depth");
  }
});

test("error-page link rewriting escapes XML characters and preserves external links", () => {
  const html = resolveErrorPageLinks('<a href="services.html">Services</a><a href="https://example.net">External</a>', "https://example.com/a&b/");
  assert(html.includes('href="https://example.com/a&amp;b/services.html"'));
  assert(html.includes('href="https://example.net"'));
});

test("Microsoft Forms embed preserves its ID and provides a standalone fallback", () => {
  const urls = microsoftFormsUrls("https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=public-form_123&embed=true");
  assert.equal(new URL(urls.embedUrl).searchParams.get("id"), "public-form_123");
  assert.equal(new URL(urls.embedUrl).searchParams.get("embed"), "true");
  assert.equal(new URL(urls.responseUrl).searchParams.get("id"), "public-form_123");
  assert(!new URL(urls.responseUrl).searchParams.has("embed"));
});

test("only supported Microsoft response pages can be embedded", () => {
  assert.equal(microsoftFormsUrls(""), null);
  assert.equal(microsoftFormsUrls("https://forms.cloud.microsoft.evil.example/Pages/ResponsePage.aspx?id=x"), null);
  assert.equal(microsoftFormsUrls("https://forms.office.com/r/"), null);
  assert.equal(microsoftFormsUrls("https://forms.cloud.microsoft.evil.example/r/LArHCapTwV"), null);
  assert.equal(microsoftFormsUrls("https://forms.cloud.microsoft/r/token/unexpected"), null);
  assert.equal(microsoftFormsUrls("https://forms.cloud.microsoft/Pages/ResponsePage.aspx"), null);
  assert.throws(() => microsoftFormsUrls("http://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=x"));
  assert.throws(() => microsoftFormsUrls("https://user:password@forms.cloud.microsoft/Pages/ResponsePage.aspx?id=x"));
});

test("Microsoft Forms short links support embedding and standalone access", () => {
  for (const host of ["forms.cloud.microsoft", "forms.office.com"]) {
    const urls = microsoftFormsUrls(`https://${host}/r/LArHCapTwV?embed=true`);
    assert.equal(urls.embedUrl, `https://${host}/r/LArHCapTwV?embed=true`);
    assert.equal(urls.responseUrl, `https://${host}/r/LArHCapTwV`);
    assert.deepEqual(microsoftFormsUrls(urls.responseUrl), urls);
    assert(contentPolicy({ contactFormUrl: urls.embedUrl, bookingUrl: "", contactEndpoint: "" }).includes("frame-src https://forms.cloud.microsoft https://forms.office.com"));
  }
});

test("homepage tab title stays concise without changing the hero", () => {
  const source = '<title>Old title</title><h1>Secure your business. Put AI to work.</h1>';
  const result = publicCopy(source, "index.html");
  assert(result.includes("<title>Cloud First Consulting</title>"));
  assert(result.includes("<h1>Secure your business. Put AI to work.</h1>"));
  assert.equal(publicCopy(result, "index.html"), result);
});

test("Cloud First branding is consistent across pages and package metadata", () => {
  for (const name of readdirSync(new URL("../docs", import.meta.url)).filter(name => name.endsWith(".html"))) {
    const html = readFileSync(new URL(`../docs/${name}`, import.meta.url), "utf8");
    assert(name === "index.html"
      ? html.includes("<title>Cloud First Consulting</title>")
      : /<title>[^<]+ \| CFC<\/title>/.test(html), name);
    assert(html.includes('aria-label="Cloud First Consulting home"'), name);
    assert(html.includes('>Cloud First<span class="brand-sub">CONSULTING</span>'), name);
    assert(html.includes("&copy; 2026 Cloud First Consulting"), name);
  }
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(manifest.name, "cloud-first-consulting");
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.packages[""].name, manifest.name);
});

test("every page uses the logo-derived favicon, including the error page", () => {
  const image = readFileSync(new URL("../docs/assets/favicon.png", import.meta.url));
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 64);
  assert.equal(image.readUInt32BE(20), 64);
  assert(image.length < 20000);
  for (const name of readdirSync(new URL("../docs", import.meta.url)).filter(name => name.endsWith(".html"))) {
    const html = readFileSync(new URL(`../docs/${name}`, import.meta.url), "utf8");
    assert(html.includes('<link rel="icon" href="assets/favicon.png" type="image/png" sizes="64x64">'), name);
  }
  const html = '<head><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"></head>';
  assert.equal(syncAppearance(syncAppearance(html)), syncAppearance(html));
});

test("form CSP allows Microsoft frame hosts only when an embed is configured", () => {
  const settings = { contactFormUrl: "", bookingUrl: "", contactEndpoint: "" };
  assert(contentPolicy(settings).includes("frame-src 'none'"));
  const configured = contentPolicy({ ...settings, contactFormUrl: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=public-form" });
  assert(configured.includes("frame-src https://forms.cloud.microsoft https://forms.office.com"));
  assert(configured.includes("connect-src 'self'"));
  assert(!configured.includes("frame-src *"));
});

test("Fluent-inspired color roles meet normal-text contrast thresholds", () => {
  const css = readFileSync(new URL("../docs/assets/styles.css", import.meta.url), "utf8");
  const token = (name) => {
    const value = css.match(new RegExp(`--${name}:(#[0-9a-f]{6})`, "i"))?.[1];
    assert(value, `Missing color token: ${name}`);
    return value;
  };
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const [foreground, background] of [
    [token("colorNeutralForeground1"), token("colorNeutralBackground1")],
    [token("colorNeutralForeground2"), token("colorNeutralBackground2")],
    [token("colorBrandForegroundLink"), token("colorBrandBackground2")],
    ["#ffffff", token("colorBrandBackground")],
    ["#ffffff", token("colorBrandBackgroundHover")],
    ["#ffffff", token("colorBrandBackgroundPressed")]
  ]) {
    const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
    assert((a + 0.05) / (b + 0.05) >= 4.5, `Insufficient text contrast: ${foreground} on ${background}`);
  }
});
