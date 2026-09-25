import test from "node:test";
import assert from "node:assert/strict";
import { categories, readCatalogs, renderBrief, renderIndustry, renderIndustries, renderProfessionalServicesHub, validateCatalogs } from "./catalogs.mjs";
import { blueprints } from "../shared/blueprints.mjs";
import { serviceBlueprint } from "./product-visuals.mjs";
import { header, resourceMenuGroups, sentenceCaseLabel, serviceMenuGroups, syncServiceNavigation, syncResourceBreadcrumbs } from "./navigation.mjs";
import { normalizeProductNames, publicCopy, standardizeTerminology } from "./public-copy.mjs";
import { renderIcon } from "./icons.mjs";
import { frameworks, frameworkById, frameworkHref, renderFrameworkConnections } from "./frameworks.mjs";
import { escapeHtml } from "../shared/html.mjs";

const catalogs = await readCatalogs();

test("nineteen industry portfolios contain 152 complete use cases across all domains", () => {
  validateCatalogs(catalogs);
  assert.equal(catalogs.industries.length, 19);
  assert.equal(catalogs.industries.reduce((total, industry) => total + industry.cases.length, 0), 152);
  for (const industry of catalogs.industries) {
    assert.equal(industry.cases.length, 8, industry.slug);
    const domains = new Set(industry.cases.map((item) => catalogs.briefs.find((brief) => brief.slug === item.brief).category));
    assert.deepEqual([...domains].sort(), [...categories].sort(), `Incomplete domain coverage: ${industry.slug}`);
    for (const useCase of industry.cases) {
      assert(useCase.challenge.length > 35);
      assert(useCase.approach.length > 60);
      assert(useCase.guardrail.length > 30);
      assert(useCase.measure.length > 20);
    }
  }
});

test("each domain has an overview and three distinct capability briefs", () => {
  const expected = [
    ["threat-protection", "data-security", "modern-secops"],
    ["copilot-readiness", "business-processes", "custom-ai"],
    ["cloud-modernization", "governed-data", "ai-platforms"]
  ];
  categories.forEach((category, index) => {
    const capabilities = catalogs.briefs.filter((brief) => brief.category === category && brief.kind === "Capability").map((brief) => brief.slug);
    assert.deepEqual(capabilities, expected[index]);
  });
});

test("industry pages preserve use-case details and related capability links", () => {
  for (const industry of catalogs.industries) {
    const html = renderIndustry(industry, catalogs.briefs);
    assert.equal([...html.matchAll(/class="use-case catalog-card"/g)].length, industry.cases.length);
    assert(html.includes('data-catalog="use-case"'));
    assert(html.includes('src="assets/react-ui.js"'));
    for (const category of categories) assert(html.includes(`data-filter="${escapeHtml(category)}"`));
    for (const useCase of industry.cases) {
      assert(html.includes(`href="brief-${useCase.brief}.html"`));
      assert(html.includes(useCase.service));
    }
  }
  assert.equal([...renderIndustries(catalogs.industries).matchAll(/class="catalog-card industry-card"/g)].length, catalogs.industries.length);
});

test("legal and startup portfolios are discoverable and totals follow the data", () => {
  const html = renderIndustries(catalogs.industries);
  for (const slug of ["legal", "startups"]) {
    const industry = catalogs.industries.find((item) => item.slug === slug);
    assert(industry);
    assert.equal(industry.cases.length, 8);
    assert(html.includes(`href="industry-${slug}.html"`));
    assert(html.includes(`data-search="${industry.name} `));
  }
  assert(html.includes("19 industries"));
  assert(html.includes("152 defined use cases"));
  const subset = renderIndustries(catalogs.industries.slice(-2));
  assert(subset.includes("2 industries"));
  assert(subset.includes("16 defined use cases"));
});

