import assert from "node:assert/strict";
import { escapeHtml } from "../shared/html.mjs";

const practiceSummaries = {
  "ai-business.html": {
    "modern-work": "Help your team collaborate, find trusted information, and manage everyday work with Microsoft 365 and Viva. Plan ownership, access, and adoption before adding new tools or extending AI use.",
    copilot: "Prepare your information, permissions, and people for Microsoft 365 Copilot. Choose useful tasks, evaluate supported model options, and agree the governance and support needed before expanding adoption."
  },
  "security.html": {
    "ai-governance": "Give AI use cases clear owners, approved uses, and review steps. Plan how connected tools, agent lifecycles, and changes are approved so accountability keeps pace with adoption.",
    identity: "Keep access aligned with people's responsibilities. Plan identity lifecycles, authentication, risk policies, and reviews across employees, guests, and applications without granting unnecessary or outdated permissions.",
    "secure-access": "Connect people to the applications they need without broad network access. Plan private and internet access together, then replace suitable legacy connections in stages with clear protection and ownership.",
    endpoints: "Manage the devices and applications your team depends on. Establish consistent configuration, compliance, and protection across supported endpoints, with a practical plan for provisioning and ongoing support."
  }
};

export function syncMobileSummaries(html, page) {
  let result = html;
  for (const [id, summary] of Object.entries(practiceSummaries[page] || {})) {
    const pattern = new RegExp(`<section class="practice" id="${id}"[^>]*>`);
    assert(pattern.test(result), `Missing summary destination: ${page}#${id}`);
    result = result.replace(pattern, open => open.replace(/\sdata-mobile-summary="[^"]*"/g, "").replace(/>$/, ` data-mobile-summary="${escapeHtml(summary)}">`));
  }
  if (page === "index.html") {
    result = result
      .replace("Prevent threats, protect identities and information, and secure AI workflows. Strengthen detection, response, and governance across your environment.",
        "Protect identities, business information, and AI workflows with coordinated security. Strengthen threat detection and response, review access, and give your team a clear plan for addressing risk.")
      .replace("Modernize infrastructure, strengthen cloud security, connect governed data, and build and evaluate AI applications.",
        "Modernize infrastructure, bring governed data together, and support new AI applications. Plan security, reliability, cost, and ongoing operations so your foundation can support changing business needs.");
  }
  if (page === "insight-compliance-readiness.html") {
    const summary = "Use the Purdue Model to discuss operational technology zones, connections, and responsibilities. It is an architecture reference, not a certification; adapt segmentation and remote access decisions to the systems, safety needs, and support arrangements in scope.";
    result = result.replace(/<section class="framework-card source-entry editorial-card" id="purdue-model"[^>]*>/,
      open => open.replace(/\sdata-mobile-summary="[^"]*"/g, "").replace(/>$/, ` data-mobile-summary="${escapeHtml(summary)}">`));
  }
  return result;
}
