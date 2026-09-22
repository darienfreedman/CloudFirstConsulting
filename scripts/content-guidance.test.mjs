import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expandAcronyms } from "./acronyms.mjs";
import { linkProductNames, productLink, products, renderProductGuide } from "./products.mjs";

const text = html => html.replace(/<[^>]+>/g, "");

test("technical acronyms are spelled out before later shorthand", () => {
  const html = "<main><p>Use ZTNA instead of broad VPN access. ZTNA needs a pilot.</p><p>Test the VPN transition.</p></main>";
  const result = expandAcronyms(html);
  assert.equal(text(result), "Use Zero Trust Network Access (ZTNA) instead of broad virtual private network (VPN) access. ZTNA needs a pilot.Test the VPN transition.");
  assert.equal(expandAcronyms(result), result);
});

test("agentic AI is exempt only in the homepage hero description", () => {
  const source = '<main><p class="hero-description">We operationalize agentic AI.</p><p>We adopt AI.</p></main>';
  const homepage = expandAcronyms(source, "index.html");
  assert(homepage.includes('<p class="hero-description">We operationalize agentic AI.</p>'));
  assert(homepage.includes("artificial intelligence (AI)"));
  assert.equal(expandAcronyms(homepage, "index.html"), homepage);
  assert(!expandAcronyms(source, "ai-business.html").includes("operationalize agentic AI."));
  assert(!expandAcronyms('<main><p>We operationalize agentic AI.</p></main>', "index.html").includes("operationalize agentic AI."));
});

test("terms used once do not introduce unnecessary shorthand", () => {
  const result = expandAcronyms("<main><p>Plan DLP and CRM integration.</p></main>");
  assert.equal(text(result), "Plan data loss prevention and customer relationship management integration.");
  assert.equal(expandAcronyms(result), result);
});

test("later product names and resource links count as acronym reuse", () => {
  const result = expandAcronyms('<main><article><p>Use extended detection and response (XDR).</p><p class="brief-platforms">Defender XDR</p><a href="guide.html">XDR guidance</a></article></main>');
  assert(text(result).includes("extended detection and response (XDR)"));
  assert(result.includes('<p class="brief-platforms">Defender XDR</p>'));
  assert.equal(expandAcronyms(result), result);
});
test("existing definitions and standalone cards retain correct first-use explanations", () => {
  const html = "<main><article><p>Zero Trust Network Access (ZTNA) limits access. Use ZTNA deliberately.</p></article><article><p>ZTNA needs testing.</p></article></main>";
  const result = expandAcronyms(html);
  assert.equal(text(result), "Zero Trust Network Access (ZTNA) limits access. Use ZTNA deliberately.Zero Trust Network Access needs testing.");
  assert.equal(expandAcronyms(result), result);
});

test("existing prose definitions do not become duplicated or leave stray commas", () => {
  const html = "<main><p><strong>DLP</strong>, or data loss prevention, protects information. Apply DLP policies.</p><p><strong>Model Context Protocol</strong>, often shortened to MCP, connects tools. Review MCP servers.</p></main>";
  const result = expandAcronyms(html);
  assert.equal(text(result), "Data loss prevention (DLP) protects information. Apply DLP policies.Model Context Protocol (MCP) connects tools. Review MCP servers.");
  assert.equal(expandAcronyms(result), result);
});
test("acronym edits preserve links, labels, branded names, and contextual IP meaning", () => {
  const html = '<main><h1>AI Security</h1><p class="eyebrow">AI Governance</p><p>Use Defender XDR, Power BI, and Azure SQL. Review IP addresses and API access.</p><p>Protect engineering IP.</p><a href="https://example.com/API">API</a></main>';
  const result = expandAcronyms(html);
  assert(result.includes("<h1>AI Security</h1>"));
  assert(result.includes('<p class="eyebrow">AI Governance</p>'));
  assert(result.includes("Defender XDR, Power BI, and Azure SQL"));
  assert(result.includes("Internet Protocol"));
  assert(result.includes("intellectual property"));
  assert(result.includes("application programming interface"));
  assert(result.includes('href="https://example.com/API"'));
});

test("each product name has a problem-focused explanation and stable links", () => {
  assert.equal(new Set(products.map(product => product.id)).size, products.length);
  const guide = renderProductGuide();
  for (const product of products) {
    assert(product.problem.length > 30 && product.solution.length > 50);
    assert(guide.includes(`id="${product.id}"`));
    assert(product.docs.startsWith("https://"));
    for (const name of [product.name, ...(product.aliases || [])]) {
      assert(productLink(name).includes(`href="sources.html#${product.id}"`));
    }
  }
  assert.equal(productLink("Microsoft Entra Suite"), '<a href="sources.html#entra">Entra Suite</a>');
  assert.throws(() => productLink("Unknown product"), /Missing product explanation/);
});

