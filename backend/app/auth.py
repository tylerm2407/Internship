"""Supabase Auth middleware for InternshipMatch.

Extracts and validates JWT tokens from the Authorization header using
Supabase's GoTrue service. Used by FastAPI route dependencies to
authenticate requests.
"""

from __future__ import annotations

import logging
import os
from uuid import UUID

from dotenv import load_dotenv
from fastapi import HTTPException, Request
from supabase import create_client

load_dotenv()

logger = logging.getLogger(__name__)


async def get_current_user_id(request: Request) -> UUID:
    """Extract and validate the current user's ID from the request.

    Reads the Authorization header, verifies the JWT with Supabase,
    and returns the user's UUID.

    Args:
        request: The incoming FastAPI request.

    Returns:
        The authenticated user's UUID.

    Raises:
        HTTPException: 401 if the token is missing or invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.removeprefix("Bearer ").strip()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")

    try:
        client = create_client(url, key)
        user_response = client.auth.get_user(token)
        if user_response and user_response.user:
            return UUID(user_response.user.id)
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.warning("auth.validation_failed", extra={"error": str(e)})
        raise HTTPException(status_code=401, detail="Authentication failed")
