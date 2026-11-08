const fs = require('fs');

const cssFiles = fs.readdirSync('/app/.next/static/css').filter(f => f.endsWith('.css'));
for (const file of cssFiles) {
  const content = fs.readFileSync('/app/.next/static/css/' + file, 'utf8');
  console.log('===', file, '===');
  
  // Search for properties that break position:fixed on ancestors
  const regex = /([^{}]+)\{([^{}]*(?:transform|filter|perspective|contain)[^{}]*)\}/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const selector = match[1].trim();
    const rules = match[2].trim();
    if (selector.includes('body') || selector.includes('html') || selector.includes('wrapper') || selector.includes('slot="sidebar"') || selector.includes('surface') || selector.includes('peer') || selector.includes('flex')) {
      if (!rules.includes('transform:none') && !rules.includes('filter:none')) {
        console.log('SUSPICIOUS SELECTOR:', selector);
        console.log('RULES:', rules.substring(0, 100));
      }
    }
  }
}

