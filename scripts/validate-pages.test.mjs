import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, cp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validatePages } from "./validate-pages.mjs";
import { resolveErrorPageLinks } from "./build.mjs";

async function fixture(t, base) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cloud-first-pages-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, ".nojekyll"), "");
  await writeFile(path.join(directory, "index.html"), '<main id="main"><a href="services.html#details">Services</a><img srcset="assets/Logo.png 640w" src="assets/Logo.png"><link href="assets/styles.css"></main>');
  await writeFile(path.join(directory, "services.html"), '<main id="details"><a href="index.html">Home</a></main>');
  await writeFile(path.join(directory, "assets", "Logo.png"), "");
  await writeFile(path.join(directory, "assets", "styles.css"), '.brand { background: url("Logo.png"); }');
  await writeFile(path.join(directory, "404.html"), resolveErrorPageLinks('<a href="index.html">Home</a><link href="assets/styles.css">', base));
  return directory;
}

test("Pages output works at project subpaths and domain roots", async t => {
  for (const base of ["https://demo.github.io/consulting-demo/", "https://demo.example.com/"]) {
    const directory = await fixture(t, base);
    assert.equal((await validatePages(directory, base)).pages, 3);
  }
});

test("Pages validation rejects paths that only work at the domain root", async t => {
  const base = "https://demo.github.io/consulting-demo/";
  const directory = await fixture(t, base);
  await writeFile(path.join(directory, "services.html"), '<main id="details"><a href="/index.html">Home</a></main>');
  await assert.rejects(validatePages(directory, base), /escapes GitHub Pages base path/);
});

test("Pages validation catches case mismatches, including stylesheet images", async t => {
  const base = "https://demo.github.io/consulting-demo/";
  const directory = await fixture(t, base);
  await writeFile(path.join(directory, "assets", "styles.css"), '.brand { background: url("logo.png"); }');
  await assert.rejects(validatePages(directory, base), /incorrectly cased Pages asset/);
});

test("Pages validation checks anchors and responsive images", async t => {
  const base = "https://demo.github.io/consulting-demo/";
  const directory = await fixture(t, base);
  await writeFile(path.join(directory, "services.html"), '<main id="details"><a href="index.html#missing">Home</a></main>');
  await assert.rejects(validatePages(directory, base), /Missing Pages anchor/);
  await writeFile(path.join(directory, "services.html"), '<main id="details"><img srcset="assets/missing.png 640w"></main>');
  await assert.rejects(validatePages(directory, base), /incorrectly cased Pages asset/);
});

test("Pages validation rejects relative 404 recovery links", async t => {
  const base = "https://demo.github.io/consulting-demo/";
  const directory = await fixture(t, base);
  await writeFile(path.join(directory, "404.html"), '<a href="index.html">Home</a>');
  await assert.rejects(validatePages(directory, base), /nested missing URL/);
});

test("all website pages and assets resolve under a GitHub project path", async t => {
  const base = "https://demo.github.io/cloud-first-demo/";
  const directory = await mkdtemp(path.join(os.tmpdir(), "cloud-first-pages-site-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(new URL("../site", import.meta.url), directory, { recursive: true });
  const errorPage = path.join(directory, "404.html");
  await writeFile(errorPage, resolveErrorPageLinks(await readFile(errorPage, "utf8"), base));
  const result = await validatePages(directory, base);
  assert(result.pages >= 58);
  assert(result.links > 6000);
});
