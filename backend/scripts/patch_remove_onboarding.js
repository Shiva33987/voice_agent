const fs = require('fs');
const vm = require('vm');

console.log("=== Disabling OnboardingModal in Next.js Bundles ===");

// 1. Client Chunk 5360
const clientChunk5360 = '/app/.next/static/chunks/5360-9dace807c3efcef6.js';
if (fs.existsSync(clientChunk5360)) {
  let content = fs.readFileSync(clientChunk5360, 'utf8');
  const phrase = 'tailor your experience';
  const idx = content.indexOf(phrase);
  if (idx !== -1) {
    const fnStart = content.lastIndexOf('function O(e)', idx);
    const endToken = 'var D=a(84574);';
    const fnEnd = content.indexOf(endToken, idx);
    if (fnStart !== -1 && fnEnd !== -1) {
      content = content.substring(0, fnStart) + 'function O(e){return null}' + content.substring(fnEnd);
      try {
        new vm.Script(content);
        fs.writeFileSync(clientChunk5360, content, 'utf8');
        console.log('[SUCCESS] Replaced OnboardingModal in client chunk 5360');
      } catch (e) {
        console.error('[ERROR] Syntax error in client chunk 5360:', e.message);
      }
    } else {
      console.warn('Could not determine bounds in client chunk 5360');
    }
  } else {
    console.log('[SKIP] OnboardingModal phrase not found in client chunk 5360');
  }
}

// 2. Server Chunk 2720
const serverChunk2720 = '/app/.next/server/chunks/2720.js';
if (fs.existsSync(serverChunk2720)) {
  let content = fs.readFileSync(serverChunk2720, 'utf8');
  const phrase = 'tailor your experience';
  const idx = content.indexOf(phrase);
  if (idx !== -1) {
    const fnStart = content.lastIndexOf('function F({', idx);
    const endToken = 'var G=c(12456);';
    const fnEnd = content.indexOf(endToken, idx);
    if (fnStart !== -1 && fnEnd !== -1) {
      content = content.substring(0, fnStart) + 'function F({open:a,onComplete:b}){return null}' + content.substring(fnEnd);
      try {
        new vm.Script(content);
        fs.writeFileSync(serverChunk2720, content, 'utf8');
        console.log('[SUCCESS] Replaced OnboardingModal in server chunk 2720');
      } catch (e) {
        console.error('[ERROR] Syntax error in server chunk 2720:', e.message);
      }
    } else {
      console.warn('Could not determine bounds in server chunk 2720');
    }
  } else {
    console.log('[SKIP] OnboardingModal phrase not found in server chunk 2720');
  }
}

console.log("=== Onboarding Removal Complete ===");

