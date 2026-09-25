import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const script = readFileSync(new URL("../src/site/assets/app.js", import.meta.url), "utf8");

test("scroll offsets track sticky headers without reserving space for a flowing contact header", () => {
  for (const position of ["sticky", "relative"]) {
    const properties = new Map();
    const header = { getBoundingClientRect: () => ({ height: 76 }) };
    vm.runInNewContext(script, {
      document: {
        documentElement: { classList: { add() {} }, style: { setProperty: (key, value) => properties.set(key, value) } },
        querySelector: selector => selector === ".site-header" ? header : null,
        querySelectorAll: () => [], getElementById: () => null, addEventListener() {}
      },
      window: { location: { hash: "" }, addEventListener() {} },
      getComputedStyle: () => ({ position }),
      ResizeObserver: class { observe(element) { assert.equal(element, header); } }
    });
    assert.equal(properties.get("--header-height"), "76px");
    assert.equal(properties.get("--header-scroll-offset"), position === "sticky" ? "76px" : "0px");
  }
});

function fixture(hash = "#entra") {
  const events = { window: new Map(), document: new Map() };
  const cards = new Map([
    ["entra", "product-entry"], ["purview", "product-entry"], ["ai-security", "editorial-card"],
    ["insights", "resource-hub-group"], ["identity", "practice"], ["business-services", "catalog-group"],
    ["product-group", "product-guide-group"], ["main", ""], ["use-case-1", "use-case"],
    ["darien-profile", "personal-profile"]
  ].map(([id, className]) => {
    const classes = new Set([className]);
    const card = { classList: {
      add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value)
    }, scrollIntoView: options => { card.scrolled = options; } };
    card.closest = selector => selector.split(", ").some(value => classes.has(value.slice(1))) ? card : null;
    return [id, card];
  }));
  const heading = { closest: selector => cards.get("product-group").closest(selector), scrollIntoView: options => { heading.scrolled = options; } };
  const profileHeading = { closest: selector => cards.get("darien-profile").closest(selector), scrollIntoView() { throw new Error("Scroll to the full profile, not the heading"); } };
  const location = new URL(`https://demo.github.io/demo/sources/${hash}`);
  const document = {
    hidden: false,
    documentElement: { classList: { add() {} } },
    querySelector: () => null,
    querySelectorAll: selector => selector === "[data-resource-fragment]" ? [] : [...cards.values()].filter(card => card.classList.contains("is-highlighted")),
    getElementById: id => id === "darien-title" ? profileHeading : id === "product-group-0" ? heading : cards.get(id) || null,
    addEventListener: (name, callback) => events.document.set(name, callback)
  };
  const warnings = [];
  vm.runInNewContext(script, {
    document, window: { location, addEventListener: (name, callback) => events.window.set(name, callback) },
    URL, console: { warn: message => warnings.push(message) }, requestAnimationFrame: callback => callback()
  });
  return { cards, heading, document, location, warnings, emit: (scope, name, event) => events[scope].get(name)?.(event) };
}

test("linked products highlight exactly one card and follow changed fragments", () => {
  const f = fixture();
  assert(f.cards.get("entra").classList.contains("is-highlighted"));
  f.location.hash = "#purview";
  f.emit("window", "hashchange");
  assert(!f.cards.get("entra").classList.contains("is-highlighted"));
  assert(f.cards.get("purview").classList.contains("is-highlighted"));
  f.location.hash = "#unknown";
  f.emit("window", "hashchange");
  assert(!f.cards.get("purview").classList.contains("is-highlighted"));
});

test("new and legacy profile links scroll to the whole profile above the portrait", () => {
  for (const id of ["darien-profile", "darien-title"]) {
    const f = fixture(`#${id}`);
    f.emit("window", "load");
    assert.equal(f.cards.get("darien-profile").scrolled.block, "start");
    assert.equal(f.cards.get("darien-profile").scrolled.behavior, "instant");
    f.emit("window", "hashchange");
    f.emit("document", "click", { target: { closest: () => ({ href: f.location.href, hasAttribute: () => false }) } });
    assert(!f.cards.get("darien-profile").classList.contains("is-highlighted"));
  }
});

