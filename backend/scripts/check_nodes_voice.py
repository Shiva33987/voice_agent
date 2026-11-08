import json

with open("scripts/wf3_nodes.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for node in data.get("nodes", []):
    node_id = node.get("id")
    node_data = node.get("data", {})
    print(f"Node {node_id} ({node_data.get('name')}):")
    for k, v in node_data.items():
        if "model" in k or "voice" in k or "llm" in k or "tts" in k or "provider" in k:
            print(f"  {k}: {v}")

