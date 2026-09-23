import { createHash } from "node:crypto";

export const clarityScriptBody = `
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "ymik5mm11l");
`.replace(/\r\n?/g, "\n");

export const clarityScriptHash = `'sha256-${createHash("sha256").update(clarityScriptBody).digest("base64")}'`;
export const clarityScriptOrigins = ["https://*.clarity.ms"];
export const clarityConnectOrigins = ["https://*.clarity.ms"];
export const clarityImageOrigins = ["https://*.clarity.ms", "https://c.bing.com"];

export function injectClarity(html) {
  const marker = '<script id="clarity-bootstrap" type="text/javascript">';
  if (html.includes(marker)) return html;
  if (!html.includes("</head>")) throw new Error("Clarity requires a page head.");
  return html.replace("</head>", `${marker}${clarityScriptBody}</script></head>`);
}
