/**
 * Generate icon.png from icon.svg using resvg (pure WASM SVG renderer).
 * This produces a crisp 512x512 PNG suitable for electron-builder to
 * embed into the exe as the Windows taskbar/shortcut icon.
 */
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'icon.svg');
const pngPath = path.join(__dirname, 'public', 'icon.png');

const svg = fs.readFileSync(svgPath, 'utf8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 512 },
  background: 'rgba(0,0,0,0)', // Transparent background
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

fs.writeFileSync(pngPath, pngBuffer);
console.log(`✅ Generated ${pngPath} (${pngBuffer.length} bytes, ${pngData.width}x${pngData.height})`);
