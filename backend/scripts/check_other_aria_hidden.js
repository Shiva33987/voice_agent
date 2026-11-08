const fs = require('fs');
const path = require('path');

function searchAll(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) searchAll(full);
    else if (f.endsWith('.js') && !f.endsWith('.map')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('setAttribute') && c.includes('aria-hidden')) {
        let idx = 0;
        while ((idx = c.indexOf('aria-hidden', idx)) !== -1) {
          const snippet = c.substring(Math.max(0, idx - 60), Math.min(c.length, idx + 60));
          if (snippet.includes('setAttribute')) {
            console.log(full, '-->', snippet);
          }
          idx += 11;
        }
      }
    }
  }
}

searchAll('/app/.next/static/chunks');

