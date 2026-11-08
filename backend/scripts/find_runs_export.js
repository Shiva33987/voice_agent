const fs = require('fs');
const c = fs.readFileSync('/app/.next/static/chunks/4269-10b56f561ac27261.js', 'utf8');
const target = '/api/v1/organizations/usage/runs';
const idx = c.indexOf(target);
console.log('Target index:', idx);
if (idx !== -1) {
    console.log(c.substring(idx - 100, idx + 100));
}

