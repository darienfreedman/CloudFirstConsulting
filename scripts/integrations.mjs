import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { microsoftFormsOrigins, microsoftFormsUrls } from "../shared/forms.mjs";

export async function readSettings() {
  const settings = JSON.parse(await readFile(new URL("../config/site.json", import.meta.url), "utf8"));
  const keys = ["contactFormUrl", "bookingUrl", "contactEndpoint"];
  if (Object.keys(settings).some(key => !keys.includes(key))) throw new Error("Unknown public integration setting.");
  for (const key of keys) {
    if (typeof settings[key] !== "string") throw new Error(`${key} must be an HTTPS URL or an empty string.`);
    if (!settings[key]) continue;
    const url = new URL(settings[key]);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${key} must use HTTPS without embedded credentials.`);
    settings[key] = url.href;
  }
  return settings;
}

export function contentPolicy(settings) {
  const connections = ["'self'"];
  if (settings.contactEndpoint) connections.push(new URL(settings.contactEndpoint).origin);
  const frames = microsoftFormsUrls(settings.contactFormUrl) ? microsoftFormsOrigins.join(" ") : "'none'";
  return `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${connections.join(" ")}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src ${frames}`;
}

export async function writeSettings(settings) {
  await writeFile(fileURLToPath(new URL("../src/site/assets/integrations.js", import.meta.url)), `"use strict";\nwindow.cloudFirstIntegrations = Object.freeze(${JSON.stringify(settings, null, 2)});\n`);
}
