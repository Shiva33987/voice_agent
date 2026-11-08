const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Removing 'Dograh' word from UI text while preserving workflows ===");

const replacements = [
  // 1. Provider connections page (from user screenshot)
  { from: "Add multiple accounts from any provider, including Dograh.", to: "Add multiple accounts from any provider." },
  { from: "any provider, including Dograh.", to: "any provider." },
  { from: ", including Dograh.", to: "." },
  { from: "including Dograh.", to: "supported providers." },
  { from: 'children:"Dograh account"', to: 'children:"Platform account"' },
  { from: 'addLabel:"Add a Dograh account"', to: 'addLabel:"Add an account"' },
  { from: 'Add a Dograh account', to: 'Add an account' },

  // 2. Files / Knowledge base Modal Notice
  { from: "Documents are sent to Dograh's managed Model Proxy Service for parsing and chunking when they are uploaded or edited. Dograh Model Proxy Service does not store or read your documents", to: "Documents are sent to the managed Model Proxy Service for parsing and chunking when they are uploaded or edited. The Model Proxy Service does not store or read your documents" },
  { from: "Documents are sent to managed Model Proxy Service for parsing and chunking when they are uploaded or edited. Dograh Model Proxy Service does not store or read your documents", to: "Documents are sent to the managed Model Proxy Service for parsing and chunking when they are uploaded or edited. The Model Proxy Service does not store or read your documents" },
  { from: "Dograh Model Proxy Service does not store or read your documents", to: "The Model Proxy Service does not store or read your documents" },
  { from: "Dograh's managed Model Proxy Service", to: "managed Model Proxy Service" },
  { from: "Dograh Model Proxy Service", to: "Model Proxy Service" },

  // 3. Developer / API Keys page
  { from: 'title:"Dograh Service Keys"', to: 'title:"Service Keys"' },
  { from: 'title: "Dograh Service Keys"', to: 'title: "Service Keys"' },
  { from: 'Dograh Service Keys', to: 'Service Keys' },
  { from: 'Manage service keys for accessing Dograh AI services (LLM, TTS, STT)', to: 'Manage service keys for accessing AI services (LLM, TTS, STT)' },
  { from: 'access Dograh services programmatically', to: 'access services programmatically' },
  { from: 'Create a service key to access Dograh AI services (LLM, TTS, STT)', to: 'Create a service key to access AI services (LLM, TTS, STT)' },
  { from: 'This key provides access to Dograh AI services including LLM, Text-to-Speech, and Speech-to-Text.', to: 'This key provides access to AI services including LLM, Text-to-Speech, and Speech-to-Text.' },
  { from: 'Sign up on app.dograh.com', to: 'Sign up for service keys' },

  // 4. Model configurations
  { from: "in Realtime, Dograh, or BYOK mode.", to: "in Realtime, Managed, or BYOK mode." },
  { from: 'dograh:"Dograh"', to: 'dograh:"Managed"' },
  { from: 'dograh: "Dograh"', to: 'dograh: "Managed"' },
  { from: "unavailable in Dograh mode", to: "unavailable in Managed mode" },
  { from: "Dograh mode", to: "Managed mode" },

  // 5. Workflow pages copy text
  { from: "Dograh doesn't sell phone numbers", to: "We do not sell phone numbers" },
  { from: "Point it at Dograh and keep your existing", to: "Point it at the platform and keep your existing" },
  { from: "billing to continue using Dograh-managed models.", to: "billing to continue using managed models." },
  { from: "Dograh is temporarily unavailable", to: "The service is temporarily unavailable" },
  { from: "the live call to another Dograh agent", to: "the live call to another agent" },

  // 6. Telephony page
  { from: "With a single trunk Dograh falls back to it anyway.", to: "With a single trunk the system falls back to it anyway." },
  { from: "Dograh provides the SIP connection", to: "The system provides the SIP connection" },
  { from: "Sets the remote peer Dograh dials for this trunk.", to: "Sets the remote peer the system dials for this trunk." },
  { from: "Dograh provisions this trunk with", to: "The system provisions this trunk with" },
  { from: "Dograh stopped reconnecting after", to: "System stopped reconnecting after" },

  // 7. Tools page
  { from: "Resolved values that Dograh would normally derive from", to: "Resolved values that the system would normally derive from" },
  { from: "Add values that Dograh should inject at runtime", to: "Add values that the system should inject at runtime" },
  { from: "Dograh sends the resolved arguments", to: "The system sends the resolved arguments" },
  { from: "Dograh sends a POST request with", to: "The system sends a POST request with" },
  { from: "Spoken while Dograh waits for the resolver", to: "Spoken while the system waits for the resolver" },

  // 8. Settings, Overview & Usage
  { from: "Welcome to Dograh", to: "Welcome" },
  { from: "about Dograh", to: "about the platform" },
  { from: "identity configured on your Dograh server.", to: "identity configured on your server." },
  { from: "Each Dograh disposition is sent as your", to: "Each disposition is sent as your" },
  { from: 'children:"Dograh disposition"', to: 'children:"Disposition"' },
  { from: 'aria-label":"Dograh disposition"', to: 'aria-label":"Disposition"' },
  { from: 'Reset to the Dograh disposition', to: 'Reset to the default disposition' },
  { from: "Dograh workspace", to: "workspace" },
  { from: '" Dograh Tokens"', to: '" Tokens"' },

  // 9. Auth
  { from: "We deploy Dograh inside your environment", to: "We deploy inside your environment" },

  // 10. Mobile Header link
  { from: '(0,n.jsx)(o(),{href:"/",className:"text-lg font-bold md:hidden",children:"Dograh"})', to: 'null' }
];

let updatedCount = 0;

function scanAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanAndReplace(full);
    } else if ((file.endsWith('.js') && !file.endsWith('.map')) || file.endsWith('.html') || file.endsWith('.rsc')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;

      for (const { from, to } of replacements) {
        if (content.includes(from)) {
          content = content.replaceAll(from, to);
          changed = true;
        }
      }

      if (changed) {
        if (file.endsWith('.js')) {
          try {
            new vm.Script(content);
            fs.writeFileSync(full, content, 'utf8');
            updatedCount++;
            console.log(`[SUCCESS] Patched JS: ${full}`);
          } catch (e) {
            console.error(`[ERROR] JS syntax error in ${full}:`, e.message);
          }
        } else {
          fs.writeFileSync(full, content, 'utf8');
          updatedCount++;
          console.log(`[SUCCESS] Patched file: ${full}`);
        }
      }
    }
  }
}

scanAndReplace('/app/.next/static');
scanAndReplace('/app/.next/server');

console.log(`=== Finished patch_remove_dograh_word. Total patched: ${updatedCount} ===`);
