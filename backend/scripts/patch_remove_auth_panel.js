const fs = require('fs');
const vm = require('vm');

console.log("=== Removing Auth Brand/Enterprise Panel from Chunks and Server Pages ===");

// 1. Client Chunk 1428-8159fba13cb56411.js
const clientChunkPath = '/app/.next/static/chunks/1428-8159fba13cb56411.js';
if (fs.existsSync(clientChunkPath)) {
  let content = fs.readFileSync(clientChunkPath, 'utf8');
  const modStart = content.indexOf('39814:');
  const modEnd = content.indexOf(',88142:', modStart);

  if (modStart !== -1 && modEnd !== -1) {
    const newModule = '39814:(e,t,a)=>{a.d(t,{z:()=>l});var r=a(95155),s=a(14357);function l(e){let{children:t}=e;return(0,r.jsx)("div",{className:"flex min-h-screen w-full items-center justify-center bg-background",children:(0,r.jsx)("main",{className:"auth-imprint flex min-h-screen w-full flex-col overflow-y-auto",children:(0,r.jsx)("div",{className:"flex min-h-full items-center justify-center p-6 sm:p-10",children:(0,r.jsxs)("div",{className:"w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-lg sm:p-8",children:[(0,r.jsx)("div",{className:"flex justify-center",children:(0,r.jsx)(s.F,{className:"h-7"})}),t]})})})})}}';
    content = content.substring(0, modStart) + newModule + content.substring(modEnd);

    try {
      new vm.Script(content);
      fs.writeFileSync(clientChunkPath, content, 'utf8');
      console.log('[SUCCESS] Patched client chunk 1428-8159fba13cb56411.js!');
    } catch (e) {
      console.error('[ERROR] Syntax error in client chunk:', e.message);
    }
  } else {
    console.warn('Could not locate module 39814 bounds in client chunk.');
  }
}

// 2. Server Pages: login, signup, handler/[...stack]
const serverFiles = [
  '/app/.next/server/app/auth/login/page.js',
  '/app/.next/server/app/auth/signup/page.js',
  '/app/.next/server/app/handler/[...stack]/page.js'
];

serverFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.warn('File not found:', filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  const phrase = 'The open-source voice AI platform';
  const idx = content.indexOf(phrase);
  if (idx === -1) {
    console.log(`[SKIP] Phrase not found in ${filePath} (already patched or not present)`);
    return;
  }

  // Find the AuthShell function declaration containing this phrase
  const fnStart = content.lastIndexOf('function ', idx);
  // Find where this function ends
  // Exact suffix: teams."}),b]})]})]})}`
  const endToken = 'teams."}),b]})]})]})}';
  const endTokenIdx = content.indexOf(endToken, idx);
  if (endTokenIdx === -1) {
    console.warn('Could not find endToken in:', filePath);
    return;
  }
  const fnEnd = endTokenIdx + endToken.length;

  const fnSub = content.substring(fnStart, fnEnd);
  // Extract function name
  const fnNameMatch = fnSub.match(/^function\s+([a-zA-Z0-9_$]+)/);
  if (!fnNameMatch) {
    console.warn('Could not match function name in:', filePath);
    return;
  }
  const fnName = fnNameMatch[1];

  // Extract JSX runtime identifier
  const jsxMatch = fnSub.match(/\{return\(0,([a-zA-Z0-9_$]+)\.jsxs\)\("div"/);
  const jsxRuntime = jsxMatch ? jsxMatch[1] : 'd';

  // Extract logo call e.g. (0,d.jsx)(e.F,{className:"h-7"})
  const logoMatch = fnSub.match(/children:\(0,[a-zA-Z0-9_$]+\.jsx\)\(([a-zA-Z0-9_$]+)\.F/);
  const logoVar = logoMatch ? logoMatch[1] : 'e';

  const replacementFn = `function ${fnName}({children:a,enterpriseSlot:b}){return(0,${jsxRuntime}.jsx)("div",{className:"flex min-h-screen w-full items-center justify-center bg-background",children:(0,${jsxRuntime}.jsx)("main",{className:"auth-imprint flex min-h-screen w-full flex-col overflow-y-auto",children:(0,${jsxRuntime}.jsx)("div",{className:"flex min-h-full items-center justify-center p-6 sm:p-10",children:(0,${jsxRuntime}.jsxs)("div",{className:"w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-lg sm:p-8",children:[(0,${jsxRuntime}.jsx)("div",{className:"flex justify-center",children:(0,${jsxRuntime}.jsx)(${logoVar}.F,{className:"h-7"})}),a]})})})})}`;

  content = content.substring(0, fnStart) + replacementFn + content.substring(fnEnd);

  try {
    new vm.Script(content);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[SUCCESS] Patched server page: ${filePath}`);
  } catch (e) {
    console.error(`[ERROR] Syntax error in ${filePath}:`, e.message);
  }
});

console.log("=== All Auth Panel Removals Completed ===");
