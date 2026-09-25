import { escapeHtml as escape } from "../shared/html.mjs";
import { balancedWrap, sceneFor } from "./scene-visuals.mjs";

// Animated hero diagrams are generated from each page's own content so the motion explains the page.
// Every diagram shares a 480 x 420 canvas; animation lives in experience.css and stops for reduced motion.

const round = value => Math.round(value * 10) / 10;

export function plainText(html) {
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&(?:#39|rsquo|lsquo|apos);/g, "'").replace(/&(?:ldquo|rdquo|quot);/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim().replace(/[.:]$/, "");
}

export function wrapLabel(text, max, limit = 2) {
  const lines = [""];
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const current = lines[lines.length - 1];
    if (!current) lines[lines.length - 1] = word;
    else if ((`${current} ${word}`).length <= max) lines[lines.length - 1] = `${current} ${word}`;
    else if (lines.length < limit) lines.push(word);
    else {
      // Mark shortened labels rather than silently dropping words.
      lines[lines.length - 1] = `${current.replace(/[,;:]$/, "")}\u2026`;
      break;
    }
  }
  return lines;
}

const tspans = (lines, x, y, lineHeight, metaFrom = Infinity) => {
  const start = y - ((lines.length - 1) * lineHeight) / 2;
  return lines.map((line, index) => `<tspan${index >= metaFrom ? ' class="hv-meta"' : ""} x="${round(x)}" y="${round(start + index * lineHeight)}">${escape(line)}</tspan>`).join("");
};

// Each diagram ships a wide layout and a compact phone layout with larger type; CSS shows the one that fits.
const svg = (kind, variant, width, height, body, extra = "") => `<svg class="hv hv-${kind} hv-${variant}${extra}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${body}</svg>`;

const hubSizes = {
  wide: { width: 480, height: 420, cx: 240, cy: 210, radius: 150, inner: 66, core: 58, shield: 88, orbit: 118, wrap: 17, limit: 2, lead: 34, line: 19, coreWrap: 11, coreLine: 20 },
  compact: { width: 340, height: 372, cx: 170, cy: 186, radius: 104, inner: 48, core: 42, shield: 66, orbit: 90, wrap: 14, limit: 3, lead: 30, line: 19, coreWrap: 9, coreLine: 19 }
};

function buildHub(center, nodes, risk, variant) {
  const size = hubSizes[variant];
  const { cx, cy, radius, count = nodes.length } = size;
  const start = radius - 12;
  const spokes = [], points = [], labels = [], arrivals = [];
  nodes.forEach((node, index) => {
    const angle = -90 + (360 / count) * index;
    const radians = angle * Math.PI / 180;
    const x = cx + radius * Math.cos(radians), y = cy + radius * Math.sin(radians);
    const blocked = risk && index % 2 === 1;
    const delay = `hv-d${count}-${index}`;
    spokes.push(`<g transform="translate(${cx} ${cy}) rotate(${round(angle)})"><line class="hv-spoke" x1="${size.inner}" y1="0" x2="${start}" y2="0"/><circle class="hv-packet${blocked ? " hv-packet-risk" : ""} ${delay}" cx="${start}" cy="0" r="5"/></g>`);
    points.push(`<g transform="translate(${round(x)} ${round(y)})"><circle class="hv-node-ping ${delay}" r="11"/><circle class="hv-node" r="10"/></g>`);
    const [name, meta] = Array.isArray(node) ? node : [node, ""];
    const lines = [...wrapLabel(name, size.wrap, size.limit), ...(meta ? [meta] : [])];
    const above = Math.sin(radians) < -0.4;
    const offset = size.lead + (lines.length - 1) * (size.line / 2);
    labels.push(`<text class="hv-label ${delay}" text-anchor="middle">${tspans(lines, x, above ? y - offset : y + offset, size.line, meta ? lines.length - 1 : Infinity)}</text>`);
    arrivals.push(`<circle class="${blocked ? "hv-block" : "hv-arrival"} ${delay}" r="${blocked ? size.shield : size.core + 2}"/>`);
  });
  const satellite = size.shield;
  const satellites = [0, 120, 240].map(degrees => { const radians = degrees * Math.PI / 180; return `<circle class="hv-satellite" cx="${round(satellite * Math.cos(radians))}" cy="${round(satellite * Math.sin(radians))}" r="3.5"/>`; }).join("");
  return svg("hub", variant, size.width, size.height, `<g transform="translate(${cx} ${cy})"><circle class="hv-orbit" r="${size.orbit}"/><g class="hv-satellites"><circle class="hv-ghost" r="${satellite}"/>${satellites}</g><circle class="hv-shield" r="${size.shield}"/></g>${spokes.join("")}<g transform="translate(${cx} ${cy})">${arrivals.join("")}<circle class="hv-halo" r="${size.core + 2}"/><circle class="hv-core" r="${size.core}"/></g><text class="hv-core-label" text-anchor="middle">${tspans(wrapLabel(center, size.coreWrap, 3), cx, cy + 6, size.coreLine)}</text>${points.join("")}${labels.join("")}`, ` hv-n${count}`);
}

