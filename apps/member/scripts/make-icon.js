const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

// ── Design ────────────────────────────────────────────────────────────────────
// Dark green background, white rounded square inset, stylised olive branch +
// "In Common" wordmark. Clean, recognisable at small sizes.

const SIZE = 1024;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#1B4332"/>
      <stop offset="100%" stop-color="#2D6A4F"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#B7E4C7"/>
      <stop offset="100%" stop-color="#74C69D"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)" rx="0"/>

  <!-- Soft inner glow circle -->
  <circle cx="512" cy="440" r="320" fill="#2D6A4F" opacity="0.35"/>

  <!-- Olive branch — stem -->
  <path d="M 400 640 Q 480 520 560 400 Q 600 340 640 310"
        stroke="#74C69D" stroke-width="18" fill="none" stroke-linecap="round"/>

  <!-- Olive leaves -->
  <!-- leaf 1 -->
  <ellipse cx="460" cy="568" rx="52" ry="24" fill="url(#leaf)"
           transform="rotate(-40 460 568)"/>
  <!-- leaf 2 -->
  <ellipse cx="508" cy="498" rx="52" ry="24" fill="url(#leaf)"
           transform="rotate(-48 508 498)"/>
  <!-- leaf 3 -->
  <ellipse cx="556" cy="428" rx="48" ry="22" fill="url(#leaf)"
           transform="rotate(-52 556 428)"/>
  <!-- leaf 4 -->
  <ellipse cx="600" cy="368" rx="46" ry="21" fill="url(#leaf)"
           transform="rotate(-56 600 368)"/>
  <!-- leaf 5 — right side of stem -->
  <ellipse cx="490" cy="540" rx="48" ry="22" fill="url(#leaf)"
           transform="rotate(35 490 540)"/>
  <!-- leaf 6 -->
  <ellipse cx="538" cy="468" rx="48" ry="22" fill="url(#leaf)"
           transform="rotate(30 538 468)"/>
  <!-- leaf 7 -->
  <ellipse cx="582" cy="400" rx="46" ry="21" fill="url(#leaf)"
           transform="rotate(28 582 400)"/>

  <!-- Olives (small circles) -->
  <circle cx="428" cy="612" r="18" fill="#52B788"/>
  <circle cx="476" cy="544" r="16" fill="#52B788"/>
  <circle cx="524" cy="476" r="16" fill="#52B788"/>

  <!-- Wordmark: "In Common" -->
  <text x="512" y="748"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="88"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        letter-spacing="2">In Common</text>

  <!-- Tagline -->
  <text x="512" y="810"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="34"
        fill="rgba(255,255,255,0.55)"
        text-anchor="middle"
        letter-spacing="4">JERUSALEM</text>
</svg>
`;

// Render to PNG
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: SIZE },
  font: { loadSystemFonts: true },
});
const pngData = resvg.render();
const pngBuffer = pngData.asPng();

const assetsDir = path.join(__dirname, '../assets');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), pngBuffer);

// Splash — same design, taller canvas
const splashSvg = svg.replace(/width="1024" height="1024" viewBox="0 0 1024 1024"/,
  'width="1284" height="2778" viewBox="-130 -877 1284 2778"');
const splashResvg = new Resvg(splashSvg, {
  fitTo: { mode: 'width', value: 1284 },
  font: { loadSystemFonts: true },
});
const splashPng = splashResvg.render().asPng();
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashPng);

console.log('✓ icon.png');
console.log('✓ adaptive-icon.png');
console.log('✓ splash.png');
