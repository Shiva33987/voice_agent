const fs = require('fs');
const serverPage = '/app/.next/server/app/recordings/page.js';
const clientPage = '/app/.next/static/chunks/app/recordings/page-26a4f51e7eab33a5.js';

console.log('Server file exists:', fs.existsSync(serverPage));
console.log('Client file exists:', fs.existsSync(clientPage));

const sc = fs.readFileSync(serverPage, 'utf8');
const cc = fs.readFileSync(clientPage, 'utf8');

const sIdx = sc.indexOf('Uploaded recordings');
console.log('Server Uploaded recordings index:', sIdx);
if (sIdx !== -1) {
    console.log('Server snippet:\n', sc.substring(sIdx - 150, sIdx + 200));
}

const cIdx = cc.indexOf('Uploaded recordings');
console.log('Client Uploaded recordings index:', cIdx);
if (cIdx !== -1) {
    console.log('Client snippet:\n', cc.substring(cIdx - 150, cIdx + 200));
}

