const fs = require('fs');
const vm = require('vm');

console.log("=== Patching Instruction Guide URL to /overview and Adding 307 Redirect for /guide ===");

// 1. Client layout chunk
const clientLayoutPath = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(clientLayoutPath)) {
  let content = fs.readFileSync(clientLayoutPath, 'utf8');
  content = content.replaceAll('{title:"Instruction Guide",url:"/guide"', '{title:"Instruction Guide",url:"/overview"');
  try {
    new vm.Script(content);
    fs.writeFileSync(clientLayoutPath, content, 'utf8');
    console.log('[SUCCESS] Updated client layout chunk with url: "/overview"');
  } catch (e) {
    console.error('[ERROR] Syntax error in client layout chunk:', e.message);
  }
}

// 2. Server layout chunk
const serverLayoutPath = '/app/.next/server/chunks/2720.js';
if (fs.existsSync(serverLayoutPath)) {
  let content = fs.readFileSync(serverLayoutPath, 'utf8');
  content = content.replaceAll('{title:"Instruction Guide",url:"/guide"', '{title:"Instruction Guide",url:"/overview"');
  try {
    new vm.Script(content);
    fs.writeFileSync(serverLayoutPath, content, 'utf8');
    console.log('[SUCCESS] Updated server layout chunk with url: "/overview"');
  } catch (e) {
    console.error('[ERROR] Syntax error in server layout chunk:', e.message);
  }
}

// 3. Update server.js to redirect /guide -> /overview
const serverJsPath = '/app/server.js';
if (fs.existsSync(serverJsPath)) {
  let content = fs.readFileSync(serverJsPath, 'utf8');
  
  // Clean up any previous prototype.emit interceptor
  if (content.includes('http.Server.prototype.emit')) {
    const endOfEmit = content.indexOf('};\n\n') + 4;
    content = content.substring(endOfEmit);
  }

  // Prepend clean 307 redirect handler
  const redirectHandler = `const http = require('http');
const origEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event === 'request') {
    const req = args[0];
    const res = args[1];
    if (req && req.url) {
      if (req.url === '/guide' || req.url.startsWith('/guide?')) {
        const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
        res.writeHead(307, { Location: '/overview' + query });
        res.end();
        return;
      }
    }
  }
  return origEmit.apply(this, [event, ...args]);
};

`;
  content = redirectHandler + content;
  fs.writeFileSync(serverJsPath, content, 'utf8');
  console.log('[SUCCESS] Updated server.js with clean 307 redirect for /guide -> /overview');
}

console.log("=== Instruction Guide /overview routing setup complete ===");

