import { escapeHtml as escape } from "../shared/html.mjs";

// Scenes are one-off illustrations: each page tells its own small story in motion, and no two pages share one.
// Geometry lives here; motion lives in assets/scenes.css and stops entirely for reduced motion,
// so every scene is drawn in a finished, readable resting state first.

const r1 = value => Math.round(value * 10) / 10;
const scene = (kind, width, height, body) => `<svg class="hv hv-${kind} hv-solo sc" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${body}</svg>`;
const say = (className, value, x, y, anchor = "middle") => `<text class="${className}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${escape(value)}</text>`;
const tick = (x, y, className = "sc-okline") => `<path class="${className}" d="M${r1(x - 9)} ${r1(y)}l6 7 13-14" pathLength="1"/>`;

function wrap(value, max, limit = 2) {
  const lines = [""];
  for (const word of String(value).split(/\s+/).filter(Boolean)) {
    const current = lines[lines.length - 1];
    if (!current) lines[lines.length - 1] = word;
    else if (`${current} ${word}`.length <= max) lines[lines.length - 1] = `${current} ${word}`;
    else if (lines.length < limit) lines.push(word);
    else { lines[lines.length - 1] = `${current}\u2026`; break; }
  }
  return lines;
}

// Uses the fewest lines, then evens them out, so short names never stack one word per line.
export function balancedWrap(value, max, limit = 2) {
  const words = String(value).split(/\s+/).filter(Boolean);
  let best = null;
  const search = (start, lines) => {
    if (start === words.length) {
      const longest = Math.max(...lines.map(line => line.length));
      if (!best || lines.length < best.lines.length || (lines.length === best.lines.length && longest < best.longest)) best = { lines, longest };
      return;
    }
    if (lines.length === limit) return;
    for (let end = start + 1; end <= words.length; end++) {
      const line = words.slice(start, end).join(" ");
      if (line.length > max && end > start + 1) break;
      search(end, [...lines, line]);
    }
  };
  search(0, []);
  return best ? best.lines : wrap(value, max, limit);
}

const block = (className, value, x, y, max, lineHeight = 20, limit = 2) => {
  const parts = wrap(value, max, limit);
  const start = y - ((parts.length - 1) * lineHeight) / 2;
  return `<text class="${className}" text-anchor="middle">${parts.map((part, index) => `<tspan x="${r1(x)}" y="${r1(start + index * lineHeight)}">${escape(part)}</tspan>`).join("")}</text>`;
};

const heart = (cx, cy, className) => `<path class="${className}" d="M${cx} ${cy + 10}C${cx - 16} ${cy - 2} ${cx - 12} ${cy - 16} ${cx - 4} ${cy - 12}C${cx - 2} ${cy - 11} ${cx} ${cy - 8} ${cx} ${cy - 8}C${cx} ${cy - 8} ${cx + 2} ${cy - 11} ${cx + 4} ${cy - 12}C${cx + 12} ${cy - 16} ${cx + 16} ${cy - 2} ${cx} ${cy + 10}Z"/>`;

function gear(cx, cy, radius, teeth, depth) {
  const points = [];
  for (let index = 0; index < teeth * 2; index++) {
    const from = (Math.PI * index) / teeth, to = (Math.PI * (index + 1)) / teeth;
    const size = index % 2 ? radius - depth : radius;
    const inset = index % 2 ? 0.02 : 0.1;
    points.push([cx + size * Math.cos(from + inset), cy + size * Math.sin(from + inset)], [cx + size * Math.cos(to - inset), cy + size * Math.sin(to - inset)]);
  }
  return `M${points.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L")}Z`;
}

// FAQ: questions open one at a time, like the accordion below the hero.
export function accordionScene(groups) {
  const rows = groups.slice(0, 3).map((group, index) => {
    const y = 12 + index * 106;
    return `<g class="sc-acc sc-q${index}"><rect class="sc-card sc-acc-head" x="10" y="${y}" width="340" height="48" rx="14"/>${say("sc-t", group, 28, y + 30, "start")}<g class="sc-acc-plus"><circle class="sc-line" cx="322" cy="${y + 24}" r="12"/><path class="sc-sigline" d="M316 ${y + 24}h12M322 ${y + 18}v12"/></g><g class="sc-acc-ans"><rect class="sc-bar" x="28" y="${y + 62}" width="262" height="9" rx="4.5"/><rect class="sc-bar" x="28" y="${y + 78}" width="214" height="9" rx="4.5"/><rect class="sc-bar" x="28" y="${y + 94}" width="150" height="9" rx="4.5"/></g></g>`;
  }).join("");
  return scene("accordion", 360, 330, rows);
}

// Resources: library cards turn over one by one.
export function flipScene(titles) {
  // Two wide columns keep each library name on one line, or two even lines, instead of one word per line.
  const cards = titles.slice(0, 6).map((title, index) => {
    const x = 10 + (index % 2) * 174, y = 12 + Math.floor(index / 2) * 92, width = 166, height = 82;
    const lines = balancedWrap(title, 15, 2);
    const top = y + height / 2 + 5 - ((lines.length - 1) * 20) / 2;
    const name = `<text class="sc-t sc-flip-name" text-anchor="middle">${lines.map((line, row) => `<tspan x="${r1(x + width / 2)}" y="${r1(top + row * 20)}">${escape(line)}</tspan>`).join("")}</text>`;
    return `<g class="sc-flip sc-f${index}"><g class="sc-flip-front"><rect class="sc-card" x="${x}" y="${y}" width="${width}" height="${height}" rx="16"/>${name}</g><g class="sc-flip-back"><rect class="sc-flip-face" x="${x}" y="${y}" width="${width}" height="${height}" rx="16"/>${tick(x + width / 2 - 22, y + height / 2, "sc-flip-tick")}${say("sc-c sc-flip-go", "Open", x + width / 2 + 18, y + height / 2 + 6)}</g></g>`;
  }).join("");
  return scene("flip", 360, 290, cards);
}

// Technology deep dives: signal runs from a core chip out to each topic.
export function circuitScene(topics) {
  const chips = [[20, 26], [244, 26], [20, 222], [244, 222]];
  const traces = ["M130 138H68V78", "M230 138H292V78", "M130 162H68V222", "M230 162H292V222"];
  const pins = (x, y) => `<path class="sc-pins" d="${[18, 38, 58, 78].map(dx => `M${x + dx} ${y - 7}v7M${x + dx} ${y + 52}v7`).join("")}"/>`;
  return scene("circuit", 360, 300, [
    traces.map(d => `<path class="sc-trace" d="${d}"/>`).join(""),
    traces.map((d, index) => `<path class="sc-trace-run sc-c${index}" d="${d}" pathLength="100"/>`).join(""),
    `<rect class="sc-core-chip" x="130" y="120" width="100" height="60" rx="12"/><path class="sc-core-grid" d="M150 136h60M150 150h60M150 164h60"/>`,
    chips.map(([x, y], index) => `<g class="sc-chip sc-c${index}">${pins(x, y)}<rect class="sc-card sc-chip-body" x="${x}" y="${y}" width="96" height="52" rx="10"/>${say("sc-t", topics[index], x + 48, y + 32)}</g>`).join("")
  ].join(""));
}

