import assert from "node:assert/strict";
import { escapeHtml } from "../shared/html.mjs";

const servicePhotos = [
  ["about-security.webp", "Server racks in a data center"],
  ["about-progress.webp", "People collaborating around a table"],
  ["about-implement.webp", "Electronic components on a circuit board"]
];
const photo = (file, alt) => `<img class="editorial-photo" data-editorial-photo src="assets/images/${file}" width="640" height="320" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
const cleanPhotos = html => html.replace(/<img\b[^>]*data-editorial-photo[^>]*>/g, "");

export function syncEditorialDesign(html, page) {
  if (page === "index.html") return cleanPhotos(html).replace('<body class="editorial-site">', "<body>");
  if (page === "about.html") return cleanPhotos(html);
  if (page !== "services.html") return html;
  let result = cleanPhotos(html).replace(/<body(?: class="editorial-site")?>/, '<body class="editorial-site">');
  if (page === "services.html") {
    result = result.replace(/<details class="service-directory-details"><summary>[^<]*<\/summary>([\s\S]*?)<\/details>/g, "$1");
    let index = 0;
    result = result.replace(/(<section class="directory-row"[^>]*>\s*<div>)([\s\S]*?<\/section>)/g, (_, open, body) => {
      assert(servicePhotos[index], "Unexpected service directory card");
      const image = photo(...servicePhotos[index++]);
      return open + image + body;
    });
    assert.equal(index, 3, "Expected three photographic service directory cards");
  }
  return result;
}
