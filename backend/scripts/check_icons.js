const fs = require('fs');
console.log('guide chunk has title:', fs.readFileSync('/app/.next/static/chunks/app/guide/page-968ca6925a7913fd.js', 'utf8').includes('Voice AI Workflow Guide'));
console.log('overview chunk has title:', fs.readFileSync('/app/.next/static/chunks/app/overview/page-968ca6925a7913fd.js', 'utf8').includes('Voice AI Workflow Guide'));
