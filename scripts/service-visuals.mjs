import { escapeHtml as escape } from "../shared/html.mjs";

// Service scenes: every capability on the three consulting pages gets its own small illustration and its own kind of motion.
// Geometry lives here; styles and motion live in assets/service-scenes.css. Each scene is drawn in its finished state,
// so reduced motion, print, and a slow stylesheet all show a complete picture.

const r1 = value => Math.round(value * 10) / 10;
const night = "#0b1220";
const scene = (kind, body, defs = "") => `<svg class="hv hv-${kind} sv" viewBox="0 0 360 150" aria-hidden="true" focusable="false">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
const say = (className, value, x, y, anchor = "middle") => `<text class="${className}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${escape(value)}</text>`;
const check = (x, y, className) => `<path class="${className}" d="M${r1(x - 7)} ${r1(y)}l5 5.5 9.5-11"/>`;
const sparkle = (cx, cy, r, className) => {
  const k = r * 0.2;
  return `<path class="${className}" d="M${r1(cx)} ${r1(cy - r)}C${r1(cx + k)} ${r1(cy - k)} ${r1(cx + k)} ${r1(cy - k)} ${r1(cx + r)} ${r1(cy)}C${r1(cx + k)} ${r1(cy + k)} ${r1(cx + k)} ${r1(cy + k)} ${r1(cx)} ${r1(cy + r)}C${r1(cx - k)} ${r1(cy + k)} ${r1(cx - k)} ${r1(cy + k)} ${r1(cx - r)} ${r1(cy)}C${r1(cx - k)} ${r1(cy - k)} ${r1(cx - k)} ${r1(cy - k)} ${r1(cx)} ${r1(cy - r)}Z"/>`;
};
const person = (x, y, className) => `<g class="${className}"><circle cx="${x}" cy="${y}" r="6.5"/><path d="M${x - 11} ${y + 20}a11 10 0 0 1 22 0z"/></g>`;
const cloud = (x, y, w, className) => {
  const s = w / 64;
  const p = (dx, dy) => `${r1(x + dx * s)} ${r1(y + dy * s)}`;
  return `<path class="${className}" d="M${p(12, 40)}H${p(52, 40).split(" ")[0]}A${r1(12 * s)} ${r1(12 * s)} 0 0 0 ${p(54, 16)}A${r1(18 * s)} ${r1(18 * s)} 0 0 0 ${p(20, 12)}A${r1(14 * s)} ${r1(14 * s)} 0 0 0 ${p(12, 40)}Z"/>`;
};

// AI Security: the assistant reaches its tools, and a lock snaps shut on each connection.
export function reachScene() {
  const targets = [[292, 32], [300, 75], [292, 118]];
  const curve = ([x, y]) => [[98, 75], [160, 75], [x - 90, y], [x - 24, y]];
  // Locks sit most of the way along each tether, where the lines have spread apart.
  const along = (points, t) => [0, 1].map(axis => (1 - t) ** 3 * points[0][axis] + 3 * (1 - t) ** 2 * t * points[1][axis] + 3 * (1 - t) * t ** 2 * points[2][axis] + t ** 3 * points[3][axis]);
  const tethers = targets.map(([x, y], index) => `<path class="sv-tether sv-t${index}" d="M98 75C160 75 ${x - 90} ${y} ${x - 24} ${y}" pathLength="1"/>`).join("");
  const locks = targets.map((target, index) => {
    const [cx, cy] = along(curve(target), 0.72).map(r1);
    return `<g class="sv-lock sv-t${index}"><circle class="sv-lock-pad" cx="${cx}" cy="${cy}" r="15"/><path class="sv-shackle" d="M${r1(cx - 5)} ${r1(cy - 2)}v-4a5 5 0 0 1 10 0v4"/><rect class="sv-lock-body" x="${r1(cx - 8)}" y="${r1(cy - 3)}" width="16" height="12" rx="3"/></g>`;
  }).join("");
  const glyphs = [
    '<path class="sv-glyph" d="M285 22h10l6 6v14h-16z"/><path class="sv-glyph" d="M289 31h8M289 36h8"/>',
    '<path class="sv-glyph" d="M303 63l-9 13h7l-3 11 10-14h-7z"/>',
    '<ellipse class="sv-glyph" cx="292" cy="111" rx="9" ry="3.5"/><path class="sv-glyph" d="M283 111v13c0 2 4 3.5 9 3.5s9-1.5 9-3.5v-13M283 117.5c0 2 4 3.5 9 3.5s9-1.5 9-3.5"/>'
  ];
  const nodes = targets.map(([x, y], index) => `<circle class="sv-node" cx="${x}" cy="${y}" r="21"/>${glyphs[index]}`).join("");
  return scene("reach", `${tethers}${nodes}<rect class="sv-chip" x="34" y="43" width="64" height="64" rx="18"/>${sparkle(66, 75, 17, "sv-spark")}${locks}`);
}

