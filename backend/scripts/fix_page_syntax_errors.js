const fs = require('fs');
const vm = require('vm');

console.log("=== Fixing Syntax Errors in model-configurations and provider-connections ===");

// 1. Model Configurations
const modelPath = '/app/.next/static/chunks/app/model-configurations/page-0b4b08f0940cd126.js';
if (fs.existsSync(modelPath)) {
  let content = fs.readFileSync(modelPath, 'utf8');

  // Fix archived section
  const targetOld = '(0,s.jsx)("div",{className:"flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto",children:(0,s.jsxs)(g.$,{type:"button",variant:"outline",size:"sm",disabled:P||E||r,onClick:()=>void V(e.uuid),children:[(0,s.jsx)(l.A,{className:"h-3.5 w-3.5"}),T===e.uuid?"Restoring…":"Restore"]}),(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",className:"text-rose-500 hover:text-rose-400 hover:bg-rose-500/10",disabled:P||E||r,onClick:async()=>{if(window.confirm(\'Are you sure you want to permanently delete "\'+e.name+\'"? This action cannot be undone.\')){D(!0);try{let t=await fetch("/api/v1/model-configurations/"+e.uuid+"?permanent=true",{method:"DELETE"});if(!t.ok){let r=await t.json().catch(()=>({}));throw Error(r.detail||"Failed to delete model configuration")}await B(),f.oR.success("Model configuration deleted")}catch(t){F(t instanceof Error?t.message:"Failed to delete model configuration"),f.oR.error(t instanceof Error?t.message:"Failed to delete model configuration")}finally{D(!1)}}},children:"Delete"})})';

  const targetFixed = '(0,s.jsxs)("div",{className:"flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto",children:[(0,s.jsxs)(g.$,{type:"button",variant:"outline",size:"sm",disabled:P||E||r,onClick:()=>void V(e.uuid),children:[(0,s.jsx)(l.A,{className:"h-3.5 w-3.5"}),T===e.uuid?"Restoring…":"Restore"]}),(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",className:"text-rose-500 hover:text-rose-400 hover:bg-rose-500/10",disabled:P||E||r,onClick:async()=>{if(window.confirm(\'Are you sure you want to permanently delete "\'+e.name+\'"? This action cannot be undone.\')){D(!0);try{let t=await fetch("/api/v1/model-configurations/"+e.uuid+"?permanent=true",{method:"DELETE"});if(!t.ok){let r=await t.json().catch(()=>({}));throw Error(r.detail||"Failed to delete model configuration")}await B(),f.oR.success("Model configuration deleted")}catch(t){F(t instanceof Error?t.message:"Failed to delete model configuration"),f.oR.error(t instanceof Error?t.message:"Failed to delete model configuration")}finally{D(!1)}}},children:"Delete"})]})';

  if (content.includes(targetOld)) {
    content = content.replace(targetOld, targetFixed);
    console.log('[MODEL] Successfully replaced archived div structure!');
  } else {
    console.warn('[MODEL] targetOld not matched directly, checking partial replacement...');
    // Let's do precise regex or substring replacement
    const oldPrefix = '(0,s.jsx)("div",{className:"flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto",children:(0,s.jsxs)(g.$,{type:"button",variant:"outline",size:"sm",disabled:P||E||r,onClick:()=>void V(e.uuid),children:[(0,s.jsx)(l.A,{className:"h-3.5 w-3.5"}),T===e.uuid?"Restoring…":"Restore"]}),';
    const newPrefix = '(0,s.jsxs)("div",{className:"flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto",children:[(0,s.jsxs)(g.$,{type:"button",variant:"outline",size:"sm",disabled:P||E||r,onClick:()=>void V(e.uuid),children:[(0,s.jsx)(l.A,{className:"h-3.5 w-3.5"}),T===e.uuid?"Restoring…":"Restore"]}),';
    if (content.includes(oldPrefix)) {
      content = content.replace(oldPrefix, newPrefix);
      // And replace closing of delete button
      content = content.replace('finally{D(!1)}}},children:"Delete"})})', 'finally{D(!1)}}},children:"Delete"})]})');
      console.log('[MODEL] Replaced via prefix & suffix!');
    }
  }

  try {
    new vm.Script(content);
    fs.writeFileSync(modelPath, content, 'utf8');
    console.log('[MODEL] VALID JS SYNTAX! Saved successfully.');
  } catch (err) {
    console.error('[MODEL] Still syntax error:', err.message);
  }
}

// 2. Provider Connections
const provPath = '/app/.next/static/chunks/app/provider-connections/page-a639be017c4b8a30.js';
if (fs.existsSync(provPath)) {
  let content = fs.readFileSync(provPath, 'utf8');

  const oldProvPrefix = '(0,s.jsx)("div",{className:"flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto",children:(0,s.jsxs)(g.$,{type:"button",variant:"outline",size:"sm",disabled:P||C,onClick:()=>void q(e.uuid),children:[(0,s.jsx)(d.A,{className:"h-3.5 w-3.5"}),O===e.uuid?"Restoring…":"Restore"]}),';
  const newProvPrefix = '(0,s.jsxs)("div",{className:"flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto",children:[(0,s.jsxs)(g.$,{type:"button",variant:"outline",size:"sm",disabled:P||C,onClick:()=>void q(e.uuid),children:[(0,s.jsx)(d.A,{className:"h-3.5 w-3.5"}),O===e.uuid?"Restoring…":"Restore"]}),';

  if (content.includes(oldProvPrefix)) {
    content = content.replace(oldProvPrefix, newProvPrefix);
    content = content.replace('finally{M(!1)}}},children:"Delete"})})', 'finally{M(!1)}}},children:"Delete"})]})');
    console.log('[PROV] Replaced via prefix & suffix!');
  }

  try {
    new vm.Script(content);
    fs.writeFileSync(provPath, content, 'utf8');
    console.log('[PROV] VALID JS SYNTAX! Saved successfully.');
  } catch (err) {
    console.error('[PROV] Still syntax error:', err.message);
  }
}

// 3. Ensure static prerender files for /guide exist
const overviewHtmlPath = '/app/.next/server/app/overview.html';
const overviewRscPath = '/app/.next/server/app/overview.rsc';
const overviewMetaPath = '/app/.next/server/app/overview.meta';

const guideHtmlPath = '/app/.next/server/app/guide.html';
const guideRscPath = '/app/.next/server/app/guide.rsc';
const guideMetaPath = '/app/.next/server/app/guide.meta';

if (fs.existsSync(overviewHtmlPath)) {
  let html = fs.readFileSync(overviewHtmlPath, 'utf8');
  html = html.replaceAll('/overview', '/guide').replaceAll('Overview', 'Instruction Guide');
  fs.writeFileSync(guideHtmlPath, html, 'utf8');
  console.log('[GUIDE] Created guide.html from overview.html');
}

if (fs.existsSync(overviewRscPath)) {
  let rsc = fs.readFileSync(overviewRscPath, 'utf8');
  rsc = rsc.replaceAll('/overview', '/guide').replaceAll('Overview', 'Instruction Guide');
  fs.writeFileSync(guideRscPath, rsc, 'utf8');
  console.log('[GUIDE] Created guide.rsc from overview.rsc');
}

if (fs.existsSync(overviewMetaPath)) {
  let meta = fs.readFileSync(overviewMetaPath, 'utf8');
  meta = meta.replaceAll('/overview', '/guide');
  fs.writeFileSync(guideMetaPath, meta, 'utf8');
  console.log('[GUIDE] Created guide.meta from overview.meta');
}

