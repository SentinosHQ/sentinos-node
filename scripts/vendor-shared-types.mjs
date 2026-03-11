import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sourceDir = resolve(root, "..", "types", "src");
const targetDir = resolve(root, "src", "generated", "shared-types");

if (existsSync(sourceDir)) {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`Vendored shared Sentinos types into ${targetDir}`);
} else if (existsSync(targetDir)) {
  console.log(`Using checked-in shared Sentinos types from ${targetDir}`);
} else {
  throw new Error(
    `Could not locate monorepo shared types at ${sourceDir} or checked-in types at ${targetDir}.`,
  );
}
