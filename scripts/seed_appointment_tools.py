"""Seed the 4 Appointment Booking tools into Dograh's database.

Tools:
1. Check Availability (GET http://localhost:8080/api/appointments/availability)
2. Book Appointment (POST http://localhost:8080/api/appointments/book)
3. Cancel Appointment (POST http://localhost:8080/api/appointments/cancel)
4. Reschedule Appointment (POST http://localhost:8080/api/appointments/reschedule)
"""

import asyncio
import os
import sys

# Ensure repo root is on sys.path
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from dotenv import load_dotenv

load_dotenv(os.path.join(repo_root, "api", ".env"))

from sqlalchemy import select

from api.db.base_client import BaseDBClient
from api.db.models import OrganizationModel, ToolModel, UserModel

APPOINTMENT_TOOLS = [
    {
        "name": "Check Availability",
        "description": "Check available appointment slots for a given date. Call this whenever the caller asks for open times, dates, or when they want to know when they can book.",
        "icon": "calendar",
        "icon_color": "#3B82F6",
        "definition": {
            "schema_version": 1,
            "type": "http_api",
            "messages": [
                {
                    "event": "start",
                    "type": "text",
                    "text": "Let me check available times for that date...",
                }
            ],
            "config": {
                "method": "GET",
                "url": "http://localhost:8080/api/appointments/availability",
                "headers": None,
                "credential_uuid": None,
                "parameters": [
                    {
                        "name": "date",
                        "type": "string",
                        "description": "Date to check availability for in YYYY-MM-DD format (e.g. 2026-10-24)",
                        "required": True,
                    },
                    {
                        "name": "service_type",
                        "type": "string",
                        "description": "Type of service or consultation requested (optional)",
                        "required": False,
                    },
                ],
                "preset_parameters": None,
                "timeout_ms": 5000,
                "body_template": None,
                "body_format": "json",
            },
        },
    },
    {
        "name": "Book Appointment",
        "description": "Book a new appointment slot for the customer. Call this after collecting and confirming the appointment date, time, customer's name, and contact phone number.",
        "icon": "calendar-check",
        "icon_color": "#10B981",
        "definition": {
            "schema_version": 1,
            "type": "http_api",
            "messages": [
                {
                    "event": "start",
                    "type": "text",
                    "text": "Booking your appointment now, just a moment...",
                }
            ],
            "config": {
                "method": "POST",
                "url": "http://localhost:8080/api/appointments/book",
                "headers": None,
                "credential_uuid": None,
                "parameters": [
                    {
                        "name": "date",
                        "type": "string",
                        "description": "Appointment date in YYYY-MM-DD format (e.g. 2026-10-24)",
                        "required": True,
                    },
                    {
                        "name": "time",
                        "type": "string",
                        "description": "Appointment time in HH:MM format (e.g. 10:00 or 14:30)",
                        "required": True,
                    },
                    {
                        "name": "customer_name",
                        "type": "string",
                        "description": "Full name of the customer booking the appointment",
                        "required": True,
                    },
                    {
                        "name": "customer_phone",
                        "type": "string",
                        "description": "Contact phone number of the customer",
                        "required": True,
                    },
                    {
                        "name": "service_type",
                        "type": "string",
                        "description": "Type of service or consultation requested",
                        "required": False,
                    },
                    {
                        "name": "notes",
                        "type": "string",
                        "description": "Any special notes, questions, or requirements from the caller",
                        "required": False,
                    },
                ],
                "preset_parameters": None,
                "timeout_ms": 5000,
                "body_template": None,
                "body_format": "json",
            },
        },
    },
    {
        "name": "Cancel Appointment",
        "description": "Cancel an existing appointment. Call this when the caller wants to cancel their booking using either their appointment reference ID or their registered phone number.",
        "icon": "calendar-x",
        "icon_color": "#EF4444",
        "definition": {
            "schema_version": 1,
            "type": "http_api",
            "messages": [
                {
                    "event": "start",
                    "type": "text",
                    "text": "Processing the appointment cancellation...",
                }
            ],
            "config": {
                "method": "POST",
                "url": "http://localhost:8080/api/appointments/cancel",
                "headers": None,
                "credential_uuid": None,
                "parameters": [
                    {
                        "name": "appointment_id",
                        "type": "string",
                        "description": "Appointment confirmation reference code (e.g. APT-1001)",
                        "required": False,
                    },
                    {
                        "name": "customer_phone",
                        "type": "string",
                        "description": "Customer phone number to look up appointment if reference code is unknown",
                        "required": False,
                    },
                    {
                        "name": "reason",
                        "type": "string",
                        "description": "Reason for cancellation provided by the caller",
                        "required": False,
                    },
                ],
                "preset_parameters": None,
                "timeout_ms": 5000,
                "body_template": None,
                "body_format": "json",
            },
        },
    },
    {
        "name": "Reschedule Appointment",
        "description": "Reschedule an existing appointment to a new date and time. Call this when the caller wants to change their appointment date or time.",
        "icon": "calendar-clock",
        "icon_color": "#F59E0B",
        "definition": {
            "schema_version": 1,
            "type": "http_api",
            "messages": [
                {
                    "event": "start",
                    "type": "text",
                    "text": "Rescheduling your appointment to the new time...",
                }
            ],
            "config": {
                "method": "POST",
                "url": "http://localhost:8080/api/appointments/reschedule",
                "headers": None,
                "credential_uuid": None,
                "parameters": [
                    {
                        "name": "appointment_id",
                        "type": "string",
                        "description": "Appointment reference code (e.g. APT-1001)",
                        "required": True,
                    },
                    {
                        "name": "new_date",
                        "type": "string",
                        "description": "New desired appointment date in YYYY-MM-DD format",
                        "required": True,
                    },
                    {
                        "name": "new_time",
                        "type": "string",
                        "description": "New desired appointment time in HH:MM format (e.g. 14:00)",
                        "required": True,
                    },
                    {
                        "name": "reason",
                        "type": "string",
                        "description": "Reason for rescheduling",
                        "required": False,
                    },
                ],
                "preset_parameters": None,
                "timeout_ms": 5000,
                "body_template": None,
                "body_format": "json",
            },
        },
    },
]