// Signals travel from each node into the center. With { risk: true }, alternate signals are stopped at the protective ring.
export function hubDiagram(center, nodes, { risk = false } = {}) {
  return buildHub(center, nodes, risk, "wide") + buildHub(center, nodes, risk, "compact");
}

const flowSizes = {
  wide: { width: 480, dot: 40, card: 80, cardWidth: 384, wrap: 36, line: 22 },
  compact: { width: 340, dot: 22, card: 50, cardWidth: 286, wrap: 23, line: 21 }
};

function buildFlow(items, count, variant) {
  const size = flowSizes[variant];
  const pitch = variant === "compact" ? 84 : { 3: 120, 4: 96, 5: 78 }[count];
  const height = variant === "compact" ? 68 : count === 5 ? 64 : 70;
  const canvas = variant === "compact" ? (count - 1) * pitch + 96 : 420;
  const top = (canvas - (count - 1) * pitch) / 2;
  const rows = items.map((step, index) => {
    const y = top + index * pitch;
    return `<g class="hv-step hv-step-${index}"><rect class="hv-card" x="${size.card}" y="${round(y - height / 2)}" width="${size.cardWidth}" height="${height}" rx="16"/><text class="hv-card-label">${tspans(wrapLabel(step, size.wrap, 2), size.card + 22, y + 6, size.line)}</text><circle class="hv-step-ping" cx="${size.dot}" cy="${round(y)}" r="13"/><circle class="hv-step-dot" cx="${size.dot}" cy="${round(y)}" r="11"/><text class="hv-step-number" x="${size.dot}" y="${round(y + 5)}" text-anchor="middle">${index + 1}</text></g>`;
  });
  const end = top + (count - 1) * pitch;
  return svg("flow", variant, size.width, round(canvas), `<line class="hv-track" x1="${size.dot}" y1="${round(top)}" x2="${size.dot}" y2="${round(end)}"/><line class="hv-track-fill" x1="${size.dot}" y1="${round(top)}" x2="${size.dot}" y2="${round(end)}"/>${rows.join("")}<circle class="hv-comet" cx="${size.dot}" cy="${round(top)}" r="6"/>`, ` hv-n${count}`);
}

// A signal runs down a sequence of steps and lights each one as it passes.
export function flowDiagram(steps) {
  const items = steps.slice(0, 5);
  while (items.length < 3) items.push("");
  return buildFlow(items, items.length, "wide") + buildFlow(items, items.length, "compact");
}

// A wave of light moves across a grid of real names from the page. Directory pages hide it on phones.
export function mosaicDiagram(labels) {
  const items = [...new Set(labels)];
  const columns = 3, rows = Math.min(5, Math.ceil(items.length / columns));
  const width = 146, height = 64, gap = 11;
  const left = (480 - (columns * width + (columns - 1) * gap)) / 2;
  const top = (420 - (rows * height + (rows - 1) * gap)) / 2;
  const tiles = items.slice(0, columns * rows).map((item, index) => {
    const row = Math.floor(index / columns), column = index % columns;
    const x = left + column * (width + gap), y = top + row * (height + gap);
    return `<g class="hv-tile hv-w${row + column}"><rect x="${round(x)}" y="${round(y)}" width="${width}" height="${height}" rx="14"/><text text-anchor="middle">${tspans(wrapLabel(item, 15, 3), x + width / 2, y + height / 2 + 5, 18)}</text></g>`;
  });
  return svg("mosaic", "wide", 480, 420, tiles.join(""));
}

const layerSizes = {
  wide: { width: 480, cx: 168, half: 138, depth: 42, thickness: 14, pitch: 74, wrap: 13, line: 19, gap: 8 },
  compact: { width: 340, cx: 104, half: 92, depth: 30, thickness: 10, pitch: 62, wrap: 10, line: 19, gap: 6 }
};

function buildLayers(items, variant) {
  const size = layerSizes[variant];
  const { cx, half, depth, thickness, pitch } = size;
  const count = items.length;
  const canvas = variant === "compact" ? (count - 1) * pitch + depth * 2 + thickness + 80 : 420;
  const bottom = canvas / 2 + ((count - 1) * pitch) / 2 + 10;
  const face = y => `M${cx - half} ${y}L${cx} ${y - depth}L${cx + half} ${y}L${cx} ${y + depth}Z`;
  const body = items.map((label, index) => {
    const y = bottom - index * pitch;
    return `<g class="hv-slab hv-l${index}"><path class="hv-slab-side" d="M${cx - half} ${y}L${cx} ${y + depth}L${cx} ${y + depth + thickness}L${cx - half} ${y + thickness}Z"/><path class="hv-slab-side hv-slab-side-right" d="M${cx} ${y + depth}L${cx + half} ${y}L${cx + half} ${y + thickness}L${cx} ${y + depth + thickness}Z"/><path class="hv-slab-top" d="${face(y)}"/><line class="hv-slab-tick" x1="${cx + half + size.gap}" y1="${y}" x2="${cx + half + size.gap + 14}" y2="${y}"/><text class="hv-slab-label">${tspans(wrapLabel(label, size.wrap, 2), cx + half + size.gap + 22, y + 5, size.line)}</text></g>`;
  }).join("");
  const particles = [-0.3, -0.1, 0.1, 0.3, 0].map((share, index) => `<rect class="hv-particle hv-p${index}" x="${round(cx + share * half - 3)}" y="${round(bottom + 10)}" width="6" height="6" rx="1.5"/>`).join("");
  return svg("layers", variant, size.width, round(canvas), `${body}<path class="hv-scan" d="${face(bottom)}"/>${particles}`, ` hv-n${count}`);
}

