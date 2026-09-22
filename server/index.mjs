import { fileURLToPath } from "node:url";
import path from "node:path";
import { once } from "node:events";
import { createContactServer } from "./contact.mjs";
import { readSettings } from "../scripts/integrations.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.PORT === undefined ? 0 : Number(process.env.PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be a valid port number.");
const settings = await readSettings();
const server = await createContactServer({
  siteDir: path.join(root, "dist"),
  dataDir: process.env.CONTACT_DATA_DIR || path.join(root, ".cloud-first-data", "inquiries"),
  settings,
  allowedOrigins: (process.env.CONTACT_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean)
});
server.listen(port, "127.0.0.1");
await once(server, "listening");
console.log(`Cloud First website: http://127.0.0.1:${server.address().port}`);
console.log(settings.contactFormUrl
  ? "Contact Us uses the configured Microsoft Form. The native intake remains available as a fallback."
  : "Contact intake is active. Records are stored privately, not emailed or sent to Microsoft Forms.");
