const fs = require('fs');
// Let's inspect where 53444 is defined in the chunks
const chunksDir = '/app/.next/static/chunks';
const files = fs.readdirSync(chunksDir);
for (const file of files) {
    if (file.endsWith('.js')) {
        const c = fs.readFileSync(chunksDir + '/' + file, 'utf8');
        if (c.includes('53444:')) {
            console.log('53444 is defined in chunk:', file);
            const idx = c.indexOf('53444:');
            console.log(c.substring(idx, idx + 300));
        }
    }
}

