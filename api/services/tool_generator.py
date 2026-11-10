"""AI Tool Generator: Automatically constructs Dograh tool schemas from agent requirements."""

from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

from loguru import logger
from pydantic import BaseModel, Field

from api.db import db_client
from api.db.models import UserModel
from api.schemas.tool import (
    CreateToolRequest,
    HttpApiConfig,
    HttpApiToolDefinition,
    ToolParameter,
    ToolResponse,
)
from api.services.tool_management import create_tool_for_user


class GenerateToolRequest(BaseModel):
    requirement: str = Field(
        ...,
        description="Natural language description of what the agent needs the tool to do",
    )
    base_url: Optional[str] = Field(
        default=None,
        description="Optional base URL for the API endpoint (e.g. http://localhost:8080)",
    )
    auto_create: bool = Field(
        default=False,
        description="If True, immediately creates and persists the tool in the user's organization",
    )


class GenerateToolResponse(BaseModel):
    tool_request: dict[str, Any]
    tool: Optional[ToolResponse] = None
    created: bool = False


SYSTEM_TOOL_GEN_PROMPT = """You are an expert AI Voice Assistant Engineer for Dograh.
Given a user's requirement for a voice agent tool, generate a JSON object matching Dograh's HTTP API tool configuration.

The output MUST be valid JSON with this exact structure:
{
  "name": "Concise Tool Name",
  "description": "Clear instruction telling the voice agent WHEN to call this tool and what it returns.",
  "category": "http_api",
  "definition": {
    "type": "http_api",
    "config": {
      "method": "GET" or "POST",
      "url": "full URL or relative path",
      "parameters": [
        {
          "name": "param_name",
          "type": "string" | "number" | "boolean" | "object" | "array",
          "description": "Instruction for what the voice AI should ask or extract from the caller",
          "required": true
        }
      ],
      "body_template": {
        "param_name": "{{param_name}}"
      }
    }
  }
}

Rules:
1. Parameter names must be snake_case.
2. Parameter descriptions must instruct the voice AI what to elicit from the caller (e.g. "The date the caller wants to book, in YYYY-MM-DD format").
3. Use GET for lookup/check/query operations, and POST for booking/creation/cancellation.
4. If method is GET, body_template should be null.
5. Return ONLY the raw JSON object, no markdown formatting, no backticks.
"""


