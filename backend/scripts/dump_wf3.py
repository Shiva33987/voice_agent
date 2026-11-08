import json
import subprocess

res = subprocess.check_output([
    "docker", "exec", "dograh-main-postgres-1", "psql", "-U", "postgres", "-d", "postgres",
    "-t", "-A", "-c", "SELECT workflow_json FROM workflow_definitions WHERE id = 6;"
], text=True, encoding="utf-8")

data = json.loads(res.strip())

with open("scripts/wf3_nodes.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Saved wf3_nodes.json successfully!")

