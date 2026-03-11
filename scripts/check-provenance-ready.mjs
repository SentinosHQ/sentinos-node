import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(pkg.name === "@sentinos/node", `Unexpected package name: ${pkg.name}`);
assert(pkg.license === "Apache-2.0", "Package license must be Apache-2.0.");
assert(pkg.publishConfig?.access === "public", "publishConfig.access must be public.");
assert(pkg.repository?.url?.includes("SentinosHQ/sentinos-node"), "Repository URL must point at SentinosHQ/sentinos-node.");
assert(pkg.exports?.["."]?.import === "./dist/index.js", "Package export map must expose dist/index.js.");
assert(pkg.exports?.["."]?.types === "./dist/index.d.ts", "Package export map must expose dist/index.d.ts.");

const packJson = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: root,
  encoding: "utf8",
});
const pack = JSON.parse(packJson);
const files = pack?.[0]?.files?.map((entry) => entry.path) ?? [];

assert(files.some((path) => path === "dist/index.js"), "Packed tarball must include dist/index.js.");
assert(files.some((path) => path === "dist/index.d.ts"), "Packed tarball must include dist/index.d.ts.");
assert(files.some((path) => path === "README.md"), "Packed tarball must include README.md.");
assert(files.some((path) => path === "LICENSE"), "Packed tarball must include LICENSE.");

console.log("node sdk provenance readiness checks passed");
