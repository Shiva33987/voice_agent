import json
import subprocess

res = subprocess.check_output([
    "docker", "exec", "dograh-main-postgres-1", "psql", "-U", "postgres", "-d", "postgres",
    "-t", "-A", "-c", "SELECT workflow_configurations FROM workflow_definitions WHERE id = 6;"
], text=True, encoding="utf-8")

data = json.loads(res.strip())
print("Workflow configurations:", json.dumps(data, indent=2))

