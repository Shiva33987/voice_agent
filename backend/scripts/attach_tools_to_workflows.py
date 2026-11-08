"""Attach the 4 appointment tools to the user's workflows and update prompts for accurate tool execution."""

import asyncio
import copy
import json
import os
import sys

repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from dotenv import load_dotenv

load_dotenv(os.path.join(repo_root, "api", ".env"))

from sqlalchemy import select

from api.db.base_client import BaseDBClient
from api.db.models import ToolModel, WorkflowDefinitionModel, WorkflowModel

TOOL_NAMES = [
    "Check Availability",
    "Book Appointment",
    "Cancel Appointment",
    "Reschedule Appointment",
]

INSTRUCTIONS_TO_ADD = """

## TOOL USAGE INSTRUCTIONS:
You have access to 4 appointment management tools. Use them proactively:
1. `check_availability(date="YYYY-MM-DD")`:
   - Call this IMMEDIATELY whenever the user asks for open slots, dates, or when they can book.
   - For relative dates like "tomorrow", calculate the date from today and call the tool.
   - Inform the caller of the available slots returned by the tool.

2. `book_appointment(date="YYYY-MM-DD", time="HH:MM", customer_name="...", customer_phone="...")`:
   - Collect the customer's name, phone number, date, and time.
   - Once collected, call `book_appointment` immediately to reserve the slot.
   - Read the confirmation ID (e.g. APT-1001) back to the caller.

3. `cancel_appointment(appointment_id="...", customer_phone="...")`:
   - When the caller wants to cancel, ask for their appointment ID (or use their phone number).
   - Call `cancel_appointment` to process the cancellation.
   - Confirm the cancellation with the caller.

4. `reschedule_appointment(appointment_id="...", new_date="YYYY-MM-DD", new_time="HH:MM")`:
   - Ask for their appointment ID, new preferred date, and new preferred time.
   - Call `reschedule_appointment` to move the appointment.
   - Confirm the new appointment time with the caller.
"""


async def attach_tools():
    db = BaseDBClient()
    async with db.async_session() as session:
        # Fetch workflows
        workflows = (await session.execute(select(WorkflowModel))).scalars().all()

        for wf in workflows:
            # Fetch tools for this workflow's organization
            tools = (
                await session.execute(
                    select(ToolModel).where(
                        ToolModel.organization_id == wf.organization_id,
                        ToolModel.name.in_(TOOL_NAMES),
                        ToolModel.status == "active",
                    )
                )
            ).scalars().all()

            if not tools:
                print(f"No appointment tools found for org {wf.organization_id}")
                continue

            tool_uuids = [t.tool_uuid for t in tools]
            print(f"\nAttaching {len(tool_uuids)} tools to Workflow {wf.id} ({wf.name}):")
            for t in tools:
                print(f"  - {t.name} ({t.tool_uuid})")

            # Update WorkflowModel definition
            def_json = copy.deepcopy(wf.workflow_definition or {})
            nodes = def_json.get("nodes", [])

            for node in nodes:
                node_data = node.setdefault("data", {})
                node_type = node.get("type")
                node_id = str(node.get("id"))

                # Attach tools to agentNode and startNode (nodes 1 and 2)
                if node_type in ("agentNode", "startNode", "callNode") or node_id in ("1", "2"):
                    node_data["tool_uuids"] = tool_uuids
                    print(f"  -> Attached tools to node {node_id} ({node_data.get('name')})")

                    # Enrich prompt if not already present
                    prompt = node_data.get("prompt", "")
                    if "TOOL USAGE INSTRUCTIONS" not in prompt and node_id == "2":
                        node_data["prompt"] = prompt + INSTRUCTIONS_TO_ADD
                        print("  -> Enriched prompt with tool instructions for node 2")

            wf.workflow_definition = def_json

            # Also update all WorkflowDefinitionModel records for this workflow
            wds = (
                await session.execute(
                    select(WorkflowDefinitionModel).where(
                        WorkflowDefinitionModel.workflow_id == wf.id
                    )
                )
            ).scalars().all()

            for wd in wds:
                wd_json = copy.deepcopy(wd.workflow_json or {})
                wd_nodes = wd_json.get("nodes", [])
                for node in wd_nodes:
                    node_data = node.setdefault("data", {})
                    node_type = node.get("type")
                    node_id = str(node.get("id"))
                    if node_type in ("agentNode", "startNode", "callNode") or node_id in ("1", "2"):
                        node_data["tool_uuids"] = tool_uuids
                        prompt = node_data.get("prompt", "")
                        if "TOOL USAGE INSTRUCTIONS" not in prompt and node_id == "2":
                            node_data["prompt"] = prompt + INSTRUCTIONS_TO_ADD

                wd.workflow_json = wd_json
                print(f"  -> Updated WorkflowDefinitionModel version {wd.version_number} (is_current={wd.is_current})")

        await session.commit()
        print("\nAll workflows successfully updated with appointment tools!")


if __name__ == "__main__":
    asyncio.run(attach_tools())
