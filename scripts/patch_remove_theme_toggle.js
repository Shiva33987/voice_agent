const fs = require('fs');

const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(chunkFile)) {
    let content = fs.readFileSync(chunkFile, 'utf8');

    const startStr = 'function Z(e){';
    const endStr = 'var G=';
    const sIdx = content.indexOf(startStr);
    if (sIdx !== -1) {
        const eIdx = content.indexOf(endStr, sIdx);
        if (eIdx !== -1) {
            const target = content.substring(sIdx, eIdx);
            content = content.replace(target, 'function Z(e){return null;}');
            fs.writeFileSync(chunkFile, content, 'utf8');
            console.log('Successfully patched layout chunk: ThemeToggle function Z returns null!');
        } else {
            console.warn('Could not find endStr in layout chunk');
        }
    } else {
        console.log('startStr already patched or not found in layout chunk.');
    }
}

