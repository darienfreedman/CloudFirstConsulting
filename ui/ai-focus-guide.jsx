import React, { useEffect, useRef, useState } from "react";
import { Card, Field, Select, Tab, TabList } from "@fluentui/react-components";
import { ClipboardTask24Regular, ShieldLock24Regular } from "@fluentui/react-icons";
import { createCarouselController } from "../src/site/assets/carousel.js";
import { useMobileLayout } from "./use-mobile-layout.js";
import { CarouselPagination } from "./carousel-pagination.jsx";

export const aiPriorities = {
  copilot: {
    label: "We're adopting AI",
    introduction: "Start with the information people can access and the uses your business is ready to support.",
    security: "Review access to sensitive files, identify oversharing, and check that AI use follows the intended data boundaries.",
    governance: "Agree on approved uses, responsible owners, and the checks needed before extending the rollout."
  },
  agents: {
    label: "We're building AI agents",
    introduction: "Understand what each agent can read, which business tools it can use, and when an action needs approval.",
    security: "Review Model Context Protocol servers and tool permissions, and test how the agent handles harmful instructions in documents or tool results.",
    governance: "Define who approves integrations and how orchestration frameworks coordinate handoffs, exceptions, and human review."
  },
  scale: {
    label: "We're expanding AI use",
    introduction: "Keep visibility and accountability as more teams, applications, and tools become involved.",
    security: "Monitor identity, data, and application risks across deployments, then address gaps in the controls that protect them.",
    governance: "Maintain an AI inventory, review changes, evaluate releases, and keep ownership and exception decisions current."
  }
};

const topics = [
  { key: "security", label: "AI Security", href: "security.html#ai-security", Icon: ShieldLock24Regular },
  { key: "governance", label: "AI Governance", href: "security.html#ai-governance", Icon: ClipboardTask24Regular }
];

export function AIFocusGuide({ pageLink }) {
  const [selected, setSelected] = useState("copilot");
  const [card, setCard] = useState(0);
  const mobile = useMobileLayout();
  const track = useRef(null);
  const controller = useRef(null);
  const priority = aiPriorities[selected];

  useEffect(() => {
    if (!mobile) return;
    controller.current = createCarouselController(track.current, { onChange: index => setCard(index) });
    return () => controller.current.destroy();
  }, [mobile]);

  return <div className={`react-ai-focus${mobile ? " ai-focus-carousel" : ""}`}>
    <div className="section-heading"><div><p className="eyebrow">Your AI starting point</p><h2>Move AI forward.<br />Keep control.</h2></div>{!mobile && <p>Choose where you are in your AI journey.</p>}</div>
    {mobile ? <Field className="ai-journey-field" label={{ children: "Your AI journey", htmlFor: "ai-journey", id: "ai-journey-label" }}>
      <Select id="ai-journey" size="large" value={selected} aria-controls="ai-focus-panel" onChange={event => setSelected(event.target.value)}>
        {Object.entries(aiPriorities).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
      </Select>
    </Field> : <TabList selectedValue={selected} onTabSelect={(_, data) => setSelected(data.value)} size="large" className="ai-priority-tabs" aria-label="Your AI priority">
      {Object.entries(aiPriorities).map(([key, value]) => <Tab key={key} id={`ai-priority-${key}`} value={key} data-ai-priority={key} aria-controls="ai-focus-panel">{value.label}</Tab>)}
    </TabList>}
    <div id="ai-focus-panel" role={mobile ? "region" : "tabpanel"} aria-labelledby={mobile ? "ai-journey-label" : `ai-priority-${selected}`}>
      <p className="ai-focus-introduction" aria-live="polite">{priority.introduction}</p>
      <div role={mobile ? "region" : undefined} aria-roledescription={mobile ? "carousel" : undefined} aria-label={mobile ? "AI Security and Governance guidance" : undefined}>
        {mobile && <div className="service-area-choices ai-focus-choices" role="group" aria-label="Choose an AI topic">
          {topics.map((topic, index) => <button key={topic.key} type="button" aria-pressed={card === index} aria-controls="ai-focus-track" onClick={() => controller.current.moveTo(index)}>{topic.label}</button>)}
        </div>}
        <div id="ai-focus-track" className={`ai-focus-cards${mobile ? " service-carousel-track" : ""}`} ref={track}
          tabIndex={mobile ? 0 : undefined} aria-label={mobile ? "AI guidance cards. Swipe or choose a pagination dot." : undefined}>
          {topics.map(({ key, label, href, Icon }, index) => <article key={key} className="ai-focus-slide"
            aria-roledescription={mobile ? "slide" : undefined}
            aria-label={mobile ? `${index + 1} of ${topics.length}: ${label}` : undefined}
            {...(mobile && card !== index ? { inert: "" } : {})}>
            <Card appearance="outline" className="ai-focus-card">
            <span className="capability-icon"><Icon aria-hidden="true" /></span>
            <h3>{label}</h3><p>{priority[key]}</p><a className="text-link" href={pageLink(href)}>Explore {label}</a>
            </Card>
          </article>)}
        </div>
        {mobile && <CarouselPagination labels={topics.map(topic => topic.label)} selected={card}
          onSelect={index => controller.current.moveTo(index)} trackId="ai-focus-track" label="Choose an AI guidance card" />}
      </div>
      <a className="text-link ai-focus-explainer" href={pageLink("technology-explained.html")}>{mobile ? "AI tools and agents explained" : "Connected tools, AI agents, and orchestration explained"}</a>
    </div>
  </div>;
}
