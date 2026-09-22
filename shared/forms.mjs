export const microsoftFormsOrigins = ["https://forms.cloud.microsoft", "https://forms.office.com"];

export function microsoftFormsUrls(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("The contact form must use HTTPS without embedded credentials.");
  }
  const responsePage = url.pathname.toLowerCase() === "/pages/responsepage.aspx" && !!url.searchParams.get("id");
  const shortLink = /^\/r\/[A-Za-z0-9_-]+$/.test(url.pathname);
  if (!microsoftFormsOrigins.includes(url.origin) || (!responsePage && !shortLink)) return null;
  const response = new URL(url);
  response.searchParams.delete("embed");
  url.searchParams.set("embed", "true");
  return { embedUrl: url.href, responseUrl: response.href };
}
