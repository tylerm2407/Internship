"""Supabase database client for InternshipMatch.

All database interactions go through this module. Each function that needs
user context takes a `token` parameter and creates a client authenticated
with that token. Admin/service operations use the service role client.
All Supabase calls are wrapped in try/except with structured logging.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)


# ============================================================
# Connection
# ============================================================


def get_client() -> Client:
    """Create a Supabase client using the anon key.

    Returns:
        An authenticated Supabase client instance.

    Raises:
        ValueError: If required environment variables are not set.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    return create_client(url, key)


def get_service_client() -> Client:
    """Create a Supabase client using the service role key for admin ops.

    Returns:
        A service-role Supabase client instance.

    Raises:
        ValueError: If required environment variables are not set.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(url, key)


def _get_user_client(token: str) -> Client:
    """Create a Supabase client authenticated with a user's JWT token.

    Args:
        token: The user's JWT bearer token.

    Returns:
        A Supabase client with the user's auth context set.

    Raises:
        ValueError: If required environment variables are not set.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    client = create_client(url, key)
    client.postgrest.auth(token)
    return client


# ============================================================
# Firms & Postings (read-only for users)
# ============================================================


def get_all_firms() -> list[Any]:
    """Fetch all firms from the registry, ordered by name.

    Returns:
        List of firm data dicts.
    """
    try:
        client = get_service_client()
        result = client.table("firms").select("*").order("name").execute()
        return result.data
    except Exception as e:
        logger.error("db.firms.get_all.failed", extra={"error": str(e)})
        raise


def get_firm_by_id(firm_id: str) -> Any:
    """Fetch a single firm by ID.

    Args:
        firm_id: The firm's UUID as a string.

    Returns:
        Firm data dict if found, None otherwise.
    """
    try:
        client = get_service_client()
        result = client.table("firms").select("*").eq("id", firm_id).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("db.firms.get_by_id.failed", extra={"firm_id": firm_id, "error": str(e)})
        raise


