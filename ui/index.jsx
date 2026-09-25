import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button, Card, Checkbox, Dropdown, Field, FluentProvider, Input,
  MessageBar, MessageBarBody, Option, Select, Spinner, Tab, TabList,
  Textarea, ToggleButton, webDarkTheme, webLightTheme
} from "@fluentui/react-components";
import { serviceOptions, validateInquiry } from "../shared/inquiry.mjs";
import { microsoftFormsUrls } from "../shared/forms.mjs";
import { industryGroups } from "../shared/industry-groups.mjs";
import { pageHref, localContactEndpoint } from "../shared/urls.mjs";
import { MobileServiceExplorer } from "./service-carousel.jsx";
import { AIFocusGuide } from "./ai-focus-guide.jsx";
import { useMobileLayout } from "./use-mobile-layout.js";
import { serviceAreas, serviceAreaByKey } from "../shared/services.mjs";
import "./ui.css";

const pageLink = value => pageHref(value, document.documentElement.dataset.siteRoot);

const brandFont = '"Inter", "Inter Fallback", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const theme = {
  ...webLightTheme,
  fontFamilyBase: brandFont,
  fontSizeBase200: "14px",
  lineHeightBase200: "20px",
  fontSizeBase300: "16px",
  lineHeightBase300: "24px",
  fontSizeBase400: "18px",
  lineHeightBase400: "26px",
  colorBrandBackground: "#0078d4",
  colorBrandBackgroundHover: "#106ebe",
  colorBrandBackgroundPressed: "#005a9e",
  colorBrandForeground1: "#005a9e",
  colorBrandForegroundLink: "#005a9e",
  colorBrandForegroundLinkHover: "#004578",
  colorBrandStroke1: "#0078d4",
  colorBrandBackground2: "#eff6fc",
  colorCompoundBrandBackground: "#0078d4",
  colorCompoundBrandBackgroundHover: "#106ebe"
};

const darkTheme = {
  ...webDarkTheme,
  fontFamilyBase: brandFont,
  fontSizeBase200: theme.fontSizeBase200,
  lineHeightBase200: theme.lineHeightBase200,
  fontSizeBase300: theme.fontSizeBase300,
  lineHeightBase300: theme.lineHeightBase300,
  fontSizeBase400: theme.fontSizeBase400,
  lineHeightBase400: theme.lineHeightBase400,
  colorNeutralBackground1: "#182234",
  colorNeutralBackground2: "#1f2b3d",
  colorNeutralBackground3: "#263449",
  colorNeutralBackground1Hover: "#1f2b3d",
  colorNeutralBackground1Pressed: "#263449",
  colorNeutralBackground1Selected: "#263449",
  colorNeutralBackground2Hover: "#263449",
  colorNeutralBackground2Pressed: "#304159",
  colorNeutralBackground2Selected: "#304159",
  colorSubtleBackgroundHover: "#1f2b3d",
  colorSubtleBackgroundPressed: "#263449",
  colorSubtleBackgroundSelected: "#263449",
  colorNeutralForeground1: "#edf2f7",
  colorNeutralForeground2: "#bcc8d7",
  colorNeutralForeground3: "#a9bdd1",
  colorNeutralForeground1Hover: "#edf2f7",
  colorNeutralForeground1Pressed: "#edf2f7",
  colorNeutralForeground1Selected: "#edf2f7",
  colorNeutralForeground2Hover: "#edf2f7",
  colorNeutralForeground2Pressed: "#edf2f7",
  colorNeutralForeground2Selected: "#edf2f7",
  colorNeutralForegroundOnBrand: "#ffffff",
  colorNeutralStroke1: "#657892",
  colorBrandBackground: "#0078d4",
  colorBrandBackgroundHover: "#106ebe",
  colorBrandBackgroundPressed: "#005a9e",
  colorBrandForeground1: "#80caff",
  colorBrandForegroundLink: "#80caff",
  colorBrandForegroundLinkHover: "#b6dcfe",
  colorBrandStroke1: "#80caff",
  colorBrandBackground2: "#1e354d",
  colorCompoundBrandBackground: "#0078d4",
  colorCompoundBrandBackgroundHover: "#106ebe",
  colorCompoundBrandForeground1: "#80caff"
};

function SiteThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  useEffect(() => {
    const update = () => setDark(document.documentElement.dataset.theme === "dark");
    update();
    window.addEventListener("cloud-first:themechange", update);
    return () => window.removeEventListener("cloud-first:themechange", update);
  }, []);
  return <FluentProvider theme={dark ? darkTheme : theme} className="react-surface">{children}</FluentProvider>;
}

function mount(element, content) {
  if (!element) return;
  element.hidden = false;
  createRoot(element).render(<SiteThemeProvider>{content}</SiteThemeProvider>);
}

const emptyInquiry = { name: "", email: "", company: "", service: "", message: "", consent: false };

function ContactExperience() {
  const configured = window.cloudFirstIntegrations?.contactFormUrl;
  if (!configured) return <ContactForm />;
  const form = microsoftFormsUrls(configured);
  if (!form) return (
    <Card className="contact-receipt" appearance="outline">
      <h2>Tell us about your project</h2>
      <p>Open our contact form to send your inquiry.</p>
      <Button as="a" href={configured} appearance="primary" rel="noreferrer">Open contact form</Button>
    </Card>
  );
  return (
    <section className="microsoft-contact-form" aria-label="Contact inquiry">
      <iframe
        id="microsoft-contact-frame"
        className="microsoft-form-frame"
        src={form.embedUrl}
        title="Contact Cloud First Consulting"
        referrerPolicy="no-referrer"
        allowFullScreen
      />
    </section>
  );
}

function submissionEndpoint() {
  const configured = window.cloudFirstIntegrations?.contactEndpoint;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("The contact service is temporarily unavailable.");
    return url.href;
  }
  if (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) {
    return localContactEndpoint(window.location.href, document.documentElement.dataset.siteRoot);
  }
  throw new Error("The contact service is temporarily unavailable. Please try again later.");
}

