const fs = require('fs');

const f = '/app/.next/server/chunks/2720.js';
if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const idx = c.indexOf('github.com/dograh');
    console.log('--- in 2720 server chunk at:', idx);
    console.log(c.substring(idx - 100, idx + 400));
} else {
    console.log('2720.js does not exist');
}

