const fs = require('fs');
const filePath = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
let c = fs.readFileSync(filePath, 'utf8');

const targetRegex = /B=N\?\(0,n\.jsxs\)\(J\.m_[\s\S]*?Hire an Expert"\]\}\)/;
if (targetRegex.test(c)) {
  c = c.replace(targetRegex, 'B=null');
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Successfully replaced B with null in layout chunk');
} else {
  console.log('Regex did not match directly, trying substring replacement');
  const startStr = 'B=N?(0,n.jsxs)(J.m_,';
  const endStr = 'Hire an Expert"]})';
  const sIdx = c.indexOf(startStr);
  const eIdx = c.indexOf(endStr, sIdx);
  if (sIdx !== -1 && eIdx !== -1) {
    const fullEnd = eIdx + endStr.length;
    c = c.substring(0, sIdx) + 'B=null' + c.substring(fullEnd);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Successfully replaced substring with B=null');
  } else {
    console.error('Could not find start/end indices: start=' + sIdx + ', end=' + eIdx);
  }
}