// Perspectives: a magnifier pauses over the lines worth a second read.
export function lensScene() {
  const rows = [58, 84, 110, 136, 162, 188, 214, 240];
  const widths = [240, 210, 250, 190, 236, 170, 224, 150];
  const marks = [[84, 210], [162, 236], [214, 224]].map(([y, width], index) => `<rect class="sc-mark sc-m${index}" x="54" y="${y - 4}" width="${width + 12}" height="18" rx="9"/>`).join("");
  const bars = rows.map((y, index) => `<rect class="sc-bar" x="60" y="${y}" width="${widths[index]}" height="10" rx="5"/>`).join("");
  return scene("lens", 360, 300, `<rect class="sc-card" x="36" y="24" width="288" height="252" rx="18"/>${marks}${bars}<g class="sc-lens"><circle class="sc-lens-glass" r="40"/><path class="sc-lens-handle" d="M29 29l24 24"/></g>`);
}

// Solutions in practice: scattered problems settle into an ordered outcome.
export function settleScene() {
  const tiles = Array.from({ length: 12 }, (_, index) => `<rect class="sc-settle sc-st${index}" x="${47 + (index % 4) * 70}" y="${64 + Math.floor(index / 4) * 70}" width="56" height="56" rx="12"/>`).join("");
  return scene("settle", 360, 300, `${say("sc-c sc-before", "Challenge", 180, 32)}${say("sc-c sc-after", "Outcome", 180, 32)}${tiles}`);
}

// Professional services: four practices orbit one firm.
export function orbitScene(names) {
  const rx = 104, width = 132;
  const labels = names.slice(0, 4).map((name, index) => {
    const angle = (90 + index * 90) * Math.PI / 180;
    return `<g transform="translate(${r1(rx * Math.cos(angle)) || 0} ${r1(rx * Math.sin(angle)) || 0})"><g class="sc-orbit-up"><g class="sc-orbit-depth sc-o${index}"><g transform="scale(1 2)"><rect class="sc-orbit-card" x="${-width / 2}" y="-20" width="${width}" height="40" rx="20"/>${say("sc-t", name, 0, 6)}</g></g></g></g>`;
  }).join("");
  return scene("practices", 360, 300, `<ellipse class="sc-orbit-track" cx="180" cy="150" rx="${rx}" ry="${rx / 2}"/><circle class="sc-orbit-core" cx="180" cy="150" r="32"/><path class="sc-orbit-bag" d="M166 144h28v20h-28zM173 144v-6h14v6M166 152h28"/><g transform="translate(180 150) scale(1 .5)"><g class="sc-orbit-spin"><circle class="hv-ghost" r="200"/>${labels}</g></g>`);
}

// Trust: plenty is offered, only what is needed passes through.
export function funnelScene() {
  const drops = [[62, 0], [92, 0], [122, 0], [166, 1], [210, 0], [240, 0], [270, 0], [298, 0], [180, 1], [106, 0], [254, 0], [194, 1]];
  return scene("funnel", 360, 316, [
    say("sc-c", "Collected", 180, 22),
    `<path class="sc-funnel" d="M40 72H320L206 186V240H154V186Z"/><path class="sc-mesh" d="M78 110H282"/>`,
    `<g class="sc-drops">${drops.map(([x, keep], index) => `<circle class="sc-drop${keep ? " sc-keep" : ""}" cx="${x}" cy="${36 + (index % 3) * 4}" r="7"/>`).join("")}</g>`,
    `<rect class="sc-card" x="132" y="250" width="96" height="32" rx="10"/>`,
    say("sc-c", "Only what is needed", 180, 306)
  ].join(""));
}

// Trust center: four principles lock together into one shield.
export function shieldScene(principles) {
  const pieces = ["M180 60L90 92V160H180Z", "M180 60L270 92V160H180Z", "M90 160C90 212 128 250 180 270V160Z", "M270 160C270 212 232 250 180 270V160Z"];
  const corners = [[74, 36], [286, 36], [74, 290], [286, 290]];
  return scene("trustmark", 360, 316, [
    `<path class="sc-shield-glow" d="M180 60L270 92V160C270 212 232 250 180 270C128 250 90 212 90 160V92Z"/>`,
    pieces.map((d, index) => `<path class="sc-piece sc-pc${index}" d="${d}"/>`).join(""),
    `<path class="sc-shield-check" d="M150 160l22 22 40-44" pathLength="1"/>`,
    principles.slice(0, 4).map((name, index) => block(`sc-c sc-principle sc-pc${index}`, name, corners[index][0], corners[index][1], 16, 18)).join("")
  ].join(""));
}

// Booking: pick a day, pick a time, booked.
export function calendarScene() {
  const days = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) days.push(`<rect class="sc-day${row === 2 && col === 3 ? " sc-day-pick" : ""}" x="${32 + col * 36}" y="${74 + row * 38}" width="28" height="26" rx="7"/>`);
  const slots = ["9:00 AM", "11:30 AM", "2:00 PM"].map((time, index) => `<g class="sc-slot sc-sl${index}"><rect class="sc-slot-pill" x="230" y="${76 + index * 50}" width="114" height="38" rx="19"/>${say("sc-t", time, 287, 101 + index * 50)}</g>`).join("");
  return scene("calendar", 360, 290, [
    `<rect class="sc-card" x="16" y="20" width="204" height="212" rx="18"/>`,
    say("sc-t", "Pick a day", 32, 52, "start"),
    days.join(""),
    `<rect class="sc-cal-ring" x="137" y="147" width="34" height="32" rx="9"/>`,
    slots,
    `<g class="sc-booked"><rect class="sc-booked-pill" x="230" y="232" width="114" height="40" rx="20"/>${tick(254, 250, "sc-booked-tick")}${say("sc-s", "Booked", 302, 258)}</g>`
  ].join(""));
}

// Copilot readiness: oversharing links retract until access matches the work.
export function accessMapScene() {
  const people = [64, 146, 228], folders = [50, 116, 182, 248];
  const allowed = [[0, 0], [1, 1], [1, 2], [2, 3]], excess = [[0, 2], [0, 3], [1, 3], [2, 0], [2, 1]];
  const link = ([from, to], className) => `<path class="${className}" d="M88 ${people[from]}L268 ${folders[to]}" pathLength="1"/>`;
  return scene("accessmap", 360, 280, [
    say("sc-c", "People", 64, 22), say("sc-c", "Files", 292, 22),
    excess.map((pair, index) => link(pair, `sc-overshare sc-x${index}`)).join(""),
    allowed.map(pair => link(pair, "sc-allowed")).join(""),
    people.map(y => `<circle class="sc-card" cx="64" cy="${y}" r="24"/><circle class="sc-person" cx="64" cy="${y - 6}" r="7"/><path class="sc-person" d="M52 ${y + 14}a12 10 0 0 1 24 0"/>`).join(""),
    folders.map((y, index) => `<path class="sc-folder${index === 2 ? " sc-folder-lock" : ""}" d="M270 ${y - 14}h16l6 6h22v28h-44z"/>`).join("")
  ].join(""));
}