test("switching tabs clears the product highlight without restoring it on return", () => {
  const f = fixture();
  f.document.hidden = true;
  f.emit("document", "visibilitychange");
  assert(!f.cards.get("entra").classList.contains("is-highlighted"));
  f.document.hidden = false;
  f.emit("document", "visibilitychange");
  assert(!f.cards.get("entra").classList.contains("is-highlighted"));
  f.emit("document", "click", { target: { closest: () => ({ href: f.location.href, hasAttribute: () => false }) } });
  assert(f.cards.get("entra").classList.contains("is-highlighted"));
  f.emit("window", "pagehide");
  assert(!f.cards.get("entra").classList.contains("is-highlighted"));
});

test("unknown and malformed fragments do not highlight arbitrary cards", () => {
  const f = fixture("#%broken");
  assert.equal(f.warnings.length, 1);
  assert([...f.cards.values()].every(card => !card.classList.contains("is-highlighted")));
});

test("resource cards keep their highlight while service and navigation sections only scroll", () => {
  const f = fixture();
  for (const id of ["ai-security", "insights", "identity", "business-services", "use-case-1"]) {
    f.location.hash = `#${id}`;
    f.emit("window", "hashchange");
    const highlighted = id === "ai-security";
    assert.equal(f.cards.get(id).classList.contains("is-highlighted"), highlighted, id);
    assert.equal(f.cards.get(id).scrolled.block, "start", id);
    assert.equal([...f.cards.values()].filter(card => card.classList.contains("is-highlighted")).length, highlighted ? 1 : 0);
  }
  f.location.hash = "#main";
  f.emit("window", "hashchange");
  assert([...f.cards.values()].every(card => !card.classList.contains("is-highlighted")));
});

test("group headings jump without outlining their panel and initial jumps honor scroll offsets", () => {
  const f = fixture("#product-group-0");
  assert(!f.cards.get("product-group").classList.contains("is-highlighted"));
  f.emit("window", "load");
  assert.equal(f.heading.scrolled.block, "start");
  assert.equal(f.heading.scrolled.behavior, "instant");
  const card = fixture("#ai-security");
  card.emit("window", "load");
  assert.equal(card.cards.get("ai-security").scrolled.block, "start");
});

test("modified clicks and new-tab links do not restore the current page highlight", () => {
  const f = fixture("#ai-security");
  f.emit("window", "pagehide");
  for (const props of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    f.emit("document", "click", { ...props, target: { closest: () => ({ href: f.location.href, hasAttribute: () => false }) } });
    assert(!f.cards.get("ai-security").classList.contains("is-highlighted"));
  }
  f.emit("document", "click", { target: { closest: () => ({ href: f.location.href, target: "_blank", hasAttribute: () => false }) } });
  assert(!f.cards.get("ai-security").classList.contains("is-highlighted"));
});

test("clicking the current fragment realigns its panel after menus close", () => {
  const f = fixture("#identity");
  const card = f.cards.get("identity");
  f.emit("document", "click", { target: { closest: () => ({ href: f.location.href, hasAttribute: () => false }) } });
  assert.equal(card.scrolled.block, "start");
  assert.equal(card.scrolled.behavior, "instant");
  assert(!card.classList.contains("is-highlighted"));
});

test("explicit published index.html URLs canonicalize without changing source previews", () => {
  for (const siteRoot of ["../", undefined]) {
    let redirected;
    const href = "https://demo.github.io/project/security/index.html?from=bookmark#identity";
    vm.runInNewContext(script, {
      URL, document: {
        documentElement: { dataset: { siteRoot }, classList: { add() {} } },
        querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}
      }, window: { location: {
        href, pathname: "/project/security/index.html", hash: "#identity",
        replace: value => { redirected = value; }
      }, addEventListener() {} }
    });
    assert.equal(redirected, siteRoot === undefined ? undefined : "https://demo.github.io/project/security/?from=bookmark#identity");
  }
});
