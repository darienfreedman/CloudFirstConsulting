import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncNavigation } from "./navigation.mjs";
import { generateCatalogs } from "./catalogs.mjs";
import { buildUI } from "./build-ui.mjs";
import { publishPages } from "./routes.mjs";
import { pagePath } from "../shared/urls.mjs";
export { resolveErrorPageLinks } from "./routes.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = path.join(root, "src", "site");
const destination = path.join(root, "dist");
const branchDestination = path.join(root, "docs");

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
  const publicPages = readdirSync(source).filter((page) => page.endsWith(".html") && !["index.html", "404.html"].includes(page)
    && !/<meta name="robots" content="noindex">/.test(readFileSync(path.join(source, page), "utf8"))).sort();
  const urls = ["", ...publicPages].map((page) =>
    `  <url><loc>${escapeXml(new URL(pagePath(page), siteUrl).href)}</loc></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

async function build() {
  // Validate deployment input before replacing the previous build.
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL);
  await generateCatalogs();
  await syncNavigation();
  await buildUI();
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await publishPages(source, destination, siteUrl);
  const robots = ["User-agent: *", "Allow: /"];
  if (siteUrl) {
    robots.push(`Sitemap: ${new URL("sitemap.xml", siteUrl).href}`);
    await writeFile(path.join(destination, "sitemap.xml"), sitemap(siteUrl));
  }
  await writeFile(path.join(destination, "robots.txt"), `${robots.join("\n")}\n`);
  await rm(branchDestination, { recursive: true, force: true });
  await cp(destination, branchDestination, { recursive: true });
  console.log(`Built matching public sites in docs and dist${siteUrl ? ` for ${siteUrl}` : " (SITE_URL unset; sitemap omitted)"}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