// Identity: one account travels join, move and leave while its access changes.
export function lifecycleScene() {
  const stations = [["Join", 180, 50, 180, 26], ["Move", 266.6, 200, 302, 240], ["Leave", 93.4, 200, 58, 240]];
  return scene("lifecycle", 360, 262, [
    `<circle class="sc-life-track" cx="180" cy="150" r="100"/>`,
    stations.map(([name, x, y, lx, ly], index) => `<g class="sc-station sc-sn${index}"><circle class="sc-station-dot" cx="${x}" cy="${y}" r="9"/>${say("sc-t", name, lx, ly)}</g>`).join(""),
    `<rect class="sc-perm" x="152" y="130" width="56" height="12" rx="6"/><rect class="sc-perm sc-perm-b" x="152" y="148" width="56" height="12" rx="6"/><rect class="sc-perm" x="152" y="166" width="40" height="12" rx="6"/>`,
    `<g class="sc-life-spin"><g class="sc-life-up"><rect class="sc-life-badge" x="158" y="36" width="44" height="28" rx="8"/><circle class="sc-life-face" cx="170" cy="50" r="5"/><path class="sc-life-lines" d="M180 46h13M180 54h9"/></g></g>`
  ].join(""));
}

// Global secure access: users anywhere reach private apps and the web through one edge.
export function globeScene() {
  const users = [[82, 116], [126, 160], [92, 194]];
  const inbound = ["M88 116Q170 108 194 140", "M132 160Q170 156 192 150", "M98 194Q170 198 194 160"];
  const outbound = ["M234 140C242 112 246 94 248 84", "M234 160C242 188 246 204 248 212"];
  return scene("globe", 360, 300, [
    `<circle class="sc-globe" cx="104" cy="150" r="84"/>`,
    `<ellipse class="sc-lat" cx="104" cy="112" rx="75" ry="9"/><ellipse class="sc-lat" cx="104" cy="150" rx="84" ry="11"/><ellipse class="sc-lat" cx="104" cy="188" rx="75" ry="9"/>`,
    [0, 1, 2].map(index => `<ellipse class="sc-meridian sc-mer${index}" cx="104" cy="150" rx="84" ry="84"/>`).join(""),
    [...inbound, ...outbound].map(d => `<path class="sc-lane" d="${d}"/>`).join(""),
    [...inbound, ...outbound].map((d, index) => `<path class="sc-lane-run sc-ln${index}" d="${d}" pathLength="100"/>`).join(""),
    users.map(([x, y]) => `<circle class="sc-user" cx="${x}" cy="${y}" r="6"/>`).join(""),
    `<circle class="sc-edge" cx="214" cy="150" r="22"/><path class="sc-edge-mark" d="M214 138l10 4v7c0 7-4 11-10 13-6-2-10-6-10-13v-7z"/>`,
    `<rect class="sc-card" x="246" y="56" width="98" height="56" rx="14"/>${block("sc-t", "Private apps", 295, 82, 8, 20)}`,
    `<rect class="sc-card" x="246" y="188" width="98" height="48" rx="14"/>${say("sc-t", "Internet", 295, 218)}`
  ].join(""));
}

// Orchestration: one task hands off lane by lane.
export function swimlaneScene(lanes) {
  return scene("swimlane", 360, 286, [
    lanes.slice(0, 4).map((name, index) => `<rect class="sc-lane-row sc-lr${index}" x="12" y="${20 + index * 66}" width="336" height="56" rx="14"/>${say("sc-c", name, 28, 53 + index * 66, "start")}`).join(""),
    `<path class="sc-step-path" d="M162 48H208V114H254V180H300V246"/><path class="sc-step-trail" d="M162 48H208V114H254V180H300V246" pathLength="1"/>`,
    `<g class="sc-task"><rect class="sc-task-card" x="130" y="31" width="64" height="34" rx="10"/>${say("sc-s sc-task-name", "Task", 162, 54)}</g>`
  ].join(""));
}

// MCP servers: the app plugs in, asks, and a tool answers.
export function plugScene(tools) {
  return scene("plug", 360, 290, [
    `<rect class="sc-card" x="16" y="104" width="110" height="72" rx="16"/>${say("sc-t", "AI app", 71, 146)}`,
    `<rect class="sc-card" x="226" y="48" width="118" height="196" rx="16"/>${say("sc-t", "MCP server", 285, 80)}<circle class="sc-status" cx="330" cy="58" r="5"/>`,
    tools.slice(0, 3).map((tool, index) => `<g class="sc-tool sc-tl${index}"><rect class="sc-tool-row" x="240" y="${108 + index * 40}" width="90" height="28" rx="8"/>${say("sc-c", tool, 285, 127 + index * 40)}</g>`).join(""),
    `<rect class="sc-socket" x="214" y="128" width="12" height="24" rx="3"/><path class="sc-cable" d="M126 140H150"/>`,
    `<g class="sc-plug"><path class="sc-cable" d="M146 140H178"/><rect class="sc-plug-body" x="176" y="128" width="20" height="24" rx="5"/><path class="sc-prongs" d="M196 134h8M196 146h8"/></g>`,
    `<circle class="sc-ask" cx="136" cy="140" r="6"/><circle class="sc-answer" cx="208" cy="140" r="6"/>`
  ].join(""));
}

// Modern workplace: teammates move between chat, files, meetings and tasks.
export function boardScene() {
  const tiles = [[16, 16, "Chat"], [188, 16, "Files"], [16, 156, "Meetings"], [188, 156, "Tasks"]];
  const icon = (index, cx, cy) => [
    `<path class="sc-glyph" d="M${cx - 24} ${cy - 16}h48v28h-30l-10 10v-10h-8z"/>`,
    `<path class="sc-glyph" d="M${cx - 16} ${cy - 22}h22l10 10v34h-32zM${cx + 6} ${cy - 22}v10h10"/>`,
    `<path class="sc-glyph" d="M${cx - 24} ${cy - 14}h32v28h-32zM${cx + 8} ${cy - 4}l14-8v24l-14-8"/>`,
    `<path class="sc-glyph" d="M${cx - 10} ${cy - 12}h28M${cx - 10} ${cy}h28M${cx - 10} ${cy + 12}h20M${cx - 22} ${cy - 12}h4M${cx - 22} ${cy}h4M${cx - 22} ${cy + 12}h4"/>`
  ][index];
  return scene("board", 360, 296, [
    tiles.map(([x, y, name], index) => `<rect class="sc-card" x="${x}" y="${y}" width="156" height="124" rx="18"/>${icon(index, x + 66, y + 54)}${say("sc-t", name, x + 20, y + 108, "start")}<circle class="sc-ping sc-pg${index}" cx="${x + 142}" cy="${y + 14}" r="7"/>`).join(""),
    [0, 1, 2].map(index => `<circle class="sc-avatar sc-av${index}" cx="148" cy="116" r="12"/>`).join("")
  ].join(""));
}

