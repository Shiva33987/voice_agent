const fs = require('fs');

const modelPath = '/app/.next/static/chunks/app/model-configurations/page-0b4b08f0940cd126.js';
const provPath = '/app/.next/static/chunks/app/provider-connections/page-a639be017c4b8a30.js';

function inspect(filePath, label) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`=== ${label} ===`);
  const idx = code.indexOf('Restoring');
  if (idx !== -1) {
    console.log(code.substring(idx - 200, idx + 200));
  } else {
    console.log('Restoring not found');
  }
}

inspect(modelPath, 'MODEL');
inspect(provPath, 'PROV');

