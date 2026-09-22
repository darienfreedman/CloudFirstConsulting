"use strict";

document.documentElement.classList.add("js");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("primary-nav");

if (menuButton && navigation) {
  const header = document.querySelector(".site-header");
  const desktop = window.matchMedia("(min-width: 901px)");
  const groups = [...navigation.querySelectorAll("[data-nav-section]")].map(element => ({
    element,
    trigger: element.querySelector("[data-nav-trigger]"),
    panel: element.querySelector(".nav-panel"),
    fallback: element.querySelector(".nav-fallback")
  }));
  const industrySearch = document.getElementById("nav-industry-search");
  const industryItems = [...document.querySelectorAll("[data-industry-name]")];
  const industryStatus = document.getElementById("nav-industry-status");
  function filterIndustries() {
    const query = industrySearch.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const item of industryItems) {
      item.hidden = !item.dataset.industryName.includes(query);
      if (!item.hidden) count += 1;
    }
    industryStatus.textContent = count ? `${count} ${count === 1 ? "industry" : "industries"}` : "No matching industries. Try another name.";
  }
  function closePanels() {
    for (const group of groups) {
      group.trigger.setAttribute("aria-expanded", "false");
      group.panel.hidden = true;
    }
    industrySearch.value = "";
    filterIndustries();
  }
  function openPanel(group) {
    closePanels();
    group.trigger.setAttribute("aria-expanded", "true");
    group.panel.hidden = false;
  }
  function closeNavigation() {
    closePanels();
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
    document.body.classList.remove("navigation-open");
  }
  for (const group of groups) {
    group.fallback.hidden = true;
    group.trigger.hidden = false;
    group.trigger.addEventListener("click", () => {
      if (group.panel.hidden) openPanel(group);
      else closePanels();
    });
    group.trigger.addEventListener("keydown", event => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      openPanel(group);
      (group.panel.querySelector("input") || group.panel.querySelector("a")).focus();
    });
  }
  industrySearch.addEventListener("input", filterIndustries);
  menuButton.hidden = false;
  menuButton.addEventListener("click", () => {
    if (menuButton.getAttribute("aria-expanded") === "true") { closeNavigation(); return; }
    menuButton.setAttribute("aria-expanded", "true");
    navigation.classList.add("is-open");
    document.body.classList.toggle("navigation-open", !desktop.matches);
  });
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) closeNavigation();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const open = groups.find(group => !group.panel.hidden);
    if (open) { closePanels(); open.trigger.focus(); }
    else if (menuButton.getAttribute("aria-expanded") === "true") { closeNavigation(); menuButton.focus(); }
  });
  document.addEventListener("pointerdown", event => {
    if (!header.contains(event.target)) closeNavigation();
  });
  document.addEventListener("focusin", event => {
    const open = groups.find(group => !group.panel.hidden);
    if (open && !open.element.contains(event.target)) closePanels();
    if (!header.contains(event.target) && menuButton.getAttribute("aria-expanded") === "true") closeNavigation();
  });
  desktop.addEventListener("change", closeNavigation);
}