// First conversation: sticky notes go up, then the plan gets connected.
export function whiteboardScene(notes) {
  const spots = [[34, 40, -3], [226, 30, 4], [34, 190, 3], [226, 186, -2]];
  const arrows = [["M138 72C170 56 196 56 222 64", 222, 64, 17], ["M280 108C292 140 292 160 280 182", 280, 182, 118], ["M80 118C70 140 70 160 80 186", 80, 186, 69], ["M138 228C170 238 196 238 222 226", 222, 226, -25]];
  return scene("whiteboard", 360, 300, [
    `<rect class="sc-board" x="8" y="8" width="344" height="284" rx="20"/>`,
    arrows.map(([d, x, y, angle], index) => `<path class="sc-draw sc-dw${index}" d="${d}" pathLength="1"/><path class="sc-head sc-dw${index}" d="M-9 -6L0 0L-9 6" transform="translate(${x} ${y}) rotate(${angle})"/>`).join(""),
    spots.map(([x, y, angle], index) => `<g transform="rotate(${angle} ${x + 50} ${y + 37})"><g class="sc-note sc-nt${index}"><rect class="sc-note-paper" x="${x}" y="${y}" width="100" height="74" rx="6"/><rect class="sc-note-tape" x="${x + 36}" y="${y - 6}" width="28" height="12" rx="2"/>${say("sc-note-text", notes[index], x + 50, y + 44)}</g></g>`).join("")
  ].join(""));
}

// Protected knowledge: a search beam lights what you may read and cites one source.
export function shelfScene() {
  const books = [[24, 84], [20, 70], [28, 92], [22, 78], [26, 88], [20, 66], [30, 96], [22, 80], [24, 74], [26, 90]];
  let x = 40;
  const placed = books.map(([width, height]) => { const at = x; x += width + 4; return [at, width, height]; });
  return scene("shelf", 360, 292, [
    `<rect class="sc-beam" x="30" y="38" width="34" height="106" rx="8"/>`,
    `<g class="sc-books">${placed.map(([bx, width, height], index) => `<rect class="sc-book${index === 5 ? " sc-book-pick" : ""}" x="${bx}" y="${142 - height}" width="${width}" height="${height}" rx="3"/>`).join("")}</g>`,
    `<g class="sc-cite"><rect class="sc-cite-pill" x="152" y="20" width="76" height="30" rx="15"/>${say("sc-c sc-cite-text", "Cited", 190, 41)}</g>`,
    `<path class="sc-shelf-line" d="M26 143H334M26 263H334"/>`,
    placed.map(([bx, width, height]) => `<rect class="sc-book-locked" x="${bx}" y="${r1(262 - height * 0.86)}" width="${width}" height="${r1(height * 0.86)}" rx="3"/>`).join(""),
    `<circle class="sc-lock-badge" cx="180" cy="214" r="24"/><path class="sc-lock" d="M170 212h20v16h-20zM174 212v-6a6 6 0 0 1 12 0v6"/>`,
    say("sc-c", "Your access", 334, 166, "end"), say("sc-c", "Restricted", 334, 286, "end")
  ].join(""));
}

// Security scenario: scattered alerts converge into one incident.
export function convergeScene() {
  const dots = [[44, 52], [122, 30], [300, 44], [332, 134], [308, 238], [206, 268], [62, 250], [26, 152], [252, 86]];
  return scene("converge", 360, 300, [
    dots.map(([x, y], index) => `<g class="sc-alert sc-cv${index}"><circle class="sc-alert-dot" cx="${x}" cy="${y}" r="11"/><path class="sc-alert-mark" d="M${x} ${y - 5}v5M${x} ${y + 4}v.5"/></g>`).join(""),
    `<g class="sc-incident"><rect class="sc-incident-card" x="102" y="112" width="156" height="76" rx="18"/>${say("sc-s", "1 incident", 180, 144)}<rect class="sc-bar" x="128" y="160" width="104" height="8" rx="4"/><rect class="sc-incident-sev" x="128" y="160" width="72" height="8" rx="4"/></g>`
  ].join(""));
}

// AI governance insight: the boundary is drawn first, then one approved tool steps inside.
export function boundScene(rules) {
  const glyphs = [
    "M300 92l12 12M298 104a8 8 0 1 1 10-10",
    "M298 160a12 5 0 1 0 24 0a12 5 0 1 0-24 0v14a12 5 0 0 0 24 0v-14",
    "M298 232h24v16h-24zM298 232l12 9 12-9"
  ];
  return scene("bound", 360, 290, [
    say("sc-c", "Approved scope", 142, 40),
    `<rect class="sc-bound-dash" x="24" y="58" width="236" height="212" rx="18"/><rect class="sc-bound-draw" x="24" y="58" width="236" height="212" rx="18" pathLength="1"/>`,
    rules.slice(0, 3).map((rule, index) => `<g class="sc-rule sc-rl${index}">${tick(52, 100 + index * 50)}${say("sc-t", rule, 72, 106 + index * 50, "start")}</g>`).join(""),
    [76, 146, 216].map((y, index) => `<g class="sc-tool-tile sc-tt${index}"><rect class="sc-card" x="284" y="${y}" width="52" height="48" rx="12"/><path class="sc-glyph" d="${glyphs[index]}"/></g>`).join("")
  ].join(""));
}

// AI governance scenario: use cases move across a review board.
export function kanbanScene(columns) {
  const xs = [12, 128, 244];
  return scene("kanban", 360, 300, [
    xs.map((x, index) => `<rect class="sc-col" x="${x}" y="12" width="104" height="276" rx="16"/>${say("sc-t", columns[index], x + 52, 42)}`).join(""),
    [64, 124, 184].map((y, index) => `<g class="sc-kcard sc-kc${index}"><rect class="sc-kcard-body" x="22" y="${y}" width="84" height="48" rx="10"/><rect class="sc-bar" x="32" y="${y + 14}" width="58" height="8" rx="4"/><rect class="sc-bar" x="32" y="${y + 28}" width="38" height="8" rx="4"/></g>`).join("")
  ].join(""));
}

// AI security insight: a scan catches the hidden instruction before anything reaches the agent.
export function injectionScene() {
  const widths = [150, 120, 164, 136, 110, 158, 128, 96];
  return scene("injection", 360, 300, [
    `<rect class="sc-card" x="14" y="14" width="204" height="272" rx="16"/>`,
    `<rect class="sc-inj-row" x="26" y="152" width="184" height="24" rx="8"/>`,
    widths.map((width, index) => `<rect class="${index === 4 ? "sc-inj-bad" : "sc-bar"}" x="34" y="${40 + index * 30}" width="${index === 4 ? 96 : width}" height="9" rx="4.5"/>`).join(""),
    `<path class="sc-inj-strike" d="M30 164.5H134" pathLength="1"/><g class="sc-inj-pill"><rect x="138" y="151" width="74" height="26" rx="13"/>${say("sc-c sc-inj-text", "Blocked", 175, 169)}</g>`,
    `<g class="sc-scan"><rect class="sc-scan-glow" x="14" y="20" width="204" height="14" rx="4"/><rect class="sc-scan-line" x="14" y="32" width="204" height="3" rx="1.5"/></g>`,
    [74, 134, 224].map((y, index) => `<circle class="sc-safe sc-sf${index}" cx="222" cy="${y}" r="6"/>`).join(""),
    `<path class="sc-bot-stalk" d="M296 110V94"/><circle class="sc-bot-led" cx="296" cy="88" r="6"/>`,
    `<rect class="sc-bot-ear" x="249" y="128" width="10" height="24" rx="3"/><rect class="sc-bot-ear" x="333" y="128" width="10" height="24" rx="3"/>`,
    `<rect class="sc-bot-neck" x="288" y="168" width="16" height="12" rx="2"/><rect class="sc-bot-body" x="262" y="178" width="68" height="28" rx="12"/><circle class="sc-bot-chest" cx="296" cy="192" r="4.5"/>`,
    `<rect class="sc-bot-head" x="258" y="108" width="76" height="62" rx="18"/><rect class="sc-bot-visor" x="268" y="119" width="56" height="30" rx="10"/>`,
    `<g class="sc-bot-eyes"><rect class="sc-bot-eye" x="280" y="128" width="9" height="12" rx="3.5"/><rect class="sc-bot-eye" x="303" y="128" width="9" height="12" rx="3.5"/></g>`,
    `<path class="sc-bot-mouth" d="M282 159.5h28"/>${say("sc-t", "Agent", 296, 232)}`
  ].join(""));
}

