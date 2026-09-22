"use strict";

const resourceDestination = document.getElementById("resource-destination");
if (!resourceDestination) throw new Error("Missing destination for the moved resource.");
const resourceUrl = new URL(resourceDestination.href);
if (window.location.hash) {
  const fragment = window.location.hash.slice(1);
  resourceUrl.hash = ["technology-glossary", "technology-glossary-title"].includes(fragment)
    ? "technology-deep-dives" : fragment;
}
resourceUrl.search = window.location.search;
window.location.replace(resourceUrl.href);
