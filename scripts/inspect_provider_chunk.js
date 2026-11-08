const fs = require('fs');
const chunk = '/app/.next/static/chunks/app/model-configurations/page-0b4b08f0940cd126.js';
if (fs.existsSync(chunk)) {
    const c = fs.readFileSync(chunk, 'utf8');
    const idx = c.indexOf('Restored');
    console.log(c.substring(idx - 150, idx + 100));
}
