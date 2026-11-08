const fs = require('fs');
const content = fs.readFileSync('/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js', 'utf8');

// Parse using acorn or standard JS parser
// We can find where the error happens by binary searching or testing functions
console.log('Total length:', content.length);

// Let's check around our recent edits:
// 1. "Instruction Guide"
const igIdx = content.indexOf('Instruction Guide');
console.log('igIdx:', igIdx);
if (igIdx !== -1) {
    console.log(content.substring(igIdx - 50, igIdx + 150));
}

// 2. "user-profile-card"
const upIdx = content.indexOf('user-profile-card');
console.log('upIdx:', upIdx);
if (upIdx !== -1) {
    console.log(content.substring(upIdx - 100, upIdx + 200));
}

// 3. Let's find syntax error using acorn or vm
// We can locate the column by finding the caret in the error
const vm = require('vm');
try {
    new vm.Script(content, { lineOffset: 0 });
} catch (e) {
    const lines = e.stack.split('\n');
    console.log('Error line 0:', lines[0]);
    console.log('Error line 1:', lines[1]);
    console.log('Error line 2:', lines[2]);
    // The caret line:
    if (lines[2]) {
        const caretPos = lines[2].indexOf('^');
        console.log('caretPos:', caretPos);
        if (caretPos !== -1) {
            console.log('Around caret:');
            console.log(content.substring(caretPos - 100, caretPos + 100));
        }
    }
}
