export function pagePath(value) {
  return value.replace(/^([a-z0-9-]+)\.html(?=[?#]|$)/, (_, name) =>
    name === "index" ? "" : name === "404" ? "404.html" : `${name}/`
  );
}

export function pageHref(value, siteRoot) {
  return siteRoot === undefined ? value : siteRoot + pagePath(value);
}

export function localContactEndpoint(pageUrl, siteRoot = "./") {
  return new URL("api/contact", new URL(siteRoot, pageUrl)).href;
}
