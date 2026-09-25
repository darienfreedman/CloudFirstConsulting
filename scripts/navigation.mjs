import { readFile, readdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicCopy } from "./public-copy.mjs";
import { contentPolicy, readSettings, writeSettings } from "./integrations.mjs";
import { serviceBlueprint, servicePhoto } from "./product-visuals.mjs";
import { syncHeroVisual, syncSignalMap, withSceneStyles } from "./hero-visuals.mjs";
import { compassScene } from "./scene-visuals.mjs";
import { syncPracticeVisuals } from "./service-visuals.mjs";
import { syncSearchIndex } from "./search-index.mjs";
import { escapeHtml as escape } from "../shared/html.mjs";
import { replaceIcons } from "./icons.mjs";
import { linkProductNames, products, renderProductGuide, syncHomepageProducts } from "./products.mjs";
import { industryGroups } from "../shared/industry-groups.mjs";
import { migratedTechnologyFragment, technologyTopicIds, technologyTopics } from "../shared/resource-topics.mjs";
import { expandAcronyms } from "./acronyms.mjs";
import { renderFrameworkGuide } from "./frameworks.mjs";
import { syncEditorialDesign } from "./editorial.mjs";
import { serviceAreaByKey } from "../shared/services.mjs";
import { syncMobileSummaries } from "./mobile-summaries.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const acronyms = new Set(["AI", "IT", "PDF", "HTML", "DLP", "XDR", "SIEM", "SOC", "MCP", "CRM", "ERP", "API", "ISO", "FAQ", "CSP", "ID", "BI", "SQL", "URL", "GPT", "IP", "VPN", "SASE", "SSE", "ZTNA", "SWG", "MITRE", "ATT", "CK"]);
const industries = JSON.parse(readFileSync(new URL("../content/industries.json", import.meta.url), "utf8")).sort((a, b) => a.name.localeCompare(b.name));

export const serviceMenuGroups = [
  { key: "security", title: serviceAreaByKey.security.label, href: serviceAreaByKey.security.href, cta: serviceAreaByKey.security.cta, links: [
    ["security.html#ai-security", "AI Security"],
    ["security.html#ai-governance", "AI Governance"],
    ["security.html#threat-protection", "Threat protection"],
    ["security.html#identity", "Identity and access"],
    ["security.html#secure-access", "Secure network access"],
    ["security.html#endpoints", "Endpoint security and management"],
    ["security.html#data-security", "Data security and compliance readiness"],
    ["security.html#cloud-security", "Cloud security"]
  ] },
  { key: "business", title: serviceAreaByKey.business.label, href: serviceAreaByKey.business.href, cta: serviceAreaByKey.business.cta, links: [
    ["ai-business.html#modern-work", "Modern work and productivity"],
    ["ai-business.html#copilot", "Copilot readiness and enablement"],
    ["ai-business.html#processes", "Business process transformation"],
    ["ai-business.html#custom-ai", "Custom AI solutions"],
    ["ai-business.html#adoption", "Adoption and value realization"]
  ] },
  { key: "cloud", title: serviceAreaByKey.cloud.label, href: serviceAreaByKey.cloud.href, cta: serviceAreaByKey.cloud.cta, links: [
    ["cloud-platforms.html#landing-zones", "Cloud foundations"],
    ["cloud-platforms.html#modernization", "Application and infrastructure modernization"],
    ["cloud-platforms.html#data-platforms", "Governed data and analytics"],
    ["cloud-platforms.html#ai-platforms", "AI application platforms"],
    ["cloud-platforms.html#operations", "Reliability, operations and cloud financial management"]
  ] }
];

