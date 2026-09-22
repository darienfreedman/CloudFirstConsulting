import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

export async function buildUI() {
  const output = await build({
    absWorkingDir: root,
    entryPoints: ["ui/index.jsx"],
    outfile: "src/site/assets/react-ui.js",
    bundle: true,
    format: "iife",
    jsx: "automatic",
    minify: true,
    target: ["es2020"],
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "eof",
    metafile: true
  });
  const packages = new Set();
  const bundledInputs = new Set(Object.values(output.metafile.outputs).flatMap(file =>
    Object.entries(file.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([name]) => name)
  ));
  for (const input of bundledInputs) {
    const marker = input.lastIndexOf("node_modules/");
    if (marker < 0) continue;
    const parts = input.slice(marker + 13).split("/");
    const name = parts[0].startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    packages.add(input.slice(0, marker + 13) + name);
  }
  const notices = ["Third-party software notices\n"];
  for (const directory of [...packages].sort()) {
    const metadata = JSON.parse(await readFile(path.join(root, directory, "package.json"), "utf8"));
    let license;
    for (const filename of ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md"]) {
      try { license = await readFile(path.join(root, directory, filename), "utf8"); break; }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    if (!license && metadata.name === "@fluentui/react-icons" && metadata.license === "MIT") {
      license = await readFile(path.join(root, "licenses", "fluentui-system-icons.txt"), "utf8");
    }
    if (!license) throw new Error(`Missing distribution license for ${metadata.name}.`);
    notices.push(`${metadata.name} ${metadata.version}\n${license}`);
  }
  await writeFile(path.join(root, "src", "site", "assets", "THIRD_PARTY_NOTICES.txt"), notices.join("\n\n"));
  console.log("Built React and Fluent UI controls.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildUI();
