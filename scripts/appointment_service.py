"""Appointment Booking Service for Dograh Voice Agents.

Provides 4 core API endpoints for AI Voice Agents:
1. GET  /api/appointments/availability  - Check open appointment slots
2. POST /api/appointments/book          - Book a new appointment
3. POST /api/appointments/cancel        - Cancel an appointment
4. POST /api/appointments/reschedule    - Reschedule an existing appointment

Also provides a real-time web dashboard at http://localhost:8080/
"""

import datetime
import os
import random
import sqlite3
from contextlib import asynccontextmanager
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

DB_FILE = os.path.join(os.path.dirname(__file__), "appointments.db")

BUSINESS_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30"
]


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                service_type TEXT NOT NULL DEFAULT 'General Consultation',
                status TEXT NOT NULL DEFAULT 'confirmed',
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Appointment Booking Service for Voice Agents",
    description="Backend API powering Dograh AI Voice Agent booking, availability, cancellation, and rescheduling tools.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Request & Response Models
# ---------------------------------------------------------


class BookAppointmentRequest(BaseModel):
    date: str = Field(..., description="Date of appointment in YYYY-MM-DD format (e.g. 2026-10-24)")
    time: str = Field(..., description="Time of appointment in HH:MM format (e.g. 10:00 or 14:30)")
    customer_name: str = Field(..., description="Full name of customer")
    customer_phone: str = Field(..., description="Customer phone number")
    service_type: Optional[str] = Field("General Consultation", description="Type of appointment/service")
    notes: Optional[str] = Field(None, description="Additional customer notes or requests")


class CancelAppointmentRequest(BaseModel):
    appointment_id: Optional[str] = Field(None, description="Appointment ID (e.g. APT-1001)")
    customer_phone: Optional[str] = Field(None, description="Phone number to lookup appointment if ID is unknown")
    reason: Optional[str] = Field(None, description="Reason for cancellation")


class RescheduleAppointmentRequest(BaseModel):
    appointment_id: str = Field(..., description="Appointment ID to reschedule (e.g. APT-1001)")
    new_date: str = Field(..., description="New desired date in YYYY-MM-DD format")
    new_time: str = Field(..., description="New desired time in HH:MM format")
    reason: Optional[str] = Field(None, description="Reason for rescheduling")


# ---------------------------------------------------------
# 1. Checking Availability Tool
# ---------------------------------------------------------