test("use-case search data includes technical mappings and solution approaches", () => {
  const industry = catalogs.industries.find((item) => item.slug === "manufacturing");
  const html = renderIndustry(industry, catalogs.briefs);
  const searches = [...html.matchAll(/data-search="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(searches.length, 8);
  for (const [index, useCase] of industry.cases.entries()) {
    assert(searches[index].includes(useCase.tech[0]));
    assert(searches[index].includes(useCase.brief.replaceAll("-", " ")));
  }
});

test("all ten frameworks have scoped connections across the industry portfolio", () => {
  const ids = new Set();
  for (const industry of catalogs.industries) {
    assert(industry.cases.some(item => item.frameworks?.length), industry.slug);
    for (const item of industry.cases) for (const reference of item.frameworks || []) {
      ids.add(reference.id);
      assert(reference.reason.length >= 50, item.title);
      if (reference.id === "cmmc") assert.match(reference.reason, /[Ii]f.*defense/);
      if (reference.id === "pci-dss") assert.match(reference.reason, /payment|cardholder/);
      if (reference.id === "gdpr") assert.match(reference.reason, /Where.*GDPR scope/);
      if (reference.id === "eu-ai-act") assert.match(reference.reason, /Where the Act applies/);
      if (reference.id === "cjis") {
        assert.equal(industry.slug, "government");
        assert.match(reference.reason, /criminal justice information/);
      }
      if (reference.id === "purdue-model") {
        assert(["manufacturing", "energy-resources"].includes(industry.slug));
        assert.match(reference.reason, /specialist/);
      }
    }
  }
  assert.deepEqual([...ids].sort(), ["nist-csf", "nist-ai-rmf", "cisa-ztmm", "iso-27001", "cmmc", "pci-dss", "gdpr", "eu-ai-act", "purdue-model", "cjis"].sort());
  assert.equal(frameworks.length, 10);
});

test("framework connections render linked explanations and support case and industry search", () => {
  const directory = renderIndustries(catalogs.industries);
  for (const industry of catalogs.industries) {
    const html = renderIndustry(industry, catalogs.briefs);
    const searches = [...html.matchAll(/data-search="([^"]+)"/g)].map(([, value]) => value);
    for (const [index, item] of industry.cases.entries()) {
      for (const reference of item.frameworks || []) {
        assert(html.includes(`href="${frameworkHref(reference.id)}"`), item.title);
        assert(searches[index].includes(frameworkById(reference.id).name), item.title);
        assert(directory.includes(frameworkById(reference.id).name), industry.slug);
      }
    }
  }
  const escaped = renderFrameworkConnections([{ id: "gdpr", reason: '<img src=x onerror="bad">' }]);
  assert(!escaped.includes("<img"));
  assert(escaped.includes("&lt;img"));
  assert.equal(renderFrameworkConnections(), "");
});

test("invalid framework mappings fail rather than publishing misleading links", () => {
  for (const references of [
    [{ id: "unknown", reason: "Not a registered framework" }],
    [{ id: "gdpr", reason: "" }],
    [{ id: "gdpr", reason: "First reference" }, { id: "gdpr", reason: "Duplicate reference" }]
  ]) {
    const copy = structuredClone(catalogs);
    copy.industries[0].cases[0].frameworks = references;
    assert.throws(() => validateCatalogs(copy));
  }
});

test("briefs have matching downloads, copyright, and straightforward service titles", () => {
  for (const brief of catalogs.briefs) {
    const html = renderBrief(brief);
    assert(html.includes(`downloads/cloud-first-${brief.slug}-brief.pdf`));
    assert(html.includes("&copy; 2026 Cloud First Consulting"));
    assert(html.includes("Capabilities") && html.includes("Deliverables"));
    assert(html.includes(`<h1>${escapeHtml(brief.title)}</h1>`));
    assert(!/fictional|illustrative|[—–·]|&middot;/i.test(html));
  }
});

test("catalog rendering escapes content instead of interpreting HTML", () => {
  const industry = { ...catalogs.industries[0], name: '<img src=x onerror="bad">' };
  const html = renderIndustry(industry, catalogs.briefs);
  assert(!html.includes("<img src=x"));
  assert(html.includes("&lt;img"));
});

test("service diagrams present an accessible reference workflow", () => {
  for (const page of Object.keys(blueprints)) {
    const html = serviceBlueprint(page);
    assert(html.includes('aria-labelledby="blueprint-title"'));
    assert(html.includes("Reference architecture"));
    assert(html.includes('<ol class="blueprint-flow" data-card-style="type">'));
    assert.equal([...html.matchAll(/<li[ >]/g)].length, 4);
    assert(!html.includes("<img"));
  }
  assert.equal(serviceBlueprint("contact.html"), "");
});

test("global navigation exposes every industry and service capability without sample links", () => {
  const html = header("industry-legal.html");
  for (const industry of catalogs.industries) assert(html.includes(`href="industry-${industry.slug}.html"`));
  for (const group of [...serviceMenuGroups, ...resourceMenuGroups]) {
    for (const [href] of group.links) assert(html.includes(`href="${href}"`));
  }
  assert(html.includes('data-nav-trigger="industries"'));
  assert(!html.includes('id="nav-industry-search"'));
  for (const id of ["business-services", "public-social", "industry-infrastructure"]) {
    assert(html.includes(`href="industries.html#${id}"`));
  }
  assert(!/sample-|deliverables\.html|service-menu-toggle/.test(html));
});

test("resource breadcrumbs match menu categories and keep briefs out of Insights", () => {
  const source = '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><a href="insights.html">Insights</a><span aria-current="page">Service briefs</span></nav>';
  const briefs = syncResourceBreadcrumbs(source, "briefs.html");
  assert(briefs.includes('href="resources.html">Resources</a>'));
  assert(briefs.includes('href="resources.html#plan-your-project">Planning</a>'));
  assert(!briefs.includes('href="insights.html"'));
  assert.equal(syncResourceBreadcrumbs(briefs, "briefs.html"), briefs);
  const individual = syncResourceBreadcrumbs(source, "brief-security.html");
  assert(individual.includes('href="briefs.html">Service briefs</a>'));
  for (const group of resourceMenuGroups) {
    for (const [page] of group.links) {
      const result = syncResourceBreadcrumbs(source, page);
      assert(result.includes('href="resources.html">Resources</a>'));
      if (page !== "insights.html") assert(result.includes(`href="${group.href}">${group.title}</a>`));
      assert.equal(syncResourceBreadcrumbs(result, page), result);
    }
  }
  assert(header("resources.html").includes('href="resources.html">View all resources</a>'));
  assert.throws(() => syncResourceBreadcrumbs("", "briefs.html"), /Missing resource breadcrumbs/);
});
test("service navigation and labels share one ordered catalog across repeated builds", () => {
  const directory = serviceMenuGroups.map(group => `<nav data-service-group="${group.key}" aria-label="Services">Outdated links</nav>`).join("");
  const updatedDirectory = syncServiceNavigation(directory, "services.html");
  assert.equal(syncServiceNavigation(updatedDirectory, "services.html"), updatedDirectory);
  for (const group of serviceMenuGroups) {
    const source = '<nav class="practice-nav" id="capabilities">Outdated links</nav>' + group.links.map(([href]) => `<section class="practice" id="${href.split("#")[1]}"><div class="practice-intro"><p class="eyebrow">Old title</p><h2>Keep this heading</h2><p>Keep the service description.</p></div></section>`).join("");
    const result = syncServiceNavigation(source, group.href);
    assert.equal(syncServiceNavigation(result, group.href), result);
    assert(!result.includes("Old title") && !result.includes("Outdated links"));
    let previous = -1;
    for (const [href, title] of group.links) {
      assert(result.includes(`<a href="#${href.split("#")[1]}">${title}</a>`));
      assert(result.includes(`<p class="eyebrow">${title}</p><h2>Keep this heading</h2>`));
      const position = updatedDirectory.indexOf(`href="${href}">${title}`);
      assert(position > previous, `Directory ordering changed for ${href}`);
      previous = position;
    }
  }
  assert.equal(serviceMenuGroups[1].links[0][0], "ai-business.html#modern-work");
});

test("service synchronization surfaces missing sections instead of hiding mismatches", () => {
  assert.throws(() => syncServiceNavigation("", "services.html"), /Missing security service directory/);
  assert.throws(() => syncServiceNavigation("", "ai-business.html"), /Missing capability navigation/);
  assert.throws(() => syncServiceNavigation('<nav class="practice-nav"></nav>', "ai-business.html"), /Missing capability ai-business.html#modern-work/);
  const ordinaryPage = "<p>Unrelated page</p>";
  assert.equal(syncServiceNavigation(ordinaryPage, "about.html"), ordinaryPage);
});

test("professional-services specialties have distinct pages without duplicating Legal", () => {
  assert(!catalogs.industries.some(industry => industry.slug === "professional-services"));
  const hub = renderProfessionalServicesHub(catalogs.industries);
  for (const slug of ["legal", "accounting-advisory", "architecture-engineering", "staffing-recruitment"]) {
    assert.equal(catalogs.industries.filter(industry => industry.slug === slug).length, 1);
    assert(hub.includes(`industry-${slug}.html`));
  }
});

test("brand terminology is consistent without lowercasing legitimate sentence openings", () => {
  assert.equal(standardizeTerminology("Microsoft cloud and ai platforms support ai security and ai governance."), "Cloud & AI support AI Security and AI Governance.");
  assert.equal(standardizeTerminology("More than A recommendation. Build A stronger foundation."), "More than a recommendation. Build a stronger foundation.");
  assert.equal(standardizeTerminology("A clear plan. Plan A remains available."), "A clear plan. Plan A remains available.");
  assert.equal(standardizeTerminology("AI business solutions / zero trust / finops / secops"), "AI Business Solutions / Zero Trust / FinOps / SecOps");
  assert(header("contact.html").includes('class="brand" href="index.html"'));
});

test("sentence-case labels handle contractions without damaging acronyms", () => {
  const examples = [
    ["BUILD WHAT'S NEXT", "Build what's next"],
    ["Build the foundation for what'S next", "Build the foundation for what's next"],
    ["DON'T / WE'RE / YOU'VE / IT'LL / I'D / I'M", "Don't / We're / You've / It'll / I'd / I'm"],
    ["MICROSOFT'S AI / IT READINESS / SQL AND BI", "Microsoft's AI / IT readiness / SQL and BI"],
    ["Put it into practice", "Put it into practice"],
    ["AI Security / MCP / GPT / ID / API / IP / URL", "AI Security / MCP / GPT / ID / API / IP / URL"]
  ];
  for (const apostrophe of ["'", "\u2019", "&#39;", "&#8217;", "&apos;", "&rsquo;"]) {
    examples.push([`WHAT${apostrophe}S NEXT`, `What${apostrophe}s next`]);
  }
  for (const [source, expected] of examples) {
    assert.equal(sentenceCaseLabel(source), expected);
    assert.equal(sentenceCaseLabel(expected), expected, "Repeated builds must preserve casing");
  }
});

test("terminology normalization preserves case-sensitive links and identifiers", () => {
  const html = '<a id="secops" href="brief-modern-secops.html" aria-controls="finops">Modern secops and finops</a>';
  assert.equal(publicCopy(html, "test.html"), '<a id="secops" href="brief-modern-secops.html" aria-controls="finops">Modern SecOps and FinOps</a>');
});

test("product names keep Microsoft only in Microsoft 365 product names", () => {
  const source = "Microsoft 365, Microsoft 365 Copilot, Microsoft Entra Suite, Microsoft Viva, Microsoft Agent 365, Microsoft Agent Framework, Microsoft Graph, Microsoft Forms, Microsoft Bookings, Microsoft Foundry, Microsoft Azure";
  const expected = "Microsoft 365, Microsoft 365 Copilot, Entra Suite, Viva, Agent 365, Agent Framework, Graph, Forms, Bookings, Foundry, Azure";
  assert.equal(normalizeProductNames(source), expected);
  assert.equal(normalizeProductNames(expected), expected);
  const legal = "Copyright Microsoft Corporation. Microsoft manages the form under Microsoft's privacy terms.";
  assert.equal(normalizeProductNames(legal), legal);
  const html = '<meta name="description" content="Microsoft Entra and Microsoft 365"><a href="https://learn.microsoft.com/en-us/viva/microsoft-viva-overview" aria-label="Microsoft Viva">Microsoft Viva</a>';
  assert.equal(publicCopy(html, "test.html"), '<meta name="description" content="Entra and Microsoft 365"><a href="https://learn.microsoft.com/en-us/viva/microsoft-viva-overview" aria-label="Viva">Viva</a>');
});

test("service catalog includes identity governance and distinct secure-access delivery", () => {
  const links = serviceMenuGroups[0].links.map(([href]) => href);
  assert.equal(links.indexOf("security.html#secure-access"), links.indexOf("security.html#identity") + 1);
  assert.deepEqual(serviceMenuGroups[0].links.find(([href]) => href === "security.html#secure-access"), ["security.html#secure-access", "Secure network access"]);
  assert(header("security.html").includes('href="security.html#secure-access">Secure network access</a>'));
  const business = catalogs.briefs.find(brief => brief.slug === "ai-business");
  assert(business.technologies.includes("Viva"));
  const security = catalogs.briefs.find(brief => brief.slug === "security");
  assert(security.technologies.includes("Entra Suite"));
  assert(security.capabilities.some(capability => capability.includes("VPN")));
});

test("consulting page headings and browser titles use the same X Consulting format", () => {
  for (const group of serviceMenuGroups) {
    const source = "<title>Old page title</title><h1>Inconsistent consulting heading</h1><p>Keep the body.</p>";
    const expected = `<title>${escapeHtml(group.title)} consulting | CFC</title><h1>${escapeHtml(group.title)} consulting</h1><p>Keep the body.</p>`;
    assert.equal(publicCopy(source, group.href), expected);
    assert.equal(publicCopy(expected, group.href), expected);
  }
});

test("every industry has a local, accessible Fluent icon", () => {
  for (const industry of catalogs.industries) {
    const icon = renderIcon(industry.slug);
    assert(icon.includes("<svg") && icon.includes('aria-hidden="true"'));
    assert(!icon.includes('style="'));
  }
});