// Stacked layers float while a scan rises through them; used for foundations and layered protection.
export function layersDiagram(layers) {
  const items = layers.slice(0, 4);
  return buildLayers(items, "wide") + buildLayers(items, "compact");
}

function buildRadar(labels, variant) {
  const compact = variant === "compact";
  const width = compact ? 340 : 480, height = compact ? 360 : 420, cx = width / 2, cy = height / 2, outer = compact ? 124 : 168;
  const scale = outer / 168;
  const blips = [[18, 120], [64, 64], [112, 150], [160, 96], [214, 136], [262, 70], [316, 128]];
  const inset = compact ? 44 : 64;
  const corners = [[inset, compact ? 22 : 44], [width - inset, compact ? 22 : 44], [width - inset, height - (compact ? 14 : 24)], [inset, height - (compact ? 14 : 24)]];
  const wedge = degrees => { const radians = -degrees * Math.PI / 180; return `M0 0L${outer} 0A${outer} ${outer} 0 0 0 ${round(outer * Math.cos(radians))} ${round(outer * Math.sin(radians))}Z`; };
  return svg("radar", variant, width, height, `<g transform="translate(${cx} ${cy})"><circle class="hv-ring" r="${round(outer / 3)}"/><circle class="hv-ring" r="${round(outer * 2 / 3)}"/><circle class="hv-ring hv-ring-outer" r="${outer}"/><line class="hv-cross" x1="-${outer}" y1="0" x2="${outer}" y2="0"/><line class="hv-cross" x1="0" y1="-${outer}" x2="0" y2="${outer}"/><g class="hv-sweep"><circle class="hv-ghost" r="${outer}"/><path class="hv-wedge" d="${wedge(50)}"/><path class="hv-wedge" d="${wedge(30)}"/><path class="hv-wedge" d="${wedge(13)}"/><line class="hv-sweep-edge" x1="0" y1="0" x2="${outer}" y2="0"/></g>${blips.map(([angle, distance], index) => { const radians = angle * Math.PI / 180; return `<g transform="translate(${round(distance * scale * Math.cos(radians))} ${round(distance * scale * Math.sin(radians))})"><circle class="hv-blip-ring hv-b${index}" r="7"/><circle class="hv-blip hv-b${index}" r="5"/></g>`; }).join("")}<circle class="hv-radar-core" r="9"/></g>${labels.slice(0, 4).map((label, index) => `<text class="hv-radar-label" text-anchor="middle">${tspans(wrapLabel(label, compact ? 11 : 14, 2), corners[index][0], corners[index][1], 18)}</text>`).join("")}`);
}

// A radar sweep finds activity and resolves it; used for detection and response topics.
export function radarDiagram(labels) {
  return buildRadar(labels, "wide") + buildRadar(labels, "compact");
}

const titles = (html, pattern) => [...html.matchAll(pattern)].map(match => plainText(match[1])).filter(Boolean);
const radarTopics = ["Identities", "Endpoints", "Cloud apps", "Email and data"];

