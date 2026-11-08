import json

with open("scripts/wf3_nodes.json", "r", encoding="utf-8") as f:
    data = json.load(f)

with open("scripts/wf3_prompts.txt", "w", encoding="utf-8") as out:
    for node in data.get("nodes", []):
        out.write(f"\n================ Node {node['id']}: {node['data'].get('name')} ================\n")
        out.write(node['data'].get('prompt', '') + "\n")