@app.get("/api/appointments/availability", summary="Check Appointment Availability")
def check_availability(
    date: str = Query(..., description="Date to check availability for in YYYY-MM-DD format"),
    service_type: Optional[str] = Query(None, description="Optional service type filter"),
):
    """Check open appointment slots for a given date."""
    try:
        # Validate date format
        datetime.date.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD (e.g. 2026-10-24)")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT time FROM appointments 
            WHERE date = ? AND status = 'confirmed'
            """,
            (date,),
        )
        booked_times = {row["time"] for row in cursor.fetchall()}

    available_slots = [slot for slot in BUSINESS_SLOTS if slot not in booked_times]

    if not available_slots:
        message = f"There are no available appointment slots on {date}. Please choose another date."
    else:
        sample_slots = ", ".join(available_slots[:4])
        message = (
            f"On {date}, there are {len(available_slots)} available slots, including {sample_slots}."
        )

    return {
        "success": True,
        "date": date,
        "service_type": service_type or "General",
        "available_slots": available_slots,
        "total_available": len(available_slots),
        "message": message,
    }


# ---------------------------------------------------------
# 2. Booking Appointments Tool
# ---------------------------------------------------------


@app.post("/api/appointments/book", summary="Book an Appointment")
def book_appointment(req: BookAppointmentRequest):
    """Book a new appointment slot."""
    try:
        datetime.date.fromisoformat(req.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    with get_db() as conn:
        cursor = conn.cursor()
        # Check if slot is already booked
        cursor.execute(
            """
            SELECT appointment_id FROM appointments 
            WHERE date = ? AND time = ? AND status = 'confirmed'
            """,
            (req.date, req.time),
        )
        conflict = cursor.fetchone()
        if conflict:
            # Fetch alternative slots on the same day
            cursor.execute(
                "SELECT time FROM appointments WHERE date = ? AND status = 'confirmed'",
                (req.date,),
            )
            booked = {r["time"] for r in cursor.fetchall()}
            alternatives = [s for s in BUSINESS_SLOTS if s not in booked]
            alt_text = f"Alternative slots on {req.date}: {', '.join(alternatives[:3])}" if alternatives else "No other slots available on this date."
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "error": "Slot already booked",
                    "message": f"The slot {req.time} on {req.date} is already taken. {alt_text}",
                    "alternative_slots": alternatives,
                },
            )

        # Generate appointment ID
        cursor.execute("SELECT MAX(id) FROM appointments")
        max_id = cursor.fetchone()[0] or 1000
        appointment_id = f"APT-{max_id + 1}"
        now = datetime.datetime.now().isoformat()

        cursor.execute(
            """
            INSERT INTO appointments (
                appointment_id, customer_name, customer_phone, date, time,
                service_type, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
            """,
            (
                appointment_id,
                req.customer_name.strip(),
                req.customer_phone.strip(),
                req.date,
                req.time,
                req.service_type or "General Consultation",
                req.notes,
                now,
                now,
            ),
        )
        conn.commit()

    return {
        "success": True,
        "status": "confirmed",
        "appointment_id": appointment_id,
        "date": req.date,
        "time": req.time,
        "customer_name": req.customer_name,
        "customer_phone": req.customer_phone,
        "service_type": req.service_type,
        "message": (
            f"Your appointment has been successfully booked for {req.customer_name} on "
            f"{req.date} at {req.time}. Your confirmation ID is {appointment_id}."
        ),
    }


# ---------------------------------------------------------
# 3. Canceling Appointments Tool
# ---------------------------------------------------------


@app.post("/api/appointments/cancel", summary="Cancel an Appointment")
def cancel_appointment(req: CancelAppointmentRequest):
    """Cancel an existing appointment by ID or customer phone."""
    if not req.appointment_id and not req.customer_phone:
        raise HTTPException(status_code=400, detail="Must provide either appointment_id or customer_phone")

    with get_db() as conn:
        cursor = conn.cursor()
        if req.appointment_id:
            cursor.execute(
                "SELECT * FROM appointments WHERE appointment_id = ?",
                (req.appointment_id.strip(),),
            )
        else:
            cursor.execute(
                "SELECT * FROM appointments WHERE customer_phone = ? AND status = 'confirmed' ORDER BY id DESC LIMIT 1",
                (req.customer_phone.strip(),),
            )
        row = cursor.fetchone()

        if not row:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "No matching active appointment found to cancel.",
                },
            )

        if row["status"] == "cancelled":
            return {
                "success": True,
                "appointment_id": row["appointment_id"],
                "message": f"Appointment {row['appointment_id']} was already cancelled previously.",
            }

        now = datetime.datetime.now().isoformat()
        cursor.execute(
            """
            UPDATE appointments 
            SET status = 'cancelled', updated_at = ?, notes = COALESCE(notes, '') || ' [Cancelled: ' || ? || ']'
            WHERE id = ?
            """,
            (now, req.reason or "Customer requested cancellation", row["id"]),
        )
        conn.commit()

    return {
        "success": True,
        "status": "cancelled",
        "appointment_id": row["appointment_id"],
        "customer_name": row["customer_name"],
        "date": row["date"],
        "time": row["time"],
        "message": (
            f"Appointment {row['appointment_id']} for {row['customer_name']} on "
            f"{row['date']} at {row['time']} has been successfully cancelled."
        ),
    }


# ---------------------------------------------------------
# 4. Rescheduling Appointments Tool
# ---------------------------------------------------------


@app.post("/api/appointments/reschedule", summary="Reschedule an Appointment")
def reschedule_appointment(req: RescheduleAppointmentRequest):
    """Move an existing appointment to a new date and time."""
    try:
        datetime.date.fromisoformat(req.new_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid new_date format. Use YYYY-MM-DD")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM appointments WHERE appointment_id = ?",
            (req.appointment_id.strip(),),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Appointment {req.appointment_id} not found",
            )

        # Check if new slot is taken by another appointment
        cursor.execute(
            """
            SELECT appointment_id FROM appointments 
            WHERE date = ? AND time = ? AND status = 'confirmed' AND appointment_id != ?
            """,
            (req.new_date, req.new_time, req.appointment_id.strip()),
        )
        conflict = cursor.fetchone()
        if conflict:
            cursor.execute(
                "SELECT time FROM appointments WHERE date = ? AND status = 'confirmed'",
                (req.new_date,),
            )
            booked = {r["time"] for r in cursor.fetchall()}
            alternatives = [s for s in BUSINESS_SLOTS if s not in booked]
            alt_text = f"Alternative slots on {req.new_date}: {', '.join(alternatives[:3])}" if alternatives else ""
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "error": "Slot already booked",
                    "message": f"The slot {req.new_time} on {req.new_date} is already booked. {alt_text}",
                    "alternative_slots": alternatives,
                },
            )

        old_date = row["date"]
        old_time = row["time"]
        now = datetime.datetime.now().isoformat()

        cursor.execute(
            """
            UPDATE appointments
            SET date = ?, time = ?, status = 'confirmed', updated_at = ?,
                notes = COALESCE(notes, '') || ' [Rescheduled from ' || ? || ' ' || ? || ']'
            WHERE appointment_id = ?
            """,
            (req.new_date, req.new_time, now, old_date, old_time, req.appointment_id.strip()),
        )
        conn.commit()

    return {
        "success": True,
        "status": "confirmed",
        "appointment_id": req.appointment_id,
        "customer_name": row["customer_name"],
        "old_date": old_date,
        "old_time": old_time,
        "new_date": req.new_date,
        "new_time": req.new_time,
        "message": (
            f"Appointment {req.appointment_id} for {row['customer_name']} has been rescheduled "
            f"from {old_date} at {old_time} to {req.new_date} at {req.new_time}."
        ),
    }


# ---------------------------------------------------------
# List All Appointments
# ---------------------------------------------------------


@app.get("/api/appointments", summary="List All Appointments")
def list_appointments():
    """List all appointments in the system."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM appointments ORDER BY date ASC, time ASC")
        rows = [dict(r) for r in cursor.fetchall()]
    return {"appointments": rows, "count": len(rows)}


