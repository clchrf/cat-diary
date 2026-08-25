const fs = require("fs");
const path = require("path");
const { PNG } = require(path.join(__dirname, "..", "node_modules", "pngjs"));
for (const f of ["cat 1 (64х64).png", "cat 2 (64х64).png", "cat 3 (64х64).png"]) {
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, "extracted64/PACK", f)));
  const samples = [];
  for (let y = 0; y < 64 && samples.length < 6; y++) {
    for (let x = 0; x < 64 && samples.length < 6; x++) {
      const idx = (png.width * y + x) * 4;
      if (png.data[idx + 3] > 200) samples.push([png.data[idx], png.data[idx + 1], png.data[idx + 2]]);
    }
  }
  console.log(f, png.width, png.height, samples);
}