// AI Governance: the review boxes tick, then the approval stamp comes down.
export function sealScene() {
  const rows = [52, 78].map((y, index) => `<rect class="sv-box" x="62" y="${y - 8}" width="16" height="16" rx="4"/>${check(70, y, `sv-tickmark sv-k${index}`)}<rect class="sv-bar" x="90" y="${y - 4.5}" width="${[92, 70][index]}" height="9" rx="4.5"/>`).join("");
  const imprint = `<g transform="rotate(-8 150 114)"><g class="sv-imprint"><rect x="98" y="97" width="104" height="34" rx="8"/>${say("sv-imprint-text", "Approved", 150, 120)}</g></g>`;
  const stamp = `<g class="sv-stamp"><circle class="sv-stamp-knob" cx="292" cy="24" r="11"/><rect class="sv-stamp-neck" x="285" y="33" width="14" height="22" rx="4"/><rect class="sv-stamp-base" x="258" y="54" width="68" height="16" rx="5"/><rect class="sv-stamp-pad" x="262" y="70" width="60" height="6" rx="2"/></g>`;
  return scene("seal", `<rect class="sv-sheet" x="40" y="10" width="180" height="130" rx="12"/><rect class="sv-bar sv-bar-hi" x="62" y="22" width="78" height="9" rx="4.5"/>${rows}${imprint}${stamp}`);
}

// Threat protection: attacks strike the shield, ripple, and glance away from what it protects.
export function deflectScene() {
  const lanes = [46, 76, 106];
  const trails = lanes.map(y => `<path class="sv-trail" d="M20 ${y}H176"/>`).join("");
  const threats = lanes.map((y, index) => `<circle class="sv-threat sv-d${index}" cx="26" cy="${y}" r="6"/>`).join("");
  const ripples = [[186, 46], [186, 76], [195, 106]].map(([x, y], index) => `<circle class="sv-ripple sv-d${index}" cx="${x}" cy="${y}" r="12"/>`).join("");
  const assets = [[290, 54], [318, 54], [290, 82], [318, 82]].map(([x, y]) => `<rect class="sv-asset" x="${x}" y="${y}" width="22" height="22" rx="6"/>`).join("");
  return scene("deflect", `${trails}${assets}<path class="sv-shield" d="M226 26L266 40V76C266 102 248 118 226 126C204 118 186 102 186 76V40Z"/>${check(226, 76, "sv-okline")}${ripples}${threats}`);
}

// Identity and access: a badge taps the reader, the light turns green, and the doors slide open.
export function keycardScene() {
  const tiles = [[246, 38], [284, 38], [246, 80], [284, 80]].map(([x, y], index) => `<rect class="sv-tile sv-tile${index}" x="${x}" y="${y}" width="32" height="32" rx="8"/>`).join("");
  const doors = `<g clip-path="url(#sv-keycard-clip)"><g class="sv-door sv-door-l"><rect x="230" y="20" width="51" height="112" rx="9"/><rect class="sv-handle" x="272" y="68" width="4" height="16" rx="2"/></g><g class="sv-door sv-door-r"><rect x="281" y="20" width="51" height="112" rx="9"/><rect class="sv-handle" x="286" y="68" width="4" height="16" rx="2"/></g></g>`;
  const card = `<g class="sv-badge"><rect class="sv-idcard" x="56" y="50" width="82" height="54" rx="9"/><circle class="sv-idface" cx="77" cy="70" r="8"/><path class="sv-idface" d="M67 90a10 8 0 0 1 20 0z"/><rect class="sv-bar" x="96" y="64" width="32" height="7" rx="3.5"/><rect class="sv-bar" x="96" y="78" width="22" height="7" rx="3.5"/></g>`;
  const reader = `<rect class="sv-reader" x="152" y="34" width="44" height="82" rx="11"/><circle class="sv-led" cx="174" cy="50" r="5"/><path class="sv-waves" d="M166 82a11 11 0 0 1 16 0M162 76a17 17 0 0 1 24 0M170 88a5 5 0 0 1 8 0"/>`;
  return scene("keycard", `<rect class="sv-doorframe" x="228" y="18" width="106" height="116" rx="12"/>${tiles}${doors}${reader}${card}`, '<clipPath id="sv-keycard-clip"><rect x="229" y="19" width="104" height="114" rx="11"/></clipPath>');
}

