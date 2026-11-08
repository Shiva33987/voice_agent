const fs = require('fs');
const path = require('path');

const cssSourcePath = '/app/ultra_premium_glassmorphism.css';
if (!fs.existsSync(cssSourcePath)) {
    console.error('CSS source file not found at', cssSourcePath);
    process.exit(1);
}

const customCss = fs.readFileSync(cssSourcePath, 'utf8');
const signature = '/* UI/UX PRO MAX - ULTRA-PREMIUM VIBRANT GLASSMORPHISM & NEBULA CANVAS */';

// 1. Inject into all compiled CSS files in /app/.next/static/css/
const cssDir = '/app/.next/static/css';
if (fs.existsSync(cssDir)) {
    const files = fs.readdirSync(cssDir);
    for (const file of files) {
        if (file.endsWith('.css') && file !== 'ultra_premium_glassmorphism.css') {
            const filePath = path.join(cssDir, file);
            let content = fs.readFileSync(filePath, 'utf8');

            if (content.includes(signature)) {
                const sIdx = content.indexOf(signature);
                content = content.substring(0, sIdx) + customCss;
                console.log(`Updated premium styling in ${file}`);
            } else {
                content += '\n\n' + customCss;
                console.log(`Appended premium styling into ${file}`);
            }

            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
}

console.log('Successfully injected UI/UX Pro Max Glassmorphism & Vibrant Nebula system!');

