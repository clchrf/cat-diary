const fs = require('fs');
const path = require('path');
const AseParser = require(path.join(__dirname, 'node_modules', 'ase-parser'));

const file = process.argv[2];
const buf = fs.readFileSync(file);
const ase = new AseParser(buf, file.split('/').pop());
ase.parse();

console.log('frames:', ase.frames.length);
console.log('size:', ase.width, 'x', ase.height);
console.log('tags:');
(ase.tags || []).forEach(t => {
  console.log(`  ${t.name}: frames ${t.from}-${t.to}`);
});
