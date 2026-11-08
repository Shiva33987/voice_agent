const fs = require('fs');

const f = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
const c = fs.readFileSync(f, 'utf8');

const mIdx = c.indexOf('14357:');
console.log('14357 at:', mIdx);
if (mIdx !== -1) {
    console.log(c.substring(mIdx, mIdx + 400));
}
