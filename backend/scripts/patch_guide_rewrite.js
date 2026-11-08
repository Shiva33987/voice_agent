const fs = require('fs');

console.log("=== Patching /guide rewrite in server.js and routes-manifest ===");

// 1. Patch server.js
const serverJsPath = '/app/server.js';
if (fs.existsSync(serverJsPath)) {
  let content = fs.readFileSync(serverJsPath, 'utf8');
  if (!content.includes('http.Server.prototype.emit')) {
    const interceptor = `// Intercept /guide and internally rewrite to /overview
const http = require('http');
const origEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event === 'request') {
    const req = args[0];
    if (req && req.url) {
      if (req.url === '/guide') {
        req.url = '/overview';
      } else if (req.url.startsWith('/guide?')) {
        req.url = req.url.replace('/guide?', '/overview?');
      } else if (req.url.startsWith('/guide/')) {
        req.url = req.url.replace('/guide/', '/overview/');
      }
    }
  }
  return origEmit.apply(this, [event, ...args]);
};

`;
    content = interceptor + content;

    // Also update _originalRewrites in nextConfig inside server.js
    content = content.replace(
      '"_originalRewrites":{"beforeFiles":[],',
      '"_originalRewrites":{"beforeFiles":[{"source":"/guide","destination":"/overview"}],'
    );

    fs.writeFileSync(serverJsPath, content, 'utf8');
    console.log('[SUCCESS] Patched server.js with request interceptor!');
  } else {
    console.log('server.js already contains interceptor.');
  }
}

// 2. Patch routes-manifest.json
const routesManifestPath = '/app/.next/routes-manifest.json';
if (fs.existsSync(routesManifestPath)) {
  const rm = JSON.parse(fs.readFileSync(routesManifestPath, 'utf8'));
  const rewriteEntry = {
    source: '/guide',
    destination: '/overview',
    regex: '^/guide(?:/)?$'
  };
  
  if (!rm.rewrites.beforeFiles.some(r => r.source === '/guide')) {
    rm.rewrites.beforeFiles.unshift(rewriteEntry);
  }
  if (!rm.rewrites.afterFiles.some(r => r.source === '/guide')) {
    rm.rewrites.afterFiles.unshift(rewriteEntry);
  }
  fs.writeFileSync(routesManifestPath, JSON.stringify(rm, null, 2), 'utf8');
  console.log('[SUCCESS] Updated routes-manifest.json with /guide -> /overview rewrites!');
}

console.log("=== Finished patch_guide_rewrite ===");

