const fs = require('fs');
const file = '/app/.next/static/chunks/app/workflow/page-5157489f3eb2ffec.js';
let code = fs.readFileSync(file, 'utf8');
console.log('Snippet around 33154:');
console.log(code.substring(33050, 33400));

