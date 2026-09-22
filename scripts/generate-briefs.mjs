import { createServer } from "node:http";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncNavigation } from "./navigation.mjs";
import { generateCatalogs } from "./catalogs.mjs";

const root = fileURLToPath(new URL("../src/site", import.meta.url));
const browser = process.env.CLOUD_FIRST_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
await access(browser);
const { briefs } = await generateCatalogs();
await syncNavigation();
await mkdir(path.join(root, "downloads"), { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), "cloud-first-briefs-"));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const filename = path.resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!filename.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(filename);
    response.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream" });
    response.end(bytes);
  } catch (error) {
    if (error.code !== "ENOENT") { response.destroy(error); return; }
    response.writeHead(404).end("Not found");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = `http://127.0.0.1:${server.address().port}`;
const edge = spawn(browser, ["--headless=new", "--no-first-run", "--disable-extensions", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; }
    catch (error) { if (!["ENOENT", "EBUSY"].includes(error.code)) throw error; await wait(100); }
  }
  if (!port) throw new Error("Browser did not expose its temporary debugging endpoint.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await once(socket, "open");
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const result = JSON.parse(event.data);
    const request = pending.get(result.id);
    if (!request) return;
    pending.delete(result.id);
    clearTimeout(request.timer);
    if (result.error) request.reject(new Error(JSON.stringify(result.error)));
    else request.resolve(result.result);
  });
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  await command("Page.enable");
  for (const { slug: name } of briefs) {
    const url = `${origin}/brief-${name}.html`;
    await command("Page.navigate", { url });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      await wait(50);
      const result = await command("Runtime.evaluate", { expression: `document.readyState === "complete" && location.href === ${JSON.stringify(url)}`, returnByValue: true });
      if (result.result.value) { ready = true; break; }
    }
    if (!ready) throw new Error(`Brief did not load: ${name}`);
    // Prevent ephemeral localhost hyperlinks from being embedded in distributed PDFs.
    await command("Runtime.evaluate", { expression: 'document.querySelectorAll(".brief-sheet a").forEach(link => link.removeAttribute("href"))' });
    const result = await command("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, generateTaggedPDF: true });
    const bytes = Buffer.from(result.data, "base64");
    const pages = [...bytes.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length;
    if (pages !== 1) throw new Error(`Expected one page for ${name}, received ${pages}. Adjust the print layout.`);
    const filename = path.join(root, "downloads", `cloud-first-${name}-brief.pdf`);
    await writeFile(filename, bytes);
    console.log(`${path.basename(filename)}: ${pages} page, ${bytes.length} bytes`);
  }
  await command("Browser.close");
} finally {
  socket?.close();
  edge.kill();
  server.closeAllConnections();
  server.close();
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await rm(profile, { recursive: true, force: true }); break; }
    catch (error) { if (!["EBUSY", "EPERM", "ENOTEMPTY"].includes(error.code) || attempt === 59) throw error; await wait(200); }
  }
}
