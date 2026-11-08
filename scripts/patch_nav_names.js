const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Patching Navbar Names (Preserving Workflow & URLs) ===");

const replacements = [
  { target: 'title:"Voice Agents",url:"/workflow"', replacement: 'title:"Agents",url:"/workflow"' },
  { target: 'title: "Voice Agents",url: "/workflow"', replacement: 'title: "Agents",url: "/workflow"' },
  { target: 'title:"Voice Agents"', replacement: 'title:"Agents"' },
  { target: 'title: "Voice Agents"', replacement: 'title: "Agents"' },

  { target: 'title:"Providers",url:"/provider-connections"', replacement: 'title:"Integrations",url:"/provider-connections"' },
  { target: 'title: "Providers",url: "/provider-connections"', replacement: 'title: "Integrations",url: "/provider-connections"' },

  { target: 'title:"Models",url:"/model-configurations"', replacement: 'title:"AI Models",url:"/model-configurations"' },
  { target: 'title: "Models",url: "/model-configurations"', replacement: 'title: "AI Models",url: "/model-configurations"' },

  { target: 'title:"Telephony",url:"/telephony-configurations"', replacement: 'title:"Phone Numbers",url:"/telephony-configurations"' },
  { target: 'title: "Telephony",url: "/telephony-configurations"', replacement: 'title: "Phone Numbers",url: "/telephony-configurations"' },

  { target: 'title:"Tools",url:"/tools"', replacement: 'title:"Actions",url:"/tools"' },
  { target: 'title: "Tools",url: "/tools"', replacement: 'title: "Actions",url: "/tools"' },

  { target: 'title:"Credentials",url:"/credentials"', replacement: 'title:"Secrets",url:"/credentials"' },
  { target: 'title: "Credentials",url: "/credentials"', replacement: 'title: "Secrets",url: "/credentials"' },

  { target: 'title:"Files",url:"/files"', replacement: 'title:"Knowledge Base",url:"/files"' },
  { target: 'title: "Files",url: "/files"', replacement: 'title: "Knowledge Base",url: "/files"' },

  { target: 'title:"Recordings",url:"/recordings"', replacement: 'title:"Call Logs",url:"/recordings"' },
  { target: 'title: "Recordings",url: "/recordings"', replacement: 'title: "Call Logs",url: "/recordings"' },

  { target: 'title:"Developers",url:"/api-keys"', replacement: 'title:"Developer API",url:"/api-keys"' },
  { target: 'title: "Developers",url: "/api-keys"', replacement: 'title: "Developer API",url: "/api-keys"' }
];

let patchedCount = 0;

function scanAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanAndPatch(full);
    } else if (item.endsWith('.js') && !item.endsWith('.map')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;

      for (const { target, replacement } of replacements) {
        if (content.includes(target)) {
          content = content.replaceAll(target, replacement);
          changed = true;
        }
      }

      if (changed) {
        try {
          new vm.Script(content);
          fs.writeFileSync(full, content, 'utf8');
          patchedCount++;
          console.log(`[SUCCESS] Patched navbar titles in: ${full}`);
        } catch (e) {
          console.error(`[ERROR] Syntax validation failed for ${full}:`, e.message);
        }
      }
    }
  }
}

scanAndPatch('/app/.next/static/chunks');
scanAndPatch('/app/.next/server/chunks');
scanAndPatch('/app/.next/server/app');

console.log(`Navbar patch complete. Total files updated: ${patchedCount}`);

