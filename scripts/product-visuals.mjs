import { blueprints } from "../shared/blueprints.mjs";
import { escapeHtml as escape } from "../shared/html.mjs";

export function serviceBlueprint(page) {
  const diagram = blueprints[page];
  if (!diagram) return "";
  return `<!-- service-visual:start --><section class="service-blueprint" aria-labelledby="blueprint-title"><div class="blueprint-heading"><p class="eyebrow">Reference architecture</p><h2 id="blueprint-title">${escape(diagram.title)}</h2><p>${escape(diagram.description)}</p></div><ol class="blueprint-flow">${diagram.steps.map(([title, description, context], index) => `<li><span class="blueprint-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h3>${escape(title)}</h3><p>${escape(description)}</p><span class="blueprint-context">${escape(context)}</span></li>`).join("")}</ol><p class="blueprint-note">${escape(diagram.note)}</p></section><!-- service-visual:end -->`;
}