@app.post("/api/appointments/clear", summary="Clear All Appointments")
def clear_appointments():
    """Clear all appointments from the database."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM appointments")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='appointments'")
        conn.commit()
    return {"success": True, "message": "All appointments have been cleared."}


# ---------------------------------------------------------
# Interactive Web Dashboard
# ---------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM appointments ORDER BY date ASC, time ASC")
        appointments = [dict(r) for r in cursor.fetchall()]

    rows_html = ""
    for apt in appointments:
        status_color = {
            "confirmed": "#10B981",
            "cancelled": "#EF4444",
            "rescheduled": "#F59E0B",
        }.get(apt["status"], "#6B7280")

        badge_html = f'<span style="background:{status_color}22; color:{status_color}; border:1px solid {status_color}55; padding:3px 10px; border-radius:12px; font-weight:600; font-size:12px;">{apt["status"].upper()}</span>'

        rows_html += f"""
        <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding:14px; font-weight:700; color:#60a5fa;">{apt["appointment_id"]}</td>
            <td style="padding:14px; font-weight:600; color:#f4f4f5;">{apt["customer_name"]}</td>
            <td style="padding:14px; color:#a1a1aa;">{apt["customer_phone"]}</td>
            <td style="padding:14px; color:#e4e4e7;">📅 {apt["date"]}</td>
            <td style="padding:14px; color:#e4e4e7;">⏰ {apt["time"]}</td>
            <td style="padding:14px; color:#a1a1aa;">{apt["service_type"]}</td>
            <td style="padding:14px;">{badge_html}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>call-agent - Appointments Dashboard</title>
        <meta http-equiv="refresh" content="10">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #f4f4f5;
                margin: 0;
                padding: 32px;
            }}
            .container {{
                max-width: 1100px;
                margin: 0 auto;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #27272a;
                padding-bottom: 24px;
                margin-bottom: 24px;
            }}
            .title {{
                font-size: 24px;
                font-weight: 700;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 12px;
            }}
            .tag {{
                font-size: 12px;
                background: #3b82f622;
                color: #60a5fa;
                border: 1px solid #3b82f655;
                padding: 4px 10px;
                border-radius: 9999px;
            }}
            .stats {{
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 28px;
            }}
            .stat-card {{
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                padding: 18px;
            }}
            .stat-label {{
                font-size: 13px;
                color: #a1a1aa;
                margin-bottom: 6px;
            }}
            .stat-value {{
                font-size: 24px;
                font-weight: 700;
                color: #f4f4f5;
            }}
            .card {{
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                overflow: hidden;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 14px;
            }}
            th {{
                background: #121214;
                padding: 14px;
                color: #a1a1aa;
                font-weight: 600;
                border-bottom: 1px solid #27272a;
            }}
            .api-bar {{
                margin-top: 24px;
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                padding: 20px;
            }}
            .api-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-top: 12px;
            }}
            .api-item {{
                background: #09090b;
                border: 1px solid #27272a;
                border-radius: 8px;
                padding: 10px 14px;
                font-family: monospace;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            .method-get {{ color: #60a5fa; font-weight: bold; }}
            .method-post {{ color: #34d399; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <div class="title">
                        <span>🗓️ call-agent Appointments Service</span>
                        <span class="tag">Live Service: Port 8080</span>
                    </div>
                    <p style="color:#a1a1aa; font-size:14px; margin-top:6px;">
                        Interactive backend for Voice Agent booking, availability, cancellations, and rescheduling.
                    </p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="clearAll()" style="background:#27272a; color:#ef4444; border:1px solid #3f3f46; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">🗑️ Clear All</button>
                    <a href="/docs" target="_blank" style="background:#2563eb; color:white; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">Swagger API Docs ↗</a>
                </div>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Appointments</div>
                    <div class="stat-value">{len(appointments)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Confirmed</div>
                    <div class="stat-value" style="color:#34d399;">{sum(1 for a in appointments if a["status"] == "confirmed")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Cancelled</div>
                    <div class="stat-value" style="color:#f87171;">{sum(1 for a in appointments if a["status"] == "cancelled")}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Auto Refresh</div>
                    <div class="stat-value" style="font-size:14px; color:#a1a1aa; padding-top:6px;">Every 10 seconds ⚡</div>
                </div>
            </div>

            <div class="card">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Service</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html if rows_html else '<tr><td colspan="7" style="padding:24px; text-align:center; color:#71717a;">No appointments booked yet.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="api-bar">
                <div style="font-weight:600; font-size:15px; color:#f4f4f5;">Agent Tool Endpoints Active:</div>
                <div class="api-grid">
                    <div class="api-item"><span class="method-get">GET</span> /api/appointments/availability?date=...</div>
                    <div class="api-item"><span class="method-post">POST</span> /api/appointments/book</div>
                    <div class="api-item"><span class="method-post">POST</span> /api/appointments/cancel</div>
                    <div class="api-item"><span class="method-post">POST</span> /api/appointments/reschedule</div>
                </div>
            </div>
        </div>
        <script>
            function clearAll() {{
                if (confirm('Clear all appointments?')) {{
                    fetch('/api/appointments/clear', {{ method: 'POST' }})
                        .then(function() {{ window.location.reload(); }});
                }}
            }}
        </script>
    </body>
    </html>
    """
    return html


if __name__ == "__main__":
    print("Starting Appointment Service on http://localhost:8080...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
