const fs = require('fs');

// Copy server app overview to guide
if (!fs.existsSync('/app/.next/server/app/guide')) {
    fs.cpSync('/app/.next/server/app/overview', '/app/.next/server/app/guide', { recursive: true });
}

// Add to app-paths-manifest.json
const manifestPath = '/app/.next/server/app-paths-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest['/guide/page'] = 'app/guide/page.js';
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

// Copy static chunks app overview to guide
if (!fs.existsSync('/app/.next/static/chunks/app/guide')) {
    fs.cpSync('/app/.next/static/chunks/app/overview', '/app/.next/static/chunks/app/guide', { recursive: true });
}

// Check app-build-manifest.json
const buildManifestPath = '/app/.next/app-build-manifest.json';
if (fs.existsSync(buildManifestPath)) {
    const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
    if (buildManifest.pages && buildManifest.pages['/overview/page']) {
        buildManifest.pages['/guide/page'] = buildManifest.pages['/overview/page'];
        fs.writeFileSync(buildManifestPath, JSON.stringify(buildManifest, null, 2), 'utf8');
    }
}

console.log('Registered /guide route successfully!');

