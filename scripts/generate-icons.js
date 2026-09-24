const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const iconsDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

// 1. Generate SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#16a34a" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />

  <!-- Calendar card -->
  <g filter="url(#shadow)">
    <rect x="88" y="104" width="336" height="304" rx="36" fill="#ffffff" />
    <!-- Header strip -->
    <path d="M 88 140 C 88 120, 104 104, 124 104 L 388 104 C 408 104, 424 120, 424 140 L 424 180 L 88 180 Z" fill="#3b82f6" />
    
    <!-- Binder rings -->
    <rect x="156" y="80" width="28" height="48" rx="14" fill="#1e293b" />
    <rect x="328" y="80" width="28" height="48" rx="14" fill="#1e293b" />

    <!-- Calendar day cells / grid -->
    <!-- Row 1 -->
    <rect x="124" y="210" width="60" height="40" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3" />
    <rect x="198" y="210" width="60" height="40" rx="8" fill="#e0e7ff" stroke="#4f46e5" stroke-width="3" />
    <rect x="272" y="210" width="60" height="40" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3" />
    <rect x="346" y="210" width="42" height="40" rx="8" fill="#f1f5f9" />

    <!-- Row 2 -->
    <rect x="124" y="264" width="60" height="40" rx="8" fill="#e0e7ff" stroke="#4f46e5" stroke-width="3" />
    <rect x="198" y="264" width="60" height="40" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3" />
    <rect x="272" y="264" width="60" height="40" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="3" />
    <rect x="346" y="264" width="42" height="40" rx="8" fill="#f1f5f9" />

    <!-- Row 3 -->
    <rect x="124" y="318" width="60" height="40" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3" />
    <rect x="198" y="318" width="60" height="40" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3" />
    <rect x="272" y="318" width="60" height="40" rx="8" fill="#e0e7ff" stroke="#4f46e5" stroke-width="3" />
    <rect x="346" y="318" width="42" height="40" rx="8" fill="#f1f5f9" />
  </g>

  <!-- Green Floating Badge in bottom right -->
  <g filter="url(#shadow)">
    <circle cx="390" cy="380" r="64" fill="url(#accent)" stroke="#ffffff" stroke-width="8" />
    <!-- Checkmark icon -->
    <path d="M 364 380 L 382 398 L 418 360" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, "icon.svg"), svgContent);
fs.writeFileSync(path.join(iconsDir, "icon-maskable.svg"), svgContent);

// Simple PNG generator using raw RGBA buffer + PNG chunk encoder
function createPng(width, height, drawFn) {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk("IHDR", ihdr);

  // IDAT chunk
  const idatChunk = createChunk("IDAT", compressed);

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      if ((crc ^ byte) & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
      byte = byte >>> 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Drawing function for the modern app icon
function drawIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background squircle / rounded rect: radius 22%
  const r = 0.22;
  const dx = Math.max(Math.abs(nx - 0.5) - (0.5 - r), 0);
  const dy = Math.max(Math.abs(ny - 0.5) - (0.5 - r), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > r) {
    return [0, 0, 0, 0]; // Transparent outer
  }

  // Check floating badge bottom right (center ~ 0.76, 0.74, radius 0.16)
  const bdx = nx - 0.76;
  const bdy = ny - 0.74;
  const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
  if (bdist <= 0.16) {
    if (bdist <= 0.135) {
      // Checkmark inside badge
      // Line 1: (0.71, 0.74) to (0.75, 0.78)
      // Line 2: (0.75, 0.78) to (0.82, 0.70)
      const inCheck1 = distToSegment(nx, ny, 0.70, 0.74, 0.74, 0.78) < 0.02;
      const inCheck2 = distToSegment(nx, ny, 0.74, 0.78, 0.83, 0.69) < 0.02;
      if (inCheck1 || inCheck2) {
        return [255, 255, 255, 255];
      }
      return [22, 163, 74, 255]; // Emerald green
    } else {
      return [255, 255, 255, 255]; // White border for badge
    }
  }

  // Calendar card area: [0.18, 0.20] to [0.82, 0.80]
  if (nx >= 0.18 && nx <= 0.82 && ny >= 0.20 && ny <= 0.80) {
    // Header strip of calendar: [0.18, 0.20] to [0.82, 0.35]
    if (ny <= 0.35) {
      // Binder rings:
      const ring1 = Math.abs(nx - 0.33) < 0.03 && ny < 0.24;
      const ring2 = Math.abs(nx - 0.67) < 0.03 && ny < 0.24;
      if (ring1 || ring2) {
        return [30, 41, 59, 255];
      }
      return [59, 130, 246, 255]; // Blue header
    }

    // Grid cells inside calendar
    // 3 small rows of pills
    const inCellRow1 = ny >= 0.41 && ny <= 0.49;
    const inCellRow2 = ny >= 0.53 && ny <= 0.61;
    const inCellRow3 = ny >= 0.65 && ny <= 0.73;

    if (inCellRow1 || inCellRow2 || inCellRow3) {
      const inCol1 = nx >= 0.24 && nx <= 0.38;
      const inCol2 = nx >= 0.42 && nx <= 0.56;
      const inCol3 = nx >= 0.60 && nx <= 0.74;

      if (inCol1) {
        return inCellRow2 ? [99, 102, 241, 255] : [34, 197, 94, 255];
      }
      if (inCol2) {
        return inCellRow1 ? [99, 102, 241, 255] : [34, 197, 94, 255];
      }
      if (inCol3 && !inCellRow3) {
        return inCellRow2 ? [239, 68, 68, 255] : [34, 197, 94, 255];
      }
    }

    return [255, 255, 255, 255]; // White calendar paper
  }

  // Blue background gradient
  const grad = Math.floor(37 + (29 - 37) * ny);
  const blue = Math.floor(235 + (216 - 235) * ny);
  return [grad, 99, blue, 255];
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Generate sizes
const sizes = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 512, name: "icon-maskable.png" },
  { size: 180, name: "apple-touch-icon.png" },
];

for (const s of sizes) {
  const pngBuf = createPng(s.size, s.size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, s.name), pngBuf);
  console.log(`Generated ${s.name} (${s.size}x${s.size})`);
}
