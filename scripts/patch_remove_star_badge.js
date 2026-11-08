const fs = require('fs');

// 1. Patch static client chunk 5360
const clientChunk = '/app/.next/static/chunks/5360-9dace807c3efcef6.js';
if (fs.existsSync(clientChunk)) {
    let c = fs.readFileSync(clientChunk, 'utf8');
    const startStr = 'return(0,r.jsxs)("a",{href:"https://github.com/dograh-hq/dograh"';
    const endStr = 'font-medium",children:c})]})';
    const sIdx = c.indexOf(startStr);
    if (sIdx !== -1) {
        const eIdx = c.indexOf(endStr, sIdx);
        if (eIdx !== -1) {
            const target = c.substring(sIdx, eIdx + endStr.length);
            c = c.replace(target, 'return null');
            fs.writeFileSync(clientChunk, c, 'utf8');
            console.log('Successfully patched client chunk 5360: GitHubStarBadge returns null!');
        } else {
            console.warn('Could not find endStr in client chunk 5360');
        }
    } else {
        console.log('startStr already patched or not found in client chunk 5360.');
    }
}

// 2. Patch server chunk 2720
const serverChunk = '/app/.next/server/chunks/2720.js';
if (fs.existsSync(serverChunk)) {
    let c = fs.readFileSync(serverChunk, 'utf8');
    const startStr = 'return(0,d.jsxs)("a",{href:"https://github.com/dograh-hq/dograh"';
    const endStr = 'font-medium",children:j})]})';
    const sIdx = c.indexOf(startStr);
    if (sIdx !== -1) {
        const eIdx = c.indexOf(endStr, sIdx);
        if (eIdx !== -1) {
            const target = c.substring(sIdx, eIdx + endStr.length);
            c = c.replace(target, 'return null');
            fs.writeFileSync(serverChunk, c, 'utf8');
            console.log('Successfully patched server chunk 2720: GitHubStarBadge returns null!');
        } else {
            console.warn('Could not find endStr in server chunk 2720');
        }
    } else {
        console.log('startStr already patched or not found in server chunk 2720.');
    }
}

