const fs = require('fs');
const vm = require('vm');

console.log("=== Patching BrandLogo & Fixing syntax in all chunks ===");

function checkAndFix(filePath, badPattern, goodReplacement) {
  if (!fs.existsSync(filePath)) {
    console.log("File not found:", filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace bad 3-brace patterns with proper 2-brace
  if (content.includes(badPattern)) {
    content = content.replace(badPattern, goodReplacement);
  }

  // Also handle if the full original function is still present
  const fullTargetRegex = /function\s+[a-zA-Z0-9_$]+\s*\([^)]*\)\s*\{let\{className:[^}]*\}\s*=\s*e;return\s+[a-zA-Z0-9_$]+\?\(0,[a-zA-Z0-9_$]+\.jsx\)\("img",\{src:"\/dograh-mark\.png"[\s\S]*?dark:block",t\)\}\]\)\)\}/;
  if (fullTargetRegex.test(content)) {
    content = content.replace(fullTargetRegex, 'function r(e){return null}');
  }

  // Check syntax
  try {
    new vm.Script(content);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[SUCCESS] ${filePath}: Syntax validated and file updated.`);
  } catch (err) {
    console.error(`[ERROR] ${filePath}: Syntax check failed:`, err.message);
  }
}

// 1. Layout chunk
checkAndFix(
  '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js',
  'function r(e){return null}}}',
  'function r(e){return null}}'
);

// 2. Chunk 1428
checkAndFix(
  '/app/.next/static/chunks/1428-8159fba13cb56411.js',
  'function n(e){return null}}}',
  'function n(e){return null}}'
);

// 3. Server chunk 2720
checkAndFix(
  '/app/.next/server/chunks/2720.js',
  'function f(e){return null}}}',
  'function f(e){return null}}'
);

console.log("=== BrandLogo syntax fix completed ===");
