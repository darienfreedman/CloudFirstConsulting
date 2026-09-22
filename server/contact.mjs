import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { validateInquiry } from "../shared/inquiry.mjs";
import { contentPolicy } from "../scripts/integrations.mjs";

const maximumBody = 16384;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

class BodyError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", chunk => {
      length += chunk.length;
      if (length <= maximumBody) chunks.push(chunk);
      else chunks.length = 0;
    });
    request.once("aborted", () => reject(new BodyError(400, "The request was interrupted.")));
    request.once("error", reject);
    request.once("end", () => {
      if (length > maximumBody) { reject(new BodyError(413, "The inquiry is too large.")); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (error) {
        if (!(error instanceof SyntaxError)) { reject(error); return; }
        reject(new BodyError(400, "Please provide valid inquiry details."));
      }
    });
  });
}

export async function createContactServer({ siteDir, dataDir, settings, allowedOrigins = [], rateLimit = 5 }) {
  const publicRoot = path.resolve(siteDir);
  const privateRoot = path.resolve(dataDir);
  if (privateRoot === publicRoot || privateRoot.startsWith(publicRoot + path.sep)) {
    throw new Error("Contact records must be stored outside the public website.");
  }
  const errorPage = await readFile(path.join(publicRoot, "404.html"));
  await mkdir(privateRoot, { recursive: true, mode: 0o700 });
  const configuredOrigins = new Set(allowedOrigins.map(origin => {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || parsed.protocol !== "https:") throw new Error("Additional contact origins must be exact HTTPS origins.");
    return origin;
  }));
  const attempts = new Map();
  const server = createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", contentPolicy(settings));
    const json = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(body));
    };
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname); }
    catch (error) {
      if (!(error instanceof URIError || error instanceof TypeError)) throw error;
      json(400, { error: "Invalid request address." }); return;
    }
    if (pathname === "/api/health" && request.method === "GET") {
      json(200, { status: "ok", contact: "ready" }); return;
    }
    if (pathname === "/api/contact") {
      const port = server.address().port;
      const origin = request.headers.origin;
      const allowed = configuredOrigins.has(origin) || origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
      if (!allowed) { json(403, { error: "This website is not authorized to submit inquiries." }); return; }
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      if (request.method === "OPTIONS") {
        response.writeHead(204, { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" });
        response.end(); return;
      }
      if (request.method !== "POST") { response.setHeader("Allow", "POST, OPTIONS"); json(405, { error: "Use POST to submit an inquiry." }); return; }
      if (!/^application\/json(?:;|$)/i.test(request.headers["content-type"] || "")) {
        json(415, { error: "This endpoint accepts JSON inquiries." }); return;
      }
      const now = Date.now();
      for (const [key, record] of attempts) if (record.expires <= now) attempts.delete(key);
      const client = request.socket.remoteAddress;
      const attempt = attempts.get(client) || { count: 0, expires: now + 60000 };
      if (attempt.count >= rateLimit) {
        response.setHeader("Retry-After", Math.max(1, Math.ceil((attempt.expires - now) / 1000)));
        json(429, { error: "Too many inquiries. Please wait a minute before trying again." }); return;
      }
      attempt.count += 1; attempts.set(client, attempt);
      if (Number(request.headers["content-length"]) > maximumBody) {
        request.resume(); json(413, { error: "The inquiry is too large." }); return;
      }
      let input;
      try { input = await readJson(request); }
      catch (error) {
        if (error instanceof BodyError) json(error.status, { error: error.message });
        else {
          console.error("Contact request could not be read:", error.code || error.name);
          if (!response.destroyed) json(400, { error: "The request could not be read. Please try again." });
        }
        return;
      }
      const { data, errors } = validateInquiry(input);
      if (!data) { json(400, { error: "Please check the highlighted details.", fields: errors }); return; }
      const reference = randomUUID();
      const record = { reference, receivedAt: new Date().toISOString(), ...data };
      try {
        await writeFile(path.join(privateRoot, `${reference}.json`), JSON.stringify(record, null, 2), { flag: "wx", mode: 0o600 });
      } catch (error) {
        console.error("Contact inquiry could not be saved:", error.code || error.name);
        json(503, { error: "We could not receive your inquiry. Please try again later." }); return;
      }
      json(201, { ok: true, reference }); return;
    }
    if (pathname.startsWith("/api/")) { json(404, { error: "Endpoint not found." }); return; }
    if (!["GET", "HEAD"].includes(request.method)) { json(405, { error: "Method not allowed." }); return; }
    const filename = path.resolve(publicRoot, `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`);
    if (!filename.startsWith(publicRoot + path.sep)) { json(403, { error: "Access denied." }); return; }
    try {
      const bytes = await readFile(filename);
      response.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream", "Content-Length": bytes.length });
      response.end(request.method === "HEAD" ? undefined : bytes);
    } catch (error) {
      if (!["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) {
        console.error("Website resource could not be read:", error.code || error.name);
        json(500, { error: "This resource is temporarily unavailable." }); return;
      }
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : errorPage);
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
