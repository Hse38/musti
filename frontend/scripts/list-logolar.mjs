import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "LOGOLAR");

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
const files = fs
  .readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith(".png") && f !== "manifest.json");
const urls = files.map((f) => `/LOGOLAR/${f}`);
const out = path.join(dir, "manifest.json");
fs.writeFileSync(out, JSON.stringify(urls, null, 2));
console.log("Wrote", out, urls.length, "entries");
