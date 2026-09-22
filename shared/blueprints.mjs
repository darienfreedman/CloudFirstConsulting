export const blueprints = {
  "security.html": {
    title: "From security signals to an authorized response",
    description: "A reference workflow for aligning detection, investigation, and response responsibilities.",
    steps: [
      ["Collect signals", "Identity, endpoint, application, and cloud telemetry.", "Entra and Defender"],
      ["Correlate activity", "Connect related events and prioritize relevant incidents.", "Defender XDR and Sentinel"],
      ["Investigate", "Review evidence, business impact, and the proposed action.", "Security operations"],
      ["Authorize response", "Apply approved actions and record the outcome.", "Incident and service owners"]
    ],
    note: "Detection coverage, data sources, and response authority are defined for the agreed environment."
  },
  "ai-business.html": {
    title: "A governed path from knowledge to action",
    description: "A reference workflow for a business assistant that uses approved information and integrations.",
    steps: [
      ["Define the task", "Agree on the business purpose and accountable owner.", "Business process"],
      ["Check access", "Use approved sources and the appropriate identity context.", "Identity and knowledge"],
      ["Produce a response", "Ground the result and evaluate usefulness and quality.", "Copilot or a custom solution"],
      ["Review the action", "Apply the approval rules for the intended consequence.", "Business owner"]
    ],
    note: "A drafting assistant and an action-taking workflow need different control and approval decisions."
  },
  "cloud-platforms.html": {
    title: "A platform designed for ongoing operation",
    description: "A reference view of the responsibilities that connect Azure workloads, data, and AI.",
    steps: [
      ["Foundation", "Identity, network architecture, policy, and environment ownership.", "Azure platform"],
      ["Workloads", "Applications and data services with explicit dependencies.", "Azure and Fabric"],
      ["Intelligence", "Approved models, knowledge sources, and integrations.", "Foundry"],
      ["Operations", "Monitoring, recovery, change control, and cost visibility.", "Service ownership"]
    ],
    note: "Security and governance apply across the architecture, not as a final deployment step."
  }
};
