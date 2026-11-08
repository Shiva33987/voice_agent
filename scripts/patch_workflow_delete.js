const fs = require('fs');

// ==========================================
// 1. Patch Client Chunk (Workflow page)
// ==========================================
const clientFile = '/app/.next/static/chunks/app/workflow/page-5157489f3eb2ffec.js';
if (fs.existsSync(clientFile)) {
    let content = fs.readFileSync(clientFile, 'utf8');

    // Remove any previous window.__deleteWorkflow definition or broken H
    const oldDefPattern = /typeof window!=="undefined"&&\(window\.__deleteWorkflow=async[\s\S]*?\}\}\);/;
    if (oldDefPattern.test(content)) {
        content = content.replace(oldDefPattern, '');
        console.log('Removed old window.__deleteWorkflow definition.');
    }
    const brokenH = /;H=async\(id,name\)=>\{[\s\S]*?Failed to delete agent'\);\s*\}\};/;
    if (brokenH.test(content)) {
        content = content.replace(brokenH, ';');
        console.log('Cleaned up broken H definition.');
    }

    // Add updated window.__deleteWorkflow with OSS auth token fetching
    const handleDelDef = `typeof window!=="undefined"&&(window.__deleteWorkflow=async(id,name)=>{if(!confirm('Are you sure you want to permanently delete "'+name+'"? This action cannot be undone.'))return;try{let h={};try{let ar=await fetch('/api/auth/oss');if(ar.ok){let ad=await ar.json();if(ad&&ad.token)h['Authorization']='Bearer '+ad.token;}}catch(_){}let r=await fetch('/api/v1/workflow/'+id,{method:'DELETE',headers:h});if(!r.ok){let d=await r.json().catch(()=>({}));throw Error(d.detail||'Failed to delete agent');}try{f.oR.success('Agent "'+name+'" permanently deleted');}catch(_){alert('Agent "'+name+'" permanently deleted');}setTimeout(()=>{window.location.reload();},500);}catch(err){console.error('Error deleting agent:',err);alert(err.message||'Failed to delete agent');}});`;
    const targetE = 'finally{z(null)}};';
    const eIdx = content.indexOf(targetE);
    if (eIdx !== -1) {
        content = content.substring(0, eIdx + targetE.length) + handleDelDef + content.substring(eIdx + targetE.length);
        console.log('Added authenticated window.__deleteWorkflow definition successfully!');
    } else {
        console.warn('Could not find targetE in client file');
    }

    // Ensure Delete button exists and calls window.__deleteWorkflow
    if (content.includes('onClick:()=>H(e.id,e.name)')) {
        content = content.replaceAll('onClick:()=>H(e.id,e.name)', 'onClick:()=>window.__deleteWorkflow&&window.__deleteWorkflow(e.id,e.name)');
        console.log('Updated onClick handler to use window.__deleteWorkflow!');
    } else if (!content.includes('window.__deleteWorkflow(e.id,e.name)')) {
        const targetArchiveBtnEnd = 'r?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(d.A,{size:16}),"Restore"]}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(c.A,{size:16}),"Archive"]})})})';
        const aIdx = content.indexOf(targetArchiveBtnEnd);
        if (aIdx !== -1) {
            const deleteBtnCode = `,(0,n.jsxs)(x.$,{variant:"outline",size:"sm",onClick:()=>window.__deleteWorkflow&&window.__deleteWorkflow(e.id,e.name),disabled:C,className:"flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border-rose-500/30 transition-all",title:"Permanently delete agent",children:[(0,n.jsx)("span",{className:"text-xs",children:"🗑️"}),"Delete"]})`;
            content = content.substring(0, aIdx + targetArchiveBtnEnd.length) + deleteBtnCode + content.substring(aIdx + targetArchiveBtnEnd.length);
            console.log('Added Delete button successfully!');
        }
    }

    fs.writeFileSync(clientFile, content, 'utf8');
    console.log('Successfully saved patched client file!');
}

// ==========================================
// 2. Patch Server API v1 Proxy Route
// ==========================================
const serverRouteFile = '/app/.next/server/app/api/v1/[...path]/route.js';
if (fs.existsSync(serverRouteFile)) {
    let serverContent = fs.readFileSync(serverRouteFile, 'utf8');
    const targetProxyHeaders = 'return b.delete("accept-encoding"),b.delete("content-length"),b.delete("host"),b}';
    const patchedProxyHeaders = 'b.delete("accept-encoding");b.delete("content-length");b.delete("host");if(!b.get("authorization")){let t=a.cookies&&a.cookies.get("dograh_auth_token")?.value;if(t)b.set("authorization","Bearer "+t);}return b}';

    if (serverContent.includes(targetProxyHeaders)) {
        serverContent = serverContent.replace(targetProxyHeaders, patchedProxyHeaders);
        fs.writeFileSync(serverRouteFile, serverContent, 'utf8');
        console.log('Successfully patched server API v1 proxy route with auth cookie forwarding!');
    } else if (serverContent.includes('dograh_auth_token')) {
        console.log('Server API v1 proxy already patched.');
    } else {
        console.warn('Could not find targetProxyHeaders in server route file.');
    }
}
