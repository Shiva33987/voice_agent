const fs = require('fs');
const clientFile = '/app/.next/static/chunks/app/workflow/page-5157489f3eb2ffec.js';
let content = fs.readFileSync(clientFile, 'utf8');

console.log(content.substring(32500, 34000));

