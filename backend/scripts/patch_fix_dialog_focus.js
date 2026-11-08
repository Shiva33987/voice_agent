const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Patching Dialog onOpenAutoFocus to fix Blocked aria-hidden error ===");

const targetStr = 'onOpenAutoFocus:e=>e.preventDefault()';
const replaceStr = 'onOpenAutoFocus:e=>{document.activeElement&&document.activeElement.blur&&document.activeElement.blur()}';

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      patchDir(full);
    } else if (file.endsWith('.js') && !file.endsWith('.map')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes(targetStr)) {
        content = content.replaceAll(targetStr, replaceStr);
        try {
          new vm.Script(content);
          fs.writeFileSync(full, content, 'utf8');
          console.log(`[SUCCESS] Patched dialog focus in: ${full}`);
        } catch (err) {
          console.error(`[ERROR] Syntax error in ${full}:`, err.message);
        }
      }
    }
  }
}

patchDir('/app/.next/static');
patchDir('/app/.next/server');

console.log("=== Dialog focus patch complete ===");

