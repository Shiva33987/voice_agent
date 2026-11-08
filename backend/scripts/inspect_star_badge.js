const fs = require('fs');

const f = '/app/.next/static/chunks/5360-9dace807c3efcef6.js';
const c = fs.readFileSync(f, 'utf8');
const idx = c.indexOf('github.com/dograh');
console.log('--- in 5360 chunk at:', idx);
console.log(c.substring(idx - 100, idx + 400));

