const fs = require("fs");
const path = require("path");
const { PNG } = require(path.join(__dirname, "..", "node_modules", "pngjs"));

const src = PNG.sync.read(fs.readFileSync(process.argv[2]));
const frameSize = 64;
const col = parseInt(process.argv[3] || "0");
const row = parseInt(process.argv[4] || "0");
const outSize = parseInt(process.argv[5] || "512");
const scale = outSize / frameSize;
const out = new PNG({ width: outSize, height: outSize });
for (let i = 0; i < out.data.length; i += 4) {
  out.data[i] = 255;
  out.data[i + 1] = 255;
  out.data[i + 2] = 255;
  out.data[i + 3] = 255;
}
for (let y = 0; y < outSize; y++) {
  for (let x = 0; x < outSize; x++) {
    const sx = Math.floor(x / scale) + col * frameSize;
    const sy = Math.floor(y / scale) + row * frameSize;
    const sIdx = (src.width * sy + sx) * 4;
    const dIdx = (outSize * y + x) * 4;
    const a = src.data[sIdx + 3];
    if (a > 10) {
      const alpha = a / 255;
      out.data[dIdx] = Math.round(src.data[sIdx] * alpha + out.data[dIdx] * (1 - alpha));
      out.data[dIdx + 1] = Math.round(src.data[sIdx + 1] * alpha + out.data[dIdx + 1] * (1 - alpha));
      out.data[dIdx + 2] = Math.round(src.data[sIdx + 2] * alpha + out.data[dIdx + 2] * (1 - alpha));
      out.data[dIdx + 3] = 255;
    }
  }
}
fs.writeFileSync(process.argv[6], PNG.sync.write(out));
console.log("wrote", process.argv[6]);
