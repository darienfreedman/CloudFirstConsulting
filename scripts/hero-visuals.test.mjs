import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { scenePages, sceneFor, compassScene } from "./scene-visuals.mjs";
import { practiceScenes, syncPracticeVisuals } from "./service-visuals.mjs";

const site = new URL("../src/site/", import.meta.url);
const pages = readdirSync(site).filter(name => name.endsWith(".html"));
const read = page => readFileSync(new URL(page, site), "utf8");
const scenesCss = readFileSync(new URL("../src/site/assets/scenes.css", import.meta.url), "utf8");

test("No two pages share a hero diagram or scene", () => {
  const owners = new Map();
  for (const page of pages) {
    // Wide and compact layouts of one diagram share a kind, so count each kind once per page.
    for (const kind of new Set([...read(page).matchAll(/<svg class="hv hv-([a-z]+)/g)].map(match => match[1]))) {
      assert(!owners.has(kind), `${page} reuses the "${kind}" visual from ${owners.get(kind)}`);
      owners.set(kind, page);
    }
  }
  assert(owners.size >= 40, `Expected a distinct visual on most pages, found ${owners.size}`);
});

test("Scene styles load only where a scene is shown, before the theme layer", () => {
  for (const page of pages) {
    const html = read(page);
    const hasScene = /<svg class="hv hv-[a-z]+ hv-solo sc"/.test(html);
    const links = [...html.matchAll(/<link rel="stylesheet" href="assets\/scenes\.css">/g)].length;
    assert.equal(links, hasScene ? 1 : 0, `${page} scene stylesheet links`);
    if (hasScene) assert(html.indexOf("assets/scenes.css") < html.indexOf("assets/theme.css"), `${page} must load scenes.css before theme.css`);
  }
});

test("Every scene class has a style and all scene motion respects reduced motion", () => {
  const markup = [...scenePages.map(page => sceneFor(page, "")), compassScene()].join("");
  const classes = new Set([...markup.matchAll(/class="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/)).filter(name => /^sc-[a-z-]+$/.test(name)));
  for (const name of classes) assert(scenesCss.includes(`.${name}`), `scenes.css has no rule for .${name}`);
  const [resting, motion] = scenesCss.split("@media(prefers-reduced-motion:no-preference){");
  assert(motion, "Scene motion must sit behind prefers-reduced-motion:no-preference");
  assert(!/animation(?:-name)?\s*:/.test(resting), "Resting scene styles must not animate");
});

test("Every service capability has its own illustration, styled and reduced-motion safe", () => {
  const serviceCss = readFileSync(new URL("../src/site/assets/service-scenes.css", import.meta.url), "utf8");
  const kinds = new Set();
  for (const [page, scenes] of Object.entries(practiceScenes)) {
    const html = read(page);
    const sections = [...html.matchAll(/<section class="practice" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
    assert.deepEqual(sections.map(([, id]) => id), Object.keys(scenes), `${page} has a scene for each capability, in order`);
    for (const [, id, section] of sections) {
      const visuals = [...section.matchAll(/<div class="practice-visual" aria-hidden="true"><svg class="hv hv-([a-z]+) sv"/g)];
      assert.equal(visuals.length, 1, `${page}#${id} shows exactly one scene`);
      assert(/<div class="practice-visual"[\s\S]*<\/div><!-- practice-visual:end --><\/div>\s*<div class="practice-detail">/.test(section), `${page}#${id} closes its introduction with the scene`);
      const kind = visuals[0][1];
      assert(!kinds.has(kind), `${page}#${id} reuses the "${kind}" scene`);
      kinds.add(kind);
    }
    assert.equal([...html.matchAll(/assets\/service-scenes\.css/g)].length, 1, `${page} links service-scenes.css once`);
    assert(html.indexOf("assets/service-scenes.css") < html.indexOf("assets/theme.css"), `${page} loads service scenes before the theme layer`);
    assert.equal(syncPracticeVisuals(html, page), html, `${page} practice scenes are stable across builds`);
  }
  assert.equal(kinds.size, 18);
  for (const page of pages.filter(page => !practiceScenes[page])) assert(!read(page).includes("service-scenes.css"), `${page} does not load service scenes`);
  const markup = Object.values(practiceScenes).flatMap(scenes => Object.values(scenes).map(draw => draw())).join("");
  const classes = new Set([...markup.matchAll(/class="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/)).filter(name => /^sv-[a-z0-9-]+$/.test(name)));
  for (const name of classes) assert(new RegExp(`\\.${name}(?![a-z0-9-])`).test(serviceCss), `service-scenes.css has no rule for .${name}`);
  for (const kind of kinds) assert(serviceCss.includes(`.hv-${kind} `), `service-scenes.css animates the ${kind} scene`);
  const [resting, motion] = serviceCss.split("@media(prefers-reduced-motion:no-preference){");
  assert(motion, "Service scene motion must sit behind prefers-reduced-motion:no-preference");
  assert(!/animation(?:-name)?\s*:/.test(resting), "Resting service scene styles must not animate");
  assert(!/\sstyle="/.test(markup), "Service scenes use classes, never inline styles");
});
