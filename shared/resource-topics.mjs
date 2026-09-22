export const technologyTopics = [
  { id: "copilot", title: "Copilot is an AI experience, not a single model.", name: "Copilot experiences", summary: "Understand the difference between models, assistants, and the product experiences that connect them to work." },
  { id: "copilot-model-choice", title: "Multiple models do not mean unrestricted model choice.", name: "Model choice", summary: "Separate model flexibility from product availability, licensing, and administrator controls." },
  { id: "copilot-evaluation", title: "An earlier result is a starting point, not a verdict.", name: "AI evaluation", summary: "Understand what task quality, source relevance, and review effort reveal about an AI experience." },
  { id: "modern-workplace", title: "Connect productivity with employee experience.", name: "Modern work", summary: "See how productivity tools and employee experience support communication, knowledge, and learning." },
  { id: "ai-security", title: "Protect the information and tools AI can reach.", name: "AI Security", summary: "Understand the threats introduced by connected information, identities, and tools." },
  { id: "ai-governance", title: "Define who owns the decisions.", name: "AI Governance", summary: "Distinguish organizational decision rights from the controls that enforce them." },
  { id: "ai-agents", title: "Bound the task before granting the tools.", name: "AI agents", summary: "Compare agents, assistants, and conventional workflows by the steps and actions they can perform." },
  { id: "mcp-servers", title: "Connect tools without bypassing controls.", name: "Model Context Protocol", summary: "Understand how AI applications discover tools and information without treating connectivity as authorization." },
  { id: "orchestration", title: "Coordinate the workflow, not just the model.", name: "Orchestration", summary: "Explore how frameworks coordinate context, tool calls, and handoffs across a workflow." },
  { id: "grounding", title: "Anchor answers in relevant evidence.", name: "Grounded answers", summary: "Learn how retrieved sources inform an answer and why citations alone do not prove correctness." },
  { id: "access-and-data-protection", title: "Limit access and protect information.", name: "Access and data protection", summary: "Separate who can reach information from how supported policies govern its handling." },
  { id: "secure-access", title: "Replace broad network access with deliberate connections.", name: "Secure access", summary: "Distinguish private application access, web protection, identity governance, and networking architecture." },
  { id: "security-operations", title: "Turn security signals into coordinated response.", name: "Security operations", summary: "Connect security signals to investigation and authorized response, rather than collecting alerts without purpose." },
  { id: "mitre-attack", title: "Turn threat intelligence into tested detection coverage.", name: "MITRE ATT&CK and threat intelligence", summary: "Connect Sentinel and Defender XDR signals to adversary behaviors, useful intelligence, and evidence of detection and response." },
  { id: "first-conversation", title: "Start with the outcome and its boundaries.", name: "Scoping a technology project", summary: "Frame a useful first conversation around the outcome, affected people, boundaries, and constraints." }
].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

export const technologyTopicIds = technologyTopics.map(topic => topic.id);

export function migratedTechnologyFragment(fragment) {
  if (["technology-glossary", "technology-glossary-title"].includes(fragment)) return "technology-deep-dives";
  return technologyTopicIds.includes(fragment) ? fragment : null;
}
