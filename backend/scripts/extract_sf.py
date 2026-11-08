import subprocess

code = subprocess.check_output(
    ["docker", "run", "--rm", "dograh-api:voicelink", "cat", "/app/api/services/pipecat/service_factory.py"],
    text=True, encoding="utf-8"
)

with open("scripts/container_sf.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Saved container_sf.py successfully. Length:", len(code))

