const fs = require('fs');
const c = fs.readFileSync('/app/.next/static/chunks/app/overview/page-968ca6925a7913fd.js', 'utf8');
const idx = c.indexOf('function u()');
console.log(c.substring(idx, idx + 1200));

