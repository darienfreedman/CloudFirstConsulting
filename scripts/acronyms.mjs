const terms = {
  "SD-WAN": "software-defined wide area networking",
  ZTNA: "Zero Trust Network Access",
  SWG: "secure web gateway",
  SASE: "secure access service edge",
  SSE: "security service edge",
  VPN: "virtual private network",
  SaaS: "software as a service",
  MCP: "Model Context Protocol",
  DLP: "data loss prevention",
  SIEM: "security information and event management",
  XDR: "extended detection and response",
  RAG: "retrieval-augmented generation",
  GPT: "generative pre-trained transformer",
  CRM: "customer relationship management",
  ERP: "enterprise resource planning",
  API: "application programming interface",
  SQL: "Structured Query Language",
  BI: "business intelligence",
  IT: "information technology",
  IP: "intellectual property",
  ID: "identity",
  PC: "personal computer",
  FinOps: "cloud financial operations",
  SecOps: "security operations",
  AI: "artificial intelligence"
};
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\b(${Object.keys(terms).map(escape).join("|")})(s)?\\b`, "g");
const paragraphs = /<(p|li)\b([^>]*)>([\s\S]*?)<\/\1>/g;
const sense = (text, offset, key, length) => key === "IP" && /^\s+addresses?\b/.test(text.slice(offset + length)) ? "IP:network" : key;

function branded(text, offset, key) {
  const before = text.slice(0, offset);
  const after = text.slice(offset + key.length);
  return (key === "XDR" && /Defender\s+$/.test(before))
    || (key === "BI" && /Power\s+$/.test(before))
    || (key === "SQL" && /Azure\s+$/.test(before))
    || (key === "ID" && (/Entra\s+$/.test(before) || /^\s+(?:Governance|Protection|means identity)\b/.test(after)))
    || (key === "PC" && /Cloud\s+$/.test(before))
    || (key === "AI" && (/^\s+(?:Business Solutions|Security|Governance|Platforms)\b/.test(after)));
}

function normalizeDefinitions(body) {
  let result = body.replace(/<span data-acronym="([^"]+)">[^<]*<\/span>/g, (_, key) => key);
  result = result.replace(/\bInternet Protocol\s*\(IP\)/g, "IP");
  for (const [key, full] of Object.entries(terms)) {
    result = result
      .replace(new RegExp(`\\b${escape(full)}\\s*\\(${escape(key)}\\)`, "gi"), key)
      .replace(new RegExp(`\\b${escape(full)},? or ${escape(key)},?`, "gi"), key)
      .replace(new RegExp(`(?:<strong>)?\\b${escape(full)}(?:</strong>)?,? (?:often )?shortened to ${escape(key)},?`, "gi"), key)
      .replace(new RegExp(`(?:<strong>)?\\b${escape(key)}(?:</strong>)?, or ${escape(full)},?`, "gi"), key);
  }
  return result;
}

function expandScope(html, homepageHeroException) {
  const blocks = [];
  const counts = new Map();
  html.replace(paragraphs, (whole, tag, attributes, body) => {
    if (/\bclass="[^"]*\b(?:eyebrow|card-kicker|brief-brand|brief-kicker|brief-platforms|article-meta)\b/.test(attributes)) return whole;
    const normalized = normalizeDefinitions(body);
    blocks.push({ body: normalized });
    return whole;
  });
  const visible = html.replace(paragraphs, (_, tag, attributes, body) => ` ${normalizeDefinitions(body)} `).replace(/<[^>]+>/g, " ");
  for (const match of visible.matchAll(pattern)) {
    const meaning = sense(visible, match.index, match[1], match[0].length);
    counts.set(meaning, (counts.get(meaning) || 0) + 1);
  }
  const seen = new Set();
  let cursor = 0;
  return html.replace(paragraphs, (whole, tag, attributes) => {
    if (/\bclass="[^"]*\b(?:eyebrow|card-kicker|brief-brand|brief-kicker|brief-platforms|article-meta)\b/.test(attributes)) return whole;
    const { body } = blocks[cursor++];
    const expanded = body.replace(/(<[^>]+>)|([^<]+)/g, (segment, element, text, segmentOffset) => {
      if (element) return element;
      return text.replace(pattern, (token, key, plural, offset) => {
        if (homepageHeroException && tag === "p" && /\bclass="hero-description"/.test(attributes)
          && key === "AI" && !plural && /\bagentic\s+$/.test(text.slice(0, offset))) return token;
        const meaning = sense(text, offset, key, token.length);
        if (branded(text, offset, key) || seen.has(meaning)) return token;
        seen.add(meaning);
        let full = meaning === "IP:network"
          ? "Internet Protocol"
          : terms[key];
        if (plural) full += "s";
        const before = body.slice(0, segmentOffset + offset).replace(/<[^>]+>/g, "").trim();
        if (!before || /[.!?]$/.test(before)) full = full[0].toUpperCase() + full.slice(1);
        const label = counts.get(meaning) > 1 ? `${full} (${token})` : full;
        return `<span data-acronym="${token}">${label}</span>`;
      });
    });
    return `<${tag}${attributes}>${expanded}</${tag}>`;
  });
}

export function expandAcronyms(html, page = "") {
  return html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/, (_, open, body, close) => {
    // Cards, FAQs, and downloadable briefs must make sense independently.
    const parts = body.split(/(<article\b[\s\S]*?<\/article>|<details\b[\s\S]*?<\/details>)/g);
    return open + parts.map(part => expandScope(part, page === "index.html")).join("") + close;
  });
}
