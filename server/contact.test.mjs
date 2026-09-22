import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { validateInquiry } from "../shared/inquiry.mjs";
import { createContactServer } from "./contact.mjs";

const inquiry = { name: "Demo Visitor", email: "visitor@example.test", company: "Example Organization", service: "security", message: "We would like to discuss a security assessment.", consent: true };
const settings = { contactFormUrl: "", bookingUrl: "", contactEndpoint: "" };

async function fixture(t, rateLimit = 100) {
  const directory = await mkdtemp(path.join(tmpdir(), "cloud-first-api-test-"));
  const siteDir = path.join(directory, "public");
  const dataDir = path.join(directory, "private");
  await mkdir(siteDir);
  await writeFile(path.join(siteDir, "index.html"), "<h1>Cloud First</h1>");
  await writeFile(path.join(siteDir, "404.html"), "<h1>Not found</h1>");
  const server = await createContactServer({ siteDir, dataDir, settings, rateLimit });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  return {
    origin, dataDir,
    post: (body, headers = {}) => fetch(`${origin}/api/contact`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body)
    })
  };
}

test("inquiry validation trims text and enforces consent, limits, and service choices", () => {
  const result = validateInquiry({ ...inquiry, name: "  Demo Visitor  ", unexpected: "not persisted" });
  assert.equal(result.data.name, "Demo Visitor");
  assert(!Object.hasOwn(result.data, "unexpected"));
  for (const invalid of [
    { name: " " }, { email: "not-an-email" }, { message: "short" }, { message: "a".repeat(3001) },
    { consent: false }, { service: "admin" }, { company: {} }
  ]) assert.equal(validateInquiry({ ...inquiry, ...invalid }).data, null);
  assert.equal(validateInquiry(null).data, null);
});

test("successful inquiries are saved privately before acknowledgment", async t => {
  const { post, dataDir, origin } = await fixture(t);
  const response = await post(inquiry);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.ok, true);
  const record = JSON.parse(await readFile(path.join(dataDir, `${result.reference}.json`), "utf8"));
  assert.equal(record.email, inquiry.email);
  assert.equal(record.message, inquiry.message);
  assert(record.receivedAt);
  assert.equal((await fetch(`${origin}/${result.reference}.json`)).status, 404);
  assert.equal((await fetch(`${origin}/.cloud-first-data/inquiries/${result.reference}.json`)).status, 404);
  assert.equal((await fetch(`${origin}/api/contact`, { headers: { Origin: origin } })).status, 405);
});

test("invalid, cross-origin, oversized, and non-JSON requests never create records", async t => {
  const { post, dataDir } = await fixture(t);
  assert.equal((await post({ ...inquiry, consent: false })).status, 400);
  assert.equal((await post("{invalid")).status, 400);
  assert.equal((await post(inquiry, { Origin: "https://unapproved.example" })).status, 403);
  assert.equal((await post(inquiry, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await post({ ...inquiry, message: "x".repeat(20000) })).status, 413);
  assert.deepEqual(await readdir(dataDir), []);
});

test("rate limiting rejects excess submissions", async t => {
  const { post, dataDir } = await fixture(t, 1);
  assert.equal((await post(inquiry)).status, 201);
  const limited = await post(inquiry);
  assert.equal(limited.status, 429);
  assert(limited.headers.get("retry-after"));
  assert.equal((await readdir(dataDir)).length, 1);
});

test("intake refuses a storage directory inside the public site", async () => {
  await assert.rejects(createContactServer({ siteDir: "public", dataDir: path.join("public", "inquiries"), settings }), /outside the public/);
});
