import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { escapeHtml } from "../shared/html.mjs";
import { pagePath } from "../shared/urls.mjs";

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
    .replace(/\b(href|src|action)="([^"]+)"/g, (_, name, value) => `${name}="${rewrite(value)}"`)
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

export async function publishPages(source, destination, siteUrl) {
  await cp(source, destination, { recursive: true });
  for (const page of await readdir(source)) {
    if (!page.endsWith(".html")) continue;
    const route = pagePath(page);
    const target = path.join(destination, route.endsWith("/") || !route ? route + "index.html" : route);
    let html = rewritePageLinks(await readFile(path.join(source, page), "utf8"), page);
    if (page === "404.html" && siteUrl) html = resolveErrorPageLinks(html, siteUrl);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    const oldPath = path.join(destination, page);
    if (oldPath !== target) await rm(oldPath);
  }
}