function ContactForm() {
  const [values, setValues] = useState(emptyInquiry);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const form = useRef(null);
  const result = useRef(null);
  const selectedService = serviceOptions.find(([value]) => value === values.service)?.[1] || "";
  const change = (key, value) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    if (state === "invalid" || state === "error") setState("idle");
  };
  useEffect(() => {
    if (state === "invalid") form.current?.querySelector('[aria-invalid="true"]')?.focus();
    if (state === "sent") result.current?.focus();
  }, [state]);

  async function submit(event) {
    event.preventDefault();
    if (state === "sending") return;
    const validation = validateInquiry(values);
    setErrors(validation.errors);
    if (!validation.data) { setState("invalid"); return; }
    setState("sending");
    setMessage("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(submissionEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
        signal: controller.signal,
        credentials: "omit"
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("We could not receive your inquiry. Please try again later.");
      }
      const receipt = await response.json();
      if (!response.ok) {
        if (receipt.fields && typeof receipt.fields === "object") {
          const fieldErrors = {};
          for (const key of Object.keys(emptyInquiry)) {
            if (typeof receipt.fields[key] === "string") fieldErrors[key] = receipt.fields[key];
          }
          setErrors(fieldErrors);
        }
        throw new Error(typeof receipt.error === "string" ? receipt.error : "We could not receive your inquiry. Please try again.");
      }
      if (receipt.ok !== true || typeof receipt.reference !== "string" || !/^[a-f0-9-]{36}$/i.test(receipt.reference)) {
        throw new Error("We could not confirm receipt of your inquiry. Please try again later.");
      }
      setReference(receipt.reference);
      setValues(emptyInquiry);
      setState("sent");
    } catch (error) {
      setMessage(error.name === "AbortError" ? "The request took too long. Please try again." : error.message || "The contact service is temporarily unavailable.");
      setState("error");
    } finally {
      clearTimeout(timeout);
    }
  }

  if (state === "sent") return (
    <Card className="contact-receipt" appearance="outline">
      <h2 tabIndex={-1} ref={result}>Thank you for getting in touch.</h2>
      <p>Your inquiry has been received.</p>
      <p className="receipt-reference">Reference <code>{reference}</code></p>
      <Button appearance="primary" onClick={() => { setReference(""); setErrors({}); setState("idle"); }}>Send another inquiry</Button>
    </Card>
  );

  return (
    <form ref={form} id="contact-form" className="react-contact-form" onSubmit={submit} noValidate>
      <div className="contact-form-heading"><h2>Tell us about your project</h2><p>Fields marked with an asterisk are required.</p></div>
      {state === "error" && <MessageBar intent="error" role="alert" className="form-message"><MessageBarBody>{message}</MessageBarBody></MessageBar>}
      <div className="react-form-grid">
        <Field label={{ children: "Full name", htmlFor: "contact-name" }} required validationState={errors.name ? "error" : "none"} validationMessage={errors.name}>
          <Input id="contact-name" name="name" autoComplete="name" maxLength={100} size="large" value={values.name} onChange={(_, data) => change("name", data.value)} />
        </Field>
        <Field label={{ children: "Work email", htmlFor: "contact-email" }} required validationState={errors.email ? "error" : "none"} validationMessage={errors.email}>
          <Input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} size="large" value={values.email} onChange={(_, data) => change("email", data.value)} />
        </Field>
        <Field label={{ children: "Company", htmlFor: "contact-company" }} validationState={errors.company ? "error" : "none"} validationMessage={errors.company}>
          <Input id="contact-company" name="company" autoComplete="organization" maxLength={150} size="large" value={values.company} onChange={(_, data) => change("company", data.value)} />
        </Field>
        <Field label={{ children: "Service interest", id: "contact-service-label", htmlFor: "contact-service" }} required validationState={errors.service ? "error" : "none"} validationMessage={errors.service}>
          <Dropdown button={{ id: "contact-service", "aria-labelledby": "contact-service-label" }} placeholder="Choose a service area" size="large" value={selectedService} selectedOptions={values.service ? [values.service] : []} onOptionSelect={(_, data) => change("service", data.optionValue)}>
            {serviceOptions.map(([value, label]) => <Option key={value} value={value}>{label}</Option>)}
          </Dropdown>
        </Field>
      </div>
      <Field label={{ children: "What would you like to achieve?", htmlFor: "contact-message" }} required validationState={errors.message ? "error" : "none"} validationMessage={errors.message} hint="Describe the project at a high level. Do not include credentials or confidential records.">
        <Textarea id="contact-message" name="message" rows={6} maxLength={3000} resize="vertical" size="large" value={values.message} onChange={(_, data) => change("message", data.value)} />
      </Field>
      <Field validationState={errors.consent ? "error" : "none"} validationMessage={errors.consent}>
        <Checkbox id="contact-consent" name="consent" checked={values.consent} onChange={(_, data) => change("consent", data.checked === true)} label={<>I agree that Cloud First Consulting may use these details to respond to my inquiry. <a href={pageLink("trust.html")}>Privacy information</a></>} />
      </Field>
      <div className="react-form-actions">
        <Button appearance="primary" size="large" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending inquiry" : "Send inquiry"}</Button>
        {state === "sending" && <Spinner size="tiny" label="Sending" />}
        <Button appearance="subtle" type="button" disabled={state === "sending"} onClick={() => { setValues(emptyInquiry); setErrors({}); setMessage(""); setState("idle"); }}>Clear</Button>
      </div>
    </form>
  );
}

