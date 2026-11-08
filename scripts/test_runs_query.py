import asyncio
from api.db import db_client

async def main():
    runs, count, tokens, duration = await db_client.get_usage_history(2, limit=5)
    print("Total runs count:", count)
    for r in runs:
        print("Run ID:", r.get("id"), "Workflow:", r.get("workflow_name"), "Recording:", r.get("recording_url"), "Duration:", r.get("call_duration_seconds"), "Caller:", r.get("caller_number"), "Called:", r.get("called_number"))

asyncio.run(main())

