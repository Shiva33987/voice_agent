const fs = require('fs');
const { generateGuideCode } = require('./build_guide_jsx.js');

console.log('--- Applying Instruction Guide Page and Sidebar Button ---');

const clientGuideCode = generateGuideCode(false);
const serverGuideCode = generateGuideCode(true);

// ==========================================
// 1. Patch Client Overview & Guide Chunks
// ==========================================
const clientOverviewFile = '/app/.next/static/chunks/app/overview/page-968ca6925a7913fd.js';
if (fs.existsSync(clientOverviewFile)) {
    let clientContent = fs.readFileSync(clientOverviewFile, 'utf8');
    const startIdx = clientContent.indexOf('48215:');
    const endIdx = clientContent.indexOf(',83101:', startIdx);
    if (startIdx !== -1 && endIdx !== -1) {
        const header = '48215:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>u});var n=t(95155),s=t(52619),i=t.n(s),a=t(48100),l=t(35421),o=t(3998),d=t(86948),c=t(40201);';
        const newModule = header + clientGuideCode + '}';
        clientContent = clientContent.substring(0, startIdx) + newModule + clientContent.substring(endIdx);
        fs.writeFileSync(clientOverviewFile, clientContent, 'utf8');
        console.log('Successfully patched client overview chunk with Instruction Guide!');
    } else {
        console.warn('Could not locate module 48215 bounds in client overview chunk');
    }

    // Copy to /app/.next/static/chunks/app/guide/
    const guideChunkDir = '/app/.next/static/chunks/app/guide';
    if (!fs.existsSync(guideChunkDir)) {
        fs.mkdirSync(guideChunkDir, { recursive: true });
    }
    fs.copyFileSync(clientOverviewFile, guideChunkDir + '/page-968ca6925a7913fd.js');
    console.log('Copied patched client chunk to /app/.next/static/chunks/app/guide/');
}

// ==========================================
// 2. Patch Server Overview & Guide Pages
// ==========================================
const serverOverviewFile = '/app/.next/server/app/overview/page.js';
if (fs.existsSync(serverOverviewFile)) {
    let serverContent = fs.readFileSync(serverOverviewFile, 'utf8');
    const startIdx = serverContent.indexOf('21363:');
    const endIdx = serverContent.indexOf(',21820:', startIdx);
    if (startIdx !== -1 && endIdx !== -1) {
        const header = '21363:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>l});var d=c(69373),e=c(16041),f=c.n(e),g=c(15602),h=c(74725),i=c(28910),j=c(39424),k=c(59955);';
        const newModule = header + serverGuideCode + '}';
        serverContent = serverContent.substring(0, startIdx) + newModule + serverContent.substring(endIdx);
        fs.writeFileSync(serverOverviewFile, serverContent, 'utf8');
        console.log('Successfully patched server overview page with Instruction Guide!');
    } else {
        console.warn('Could not locate module 21363 bounds in server overview page');
    }

    // Copy to /app/.next/server/app/guide/
    const guideServerDir = '/app/.next/server/app/guide';
    if (!fs.existsSync(guideServerDir)) {
        fs.mkdirSync(guideServerDir, { recursive: true });
    }
    let guideServerContent = serverContent.replaceAll('"/overview"', '"/guide"');
    fs.writeFileSync(guideServerDir + '/page.js', guideServerContent, 'utf8');
    console.log('Copied patched server page to /app/.next/server/app/guide/');
}

// ==========================================
// 3. Register /guide in Next.js Manifests
// ==========================================
const appPathsManifest = '/app/.next/server/app-paths-manifest.json';
if (fs.existsSync(appPathsManifest)) {
    const paths = JSON.parse(fs.readFileSync(appPathsManifest, 'utf8'));
    paths['/guide/page'] = 'app/guide/page.js';
    paths['/overview/page'] = 'app/overview/page.js';
    fs.writeFileSync(appPathsManifest, JSON.stringify(paths, null, 2), 'utf8');
    console.log('Updated app-paths-manifest.json with /guide/page');
}

const buildManifest = '/app/.next/app-build-manifest.json';
if (fs.existsSync(buildManifest)) {
    const build = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
    if (build.pages) {
        if (build.pages['/overview/page']) {
            build.pages['/guide/page'] = build.pages['/overview/page'];
        }
        fs.writeFileSync(buildManifest, JSON.stringify(build, null, 2), 'utf8');
        console.log('Updated app-build-manifest.json with /guide/page');
    }
}

// ==========================================
// 4. Add "Instruction Guide" to Sidebar Navigation
// ==========================================
// Client layout chunk
const layoutChunk = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(layoutChunk)) {
    let layoutContent = fs.readFileSync(layoutChunk, 'utf8');
    
    // Check if Instruction Guide already present
    if (!layoutContent.includes('Instruction Guide')) {
        const buildNavTarget = 'es=[{label:"BUILD",items:[';
        const buildNavReplacement = 'es=[{label:"BUILD",items:[{title:"Instruction Guide",url:"/guide",icon:g.A},';
        if (layoutContent.includes(buildNavTarget)) {
            layoutContent = layoutContent.replace(buildNavTarget, buildNavReplacement);
            fs.writeFileSync(layoutChunk, layoutContent, 'utf8');
            console.log('Added "Instruction Guide" to client sidebar navigation!');
        } else {
            console.warn('Could not find buildNavTarget in layout chunk');
        }
    } else {
        console.log('"Instruction Guide" already present in client layout chunk.');
    }
}

// Server layout chunk
const serverLayoutChunk = '/app/.next/server/chunks/2720.js';
if (fs.existsSync(serverLayoutChunk)) {
    let serverLayoutContent = fs.readFileSync(serverLayoutChunk, 'utf8');
    
    if (!serverLayoutContent.includes('Instruction Guide')) {
        const buildNavTarget = '{label:"BUILD",items:[';
        const buildNavReplacement = '{label:"BUILD",items:[{title:"Instruction Guide",url:"/guide",icon:s.A},';
        if (serverLayoutContent.includes(buildNavTarget)) {
            serverLayoutContent = serverLayoutContent.replace(buildNavTarget, buildNavReplacement);
            fs.writeFileSync(serverLayoutChunk, serverLayoutContent, 'utf8');
            console.log('Added "Instruction Guide" to server sidebar navigation (2720.js)!');
        } else {
            console.warn('Could not find buildNavTarget in server layout chunk 2720.js');
        }
    } else {
        console.log('"Instruction Guide" already present in server layout chunk 2720.js.');
    }
}

console.log('=== Instruction Guide setup complete ===');