function CatalogControls({ element, controls, cards, filters, groups, originalStatus }) {
  const [query, setQuery] = useState("");
  const initialIndustryGroup = () => element.dataset.catalog === "industry"
    ? industryGroups.find(group => `#${group.id}` === window.location.hash) : undefined;
  const [category, setCategory] = useState(() => initialIndustryGroup()?.title || "all");
  useEffect(() => {
    const reveal = event => {
      if (!element.contains(event.detail)) return;
      setQuery("");
      setCategory("all");
    };
    document.addEventListener("cloud-first:catalog-reveal", reveal);
    return () => document.removeEventListener("cloud-first:catalog-reveal", reveal);
  }, [element]);
  useEffect(() => {
    if (element.dataset.catalog !== "industry") return;
    const followGroup = () => {
      const group = industryGroups.find(group => `#${group.id}` === window.location.hash);
      if (group) {
        setQuery("");
        setCategory(group.title);
        requestAnimationFrame(() => document.getElementById(group.id)?.scrollIntoView());
      }
    };
    const followSameGroup = event => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const url = new URL(link.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash === window.location.hash) {
        followGroup();
      }
    };
    window.addEventListener("hashchange", followGroup);
    document.addEventListener("click", followSameGroup);
    return () => {
      window.removeEventListener("hashchange", followGroup);
      document.removeEventListener("click", followSameGroup);
    };
  }, [element]);
  const units = { industry: ["industry", "industries"], brief: ["brief", "briefs"], "use-case": ["use case", "use cases"] }[element.dataset.catalog];
  useEffect(() => {
    let count = 0;
    const term = query.trim().toLocaleLowerCase();
    for (const card of cards) {
      const visible = (category === "all" || card.dataset.category === category) && card.dataset.search.toLocaleLowerCase().includes(term);
      card.hidden = !visible;
      if (visible) count++;
    }
    for (const group of groups) group.hidden = !group.querySelector(".catalog-card:not([hidden])");
    element.querySelector("#catalog-empty").hidden = count !== 0;
    element.querySelector("#catalog-status").textContent = !term && category === "all" ? originalStatus : `${count} ${units[count === 1 ? 0 : 1]} match your selection.`;
  }, [query, category, element, cards, groups, originalStatus, units]);
  const filtered = query.trim() !== "" || category !== "all";
  return <div className="react-catalog-controls">
    <Field label={{ children: controls.label, htmlFor: "catalog-search" }} className="react-catalog-search"><Input id="catalog-search" type="search" size="large" placeholder={element.dataset.catalog === "brief" ? "Topic or technology" : "Topic, product, or framework"} value={query} onChange={(_, data) => setQuery(data.value)} /></Field>
    <div className="react-filter-group" role="group" aria-label="Filter catalog">{filters.map(filter => <ToggleButton key={filter.value} data-filter={filter.value} appearance={category === filter.value ? "primary" : "secondary"} checked={category === filter.value} onClick={() => setCategory(filter.value)}>{filter.label}</ToggleButton>)}</div>
    <Field label={{ children: element.dataset.catalog === "industry" ? "Industry group" : "Service area", htmlFor: "mobile-catalog-category" }} className="mobile-catalog-filter"><Select id="mobile-catalog-category" value={category} onChange={event => setCategory(event.target.value)}>{filters.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</Select></Field>
    {filtered && <Button id="catalog-clear" appearance="subtle" onClick={() => { setQuery(""); setCategory("all"); document.getElementById("catalog-search").focus(); }}>Clear filters</Button>}
  </div>;
}

function ServicesControls({ sections }) {
  const [selected, setSelected] = useState("all");
  const mobile = useMobileLayout();
  const choices = [["all", "All services"], ...serviceAreas.map(area => [area.key, area.label])];
  useEffect(() => {
    for (const [key, section] of sections) section.hidden = selected !== "all" && selected !== key;
    const panel = document.getElementById("service-directory");
    panel.hidden = mobile;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `service-tab-${selected}`);
  }, [selected, sections, mobile]);
  if (mobile) {
    const headlines = ["Protect what matters.", "Make room for better work.", "Build for your next chapter."];
    const areas = [...sections].map(([key, section], index) => ({
      key, headline: headlines[index],
      // Tabs share a row on phones, so long area names use their first words.
      shortLabel: serviceAreaByKey[key].label.replace(/ Solutions$/, ""),
      label: serviceAreaByKey[key].label,
      description: section.dataset.mobileSummary,
      href: section.querySelector(".button").href,
      cta: serviceAreaByKey[key].cta,
      links: [...section.querySelectorAll("nav a")].map(link => ({
        href: link.href, label: link.childNodes[0].textContent.trim()
      }))
    }));
    return <MobileServiceExplorer areas={areas} />;
  }
  return <TabList selectedValue={selected} onTabSelect={(_, data) => setSelected(data.value)} size="large" className="react-service-tabs" aria-label="Service areas">
    {choices.map(([value, label]) => <Tab id={`service-tab-${value}`} key={value} value={value} data-service-filter={value} aria-controls="service-directory">{label}</Tab>)}
  </TabList>;
}

