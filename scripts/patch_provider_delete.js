const fs = require('fs');

// ==========================================
// 1. Patch Provider Connections Page Chunk
// ==========================================
const provChunk = '/app/.next/static/chunks/app/provider-connections/page-a639be017c4b8a30.js';
if (fs.existsSync(provChunk)) {
    let content = fs.readFileSync(provChunk, 'utf8');

    // Active item target: Archive button
    const provActiveTarget = ',(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",onClick:()=>{L(null),I({uuid:e.uuid,name:e.name})},children:"Archive"})';
    const provDeleteBtn = ',(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",className:"text-rose-500 hover:text-rose-400 hover:bg-rose-500/10",disabled:P,onClick:async()=>{if(window.confirm(\'Are you sure you want to permanently delete "\'+e.name+\'"? This action cannot be undone.\')){M(!0);try{let t=await fetch("/api/v1/provider-connections/"+e.uuid+"?permanent=true",{method:"DELETE"});if(!t.ok){let r=await t.json().catch(()=>({}));throw Error(r.detail||"Failed to delete provider connection")}await T(),h.oR.success("Provider connection deleted")}catch(t){L(t instanceof Error?t.message:"Failed to delete provider connection"),h.oR.error(t instanceof Error?t.message:"Failed to delete provider connection")}finally{M(!1)}}},children:"Delete"})';

    if (content.includes(provActiveTarget) && !content.includes('Provider connection deleted')) {
        content = content.replace(provActiveTarget, provActiveTarget + provDeleteBtn);
        console.log('Added Delete button to active provider connections!');
    } else {
        console.log('provActiveTarget already patched or not found.');
    }

    // Archived item target: Restore button
    const provArchivedTarget = ',children:[(0,s.jsx)(d.A,{className:"h-3.5 w-3.5"}),O===e.uuid?"Restoring…":"Restore"]})';
    const provArchivedDeleteBtn = ',(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",className:"text-rose-500 hover:text-rose-400 hover:bg-rose-500/10",disabled:P||C,onClick:async()=>{if(window.confirm(\'Are you sure you want to permanently delete "\'+e.name+\'"? This action cannot be undone.\')){M(!0);try{let t=await fetch("/api/v1/provider-connections/"+e.uuid+"?permanent=true",{method:"DELETE"});if(!t.ok){let r=await t.json().catch(()=>({}));throw Error(r.detail||"Failed to delete provider connection")}await T(),h.oR.success("Provider connection deleted")}catch(t){L(t instanceof Error?t.message:"Failed to delete provider connection"),h.oR.error(t instanceof Error?t.message:"Failed to delete provider connection")}finally{M(!1)}}},children:"Delete"})';

    if (content.includes(provArchivedTarget) && !content.includes(provArchivedDeleteBtn)) {
        content = content.replace(provArchivedTarget, provArchivedTarget + provArchivedDeleteBtn);
        console.log('Added Delete button to archived provider connections!');
    }

    fs.writeFileSync(provChunk, content, 'utf8');
    console.log('Saved patched provider connections chunk successfully!');
} else {
    console.warn('provChunk does not exist:', provChunk);
}

// ==========================================
// 2. Patch Model Configurations Page Chunk
// ==========================================
const modelChunk = '/app/.next/static/chunks/app/model-configurations/page-0b4b08f0940cd126.js';
if (fs.existsSync(modelChunk)) {
    let content = fs.readFileSync(modelChunk, 'utf8');

    // Active item target: Archive button
    const modelActiveTarget = ',(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",disabled:_===e.uuid,onClick:()=>{F(null),O({uuid:e.uuid,name:e.name})},children:"Archive"})';
    const modelDeleteBtn = ',(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",className:"text-rose-500 hover:text-rose-400 hover:bg-rose-500/10",disabled:P||_===e.uuid,onClick:async()=>{if(window.confirm(\'Are you sure you want to permanently delete "\'+e.name+\'"? This action cannot be undone.\')){D(!0);try{let t=await fetch("/api/v1/model-configurations/"+e.uuid+"?permanent=true",{method:"DELETE"});if(!t.ok){let r=await t.json().catch(()=>({}));throw Error(r.detail||"Failed to delete model configuration")}await B(),f.oR.success("Model configuration deleted")}catch(t){F(t instanceof Error?t.message:"Failed to delete model configuration"),f.oR.error(t instanceof Error?t.message:"Failed to delete model configuration")}finally{D(!1)}}},children:"Delete"})';

    if (content.includes(modelActiveTarget) && !content.includes('Model configuration deleted')) {
        content = content.replace(modelActiveTarget, modelActiveTarget + modelDeleteBtn);
        console.log('Added Delete button to active model configurations!');
    } else {
        console.log('modelActiveTarget already patched or not found.');
    }

    // Archived item target: Restore button
    const modelArchivedTarget = ',children:[(0,s.jsx)(l.A,{className:"h-3.5 w-3.5"}),T===e.uuid?"Restoring…":"Restore"]})';
    const modelArchivedDeleteBtn = ',(0,s.jsx)(g.$,{type:"button",variant:"ghost",size:"sm",className:"text-rose-500 hover:text-rose-400 hover:bg-rose-500/10",disabled:P||E||r,onClick:async()=>{if(window.confirm(\'Are you sure you want to permanently delete "\'+e.name+\'"? This action cannot be undone.\')){D(!0);try{let t=await fetch("/api/v1/model-configurations/"+e.uuid+"?permanent=true",{method:"DELETE"});if(!t.ok){let r=await t.json().catch(()=>({}));throw Error(r.detail||"Failed to delete model configuration")}await B(),f.oR.success("Model configuration deleted")}catch(t){F(t instanceof Error?t.message:"Failed to delete model configuration"),f.oR.error(t instanceof Error?t.message:"Failed to delete model configuration")}finally{D(!1)}}},children:"Delete"})';

    if (content.includes(modelArchivedTarget) && !content.includes(modelArchivedDeleteBtn)) {
        content = content.replace(modelArchivedTarget, modelArchivedTarget + modelArchivedDeleteBtn);
        console.log('Added Delete button to archived model configurations!');
    }

    fs.writeFileSync(modelChunk, content, 'utf8');
    console.log('Saved patched model configurations chunk successfully!');
} else {
    console.warn('modelChunk does not exist:', modelChunk);
}

