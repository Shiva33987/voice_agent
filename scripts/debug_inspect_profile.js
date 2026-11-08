const fs = require('fs');
const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(chunkFile)) {
    const c = fs.readFileSync(chunkFile, 'utf8');
    const idx = c.indexOf('user-profile-card');
    console.log('user-profile-card idx:', idx);
    if (idx !== -1) {
        console.log(c.substring(idx - 150, idx + 450));
    }
}
