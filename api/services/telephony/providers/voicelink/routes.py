"""VoiceLink telephony routes (call-event webhooks).

Mounted under ``/api/v1/telephony`` by ``api.routes.telephony`` via the
provider registry — see ProviderSpec.router.
"""

import json
from datetime import UTC, datetime

import redis.asyncio as aioredis
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from loguru import logger
from pipecat.utils.run_context import set_current_run_id

from api.constants import REDIS_URL
from api.db import db_client
from api.enums import TelephonyCallStatus, WorkflowRunState
from api.services.telephony.factory import get_telephony_provider_for_run
from api.services.telephony.providers.voicelink.provider import transferable_call
from api.services.telephony.status_processor import (
    StatusCallbackRequest,
    _process_status_update,
)

router = APIRouter()

_TERMINAL_STATUSES = frozenset(
    {
        TelephonyCallStatus.COMPLETED,
        TelephonyCallStatus.FAILED,
        TelephonyCallStatus.BUSY,
        TelephonyCallStatus.NO_ANSWER,
        TelephonyCallStatus.CANCELED,
        TelephonyCallStatus.ERROR,
    }
)
_TERMINAL_CLAIM_TTL_SECS = 24 * 60 * 60

_redis: aioredis.Redis | None = None


async def _claim_terminal_event(workflow_run_id: int) -> bool:
    """True for the first terminal event of a run, False for later ones.

    VoiceLink sends two or three terminal events per call (``call.failed``,
    ``call.ended``, ``call.completed``), often concurrently. Processing each one
    would publish duplicate campaign retries and double-count the call in the
    circuit breaker. Fails open: if Redis is down every event is processed, as
    before.
    """
    global _redis
    try:
        if _redis is None:
            _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        return bool(
            await _redis.set(
                f"voicelink:terminal:{workflow_run_id}",
                "1",
                ex=_TERMINAL_CLAIM_TTL_SECS,
                nx=True,
            )
        )
    except Exception as e:
        logger.warning(
            f"[run {workflow_run_id}] Could not claim VoiceLink terminal event: {e}"
        )
        return True


async def _log_duplicate_terminal_event(
    workflow_run, workflow_run_id: int, parsed_data: dict
) -> None:
    """Keep the raw callback in the run's logs without acting on it again."""
    callbacks = (workflow_run.logs or {}).get("telephony_status_callbacks", [])
    callbacks.append(
        {
            "status": parsed_data["status"],
            "timestamp": datetime.now(UTC).isoformat(),
            "call_id": parsed_data["call_id"],
            "duration": parsed_data.get("duration"),
            "duplicate": True,
            **parsed_data.get("extra", {}),
        }
    )
    await db_client.update_workflow_run(
        run_id=workflow_run_id, logs={"telephony_status_callbacks": callbacks}
    )


