const fs = require('fs');

const f = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
const c = fs.readFileSync(f, 'utf8');
const idx = c.indexOf('MANAGE');
console.log('MANAGE at:', idx);
if (idx !== -1) {
    console.log(c.substring(idx - 60, idx + 350));
}

