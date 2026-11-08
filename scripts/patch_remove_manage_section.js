const fs = require('fs');

const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(chunkFile)) {
    let content = fs.readFileSync(chunkFile, 'utf8');

    const managePattern = /,\{label:"MANAGE",items:\[[\s\S]*?\]\}/;
    if (managePattern.test(content)) {
        content = content.replace(managePattern, '');
        fs.writeFileSync(chunkFile, content, 'utf8');
        console.log('Successfully removed MANAGE section from client layout chunk!');
    } else {
        console.log('MANAGE section already removed or not found.');
    }
} else {
    console.warn('Chunk file not found:', chunkFile);
}

