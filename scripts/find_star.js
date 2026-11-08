const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            searchDir(fullPath);
        } else if (entry.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.html'))) {
            try {
                const c = fs.readFileSync(fullPath, 'utf8');
                if (c.includes('>Star<') || c.includes('"Star"') || c.includes('github.com/dograh')) {
                    console.log('FOUND IN:', fullPath);
                    const idx = c.indexOf('Star');
                    console.log('Sample:', c.substring(Math.max(0, idx - 50), Math.min(c.length, idx + 100)));
                }
            } catch (e) {}
        }
    }
}

searchDir('/app/.next');
