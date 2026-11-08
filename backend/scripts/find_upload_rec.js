const fs = require('fs');
const clientPage = '/app/.next/static/chunks/app/recordings/page-26a4f51e7eab33a5.js';
const content = fs.readFileSync(clientPage, 'utf8');

const idx = content.indexOf('Upload Recording');
console.log('Upload Recording index:', idx);
if (idx !== -1) {
    console.log(content.substring(idx - 200, idx + 300));
}

