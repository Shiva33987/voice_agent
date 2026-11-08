const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Scanning for aria-hidden library chunks ===");

const target = '1===c&&e.setAttribute(n,"true"),a||e.setAttribute(u,"true")';
const replacement = '1===c&&e.setAttribute(n,"true"),a||(typeof document!=="undefined"&&document.activeElement&&(e===document.activeElement||e.contains(document.activeElement)))||e.setAttribute(u,"true")';

let patchedCount = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (file.endsWith('.js') && !file.endsWith('.map')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes(target)) {
        console.log("Found match in:", full);
        content = content.replaceAll(target, replacement);
        try {
          new vm.Script(content);
          fs.writeFileSync(full, content, 'utf8');
          patchedCount++;
          console.log("[SUCCESS] Patched and validated:", full);
        } catch (err) {
          console.error("[ERROR] Syntax error in", full, err.message);
        }
      }
    }
  }
}

scanDir('/app/.next/static/chunks');
scanDir('/app/.next/server');

console.log(`=== Done. Patched ${patchedCount} chunks ===`);

