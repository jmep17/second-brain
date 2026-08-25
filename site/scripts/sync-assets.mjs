import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(siteDir, "..", "raw", "assets");
const dest = resolve(siteDir, "public", "vault", "raw", "assets");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
  console.log(`synced ${src} -> ${dest}`);
} else {
  mkdirSync(dest, { recursive: true });
  console.log(`no ${src}; created empty ${dest}`);
}
