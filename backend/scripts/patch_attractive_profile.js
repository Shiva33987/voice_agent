const fs = require('fs');

const chunkFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(chunkFile)) {
    let content = fs.readFileSync(chunkFile, 'utf8');

    // 1. Remove Hire an Expert button (set B = null)
    const bStart = ',B=N?(0,n.jsxs)(J.m_,';
    const bEnd = 'Hire an Expert"]});';
    const bStartIdx = content.indexOf(bStart);
    if (bStartIdx !== -1) {
        const bEndIdx = content.indexOf(bEnd, bStartIdx);
        if (bEndIdx !== -1) {
            const fullB = content.substring(bStartIdx, bEndIdx + bEnd.length);
            content = content.replace(fullB, ',B=null;');
            console.log('Successfully set B = null (Hire an Expert removed)!');
        }
    }

    // 2. Replacement for E (userChipTrigger): Ultra-Attractive, Modern Profile Card (Notice: NO trailing semicolon because E is in a comma-separated variable declaration)
    const newE = 'E=N?(0,n.jsxs)(m.$,{variant:"ghost",className:"user-profile-avatar cursor-pointer",children:[(0,n.jsx)("span",{className:"user-profile-avatar-text",children:P}),(0,n.jsx)("span",{className:"user-profile-status-dot"})]}):(0,n.jsxs)(m.$,{variant:"ghost",className:"user-profile-card group",children:[(0,n.jsxs)("div",{className:"user-profile-avatar",children:[(0,n.jsx)("span",{className:"user-profile-avatar-text",children:P}),(0,n.jsx)("span",{className:"user-profile-status-dot"})]}),(0,n.jsxs)("div",{className:"user-profile-info",children:[(0,n.jsx)("span",{className:"user-profile-name",children:(null==x?void 0:x.email)?x.email.split("@")[0]:((null==x?void 0:x.displayName)||"Admin")}),(0,n.jsxs)("div",{className:"user-profile-badge",children:[(0,n.jsx)("span",{className:"user-profile-badge-dot"}),(0,n.jsx)("span",{children:"Active"})]})]}),(0,n.jsx)("span",{className:"user-profile-action",children:"⋮"})]})';

    // Fix any previous syntax error with trailing semicolon before ,B=null;
    content = content.replace('children:"⋮"})]});,B=null;', 'children:"⋮"})]}),B=null;');
    content = content.replace('children:"⋮"})]});', 'children:"⋮"})]})}');

    // Check if previous patch or original exists
    const origETarget = 'E=(0,n.jsx)(m.$,{variant:"ghost",size:"icon",className:"h-7 w-7 shrink-0 cursor-pointer rounded-full border border-border/80 bg-muted/40 hover:bg-muted/60",children:(0,n.jsx)("span",{className:"text-xs font-medium",children:P})})';
    const prevETargetPrefix = 'E=N?(0,n.jsxs)(m.$,{variant:"ghost",className:"h-9 w-9';
    const prevETargetSuffix = 'children:"⋮"})]})';

    if (content.includes(origETarget)) {
        content = content.replace(origETarget, newE);
        console.log('Replaced original E with ultra-attractive profile card!');
    } else if (content.includes(prevETargetPrefix)) {
        const start = content.indexOf(prevETargetPrefix);
        const end = content.indexOf(prevETargetSuffix, start);
        if (end !== -1) {
            const oldFullE = content.substring(start, end + prevETargetSuffix.length);
            const hasSemicolon = content.startsWith(';', end + prevETargetSuffix.length);
            content = content.replace(oldFullE + (hasSemicolon ? ';' : ''), newE);
            console.log('Replaced previously patched E with ultra-attractive profile card!');
        }
    } else if (content.includes('user-profile-card')) {
        console.log('user-profile-card present, ensured semicolon is removed.');
    }

    // 3. Make outer container completely clean and borderless
    const outerTarget = '"flex items-center justify-between gap-1 rounded-full border border-border/60 bg-muted/30 p-1",N&&"flex-col"';
    const outerReplacement = '"w-full flex items-center",N&&"justify-center"';
    if (content.includes(outerTarget)) {
        content = content.replaceAll(outerTarget, outerReplacement);
        console.log('Adjusted outer profile container to clean full-width!');
    }

    fs.writeFileSync(chunkFile, content, 'utf8');
    console.log('Saved patched layout chunk successfully!');
}
