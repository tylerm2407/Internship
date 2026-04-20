"""Admin endpoints for InternshipMatch.

Provides institution-scoped admin views: user listing, usage stats,
and anonymized data export. All endpoints require `institution_admin` role.
"""

from __future__ import annotations

import csv
import io
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app import db
from app.auth import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _get_admin_context(user_id: UUID) -> dict:
    """Verify the user has institution_admin role and return their context.

    Args:
        user_id: The authenticated user's UUID.

    Returns:
        Dict with user row including institution_id and role.

    Raises:
        HTTPException: 403 if user is not an institution_admin.
        HTTPException: 404 if user not found.
    """
    client = db.get_service_client()
    result = (
        client.table("users")
        .select("id,role,institution_id")
        .eq("id", str(user_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    if user.get("role") not in ("admin", "institution_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    if not user.get("institution_id"):
        raise HTTPException(status_code=403, detail="No institution associated with this account")

    return user


@router.get("/users")
async def list_institution_users(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """List all users at the admin's institution.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with users list.
    """
    admin = _get_admin_context(user_id)
    users = db.get_users_by_institution(admin["institution_id"])

    db.log_audit_event(
        user_id=str(user_id),
        action="admin.users.list",
        resource_type="institution",
        resource_id=admin["institution_id"],
        ip_address=request.client.host if request.client else None,
    )

    return {"users": users, "total": len(users)}


@router.get("/stats")
async def get_institution_stats(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return usage statistics for the admin's institution.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with usage stats.
    """
    admin = _get_admin_context(user_id)
    stats = db.get_institution_stats(admin["institution_id"])

    db.log_audit_event(
        user_id=str(user_id),
        action="admin.stats.view",
        resource_type="institution",
        resource_id=admin["institution_id"],
        ip_address=request.client.host if request.client else None,
    )

    return {"institution_id": admin["institution_id"], "stats": stats}


@router.get("/export")
async def export_institution_data(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Export anonymized usage data as CSV for the admin's institution.

    Anonymizes by replacing email with a hash and omitting personal
    profile details. Returns CSV as a string for the frontend to download.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with csv_data string and row count.
    """
    import hashlib

    admin = _get_admin_context(user_id)
    users = db.get_users_by_institution(admin["institution_id"])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["user_hash", "school", "class_year", "created_at"])

    for user in users:
        email_hash = hashlib.sha256(
            user.get("email", "").encode()
        ).hexdigest()[:12]
        writer.writerow([
            email_hash,
            user.get("school", ""),
            user.get("current_class_year", ""),
            user.get("created_at", ""),
        ])

    db.log_audit_event(
        user_id=str(user_id),
        action="admin.export",
        resource_type="institution",
        resource_id=admin["institution_id"],
        ip_address=request.client.host if request.client else None,
        metadata={"rows": len(users)},
    )

    return {"csv_data": output.getvalue(), "rows": len(users)}