export function syncServiceNavigation(html, page) {
  if (page === "services.html") {
    for (const group of serviceMenuGroups) {
      const pattern = new RegExp(`<nav data-service-group="${group.key}"[^>]*>[\\s\\S]*?</nav>`);
      if (!pattern.test(html)) throw new Error(`Missing ${group.key} service directory navigation.`);
      const links = group.links.map(([href, title]) => `<a href="${escape(href)}">${escape(title)} <span aria-hidden="true">&#8599;</span></a>`).join("");
      html = html.replace(pattern, `<nav data-service-group="${group.key}" aria-label="${escape(group.title)} service details">${links}</nav>`);
    }
    return html;
  }
  const group = serviceMenuGroups.find(group => group.href === page);
  if (!group) return html;
  const navigation = /(<nav class="practice-nav"[^>]*>)[\s\S]*?<\/nav>/;
  if (!navigation.test(html)) throw new Error(`Missing capability navigation in ${page}.`);
  const links = group.links.map(([href, title]) => `<a href="#${href.split("#")[1]}">${escape(title)}</a>`).join("");
  html = html.replace(navigation, (_, open) => `${open}${links}</nav>`);
  for (const [href, title] of group.links) {
    const id = href.split("#")[1];
    const section = new RegExp(`<section class="practice" id="${id}"[^>]*>[\\s\\S]*?</section>`);
    if (!section.test(html)) throw new Error(`Missing capability ${href}.`);
    html = html.replace(section, content => {
      const label = /(<p class="eyebrow">)[^<]*<\/p>/;
      if (!label.test(content)) throw new Error(`Missing capability label for ${href}.`);
      return content.replace(label, (_, open) => `${open}${escape(title)}</p>`);
    });
  }
  return html;
}

export const perspectiveLinks = [
  ["insight-copilot-readiness.html", "Copilot and data readiness"],
  ["insight-identity-security.html", "Identity modernization"],
  ["insight-ai-governance.html", "AI Governance"],
  ["insight-ai-security.html", "AI Security"],
  ["insight-compliance-readiness.html", "Compliance readiness"],
  ["insight-global-secure-access.html", "Global Secure Access"]
].sort((a, b) => a[1].localeCompare(b[1], "en", { sensitivity: "base" }));

export const resourceMenuGroups = [
  { id: "plan-your-project", title: "Planning", href: "resources.html#plan-your-project", description: "Choose an engagement, review service scope, and prepare for a useful first conversation.", links: [
    ["engagements.html", "Engagement options"],
    ["briefs.html", "Service briefs"],
    ["faq.html", "Frequently asked questions"]
  ] },
  { id: "insights", title: "Insights", href: "resources.html#insights", description: "Explore strategic perspectives, practical solution examples, and technology deep dives.", links: [
    ["perspectives.html", "Perspectives"],
    ["solutions-in-practice.html", "Solutions in practice"],
    ["technology-deep-dives.html", "Technology deep dives"]
  ] },
  { id: "guidance", title: "Guidance", href: "resources.html#guidance", description: "Understand the technology, compare product capabilities, and review delivery and privacy guidance.", links: [
    ["sources.html", "Products explained"],
    ["trust-center.html", "Security and privacy"],
    ["trust.html", "Website privacy"]
  ] }
].map(group => ({
  ...group,
  links: [...group.links].sort((a, b) => a[1].localeCompare(b[1], "en", { sensitivity: "base" }))
}));

export function syncResourceBreadcrumbs(html, page) {
  const isBrief = /^brief-/.test(page);
  const isScenario = /^scenario-/.test(page);
  const perspective = perspectiveLinks.find(([href]) => href === page);
  const deepDive = technologyTopics.find(topic => `deep-dive-${topic.id}.html` === page);
  const parent = isBrief ? "briefs.html" : isScenario || perspective || deepDive ? "insights.html" : page;
  const group = resourceMenuGroups.find(group => (parent === "insights.html" && group.id === "insights") || group.href === parent || group.links.some(([href]) => href === parent));
  if (page !== "resources.html" && !group) return html;
  const pattern = /<nav class="breadcrumbs"[^>]*>[\s\S]*?<\/nav>/;
  const existing = html.match(pattern)?.[0];
  if (!existing) throw new Error(`Missing resource breadcrumbs: ${page}`);
  const ancestors = [["index.html", "Home"]];
  let current = "Resources";
  if (page !== "resources.html") {
    ancestors.push(["resources.html", "Resources"]);
    if (page !== "insights.html") ancestors.push([group.href, group.title]);
    if (deepDive) {
      ancestors.push(["technology-deep-dives.html", "Technology deep dives"]);
      current = escape(deepDive.name);
    } else if (perspective) {
      ancestors.push(["perspectives.html", "Perspectives"]);
      current = escape(perspective[1]);
    } else if (isBrief || isScenario) {
      ancestors.push([isBrief ? parent : "solutions-in-practice.html", isBrief ? "Service briefs" : "Solutions in practice"]);
      current = existing.match(/<span aria-current="page">([^<]+)<\/span>/)?.[1];
      if (!current) throw new Error(`Missing resource breadcrumb label: ${page}`);
    } else {
      current = escape(page === "briefs.html" ? "Service briefs" : page === "insights.html" ? "Insights" : group.links.find(([href]) => href === page)[1]);
    }
  }
  const separator = '<span aria-hidden="true">/</span>';
  const links = ancestors.map(([href, title]) => `<a href="${escape(href)}">${escape(title)}</a>`);
  return html.replace(pattern, `<nav class="breadcrumbs" aria-label="Breadcrumb">${links.join(separator)}${separator}<span aria-current="page">${current}</span></nav>`);
}