// Secure network access: requests travel a private tunnel and turn green as they pass the checkpoint.
export function tunnelScene() {
  const noise = [[118, 30], [176, 22], [236, 34], [132, 122], [206, 128], [250, 118]].map(([x, y]) => `<circle class="sv-noise" cx="${x}" cy="${y}" r="4"/>`).join("");
  const packets = [0, 1, 2, 3].map(index => `<rect class="sv-pkt sv-p${index}" x="104" y="71" width="18" height="8" rx="4"/>`).join("");
  const laptop = `<rect class="sv-device" x="20" y="50" width="62" height="42" rx="6"/><path class="sv-device-base" d="M12 96h78l-7 8H19z"/><circle class="sv-idface" cx="51" cy="66" r="6"/><path class="sv-idface" d="M42 84a9 8 0 0 1 18 0z"/>`;
  const app = `${cloud(282, 42, 66, "sv-cloud")}<rect class="sv-appmark" x="307" y="66" width="16" height="14" rx="3"/>`;
  return scene("tunnel", `${noise}<rect class="sv-tube" x="96" y="58" width="176" height="34" rx="17"/>${packets}<ellipse class="sv-gate" cx="150" cy="75" rx="7" ry="23"/>${laptop}${app}`);
}

// Endpoint security and management: updates drop into each device and the warnings clear.
export function fleetScene() {
  const devices = [
    ['<rect class="sv-screen" x="40" y="42" width="88" height="60" rx="7"/><path class="sv-device-base" d="M28 106h112l-8 9H36z"/>', 84, 72],
    ['<rect class="sv-screen" x="166" y="34" width="60" height="84" rx="10"/>', 196, 76],
    ['<rect class="sv-screen" x="272" y="40" width="40" height="74" rx="9"/><rect class="sv-notch" x="285" y="45" width="14" height="4" rx="2"/>', 292, 80]
  ];
  const body = devices.map(([shape, x, y], index) => `${shape}<g class="sv-warn sv-e${index}"><circle cx="${x}" cy="${y}" r="12"/><path d="M${x} ${y - 6}v7M${x} ${y + 5}v.5"/></g><g class="sv-fixed sv-e${index}"><circle cx="${x}" cy="${y}" r="12"/>${check(x, y, "sv-fixed-tick")}</g><g class="sv-pkg sv-e${index}"><rect x="${x - 11}" y="4" width="22" height="22" rx="6"/><path d="M${x} 9v11M${x - 4.5} 15.5l4.5 4.5 4.5-4.5"/></g>`).join("");
  return scene("fleet", body);
}

