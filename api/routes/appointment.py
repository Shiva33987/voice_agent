"""FastAPI Router for Dograh Agent Appointment Booking System.

Provides endpoints for:
1. Public / Embed website visitors to check availability and book appointments.
2. In-app agent appointment management, status tracking, and per-agent booking configuration.
3. Live voice AI tool execution for real-time conversational bookings.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from api.db import db_client
from api.db.models import UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class PublicBookingRequest(BaseModel):
    workflow_id: int = Field(..., description="Target Agent/Workflow ID")
    customer_name: str = Field(..., description="Customer full name")
    customer_phone: str = Field(..., description="Customer phone number")
    customer_email: Optional[str] = Field(None, description="Optional customer email")
    appointment_date: Optional[str] = Field(None, description="YYYY-MM-DD")
    appointment_time: Optional[str] = Field(None, description="HH:MM (e.g. 10:00)")
    service_type: Optional[str] = Field("General Consultation", description="Selected service type")
    notes: Optional[str] = Field(None, description="Customer notes")
    booking_source: Optional[str] = Field("voice_call", description="website_embed | direct_page | voice_call")
    workflow_run_id: Optional[int] = Field(None, description="Optional ID of originating call session")


class CancelBookingRequest(BaseModel):
    appointment_code: str = Field(..., description="Appointment code (e.g. APT-B2841)")
    reason: Optional[str] = Field(None, description="Reason for cancellation")


class RescheduleBookingRequest(BaseModel):
    appointment_code: str = Field(..., description="Appointment code")
    new_date: str = Field(..., description="New date (YYYY-MM-DD)")
    new_time: str = Field(..., description="New time (HH:MM)")


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="confirmed | completed | cancelled | rescheduled")
    notes: Optional[str] = None


class BookingConfigUpdateRequest(BaseModel):
    page_title: Optional[str] = None
    page_slug: Optional[str] = None
    accent_color: Optional[str] = None
    welcome_message: Optional[str] = None
    service_types: Optional[List[str]] = None
    business_hours: Optional[Dict[str, Any]] = None
    voice_agent_enabled: Optional[bool] = None
    allow_guest_booking: Optional[bool] = None


# -----------------------------------------------------------------------------
# Public & Embed Endpoints (Unauthenticated for website visitors)
# -----------------------------------------------------------------------------

@router.get("/availability")
async def check_availability(
    workflow_id: int = Query(..., description="Workflow ID"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
):
    """Check open slots for an agent on a specific date (accessible by external websites)."""
    try:
        from datetime import UTC, datetime
        date_str = date or datetime.now(UTC).strftime("%Y-%m-%d")
        slots_data = await db_client.get_available_slots(workflow_id=workflow_id, date_str=date_str)
        return slots_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public-config/{workflow_id}")
async def get_public_booking_config(workflow_id: int):
    """Fetch public customization for an agent's booking page."""
    config = await db_client.get_or_create_booking_config(workflow_id)
    return {
        "workflow_id": config.workflow_id,
        "page_title": config.page_title,
        "page_slug": config.page_slug,
        "accent_color": config.accent_color,
        "welcome_message": config.welcome_message,
        "service_types": config.service_types,
        "business_hours": config.business_hours,
        "voice_agent_enabled": config.voice_agent_enabled,
        "allow_guest_booking": config.allow_guest_booking,
    }