test("product chips become links without changing other labels or nesting anchors", () => {
  const source = '<div class="product-tags"><span>Entra Private Access</span><span>Microsoft 365</span></div><span>Ordinary text</span>';
  const result = linkProductNames(source);
  assert(result.includes('href="sources.html#entra"'));
  assert(result.includes('href="sources.html#microsoft-365"'));
  assert(result.endsWith("<span>Ordinary text</span>"));
  assert.equal(linkProductNames(result), result);
});

test("Purview and Sentinel have substantive coverage comparable to their adjacent products", () => {
  const words = id => {
    const product = products.find(product => product.id === id);
    return [product.problem, product.solution, ...(product.details || [])].join(" ").split(/\s+/).length;
  };
  for (const [id, adjacent] of [["purview", "entra"], ["sentinel", "defender"]]) {
    assert(words(id) >= words(adjacent) * 0.8, `${id} needs comparable explanatory detail`);
    assert(words(id) <= words(adjacent) * 1.3, `${id} should remain balanced with ${adjacent}`);
  }
});

test("technical resources use the homepage Copilot group name without a duplicate guidance section", () => {
  const guide = renderProductGuide();
  assert(guide.includes('<h2 id="product-group-2">Copilot &amp; agents</h2>'));
  assert(guide.includes('<a href="#product-group-2">Copilot &amp; agents</a>'));
  assert.equal(products.filter(product => product.group === "Copilot & agents").length, 8);
  const source = readFileSync(new URL("../docs/sources.html", import.meta.url), "utf8");
  assert(!source.includes("Further planning and architecture guidance"));
  assert(guide.includes('href="technology-explained.html"'));
});

test("planning references and unique capabilities live in the relevant product cards", () => {
  const references = [
    ["viva", "/viva/microsoft-viva-overview"],
    ["entra", "/entra/global-secure-access/overview-what-is-global-secure-access"],
    ["entra", "/security/zero-trust/zero-trust-overview"],
    ["defender", "/security/business/solutions/security-for-ai"],
    ["windows-365", "/windows-365/overview"],
    ["foundry", "/azure/ai-foundry/what-is-azure-ai-foundry"],
    ["microsoft-365-copilot", "/copilot/microsoft-365/microsoft-365-copilot-architecture"],
    ["microsoft-365-copilot", "/copilot/overview"],
    ["microsoft-365-copilot", "/copilot/microsoft-365/microsoft-365-copilot-setup"],
    ["copilot-studio", "/microsoft-copilot-studio/authoring-select-agent-model"],
    ["agent-365", "/microsoft-agent-365/overview"],
    ["agent-365", "/insidetrack/blog/becoming-a-frontier-firm-a-guide-for-deploying-ai-agents-based-on-our-experience-at-microsoft/"],
    ["agent-framework", "/agent-framework/overview/"],
    ["agent-framework", "/docs/learn/architecture"],
    ["fabric", "/fabric/fundamentals/microsoft-fabric-overview"],
    ["azure", "/azure/cloud-adoption-framework/ready/landing-zone/"],
    ["azure", "/azure/well-architected/"]
  ];
  const guide = renderProductGuide();
  for (const [id, path] of references) {
    const product = products.find(product => product.id === id);
    const urls = [product.docs, ...(product.additionalDocs || []).map(([, url]) => url)];
    const url = urls.find(url => new URL(url).pathname.replace(/^\/en-us(?=\/)/, "") === path);
    assert(url, `${id} must retain ${path}`);
    const card = guide.match(new RegExp(`<article[^>]+id="${id}">([\\s\\S]*?)</article>`))[1];
    assert(card.includes(`href="${url}"`));
  }
  for (const [id, concept] of [
    ["entra", "assume breach"],
    ["defender", "Security for AI"],
    ["microsoft-365-copilot", "Copilot Chat"],
    ["microsoft-365-copilot", "Readiness and adoption"],
    ["copilot-studio", "regional availability"],
    ["agent-365", "user training"],
    ["agent-framework", "Model Context Protocol"],
    ["azure", "Landing zones"],
    ["azure", "Well-Architected Framework"]
  ]) {
    const product = products.find(product => product.id === id);
    assert([product.solution, ...(product.details || [])].join(" ").includes(concept));
  }
});