// Data security and compliance readiness: labels attach, the dial clicks round, and the vault bolts lock.
export function vaultScene() {
  const bolts = [45, 135, 225, 315].map(angle => `<g transform="rotate(${angle} 110 75)"><rect class="sv-vbolt" x="158" y="71" width="16" height="8" rx="3"/></g>`).join("");
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const a = (index * 30 * Math.PI) / 180, long = index % 3 === 0;
    return `M${r1(110 + Math.sin(a) * 18)} ${r1(75 - Math.cos(a) * 18)}L${r1(110 + Math.sin(a) * (long ? 12 : 15))} ${r1(75 - Math.cos(a) * (long ? 12 : 15))}`;
  }).join("");
  const spokes = [30, 150, 270].map(angle => {
    const a = (angle * Math.PI) / 180;
    return `<path class="sv-spoke" d="M${r1(110 + Math.cos(a) * 26)} ${r1(75 + Math.sin(a) * 26)}L${r1(110 + Math.cos(a) * 40)} ${r1(75 + Math.sin(a) * 40)}"/><circle class="sv-spoke-end" cx="${r1(110 + Math.cos(a) * 42)}" cy="${r1(75 + Math.sin(a) * 42)}" r="4"/>`;
  }).join("");
  const docs = [[250, 20, 2], [238, 32, 1], [226, 44, 0]].map(([x, y, index]) => `<rect class="sv-sheet" x="${x}" y="${y}" width="72" height="88" rx="9"/><rect class="sv-label sv-l${index}" x="${x + 12}" y="${y + 12}" width="38" height="12" rx="6"/>`).join("");
  const lines = [[82, 46], [96, 36], [110, 42]].map(([y, w]) => `<rect class="sv-bar" x="238" y="${y}" width="${w}" height="7" rx="3.5"/>`).join("");
  return scene("vault", `${bolts}<circle class="sv-vault-rim" cx="110" cy="75" r="58"/><circle class="sv-vault-door" cx="110" cy="75" r="48"/>${spokes}<g class="sv-dial"><circle class="sv-dial-face" cx="110" cy="75" r="22"/><path class="sv-dial-ticks" d="${ticks}"/><path class="sv-dial-mark" d="M110 57v10"/></g>${docs}${lines}`);
}

// Cloud security: a honeycomb shield shimmers across the estate and repairs the one weak cell it finds.
export function domeScene() {
  const radius = 10.5, dx = Math.sqrt(3) * radius, dy = 1.5 * radius;
  const cells = [];
  for (let row = 0; row < 9; row++) {
    const y = 126 - row * dy;
    for (let col = -10; col <= 10; col++) {
      const x = 180 + col * dx + (row % 2 ? dx / 2 : 0);
      const outer = ((x - 180) / 168) ** 2 + ((y - 131) / 124) ** 2;
      const inner = ((x - 180) / 118) ** 2 + ((y - 131) / 76) ** 2;
      if (outer <= 1 && inner >= 1) cells.push([x, y]);
    }
  }
  const flag = cells.reduce((best, cell) => (Math.hypot(cell[0] - 262, cell[1] - 52) < Math.hypot(best[0] - 262, best[1] - 52) ? cell : best));
  const hex = ([x, y]) => `M${Array.from({ length: 6 }, (_, index) => {
    const a = ((60 * index - 90) * Math.PI) / 180;
    return `${r1(x + (radius - 1) * Math.cos(a))} ${r1(y + (radius - 1) * Math.sin(a))}`;
  }).join("L")}Z`;
  const body = cells.map(cell => {
    const band = Math.min(7, Math.floor(((cell[0] - 12) / 336) * 8));
    return `<path class="sv-hex sv-hb${band}${cell === flag ? " sv-hex-flag" : ""}" d="${hex(cell)}"/>`;
  }).join("");
  const resources = [[160, 102], [176, 102], [192, 102]].map(([x, y]) => `<rect class="sv-appmark" x="${x}" y="${y}" width="10" height="10" rx="2.5"/>`).join("");
  return scene("dome", `<path class="sv-ground" d="M16 140H344"/>${body}${cloud(136, 72, 88, "sv-cloud")}${resources}`);
}

// Modern work and productivity: mail, chat, files, and calendar fan out like a hand of cards.
export function fanScene() {
  const glyphs = [
    '<path class="sv-app-glyph" d="M162 52h36v24h-36zM162 52l18 13 18-13"/>',
    '<path class="sv-app-glyph" d="M162 50h36v20h-22l-8 7v-7h-6z"/>',
    '<path class="sv-app-glyph" d="M166 50h28M166 59h28M166 68h18M166 77h24"/>',
    '<path class="sv-app-glyph" d="M162 50h36v28h-36zM162 59h36M174 50v28M186 50v28"/>'
  ];
  const cards = glyphs.map((glyph, index) => `<g class="sv-app sv-a${index}"><rect class="sv-app-body" x="138" y="24" width="84" height="64" rx="10"/><path class="sv-app-head sv-ah${index}" d="M138 36a10 10 0 0 1 10-12h64a10 10 0 0 1 10 12z"/>${glyph}</g>`).join("");
  return scene("fan", cards);
}

