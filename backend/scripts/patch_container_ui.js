const fs = require('fs');
const path = require('path');

function replaceInDir(dir, pattern, replacement, filter) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceInDir(fullPath, pattern, replacement, filter);
    } else if (!filter || filter(entry.name)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated: ${fullPath}`);
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

// 1. Remove brand-imprint in CSS
replaceInDir('/app/.next/static/css', /--brand-imprint:url\([^)]+\)/g, '--brand-imprint:none', (f) => f.endsWith('.css'));
replaceInDir('/app/.next/static/css', /background-image:var\(--brand-imprint\);?/g, 'background-image:none;', (f) => f.endsWith('.css'));

// 2. Clear brand imprint SVGs
const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"></svg>';
if (fs.existsSync('/app/public/brand-imprint-dark.svg')) fs.writeFileSync('/app/public/brand-imprint-dark.svg', emptySvg);
if (fs.existsSync('/app/public/brand-imprint-light.svg')) fs.writeFileSync('/app/public/brand-imprint-light.svg', emptySvg);

// 3. Make dograh-mark.png, dograh-logo.png, dograh-logo-inverse.png transparent 1x1 png (base64)
const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
['dograh-mark.png', 'dograh-logo.png', 'dograh-logo-inverse.png'].forEach(file => {
  const p = path.join('/app/public', file);
  if (fs.existsSync(p)) {
    fs.writeFileSync(p, transparentPng);
    console.log(`Replaced with transparent PNG: ${p}`);
  }
});

// 4. In all HTML, JS, RSC files:
// Replace title, alt, and user-facing "Dograh" words
replaceInDir('/app/.next', /<title>Dograh<\/title>/g, '<title>call-agent</title>', (f) => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.rsc'));
replaceInDir('/app/.next', /title:\s*["']Dograh["']/g, 'title:"call-agent"', (f) => f.endsWith('.js'));
replaceInDir('/app/.next', /alt:\s*["']Dograh["']/g, 'alt:""', (f) => f.endsWith('.js'));
replaceInDir('/app/.next', /"Dograh"/g, '"call-agent"', (f) => f.endsWith('.js') && !f.endsWith('.map'));
replaceInDir('/app/.next', /Dograh/g, 'call-agent', (f) => f.endsWith('.html') || f.endsWith('.rsc'));

console.log('UI patch complete');
