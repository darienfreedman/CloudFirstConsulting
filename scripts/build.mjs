import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncNavigation } from "./navigation.mjs";
import { generateCatalogs } from "./catalogs.mjs";
import { buildUI } from "./build-ui.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = path.join(root, "site");
const destination = path.join(root, "dist");

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function normalizeSiteUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("SITE_URL must be an absolute HTTPS URL.");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("SITE_URL must not contain credentials, a query, or a fragment.");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url.href;
}

export function sitemap(siteUrl) {
  const publicPages = readdirSync(source).filter((page) => page.endsWith(".html") && !["index.html", "404.html"].includes(page)).sort();
  const urls = ["", ...publicPages].map((page) =>
    `  <url><loc>${escapeXml(new URL(page, siteUrl).href)}</loc></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function resolveErrorPageLinks(html, siteUrl) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (attribute, name, href) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) return attribute;
    return `${name}="${escapeXml(new URL(href, siteUrl).href)}"`;
  });
}

async function build() {
  // Validate deployment input before replacing the previous build.
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL);
  await generateCatalogs();
  await syncNavigation();
  await buildUI();
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
  const robots = ["User-agent: *", "Allow: /"];
  if (siteUrl) {
    robots.push(`Sitemap: ${new URL("sitemap.xml", siteUrl).href}`);
    await writeFile(path.join(destination, "sitemap.xml"), sitemap(siteUrl));
    const notFoundPath = path.join(destination, "404.html");
    const notFound = await readFile(notFoundPath, "utf8");
    await writeFile(notFoundPath, resolveErrorPageLinks(notFound, siteUrl));
  }
  await writeFile(path.join(destination, "robots.txt"), `${robots.join("\n")}\n`);
  console.log(`Built public site in dist${siteUrl ? ` for ${siteUrl}` : " (SITE_URL unset; sitemap omitted)"}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