@router.post("/book")
async def book_appointment(req: PublicBookingRequest):
    """Book an appointment for an agent (from website widget, direct page, or voice AI)."""
    try:
        from datetime import UTC, datetime
        appt_date = req.appointment_date or datetime.now(UTC).strftime("%Y-%m-%d")
        appt_time = req.appointment_time or "10:00"
        appointment = await db_client.book_appointment(
            workflow_id=req.workflow_id,
            customer_name=req.customer_name,
            customer_phone=req.customer_phone,
            appointment_date=appt_date,
            appointment_time=appt_time,
            customer_email=req.customer_email,
            service_type=req.service_type or "General Consultation",
            notes=req.notes,
            booking_source=req.booking_source or "voice_call",
            workflow_run_id=req.workflow_run_id,
        )
        return {
            "success": True,
            "appointment_id": appointment.id,
            "appointment_code": appointment.appointment_code,
            "status": appointment.status,
            "customer_name": appointment.customer_name,
            "appointment_date": appointment.appointment_date,
            "appointment_time": appointment.appointment_time,
            "service_type": appointment.service_type,
            "message": f"Appointment {appointment.appointment_code} successfully confirmed!",
        }
    except ValueError as ve:
        raise HTTPException(status_code=409, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel")
async def cancel_appointment(req: CancelBookingRequest):
    """Cancel an appointment by code."""
    apt = await db_client.cancel_appointment_by_code(req.appointment_code, req.reason)
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment code not found.")
    return {
        "success": True,
        "appointment_code": apt.appointment_code,
        "status": apt.status,
        "message": "Appointment has been cancelled.",
    }


@router.post("/reschedule")
async def reschedule_appointment(req: RescheduleBookingRequest):
    """Reschedule an existing appointment."""
    try:
        apt = await db_client.reschedule_appointment(req.appointment_code, req.new_date, req.new_time)
        if not apt:
            raise HTTPException(status_code=404, detail="Appointment code not found.")
        return {
            "success": True,
            "appointment_code": apt.appointment_code,
            "status": apt.status,
            "new_date": apt.appointment_date,
            "new_time": apt.appointment_time,
            "message": f"Appointment rescheduled to {apt.appointment_date} at {apt.appointment_time}.",
        }
    except ValueError as ve:
        raise HTTPException(status_code=409, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# Authenticated Management Endpoints (For Dograh Dashboard & Workflow Tabs)
# -----------------------------------------------------------------------------

@router.get("")
async def list_all_appointments(
    user: UserModel = Depends(get_user),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100),
):
    """List all appointments for the user's organization."""
    org_id = (
        getattr(user, "selected_organization_id", None)
        or getattr(user, "current_organization_id", None)
        or 1
    )
    items = await db_client.list_appointments(
        organization_id=org_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    return [
        {
            "id": a.id,
            "appointment_code": a.appointment_code,
            "workflow_id": a.workflow_id,
            "workflow_run_id": a.workflow_run_id,
            "customer_name": a.customer_name,
            "customer_phone": a.customer_phone,
            "customer_email": a.customer_email,
            "service_type": a.service_type,
            "appointment_date": a.appointment_date,
            "appointment_time": a.appointment_time,
            "status": a.status,
            "booking_source": a.booking_source,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in items
    ]


@router.get("/workflow/{workflow_id}")
async def list_agent_appointments(
    workflow_id: int,
    user: UserModel = Depends(get_user),
    status: Optional[str] = Query(None),
    limit: int = Query(100),
):
    """List appointments specifically booked for a given agent / workflow."""
    items = await db_client.list_appointments(
        workflow_id=workflow_id,
        status=status,
        limit=limit,
    )
    return [
        {
            "id": a.id,
            "appointment_code": a.appointment_code,
            "workflow_id": a.workflow_id,
            "workflow_run_id": a.workflow_run_id,
            "customer_name": a.customer_name,
            "customer_phone": a.customer_phone,
            "customer_email": a.customer_email,
            "service_type": a.service_type,
            "appointment_date": a.appointment_date,
            "appointment_time": a.appointment_time,
            "status": a.status,
            "booking_source": a.booking_source,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in items
    ]


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    req: UpdateStatusRequest,
    user: UserModel = Depends(get_user),
):
    """Update status of an appointment (e.g. marked as completed or cancelled)."""
    apt = await db_client.update_appointment_status(appointment_id, req.status, req.notes)
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return {"success": True, "appointment_id": apt.id, "status": apt.status}


@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    user: UserModel = Depends(get_user),
):
    """Permanently delete an appointment by ID."""
    success = await db_client.delete_appointment(appointment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return {"success": True, "appointment_id": appointment_id, "message": "Appointment deleted successfully"}


@router.get("/config/{workflow_id}")
async def get_booking_config(
    workflow_id: int,
    user: UserModel = Depends(get_user),
):
    """Get booking config for an agent in the dashboard."""
    config = await db_client.get_or_create_booking_config(workflow_id)
    return {
        "id": config.id,
        "workflow_id": config.workflow_id,
        "page_title": config.page_title,
        "page_slug": config.page_slug,
        "accent_color": config.accent_color,
        "welcome_message": config.welcome_message,
        "service_types": config.service_types,
        "business_hours": config.business_hours,
        "voice_agent_enabled": config.voice_agent_enabled,
        "allow_guest_booking": config.allow_guest_booking,
    }


@router.put("/config/{workflow_id}")
async def update_booking_config(
    workflow_id: int,
    req: BookingConfigUpdateRequest,
    user: UserModel = Depends(get_user),
):
    """Save updated booking settings for an agent."""
    updates = req.model_dump(exclude_unset=True)
    config = await db_client.update_booking_config(workflow_id, updates)
    return {
        "success": True,
        "config": {
            "id": config.id,
            "workflow_id": config.workflow_id,
            "page_title": config.page_title,
            "page_slug": config.page_slug,
            "accent_color": config.accent_color,
            "welcome_message": config.welcome_message,
            "service_types": config.service_types,
            "business_hours": config.business_hours,
            "voice_agent_enabled": config.voice_agent_enabled,
            "allow_guest_booking": config.allow_guest_booking,
        },
    }

