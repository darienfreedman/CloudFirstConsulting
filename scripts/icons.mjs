import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const icons = require("@fluentui/react-icons");
const names = {
  security: "ShieldCheckmark24Regular", "ai-security": "ShieldLock24Regular",
  governance: "ClipboardTask24Regular", ai: "BrainCircuit24Regular", cloud: "Cloud24Regular",
  identity: "PersonKey24Regular", endpoints: "Laptop24Regular", data: "Database24Regular",
  processes: "Flow24Regular", adoption: "PeopleTeam24Regular",
  modernization: "ArrowSync24Regular", operations: "ChartMultiple24Regular",
  "financial-services": "BuildingBank24Regular", "healthcare-life-sciences": "HeartPulse24Regular",
  manufacturing: "BuildingFactory24Regular", "retail-consumer-goods": "ShoppingBag24Regular",
  government: "BuildingGovernment24Regular", education: "HatGraduation24Regular",
  "energy-resources": "LeafOne24Regular", telecommunications: "Wifi124Regular",
  "media-entertainment": "Video24Regular", "automotive-mobility": "VehicleCar24Regular",
  "accounting-advisory": "Calculator24Regular", "architecture-engineering": "DesignIdeas24Regular",
  "staffing-recruitment": "PeopleSearch24Regular", "travel-hospitality": "Airplane24Regular",
  "construction-real-estate": "Building24Regular", nonprofits: "Heart24Regular",
  "transportation-logistics": "VehicleTruck24Regular", legal: "Scales24Regular", startups: "Rocket24Regular"
};
const cache = new Map();

export function renderIcon(name) {
  if (cache.has(name)) return cache.get(name);
  const component = icons[names[name]];
  if (!component) throw new Error(`No Fluent icon configured for ${name}.`);
  const svg = renderToStaticMarkup(React.createElement(component, { "aria-hidden": true, focusable: false }));
  const html = `<span class="capability-icon" data-icon="${name}">${svg}</span>`;
  cache.set(name, html);
  return html;
}

export function replaceIcons(html) {
  // Remove generated label rows first so rebuilding never nests them.
  return html.replace(/<div class="icon-label">([\s\S]*?<p class="(?:eyebrow|card-kicker)">[^<]*<\/p>)<\/div>/g, "$1")
    .replace(/<!-- icon:([a-z-]+) -->|<span class="capability-icon" data-icon="([a-z-]+)">[\s\S]*?<\/span>/g, (_, marker, existing) => renderIcon(marker || existing))
    .replace(/(<span class="capability-icon"[^>]*>(?:(?!<\/span>)[\s\S])*<\/span>)\s*(<p class="(?:eyebrow|card-kicker)">[\s\S]*?<\/p>)/g, '<div class="icon-label">$1$2</div>');
}
