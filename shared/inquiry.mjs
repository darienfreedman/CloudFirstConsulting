import { serviceAreaByKey } from "./services.mjs";

export const serviceOptions = [
  ["security", serviceAreaByKey.security.label],
  ["data", "Data protection and Copilot readiness"],
  ["ai", serviceAreaByKey.business.label],
  ["cloud", serviceAreaByKey.cloud.label],
  ["discovery", "Help choosing a starting point"]
];

export function validateInquiry(input) {
  const errors = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: { form: "Please provide your inquiry details." }, data: null };
  }
  const data = {};
  for (const [key, label, maximum, minimum] of [
    ["name", "your name", 100, 1],
    ["email", "your email address", 254, 1],
    ["company", "your company name", 150, 0],
    ["message", "a little more about your project", 3000, 10]
  ]) {
    const value = typeof input[key] === "string" ? input[key].trim() : "";
    data[key] = value;
    if (value.length < minimum) errors[key] = `Please enter ${label}.`;
    else if (value.length > maximum) errors[key] = `Please use ${maximum} characters or fewer.`;
    else if (input[key] !== undefined && typeof input[key] !== "string") errors[key] = `Please enter ${label} as text.`;
  }
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!serviceOptions.some(([value]) => value === input.service)) errors.service = "Please choose a service area.";
  else data.service = input.service;
  if (input.consent !== true) errors.consent = "Please confirm that we may respond to your inquiry.";
  else data.consent = true;
  return { errors, data: Object.keys(errors).length ? null : data };
}
