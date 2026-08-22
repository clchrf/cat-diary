const fs = require('fs');
const path = require('path');
const { PNG } = require(path.join(__dirname, 'node_modules', 'pngjs'));

const file = process.argv[2];
const cell = 16;
const png = PNG.sync.read(fs.readFileSync(file));
const { width, height, data } = png;
const cols = Math.floor(width / cell);
const rows = Math.floor(height / cell);

function cellHasPixels(cx, cy) {
  for (let y = cy * cell; y < cy * cell + cell; y++) {
    for (let x = cx * cell; x < cx * cell + cell; x++) {
      const idx = (width * y + x) * 4;
      if (data[idx + 3] > 10) return true;
    }
  }
  return false;
}

const rowInfo = [];
for (let ry = 0; ry < rows; ry++) {
  let frameCount = 0;
  for (let rx = 0; rx < cols; rx++) {
    if (cellHasPixels(rx, ry)) frameCount = rx + 1; // last non-empty col + 1
  }
  rowInfo.push({ row: ry, y: ry * cell, frames: frameCount });
}

console.log(`file=${file} size=${width}x${height} cols=${cols} rows=${rows}`);
rowInfo.forEach(r => {
  console.log(`row ${String(r.row).padStart(3)} y=${String(r.y).padStart(4)} frames=${r.frames}`);
});
