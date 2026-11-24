// Generates every raster brand asset (home-screen icons, favicons, iOS splash screens) from one vector definition.
//   npm run assets
// Uses sharp when installed (it is a dev dependency). Falls back to Playwright's Chromium when sharp is unavailable.
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const OUT = new URL('../public/', import.meta.url).pathname;
mkdirSync(OUT + 'splash', { recursive: true });
const require = createRequire(import.meta.url);

const VOID = '#08090b', BONE = '#e6e3da', SILVER = '#7c8891', BRIGHT = '#c9cfd2';

/** The mark: one lit cell, one orbit, two satellites. Abyssal Liturgy palette, no filters, no gradients. */
const glyph = (cx, cy, s) => `
  <g transform="translate(${cx} ${cy}) scale(${s})">
    <ellipse rx="330" ry="196" transform="rotate(-24)" fill="none" stroke="${SILVER}" stroke-width="9"/>
    <circle r="132" fill="${BONE}"/>
    <circle cx="262" cy="-160" r="26" fill="${BRIGHT}"/>
    <circle cx="-262" cy="150" r="18" fill="${SILVER}"/>
  </g>`;

const iconSvg = ({ glyphScale = 1, rounded = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" ${rounded ? 'rx="228"' : ''} fill="${VOID}"/>
  <rect x="24" y="24" width="976" height="976" ${rounded ? 'rx="206"' : ''} fill="none" stroke="${BONE}" stroke-opacity=".10" stroke-width="3"/>
  ${glyph(512, 512, 0.98 * glyphScale)}
</svg>`;

const splashSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${VOID}"/>
  ${glyph(w / 2, h * 0.45, (Math.min(w, h) * 0.34) / 1024 / 0.98)}
</svg>`;

let raster;
try {
  const sharp = require('sharp');
  raster = async (svg, file, w, h) => sharp(Buffer.from(svg)).resize(w, h).flatten({ background: VOID }).png({ compressionLevel: 9 }).toFile(OUT + file);
} catch {
  const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');
  const browser = await chromium.launch();
  raster = async (svg, file, w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:${VOID}"><img style="display:block;width:${w}px;height:${h}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`);
    await page.screenshot({ path: OUT + file, clip: { x: 0, y: 0, width: w, height: h } });
    await page.close();
  };
  process.on('exit', () => browser.close());
}

writeFileSync(OUT + 'favicon.svg', iconSvg({ rounded: true }).trim());
await raster(iconSvg(), 'apple-touch-icon.png', 180, 180);
await raster(iconSvg(), 'icon-192.png', 192, 192);
await raster(iconSvg(), 'icon-512.png', 512, 512);
await raster(iconSvg({ glyphScale: 0.72 }), 'icon-maskable-512.png', 512, 512);
await raster(iconSvg({ rounded: true }), 'favicon-32.png', 32, 32);

const devices = [
  [1320, 2868, 440, 956, 3], [1206, 2622, 402, 874, 3], [1260, 2736, 420, 912, 3], [1290, 2796, 430, 932, 3], [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3], [1170, 2532, 390, 844, 3], [1125, 2436, 375, 812, 3], [1242, 2688, 414, 896, 3], [828, 1792, 414, 896, 2],
  [1242, 2208, 414, 736, 3], [750, 1334, 375, 667, 2], [640, 1136, 320, 568, 2],
];
const links = [];
for (const [pw, ph, w, h, r] of devices) {
  const name = `splash/splash-${pw}x${ph}.png`;
  await raster(splashSvg(pw, ph), name, pw, ph);
  links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="%BASE_URL%${name}" />`);
}
writeFileSync(new URL('./splash-links.html', import.meta.url).pathname, links.join('\n'));
console.log('assets written:', devices.length, 'splash screens + icons');