def get_open_postings() -> list[Any]:
    """Fetch all open (non-closed) postings across all firms.

    Returns:
        List of posting data dicts.
    """
    try:
        client = get_service_client()
        result = (
            client.table("postings")
            .select("*")
            .is_("closed_at", "null")
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.postings.get_open.failed", extra={"error": str(e)})
        raise


def get_postings_by_firm(firm_id: str) -> list[Any]:
    """Fetch all postings for a specific firm.

    Args:
        firm_id: The firm's UUID as a string.

    Returns:
        List of posting data dicts ordered by posted_at descending.
    """
    try:
        client = get_service_client()
        result = (
            client.table("postings")
            .select("*")
            .eq("firm_id", firm_id)
            .is_("closed_at", "null")
            .order("posted_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.postings.get_by_firm.failed", extra={"firm_id": firm_id, "error": str(e)})
        raise


def bulk_insert_firms(firms: list[dict]) -> None:
    """Insert multiple firms at once using the service role client.

    Args:
        firms: List of firm data dicts matching the firms table schema.
    """
    try:
        client = get_service_client()
        client.table("firms").upsert(firms, on_conflict="id").execute()
        logger.info("db.firms.bulk_inserted", extra={"count": len(firms)})
    except Exception as e:
        logger.error("db.firms.bulk_insert.failed", extra={"count": len(firms), "error": str(e)})
        raise


def bulk_insert_postings(postings: list[dict]) -> None:
    """Insert multiple postings at once using the service role client.

    Args:
        postings: List of posting data dicts matching the postings table schema.
    """
    try:
        client = get_service_client()
        client.table("postings").upsert(postings, on_conflict="id").execute()
        logger.info("db.postings.bulk_inserted", extra={"count": len(postings)})
    except Exception as e:
        logger.error("db.postings.bulk_insert.failed", extra={"count": len(postings), "error": str(e)})
        raise


# ============================================================
# Student Profiles
# ============================================================


def get_profile(user_id: str, token: str) -> Any:
    """Fetch the student profile for a user.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        Profile data dict if found, None otherwise.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("student_profiles")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("db.profile.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def upsert_profile(profile_data: dict, token: str) -> Any:
    """Insert or update a student profile.

    Args:
        profile_data: The profile data dict to upsert.
        token: The user's JWT bearer token.

    Returns:
        The upserted profile data dict.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("student_profiles")
            .upsert(profile_data, on_conflict="user_id")
            .execute()
        )
        logger.info("db.profile.upserted", extra={"user_id": profile_data.get("user_id")})
        if result.data:
            return result.data[0]
        return profile_data
    except Exception as e:
        logger.error("db.profile.upsert.failed", extra={"user_id": profile_data.get("user_id"), "error": str(e)})
        raise


# ============================================================
# Fit Scores
# ============================================================


def get_fit_scores(user_id: str, token: str) -> list[Any]:
    """Fetch cached fit scores for a user within the 24-hour TTL.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of fit score data dicts ordered by score descending.
    """
    try:
        client = _get_user_client(token)
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        result = (
            client.table("fit_scores")
            .select("*")
            .eq("user_id", user_id)
            .gte("computed_at", cutoff)
            .order("score", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.fit_scores.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def upsert_fit_scores(scores: list[dict], token: str) -> None:
    """Batch upsert fit scores.

    Args:
        scores: List of fit score data dicts to upsert.
        token: The user's JWT bearer token.
    """
    if not scores:
        return
    try:
        client = _get_user_client(token)
        client.table("fit_scores").upsert(scores, on_conflict="user_id,posting_id").execute()
        logger.info("db.fit_scores.upserted", extra={"count": len(scores)})
    except Exception as e:
        logger.error("db.fit_scores.upsert.failed", extra={"count": len(scores), "error": str(e)})
        raise


# ============================================================
# Applications
# ============================================================


def get_applications(user_id: str, token: str) -> list[Any]:
    """Fetch all applications for a user.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of application data dicts ordered by updated_at descending.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("applications")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.applications.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def create_application(app_data: dict, token: str) -> Any:
    """Create a new application.

    Args:
        app_data: The application data dict.
        token: The user's JWT bearer token.

    Returns:
        The created application data dict.
    """
    try:
        client = _get_user_client(token)
        result = client.table("applications").insert(app_data).execute()
        logger.info("db.application.created", extra={"user_id": app_data.get("user_id"), "firm_id": app_data.get("firm_id")})
        if result.data:
            return result.data[0]
        return app_data
    except Exception as e:
        logger.error("db.application.create.failed", extra={"error": str(e)})
        raise


def update_application(app_id: str, updates: dict, token: str) -> Any:
    """Update an existing application.

    Args:
        app_id: The application's UUID as a string.
        updates: Dictionary of fields to update.
        token: The user's JWT bearer token.

    Returns:
        The updated application data dict.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("applications")
            .update(updates)
            .eq("id", app_id)
            .execute()
        )
        logger.info("db.application.updated", extra={"app_id": app_id})
        if result.data:
            return result.data[0]
        return updates
    except Exception as e:
        logger.error("db.application.update.failed", extra={"app_id": app_id, "error": str(e)})
        raise


def insert_status_change(change_data: dict, token: str) -> None:
    """Insert a status change audit trail entry.

    Args:
        change_data: The status change data dict.
        token: The user's JWT bearer token.
    """
    try:
        client = _get_user_client(token)
        client.table("status_changes").insert(change_data).execute()
        logger.info("db.status_change.inserted", extra={"application_id": change_data.get("application_id")})
    except Exception as e:
        logger.error("db.status_change.insert.failed", extra={"error": str(e)})
        raise


# ============================================================
# Alumni & Networking
# ============================================================


def get_alumni_by_firm(firm_id: str, token: str) -> list[Any]:
    """Fetch alumni at a specific firm.

    Args:
        firm_id: The firm's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of alumni data dicts.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("alumni")
            .select("*")
            .eq("firm_id", firm_id)
            .order("graduation_year", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.alumni.get_by_firm.failed", extra={"firm_id": firm_id, "error": str(e)})
        raise


def get_all_alumni(token: str) -> list[Any]:
    """Fetch all alumni records.

    Args:
        token: The user's JWT bearer token.

    Returns:
        List of all alumni data dicts.
    """
    try:
        client = _get_user_client(token)
        result = client.table("alumni").select("*").order("name").execute()
        return result.data
    except Exception as e:
        logger.error("db.alumni.get_all.failed", extra={"error": str(e)})
        raise


def get_networking_contacts(user_id: str, token: str) -> list[Any]:
    """Fetch all networking contacts for a user.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of networking contact data dicts ordered by updated_at descending.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("networking_contacts")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.networking_contacts.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def create_networking_contact(contact_data: dict, token: str) -> Any:
    """Create a new networking contact.

    Args:
        contact_data: The contact data dict.
        token: The user's JWT bearer token.

    Returns:
        The created contact data dict.
    """
    try:
        client = _get_user_client(token)
        result = client.table("networking_contacts").insert(contact_data).execute()
        logger.info("db.networking_contact.created", extra={"user_id": contact_data.get("user_id")})
        if result.data:
            return result.data[0]
        return contact_data
    except Exception as e:
        logger.error("db.networking_contact.create.failed", extra={"error": str(e)})
        raise


def update_networking_contact(contact_id: str, updates: dict, token: str) -> Any:
    """Update an existing networking contact.

    Args:
        contact_id: The contact's UUID as a string.
        updates: Dictionary of fields to update.
        token: The user's JWT bearer token.

    Returns:
        The updated contact data dict.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("networking_contacts")
            .update(updates)
            .eq("id", contact_id)
            .execute()
        )
        logger.info("db.networking_contact.updated", extra={"contact_id": contact_id})
        if result.data:
            return result.data[0]
        return updates
    except Exception as e:
        logger.error("db.networking_contact.update.failed", extra={"contact_id": contact_id, "error": str(e)})
        raise


# ============================================================
# Prep
# ============================================================


def get_prep_sessions(user_id: str, token: str) -> list[Any]:
    """Fetch all prep sessions for a user.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of prep session data dicts ordered by created_at descending.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("prep_sessions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.prep_sessions.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def create_prep_session(session_data: dict, token: str) -> Any:
    """Create a new prep session.

    Args:
        session_data: The session data dict.
        token: The user's JWT bearer token.

    Returns:
        The created session data dict.
    """
    try:
        client = _get_user_client(token)
        result = client.table("prep_sessions").insert(session_data).execute()
        logger.info("db.prep_session.created", extra={"user_id": session_data.get("user_id")})
        if result.data:
            return result.data[0]
        return session_data
    except Exception as e:
        logger.error("db.prep_session.create.failed", extra={"error": str(e)})
        raise


def update_prep_session(session_id: str, updates: dict, token: str) -> Any:
    """Update an existing prep session.

    Args:
        session_id: The session's UUID as a string.
        updates: Dictionary of fields to update.
        token: The user's JWT bearer token.

    Returns:
        The updated session data dict.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("prep_sessions")
            .update(updates)
            .eq("id", session_id)
            .execute()
        )
        logger.info("db.prep_session.updated", extra={"session_id": session_id})
        if result.data:
            return result.data[0]
        return updates
    except Exception as e:
        logger.error("db.prep_session.update.failed", extra={"session_id": session_id, "error": str(e)})
        raise


def create_prep_answer(answer_data: dict, token: str) -> Any:
    """Create a new prep answer record.

    Args:
        answer_data: The answer data dict.
        token: The user's JWT bearer token.

    Returns:
        The created answer data dict.
    """
    try:
        client = _get_user_client(token)
        result = client.table("prep_answers").insert(answer_data).execute()
        logger.info("db.prep_answer.created", extra={"session_id": answer_data.get("session_id")})
        if result.data:
            return result.data[0]
        return answer_data
    except Exception as e:
        logger.error("db.prep_answer.create.failed", extra={"error": str(e)})
        raise


def get_readiness_scores(user_id: str, token: str) -> list[Any]:
    """Fetch readiness scores for a user across all categories.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of readiness score data dicts.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("readiness_scores")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.readiness_scores.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def upsert_readiness_score(score_data: dict, token: str) -> None:
    """Insert or update a readiness score for a user/category pair.

    Args:
        score_data: The readiness score data dict.
        token: The user's JWT bearer token.
    """
    try:
        client = _get_user_client(token)
        client.table("readiness_scores").upsert(score_data, on_conflict="user_id,category").execute()
        logger.info(
            "db.readiness_score.upserted",
            extra={"user_id": score_data.get("user_id"), "category": score_data.get("category")},
        )
    except Exception as e:
        logger.error("db.readiness_score.upsert.failed", extra={"error": str(e)})
        raise


# ============================================================
# Timeline
# ============================================================


def get_timeline_events(user_id: str, token: str, upcoming_only: bool = False) -> list[Any]:
    """Fetch timeline events for a user.

    Args:
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.
        upcoming_only: If True, only return events with event_date >= now.

    Returns:
        List of timeline event data dicts ordered by event_date ascending.
    """
    try:
        client = _get_user_client(token)
        query = (
            client.table("timeline_events")
            .select("*")
            .eq("user_id", user_id)
        )
        if upcoming_only:
            now = datetime.now(timezone.utc).isoformat()
            query = query.gte("event_date", now)
        result = query.order("event_date").execute()
        return result.data
    except Exception as e:
        logger.error("db.timeline_events.get.failed", extra={"user_id": user_id, "error": str(e)})
        raise


def create_timeline_event(event_data: dict, token: str) -> Any:
    """Create a new timeline event.

    Args:
        event_data: The event data dict.
        token: The user's JWT bearer token.

    Returns:
        The created event data dict.
    """
    try:
        client = _get_user_client(token)
        result = client.table("timeline_events").insert(event_data).execute()
        logger.info("db.timeline_event.created", extra={"user_id": event_data.get("user_id")})
        if result.data:
            return result.data[0]
        return event_data
    except Exception as e:
        logger.error("db.timeline_event.create.failed", extra={"error": str(e)})
        raise


def update_timeline_event(event_id: str, updates: dict, token: str) -> Any:
    """Update an existing timeline event.

    Args:
        event_id: The event's UUID as a string.
        updates: Dictionary of fields to update.
        token: The user's JWT bearer token.

    Returns:
        The updated event data dict.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("timeline_events")
            .update(updates)
            .eq("id", event_id)
            .execute()
        )
        logger.info("db.timeline_event.updated", extra={"event_id": event_id})
        if result.data:
            return result.data[0]
        return updates
    except Exception as e:
        logger.error("db.timeline_event.update.failed", extra={"event_id": event_id, "error": str(e)})
        raise


def delete_timeline_event(event_id: str, token: str) -> None:
    """Delete a timeline event.

    Args:
        event_id: The event's UUID as a string.
        token: The user's JWT bearer token.
    """
    try:
        client = _get_user_client(token)
        client.table("timeline_events").delete().eq("id", event_id).execute()
        logger.info("db.timeline_event.deleted", extra={"event_id": event_id})
    except Exception as e:
        logger.error("db.timeline_event.delete.failed", extra={"event_id": event_id, "error": str(e)})
        raise


# ============================================================
# Utility — counts for health check
# ============================================================


def count_firms() -> int:
    """Count total firms in the registry.

    Returns:
        Number of firms.
    """
    client = get_service_client()
    result = client.table("firms").select("id", count="exact").execute()  # type: ignore[arg-type]
    return result.count or 0


def count_postings() -> int:
    """Count total open postings.

    Returns:
        Number of open postings.
    """
    client = get_service_client()
    result = (
        client.table("postings")
        .select("id", count="exact")  # type: ignore[arg-type]
        .is_("closed_at", "null")
        .execute()
    )
    return result.count or 0
