const fs = require('fs');
const path = require('path');

console.log("=== Replacing Title and Metadata 'Dograh' with 'Agent' ===");

let updatedFiles = 0;

function scanAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanAndPatch(full);
    } else if (item.endsWith('.html') || item.endsWith('.rsc') || (item.endsWith('.js') && !item.endsWith('.map'))) {
      let content = fs.readFileSync(full, 'utf8');
      let orig = content;

      // 1. Plain HTML title
      content = content.replaceAll('<title>Dograh</title>', '<title>Agent</title>');

      // 2. React flight JSON metadata formats:
      // In .rsc files: {"children":"Dograh"}
      content = content.replaceAll('"children":"Dograh"', '"children":"Agent"');
      // In .html files embedded script: {\"children\":\"Dograh\"}
      content = content.replaceAll('\\"children\\":\\"Dograh\\"', '\\"children\\":\\"Agent\\"');

      // 3. JS chunks title definitions
      content = content.replaceAll('title:"Dograh"', 'title:"Agent"');
      content = content.replaceAll('title: "Dograh"', 'title: "Agent"');
      content = content.replaceAll('"title":"Dograh"', '"title":"Agent"');
      content = content.replaceAll('default:"Dograh"', 'default:"Agent"');
      content = content.replaceAll('default: "Dograh"', 'default: "Agent"');

      // 4. Description if present
      content = content.replaceAll('Open Source Voice Assistant Workflow Builder', 'Voice Assistant Workflow Builder');

      if (content !== orig) {
        fs.writeFileSync(full, content, 'utf8');
        updatedFiles++;
        console.log(`Patched: ${full}`);
      }
    }
  }
}

scanAndPatch('/app/.next/server');
scanAndPatch('/app/.next/static');
scanAndPatch('/app/.next/standalone');

console.log(`Successfully patched ${updatedFiles} files to 'Agent'.`);
