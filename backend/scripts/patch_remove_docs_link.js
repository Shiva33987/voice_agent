const fs = require('fs');
const vm = require('vm');

console.log("=== Removing provider docs link from telephony config dialog ===");

// 1. Client chunk
const clientChunk = '/app/.next/static/chunks/2901-0fb476ff9cf9a454.js';
if (fs.existsSync(clientChunk)) {
  let content = fs.readFileSync(clientChunk, 'utf8');
  const targetClient = '(null==O?void 0:O.docs_url)&&(0,r.jsxs)("a",{href:O.docs_url,target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-1 text-xs text-blue-600 underline",children:[O.display_name," docs ",(0,r.jsx)(s.A,{className:"h-3 w-3"})]})';
  
  if (content.includes(targetClient)) {
    content = content.replace(targetClient, 'null');
    try {
      new vm.Script(content);
      fs.writeFileSync(clientChunk, content, 'utf8');
      console.log("[SUCCESS] Removed docs link from client chunk 2901");
    } catch (err) {
      console.error("[ERROR] Syntax error in client chunk 2901:", err.message);
    }
  } else {
    console.log("Client chunk already patched or target not matched.");
  }
}

// 2. Server chunk
const serverChunk = '/app/.next/server/chunks/9395.js';
if (fs.existsSync(serverChunk)) {
  let content = fs.readFileSync(serverChunk, 'utf8');
  const targetServer = 'K?.docs_url&&(0,d.jsxs)("a",{href:K.docs_url,target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-1 text-xs text-blue-600 underline",children:[K.display_name," docs ",(0,d.jsx)(f.A,{className:"h-3 w-3"})]})';

  if (content.includes(targetServer)) {
    content = content.replace(targetServer, 'null');
    try {
      new vm.Script(content);
      fs.writeFileSync(serverChunk, content, 'utf8');
      console.log("[SUCCESS] Removed docs link from server chunk 9395");
    } catch (err) {
      console.error("[ERROR] Syntax error in server chunk 9395:", err.message);
    }
  } else {
    console.log("targetServer not found in chunk 9395");
  }
}

console.log("=== Docs link removal patch complete ===");
