const fs = require('fs');
const file = '/app/.next/static/chunks/app/overview/page-968ca6925a7913fd.js';
const code = fs.readFileSync(file, 'utf8');
console.log('Length:', code.length);
const idx = code.indexOf('Welcome to Dograh');
console.log('Index of Welcome to Dograh:', idx);
if (idx !== -1) {
    console.log(code.substring(idx - 150, idx + 250));
}

