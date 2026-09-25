import { attachSheetDrag } from "./sheet-drag.js";

let activeSheet;

export function closeMobileDetails() {
  activeSheet?.close();
}

export function showMobileDetails({ title, nodes, trigger, expandDetails = false }) {
  closeMobileDetails();
  const dialog = document.createElement("dialog");
  dialog.className = "mobile-detail-sheet";
  dialog.setAttribute("aria-label", title);
  const heading = document.createElement("div");
  heading.className = "mobile-sheet-heading";
  const name = document.createElement("h2");
  name.textContent = title;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mobile-sheet-close";
  button.setAttribute("aria-label", "Close");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  const lines = document.createElementNS(icon.namespaceURI, "path");
  lines.setAttribute("d", "m6 6 12 12M18 6 6 18");
  icon.append(lines);
  button.append(icon);
  button.autofocus = true;
  heading.append(name, button);
  const body = document.createElement("div");
  body.className = "mobile-sheet-body";
  const positions = nodes.map(node => {
    const marker = document.createComment("mobile-sheet-content");
    node.before(marker);
    const open = node instanceof HTMLDetailsElement ? node.open : undefined;
    if (open !== undefined) node.open = true;
    body.append(node);
    return { node, marker, open };
  });
  const sections = [];
  if (expandDetails) {
    for (const details of body.querySelectorAll("details")) {
      const summary = details.querySelector(":scope > summary");
      const section = document.createElement("section");
      section.className = "mobile-sheet-section";
      // Service detail content already has its own scope, deliverable and next-step headings.
      if (summary && !details.querySelector(":scope > .practice-detail")) {
        const heading = document.createElement("h3");
        heading.textContent = summary.textContent;
        section.append(heading);
      }
      const children = [...details.childNodes].filter(node => node !== summary);
      section.append(...children);
      details.replaceWith(section);
      sections.push({ details, section, children });
    }
  }
  dialog.append(heading, body);
  document.body.append(dialog);
  const oldOverflow = document.body.style.overflow;
  const oldPadding = document.body.style.paddingRight;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
  document.body.style.overflow = "hidden";
  const desktop = window.matchMedia("(min-width: 901px)");
  const detachDrag = attachSheetDrag(heading, dialog, close);
  let closed = false;
  function finish() {
    if (closed) return;
    closed = true;
    detachDrag();
    for (const { details, section, children } of [...sections].reverse()) {
      details.append(...children);
      section.replaceWith(details);
    }
    for (const { node, marker, open } of positions) {
      if (open !== undefined) node.open = open;
      marker.replaceWith(node);
    }
    document.body.style.overflow = oldOverflow;
    document.body.style.paddingRight = oldPadding;
    dialog.remove();
    window.removeEventListener("beforeprint", close);
    desktop.removeEventListener("change", onDesktop);
    if (activeSheet?.dialog === dialog) activeSheet = undefined;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
  function close() {
    if (dialog.open) dialog.close();
    finish();
  }
  function onDesktop(event) { if (event.matches) close(); }
  button.addEventListener("click", close);
  dialog.addEventListener("close", finish);
  dialog.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (link && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
      && (!link.target || link.target === "_self") && !link.hasAttribute("download")) {
      close();
      return;
    }
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) close();
  });
  window.addEventListener("beforeprint", close);
  desktop.addEventListener("change", onDesktop);
  activeSheet = { dialog, close };
  dialog.showModal();
  return activeSheet;
}
