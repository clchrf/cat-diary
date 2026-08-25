const fs = require("fs");
const path = require("path");
const { PNG } = require(path.join(__dirname, "..", "node_modules", "pngjs"));

const file = process.argv[2];
const cell = 64;
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

console.log(`file=${file} size=${width}x${height} cols=${cols} rows=${rows}`);
for (let ry = 0; ry < rows; ry++) {
  let frameCount = 0;
  for (let rx = 0; rx < cols; rx++) {
    if (cellHasPixels(rx, ry)) frameCount = rx + 1;
  }
  console.log(`row ${String(ry).padStart(3)} y=${String(ry * cell).padStart(5)} frames=${frameCount}`);
}
