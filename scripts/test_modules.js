const fs = require('fs');
const content = fs.readFileSync('/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js', 'utf8');

const mod2212 = content.substring(content.indexOf('2212:'), content.indexOf('30928:'));
// Let's find the exact char by binary search or parsing statement by statement!
console.log('mod2212 length:', mod2212.length);

// Let's binary search:
let low = 100, high = mod2212.length;
// We can use acorn to parse:
const acorn = require('/app/node_modules/next/dist/compiled/acorn');
try {
    acorn.parse('({' + mod2212.replace(/,\s*$/, '') + '})', { ecmaVersion: 2022 });
    console.log('Acorn parsed successfully?!');
} catch (e) {
    console.log('Acorn parse error at pos:', e.pos, 'loc:', e.loc, 'message:', e.message);
    const start = Math.max(0, e.pos - 150);
    const end = Math.min(mod2212.length, e.pos + 150);
    console.log('Code around error:\n', mod2212.substring(start, end));
}
