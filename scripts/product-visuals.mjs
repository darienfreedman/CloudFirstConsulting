import { blueprints } from "../shared/blueprints.mjs";
import { escapeHtml as escape } from "../shared/html.mjs";
import { sitePhotos } from "../shared/media.mjs";

const servicePhotos = { "security.html": "service-security", "ai-business.html": "service-business", "cloud-platforms.html": "service-cloud" };

export function servicePhoto(page) {
  const name = servicePhotos[page];
  if (!name) return "";
  const photo = sitePhotos.find(entry => entry.files.includes(`${name}-800.webp`));
  return `<!-- service-photo:start --><figure class="service-photo"><img src="assets/images/${name}-1600.webp" srcset="assets/images/${name}-800.webp 800w, assets/images/${name}-1600.webp 1600w" sizes="(max-width: 900px) calc(100vw - 40px), min(1280px, calc(100vw - 96px))" width="1600" height="640" alt="${escape(photo.description)}" decoding="async" fetchpriority="high"></figure><!-- service-photo:end -->`;
}

export function serviceBlueprint(page) {
  const diagram = blueprints[page];
  if (!diagram) return "";
  return `<!-- service-visual:start --><section class="service-blueprint" aria-labelledby="blueprint-title"><div class="blueprint-heading"><p class="eyebrow">Reference architecture</p><h2 id="blueprint-title">${escape(diagram.title)}</h2><p>${escape(diagram.description)}</p></div><ol class="blueprint-flow" data-card-style="type">${diagram.steps.map(([title, description, context, tab], index) => `<li${tab ? ` data-tab-label="${escape(tab)}"` : ""}><span class="blueprint-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h3>${escape(title)}</h3><p>${escape(description)}</p><span class="blueprint-context">${escape(context)}</span></li>`).join("")}</ol><p class="blueprint-note">${escape(diagram.note)}</p></section><!-- service-visual:end -->`;
}