// Copilot readiness and enablement: readiness charges segment by segment, then Copilot sparks to life.
export function chargeScene() {
  const cells = [0, 1, 2, 3].map(index => `<rect class="sv-cell sv-c${index}" x="${72 + index * 47}" y="56" width="41" height="38" rx="8"/>`).join("");
  const rays = Array.from({ length: 8 }, (_, index) => {
    const a = (index * 45 * Math.PI) / 180;
    return `M${r1(314 + Math.cos(a) * 25)} ${r1(66 + Math.sin(a) * 25)}L${r1(314 + Math.cos(a) * 33)} ${r1(66 + Math.sin(a) * 33)}`;
  }).join("");
  return scene("charge", `<rect class="sv-batt" x="60" y="44" width="206" height="62" rx="16"/><rect class="sv-batt-cap" x="266" y="62" width="12" height="26" rx="4"/>${cells}<path class="sv-ray" d="${rays}"/>${sparkle(314, 66, 18, "sv-burst")}${say("sv-t sv-ready", "Ready", 314, 128)}`);
}

// Business process transformation: one push sets off the chain, and the last step raises the finish flag.
// Resting angles are solved so each fallen domino leans on the next instead of passing through it.
export function dominoScene() {
  const dominoes = [0, 1, 2, 3, 4, 5].map(index => `<g class="sv-dom sv-m${index}"><rect x="${50 + index * 30}" y="56" width="18" height="64" rx="3"/><path d="M${52 + index * 30} 88h14"/></g>`).join("");
  return scene("domino", `<path class="sv-ground" d="M20 120H340"/>${dominoes}<g class="sv-finish"><circle cx="294" cy="104" r="14"/>${check(294, 104, "sv-finish-tick")}</g>`);
}

// Custom AI solutions: your data goes into the flask, bubbles rise, and a purpose-built assistant emerges.
export function flaskScene() {
  const bubbles = [[152, 4], [166, 3], [180, 5], [194, 3], [208, 4], [172, 3]].map(([x, r], index) => `<circle class="sv-bub sv-b${index}" cx="${x}" cy="126" r="${r}"/>`).join("");
  const data = [[46, 96], [70, 96], [58, 74]].map(([x, y]) => `<rect class="sv-appmark" x="${x}" y="${y}" width="20" height="20" rx="5"/>`).join("");
  const app = '<rect class="sv-sheet" x="268" y="52" width="62" height="58" rx="10"/><path class="sv-app-glyph" d="M280 70h38M280 80h28M280 90h34"/>';
  return scene("flask", `${data}${app}<path class="sv-glass" d="M166 36H194V66L238 126C243 134 238 140 229 140H131C122 140 117 134 122 126L166 66Z"/><path class="sv-liquid" d="M143 100H217L233 122C237 128 234 134 228 134H132C126 134 123 128 127 122Z"/><rect class="sv-rim" x="160" y="28" width="40" height="9" rx="4.5"/>${bubbles}<g class="sv-wisp">${sparkle(180, 14, 10, "sv-spark")}</g>`);
}

// Adoption and value realization: the idea takes root, people light up around it, and value blooms at the top.
export function sproutScene() {
  const people = [[58, 46], [94, 46], [58, 92], [94, 92], [266, 46], [302, 46], [266, 92], [302, 92]].map(([x, y], index) => person(x, y, `sv-person sv-u${index}`)).join("");
  const leaves = [
    "M180 100c-10-12-28-12-34-2 8 8 24 10 34 2z",
    "M180 86c10-12 28-12 34-2-8 8-24 10-34 2z",
    "M180 72c-8-10-22-10-27-2 6 7 19 8 27 2z",
    "M180 60c8-10 22-10 27-2-6 7-19 8-27 2z"
  ].map((d, index) => `<path class="sv-leaf sv-f${index}" d="${d}"/>`).join("");
  return scene("sprout", `${people}<path class="sv-stem" d="M180 114V46"/>${leaves}<g class="sv-coin"><circle cx="180" cy="34" r="14"/><path d="M180 41V27M174 33l6-6 6 6"/></g><rect class="sv-rim" x="146" y="112" width="68" height="9" rx="4.5"/><path class="sv-pot" d="M152 121H208L202 142H158Z"/>`);
}