export function syncInsightCards(html, page = "perspectives.html") {
  if (page === "perspectives.html") {
  const pattern = /<article class="service-card editorial-card">[\s\S]*?<\/article>/g;
  const cards = [...html.matchAll(pattern)].map(([card]) => card).filter(card => /href="insight-/.test(card));
  const links = perspectiveLinks;
  if (cards.length !== links.length) throw new Error("Insights cards must match the Resources menu.");
  const ordered = links.map(([href]) => {
    const matches = cards.filter(card => card.includes(`href="${href}"`));
    if (matches.length !== 1) throw new Error(`Expected one Insights card for ${href}.`);
    return matches[0];
  });
  let index = 0;
  html = html.replace(pattern, card => /href="insight-/.test(card) ? ordered[index++] : card);
  }
  const deepDives = /<!-- deep-dive-cards:start -->[\s\S]*?<!-- deep-dive-cards:end -->/;
  if (deepDives.test(html)) {
    html = html.replace(deepDives, `<!-- deep-dive-cards:start --><div class="card-grid">${technologyTopics.map(topic =>
      `<article class="service-card editorial-card" id="${topic.id}"><p class="card-kicker">${escape(topic.name)}</p><h3>${escape(topic.title || topic.name)}</h3><p>${escape(topic.summary)}</p><a class="card-link" href="deep-dive-${topic.id}.html">Read the deep dive <span aria-hidden="true">&#8599;</span></a></article>`
    ).join("\n")}</div><!-- deep-dive-cards:end -->`);
  }
  return html;
}

export function consolidateResourceLinks(html) {
  return html.replace(/\bhref="((?:technology-explained|sources|stories|insights)\.html(?:[?#][^"]*)?)"/g, (original, href) => {
    const url = new URL(href.replaceAll("&amp;", "&"), "https://source.invalid/");
    const page = url.pathname.slice(1);
    const fragment = decodeURIComponent(url.hash.slice(1));
    const topic = migratedTechnologyFragment(fragment);
    if (page === "sources.html" && !topic) return original;
    if (page === "stories.html") {
      url.pathname = "/solutions-in-practice.html";
    } else if (page === "insights.html" && ["perspectives", "solutions-in-practice", "technology-deep-dives"].includes(fragment)) {
      url.pathname = `/${fragment}.html`;
      url.hash = "";
    } else if (page === "technology-explained.html" || topic) {
      url.pathname = "/technology-deep-dives.html";
      url.hash = topic && topic !== "technology-deep-dives" ? topic : "";
    } else {
      url.pathname = "/resources.html";
      url.hash = "insights";
    }
    return `href="${escape(url.pathname.slice(1) + url.search + url.hash)}"`;
  });
}

function menuColumns(groups, page) {
  return `<div class="nav-columns">${groups.map(group => `<section class="nav-column"><h3>${group.href ? `<a href="${group.href}">${escape(group.title)}</a>` : escape(group.title)}</h3><ul>${group.links.map(([href, label]) => `<li><a href="${href}"${page === href ? ' aria-current="page"' : ""}>${escape(label)}</a></li>`).join("")}</ul></section>`).join("")}</div>`;
}

export function sentenceCaseLabel(value) {
  return value.replace(/(\b[A-Za-z]+)(['\u2019]|&(?:apos|rsquo);|&#(?:39|8217);)(S|T|RE|VE|LL|D|M)\b/g, (_, stem, apostrophe, suffix) => {
    const word = stem === "IT" && ["LL", "D"].includes(suffix) ? "it" : stem;
    return word + apostrophe + suffix.toLowerCase();
  })
    .replace(/\b[A-Z]{2,}\b/g, (word) => {
    if (acronyms.has(word)) return word;
    if (["MICROSOFT", "CLOUD", "FIRST", "AZURE", "COPILOT"].includes(word)) return word[0] + word.slice(1).toLowerCase();
    return word.toLowerCase();
  }).replace(/(^|\/\s*)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

export const themeToggle = '<button class="theme-toggle" type="button" aria-label="Dark mode" aria-pressed="false" title="Switch to dark mode" hidden><svg class="theme-icon-dark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg><svg class="theme-icon-light" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><span class="theme-toggle-label" aria-hidden="true">Dark mode</span></button>';
const searchIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
export const searchToggle = `<button class="search-toggle" type="button" data-search-open aria-haspopup="dialog" aria-label="Search the site" title="Search the site" hidden>${searchIcon}</button>`;
const themeToggleCompact = themeToggle.replace('class="theme-toggle"', 'class="theme-toggle theme-toggle-compact"').replace(/<span class="theme-toggle-label"[^>]*>[^<]*<\/span>/, "");
const searchToggleCompact = `<button class="search-toggle search-toggle-compact" type="button" data-search-open aria-haspopup="dialog" aria-label="Search the site" hidden>${searchIcon}</button>`;
const menuToggle = '<button class="menu-toggle" type="button" aria-label="Navigation menu" aria-expanded="false" aria-controls="primary-nav"><svg class="menu-icon-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="menu-icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
const navChevron = '<svg class="nav-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m3 4.5 3 3 3-3"/></svg>';

// Internal links move within the site; the northeast arrow is reserved for new tabs and other sites.
export function syncLinkArrows(html) {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (link, attributes, content) => {
    if (!content.includes("&#8599;")) return link;
    const leavesPage = /\bhref="(?:https?:)?\/\//.test(attributes) || /\btarget="_blank"/.test(attributes) || /\sdownload(?=[\s=>]|$)/.test(attributes);
    return leavesPage ? link : `<a${attributes}>${content.replaceAll("&#8599;", "&#8594;")}</a>`;
  });
}

export function syncAppearance(html) {
  return html
    .replace(/<link rel="preload" href="assets\/fonts\/[^"]+"[^>]*>\s*/g, "")
    .replace(/<link rel="icon"[^>]*>(?:<link rel="apple-touch-icon"[^>]*>)?/g, '<link rel="icon" href="assets/favicon.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="assets/apple-touch-icon.png">')
    .replace(/<script src="assets\/theme\.js"><\/script>\s*/g, "")
    .replace(/<link rel="stylesheet" href="assets\/theme\.css">\s*/g, "")
    .replace(/<link rel="stylesheet" href="assets\/mobile\.css">\s*/g, "")
    .replace(/<link rel="stylesheet" href="assets\/experience\.css">\s*/g, "")
    .replace(/<script src="assets\/mobile\.js" type="module"><\/script>\s*/g, "")
    .replace(/<script src="assets\/motion\.js" defer><\/script>\s*/g, "")
    .replace(/<script src="assets\/search\.js" defer><\/script>\s*/g, "")
    .replace('<!-- theme-toggle -->', themeToggle)
    .replace('<link rel="stylesheet" href="assets/styles.css">', '<script src="assets/theme.js"></script>\n<link rel="preload" href="assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="assets/styles.css">')
    .replace("</head>", '<link rel="stylesheet" href="assets/mobile.css"><script src="assets/mobile.js" type="module"></script>\n<link rel="stylesheet" href="assets/experience.css">\n<script src="assets/motion.js" defer></script>\n<script src="assets/search.js" defer></script>\n<link rel="stylesheet" href="assets/theme.css">\n</head>');
}

export function syncHomepageStats(html) {
  const pattern = /<!-- home-stats:start -->[\s\S]*?<!-- home-stats:end -->/;
  if (!pattern.test(html)) throw new Error("Missing homepage stats region.");
  const stats = [
    [serviceMenuGroups.reduce((total, group) => total + group.links.length, 0), "service capabilities", "services.html"],
    [industries.length, "industries covered", "industries.html"],
    [industries.reduce((total, industry) => total + industry.cases.length, 0), "industry use cases", "industries.html"],
    [products.length, "products explained", "sources.html"]
  ];
  const items = stats.map(([value, label, href]) => `<li><a href="${href}"><span class="stat-number" data-count-to="${value}" aria-hidden="true">${value}</span><span class="sr-only">${value} </span><span class="stat-label">${escape(label)}</span></a></li>`).join("");
  return html.replace(pattern, `<!-- home-stats:start --><section class="section-wrap home-stats" aria-label="What you can explore"><ul>${items}</ul></section><!-- home-stats:end -->`);
}

// Deep dives and perspectives end with a link to the next article in the same series.
// Service heroes set their copy over the service photograph, matching the homepage's cinematic hero.
export function syncServiceBanner(html, page) {
  const photo = servicePhoto(page);
  if (!photo) return html;
  const unwrapped = html
    .replace(/<!-- service-banner:start -->[\s\S]*?<!-- service-banner:copy -->/g, "")
    .replace(/<!-- service-banner:end --><\/div><\/div>/g, "")
    .replace(/<!-- service-photo:start -->[\s\S]*?<!-- service-photo:end -->/g, "");
  return unwrapped.replace(/(<section class="section-wrap service-hero">\s*)(<nav class="breadcrumbs"[\s\S]*?<div class="hero-actions">[\s\S]*?<\/div>)/, (_, open, copy) => `${open}<!-- service-banner:start --><div class="service-hero-banner">${photo}<div class="service-hero-copy"><!-- service-banner:copy -->${copy}<!-- service-banner:end --></div></div>`);
}

export function syncNextArticle(html, page) {
  const region = /<!-- next-article:start -->[\s\S]*?<!-- next-article:end -->/g;
  const series = [
    ["Next deep dive", technologyTopics.map(topic => [`deep-dive-${topic.id}.html`, topic.name])],
    ["Next perspective", perspectiveLinks]
  ].find(([, links]) => links.some(([href]) => href === page));
  html = html.replace(region, "");
  // Long reference pages that end with their own full-width guide keep that guide as the final section.
  if (!series || html.includes('class="section-wrap article-body framework-section"')) return html;
  const [kind, links] = series;
  const [href, label] = links[(links.findIndex(([link]) => link === page) + 1) % links.length];
  const source = readFileSync(path.join(root, "src", "site", href), "utf8");
  const title = (source.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/)?.[1] || escape(label))
    .replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const block = `<!-- next-article:start --><section class="section-wrap next-article" aria-labelledby="next-article-title"><a class="next-article-card" href="${href}"><span class="eyebrow">${kind}: ${escape(label)}</span><span class="next-article-title" id="next-article-title">${title}</span><span class="next-article-cta">Keep reading <span aria-hidden="true">&#8594;</span></span></a></section><!-- next-article:end -->`;
  return html.replace("</main>", `${block}</main>`);
}

export function header(page) {
  const group = /^(?:services|security|ai-business|cloud-platforms)\.html$/.test(page) ? "services"
    : page === "industries.html" || page.startsWith("industry-") ? "industries"
    : /^(?:insight-|deep-dive-|scenario-|brief-)/.test(page) || ["resources.html", "insights.html", "perspectives.html", "solutions-in-practice.html", "technology-deep-dives.html", "sources.html", "stories.html", "briefs.html", "faq.html", "engagements.html", "trust.html", "trust-center.html", "technology-explained.html"].includes(page) ? "resources" : "";
  const industryLinks = menuColumns(industryGroups.map(group => ({
    ...group,
    href: `industries.html#${group.id}`,
    links: industries.filter(industry => industry.segment === group.title)
      .map(industry => [`industry-${industry.slug}.html`, industry.name])
  })), page);
  const menus = [
    ["services", "Services", "services.html", menuColumns(serviceMenuGroups, page)],
    ["industries", "Industries", "industries.html", industryLinks],
    ["resources", "Resources", "resources.html", menuColumns(resourceMenuGroups, page)]
  ];
  const nav = menus.map(([key, label, href, panel]) => {
    const active = group === key ? ' aria-current="location"' : "";
    return `<div class="nav-entry" data-nav-section="${key}"><a class="nav-fallback" href="${href}"${active}>${label}</a><button class="nav-trigger" id="nav-trigger-${key}" type="button" data-nav-trigger="${key}" aria-expanded="false" aria-controls="nav-panel-${key}"${active} hidden>${label}${navChevron}</button><div class="nav-panel" id="nav-panel-${key}" role="region" aria-labelledby="nav-trigger-${key}" hidden><div class="nav-panel-heading"><h2>${label}</h2><a href="${href}">View all ${label.toLowerCase()}</a></div>${panel}</div></div>`;
  }).join("") + `<a class="nav-direct" href="about.html"${page === "about.html" ? ' aria-current="page"' : ""}>About us</a><a class="button button-small nav-direct" href="contact.html"${["contact.html", "booking.html"].includes(page) ? ' aria-current="location"' : ""}>Contact us</a>`;
  return `<header class="site-header"><a class="brand" href="index.html" aria-label="Cloud First Consulting home"><span class="brand-mark" aria-hidden="true"></span><span>Cloud First<span class="brand-sub">CONSULTING</span></span></a><div class="header-controls">${themeToggleCompact}${searchToggleCompact}${menuToggle}</div><nav id="primary-nav" aria-label="Main navigation">${themeToggle}${searchToggle}${nav}</nav></header>`;
}

export const footer = `<footer class="site-footer section-wrap"><div class="footer-directory"><div><a class="brand" href="index.html" aria-label="Cloud First Consulting home"><span class="brand-mark" aria-hidden="true"></span><span>Cloud First<span class="brand-sub">CONSULTING</span></span></a><p>Intelligence, with trust built in.</p></div><nav aria-label="Company"><h2>Explore</h2><a href="about.html">About us</a><a href="engagements.html">Engagements</a><a href="industries.html">Industries</a><a href="services.html">Services</a></nav><nav aria-label="Resources"><h2>Learn</h2><a href="faq.html">FAQs</a><a href="resources.html#insights">Insights</a><a href="briefs.html">Service briefs</a><a href="solutions-in-practice.html">Solutions in practice</a></nav><nav aria-label="Contact and trust"><h2>Connect</h2><a href="booking.html" data-provider="bookingUrl" hidden>Book time with us</a><a href="contact.html">Contact us</a><a href="trust.html">Privacy information</a><a href="sources.html">Products explained</a><a href="trust-center.html">Security and privacy</a></nav></div><div class="footer-bottom"><span>&copy; 2026 Cloud First Consulting</span></div></footer>`;

export async function syncNavigation() {
  const settings = await readSettings();
  await writeSettings(settings);
  const site = path.join(root, "src", "site");
  for (const page of await readdir(site)) {
    if (!page.endsWith(".html")) continue;
    const filename = path.join(site, page);
    const content = await readFile(filename, "utf8");
    if (page === "404.html") {
      let updated = syncAppearance(content.replace(/http-equiv="Content-Security-Policy" content="[^"]+"/, `http-equiv="Content-Security-Policy" content="${contentPolicy(settings)}"`));
      // A compass wavers, then settles on home: a small, calm moment on an otherwise frustrating screen.
      updated = withSceneStyles(updated.replace(/<!-- page-visual:start -->[\s\S]*?<!-- page-visual:end -->/g, "")
        .replace('<p class="error-disclosure">', `<!-- page-visual:start --><div class="page-visual page-visual-compass not-found-visual">${compassScene()}</div><!-- page-visual:end --><p class="error-disclosure">`), true);
      if (updated !== content) await writeFile(filename, updated);
      continue;
    }
    const react = ["index.html", "contact.html", "services.html", "engagements.html", "industries.html", "briefs.html"].includes(page) || (page.startsWith("industry-") && page !== "industry-professional-services.html");
    let source = content;
    if (page === "insight-compliance-readiness.html") {
      const guide = /<!-- framework-guide:start -->[\s\S]*?<!-- framework-guide:end -->/;
      if (!guide.test(source)) throw new Error("Missing compliance framework guide region.");
      source = source.replace(guide, `<!-- framework-guide:start -->${renderFrameworkGuide(industries)}<!-- framework-guide:end -->`);
    }
    if (["perspectives.html", "technology-deep-dives.html"].includes(page)) source = syncInsightCards(source, page);
    if (page === "insights.html") {
      const redirects = resourceMenuGroups.find(group => group.id === "insights").links.map(([href]) => {
        const id = href.replace(".html", "");
        return `<a href="${href}" data-resource-fragment="${id}" hidden>Continue</a>`;
      }).join("");
      source = source.replace(/<!-- insight-redirects:start -->[\s\S]*?<!-- insight-redirects:end -->/g, "")
        .replace("</main>", `<!-- insight-redirects:start -->${redirects}<a id="legacy-topic-destination" href="technology-deep-dives.html" data-topics="${technologyTopicIds.join(" ")}" hidden>Technology deep dives</a><!-- insight-redirects:end --></main>`);
    }
    if (page === "sources.html") {
      const marker = /<!-- product-guide:start -->[\s\S]*?<!-- product-guide:end -->/;
      if (!marker.test(source)) throw new Error("Missing product guide region in Technical resources.");
      // Breadcrumbs sit inside the generated hero, so capture them wherever the previous build left them.
      const crumbs = source.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0] || "";
      source = source.replace(/<div class="section-wrap product-breadcrumbs">[\s\S]*?<\/div>\s*/, "");
      source = source.replace(marker, `<!-- product-guide:start -->${renderProductGuide().replace("<!-- product-crumbs -->", crumbs)}<!-- product-guide:end -->`);
      source = source.replace(/<a\b[^>]*id="legacy-topic-destination"[\s\S]*?<\/a>/g, "")
        .replace("</main>", `<a id="legacy-topic-destination" href="insights.html#technology-deep-dives" data-topics="${technologyTopicIds.join(" ")}" hidden>Technology deep dives</a></main>`);
    }
    source = syncMobileSummaries(source, page);
    let updated = replaceIcons(publicCopy(syncResourceBreadcrumbs(syncServiceNavigation(source, page), page)
      .replace(/<!-- site-header -->|<header class="site-header">[\s\S]*?<\/header>/, header(page))
      .replace(/<!-- site-footer -->|<footer class="site-footer section-wrap">[\s\S]*?<\/footer>/, footer)
      .replace(/name="theme-color" content="[^"]+"/, 'name="theme-color" content="#0078d4"')
      .replace(/http-equiv="Content-Security-Policy" content="[^"]+"/, `http-equiv="Content-Security-Policy" content="${contentPolicy(settings)}"`)
      .replace(/(<p class="(?:eyebrow|card-kicker)">)([^<]*)(<\/p>)/g, (_, open, text, close) => open + sentenceCaseLabel(text) + close)
      .replace(/(<dt>)([^<]*)(<\/dt>)/g, (_, open, text, close) => open + sentenceCaseLabel(text) + close)
      .replace(/<script src="assets\/(?:integrations|contact|experience|catalog|react-ui)\.js" defer><\/script>/g, "")
      .replace('<script src="assets/app.js" defer></script>', '<script src="assets/integrations.js" defer></script><script src="assets/app.js" defer></script><script src="assets/contact.js" defer></script>' + (react ? '<script src="assets/react-ui.js" defer></script>' : ""))
      .replace(/<link rel="stylesheet" href="assets\/(?:production|react-ui)\.css">\s*/g, "")
      .replace("</head>", '<link rel="stylesheet" href="assets/production.css">' + (react ? '<link rel="stylesheet" href="assets/react-ui.css">' : "") + "\n</head>"), page));
    const visual = serviceBlueprint(page);
    if (visual) {
      updated = updated.replace(/<!-- service-(?:photo|visual):start -->[\s\S]*?<!-- service-(?:photo|visual):end -->/g, "").replace('<div class="outcome-strip">', `${visual}<div class="outcome-strip">`);
    }
    if (page === "index.html") updated = syncHomepageStats(syncHomepageProducts(updated));
    updated = syncLinkArrows(syncAppearance(syncEditorialDesign(expandAcronyms(syncNextArticle(consolidateResourceLinks(linkProductNames(updated)), page), page), page)));
    // Hero media is added last so text transforms never reach diagram labels.
    updated = page === "index.html" ? syncSignalMap(updated) : syncHeroVisual(syncServiceBanner(updated, page), page);
    updated = syncPracticeVisuals(updated, page);
    if (updated !== content) await writeFile(filename, updated);
  }
  // The search index reads the finished pages, so it is written after every page is in its final form.
  await syncSearchIndex(root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await syncNavigation();