async def seed_tools():
    db = BaseDBClient()
    async with db.async_session() as session:
        # Fetch all organizations
        orgs = (await session.execute(select(OrganizationModel))).scalars().all()
        if not orgs:
            print("No organizations found in database!")
            return

        # Fetch first user for created_by
        users = (await session.execute(select(UserModel))).scalars().all()
        default_user_id = users[0].id if users else 1

        for org in orgs:
            print(f"\nProcessing Organization ID: {org.id}")
            for tool_data in APPOINTMENT_TOOLS:
                # Check if tool already exists in this org
                existing = (
                    await session.execute(
                        select(ToolModel).where(
                            ToolModel.organization_id == org.id,
                            ToolModel.name == tool_data["name"],
                        )
                    )
                ).scalar_one_or_none()

                if existing:
                    existing.description = tool_data["description"]
                    existing.icon = tool_data["icon"]
                    existing.icon_color = tool_data["icon_color"]
                    existing.definition = tool_data["definition"]
                    existing.status = "active"
                    print(f"  [UPDATED] {tool_data['name']} (UUID: {existing.tool_uuid})")
                else:
                    new_tool = ToolModel(
                        organization_id=org.id,
                        created_by=default_user_id,
                        name=tool_data["name"],
                        description=tool_data["description"],
                        category="http_api",
                        icon=tool_data["icon"],
                        icon_color=tool_data["icon_color"],
                        definition=tool_data["definition"],
                        status="active",
                    )
                    session.add(new_tool)
                    await session.flush()
                    print(f"  [CREATED] {tool_data['name']} (UUID: {new_tool.tool_uuid})")

        await session.commit()
        print("\nAll 4 appointment tools successfully registered in Dograh!")


if __name__ == "__main__":
    asyncio.run(seed_tools())
