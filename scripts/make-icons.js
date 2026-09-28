import fs from 'fs';
import path from 'path';

// Minimal 1x1 transparent PNG data or simple colored PNG header
// Let's create an SVG and also simple PNGs in public directory
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192 SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <path d="M256 60 L450 160 L450 360 L256 460 L62 360 L62 160 Z" fill="#1e293b" stroke="#3b82f6" stroke-width="16"/>
  <path d="M256 60 L256 460" stroke="#3b82f6" stroke-width="12"/>
  <path d="M62 160 L256 260 L450 160" stroke="#3b82f6" stroke-width="12"/>
  <circle cx="256" cy="260" r="28" fill="#60a5fa"/>
  <text x="256" y="410" font-family="system-ui, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">СКЛАД</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// A simple valid 1x1 blue PNG buffer stretched or copied to provide valid PNG headers
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffer);

console.log('PWA icons created in /public');
