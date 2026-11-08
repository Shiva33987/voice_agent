const fs = require('fs');

const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
const c = fs.readFileSync(chunkFile, 'utf8');

const sIdx = c.indexOf('children:["v",');
console.log('children:["v", at:', sIdx);
if (sIdx !== -1) {
    console.log(c.substring(sIdx - 100, sIdx + 150));
} else {
    // Search around BrandLogo or call-agent
    const bIdx = c.indexOf('call-agent');
    console.log('call-agent at:', bIdx);
    if (bIdx !== -1) {
        console.log(c.substring(bIdx - 50, bIdx + 300));
    }
}

