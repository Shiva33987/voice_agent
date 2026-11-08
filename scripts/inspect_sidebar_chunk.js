const fs = require('fs');

const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
const c = fs.readFileSync(chunkFile, 'utf8');

const fIdx = c.indexOf('Platform Settings');
console.log('--- Platform Settings AT:', fIdx);
console.log(c.substring(fIdx - 350, fIdx + 150));
