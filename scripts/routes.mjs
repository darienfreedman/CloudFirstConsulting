import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { escapeHtml } from "../shared/html.mjs";
import { pagePath } from "../shared/urls.mjs";
import { injectClarity } from "./clarity.mjs";
export { injectClarity } from "./clarity.mjs";

const sourceOrigin = "https://source.invalid/";
const decodeAttribute = value => value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");

export function rewritePageLinks(html, page) {
  const route = pagePath(page);
  const directory = route.endsWith("/") ? route : "";
  const root = directory ? "../" : "./";
  function rewrite(value) {
    value = decodeAttribute(value);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(value)) return escapeHtml(value);
    const url = new URL(value, new URL(page, sourceOrigin));
    const target = pagePath(url.pathname.slice(1));
    let relative = path.posix.relative(directory, target);
    if ((!target || target.endsWith("/")) && relative && !relative.endsWith("/")) relative += "/";
    if (!relative) relative = "./";
    return escapeHtml(relative + url.search + url.hash);
  }
  return html
    .replace(/<html\b([^>]*)>/, (_, attributes) => `<html${attributes} data-site-root="${root}">`)
    .replace(/\b(href|src|action|poster)="([^"]+)"/g, (_, name, value) => `${name}="${rewrite(value)}"`)
    .replace(/\bsrcset="([^"]+)"/g, (_, value) =>
      `srcset="${value.split(",").map(candidate => {
        const [url, ...descriptors] = candidate.trim().split(/\s+/);
        return [rewrite(url), ...descriptors].join(" ");
      }).join(", ")}"`
    );
}

export function resolveErrorPageLinks(html, siteUrl) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (attribute, name, value) => {
    const href = decodeAttribute(value);
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) return attribute;
    return `${name}="${escapeHtml(new URL(href, siteUrl).href)}"`;
  });
}

// Link previews need absolute URLs, so they are added only when the deployment URL is known.
export function socialMeta(html, page, siteUrl) {
  if (!siteUrl || page === "404.html" || html.includes('property="og:url"')) return html;
  const read = pattern => decodeAttribute(html.match(pattern)?.[1] || "").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  const title = read(/<title>([^<]*)<\/title>/).replace(/\s*\|\s*CFC$/, "");
  const description = read(/<meta name="description" content="([^"]*)">/);
  const url = new URL(pagePath(page), siteUrl).href;
  const image = new URL("assets/images/share-card.jpg", siteUrl).href;
  const tags = [
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Cloud First Consulting">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    description && `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Cloud First Consulting: Secure your business. Put AI to work.">',
    '<meta name="twitter:card" content="summary_large_image">'
  ].filter(Boolean).join("");
  return html.replace("</head>", `${tags}</head>`);
}

export async function publishPages(source, destination, siteUrl) {
  await cp(source, destination, { recursive: true });
  const pages = (await readdir(source)).filter(page => page.endsWith(".html"));
  for (const page of pages) {
    const route = pagePath(page);
    const target = path.join(destination, route.endsWith("/") || !route ? route + "index.html" : route);
    let html = rewritePageLinks(await readFile(path.join(source, page), "utf8"), page);
    html = socialMeta(injectClarity(html), page, siteUrl);
    if (page === "404.html") {
      const legacyPages = pages.filter(name => name !== "404.html").sort().join(" ");
      html = html.replace("<html ", `<html data-legacy-pages="${escapeHtml(legacyPages)}" `);
      if (siteUrl) html = resolveErrorPageLinks(html, siteUrl);
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    const oldPath = path.join(destination, page);
    if (oldPath !== target) await rm(oldPath);
  }
}