// Cloud foundations: identity, network, policy, and operations rise as pillars before the platform settles on top.
export function pillarsScene() {
  const glyphs = [
    x => `<circle cx="${x}" cy="84" r="4.5"/><path d="M${x - 7} 98a7 6 0 0 1 14 0"/>`,
    x => `<circle cx="${x}" cy="82" r="3"/><circle cx="${x - 7}" cy="97" r="3"/><circle cx="${x + 7}" cy="97" r="3"/><path d="M${x} 85l-6 9M${x} 85l6 9"/>`,
    x => `<path d="M${x} 80l8 3v6c0 6-4 9-8 11-4-2-8-5-8-11v-6z"/>`,
    x => `<path d="M${x - 9} 92h5l3-8 4 14 3-6h3"/>`
  ];
  const pillars = [70, 134, 198, 262].map((x, index) => `<g class="sv-pillar sv-q${index}"><rect x="${x}" y="66" width="30" height="58" rx="5"/><g class="sv-pillar-glyph">${glyphs[index](x + 15)}</g></g>`).join("");
  return scene("pillars", `<rect class="sv-slab" x="44" y="124" width="272" height="14" rx="5"/>${pillars}<rect class="sv-deck" x="56" y="54" width="248" height="12" rx="5"/>${cloud(148, 14, 64, "sv-cloud sv-land")}`);
}

// Application and infrastructure modernization: the monolith sinks through the slot and rises again as containers.
export function portalScene() {
  const vents = [34, 46, 58, 70].map(y => `M162 ${y}h36`).join("");
  const boxes = [70, 158, 246].map((x, index) => `<g class="sv-crate sv-x${index}"><rect x="${x}" y="58" width="44" height="46" rx="9"/><path d="M${x + 22} 68l11 6v12l-11 6-11-6v-12zM${x + 11} 74l11 6 11-6M${x + 22} 80v12"/></g>`).join("");
  return scene("portal", `<g clip-path="url(#sv-portal-clip)"><g class="sv-mono"><rect x="150" y="20" width="60" height="88" rx="8"/><path d="${vents}"/><circle cx="180" cy="94" r="4"/></g>${boxes}</g><ellipse class="sv-slot-glow" cx="180" cy="112" rx="150" ry="8"/><path class="sv-slot" d="M30 112H330"/><path class="sv-ground" d="M60 134H300"/>`, '<clipPath id="sv-portal-clip"><rect x="0" y="0" width="360" height="112"/></clipPath>');
}

// Governed data and analytics: scattered values sort themselves into order and reveal the trend.
export function sortScene() {
  const heights = [22, 34, 46, 58, 70, 82, 94];
  const bars = heights.map((height, index) => `<rect class="sv-sbar sv-s${index}" x="${56 + index * 38}" y="${124 - height}" width="26" height="${height}" rx="6"/>`).join("");
  const trend = heights.map((height, index) => `${index ? "L" : "M"}${69 + index * 38} ${124 - height - 10}`).join("");
  return scene("sort", `<path class="sv-ground" d="M40 124H330"/>${bars}<path class="sv-trend" d="${trend}" pathLength="1"/><g class="sv-seal-badge"><circle cx="318" cy="30" r="15"/>${check(318, 30, "sv-finish-tick")}</g>`);
}

// AI application platforms: apps turn on one shared platform like a turntable around the model at its centre.
export function turntableScene() {
  const glyphs = [
    '<path class="sv-app-glyph" d="M-16 -6h32v16h-18l-7 6v-6h-7z"/>',
    '<path class="sv-app-glyph" d="M-14 12V2M-4 12V-4M6 12V4M16 12V-8"/>',
    '<circle class="sv-app-glyph" cx="-3" cy="1" r="8"/><path class="sv-app-glyph" d="M3 7l9 9"/>'
  ];
  const cards = glyphs.map((glyph, index) => `<g class="sv-spin sv-o${index}"><rect class="sv-app-body" x="-38" y="-26" width="76" height="52" rx="10"/><path class="sv-app-head sv-ah${index}" d="M-38 -16a10 10 0 0 1 10-10h56a10 10 0 0 1 10 10z"/>${glyph}</g>`).join("");
  return scene("turntable", `<ellipse class="sv-track" cx="180" cy="84" rx="110" ry="34"/><rect class="sv-chip" x="169" y="68" width="22" height="22" rx="7"/>${sparkle(180, 79, 7, "sv-spark")}${cards}`);
}

