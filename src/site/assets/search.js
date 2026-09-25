"use strict";
// Site search: a keyboard-first dialog that loads its index only when someone opens it.
(() => {
  const root = document.documentElement.dataset.siteRoot || "./";
  const base = new URL(root, location.href);
  const toggles = [...document.querySelectorAll("[data-search-open]")];
  const suggestions = ["AI Security", "Copilot", "Threat protection", "Healthcare", "Engagement options", "Contact"];
  let dialog, input, list, status, entries = null, loading = null, results = [], active = -1;

  toggles.forEach(toggle => {
    toggle.hidden = false;
    toggle.addEventListener("click", () => open());
  });

  const normalize = value => String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ");
  const words = value => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

  function load() {
    if (entries) return Promise.resolve(entries);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("assets/search-index.js", base).href;
      script.onload = () => {
        entries = (window.cfcSearchIndex || []).map(entry => ({ ...entry, title: normalize(entry.t), text: normalize(`${entry.k} ${entry.d} ${entry.w}`) }));
        resolve(entries);
      };
      script.onerror = () => { loading = null; reject(new Error("Search is unavailable right now.")); };
      document.head.append(script);
    });
    return loading;
  }

  function score(entry, terms) {
    let total = 0;
    for (const term of terms) {
      const inTitle = entry.title.indexOf(term);
      if (inTitle === 0) total += 12;
      else if (inTitle > 0) total += /[a-z0-9]/.test(entry.title[inTitle - 1]) ? 5 : 8;
      else if (entry.text.includes(term)) total += 2;
      else return 0;
    }
    if (entry.title === terms.join(" ")) total += 20;
    if (!entry.u.includes("#")) total += 2;
    return total;
  }

  function search(query) {
    const terms = words(query);
    if (!terms.length || !entries) return [];
    return entries.map(entry => ({ entry, value: score(entry, terms) }))
      .filter(match => match.value > 0)
      .sort((a, b) => b.value - a.value || a.entry.t.length - b.entry.t.length)
      .slice(0, 8)
      .map(match => match.entry);
  }

  // Wrap the matched words in <mark> without ever interpreting page text as HTML.
  function highlight(target, text, terms) {
    const lower = normalize(text);
    const ranges = [];
    for (const term of terms) {
      let index = lower.indexOf(term);
      while (index !== -1) { ranges.push([index, index + term.length]); index = lower.indexOf(term, index + term.length); }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start < cursor) continue;
      target.append(text.slice(cursor, start));
      const mark = document.createElement("mark");
      mark.textContent = text.slice(start, end);
      target.append(mark);
      cursor = end;
    }
    target.append(text.slice(cursor));
  }

  function render(query) {
    const terms = words(query);
    results = terms.length ? search(query) : [];
    list.replaceChildren();
    active = results.length ? 0 : -1;
    if (!terms.length) {
      const heading = document.createElement("p");
      heading.className = "search-hint";
      heading.textContent = "Popular searches";
      const chips = document.createElement("div");
      chips.className = "search-suggestions";
      for (const suggestion of suggestions) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.textContent = suggestion;
        chip.addEventListener("click", () => { input.value = suggestion; render(suggestion); input.focus(); });
        chips.append(chip);
      }
      list.append(heading, chips);
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      status.textContent = "";
      return;
    }
    const listbox = document.createElement("ul");
    listbox.id = "search-results";
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-label", "Search results");
    results.forEach((entry, index) => {
      const item = document.createElement("li");
      item.setAttribute("role", "option");
      item.id = `search-result-${index}`;
      const link = document.createElement("a");
      link.href = new URL(entry.u, base).href;
      link.tabIndex = -1;
      const kind = document.createElement("span");
      kind.className = "search-kind";
      kind.textContent = entry.k;
      const title = document.createElement("span");
      title.className = "search-title";
      highlight(title, entry.t, terms);
      link.append(kind, title);
      if (entry.d) {
        const detail = document.createElement("span");
        detail.className = "search-detail";
        detail.textContent = entry.d;
        link.append(detail);
      }
      item.append(link);
      item.addEventListener("mousemove", () => select(index));
      listbox.append(item);
    });
    if (!results.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = `No results for \u201c${query.trim()}\u201d. Try a service, industry, or product name.`;
      list.append(empty);
    } else list.append(listbox);
    input.setAttribute("aria-expanded", results.length ? "true" : "false");
    status.textContent = results.length ? `${results.length} result${results.length === 1 ? "" : "s"}` : "No results";
    select(active);
  }

  function select(index) {
    active = index;
    list.querySelectorAll("[role=option]").forEach((option, position) => option.setAttribute("aria-selected", position === index ? "true" : "false"));
    const option = index >= 0 ? list.querySelector(`#search-result-${index}`) : null;
    if (option) { input.setAttribute("aria-activedescendant", option.id); option.scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  }

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "search-dialog";
    dialog.setAttribute("aria-label", "Search the site");
    dialog.innerHTML = '<div class="search-panel"><div class="search-field"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false" placeholder="Search services, industries, and products" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-label="Search the site"><button class="search-close" type="button" aria-label="Close search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="search-results"></div><p class="search-status sr-only" role="status" aria-live="polite"></p></div>';
    document.body.append(dialog);
    input = dialog.querySelector("input");
    list = dialog.querySelector(".search-results");
    status = dialog.querySelector(".search-status");
    dialog.querySelector(".search-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => document.documentElement.classList.remove("search-open"));
    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); dialog.close(); return; }
      if (event.key === "ArrowDown" && results.length) { event.preventDefault(); select((active + 1) % results.length); }
      else if (event.key === "ArrowUp" && results.length) { event.preventDefault(); select((active - 1 + results.length) % results.length); }
      else if (event.key === "Enter" && active >= 0 && results[active]) {
        event.preventDefault();
        const link = list.querySelector(`#search-result-${active} a`);
        dialog.close();
        location.href = link.href;
      }
    });
  }

  function open(initial = "") {
    if (!("HTMLDialogElement" in window)) { location.href = new URL("resources/", base).href; return; }
    if (!dialog) build();
    if (!dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add("search-open");
    }
    input.value = initial;
    render("");
    input.focus();
    load().then(() => render(input.value)).catch(error => { status.textContent = error.message; });
  }

  document.addEventListener("keydown", event => {
    const typing = event.target.closest?.("input, textarea, select, [contenteditable=true]");
    if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) { event.preventDefault(); dialog?.open ? dialog.close() : open(); }
    else if (event.key === "/" && !typing && !event.altKey && !event.metaKey && !event.ctrlKey) { event.preventDefault(); open(); }
  });
  // Warm the index when someone hovers or focuses the search button, so results feel instant.
  toggles.forEach(toggle => ["pointerenter", "focus"].forEach(type => toggle.addEventListener(type, () => { load().catch(() => {}); }, { once: true })));
})();