// 404: the compass wavers, then settles on home.
export function compassScene() {
  const ticks = Array.from({ length: 24 }, (_, index) => {
    const angle = index * 15 * Math.PI / 180, long = index % 6 === 0;
    const inner = long ? 80 : 86;
    return `M${r1(180 + 94 * Math.sin(angle))} ${r1(164 - 94 * Math.cos(angle))}L${r1(180 + inner * Math.sin(angle))} ${r1(164 - inner * Math.cos(angle))}`;
  }).join("");
  return scene("compass", 360, 290, [
    `<rect class="sc-home-ring" x="138" y="10" width="84" height="36" rx="18"/><rect class="sc-home" x="138" y="10" width="84" height="36" rx="18"/>${say("sc-s", "Home", 180, 34)}`,
    `<circle class="sc-card" cx="180" cy="164" r="110"/><circle class="sc-line" cx="180" cy="164" r="94"/><path class="sc-compass-ticks" d="${ticks}"/>`,
    say("sc-c", "E", 250, 170), say("sc-c", "S", 180, 240), say("sc-c", "W", 110, 170),
    `<g class="sc-needle"><path class="sc-needle-n" d="M180 84L194 164H166Z"/><path class="sc-needle-s" d="M166 164H194L180 244Z"/><circle class="sc-needle-hub" cx="180" cy="164" r="8"/></g>`
  ].join(""));
}

// Accounting: entries post on both sides until the ledger balances.
export function ledgerScene() {
  const left = [96, 60, 120, 44], right = [70, 110, 48, 92];
  return scene("ledger", 360, 300, [
    `<rect class="sc-card" x="16" y="14" width="328" height="272" rx="18"/>`,
    say("sc-t", "Debit", 98, 48), say("sc-t", "Credit", 262, 48),
    `<path class="sc-line" d="M180 28V200M32 198H328"/>`,
    left.map((width, index) => `<rect class="sc-entry sc-en${index}" x="36" y="${70 + index * 32}" width="${width}" height="12" rx="6"/>`).join(""),
    right.map((width, index) => `<rect class="sc-entry sc-en${index}" x="200" y="${70 + index * 32}" width="${width}" height="12" rx="6"/>`).join(""),
    `<rect class="sc-total" x="36" y="212" width="124" height="14" rx="7"/><rect class="sc-total sc-total-r" x="200" y="212" width="124" height="14" rx="7"/>`,
    `<g class="sc-balanced"><rect class="sc-balanced-pill" x="108" y="238" width="144" height="36" rx="18"/>${tick(136, 254, "sc-balanced-tick")}${say("sc-s", "Balanced", 196, 262)}</g>`
  ].join(""));
}

// Architecture: the elevation is drafted line by line.
export function blueprintScene() {
  const grid = [];
  for (let x = 12; x <= 348; x += 24) grid.push(`M${x} 12V276`);
  for (let y = 12; y <= 276; y += 24) grid.push(`M12 ${y}H348`);
  const windows = [[152, 88], [188, 88], [152, 118], [188, 118], [152, 148], [188, 148], [74, 164], [106, 164], [74, 200], [106, 200], [238, 164], [270, 164], [238, 200], [270, 200]];
  return scene("blueprint", 360, 300, [
    `<path class="sc-grid" d="${grid.join("")}"/>`,
    `<path class="sc-bp-line" d="M56 252V140H136V68H224V140H304V252Z" pathLength="1"/><path class="sc-bp-line sc-bp-roof" d="M136 68L180 44L224 68M166 252V214H194V252" pathLength="1"/>`,
    `<g class="sc-windows">${windows.map(([x, y]) => `<rect class="sc-win" x="${x}" y="${y}" width="20" height="16" rx="2"/>`).join("")}</g>`,
    `<path class="sc-bp-dim" d="M56 272H304M56 266v12M304 266v12" pathLength="1"/>${say("sc-c sc-bp-label", "30 m", 180, 292)}`
  ].join(""));
}

// Automotive: a gauge sweeps while the connected car keeps signalling.
export function gaugeScene() {
  const ticks = Array.from({ length: 9 }, (_, index) => {
    const angle = Math.PI + (index * Math.PI) / 8, inner = index % 2 ? 102 : 94;
    return `M${r1(180 + 114 * Math.cos(angle))} ${r1(176 + 114 * Math.sin(angle))}L${r1(180 + inner * Math.cos(angle))} ${r1(176 + inner * Math.sin(angle))}`;
  }).join("");
  return scene("gauge", 360, 290, [
    `<path class="sc-g-track" d="M52 176A128 128 0 0 1 308 176"/><path class="sc-g-fill" d="M52 176A128 128 0 0 1 308 176" pathLength="1"/><path class="sc-g-ticks" d="${ticks}"/>`,
    `<g class="sc-g-needle"><path class="sc-g-pointer" d="M180 176L180 84"/><circle class="sc-g-hub" cx="180" cy="176" r="11"/></g>`,
    `<path class="sc-car" d="M138 264v-12l12-16h58l12 16v12z"/><circle class="sc-wheel" cx="156" cy="266" r="8"/><circle class="sc-wheel" cx="202" cy="266" r="8"/>`,
    [0, 1, 2].map(index => `<path class="sc-wave sc-wv${index}" d="M${234 + index * 10} ${236 - index * 6}a${14 + index * 8} ${14 + index * 8} 0 0 1 0 ${20 + index * 12}"/>`).join("")
  ].join(""));
}

// Construction: the crane lifts a block and sets it on the stack.
export function craneScene() {
  const braces = [];
  for (let y = 272; y > 64; y -= 26) braces.push(`M70 ${y}L94 ${y - 26}`);
  return scene("crane", 360, 290, [
    `<path class="sc-ground" d="M16 273H344"/>`,
    `<path class="sc-crane" d="M70 272V56M94 272V56${braces.join("")}M40 48H330M40 64H330M82 56V24M82 24L40 48M82 24L330 48"/><rect class="sc-crane-part" x="36" y="64" width="30" height="22" rx="3"/><rect class="sc-crane-part" x="96" y="64" width="24" height="20" rx="3"/>`,
    `<rect class="sc-pile" x="120" y="242" width="60" height="30" rx="4"/>`,
    `<rect class="sc-block" x="250" y="242" width="60" height="30" rx="4"/><rect class="sc-block" x="250" y="212" width="60" height="30" rx="4"/><rect class="sc-block sc-block-new" x="250" y="182" width="60" height="30" rx="4"/>`,
    `<g class="sc-hoist"><rect class="sc-trolley" x="138" y="62" width="24" height="8" rx="2"/><rect class="sc-cable-line" x="149" y="70" width="2" height="40"/><rect class="sc-load" x="120" y="110" width="60" height="30" rx="4"/></g>`
  ].join(""));
}

