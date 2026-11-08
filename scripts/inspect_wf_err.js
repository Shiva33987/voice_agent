const fs = require('fs');
const file = '/app/.next/static/chunks/app/workflow/page-5157489f3eb2ffec.js';
const code = fs.readFileSync(file, 'utf8');
const idx = code.indexOf('H=async');
console.log('H=async idx:', idx);
if (idx !== -1) {
    console.log('SURROUNDING H:', code.substring(idx - 150, idx + 250));
}
const btnIdx = code.indexOf('H(e.id,e.name)');
console.log('btnIdx:', btnIdx);
if (btnIdx !== -1) {
    console.log('SURROUNDING BTN:', code.substring(btnIdx - 150, btnIdx + 150));
}

