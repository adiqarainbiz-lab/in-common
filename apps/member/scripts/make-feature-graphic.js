const { Resvg } = require('@resvg/resvg-js');
const fs   = require('fs');
const path = require('path');

// Google Play feature graphic: 1024 × 500px
const W = 1024, H = 500;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#1B4332"/>
      <stop offset="100%" stop-color="#2D6A4F"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#B7E4C7"/>
      <stop offset="100%" stop-color="#74C69D"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.13)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Soft glow -->
  <circle cx="780" cy="250" r="320" fill="#40916C" opacity="0.18"/>
  <circle cx="180" cy="80"  r="180" fill="#52B788" opacity="0.10"/>

  <!-- Olive branch (right side) -->
  <path d="M 680 420 Q 740 330 800 240 Q 830 195 860 170"
        stroke="#74C69D" stroke-width="14" fill="none" stroke-linecap="round"/>
  <ellipse cx="720" cy="368" rx="46" ry="21" fill="url(#leaf)" transform="rotate(-40 720 368)"/>
  <ellipse cx="756" cy="312" rx="46" ry="21" fill="url(#leaf)" transform="rotate(-46 756 312)"/>
  <ellipse cx="792" cy="258" rx="42" ry="19" fill="url(#leaf)" transform="rotate(-50 792 258)"/>
  <ellipse cx="824" cy="210" rx="40" ry="18" fill="url(#leaf)" transform="rotate(-54 824 210)"/>
  <ellipse cx="746" cy="340" rx="42" ry="19" fill="url(#leaf)" transform="rotate(32 746 340)"/>
  <ellipse cx="780" cy="285" rx="42" ry="19" fill="url(#leaf)" transform="rotate(28 780 285)"/>
  <ellipse cx="812" cy="232" rx="40" ry="18" fill="url(#leaf)" transform="rotate(26 812 232)"/>
  <circle cx="700" cy="396" r="14" fill="#52B788"/>
  <circle cx="736" cy="342" r="13" fill="#52B788"/>
  <circle cx="770" cy="288" r="12" fill="#52B788"/>

  <!-- Decorative dots pattern -->
  <circle cx="60"  cy="420" r="3" fill="#52B788" opacity="0.4"/>
  <circle cx="90"  cy="400" r="2" fill="#52B788" opacity="0.3"/>
  <circle cx="50"  cy="390" r="2" fill="#52B788" opacity="0.25"/>
  <circle cx="940" cy="60"  r="3" fill="#52B788" opacity="0.4"/>
  <circle cx="970" cy="80"  r="2" fill="#52B788" opacity="0.3"/>

  <!-- Wordmark -->
  <text x="90" y="210"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="96"
        font-weight="bold"
        fill="white"
        letter-spacing="-1">In Common</text>

  <!-- Tagline -->
  <text x="92" y="262"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="28"
        fill="rgba(255,255,255,0.65)"
        letter-spacing="5">COMMUNITY LOYALTY · JERUSALEM</text>

  <!-- Divider line -->
  <rect x="92" y="286" width="420" height="2" rx="1" fill="rgba(255,255,255,0.2)"/>

  <!-- Value props -->
  <text x="96" y="328" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="22" fill="rgba(255,255,255,0.85)">🌿  Earn points at local businesses</text>
  <text x="96" y="362" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="22" fill="rgba(255,255,255,0.85)">🏷️  Unlock exclusive member deals</text>
  <text x="96" y="396" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="22" fill="rgba(255,255,255,0.85)">💚  Support your community</text>
</svg>
`;

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { loadSystemFonts: true },
});
const png = resvg.render().asPng();

const assetsDir = path.join(__dirname, '../assets');
fs.writeFileSync(path.join(assetsDir, 'feature-graphic.png'), png);
console.log('✓ feature-graphic.png (1024×500)');
