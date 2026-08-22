const fs = require('fs');
const { PNG } = require('./node_modules/pngjs');
const [,, file, cx, cy, outFile] = process.argv;
const cell=32;
const src = PNG.sync.read(fs.readFileSync(file));
const out = new PNG({width:cell, height:cell});
for (let y=0;y<cell;y++) for (let x=0;x<cell;x++){
  const sIdx=(src.width*(cy*cell+y)+(cx*cell+x))*4;
  const dIdx=(cell*y+x)*4;
  out.data[dIdx]=src.data[sIdx]; out.data[dIdx+1]=src.data[sIdx+1];
  out.data[dIdx+2]=src.data[sIdx+2]; out.data[dIdx+3]=src.data[sIdx+3];
}
fs.writeFileSync(outFile, PNG.sync.write(out));
