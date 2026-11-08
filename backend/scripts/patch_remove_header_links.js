const fs = require('fs');

const layoutFile = '/app/.next/static/chunks/app/layout-1fabb9a9b970e63b.js';
if (fs.existsSync(layoutFile)) {
    let content = fs.readFileSync(layoutFile, 'utf8');
    
    // Look for the header actions div containing Join Slack and GitHub Star
    const slackIdx = content.indexOf('Join Slack');
    if (slackIdx !== -1) {
        // Find the start of the div containing Join Slack and the star badge
        const divPrefix = '(0,n.jsxs)("div",{className:"flex items-center gap-3",children:[';
        const divIdx = content.lastIndexOf(divPrefix, slackIdx);
        if (divIdx !== -1) {
            // Find the end of this div: ea.H,{source:"app_header"})]})
            const endPattern = 'source:"app_header"})]})';
            const endIdx = content.indexOf(endPattern, slackIdx);
            if (endIdx !== -1) {
                const fullTarget = content.substring(divIdx, endIdx + endPattern.length);
                const replacement = '(0,n.jsx)("div",{className:"flex items-center gap-3",children:null})';
                content = content.replace(fullTarget, replacement);
                fs.writeFileSync(layoutFile, content, 'utf8');
                console.log('Successfully removed Join Slack and GitHub Star from client layout!');
            } else {
                console.warn('Could not find endPattern after Join Slack');
            }
        } else {
            console.warn('Could not find divPrefix before Join Slack');
        }
    } else {
        console.log('Join Slack already removed from client layout.');
    }
}