def _rule_based_fallback(requirement: str, base_url: Optional[str] = None) -> CreateToolRequest:
    """Generate a high-quality tool schema from text using semantic heuristics when no LLM key is configured."""
    text = requirement.strip()
    words = re.findall(r"\w+", text.lower())

    # Detect method
    is_get = any(w in words for w in ["check", "get", "fetch", "lookup", "query", "search", "find", "read", "view"])
    is_post = any(w in words for w in ["book", "create", "schedule", "reserve", "send", "post", "cancel", "submit", "update"])
    method = "GET" if (is_get and not is_post) else "POST"

    # Derive tool name
    # Clean leading words like "I need a tool to", "create a tool for"
    cleaned = re.sub(
        r"^(please\s+)?(i\s+need\s+a\s+tool\s+(to|for)|create\s+a\s+tool\s+(to|for)|build\s+a\s+tool\s+(to|for)|tool\s+to)\s+",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    
    first_sentence = cleaned.split(".")[0].split(",")[0].strip()
    name_parts = first_sentence.split()[:4]
    name = " ".join(name_parts).title()
    if not name or len(name) < 3:
        name = "Custom Voice Action"

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    base = base_url.rstrip("/") if base_url else "http://localhost:8080/api"
    url = f"{base}/{slug}"

    # Extract common entity parameters
    param_map: list[tuple[str, str, str, bool]] = []
    
    entity_patterns = [
        (r"\b(date|day)\b", "date", "string", "The desired date in YYYY-MM-DD format requested by the caller."),
        (r"\b(time|slot)\b", "time", "string", "The desired time or appointment slot requested by the caller."),
        (r"\b(doctor|doctor_name|physician)\b", "doctor_name", "string", "Name of the doctor or specialist."),
        (r"\b(patient|patient_name|caller|customer_name|client_name|name)\b", "name", "string", "The full name of the caller/patient."),
        (r"\b(phone|phone_number|mobile)\b", "phone", "string", "The contact phone number of the caller."),
        (r"\b(email|email_address)\b", "email", "string", "The email address of the caller."),
        (r"\b(notes|reason|symptoms|details|description)\b", "reason", "string", "Reason for the call or appointment details."),
        (r"\b(id|order_id|booking_id|account_id|ticket_id)\b", "identifier", "string", "The reference ID or account number."),
        (r"\b(city|location|address)\b", "location", "string", "The city or location specified by the caller."),
        (r"\b(amount|price|cost|quantity)\b", "amount", "number", "The numerical quantity or amount."),
    ]

    seen = set()
    for pattern, pname, ptype, pdesc in entity_patterns:
        if re.search(pattern, text, re.IGNORECASE) and pname not in seen:
            param_map.append((pname, ptype, pdesc, True))
            seen.add(pname)

    # If no parameters detected, add sensible defaults
    if not param_map:
        param_map.append(("query", "string", "The main topic or query details from the caller.", True))
        param_map.append(("caller_name", "string", "Name of the caller if provided.", False))

    parameters = [
        ToolParameter(name=pname, type=ptype, description=pdesc, required=preq)
        for pname, ptype, pdesc, preq in param_map
    ]

    body_template = None
    if method in {"POST", "PUT", "PATCH"}:
        body_template = {p.name: f"{{{{{p.name}}}}}" for p in parameters}

    config = HttpApiConfig(
        method=method,
        url=url,
        parameters=parameters,
        body_template=body_template,
        timeout_ms=5000,
    )

    description = (
        f"Call this tool when the user wants to {first_sentence.lower()}. "
        f"Gathers required information ({', '.join(p.name for p in parameters)}) and returns the result."
    )

    return CreateToolRequest(
        name=name,
        description=description,
        category="http_api",
        definition=HttpApiToolDefinition(
            type="http_api",
            config=config,
        ),
    )


async def generate_tool_from_requirement(
    requirement: str,
    base_url: Optional[str] = None,
    organization_id: Optional[int] = None,
) -> CreateToolRequest:
    """Generate a CreateToolRequest using an LLM if available, otherwise using intelligent heuristic rules."""
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    # Check if organization has OpenAI or Gemini provider connections
    if organization_id and not (openai_key or gemini_key):
        try:
            connections = await db_client.list_provider_connections(organization_id)
            for conn in connections:
                if conn.is_active and conn.credentials:
                    if conn.provider == "openai" and "api_key" in conn.credentials:
                        openai_key = conn.credentials["api_key"]
                    elif conn.provider == "google" and "api_key" in conn.credentials:
                        gemini_key = conn.credentials["api_key"]
        except Exception as e:
            logger.debug(f"Could not load provider connections for tool gen: {e}")

    # 1. Try OpenAI if key is present
    if openai_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            prompt = f"Agent Requirement: {requirement}\n"
            if base_url:
                prompt += f"Base URL to use: {base_url}\n"

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_TOOL_GEN_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw = response.choices[0].message.content or ""
            data = json.loads(raw)
            return CreateToolRequest.model_validate(data)
        except Exception as e:
            logger.warning(f"OpenAI tool generation failed: {e}; falling back to heuristic generator.")

    # 2. Try Gemini if key is present
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            prompt = f"{SYSTEM_TOOL_GEN_PROMPT}\n\nAgent Requirement: {requirement}\n"
            if base_url:
                prompt += f"Base URL: {base_url}\n"
            prompt += "Return pure JSON."

            res = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = (res.text or "").strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n", "", text)
                text = re.sub(r"\n```$", "", text)
            data = json.loads(text)
            return CreateToolRequest.model_validate(data)
        except Exception as e:
            logger.warning(f"Gemini tool generation failed: {e}; falling back to heuristic generator.")

    # 3. Fallback to intelligent rule-based synthesis
    return _rule_based_fallback(requirement, base_url)


async def generate_tool_for_requirement(
    request: GenerateToolRequest,
    user: UserModel,
) -> GenerateToolResponse:
    """Generate tool schema and optionally persist it to user's organization."""
    org_id = getattr(user, "selected_organization_id", None) or getattr(user, "current_organization_id", 1)
    tool_req = await generate_tool_from_requirement(
        requirement=request.requirement,
        base_url=request.base_url,
        organization_id=org_id,
    )

    created_tool = None
    if request.auto_create:
        try:
            created_tool = await create_tool_for_user(tool_req, user, source="ai_generator")
        except Exception as e:
            logger.warning(f"Could not auto-create generated tool: {e}")

    return GenerateToolResponse(
        tool_request=tool_req.model_dump(),
        tool=created_tool,
        created=created_tool is not None,
    )


async def auto_generate_tools_for_workflow(
    workflow_id: int,
    user: UserModel,
) -> dict[str, Any]:
    """Analyze workflow nodes and prompts, generate tailored tools, attach to agent nodes, and save draft."""
    org_id = getattr(user, "selected_organization_id", None) or getattr(user, "current_organization_id", 1)
    
    # 1. Fetch workflow and draft or published definition
    workflow = await db_client.get_workflow_by_id(workflow_id)
    if not workflow:
        raise ValueError(f"Workflow {workflow_id} not found")
        
    draft = await db_client.get_workflow_draft(workflow_id) if hasattr(db_client, "get_workflow_draft") else None
    if not draft and workflow.released_definition_id:
        draft = await db_client.get_workflow_definition(
            workflow_id=workflow_id,
            definition_id=workflow.released_definition_id,
            organization_id=workflow.organization_id,
        )

    if not draft:
        raise ValueError(f"No definition found for workflow {workflow_id}")

    workflow_json = dict(draft.workflow_json) if hasattr(draft, "workflow_json") else {}
    nodes = workflow_json.get("nodes", [])

    # Collect all text from workflow
    all_text = f"{workflow.name} " + " ".join(
        str(n.get("data", {}).get("prompt", "")) + " " + str(n.get("data", {}).get("title", ""))
        for n in nodes
    )
    all_text_lower = all_text.lower()

    # Determine tool definitions needed
    tool_requests: list[CreateToolRequest] = []
    
    is_hospital = any(
        kw in all_text_lower
        for kw in ["hospital", "doctor", "clinic", "patient", "omni"]
    )

    if is_hospital:
        # 1. Book Hospital Appointment Tool
        tool_requests.append(
            CreateToolRequest(
                name="Book Hospital Appointment",
                description="Book a new doctor appointment for the patient. Elicits patient name, mobile, age, gender, preferred hospital branch, department or doctor, date, and time.",
                category="http_api",
                definition=HttpApiToolDefinition(
                    type="http_api",
                    config=HttpApiConfig(
                        method="POST",
                        url="/api/v1/appointments/book",
                        parameters=[
                            ToolParameter(name="patient_name", type="string", description="Full legal name of the patient.", required=True),
                            ToolParameter(name="mobile_number", type="string", description="Mobile contact phone number of the patient.", required=True),
                            ToolParameter(name="age", type="string", description="Patient age or age group.", required=False),
                            ToolParameter(name="gender", type="string", description="Patient gender (Male, Female, Other).", required=False),
                            ToolParameter(name="branch", type="string", description="Preferred hospital branch (e.g. Kukatpally, Kothapet, Nanakramguda, Kurnool).", required=True),
                            ToolParameter(name="doctor_or_department", type="string", description="Department (e.g. Cardiology, Orthopedics) or doctor name.", required=False),
                            ToolParameter(name="appointment_date", type="string", description="Desired appointment date in YYYY-MM-DD format.", required=True),
                            ToolParameter(name="appointment_time", type="string", description="Preferred slot time (e.g. 10:30 AM).", required=True),
                            ToolParameter(name="appointment_date", type="string", description="Desired appointment date in YYYY-MM-DD format.", required=False),
                            ToolParameter(name="appointment_time", type="string", description="Preferred slot time (e.g. 10:30 AM).", required=False),
                        ],
                        body_template={
                            "patient_name": "{{patient_name}}",
                            "mobile_number": "{{mobile_number}}",
                            "age": "{{age}}",
                            "gender": "{{gender}}",
                            "branch": "{{branch}}",
                            "doctor_or_department": "{{doctor_or_department}}",
                            "workflow_id": workflow_id,
                            "customer_name": "{{patient_name}}",
                            "customer_phone": "{{mobile_number}}",
                            "service_type": "{{doctor_or_department}} - {{branch}}",
                            "appointment_date": "{{appointment_date}}",
                            "appointment_time": "{{appointment_time}}",
                            "booking_source": "voice_call",
                        },
                        timeout_ms=6000,
                    ),
                ),
            )
        )

        # 2. Check Availability Tool
        tool_requests.append(
            CreateToolRequest(
                name="Check Doctor & Slot Availability",
                description="Query available appointment dates and open time slots for a hospital branch and department/doctor.",
                category="http_api",
                definition=HttpApiToolDefinition(
                    type="http_api",
                    config=HttpApiConfig(
                        method="GET",
                        url="/api/v1/appointments/availability",
                        parameters=[
                            ToolParameter(name="branch", type="string", description="Hospital branch to check availability for.", required=False),
                            ToolParameter(name="department", type="string", description="Medical department or doctor name.", required=False),
                            ToolParameter(name="date", type="string", description="Date to check availability for in YYYY-MM-DD format.", required=False),
                        ],
                        body_template=None,
                        timeout_ms=5000,
                    ),
                ),
            )
        )

        # 3. Reschedule or Cancel Tool
        tool_requests.append(
            CreateToolRequest(
                name="Cancel or Reschedule Appointment",
                description="Cancel an existing appointment or reschedule it to a new date and time.",
                category="http_api",
                definition=HttpApiToolDefinition(
                    type="http_api",
                    config=HttpApiConfig(
                        method="POST",
                        url="/api/v1/appointments/reschedule",
                        parameters=[
                            ToolParameter(name="appointment_code_or_mobile", type="string", description="The appointment reference code or registered patient phone number.", required=True),
                            ToolParameter(name="action", type="string", description="Action to perform: 'cancel' or 'reschedule'.", required=True),
                            ToolParameter(name="new_date", type="string", description="New date if rescheduling (YYYY-MM-DD format).", required=False),
                            ToolParameter(name="new_time", type="string", description="New time slot if rescheduling.", required=False),
                        ],
                        body_template={
                            "appointment_code_or_mobile": "{{appointment_code_or_mobile}}",
                            "action": "{{action}}",
                            "new_date": "{{new_date}}",
                            "new_time": "{{new_time}}",
                        },
                        timeout_ms=6000,
                    ),
                ),
            )
        )
    else:
        # Heuristic generation for general workflows
        tool_requests.append(_rule_based_fallback(workflow.name))
        # Standard Inbound, Lead Qualification, & Consultation Workflow
        tool_requests.append(
            CreateToolRequest(
                name="Save Customer Lead & Schedule Consultation",
                description="Save qualified customer lead details and schedule a consultation slot directly in the system. Call this as soon as the caller provides their name, phone number, and project requirements or requests a follow-up consultation.",
                category="http_api",
                definition=HttpApiToolDefinition(
                    type="http_api",
                    config=HttpApiConfig(
                        method="POST",
                        url="/api/v1/appointments/book",
                        parameters=[
                            ToolParameter(name="customer_name", type="string", description="Full legal or preferred name of the customer or prospective client.", required=True),
                            ToolParameter(name="customer_phone", type="string", description="Contact mobile or phone number of the customer.", required=True),
                            ToolParameter(name="customer_email", type="string", description="Email address of the customer if provided.", required=False),
                            ToolParameter(name="service_type", type="string", description="Requested service: Web App, Mobile App, AI and Automation, Custom Software, Cloud, or Support.", required=False),
                            ToolParameter(name="notes", type="string", description="Summary of project requirements, company name, role, budget range, and timeline.", required=False),
                            ToolParameter(name="appointment_date", type="string", description="Preferred consultation date in YYYY-MM-DD format.", required=False),
                            ToolParameter(name="appointment_time", type="string", description="Preferred consultation time slot (e.g. 10:00, 11:30, 14:00, 16:00).", required=False),
                        ],
                        body_template={
                            "workflow_id": workflow_id,
                            "customer_name": "{{customer_name}}",
                            "customer_phone": "{{customer_phone}}",
                            "customer_email": "{{customer_email}}",
                            "service_type": "{{service_type}}",
                            "notes": "{{notes}}",
                            "appointment_date": "{{appointment_date}}",
                            "appointment_time": "{{appointment_time}}",
                            "booking_source": "voice_call",
                        },
                        timeout_ms=6000,
                    ),
                ),
            )
        )

        tool_requests.append(
            CreateToolRequest(
                name="Check Consultation Availability",
                description="Query available appointment dates and open time slots for client consultations and demos.",
                category="http_api",
                definition=HttpApiToolDefinition(
                    type="http_api",
                    config=HttpApiConfig(
                        method="GET",
                        url="/api/v1/appointments/availability",
                        parameters=[
                            ToolParameter(name="date", type="string", description="Date to check availability for in YYYY-MM-DD format.", required=False),
                        ],
                        body_template=None,
                        timeout_ms=5000,
                    ),
                ),
            )
        )

        tool_requests.append(
            CreateToolRequest(
                name="Cancel or Reschedule Consultation",
                description="Cancel an existing consultation or reschedule it to a new date and time.",
                category="http_api",
                definition=HttpApiToolDefinition(
                    type="http_api",
                    config=HttpApiConfig(
                        method="POST",
                        url="/api/v1/appointments/reschedule",
                        parameters=[
                            ToolParameter(name="appointment_code_or_mobile", type="string", description="The appointment reference code or customer contact phone number.", required=True),
                            ToolParameter(name="action", type="string", description="Action to perform: 'cancel' or 'reschedule'.", required=True),
                            ToolParameter(name="new_date", type="string", description="New date if rescheduling (YYYY-MM-DD format).", required=False),
                            ToolParameter(name="new_time", type="string", description="New time slot if rescheduling.", required=False),
                        ],
                        body_template={
                            "appointment_code_or_mobile": "{{appointment_code_or_mobile}}",
                            "action": "{{action}}",
                            "new_date": "{{new_date}}",
                            "new_time": "{{new_time}}",
                        },
                        timeout_ms=6000,
                    ),
                ),
            )
        )

    # Existing tools in org to prevent duplicates
    existing_tools = await db_client.get_tools_for_organization(org_id)
    existing_by_name = {t.name.lower().strip(): t for t in existing_tools}

    created_or_found_tools: list[Any] = []
    created_uuids: list[str] = []

    for req in tool_requests:
        req_name_clean = req.name.lower().strip()
        if req_name_clean in existing_by_name:
            t = existing_by_name[req_name_clean]
            created_or_found_tools.append(t)
            created_uuids.append(t.tool_uuid)
        else:
            try:
                new_tool = await create_tool_for_user(req, user, source="workflow_auto_gen")
                created_or_found_tools.append(new_tool)
                created_uuids.append(new_tool.tool_uuid)
                existing_by_name[req_name_clean] = new_tool
            except Exception as e:
                logger.error(f"Error creating tool {req.name}: {e}")

    # Attach tool UUIDs to agent / conversational nodes
    updated_nodes = []
    for node in nodes:
        node_copy = dict(node)
        data = dict(node_copy.get("data", {}))
        # An agent node is either labeled or has prompt content
        is_agent_node = bool(
            data.get("prompt") or 
            node.get("node_type") in ("agent", "conversation") or 
            str(node.get("id")) in ("0", "1", "2")
        )
        if is_agent_node:
            current_tools = list(data.get("tools") or [])
            merged_tools = list(dict.fromkeys(current_tools + created_uuids))
            data["tools"] = merged_tools
            node_copy["data"] = data
        updated_nodes.append(node_copy)

    workflow_json["nodes"] = updated_nodes

    # Update draft in DB
    try:
        await db_client.update_workflow(
            workflow_id=workflow_id,
            name=None,
            workflow_definition=workflow_json,
            template_context_variables=None,
            workflow_configurations=None,
            organization_id=org_id,
        )
    except Exception as e:
        logger.warning(f"Could not automatically update workflow draft definition: {e}")

    return {
        "success": True,
        "tools": [t.model_dump() if hasattr(t, "model_dump") else t for t in created_or_found_tools],
        "tool_uuids": created_uuids,
        "message": f"Successfully auto-generated and attached {len(created_or_found_tools)} tools to workflow agent nodes.",
    }



