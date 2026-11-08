const fs = require('fs');
const path = require('path');

const cssSourcePath = '/app/ultra_premium_glassmorphism.css';
if (!fs.existsSync(cssSourcePath)) {
  console.error('CSS source file not found at', cssSourcePath);
  process.exit(1);
}

const customCss = fs.readFileSync(cssSourcePath, 'utf8');

const cssDir = '/app/.next/static/css';
if (fs.existsSync(cssDir)) {
  const files = fs.readdirSync(cssDir);
  for (const file of files) {
    if (file.endsWith('.css') && file !== 'ultra_premium_glassmorphism.css') {
      const filePath = path.join(cssDir, file);
      let content = fs.readFileSync(filePath, 'utf8');

      // Markers where custom injected CSS begins
      const markers = [
        '/* ==========================================================================',
        '/* UI/UX PRO MAX'
      ];

      for (const m of markers) {
        const idx = content.indexOf(m);
        if (idx !== -1) {
          content = content.substring(0, idx);
        }
      }

      content = content.trim() + '\n\n' + customCss;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[SUCCESS] Cleaned and injected single custom CSS into: ${file} (size: ${content.length})`);
    }
  }
}

console.log('=== CSS clean & inject completed successfully ===');

