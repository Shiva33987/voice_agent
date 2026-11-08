import asyncio
from api.db import db_client

async def test():
    print("Testing delete_workflow(4, 2)...")
    res = await db_client.delete_workflow(4, 2)
    print("Delete result:", res)
    wf = await db_client.get_workflow_by_id(4)
    print("Workflow 4 still exists:", bool(wf))

asyncio.run(test())