// Every page gets its own diagram or scene; scripts/hero-visuals.test.mjs fails if any kind appears twice.
export function heroVisualFor(page, html) {
  const scene = sceneFor(page, html);
  if (scene) return scene;
  const topics = {
    "services.html": () => vennDiagram("Your goals", ["Security", "AI Business Solutions", "Cloud & AI"]),
    "industries.html": () => mosaicDiagram(titles(html, /<article class="catalog-card industry-card"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g).slice(0, 15)),
    "briefs.html": () => briefsDiagram(titles(html, /<article class="catalog-card brief-card"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g).slice(0, 3)),
    "engagements.html": () => pickerDiagram(titles(html, /<article class="engagement-card"[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/g)),
    "sources.html": () => layersDiagram(["Modern work", "Threat protection", "Copilot and agents", "Cloud and AI"]),
    "about.html": () => roadmapDiagram(titles(html, /<span class="about-step-number"[^>]*>\d+<\/span>\s*(?:<[^>]+>\s*)*?<h3[^>]*>([\s\S]*?)<\/h3>/g)),
    "contact.html": () => flowDiagram(titles(html, /<li><strong>([\s\S]*?)<\/strong>/g)),
    "deep-dive-access-and-data-protection.html": () => classifyDiagram([["Confidential", "risk"], ["General", "info"], ["Internal", "calm"]]),
    "deep-dive-secure-access.html": () => gateDiagram(["Remote worker", "Branch office", "Unmanaged device"], "Private apps", "Access policy"),
    "deep-dive-ai-agents.html": () => agentDiagram("Agent", ["Knowledge", "Search", "Ticket system", "Update record"]),
    "deep-dive-copilot.html": () => chatDiagram("Copilot", "Prepare a brief for tomorrow's customer meeting"),
    "deep-dive-grounding.html": () => retrievalDiagram("How do I submit an expense?"),
    "deep-dive-copilot-evaluation.html": () => evaluationDiagram("6 of 8 cases pass"),
    "deep-dive-copilot-model-choice.html": () => compareDiagram(["Quality", "Speed", "Cost"], ["Model A", "Model B", "Model C"]),
    "deep-dive-mitre-attack.html": () => matrixDiagram(["Initial access", "Execution", "Persistence", "Credentials", "Exfiltration"]),
    "deep-dive-security-operations.html": () => radarDiagram(radarTopics),
    "deep-dive-ai-governance.html": () => approvalDiagram("Capability change", ["Owner", "Risk review", "Approver"]),
    "insight-compliance-readiness.html": () => checklistDiagram(["Confirm the obligation", "Choose the baseline", "Map existing evidence", "Map Microsoft capabilities", "Review and improve"]),
    "deep-dive-ai-security.html": () => boundaryDiagram(["External content", "Agent and tools", "Your data"])
  };
  return topics[page] ? topics[page]() : "";
}

export const scenesStylesheet = '<link rel="stylesheet" href="assets/scenes.css">';

// Scene styles only load on pages that show a scene; theme.css must stay the last stylesheet.
export function withSceneStyles(html, needed) {
  const cleaned = html.replace(/<link rel="stylesheet" href="assets\/scenes\.css">\s*/g, "");
  return needed ? cleaned.replace('<link rel="stylesheet" href="assets/theme.css">', `${scenesStylesheet}\n<link rel="stylesheet" href="assets/theme.css">`) : cleaned;
}

export function syncHeroVisual(html, page) {
  const cleaned = withSceneStyles(html.replace(/<!-- (?:hero|page)-visual:start -->[\s\S]*?<!-- (?:hero|page)-visual:end -->/g, ""), false);
  const hero = cleaned.match(/<section class="section-wrap page-hero[^"]*"[^>]*>[\s\S]*?<\/section>/);
  if (!hero) return cleaned;
  const visual = heroVisualFor(page, cleaned);
  if (!visual) return cleaned;
  const kind = visual.match(/class="hv hv-([a-z]+)/)[1];
  const isScene = /class="hv hv-[a-z]+ hv-solo sc"/.test(visual);
  // On phones, skip diagrams that repeat content directly below the hero (section menus, filters, topic links).
  // Scenes are pure illustration, so they stay and shrink instead.
  const optional = !isScene && kind !== "radar" && /^(industry-|deep-dive-|insight-|scenario-|trust|sources\.html)/.test(page);
  const updated = hero[0].replace(/<\/section>$/, `<!-- page-visual:start --><div class="page-visual page-visual-${kind}${optional ? " page-visual-optional" : ""}">${visual}</div><!-- page-visual:end --></section>`);
  return withSceneStyles(cleaned.replace(hero[0], updated), isScene);
}

// The homepage challenge band uses the hub with protective blocking to show risk being stopped.
export function syncSignalMap(html) {
  return html.replace(/(<div class="signal-map" role="img" aria-label="[^"]*">)[\s\S]*?<\/svg>(<\/div>)/, (_, open, close) => `${open}${hubDiagram("Your business", ["Identities", "Data", "Devices", "Apps", "Cloud", "AI agents"], { risk: true })}${close}`);
}

// ---------------------------------------------------------------------------------------------
// Topic diagrams: one responsive layout each, drawn large enough to stay readable on phones.
// ---------------------------------------------------------------------------------------------
const solo = (kind, width, height, body, extra = "") => svg(kind, "solo", width, height, body, extra);
const label = (className, lines, x, y, lineHeight = 21, anchor = "start") => `<text class="${className}" text-anchor="${anchor}">${tspans(lines, x, y, lineHeight)}</text>`;
const tick = (x, y, className) => `<path class="hv-tick ${className}" d="M${x - 7} ${y}l5 5 9-10" pathLength="1"/>`;
const padTo = (items, count) => Array.from({ length: count }, (_, index) => items[index % items.length]);

// Three practices overlap around the client's goals and take turns leading.
// Circles of radius 110 sit 58 from the centroid, leaving a clear 52-unit centre for the goals badge and its pulse.
export function vennDiagram(center, practices) {
  const circles = [[200, 156], [149.8, 243], [250.2, 243]];
  const spots = [[200, 30], [104, 380], [296, 380]];
  const rings = circles.map(([x, y], index) => `<circle class="hv-venn-ring hv-vc${index}" cx="${x}" cy="${y}" r="110"/>`).join("");
  const names = practices.slice(0, 3).map((practice, index) => label(`hv-lbl hv-venn-name hv-vc${index}`, wrapLabel(practice, 13, 2), spots[index][0], spots[index][1], 20, "middle")).join("");
  return solo("venn", 400, 410, `${rings}<circle class="hv-venn-pulse" cx="200" cy="214" r="44"/><circle class="hv-core" cx="200" cy="214" r="40"/>${label("hv-venn-core", wrapLabel(center, 6, 2), 200, 220, 18, "middle")}${names}`);
}

// Sign-in requests reach a policy check; two continue to the resource and one is refused.
export function gateDiagram(sources, target, check = "Policy check") {
  const rows = [72, 160, 248];
  const body = sources.slice(0, 3).map((source, index) => {
    const y = rows[index], refused = index === 2;
    return `<line class="hv-wire" x1="130" y1="${y}" x2="164" y2="${y}"/>${refused ? "" : `<line class="hv-wire" x1="196" y1="${y}" x2="236" y2="160"/>`}<rect class="hv-box hv-src hv-g${index}" x="14" y="${y - 24}" width="116" height="48" rx="14"/>${label("hv-lbl", wrapLabel(source, 11, 2), 72, y + 6, 19, "middle")}<circle class="hv-token ${refused ? "hv-token-refused" : "hv-token-pass"} hv-g${index} hv-gy${index}" cx="130" cy="${y}" r="7"/>${refused ? `<path class="hv-refuse hv-g${index}" d="M173 ${y - 7}l14 14M187 ${y - 7}l-14 14"/>` : tick(180, y, `hv-gate-tick hv-g${index}`)}`;
  }).join("");
  const flashes = [0, 1].map(index => `<rect class="hv-target-flash hv-g${index}" x="236" y="124" width="112" height="72" rx="16"/>`).join("");
  return solo("gate", 360, 300, `<rect class="hv-gatepost" x="164" y="36" width="32" height="248" rx="16"/>${label("hv-cap", [check], 180, 22, 18, "middle")}<rect class="hv-box hv-target" x="236" y="124" width="112" height="72" rx="16"/>${flashes}${label("hv-lbl", wrapLabel(target, 11, 2), 292, 166, 20, "middle")}${body}`);
}

// Documents pass a scanner on a belt and leave with a sensitivity label; confidential ones are locked.
export function classifyDiagram(tags) {
  const docs = tags.slice(0, 3).map(([tag, tone], index) => {
    const width = tag.length * 9 + 24;
    const padlock = tone === "risk" ? `<g transform="translate(29 44)"><rect class="hv-lock-body" x="-9" y="-3" width="18" height="14" rx="3"/><path class="hv-lock-loop" d="M-5 -3v-4a5 5 0 0 1 10 0v4"/></g>` : "";
    return `<g transform="translate(-72 150)"><g class="hv-doc hv-dc${index}"><path class="hv-page" d="M0 0h42l16 16v58H0z"/><path class="hv-fold" d="M42 0v16h16"/><line class="hv-page-line" x1="10" y1="30" x2="46" y2="30"/><line class="hv-page-line" x1="10" y1="42" x2="40" y2="42"/><line class="hv-page-line" x1="10" y1="54" x2="44" y2="54"/><g class="hv-tag hv-tag-${tone}"><rect x="${29 - width / 2}" y="-36" width="${width}" height="28" rx="14"/><text x="29" y="-17" text-anchor="middle">${escape(tag)}</text>${padlock}</g></g></g>`;
  }).join("");
  return solo("classify", 360, 290, `<line class="hv-belt" x1="0" y1="232" x2="360" y2="232"/><line class="hv-belt-motion" x1="0" y1="232" x2="360" y2="232"/><path class="hv-scanner" d="M144 244V98a14 14 0 0 1 14-14h44a14 14 0 0 1 14 14v146"/><line class="hv-beam" x1="180" y1="102" x2="180" y2="226"/>${label("hv-cap", ["Classify and protect"], 180, 62, 18, "middle")}${docs}`);
}

// An agent calls its tools in turn; one action waits at an approval checkpoint first.
export function agentDiagram(center, tools) {
  const cx = 180, cy = 172, spots = [[68, 52], [292, 52], [68, 292], [292, 292]];
  const items = tools.slice(0, 4);
  const approve = items.length - 1;
  const [ax, ay] = [(cx + spots[approve][0]) / 2, (cy + spots[approve][1]) / 2];
  const wires = items.map((_, index) => `<line class="hv-wire" x1="${cx}" y1="${cy}" x2="${spots[index][0]}" y2="${spots[index][1]}"/>`).join("");
  const calls = items.map((_, index) => `<circle class="hv-call ${index === approve ? "hv-call-approve" : ""} hv-k${index} hv-kv${index}" cx="${cx}" cy="${cy}" r="6"/>`).join("");
  const boxes = items.map((tool, index) => `<rect class="hv-box hv-tool ${index === approve ? "hv-tool-late" : ""} hv-k${index}" x="${spots[index][0] - 58}" y="${spots[index][1] - 24}" width="116" height="48" rx="14"/>${label("hv-lbl", wrapLabel(tool, 12, 2), spots[index][0], spots[index][1] + 6, 19, "middle")}`).join("");
  const checkpoint = `<g transform="translate(${ax} ${ay})"><rect class="hv-checkpoint" x="-14" y="-14" width="28" height="28" rx="7" transform="rotate(45)"/></g>`;
  return solo("agent", 360, 344, `${wires}${checkpoint}${calls}${boxes}${tick(ax, ay, `hv-approve-tick hv-k${approve}`)}${label("hv-cap", ["Approval"], ax - 24, ay + 34, 18, "end")}<circle class="hv-halo-ring" cx="${cx}" cy="${cy}" r="50"/><circle class="hv-core" cx="${cx}" cy="${cy}" r="44"/>${label("hv-agent-core", wrapLabel(center, 8, 2), cx, cy + 6, 18, "middle")}`);
}

// A question is typed, the assistant thinks, and an answer arrives (with citations when grounded).
export function chatDiagram(title, prompt, { citations = true } = {}) {
  const lines = wrapLabel(prompt, 22, 3);
  const top = 66, bubble = lines.length * 22 + 26, answerTop = top + bubble + 18, answer = citations ? 116 : 96;
  const height = answerTop + answer + 26;
  const bars = [208, 228, 150].map((width, index) => `<rect class="hv-bar hv-bar${index}" x="44" y="${answerTop + 22 + index * 20}" width="${width}" height="10" rx="5"/>`).join("");
  const cites = citations ? [1, 2, 3].map(index => `<g class="hv-cite hv-ci${index}"><rect x="${44 + (index - 1) * 40}" y="${answerTop + 82}" width="32" height="24" rx="7"/><text x="${60 + (index - 1) * 40}" y="${answerTop + 99}" text-anchor="middle">${index}</text></g>`).join("") : "";
  return solo("chat", 360, height, `<rect class="hv-window" x="8" y="8" width="344" height="${height - 16}" rx="22"/><line class="hv-window-rule" x1="8" y1="50" x2="352" y2="50"/>${label("hv-cap", [title], 30, 35, 18)}<circle class="hv-online" cx="330" cy="30" r="5"/><g class="hv-chat-user"><rect x="92" y="${top}" width="244" height="${bubble}" rx="18"/><text class="hv-chat-text">${tspans(lines, 112, top + bubble / 2 + 6, 22)}</text></g><g class="hv-chat-typing"><rect x="24" y="${answerTop}" width="78" height="38" rx="19"/><circle cx="46" cy="${answerTop + 19}" r="4"/><circle cx="63" cy="${answerTop + 19}" r="4"/><circle cx="80" cy="${answerTop + 19}" r="4"/></g><g class="hv-chat-answer"><rect x="24" y="${answerTop}" width="268" height="${answer}" rx="18"/>${bars}${cites}</g>`);
}

// A question scans the available sources, skips the ones the person cannot open, and cites the rest.
export function retrievalDiagram(question) {
  const xs = [52, 118, 184, 250, 316], locked = new Set([1, 3]);
  const docs = xs.map((x, index) => `<path class="hv-rdoc ${locked.has(index) ? "hv-rdoc-locked" : "hv-rdoc-open"} hv-r${index}" d="M${x - 22} 104h32l12 12v44h-44z"/>${locked.has(index) ? `<g class="hv-rlock hv-r${index}" transform="translate(${x} 136)"><rect x="-8" y="-3" width="16" height="13" rx="3"/><path d="M-4.5 -3v-3.5a4.5 4.5 0 0 1 9 0v3.5"/></g>` : `<path class="hv-rbeam hv-r${index}" d="M${x} 164L180 228" pathLength="1"/>`}`).join("");
  const cites = [1, 2, 3].map(index => `<g class="hv-cite hv-ci${index}"><rect x="${60 + (index - 1) * 40}" y="${282}" width="32" height="24" rx="7"/><text x="${76 + (index - 1) * 40}" y="299" text-anchor="middle">${index}</text></g>`).join("");
  return solo("retrieval", 360, 330, `<rect class="hv-query" x="20" y="18" width="320" height="48" rx="24"/>${label("hv-lbl", wrapLabel(question, 30, 1), 180, 48, 20, "middle")}<line class="hv-wire" x1="180" y1="66" x2="180" y2="98"/><rect class="hv-rscan" x="8" y="94" width="88" height="76" rx="14"/>${docs}<rect class="hv-answer" x="40" y="228" width="280" height="90" rx="18"/><rect class="hv-bar hv-bar0" x="60" y="248" width="200" height="10" rx="5"/><rect class="hv-bar hv-bar1" x="60" y="266" width="160" height="10" rx="5"/>${cites}`);
}

// Test cases rise against the release threshold; the ones below it fail.
export function evaluationDiagram(summary = "6 of 8 cases pass") {
  const heights = [150, 172, 96, 160, 184, 118, 166, 176];
  const bars = heights.map((height, index) => `<rect class="hv-evbar ${height > 130 ? "hv-pass" : "hv-fail"} hv-e${index}" x="${36 + index * 38}" y="${270 - height}" width="24" height="${height}" rx="6"/>`).join("");
  return solo("evaluation", 360, 310, `<line class="hv-axis" x1="20" y1="270" x2="344" y2="270"/>${bars}<line class="hv-threshold" x1="20" y1="140" x2="344" y2="140"/><line class="hv-threshold" x1="168" y1="292" x2="190" y2="292"/>${label("hv-cap", ["Release threshold"], 344, 297, 18, "end")}${label("hv-strong hv-score", [summary], 20, 34, 20)}`);
}

// Candidate models compared on the measures that matter for one task.
export function compareDiagram(metrics, models) {
  const values = [[0.62, 0.9, 0.7], [0.88, 0.58, 0.74], [0.54, 0.84, 0.92]];
  const groups = metrics.slice(0, 3).map((metric, group) => {
    const x = 34 + group * 108;
    const bars = models.slice(0, 3).map((_, model) => { const height = Math.round(values[group][model] * 170); return `<rect class="hv-cmp hv-cmp${model} hv-e${group * 3 + model}" x="${x + model * 30}" y="${262 - height}" width="24" height="${height}" rx="6"/>`; }).join("");
    return `${bars}${label("hv-lbl", [metric], x + 42, 292, 20, "middle")}`;
  }).join("");
  const legend = models.slice(0, 3).map((model, index) => `<rect class="hv-cmp hv-cmp${index}" x="${20 + index * 112}" y="22" width="16" height="16" rx="4"/>${label("hv-cap", [model], 44 + index * 112, 36, 18)}`).join("");
  return solo("compare", 360, 310, `${legend}<line class="hv-axis" x1="20" y1="262" x2="344" y2="262"/>${groups}`);
}

// A detection scan sweeps across tactics; covered techniques light up and gaps are flagged.
export function matrixDiagram(tactics) {
  const pattern = ["11101", "11011", "10111", "01110", "11010"];
  const covered = pattern.join("").split("").filter(cell => cell === "1").length;
  const rows = tactics.slice(0, 5).map((tactic, row) => {
    const y = 76 + row * 54;
    return `${label("hv-lbl", [tactic], 16, y + 6, 20)}${pattern[row].split("").map((cell, column) => `<rect class="hv-mcell ${cell === "1" ? "hv-cov" : "hv-gap"} hv-mc${column}" x="${154 + column * 40}" y="${y - 16}" width="32" height="32" rx="8"/>`).join("")}`;
  }).join("");
  return solo("matrix", 360, 330, `${label("hv-cap", ["Detection coverage"], 16, 28, 18)}${label("hv-cap hv-coverage", [`${covered} of 25 covered`], 346, 28, 18, "end")}<rect class="hv-mscan" x="150" y="50" width="40" height="264" rx="10"/>${rows}`);
}

// A request collects each sign-off, receives an approval stamp, and the decision is logged.
export function approvalDiagram(title, signers, stamp = "Approved", record = "Decision recorded") {
  const rows = signers.slice(0, 3).map((signer, index) => {
    const y = 152 + index * 38;
    return `<rect class="hv-cbox hv-s${index}" x="82" y="${y - 12}" width="24" height="24" rx="7"/>${tick(94, y, `hv-sign-tick hv-s${index}`)}${label(`hv-lbl hv-sign-name hv-s${index}`, [signer], 118, y + 6, 20)}`;
  }).join("");
  return solo("approval", 360, 330, `<rect class="hv-sheet" x="58" y="22" width="244" height="240" rx="18"/>${label("hv-strong", wrapLabel(title, 20, 1), 82, 58, 20)}<rect class="hv-bar" x="82" y="80" width="196" height="10" rx="5"/><rect class="hv-bar" x="82" y="98" width="170" height="10" rx="5"/><rect class="hv-bar" x="82" y="116" width="120" height="10" rx="5"/>${rows}<g transform="translate(238 110) rotate(-10)"><g class="hv-stamp"><rect x="-62" y="-22" width="124" height="44" rx="10"/><text x="0" y="7" text-anchor="middle">${escape(stamp)}</text></g></g><g class="hv-record"><rect x="58" y="276" width="244" height="40" rx="12"/><circle cx="80" cy="296" r="5"/><text x="96" y="302">${escape(record)}</text></g>`);
}

// Controls are confirmed one by one while readiness fills.
export function checklistDiagram(items) {
  const rows = items.slice(0, 5).map((item, index) => {
    const y = 46 + index * 52;
    return `<rect class="hv-cbox hv-s${index}" x="18" y="${y - 14}" width="28" height="28" rx="8"/>${tick(32, y, `hv-sign-tick hv-s${index}`)}${label(`hv-lbl hv-sign-name hv-s${index}`, wrapLabel(item, 27, 1), 62, y + 6, 20)}`;
  }).join("");
  return solo("checklist", 360, 320, `${rows}<rect class="hv-track-bar" x="18" y="292" width="324" height="10" rx="5"/><rect class="hv-fill-bar" x="18" y="292" width="324" height="10" rx="5"/>`);
}

// Nested trust zones: safe inputs reach your data, hidden instructions stop at the agent boundary.
export function boundaryDiagram(zones) {
  const tokens = [[24, 174, 0, 0, false], [236, 24, 0, 0, true], [336, 174, 0, 0, false], [128, 324, 0, 0, true]];
  const moving = tokens.map(([x, y, , , blocked], index) => `<circle class="hv-token ${blocked ? "hv-token-stopped" : "hv-token-safe"} hv-z${index}" cx="${x}" cy="${y}" r="7"/>`).join("");
  return solo("boundary", 360, 340, `<rect class="hv-zone hv-zone-outer" x="8" y="8" width="344" height="324" rx="26"/><rect class="hv-zone hv-zone-mid" x="58" y="70" width="244" height="204" rx="22"/><rect class="hv-zone hv-zone-inner" x="118" y="128" width="124" height="92" rx="18"/><rect class="hv-inner-glow hv-z0" x="118" y="128" width="124" height="92" rx="18"/><rect class="hv-inner-glow hv-z2" x="118" y="128" width="124" height="92" rx="18"/>${label("hv-cap", [zones[0]], 26, 38, 18)}${label("hv-cap", [zones[1]], 76, 98, 18)}<line class="hv-shield-hit hv-z1" x1="212" y1="70" x2="260" y2="70"/><line class="hv-shield-hit hv-z3" x1="104" y1="274" x2="152" y2="274"/>${moving}${label("hv-lbl", wrapLabel(zones[2], 10, 2), 180, 180, 20, "middle")}`);
}

// A selection moves between the goals the engagement options on the page answer.
export function pickerDiagram(options) {
  const items = options.slice(0, 4);
  const four = items.length === 4;
  const tiles = items.map((option, index) => {
    const x = four ? 14 + (index % 2) * 176 : 14, y = four ? 16 + Math.floor(index / 2) * 152 : 16 + index * 104;
    const width = four ? 156 : 332, height = four ? 136 : 88;
    return `<rect class="hv-box hv-ptile" x="${x}" y="${y}" width="${width}" height="${height}" rx="18"/>${four ? label("hv-lbl", balancedWrap(option, 16, 3), x + width / 2, y + height / 2 + 6, 20, "middle") : label("hv-lbl", wrapLabel(option, 30, 2), x + 22, y + height / 2 + 6, 20)}`;
  }).join("");
  const width = four ? 156 : 332, height = four ? 136 : 88;
  return solo("picker", 360, four ? 320 : 324, `${tiles}<g class="hv-pick-ring hv-pick${items.length}"><rect x="14" y="16" width="${width}" height="${height}" rx="18"/><circle cx="${14 + width - 4}" cy="20" r="14"/>${tick(14 + width - 4, 20, "hv-pick-tick")}</g>`);
}

// The working method as a road: the route draws itself and each milestone lights as it is reached.
export function roadmapDiagram(steps) {
  const route = "M48 292C160 292 300 296 300 222C300 150 60 206 60 136C60 66 304 110 304 50";
  const stops = [[48, 292, 72, "start", -24], [300, 222, 280, "end", 0], [60, 136, 84, "start", 0], [304, 50, 284, "end", 0]];
  const marks = steps.slice(0, 4).map((step, index) => { const [x, y, textX, anchor, lift] = stops[index]; return `<circle class="hv-mile hv-m${index}" cx="${x}" cy="${y}" r="14"/><text class="hv-mile-number" x="${x}" y="${y + 5}" text-anchor="middle">${index + 1}</text>${label("hv-lbl hv-mile-name hv-m" + index, wrapLabel(step, 24, 1), textX, y + 6 + lift, 20, anchor)}`; }).join("");
  return solo("roadmap", 360, 330, `<path class="hv-route" d="${route}"/><path class="hv-route-progress" d="${route}" pathLength="100"/>${marks}`);
}

// Service briefs fan out from a neat stack, ready to read or download.
export function briefsDiagram(titles, badge = "PDF") {
  const [front] = padTo(titles, 1);
  const page = (className, text) => `<g class="${className}"><rect class="hv-pagecard" x="110" y="30" width="140" height="184" rx="14"/>${text ? label("hv-cap hv-page-kicker", wrapLabel(text, 13, 2), 128, 62, 18) : ""}<rect class="hv-bar" x="128" y="96" width="104" height="9" rx="4.5"/><rect class="hv-bar" x="128" y="113" width="88" height="9" rx="4.5"/><rect class="hv-bar" x="128" y="130" width="96" height="9" rx="4.5"/></g>`;
  return solo("briefs", 360, 320, `${page("hv-sheet-back hv-sheet-left", "")}${page("hv-sheet-back hv-sheet-right", "")}<g class="hv-sheet-front">${page("", front)}<rect class="hv-badge" x="128" y="170" width="52" height="26" rx="8"/><text class="hv-badge-text" x="154" y="188" text-anchor="middle">${escape(badge)}</text></g><g class="hv-download"><line x1="180" y1="238" x2="180" y2="276"/><path d="M166 264l14 14 14-14"/></g><path class="hv-tray" d="M150 290v10h60v-10"/>`);
}
