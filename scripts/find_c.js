const fs = require('fs');
const clientPage = '/app/.next/static/chunks/app/recordings/page-26a4f51e7eab33a5.js';
const content = fs.readFileSync(clientPage, 'utf8');

// Find C definition
const idx = content.indexOf('function C(');
console.log('function C index:', idx);
if (idx !== -1) {
    console.log(content.substring(idx, idx + 400));
} else {
    // maybe var C = ... or let C = ...
    const idx2 = content.indexOf('C=');
    console.log('C= index:', idx2);
    if (idx2 !== -1) {
        console.log(content.substring(idx2 - 50, idx2 + 200));
    }
}

