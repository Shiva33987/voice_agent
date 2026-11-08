const fs = require('fs');
const file = '/app/.next/static/chunks/app/workflow/page-5157489f3eb2ffec.js';
const code = fs.readFileSync(file, 'utf8');
const idx = code.indexOf('Are you sure you want to permanently delete');
console.log('delete msg idx:', idx);
if (idx !== -1) {
    console.log('SURROUNDING DELETE MSG:', code.substring(idx - 100, idx + 200));
}

