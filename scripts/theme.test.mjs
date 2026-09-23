import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { syncAppearance } from "./navigation.mjs";

const script = readFileSync(new URL("../src/site/assets/theme.js", import.meta.url), "utf8");
const key = "cloud-first-color-theme";

function browser({ saved, systemDark = false, loading = false, storageError } = {}) {
  const storage = new Map(saved === undefined ? [] : [[key, saved]]);
  const window = new EventTarget();
  const system = Object.assign(new EventTarget(), { matches: systemDark });
  const button = Object.assign(new EventTarget(), {
    hidden: true,
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); }
  });
  const meta = { content: "#0078d4" };
  const document = Object.assign(new EventTarget(), {
    readyState: loading ? "loading" : "complete",
    documentElement: { dataset: {} },
    querySelector: () => meta,
    querySelectorAll: () => document.readyState === "loading" ? [] : [button]
  });
  const warnings = [];
  window.matchMedia = () => system;
  const localStorage = {
    getItem(name) {
      if (storageError) throw storageError;
      return storage.get(name) ?? null;
    },
    setItem(name, value) {
      if (storageError) throw storageError;
      storage.set(name, value);
    }
  };
  runInNewContext(script, { window, document, localStorage, CustomEvent, DOMException, console: { warn: message => warnings.push(message) } });
  return {
    document, button, storage, warnings, meta,
    theme: () => document.documentElement.dataset.theme,
    click: () => button.dispatchEvent(new Event("click")),
    systemChange(dark) {
      system.matches = dark;
      system.dispatchEvent(new Event("change"));
    },
    storageChange(value) {
      if (value === null) storage.delete(key);
      else storage.set(key, value);
      window.dispatchEvent(Object.assign(new Event("storage"), { key }));
    }
  };
}

test("theme follows the device before a manual choice", () => {
  const page = browser({ systemDark: true });
  assert.equal(page.theme(), "dark");
  assert.equal(page.button.attributes.get("aria-pressed"), "true");
  assert.equal(page.meta.content, "#111827");
  assert.equal(page.button.hidden, false);
  assert.equal(page.storage.size, 0);
  page.systemChange(false);
  assert.equal(page.theme(), "light");
});

test("toggle remembers a manual choice without following later device changes", () => {
  const page = browser({ saved: "light", systemDark: true });
  assert.equal(page.theme(), "light");
  page.click();
  assert.equal(page.theme(), "dark");
  assert.equal(page.storage.get(key), "dark");
  assert.equal(page.button.title, "Switch to light mode");
  page.systemChange(false);
  assert.equal(page.theme(), "dark");
  page.click();
  assert.equal(page.theme(), "light");
  assert.equal(page.storage.get(key), "light");
});

test("theme is applied before the document finishes loading", () => {
  const page = browser({ saved: "dark", loading: true });
  assert.equal(page.theme(), "dark");
  assert.equal(page.button.hidden, true);
  page.document.readyState = "complete";
  page.document.dispatchEvent(new Event("DOMContentLoaded"));
  assert.equal(page.button.hidden, false);
  assert.equal(page.button.attributes.get("aria-pressed"), "true");
});

test("storage changes synchronize tabs and clearing restores the device default", () => {
  const page = browser({ saved: "dark" });
  page.storageChange("light");
  assert.equal(page.theme(), "light");
  page.storageChange(null);
  page.systemChange(true);
  assert.equal(page.theme(), "dark");
});

test("unavailable or invalid storage is reported without disabling the toggle", () => {
  const blocked = browser({ storageError: new DOMException("Blocked", "SecurityError") });
  blocked.click();
  assert.equal(blocked.theme(), "dark");
  assert.equal(blocked.warnings.length, 2);
  const invalid = browser({ saved: "unexpected", systemDark: true });
  assert.equal(invalid.theme(), "dark");
  assert.equal(invalid.warnings.length, 1);
  assert.throws(() => browser({ storageError: new Error("Unexpected storage failure") }), /Unexpected storage failure/);
});

test("appearance assets are ordered and not duplicated by repeated builds", () => {
  const html = '<head><link rel="stylesheet" href="assets/styles.css"><link rel="stylesheet" href="assets/production.css"></head><!-- theme-toggle -->';
  const result = syncAppearance(html);
  assert.equal(syncAppearance(result), result);
  assert(result.indexOf('src="assets/theme.js"') < result.indexOf('href="assets/styles.css"'));
  assert(result.indexOf('href="assets/theme.css"') > result.indexOf('href="assets/production.css"'));
  assert.equal([...result.matchAll(/class="theme-toggle"/g)].length, 1);
});

test("Fluent surfaces and card outlines keep their shared visual contract", () => {
  const css = readFileSync(new URL("../ui/ui.css", import.meta.url), "utf8");
  assert.match(css, /\.react-surface\.fui-FluentProvider\{background-color:transparent\}/);
  assert.match(css, /\.react-surface \.fui-Card\{--fui-Card--border-radius:12px;/);
  assert.match(css, /\.react-surface \.fui-Card::after\{border-color:var\(--line\)\}/);
  for (const [, declarations] of css.matchAll(/\.(?:ai-focus-card|contact-receipt|react-finder-result)\{([^}]+)\}/g)) {
    assert(!/(?:^|;)border-radius:/.test(declarations), "Card radii must use Fluent's token so the clipped outline matches");
  }
  assert(css.includes(".react-surface a:not(.fui-Button)"), "Link rules must not recolor Fluent action buttons");
});

test("mobile service tabs align short and wrapped labels in equal grid cells", () => {
  const css = readFileSync(new URL("../ui/ui.css", import.meta.url), "utf8");
  const mobile = css.split("\n").find(line => line.startsWith("@media(max-width:600px)") && line.includes(".react-service-tabs"));
  assert(mobile);
  assert(mobile.includes("grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr"));
  assert(mobile.includes(".react-service-tabs button{justify-content:start;text-align:left;width:100%}"));
  assert(mobile.includes(".react-service-tabs :is(.fui-Tab__content,.fui-Tab__content--reserved-space){white-space:normal;text-align:left}"));
});
