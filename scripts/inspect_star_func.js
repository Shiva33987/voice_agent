const fs = require('fs');

const f1 = '/app/.next/static/chunks/5360-9dace807c3efcef6.js';
const c1 = fs.readFileSync(f1, 'utf8');
const idx1 = c1.indexOf('github.com/dograh-hq/dograh');
console.log(c1.substring(idx1 + 900, idx1 + 1500));