// Education: pages turn under a mortarboard.
export function bookScene() {
  const leftPage = "M180 96C150 84 92 82 36 94V246C92 234 150 236 180 248Z";
  const rightPage = "M180 96C210 84 268 82 324 94V246C268 234 210 236 180 248Z";
  const lines = start => Array.from({ length: 6 }, (_, index) => `M${start} ${122 + index * 20}h${index % 3 === 2 ? 70 : 100}`).join("");
  const leaf = index => `<g class="sc-leaf sc-lf${index}"><path class="sc-leaf-paper" d="${rightPage}"/><path class="sc-page-lines" d="${lines(202)}"/></g>`;
  return scene("book", 360, 270, [
    `<g class="sc-cap"><path class="sc-cap-top" d="M140 44L180 26L220 44L180 62Z"/><path class="sc-cap-band" d="M156 52v12c0 8 48 8 48 0v-12M214 47v18"/></g>`,
    `<path class="sc-page" d="${leftPage}"/><path class="sc-page" d="${rightPage}"/><path class="sc-page-lines" d="${lines(58)}${lines(202)}"/>`,
    leaf(0), leaf(1),
    `<path class="sc-spine" d="M180 96V248"/>`
  ].join(""));
}

// Energy: turbines turn and power flows to the building.
export function turbineScene() {
  const blades = (cx, cy, d) => [0, 120, 240].map(angle => `<path class="sc-blade" d="${d}" transform="rotate(${angle} ${cx} ${cy})"/>`).join("");
  return scene("turbine", 360, 290, [
    `<path class="sc-ground" d="M16 273H344"/>`,
    `<path class="sc-tower-body" d="M106 272L113 118H119L126 272ZM235 272L238 156H242L245 272Z"/>`,
    `<path class="sc-wire" d="M126 220C170 204 220 206 262 226"/><path class="sc-wire-run" d="M126 220C170 204 220 206 262 226" pathLength="100"/>`,
    `<g class="sc-blades">${blades(116, 112, "M116 112C121 94 121 66 116 36C111 66 111 94 116 112Z")}</g><circle class="sc-hub" cx="116" cy="112" r="8"/>`,
    `<g class="sc-blades sc-blades-small">${blades(240, 150, "M240 150C244 138 244 122 240 106C236 122 236 138 240 150Z")}</g><circle class="sc-hub" cx="240" cy="150" r="6"/>`,
    `<rect class="sc-card" x="262" y="196" width="76" height="76" rx="8"/><g class="sc-bwins">${[[276, 212], [308, 212], [276, 240], [308, 240]].map(([x, y]) => `<rect class="sc-bwin" x="${x}" y="${y}" width="16" height="14" rx="2"/>`).join("")}</g>`
  ].join(""));
}

// Financial services: candles print, the trend draws, and the portfolio stays protected.
export function candlesScene() {
  const data = [[200, 170, 160, 214], [170, 186, 160, 196], [186, 150, 138, 196], [150, 128, 116, 160], [128, 146, 120, 156], [146, 108, 96, 152], [108, 84, 70, 118]];
  const candles = data.map(([open, close, high, low], index) => {
    const x = 56 + index * 42, up = close < open;
    return `<g class="sc-candle sc-k${index}"><path class="sc-wick${up ? " sc-up" : " sc-down"}" d="M${x} ${high}V${low}"/><rect class="${up ? "sc-body-up" : "sc-body-down"}" x="${x - 9}" y="${Math.min(open, close)}" width="18" height="${Math.abs(open - close)}" rx="3"/></g>`;
  }).join("");
  return scene("candles", 360, 280, [
    `<path class="sc-axis" d="M28 40V256H332"/>`,
    candles,
    `<path class="sc-trend" d="M56 170L98 186L140 150L182 128L224 146L266 108L308 84" pathLength="1"/>`,
    `<g class="sc-fin-shield"><path class="sc-fin-shield-body" d="M66 40l22 8v16c0 14-9 22-22 27-13-5-22-13-22-27v-16z"/>${tick(66, 64, "sc-fin-tick")}</g>`
  ].join(""));
}

// Government: columns rise, the roof sets, and the seal is stamped.
export function capitolScene() {
  return scene("capitol", 360, 280, [
    `<rect class="sc-step" x="52" y="250" width="256" height="14" rx="3"/><rect class="sc-step" x="66" y="238" width="228" height="12" rx="3"/>`,
    Array.from({ length: 6 }, (_, index) => `<rect class="sc-column sc-cl${index}" x="${86 + index * 38}" y="148" width="14" height="90" rx="2"/>`).join(""),
    `<g class="sc-roof"><rect class="sc-step" x="70" y="134" width="220" height="14" rx="3"/><path class="sc-pediment" d="M70 134L180 84L290 134Z"/><path class="sc-pole" d="M180 84V30"/><path class="sc-flag" d="M180 30h40l-8 10 8 10h-40z"/></g>`,
    `<g class="sc-seal"><circle class="sc-seal-ring" cx="302" cy="62" r="26"/>${tick(302, 60, "sc-seal-tick")}</g>`
  ].join(""));
}

// Healthcare: a steady heartbeat on the monitor.
export function ecgScene() {
  const beat = start => `H${start}l8-8 8 8h14l8-56 10 96 8-40h22l10-12 10 12`;
  const d = `M28 140${beat(80)}${beat(188)}H332`;
  const grid = [];
  for (let x = 44; x < 344; x += 32) grid.push(`M${x} 42V222`);
  for (let y = 62; y < 226; y += 32) grid.push(`M20 ${y}H340`);
  return scene("ecg", 360, 270, [
    `<rect class="sc-monitor" x="16" y="30" width="328" height="196" rx="18"/><path class="sc-grid" d="${grid.join("")}"/>`,
    `<path class="sc-ecg-base" d="${d}"/><path class="sc-ecg-run" d="${d}" pathLength="1"/>`,
    say("sc-t", "72 bpm", 36, 66, "start"),
    `<g class="sc-heart">${heart(304, 58, "sc-heart-shape")}</g>`,
    `<path class="sc-stand" d="M164 226V252M196 226V252M132 256H228"/>`
  ].join(""));
}

