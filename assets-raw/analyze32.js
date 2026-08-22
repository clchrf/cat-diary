const fs = require('fs');
const { PNG } = require('./node_modules/pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const cell = 32;
const cols = Math.floor(png.width/cell), rows = Math.floor(png.height/cell);
for (let ry=0; ry<rows; ry++) {
  let line = '';
  for (let rx=0; rx<cols; rx++) {
    let has=false;
    for (let y=ry*cell;y<ry*cell+cell && !has;y++) for(let x=rx*cell;x<rx*cell+cell;x++){
      const idx=(png.width*y+x)*4;
      if(png.data[idx+3]>10){has=true;break;}
    }
    line += has ? '#' : '.';
  }
  console.log(ry, line);
}
