const fs = require('fs');
const path = require('path');
const { PNG } = require(path.join(__dirname, 'node_modules', 'pngjs'));
for (const f of ['cat 1.png','cat 1.6.png','cat 1.9.png']) {
  const png = PNG.sync.read(fs.readFileSync(path.join('extracted/Free pack', f)));
  // sample a handful of opaque pixels within frame0 (REST-sit, 32x32 at 0,0)
  const samples = [];
  for (let y = 0; y < 32 && samples.length < 5; y++) {
    for (let x = 0; x < 32 && samples.length < 5; x++) {
      const idx = (png.width * y + x) * 4;
      if (png.data[idx+3] > 200) samples.push([png.data[idx],png.data[idx+1],png.data[idx+2]]);
    }
  }
  console.log(f, samples);
}
