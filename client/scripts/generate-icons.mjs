import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const publicDir = path.join(root, "public");
const srcSvg = path.join(publicDir, "icon.svg");

if (!fs.existsSync(srcSvg)) {
  console.error(`Missing ${srcSvg}`);
  process.exit(1);
}

async function writePng(outName, size) {
  const outPath = path.join(publicDir, outName);
  const buf = await sharp(srcSvg).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(outPath, buf);
}

await writePng("pwa-192.png", 192);
await writePng("pwa-512.png", 512);
await writePng("apple-touch-icon.png", 180);

console.log("icons generated");

