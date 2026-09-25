import { escapeHtml } from "./html.mjs";

export const serviceAreas = Object.freeze([
  Object.freeze({ key: "security", label: "Security", href: "security.html", cta: "Explore Security" }),
  Object.freeze({ key: "business", label: "AI Business Solutions", href: "ai-business.html", cta: "Explore AI Business Solutions" }),
  Object.freeze({ key: "cloud", label: "Cloud & AI", href: "cloud-platforms.html", cta: "Explore Cloud & AI" })
]);
export const serviceAreaByKey = Object.freeze(Object.fromEntries(serviceAreas.map(area => [area.key, area])));

// Apply only to display text. Route names and stored service identifiers stay unchanged.
export function standardizeServiceNames(text, { html = false } = {}) {
  const label = key => html ? escapeHtml(serviceAreaByKey[key].label) : serviceAreaByKey[key].label;
  return text
    .replace(/\bAI\s+(?:&(?:amp;)?|and)\s+work\b/gi, label("business"))
    .replace(/\bAI business(?: solutions)? services\b/gi, label("business"))
    .replace(/\bAI business solutions\b/gi, label("business"))
    .replace(/\bcloud,\s*data,\s*and AI platforms\b/gi, label("cloud"))
    .replace(/\bcloud\s+(?:and|&(?:amp;)?)\s+AI(?:\s+platforms)?(?:\s+services)?\b/gi, label("cloud"))
    .replace(/\bcloud\s+&(?:amp;)?\s+data\b/gi, label("cloud"))
    .replace(/\bExplore security services\b/gi, serviceAreaByKey.security.cta)
    .replace(/\bExplore security\b/gi, serviceAreaByKey.security.cta)
    .replace(/\bExplore (AI Business Solutions|Cloud (?:&|&amp;) AI)\b/gi, (_, name) => `Explore ${name}`);
}
