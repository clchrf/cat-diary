const fs = require('fs');
const path = require('path');
const { PNG } = require(path.join(__dirname, 'node_modules', 'pngjs'));

const [,, file, yStart, yEnd, outFile, scaleArg] = process.argv;
const src = PNG.sync.read(fs.readFileSync(file));
const y0 = parseInt(yStart, 10);
const y1 = parseInt(yEnd, 10);
const h = y1 - y0;
const scale = parseInt(scaleArg || '3', 10);
const out = new PNG({ width: src.width * scale, height: h * scale });
for (let y = 0; y < h; y++) {
  for (let x = 0; x < src.width; x++) {
    const srcIdx = (src.width * (y0 + y) + x) * 4;
    for (let sy = 0; sy < scale; sy++) {
      for (let sx = 0; sx < scale; sx++) {
        const dstX = x * scale + sx;
        const dstY = y * scale + sy;
        const dstIdx = (out.width * dstY + dstX) * 4;
        out.data[dstIdx] = src.data[srcIdx];
        out.data[dstIdx + 1] = src.data[srcIdx + 1];
        out.data[dstIdx + 2] = src.data[srcIdx + 2];
        out.data[dstIdx + 3] = src.data[srcIdx + 3];
      }
    }
  }
}
fs.writeFileSync(outFile, PNG.sync.write(out));
console.log('wrote', outFile, out.width, 'x', out.height);