// Legal: the scales weigh both sides, then settle level.
export function scalesScene() {
  return scene("scales", 360, 280, [
    `<path class="sc-post" d="M180 262V78M130 264H230"/><circle class="sc-finial" cx="180" cy="70" r="7"/>`,
    `<g class="sc-pan-l"><path class="sc-string" d="M80 80L58 150M80 80L102 150"/><rect class="sc-doc" x="70" y="128" width="20" height="22" rx="2"/><path class="sc-pan" d="M48 150Q80 180 112 150Z"/></g>`,
    `<g class="sc-pan-r"><path class="sc-string" d="M280 80L258 150M280 80L302 150"/><path class="sc-doc" d="M280 126l10 4v7c0 7-4 11-10 13-6-2-10-6-10-13v-7z"/><path class="sc-pan" d="M248 150Q280 180 312 150Z"/></g>`,
    `<g class="sc-balance"><path class="sc-beam-bar" d="M80 80H280"/><circle class="sc-finial" cx="180" cy="80" r="6"/></g>`
  ].join(""));
}

// Manufacturing: meshing gears drive the line.
export function gearsScene() {
  return scene("gears", 360, 280, [
    `<g class="sc-gear-a"><path class="sc-gear" d="${gear(118, 98, 64, 12, 9)}"/><circle class="sc-gear-hole" cx="118" cy="98" r="16"/></g>`,
    `<g class="sc-gear-b"><path class="sc-gear sc-gear-alt" d="${gear(197.5, 153.6, 42, 8, 9)}"/><circle class="sc-gear-hole" cx="197.5" cy="153.6" r="11"/></g>`,
    `<rect class="sc-belt" x="16" y="240" width="328" height="26" rx="13"/><path class="sc-belt-dash" d="M30 253H330"/>`,
    [0, 1, 2].map(index => `<rect class="sc-box sc-bx${index}" x="20" y="214" width="30" height="24" rx="4"/>`).join("")
  ].join(""));
}

// Media: an equalizer bounces over a moving film strip.
export function equalizerScene() {
  const heights = [60, 96, 130, 84, 110, 150, 100, 124, 70, 104, 56];
  const holes = [];
  for (let x = -64; x < 424; x += 32) holes.push(`M${x + 10} 216h12v8h-12zM${x + 10} 252h12v8h-12z`);
  const frames = [];
  for (let x = -64; x < 424; x += 64) frames.push(`<rect class="sc-frame" x="${x + 6}" y="228" width="52" height="20" rx="3"/>`);
  return scene("equalizer", 360, 280, [
    `<g class="sc-eq">${heights.map((height, index) => `<rect class="sc-eq-bar" x="${34 + index * 27}" y="${190 - height}" width="16" height="${height}" rx="4"/>`).join("")}</g>`,
    `<g class="sc-film"><rect class="sc-film-strip" x="-64" y="210" width="488" height="56"/><path class="sc-film-holes" d="${holes.join("")}"/>${frames.join("")}</g>`
  ].join(""));
}

// Nonprofits: every gift fills the jar a little more.
export function jarScene() {
  const jar = "M112 90H248V106C272 118 284 140 284 170V248C284 266 270 278 252 278H108C90 278 76 266 76 248V170C76 140 88 118 112 106Z";
  return scene("jar", 360, 290, [
    `<clipPath id="sc-jar-clip"><path d="${jar}"/></clipPath>`,
    `<g clip-path="url(#sc-jar-clip)"><rect class="sc-jar-fill" x="76" y="150" width="208" height="128"/></g>`,
    `<path class="sc-jar" d="${jar}"/><rect class="sc-jar-rim" x="104" y="80" width="152" height="12" rx="6"/>`,
    [150, 180, 210].map((x, index) => `<g class="sc-gift sc-gf${index}">${heart(x, 30, "sc-gift-heart")}</g>`).join("")
  ].join(""));
}

// Retail: the scanner reads the code and the item lands in the bag.
export function barcodeScene() {
  const pattern = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 1, 3];
  const bars = [];
  let x = 80;
  for (const width of pattern) { if (x + width * 3 > 280) break; bars.push(`<rect class="sc-code" x="${x}" y="64" width="${width * 3}" height="96"/>`); x += width * 3 + 4; }
  return scene("barcode", 360, 292, [
    `<rect class="sc-card" x="56" y="40" width="248" height="150" rx="14"/>${bars.join("")}${say("sc-c", "4 006381 333931", 180, 180)}`,
    `<g class="sc-laser"><rect class="sc-laser-glow" x="64" y="54" width="232" height="14" rx="7"/><rect class="sc-laser-line" x="64" y="60" width="232" height="3" rx="1.5"/></g>`,
    `<g class="sc-paid"><circle class="sc-paid-dot" cx="300" cy="44" r="18"/>${tick(300, 42, "sc-paid-tick")}</g>`,
    `<rect class="sc-tag" x="170" y="192" width="20" height="16" rx="3"/>`,
    `<g class="sc-bag"><path class="sc-bag-body" d="M146 222H214L220 286H140Z"/><path class="sc-bag-handle" d="M164 222V212C164 200 196 200 196 212V222"/></g>`
  ].join(""));
}

// Staffing: candidates are reviewed and the right one docks with the role.
export function matchScene() {
  const colours = ["sc-cand-a", "sc-cand-b", "sc-cand-c"];
  return scene("match", 360, 290, [
    `<rect class="sc-card" x="212" y="84" width="132" height="132" rx="16"/><circle class="sc-slot-avatar" cx="278" cy="122" r="18"/><circle class="sc-match-ring" cx="278" cy="122" r="26" pathLength="1"/>`,
    say("sc-t sc-role", "Open role", 278, 170), say("sc-t sc-matched", "92% match", 278, 170),
    `<rect class="sc-bar" x="240" y="186" width="76" height="8" rx="4"/>`,
    [30, 120, 210].map((y, index) => `<g class="sc-cand sc-cd${index}"><rect class="sc-card sc-cand-card" x="16" y="${y}" width="128" height="64" rx="14"/><circle class="${colours[index]}" cx="46" cy="${y + 32}" r="16"/><rect class="sc-bar" x="70" y="${y + 22}" width="56" height="8" rx="4"/><rect class="sc-bar" x="70" y="${y + 36}" width="38" height="8" rx="4"/></g>`).join("")
  ].join(""));
}

// Startups: lift-off, with stars streaking past.
export function rocketScene() {
  const stars = [[40, 10], [92, 120], [132, 40], [240, 70], [284, 150], [318, 20], [60, 200], [300, 230], [210, 180], [24, 90], [336, 110], [150, 250], [260, 12], [110, 170]];
  return scene("rocket", 360, 290, [
    `<g class="sc-stars">${stars.map(([x, y]) => `<path class="sc-star" d="M${x} ${y}v16"/>`).join("")}</g>`,
    `<g class="sc-rocket"><g class="sc-flame"><path class="sc-flame-out" d="M166 182Q180 244 194 182Z"/><path class="sc-flame-in" d="M173 182Q180 218 187 182Z"/></g><path class="sc-fin" d="M156 146L134 186L158 178ZM204 146L226 186L202 178Z"/><path class="sc-hull" d="M180 46C202 70 208 110 206 170H154C152 110 158 70 180 46Z"/><circle class="sc-window" cx="180" cy="110" r="12"/><rect class="sc-nozzle" x="164" y="170" width="32" height="12" rx="3"/></g>`,
    `<g class="sc-puffs">${[[120, 276, 22], [160, 282, 18], [200, 280, 24], [242, 278, 18]].map(([x, y, radius]) => `<circle class="sc-puff" cx="${x}" cy="${y}" r="${radius}"/>`).join("")}</g>`
  ].join(""));
}

