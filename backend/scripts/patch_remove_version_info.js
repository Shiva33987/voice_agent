const fs = require('fs');

const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(chunkFile)) {
    let content = fs.readFileSync(chunkFile, 'utf8');

    const targetPattern = /y&&\(\d,n\.jsxs\)\("span",\{className:"notranslate text-xs font-normal text-muted-foreground",translate:"no",children:\["v",y\.ui\]\}\)/;
    if (targetPattern.test(content)) {
        content = content.replace(targetPattern, 'null');
        fs.writeFileSync(chunkFile, content, 'utf8');
        console.log('Successfully removed version info from client layout chunk!');
    } else {
        const targetStr = '(0,n.jsxs)("span",{className:"notranslate text-xs font-normal text-muted-foreground",translate:"no",children:["v",y.ui]})';
        if (content.includes(targetStr)) {
            content = content.replace(targetStr, 'null');
            fs.writeFileSync(chunkFile, content, 'utf8');
            console.log('Successfully removed targetStr version info from client layout chunk!');
        } else {
            console.log('Version info pattern already removed or not found.');
        }
    }
}

