const headings = {
  "about.html": "About Cloud First Consulting",
  "security.html": "Security consulting",
  "ai-business.html": "AI Business Solutions consulting",
  "cloud-platforms.html": "Cloud and AI Platforms consulting",
  "insights.html": "Insights and practical guidance",
  "stories.html": "Solutions in practice",
  "faq.html": "Frequently asked questions",
  "engagements.html": "Choose an engagement"
};

export function normalizeProductNames(text) {
  return text
    .replace(/\bDefender\b(?!\s+(?:XDR|for)\b)/g, "Defender XDR")
    .replace(/\bMicrosoft\s+(?=(?:Entra|Viva|Azure|Fabric|Foundry|Purview|Defender|Sentinel|Intune|Agent 365|Agent Framework|Graph|Copilot|Teams|Forms|Bookings|Power BI|Power Apps|Power Automate|Power Platform|Windows|SharePoint|OneDrive|Exchange|Outlook)\b)/g, "")
    .replace(/\bMicrosoft technical resources\b/g, "Products explained")
    .replace(/\bMicrosoft resources\b/g, "Products explained")
    .replace(/\bTechnical resources\b/g, "Products explained")
    .replace(/\bMicrosoft consulting services\b/g, "Consulting services")
    .replace(/\bMicrosoft technology\b/g, "Technology")
    .replace(/\bMicrosoft security\b/g, "Security")
    .replace(/\bMicrosoft ecosystem\b/g, "technology ecosystem")
    .replace(/\bMicrosoft investments\b/g, "technology investments")
    .replace(/\bMicrosoft products\b/g, "products")
    .replace(/\bMicrosoft form\b/g, "form")
    .replace(/\bMicrosoft (?=cloud\b)/gi, "");
}

export function standardizeTerminology(text) {
  return normalizeProductNames(text)
    .replace(/\bcloud\s+(?:and|&(?:amp;)?)\s+ai\b/gi, "Cloud and AI")
    .replace(/\bCloud and AI platforms\b/gi, "Cloud and AI Platforms")
    .replace(/\bai security\b/gi, "AI Security")
    .replace(/\bai governance\b/gi, "AI Governance")
    .replace(/\bai business solutions\b/gi, "AI Business Solutions")
    .replace(/\bzero trust\b/gi, "Zero Trust")
    .replace(/\bfinops\b/gi, "FinOps")
    .replace(/\bsecops\b/gi, "SecOps")
    .replace(/\b(than|with|for|to|as|of|is|from|into|and|be|on|in|not|build|create|start|make|develop|design|deliver|choose|use|find|take|define|provide|support)\s+A\s+(?=[a-z])/gi, (match, before) => `${before} a `);
}

export function publicCopy(html, filename) {
  let result = html;
  const description = {
    "scenario-security.html": "A security modernization approach for financial services organizations.",
    "scenario-data-ai.html": "A data protection and Copilot readiness approach for professional services organizations.",
    "scenario-ai-governance.html": "An approach to enterprise AI governance, ownership, and controlled releases."
  }[filename];
  if (description) result = result.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`);
  if (headings[filename]) result = result.replace(/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/, `<h1>${headings[filename]}</h1>`);
  if (["security.html", "ai-business.html", "cloud-platforms.html"].includes(filename)) {
    result = result.replace(/<title>[\s\S]*?<\/title>/, `<title>${headings[filename]} | Cloud First Consulting</title>`);
  }
  if (filename === "index.html") {
    result = result.replace(/<title>[\s\S]*?<\/title>/, "<title>Cloud First Consulting</title>");
  } else {
    result = result.replace(/<title>([\s\S]*?)<\/title>/, (_, title) =>
      `<title>${title.replace(/\s*\|\s*(?:Cloud First Consulting|CFC)$/, "")} | CFC</title>`);
  }
  if (filename === "insights.html" || filename.startsWith("insight-")) {
    result = result.replace(/<p class="article-meta">[\s\S]*?<\/p>/g, "");
  }
  result = result.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/g, (paragraph, attributes, text) => {
    if (/\b(?:fictional|illustrative|local preview|not a client case study)\b/i.test(text)) {
      if (/class="(?:eyebrow|card-kicker)"/.test(attributes)) return `<p${attributes}>Solution example</p>`;
      return "";
    }
    return paragraph;
  });
  result = result
    .replace(/\billustrative\s+/gi, "")
    .replace(/Read an scenario/g, "Explore a solution example")
    .replace(/Customer scenarios/g, "Solutions in practice")
    .replace(/customer scenarios/g, "solution examples")
    .replace(/Intended outcomes/g, "Business goals")
    .replace(/No improvement figures or successful deployment are asserted by this scenario\./g, "")
    .replace(/A prototype does not establish production readiness\./g, "Production releases need separate readiness criteria.")
    .replace(/Service descriptions are planning examples\.\s*/g, "")
    .replace(/This is planning guidance, not a claim that every Copilot capability enforces every control described\.\s*/g, "")
    .replace(/The outlines here are not fixed-price packages, delivery-time promises, or confirmed funding offers\./g, "")
    .replace(/No inquiry is submitted from this page\./g, "")
    .replace(/production partners/g, "production collaborators")
    .replace(/seasonal and partner workforce/gi, "seasonal and contractor workforce")
    .replace(/volunteer and partner access/gi, "volunteer and collaborator access")
    .replace(/\bpartners\b/gi, "external organizations")
    .replace(/\bPartner\b/g, "External")
    .replace(/\bpartner\b/g, "external")
    .replace(/\s*(?:\u00b7|&middot;|&#183;)\s*/g, ", ")
    .replace(/[\u2013\u2014]|&(?:mdash|ndash);|&#(?:8211|8212);/g, "-");
  // Normalize displayed text without changing case-sensitive URLs or identifiers.
  return result.split(/(<[^>]+>)/g)
    .map(part => {
      if (!part.startsWith("<")) return standardizeTerminology(part);
      let tag = part.replace(/\b(aria-label|alt|title|placeholder)="([^"]*)"/g, (_, attribute, value) => `${attribute}="${normalizeProductNames(value)}"`);
      if (/^<meta\b[^>]*\bname="description"/.test(tag)) {
        tag = tag.replace(/\bcontent="([^"]*)"/, (_, value) => `content="${normalizeProductNames(value)}"`);
      }
      return tag;
    })
    .join("");
}
