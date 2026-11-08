const fs = require('fs');
const clientFile = '/app/.next/static/chunks/app/workflow/page-5157489f3eb2ffec.js';
let content = fs.readFileSync(clientFile, 'utf8');

const sIdx = content.indexOf('Archiving...');
console.log('Archiving... index:', sIdx);
if (sIdx !== -1) {
    console.log('Snippet:\n', content.substring(sIdx - 100, sIdx + 400));
}

