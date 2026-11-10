"""Database client for managing agent booking configurations and appointments."""

from datetime import UTC, datetime, time, timedelta
import random
import string
from typing import Any, Dict, List, Optional

from loguru import logger
from sqlalchemy import and_, desc, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.base_client import BaseDBClient
from api.db.models import AgentBookingConfigModel, AppointmentModel, WorkflowModel


class AppointmentClient(BaseDBClient):
    """Client for managing appointments and per-agent booking configurations."""

    @staticmethod
    def _generate_appointment_code() -> str:
        num = random.randint(1000, 9999)
        letter = random.choice(string.ascii_uppercase)
        return f"APT-{letter}{num}"

    async def get_booking_config(self, workflow_id: int) -> Optional[AgentBookingConfigModel]:
        """Fetch booking config for a workflow, if defined."""
        async with self.async_session() as session:
            stmt = select(AgentBookingConfigModel).where(AgentBookingConfigModel.workflow_id == workflow_id)
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def get_or_create_booking_config(
        self,
        workflow_id: int,
        default_title: Optional[str] = None,
    ) -> AgentBookingConfigModel:
        """Fetch booking config or initialize default config."""
        async with self.async_session() as session:
            stmt = select(AgentBookingConfigModel).where(AgentBookingConfigModel.workflow_id == workflow_id)
            result = await session.execute(stmt)
            config = result.scalar_one_or_none()
            if config:
                return config

            # Fetch workflow name if available
            wf_stmt = select(WorkflowModel).where(WorkflowModel.id == workflow_id)
            wf_result = await session.execute(wf_stmt)
            wf = wf_result.scalar_one_or_none()

            title = default_title or (f"{wf.name} Booking" if wf and hasattr(wf, "name") and wf.name else f"Agent #{workflow_id} Booking")
            slug = f"agent-{workflow_id}"

            new_config = AgentBookingConfigModel(
                workflow_id=workflow_id,
                page_title=title,
                page_slug=slug,
                accent_color="#3b82f6",
                welcome_message="Schedule an appointment with our AI Voice Assistant. Pick a slot below or click 'Talk to Agent' to book over a live voice call.",
                service_types=["General Consultation", "Product Discovery & Demo", "Follow-up Support"],
                business_hours={
                    "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "slot_duration": 30,
                },
                voice_agent_enabled=True,
                allow_guest_booking=True,
            )

            # If workflow doesn't exist in DB yet, return ephemeral config without inserting
            if not wf:
                return new_config

            session.add(new_config)
            await session.commit()
            await session.refresh(new_config)
            return new_config

    async def update_booking_config(
        self,
        workflow_id: int,
        updates: Dict[str, Any],
    ) -> AgentBookingConfigModel:
        """Update or insert booking configuration for a workflow."""
        async with self.async_session() as session:
            stmt = select(AgentBookingConfigModel).where(AgentBookingConfigModel.workflow_id == workflow_id)
            result = await session.execute(stmt)
            config = result.scalar_one_or_none()

            if not config:
                config = AgentBookingConfigModel(workflow_id=workflow_id)
                session.add(config)

            for key, val in updates.items():
                if hasattr(config, key) and val is not None:
                    setattr(config, key, val)

            config.updated_at = datetime.now(UTC)
            await session.commit()
            await session.refresh(config)
            return config

    async def get_available_slots(
        self,
        workflow_id: int,
        date_str: str,  # "YYYY-MM-DD"
    ) -> Dict[str, Any]:
        """Calculate available time slots for a given agent on a date."""
        config = await self.get_or_create_booking_config(workflow_id)
        b_hours = config.business_hours or {}
        start_str = b_hours.get("start_time", "09:00")
        end_str = b_hours.get("end_time", "17:00")
        duration = int(b_hours.get("slot_duration", 30))

        # Generate standard time slots
        all_slots = []
        try:
            curr_dt = datetime.strptime(start_str, "%H:%M")
            end_dt = datetime.strptime(end_str, "%H:%M")
            while curr_dt < end_dt:
                slot_time = curr_dt.strftime("%H:%M")
                curr_dt += timedelta(minutes=duration)
                all_slots.append(slot_time)
        except Exception:
            all_slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]

        # Fetch already booked slots for this agent on this date
        async with self.async_session() as session:
            stmt = select(AppointmentModel.appointment_time).where(
                and_(
                    AppointmentModel.workflow_id == workflow_id,
                    AppointmentModel.appointment_date == date_str,
                    AppointmentModel.status.in_(["confirmed", "pending"]),
                )
            )
            result = await session.execute(stmt)
            booked_times = set(result.scalars().all())

        available = [s for s in all_slots if s not in booked_times]
        return {
            "date": date_str,
            "workflow_id": workflow_id,
            "total_slots": len(all_slots),
            "available_slots": available,
            "booked_slots": list(booked_times),
            "service_types": config.service_types or ["General Consultation"],
        }

    async def book_appointment(
        self,
        workflow_id: int,
        customer_name: str,
        customer_phone: str,
        appointment_date: str,
        appointment_time: str,
        customer_email: Optional[str] = None,
        service_type: str = "General Consultation",
        notes: Optional[str] = None,
        booking_source: str = "website_embed",
        workflow_run_id: Optional[int] = None,
        metadata_json: Optional[dict] = None,
    ) -> AppointmentModel:
        """Book a new appointment linked to a workflow / agent."""
        async with self.async_session() as session:
            # Look up organization_id from workflow
            wf_stmt = select(WorkflowModel).where(WorkflowModel.id == workflow_id)
            wf_res = await session.execute(wf_stmt)
            wf = wf_res.scalar_one_or_none()
            org_id = wf.organization_id if wf and wf.organization_id else 1

            # Check if this customer already booked this exact slot
            conflict_stmt = select(AppointmentModel).where(
                and_(
                    AppointmentModel.workflow_id == workflow_id,
                    AppointmentModel.appointment_date == appointment_date,
                    AppointmentModel.appointment_time == appointment_time,
                    AppointmentModel.customer_phone == customer_phone,
                    AppointmentModel.status.in_(["confirmed", "pending"]),
                )
            )
            conflict_res = await session.execute(conflict_stmt)
            existing = conflict_res.scalar_one_or_none()
            if existing:
                raise ValueError(f"You already have a confirmed appointment at {appointment_time} on {appointment_date}.")
                if notes:
                    existing.notes = f"{existing.notes or ''}\nUpdate: {notes}".strip()
                if customer_email and not existing.customer_email:
                    existing.customer_email = customer_email
                await session.commit()
                await session.refresh(existing)
                return existing

            code = self._generate_appointment_code()
            appointment = AppointmentModel(
                appointment_code=code,
                organization_id=org_id,
                workflow_id=workflow_id,
                workflow_run_id=workflow_run_id,
                customer_name=customer_name,
                customer_phone=customer_phone,
                customer_email=customer_email,
                service_type=service_type or "General Consultation",
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                status="confirmed",
                booking_source=booking_source or "website_embed",
                notes=notes,
                metadata_json=metadata_json or {},
            )
            session.add(appointment)
            await session.commit()
            await session.refresh(appointment)
            return appointment

    async def delete_appointment(self, appointment_id: int) -> bool:
        """Permanently delete an appointment by ID."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.id == appointment_id)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return False
            await session.delete(appointment)
            await session.commit()
            return True

    async def list_appointments(
        self,
        workflow_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
    ) -> List[AppointmentModel]:
        """List appointments with optional filtering."""
        async with self.async_session() as session:
            conditions = []
            if workflow_id:
                conditions.append(AppointmentModel.workflow_id == workflow_id)
            if organization_id:
                conditions.append(AppointmentModel.organization_id == organization_id)
            if status:
                conditions.append(AppointmentModel.status == status)
            if date_from:
                conditions.append(AppointmentModel.appointment_date >= date_from)
            if date_to:
                conditions.append(AppointmentModel.appointment_date <= date_to)

            stmt = select(AppointmentModel)
            if conditions:
                stmt = stmt.where(and_(*conditions))
            stmt = stmt.order_by(desc(AppointmentModel.appointment_date), desc(AppointmentModel.appointment_time)).limit(limit)

            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def update_appointment_status(
        self,
        appointment_id: int,
        status: str,
        notes: Optional[str] = None,
    ) -> Optional[AppointmentModel]:
        """Update appointment status (confirmed, cancelled, completed, rescheduled)."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.id == appointment_id)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return None

            appointment.status = status
            if notes is not None:
                appointment.notes = notes
            appointment.updated_at = datetime.now(UTC)

            await session.commit()
            await session.refresh(appointment)
            return appointment

    async def delete_appointment(self, appointment_id: int) -> bool:
        """Permanently delete an appointment by ID."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.id == appointment_id)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return False
            await session.delete(appointment)
            await session.commit()
            return True

    async def cancel_appointment_by_code(
        self,
        appointment_code: str,
        reason: Optional[str] = None,
    ) -> Optional[AppointmentModel]:
        """Cancel an appointment using its customer-facing code (e.g. APT-B2841)."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.appointment_code == appointment_code)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return None

            appointment.status = "cancelled"
            if reason:
                existing_notes = appointment.notes or ""
                appointment.notes = f"{existing_notes}\nCancellation reason: {reason}".strip()
            appointment.updated_at = datetime.now(UTC)

            await session.commit()
            await session.refresh(appointment)
            return appointment

    async def delete_appointment(self, appointment_id: int) -> bool:
        """Permanently delete an appointment by ID."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.id == appointment_id)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return False
            await session.delete(appointment)
            await session.commit()
            return True

    async def reschedule_appointment(
        self,
        appointment_code: str,
        new_date: str,
        new_time: str,
    ) -> Optional[AppointmentModel]:
        """Reschedule an existing appointment to a new date and time."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.appointment_code == appointment_code)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return None

            # Check conflict
            conflict_stmt = select(AppointmentModel).where(
                and_(
                    AppointmentModel.workflow_id == appointment.workflow_id,
                    AppointmentModel.appointment_date == new_date,
                    AppointmentModel.appointment_time == new_time,
                    AppointmentModel.status.in_(["confirmed", "pending"]),
                    AppointmentModel.id != appointment.id,
                )
            )
            conflict_res = await session.execute(conflict_stmt)
            if conflict_res.scalar_one_or_none():
                raise ValueError(f"New slot {new_time} on {new_date} is already occupied.")

            appointment.appointment_date = new_date
            appointment.appointment_time = new_time
            appointment.status = "rescheduled"
            appointment.updated_at = datetime.now(UTC)

            await session.commit()
            await session.refresh(appointment)
            return appointment

    async def delete_appointment(self, appointment_id: int) -> bool:
        """Permanently delete an appointment by ID."""
        async with self.async_session() as session:
            stmt = select(AppointmentModel).where(AppointmentModel.id == appointment_id)
            res = await session.execute(stmt)
            appointment = res.scalar_one_or_none()
            if not appointment:
                return False
            await session.delete(appointment)
            await session.commit()
            return True
