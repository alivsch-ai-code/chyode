// Einmaliges Build-Skript: erzeugt die PWA-/Favicon-PNGs aus dem bestehenden Logo (app/icon.svg).
// Aufruf: node scripts/generate-icons.js
// Benötigt "sharp" (nur für dieses Skript, kein Laufzeit-Abhängigkeit): npm install --no-save sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Variante mit abgerundeten Ecken (App-Icon, wie im Browser-Tab) – Marke: blaues Quadrat, weißer Berg.
const rounded = (bg = '#0071e3') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="${bg}"/>
  <path d="M10 47 27 20a2.6 2.6 0 0 1 4.4 0l5.6 9.2 4.2-6.9a2.6 2.6 0 0 1 4.4 0L58 47H10Z" fill="none" stroke="#fff" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

// Variante randlos (für iOS: Apple rundet die Ecken selbst ab, daher ohne eigenes rx).
const square = (bg = '#0071e3') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${bg}"/>
  <path d="M10 47 27 20a2.6 2.6 0 0 1 4.4 0l5.6 9.2 4.2-6.9a2.6 2.6 0 0 1 4.4 0L58 47H10Z" fill="none" stroke="#fff" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

// Maskable (Android passt bei "maskable" eigene Formen an – Motiv bleibt in der sicheren Mittelzone,
// daher mit Rand/Padding statt bis zum Blattrand).
const maskable = (bg = '#0071e3') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${bg}"/>
  <g transform="translate(32 32) scale(0.6) translate(-32 -32)">
    <path d="M10 47 27 20a2.6 2.6 0 0 1 4.4 0l5.6 9.2 4.2-6.9a2.6 2.6 0 0 1 4.4 0L58 47H10Z" fill="none" stroke="#fff" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>`;

async function render(svg, size, filename) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT_DIR, filename));
  console.log('geschrieben:', filename);
}

(async () => {
  await render(rounded(), 192, 'icon-192.png');
  await render(rounded(), 512, 'icon-512.png');
  await render(maskable(), 512, 'icon-512-maskable.png');
  await render(square(), 180, 'apple-touch-icon.png');
  await render(rounded(), 32, 'favicon-32.png');
})();
