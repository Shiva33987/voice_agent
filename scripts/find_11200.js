const fs = require('fs');
const clientPage = '/app/.next/static/chunks/app/recordings/page-26a4f51e7eab33a5.js';
const content = fs.readFileSync(clientPage, 'utf8');

console.log(content.substring(11150, 11500));

