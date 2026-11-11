"""TURN credentials endpoint for time-limited WebRTC authentication.

This module implements the TURN REST API credential generation as specified in
draft-uberti-behave-turn-rest-00. It generates ephemeral credentials that are
valid for a configurable TTL and are cryptographically bound to the user.

The credential format:
- Username: {expiration_timestamp}:{user_id}
- Password: base64(hmac-sha1(shared_secret, username))

References:
- https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00
- https://github.com/coturn/coturn/wiki/turnserver#turn-rest-api
"""

import base64
import hashlib
import hmac
import os
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel

from api.constants import (
    ENABLE_COTURN,
    ENVIRONMENT,
    TURN_CREDENTIAL_TTL,
    TURN_HOST,
    TURN_PORT,
    TURN_SECRET,
    TURN_TLS_PORT,
)
from api.db.models import UserModel
from api.enums import Environment
from api.services.auth.depends import get_user

router = APIRouter(prefix="/turn", tags=["turn"])


class TurnCredentialsResponse(BaseModel):
    """Response model for TURN credentials."""

    username: str
    password: str
    ttl: int
    uris: List[str]


class TurnConfigResponse(BaseModel):
    """Response model for TURN configuration status."""

    enabled: bool
    host: Optional[str] = None


def clean_turn_host(host: Optional[str]) -> str:
    """Sanitize TURN host by stripping protocols, ports, and trailing paths."""
    if not host:
        return ""
    host = host.strip()
    if "://" in host:
        host = host.split("://", 1)[1]
    host = host.split("/")[0]
    if ":" in host:
        host = host.split(":")[0]
    return host


def generate_turn_credentials(user_id: str, ttl: int = TURN_CREDENTIAL_TTL) -> dict:
    """Generate time-limited TURN credentials using HMAC-SHA1.

    Args:
        user_id: Unique identifier for the user (for auditing)
        ttl: Time-to-live in seconds for the credentials

    Returns:
        Dictionary with username, password, ttl, and TURN URIs

    Raises:
        ValueError: If TURN_SECRET is not configured
    """
    if not TURN_SECRET:
        raise ValueError("TURN_SECRET is not configured")

    # Calculate expiration timestamp
    expiration = int(time.time()) + ttl

    # Username format: {expiration}:{user_id}
    # This allows the TURN server to:
    # 1. Verify the credential hasn't expired
    # 2. Track usage per user for auditing
    username = f"{expiration}:{user_id}"

    # Password: base64(hmac-sha1(secret, username))
    # This is the standard TURN REST API algorithm
    password = base64.b64encode(
        hmac.new(
            TURN_SECRET.encode("utf-8"),
            username.encode("utf-8"),
            hashlib.sha1,
        ).digest()
    ).decode("utf-8")

    # Build TURN URIs
    # Note: aiortc only uses the FIRST valid TURN URI, so ordering matters.
    # Priority:
    #   1. TURNS (TLS) if configured - most secure
    #   2. TURN TCP for LOCAL env (macOS Docker compatibility)
    #   3. TURN UDP for production (more efficient)
    uris = []
    host = clean_turn_host(TURN_HOST)

    # Add non-TLS TURN as fallback, ordered by environment
    if ENVIRONMENT == Environment.LOCAL.value:
        uris.extend(
            [
                f"turn:{host}:{TURN_PORT}?transport=tcp",  # TCP for macOS Docker
                f"turn:{host}:{TURN_PORT}",  # UDP fallback
            ]
        )
    else:
        uris.extend(
            [
                f"turn:{host}:{TURN_PORT}",  # UDP preferred for other environments
                f"turn:{host}:{TURN_PORT}?transport=tcp",  # TCP fallback
            ]
        )

    # Add TLS URIs if TLS port is configured
    if TURN_TLS_PORT:
        uris.extend(
            [
                f"turns:{host}:{TURN_TLS_PORT}",  # TURN over TLS
                f"turns:{host}:{TURN_TLS_PORT}?transport=tcp",  # TURN over TLS+TCP
            ]
        )

    return {
        "username": username,
        "password": password,
        "ttl": ttl,
        "uris": uris,
    }


@router.get("/credentials", response_model=TurnCredentialsResponse)
async def get_turn_credentials(
    user: UserModel = Depends(get_user),
) -> TurnCredentialsResponse:
    """Get time-limited TURN credentials for WebRTC connections.

    This endpoint generates ephemeral TURN credentials that are:
    - Valid for the configured TTL (default: 24 hours)
    - Cryptographically bound to the user via HMAC
    - Compatible with coturn's use-auth-secret mode

    Returns:
        TurnCredentialsResponse with username, password, ttl, and TURN URIs
    """
    if not ENABLE_COTURN:
        logger.warning("TURN credentials requested but ENABLE_COTURN is false")
        raise HTTPException(
            status_code=503,
            detail="TURN server not configured",
        )

    if not TURN_SECRET:
        turn_username = os.getenv("TURN_USERNAME")
        turn_password = os.getenv("TURN_PASSWORD")
        host = clean_turn_host(TURN_HOST)
        if turn_username and turn_password and host:
            uris = [
                f"turn:{host}:{TURN_PORT}",
                f"turn:{host}:{TURN_PORT}?transport=tcp",
            ]
            if TURN_TLS_PORT:
                uris.extend([
                    f"turns:{host}:{TURN_TLS_PORT}",
                    f"turns:{host}:{TURN_TLS_PORT}?transport=tcp",
                ])
            logger.debug(f"Returning static TURN credentials for user {user.id}")
            return TurnCredentialsResponse(
                username=turn_username,
                password=turn_password,
                ttl=86400,
                uris=uris,
            )
        logger.warning("TURN credentials requested but neither TURN_SECRET nor TURN_USERNAME/PASSWORD configured")
        raise HTTPException(
            status_code=503,
            detail="TURN server not configured",
        )

    try:
        credentials = generate_turn_credentials(str(user.id))
        logger.debug(f"Generated TURN credentials for user {user.id}")
        return TurnCredentialsResponse(**credentials)
    except Exception as e:
        logger.error(f"Failed to generate TURN credentials: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate TURN credentials",
        )