@router.post("/voicelink/events/{workflow_run_id}")
async def handle_voicelink_events(
    request: Request,
    workflow_run_id: int,
):
    """Handle VoiceLink call-event webhooks.

    VoiceLink POSTs nested camelCase JSON for every call lifecycle event
    (call.initiated, call.ringing, call.answered, call.completed,
    call.ended, call.failed) to the ``webhook_url`` passed in ``add_lead``.
    VoiceLink expects a 200 for valid events — webhooks are unsigned, so
    no signature verification is possible.
    """
    set_current_run_id(workflow_run_id)

    try:
        event_data = json.loads((await request.body()).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        logger.warning(
            f"[run {workflow_run_id}] VoiceLink event body is not valid JSON: {e}"
        )
        return {"status": "error", "reason": "invalid_json"}

    event_type = event_data.get("event", "")
    logger.info(f"[run {workflow_run_id}] Received VoiceLink event: event={event_type}")
    logger.debug(
        f"[run {workflow_run_id}] VoiceLink event body: {json.dumps(event_data)}"
    )

    workflow_run = await db_client.get_workflow_run_by_id(workflow_run_id)
    if not workflow_run:
        logger.warning(
            f"[run {workflow_run_id}] Workflow run not found for VoiceLink event"
        )
        return {"status": "ignored", "reason": "workflow_run_not_found"}

    workflow = await db_client.get_workflow_by_id(workflow_run.workflow_id)
    if not workflow:
        logger.warning(f"[run {workflow_run_id}] Workflow not found")
        return {"status": "ignored", "reason": "workflow_not_found"}

    provider = await get_telephony_provider_for_run(
        workflow_run, workflow.organization_id
    )

    # Parse the nested event into the generic format
    parsed_data = provider.parse_status_callback(event_data)

    logger.debug(
        f"[run {workflow_run_id}] Parsed VoiceLink event: "
        f"call_id={parsed_data['call_id']}, status={parsed_data['status']}"
    )

    status = TelephonyCallStatus.from_raw(parsed_data["status"])
    if status in _TERMINAL_STATUSES:
        if not await _claim_terminal_event(workflow_run_id):
            logger.info(
                f"[run {workflow_run_id}] Duplicate VoiceLink terminal event "
                f"{event_type}; logged only"
            )
            await _log_duplicate_terminal_event(
                workflow_run, workflow_run_id, parsed_data
            )
            return {"status": "success"}

        # An answered call whose run never left INITIALIZED had no media
        # stream: the caller heard silence and no agent ran. Recording it as
        # "completed" leaves it with no disposition and skips the post-call
        # webhook, so record it as a failed call instead.
        if (
            status == TelephonyCallStatus.COMPLETED
            and getattr(workflow_run, "state", None)
            == WorkflowRunState.INITIALIZED.value
        ):
            logger.warning(
                f"[run {workflow_run_id}] VoiceLink call was answered but the "
                "media stream never connected; recording it as failed"
            )
            parsed_data["status"] = TelephonyCallStatus.FAILED.value

    status_update = StatusCallbackRequest(
        call_id=parsed_data["call_id"],
        status=parsed_data["status"],
        from_number=parsed_data.get("from_number"),
        to_number=parsed_data.get("to_number"),
        direction=parsed_data.get("direction"),
        duration=parsed_data.get("duration"),
        extra=parsed_data.get("extra", {}),
    )

    await _process_status_update(workflow_run_id, status_update)

    logger.info(
        f"[run {workflow_run_id}] VoiceLink event {event_type} processed successfully"
    )

    return {"status": "success"}


@router.get("/voicelink/events")
@router.post("/voicelink/events")
@router.get("/events")
@router.post("/events")
async def voicelink_general_events(request: Request):
    """VoiceLink general event webhook callback (when configured in VoiceLink Bot)."""
    try:
        if request.method == "POST":
            data = await request.json()
            logger.info(f"VoiceLink general event received: {data}")
    except Exception as e:
        logger.debug(f"VoiceLink general event receive: {e}")
    return {"status": "success"}


@router.websocket("/ws")
@router.websocket("/voicelink/ws")
@router.websocket("/voicelink/inbound/ws")
@router.websocket("/inbound/ws")
async def voicelink_inbound_ws(websocket: WebSocket) -> None:
    """VoiceLink WS-only INBOUND entrypoint.

    VoiceLink uses ONE media WebSocket for both directions. Outbound calls
    connect to ``/ws/{workflow_id}/{organization_id}/{workflow_run_id}`` (the
    run is pre-created by add_lead; the middle segment is the tenant, not a
    user id — see ``ws_auth.build_media_ws_url``) via the shared dispatcher,
    which routes to ``VoiceLinkProvider.handle_websocket``. INBOUND calls
    connect here instead, to the bot URL (``/api/v1/telephony/ws`` or
    ``/api/v1/telephony/voicelink/inbound/ws``) with NO run id at all, so this
    handler reads the ``start`` event, routes by the called DID, creates the run
    itself, and runs the pipeline directly.
    """
    import asyncio

    from sqlalchemy.future import select

    from api.db.models import (
        TelephonyConfigurationModel,
        TelephonyPhoneNumberModel,
    )
    from api.enums import WorkflowRunState
    from api.routes.telephony import _create_inbound_workflow_run
    from api.services.call_concurrency import (
        CallConcurrencyLimitError,
        call_concurrency,
    )
    from api.services.pipecat.run_pipeline import run_pipeline_telephony
    from api.services.quota_service import authorize_workflow_run_start
    from api.services.telephony.base import NormalizedInboundData
    from api.services.telephony.factory import get_telephony_provider_by_id  # noqa: F401
    from api.services.workflow_run_failure import mark_workflow_run_failed
    from api.utils.telephony_address import normalize_telephony_address

    await websocket.accept()
    try:
        raw_msg = await asyncio.wait_for(websocket.receive_text(), timeout=15.0)
        logger.info(f"VoiceLink INBOUND first frame (raw): {raw_msg}")
        msg = json.loads(raw_msg)
        while msg.get("event") != "start":
            logger.info(f"VoiceLink INBOUND waiting for start, got: {msg.get('event')}")
            raw_msg = await asyncio.wait_for(websocket.receive_text(), timeout=15.0)
            logger.info(f"VoiceLink INBOUND frame (raw): {raw_msg}")
            msg = json.loads(raw_msg)
        start_msg = msg

        # Capture the real inbound frame so the DID location can be confirmed.
        logger.info(f"VoiceLink INBOUND start frame (raw): {json.dumps(start_msg)}")

        start_data = start_msg.get("start", {}) or {}
        cp = (
            start_data.get("custom_parameters")
            or start_data.get("customParameters")
            or {}
        )

        def pick(*keys):
            for src in (start_data, cp, start_msg):
                if isinstance(src, dict):
                    for k in keys:
                        v = src.get(k)
                        if v:
                            return v
            return ""

        to_raw = pick("to", "to_number", "called", "called_number", "did", "to_did")
        from_raw = pick("from", "from_number", "caller", "caller_number")
        stream_sid = pick("stream_sid", "streamSid")
        call_sid = pick("call_sid", "callSid")
        logger.info(
            f"VoiceLink INBOUND parsed: to={to_raw!r} from={from_raw!r} "
            f"stream_sid={stream_sid!r} call_sid={call_sid!r}"
        )

        match = None
        to_norm = ""
        if to_raw:
            to_norm = normalize_telephony_address(to_raw, country_hint="IN").canonical
            async with db_client.async_session() as session:
                result = await session.execute(
                    select(TelephonyConfigurationModel, TelephonyPhoneNumberModel)
                    .join(
                        TelephonyPhoneNumberModel,
                        TelephonyPhoneNumberModel.telephony_configuration_id
                        == TelephonyConfigurationModel.id,
                    )
                    .where(
                        TelephonyConfigurationModel.provider == "voicelink",
                        TelephonyPhoneNumberModel.address_normalized == to_norm,
                        TelephonyPhoneNumberModel.is_active.is_(True),
                    )
                )
                row = result.first()
            if row:
                match = (row[0], row[1])

        if not match:
            # Fallback: if no DID was in frame or not matched, check if there is a single active VoiceLink DID
            logger.warning(
                f"VoiceLink INBOUND: DID {to_raw!r} not directly matched; falling back to single active VoiceLink DID"
            )
            async with db_client.async_session() as session:
                result = await session.execute(
                    select(TelephonyConfigurationModel, TelephonyPhoneNumberModel)
                    .join(
                        TelephonyPhoneNumberModel,
                        TelephonyPhoneNumberModel.telephony_configuration_id
                        == TelephonyConfigurationModel.id,
                    )
                    .where(
                        TelephonyConfigurationModel.provider == "voicelink",
                        TelephonyPhoneNumberModel.is_active.is_(True),
                    )
                )
                rows = result.all()
            if len(rows) == 1:
                match = (rows[0][0], rows[0][1])
                to_norm = match[1].address_normalized
                logger.info(f"VoiceLink INBOUND: successfully fell back to active DID {to_norm}")
            else:
                logger.error("VoiceLink INBOUND: could not resolve inbound route")
                await websocket.close(code=4404, reason="Inbound route not found")
                return

        config, phone_row = match
        if not phone_row.inbound_workflow_id:
            logger.error(f"VoiceLink INBOUND: DID {to_norm} has no inbound_workflow_id")
            await websocket.close(code=4404, reason="No workflow for DID")
            return

        workflow_id = phone_row.inbound_workflow_id
        workflow = await db_client.get_workflow(
            workflow_id, organization_id=config.organization_id
        )
        if not workflow:
            logger.error(f"VoiceLink INBOUND: workflow {workflow_id} not found")
            await websocket.close(code=4404, reason="Workflow not found")
            return
        user_id = workflow.user_id

        from_norm = (
            normalize_telephony_address(from_raw, country_hint="IN").canonical
            if from_raw
            else ""
        )

        concurrency_slot = None
        try:
            concurrency_slot = await call_concurrency.acquire_org_slot(
                config.organization_id,
                source="inbound:voicelink",
                timeout=0,
            )
        except CallConcurrencyLimitError:
            logger.warning(
                f"VoiceLink INBOUND: concurrent call limit reached for org {config.organization_id}"
            )
            await websocket.close(code=4429, reason="Concurrent call limit reached")
            return

        normalized = NormalizedInboundData(
            provider="voicelink",
            call_id=call_sid or stream_sid or "",
            from_number=from_norm,
            to_number=to_norm,
            direction="inbound",
            call_status="ringing",
            account_id=None,
            from_country="IN",
            to_country="IN",
            raw_data=start_msg,
        )
        run_id = await _create_inbound_workflow_run(
            workflow_id,
            user_id,
            config.organization_id,
            "voicelink",
            normalized,
            telephony_configuration_id=config.id,
            from_phone_number_id=phone_row.id,
        )

        if concurrency_slot:
            await call_concurrency.bind_workflow_run(concurrency_slot, run_id)

        quota_result = await authorize_workflow_run_start(
            workflow_id=workflow_id,
            organization_id=config.organization_id,
            workflow_run_id=run_id,
        )
        if not quota_result.has_quota:
            logger.warning(
                f"VoiceLink INBOUND: quota exceeded: {quota_result.error_message}"
            )
            await mark_workflow_run_failed(
                run_id, quota_result.error_message or "Quota exceeded"
            )
            await call_concurrency.release_workflow_run_slot(run_id)
            await websocket.close(code=4402, reason="Quota exceeded")
            return

        set_current_run_id(run_id)
        await db_client.update_workflow_run(
            run_id=run_id, state=WorkflowRunState.RUNNING.value
        )
        logger.info(
            f"[run {run_id}] VoiceLink INBOUND routed DID {to_norm} -> workflow "
            f"{workflow_id}; starting pipeline"
        )
        async with transferable_call(websocket, run_id):
            await run_pipeline_telephony(
                websocket,
                provider_name="voicelink",
                workflow_id=workflow_id,
                workflow_run_id=run_id,
                organization_id=config.organization_id,
                call_id=call_sid or stream_sid or "",
                transport_kwargs={"stream_id": stream_sid, "call_id": call_sid},
            )
        logger.info(f"[run {run_id}] VoiceLink INBOUND pipeline completed")

    except WebSocketDisconnect as e:
        logger.info(f"VoiceLink INBOUND ws closed: code={e.code} reason={e.reason!r}")
    except Exception as e:
        logger.error(f"VoiceLink INBOUND ws error: {e}", exc_info=True)
        try:
            await websocket.close(1011, "Internal server error")
        except RuntimeError:
            pass


@router.websocket("/voicelink/inbound/ws")
async def voicelink_inbound_ws_alias1(websocket: WebSocket) -> None:
    await voicelink_inbound_ws(websocket)


@router.websocket("/voicelink/ws")
async def voicelink_inbound_ws_alias2(websocket: WebSocket) -> None:
    await voicelink_inbound_ws(websocket)


@router.websocket("/inbound/ws")
async def voicelink_inbound_ws_alias3(websocket: WebSocket) -> None:
    await voicelink_inbound_ws(websocket)