// Reliability, operations, and cloud financial management: the budget line trims spend while service health keeps ticking.
export function trimScene() {
  const full = [96, 72, 104, 64, 88], trimmed = [58, 46, 62, 40, 54];
  const ghosts = full.map((height, index) => `<rect class="sv-ghost" x="${40 + index * 42}" y="${128 - height}" width="28" height="${height}" rx="6"/>`).join("");
  const bars = trimmed.map((height, index) => `<rect class="sv-cost sv-g${index}" x="${40 + index * 42}" y="${128 - height}" width="28" height="${height}" rx="6"/>`).join("");
  const tokens = trimmed.map((height, index) => `<circle class="sv-token sv-g${index}" cx="${54 + index * 42}" cy="${128 - height - 12}" r="6"/>`).join("");
  const pattern = [22, 16, 20, 14, 22, 18];
  const ticks = Array.from({ length: 13 }, (_, index) => `<rect x="${274 + index * 10}" y="${96 - pattern[index % 6]}" width="6" height="${pattern[index % 6]}" rx="2"/>`).join("");
  return scene("trim", `<path class="sv-ground" d="M30 128H250"/>${ghosts}${bars}${tokens}<path class="sv-budget" d="M30 62H250"/><rect class="sv-status" x="262" y="30" width="84" height="92" rx="14"/><circle class="sv-pulse" cx="304" cy="50" r="6"/><g clip-path="url(#sv-trim-clip)"><g class="sv-ticker">${ticks}</g></g><rect class="sv-bar" x="276" y="106" width="56" height="7" rx="3.5"/>`, '<clipPath id="sv-trim-clip"><rect x="270" y="66" width="68" height="32"/></clipPath>');
}

export const practiceScenes = {
  "security.html": {
    "ai-security": reachScene,
    "ai-governance": sealScene,
    "threat-protection": deflectScene,
    identity: keycardScene,
    "secure-access": tunnelScene,
    endpoints: fleetScene,
    "data-security": vaultScene,
    "cloud-security": domeScene
  },
  "ai-business.html": {
    "modern-work": fanScene,
    copilot: chargeScene,
    processes: dominoScene,
    "custom-ai": flaskScene,
    adoption: sproutScene
  },
  "cloud-platforms.html": {
    "landing-zones": pillarsScene,
    modernization: portalScene,
    "data-platforms": sortScene,
    "ai-platforms": turntableScene,
    operations: trimScene
  }
};

export const serviceScenesStylesheet = '<link rel="stylesheet" href="assets/service-scenes.css">';

export function withServiceSceneStyles(html, needed) {
  const cleaned = html.replace(/<link rel="stylesheet" href="assets\/service-scenes\.css">\s*/g, "");
  return needed ? cleaned.replace('<link rel="stylesheet" href="assets/theme.css">', `${serviceScenesStylesheet}\n<link rel="stylesheet" href="assets/theme.css">`) : cleaned;
}

// Each capability's illustration closes its introduction, so on phones it fills the card above "View details".
export function syncPracticeVisuals(html, page) {
  const scenes = practiceScenes[page];
  const cleaned = withServiceSceneStyles(html.replace(/<!-- practice-visual:start -->[\s\S]*?<!-- practice-visual:end -->/g, ""), false);
  if (!scenes) return cleaned;
  let placed = 0;
  const updated = cleaned.replace(/<section class="practice" id="([^"]+)"[^>]*>[\s\S]*?<\/section>/g, (section, id) => {
    const draw = scenes[id];
    if (!draw) return section;
    placed++;
    return section.replace(/<\/div>(\s*<div class="practice-detail">)/, `<!-- practice-visual:start --><div class="practice-visual" aria-hidden="true">${draw()}</div><!-- practice-visual:end --></div>$1`);
  });
  if (placed !== Object.keys(scenes).length) throw new Error(`Expected ${Object.keys(scenes).length} practice visuals on ${page}, placed ${placed}`);
  return withServiceSceneStyles(updated, true);
}
