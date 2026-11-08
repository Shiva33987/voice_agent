const fs = require('fs');
const vm = require('vm');

console.log("=== Disabling Chatwoot Widget ===");

const layoutChunkPath = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(layoutChunkPath)) {
  let content = fs.readFileSync(layoutChunkPath, 'utf8');

  const startIdx = content.indexOf('33280:');
  const endIdx = content.indexOf(',38614:', startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    const oldModule = content.substring(startIdx, endIdx);
    const newModule = '33280:(e,t,s)=>{"use strict";s.d(t,{default:()=>i});function i(){return null}}';
    content = content.replace(oldModule, newModule);

    try {
      new vm.Script(content);
      fs.writeFileSync(layoutChunkPath, content, 'utf8');
      console.log("[SUCCESS] Disabled Chatwoot widget in layout chunk and syntax validated!");
    } catch (err) {
      console.error("[ERROR] Syntax error when disabling Chatwoot:", err.message);
    }
  } else {
    console.log("Chatwoot module 33280 markers not found in layout chunk.");
  }
} else {
  console.log("Layout chunk not found at:", layoutChunkPath);
}