// Telecommunications: the mast broadcasts and devices light up as the signal arrives.
export function towerScene() {
  const leg = (y, side) => r1(180 + side * 34 * (y - 70) / 202);
  const braces = [110, 150, 190, 230].map((y, index, all) => {
    const next = all[index + 1] || 272;
    return `M${leg(y, -1)} ${y}H${leg(y, 1)}M${leg(y, -1)} ${y}L${leg(next, 1)} ${next}`;
  }).join("");
  const devices = [`<rect class="sc-device sc-dv0" x="42" y="98" width="28" height="46" rx="6"/>`, `<rect class="sc-device sc-dv1" x="292" y="88" width="28" height="46" rx="6"/>`, `<path class="sc-device sc-dv2" d="M276 206h48v30h-48zM268 242h64"/>`, `<rect class="sc-device sc-dv3" x="36" y="208" width="42" height="32" rx="5"/>`].join("");
  return scene("tower", 360, 290, [
    `<path class="sc-ground" d="M16 273H344"/>`,
    [0, 1, 2].map(index => `<g class="sc-signal sc-sg${index}"><path class="sc-signal-arc" d="M199.8 20.2A28 28 0 0 1 199.8 59.8M160.2 20.2A28 28 0 0 0 160.2 59.8"/></g>`).join(""),
    `<path class="sc-mast" d="M180 70L146 272M180 70L214 272M180 70V44${braces}"/><circle class="sc-antenna" cx="180" cy="40" r="6"/>`,
    devices
  ].join(""));
}

// Transportation: the truck runs its route and each checkpoint signs off.
export function truckScene() {
  const checkpoints = [[170, 70], [300, 150], [180, 230]];
  return scene("truck", 360, 290, [
    `<path class="sc-route" d="M40 70H300V230H60"/>`,
    `<path class="sc-depot" d="M24 76V60l16-12 16 12v16zM44 236V220l16-12 16 12v16z"/>`,
    checkpoints.map(([x, y], index) => `<circle class="sc-cp sc-cp${index}" cx="${x}" cy="${y}" r="10"/>`).join(""),
    say("sc-c sc-delivered", "Delivered", 60, 268),
    `<g class="sc-truck"><rect class="sc-cargo" x="-22" y="-14" width="28" height="20" rx="3"/><path class="sc-cab" d="M6-8h9l7 7v7H6z"/><circle class="sc-wheel" cx="-12" cy="8" r="4"/><circle class="sc-wheel" cx="14" cy="8" r="4"/></g>`
  ].join(""));
}

// Travel: a flight arcs from departure to arrival.
export function planeScene() {
  const arc = "M60 230A121.4 121.4 0 1 1 300 230";
  return scene("plane", 360, 280, [
    `<g class="sc-clouds"><path class="sc-cloud" d="M38 96a14 14 0 0 1 26-6a12 12 0 0 1 20 10H38z"/><path class="sc-cloud" d="M260 58a14 14 0 0 1 26-6a12 12 0 0 1 20 10H260z"/></g>`,
    `<path class="sc-arc-dots" d="${arc}"/><path class="sc-arc-run" d="${arc}" pathLength="1"/>`,
    `<circle class="sc-pin-ring sc-pin-a" cx="60" cy="230" r="10"/><circle class="sc-pin" cx="60" cy="230" r="8"/><circle class="sc-pin-ring sc-pin-b" cx="300" cy="230" r="10"/><circle class="sc-pin" cx="300" cy="230" r="8"/>`,
    say("sc-c", "Depart", 60, 264), say("sc-c", "Arrive", 300, 264),
    `<g class="sc-flight"><g transform="translate(60 230) rotate(-98.8)"><path class="sc-plane" d="M18 0L-10-3.5L-10 3.5ZM5 0L-5-17H-10L-6 0L-10 17H-5ZM-8 0L-15-8H-18L-16 0L-18 8H-15Z"/></g></g>`
  ].join(""));
}

const industryScenes = {
  "industry-accounting-advisory.html": ledgerScene,
  "industry-architecture-engineering.html": blueprintScene,
  "industry-automotive-mobility.html": gaugeScene,
  "industry-construction-real-estate.html": craneScene,
  "industry-education.html": bookScene,
  "industry-energy-resources.html": turbineScene,
  "industry-financial-services.html": candlesScene,
  "industry-government.html": capitolScene,
  "industry-healthcare-life-sciences.html": ecgScene,
  "industry-legal.html": scalesScene,
  "industry-manufacturing.html": gearsScene,
  "industry-media-entertainment.html": equalizerScene,
  "industry-nonprofits.html": jarScene,
  "industry-retail-consumer-goods.html": barcodeScene,
  "industry-staffing-recruitment.html": matchScene,
  "industry-startups.html": rocketScene,
  "industry-telecommunications.html": towerScene,
  "industry-transportation-logistics.html": truckScene,
  "industry-travel-hospitality.html": planeScene
};

const pageScenes = {
  "faq.html": () => accordionScene(["Working together", "Proving business value", "Operating AI responsibly"]),
  "resources.html": html => {
    const titles = [...html.matchAll(/<span class="resource-tile-title">([\s\S]*?)<\/span>/g)].map(match => match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim());
    return flipScene(titles.length >= 6 ? titles : ["Engagement options", "Frequently asked questions", "Service briefs", "Perspectives", "Solutions in practice", "Technology deep dives"]);
  },
  "technology-deep-dives.html": () => circuitScene(["AI agents", "Grounding", "Evaluation", "MCP"]),
  "perspectives.html": () => lensScene(),
  "solutions-in-practice.html": () => settleScene(),
  "industry-professional-services.html": () => orbitScene(["Legal", "Accounting", "Architecture", "Staffing"]),
  "trust.html": () => funnelScene(),
  "trust-center.html": () => shieldScene(["Purpose-led data handling", "Least privilege access", "Responsible AI use", "Clear handover"]),
  "booking.html": () => calendarScene(),
  "insight-copilot-readiness.html": () => accessMapScene(),
  "insight-identity-security.html": () => lifecycleScene(),
  "insight-global-secure-access.html": () => globeScene(),
  "deep-dive-orchestration.html": () => swimlaneScene(["Planner", "Retriever", "Reviewer", "Publish"]),
  "deep-dive-mcp-servers.html": () => plugScene(["Search", "Inventory", "Update"]),
  "deep-dive-modern-workplace.html": () => boardScene(),
  "deep-dive-first-conversation.html": () => whiteboardScene(["Today", "Systems", "Goals", "Next step"]),
  "scenario-data-ai.html": () => shelfScene(),
  "scenario-security.html": () => convergeScene(),
  "insight-ai-governance.html": () => boundScene(["Purpose", "Permissions", "Evaluation"]),
  "scenario-ai-governance.html": () => kanbanScene(["Proposed", "Reviewed", "Live"]),
  "insight-ai-security.html": () => injectionScene(),
  ...industryScenes
};

export const scenePages = Object.keys(pageScenes);

export function sceneFor(page, html) {
  return pageScenes[page] ? pageScenes[page](html) : "";
}
