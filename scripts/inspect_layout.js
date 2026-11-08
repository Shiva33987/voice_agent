const fs = require('fs');
const c = fs.readFileSync('/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js', 'utf8');
const idx = c.indexOf('("sidebar")');
console.log(c.substring(idx - 150, idx + 50));
