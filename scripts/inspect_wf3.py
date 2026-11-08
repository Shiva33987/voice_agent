import json
import subprocess

res = subprocess.check_output([
    "docker", "exec", "dograh-main-postgres-1", "psql", "-U", "postgres", "-d", "postgres",
    "-t", "-A", "-c", "SELECT workflow_json FROM workflow_definitions WHERE id = 6;"
], text=True)

try:
    data = json.loads(res.strip())
    print("Keys in definition:", list(data.keys()))
    nodes = data.get("nodes", [])
    print(f"Total nodes: {len(nodes)}")
    for node in nodes:
        node_id = node.get("id")
        node_type = node.get("type")
        node_data = node.get("data", {})
        title = node_data.get("title") or node_data.get("name")
        print(f"\n=======================================================")
        print(f"--- Node: {node_id} ({node_type}) - {title} ---")
        prompt = node_data.get("prompt") or node_data.get("system_prompt") or node_data.get("text")
        if prompt:
            print(">>> PROMPT:\n", prompt)
        config = node_data.get("model_configuration") or node_data.get("configurations")
        if config:
            print("Config:", json.dumps(config, indent=2))
except Exception as e:
    print("Error parsing json:", e)
    print("Raw output preview:", res[:500])