const priorities = {
  security: ["Security", "security-plan", "exposure, identity, device protection, and response readiness"],
  data: ["Data protection and Copilot", "data-plan", "information access, protection policies, and Copilot readiness"],
  ai: ["AI strategy and governance", "ai-plan", "use cases, ownership, integrations, and evaluation"],
  cloud: [serviceAreaByKey.cloud.label, "cloud-plan", "application dependencies, platform design, data, and operations"]
};
const stages = {
  assess: ["Understand our needs", "Start with an assessment", "Establish the current state, identify gaps, and agree on priorities."],
  implement: ["Plan implementation", "Define an implementation scope", "Agree on the target design, dependencies, approvals, and acceptance criteria."],
  improve: ["Improve an existing solution", "Plan an improvement review", "Review performance, unresolved risks, operational ownership, and the next improvement backlog."]
};

function EngagementFinder() {
  const [goal, setGoal] = useState("security");
  const [stage, setStage] = useState("assess");
  const [selection, setSelection] = useState(null);
  useEffect(() => {
    document.querySelectorAll(".engagement-card").forEach(card => card.classList.toggle("is-recommended", !!selection && card.id === priorities[selection.goal][1]));
    if (selection) document.getElementById("finder-result-title").focus();
  }, [selection]);
  return <div className="react-finder">
    <h2>Find a useful starting point</h2><p>Choose your priority and where you are in the project.</p>
    <div className="react-form-grid">
      <Field label={{ children: "Main priority", htmlFor: "finder-goal" }}><Select id="finder-goal" size="large" value={goal} onChange={event => { setGoal(event.target.value); setSelection(null); }}>{Object.entries(priorities).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
      <Field label={{ children: "Project stage", htmlFor: "finder-stage" }}><Select id="finder-stage" size="large" value={stage} onChange={event => { setStage(event.target.value); setSelection(null); }}>{Object.entries(stages).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
    </div>
    <div className="react-form-actions"><Button id="finder-submit" appearance="primary" size="large" onClick={() => setSelection({ goal, stage })}>Find an engagement</Button><Button id="finder-reset" appearance="subtle" onClick={() => { setGoal("security"); setStage("assess"); setSelection(null); }}>Reset</Button></div>
    {selection && <Card id="finder-result" appearance="outline" className="react-finder-result"><h3 id="finder-result-title" tabIndex={-1}>{stages[selection.stage][1]}</h3><p>{priorities[selection.goal][0]}: focus on {priorities[selection.goal][2]}. {stages[selection.stage][2]}</p><a className="text-link" id="finder-result-link" href={`#${priorities[selection.goal][1]}`}>Read the engagement outline</a></Card>}
  </div>;
}

mount(document.querySelector("[data-react-contact]"), <ContactExperience />);
mount(document.querySelector("[data-react-ai-focus]"), <AIFocusGuide pageLink={pageLink} />);
const catalog = document.querySelector("[data-catalog]");
if (catalog) {
  const target = catalog.querySelector("[data-catalog-controls]");
  const props = {
    element: catalog,
    controls: { label: target.querySelector("label").textContent },
    cards: [...catalog.querySelectorAll(".catalog-card")],
    filters: [...target.querySelectorAll("[data-filter]")].map(button => ({ value: button.dataset.filter, label: button.textContent })),
    groups: [...catalog.querySelectorAll("[data-catalog-group]")],
    originalStatus: catalog.querySelector("#catalog-status").textContent
  };
  mount(target, <CatalogControls {...props} />);
}
const services = document.querySelector("[data-service-controls]");
if (services) mount(services, <ServicesControls sections={new Map([
  ["security", document.getElementById("security-heading").closest("section")],
  ["business", document.getElementById("business-heading").closest("section")],
  ["cloud", document.getElementById("platforms-heading").closest("section")]
])} />);
mount(document.querySelector("[data-engagement-finder]"), <EngagementFinder />);
