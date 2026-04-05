/**
 * LOGOLAR/*.png → public/logolar/ + public/analogo.png + manifest.json
 * Windows: yalnızca public/logolar kullanın; LOGOLAR ile aynı yolu paylaşır (case-insensitive).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourceLogolar = path.join(root, "LOGOLAR");
const publicDir = path.join(root, "public");
const destLogolar = path.join(publicDir, "logolar");

if (!fs.existsSync(sourceLogolar)) {
  console.error("Missing source folder:", sourceLogolar);
  process.exit(1);
}

fs.mkdirSync(destLogolar, { recursive: true });

const analogoSrc = path.join(sourceLogolar, "analogo.png");
if (fs.existsSync(analogoSrc)) {
  fs.copyFileSync(analogoSrc, path.join(publicDir, "analogo.png"));
  console.log("OK public/analogo.png");
} else {
  console.warn("WARN: LOGOLAR/analogo.png not found");
}

const pngFiles = fs
  .readdirSync(sourceLogolar)
  .filter((f) => f.toLowerCase().endsWith(".png"));

for (const f of pngFiles) {
  fs.copyFileSync(path.join(sourceLogolar, f), path.join(destLogolar, f));
}
console.log(`OK public/logolar/ (${pngFiles.length} PNG)`);

const urls = pngFiles.map((f) => `/logolar/${f}`);
fs.writeFileSync(path.join(destLogolar, "manifest.json"), JSON.stringify(urls, null, 2));
console.log("OK public/logolar/manifest.json");
