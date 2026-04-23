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


_anon_client: Client | None = None
_service_client: Client | None = None


def get_client() -> Client:
    """Return the shared Supabase client using the anon key.

    Uses a module-level singleton to avoid creating a new TCP connection
    on every call. The client is lazily initialized on first use.

    Returns:
        An authenticated Supabase client instance.

    Raises:
        ValueError: If required environment variables are not set.
    """
    global _anon_client
    if _anon_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
        _anon_client = create_client(url, key)
    return _anon_client


def get_service_client() -> Client:
    """Return the shared Supabase client using the service role key for admin ops.

    Uses a module-level singleton to avoid creating a new TCP connection
    on every call. The client is lazily initialized on first use.

    Returns:
        A service-role Supabase client instance.

    Raises:
        ValueError: If required environment variables are not set.
    """
    global _service_client
    if _service_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _service_client = create_client(url, key)
    return _service_client


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


def get_posting_by_id(posting_id: str) -> dict | None:
    """Fetch a single posting by its UUID.

    Args:
        posting_id: The posting's UUID as a string.

    Returns:
        Posting data dict, or None if not found.
    """
    try:
        client = get_service_client()
        result = (
            client.table("postings")
            .select("*")
            .eq("id", posting_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("db.postings.get_by_id.failed", extra={"posting_id": posting_id, "error": str(e)})
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


def search_alumni(
    token: str,
    school: str | None = None,
    company: str | None = None,
    name: str | None = None,
    graduation_year: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Any], int]:
    """Search alumni with case-insensitive partial matching.

    Args:
        token: The user's JWT bearer token.
        school: Partial school name filter.
        company: Partial company name filter (matches current_company).
        name: Partial name filter.
        graduation_year: Exact graduation year filter.
        limit: Max results to return.
        offset: Number of results to skip.

    Returns:
        Tuple of (alumni list, total count).
    """
    try:
        client = _get_user_client(token)
        query = client.table("alumni").select("*", count="exact")

        if school:
            query = query.ilike("school", f"%{school}%")
        if company:
            query = query.ilike("current_company", f"%{company}%")
        if name:
            query = query.ilike("name", f"%{name}%")
        if graduation_year:
            query = query.eq("graduation_year", graduation_year)

        result = (
            query
            .order("name")
            .range(offset, offset + limit - 1)
            .execute()
        )

        logger.info("db.alumni.search", extra={
            "school": school, "company": company, "name": name,
            "results": len(result.data), "total": result.count,
        })
        return result.data, result.count or 0
    except Exception as e:
        logger.error("db.alumni.search.failed", extra={"error": str(e)})
        raise


def bulk_insert_alumni(alumni_rows: list[dict], token: str) -> int:
    """Bulk insert alumni records, deduplicating by name + school + graduation_year.

    Uses the service client for upsert. Sets added_by from the token user.

    Args:
        alumni_rows: List of alumni data dicts to insert.
        token: The user's JWT bearer token (used for added_by context).

    Returns:
        Number of rows successfully inserted.
    """
    if not alumni_rows:
        return 0
    try:
        client = get_service_client()
        result = client.table("alumni").upsert(
            alumni_rows,
            on_conflict="name,school,graduation_year",
        ).execute()
        count = len(result.data) if result.data else 0
        logger.info("db.alumni.bulk_inserted", extra={"count": count})
        return count
    except Exception as e:
        logger.error("db.alumni.bulk_insert.failed", extra={"count": len(alumni_rows), "error": str(e)})
        raise


def insert_alumnus(alumnus_data: dict, token: str) -> Any:
    """Insert a single alumnus record.

    Args:
        alumnus_data: The alumnus data dict.
        token: The user's JWT bearer token.

    Returns:
        The created alumnus data dict.
    """
    try:
        client = _get_user_client(token)
        result = client.table("alumni").insert(alumnus_data).execute()
        logger.info("db.alumnus.created", extra={"name": alumnus_data.get("name")})
        if result.data:
            return result.data[0]
        return alumnus_data
    except Exception as e:
        logger.error("db.alumnus.create.failed", extra={"error": str(e)})
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


def get_session_answers(session_id: str, user_id: str, token: str) -> list[Any]:
    """Fetch all answers for a specific prep session owned by the user.

    Args:
        session_id: The session's UUID as a string.
        user_id: The user's UUID as a string.
        token: The user's JWT bearer token.

    Returns:
        List of prep answer data dicts ordered by creation time.
    """
    try:
        client = _get_user_client(token)
        result = (
            client.table("prep_answers")
            .select("*")
            .eq("session_id", session_id)
            .eq("user_id", user_id)
            .order("created_at")
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.session_answers.fetch.failed", extra={"error": str(e), "session_id": session_id})
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
# Audit Logging
# ============================================================


def log_audit_event(
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    ip_address: str | None = None,
    institution_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Write an entry to the audit_log table.

    Args:
        user_id: The acting user's UUID (nullable for system events).
        action: The action performed, e.g. 'profile.read', 'user.delete'.
        resource_type: The type of resource affected, e.g. 'student_profile'.
        resource_id: The ID of the affected resource.
        ip_address: The request IP address.
        institution_id: The institution context if applicable.
        metadata: Additional JSON metadata.
    """
    try:
        from uuid import uuid4
        client = get_service_client()
        entry = {
            "id": str(uuid4()),
            "user_id": user_id,
            "institution_id": institution_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        client.table("audit_log").insert(entry).execute()
        logger.info("audit.logged", extra={"action": action, "user_id": user_id})
    except Exception as e:
        # Audit logging should never break the request
        logger.warning("audit.log_failed", extra={"action": action, "error": str(e)})


# ============================================================
# User Data Deletion
# ============================================================


def delete_all_user_data(user_id: str) -> dict:
    """Cascade-delete all data for a user across all tables.

    Uses the service role client to ensure access to all tables.
    Deletes in dependency order to respect foreign key constraints.

    Args:
        user_id: The user's UUID as a string.

    Returns:
        Dictionary with counts of deleted rows per table.
    """
    client = get_service_client()
    counts: dict[str, int] = {}

    tables_to_clear = [
        "prep_answers",
        "prep_sessions",
        "readiness_scores",
        "networking_contacts",
        "status_changes",
        "fit_scores",
        "applications",
        "timeline_events",
        "student_profiles",
    ]

    for table in tables_to_clear:
        try:
            result = client.table(table).delete().eq("user_id", user_id).execute()
            counts[table] = len(result.data) if result.data else 0
        except Exception as e:
            logger.warning(f"delete_user.{table}.failed", extra={"user_id": user_id, "error": str(e)})
            counts[table] = 0

    # Delete user row last
    try:
        result = client.table("users").delete().eq("id", user_id).execute()
        counts["users"] = len(result.data) if result.data else 0
    except Exception as e:
        logger.warning("delete_user.users.failed", extra={"user_id": user_id, "error": str(e)})
        counts["users"] = 0

    logger.info("delete_user.completed", extra={"user_id": user_id, "counts": counts})
    return counts


# ============================================================
# Admin Queries
# ============================================================


def get_users_by_institution(institution_id: str) -> list[Any]:
    """Fetch all users belonging to an institution.

    Args:
        institution_id: The institution's UUID as a string.

    Returns:
        List of user data dicts (email, school, role, created_at — no sensitive data).
    """
    try:
        client = get_service_client()
        result = (
            client.table("users")
            .select("id,email,school,graduation_year,current_class_year,role,created_at")
            .eq("institution_id", institution_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error("db.admin.users.failed", extra={"institution_id": institution_id, "error": str(e)})
        raise


def get_institution_stats(institution_id: str) -> dict:
    """Compute usage statistics for an institution.

    Args:
        institution_id: The institution's UUID as a string.

    Returns:
        Dictionary with user counts, profile counts, application counts, and prep session counts.
    """
    client = get_service_client()

    users = (
        client.table("users")
        .select("id", count="exact")
        .eq("institution_id", institution_id)
        .execute()
    )
    user_count = users.count or 0

    # Get user IDs for this institution to query related tables
    user_rows = (
        client.table("users")
        .select("id")
        .eq("institution_id", institution_id)
        .execute()
    )
    user_ids = [u["id"] for u in (user_rows.data or [])]

    profile_count = 0
    application_count = 0
    prep_session_count = 0

    if user_ids:
        for uid in user_ids:
            try:
                profiles = client.table("student_profiles").select("user_id", count="exact").eq("user_id", uid).execute()
                profile_count += profiles.count or 0
            except Exception:
                pass
            try:
                apps = client.table("applications").select("id", count="exact").eq("user_id", uid).execute()
                application_count += apps.count or 0
            except Exception:
                pass
            try:
                sessions = client.table("prep_sessions").select("id", count="exact").eq("user_id", uid).execute()
                prep_session_count += sessions.count or 0
            except Exception:
                pass

    return {
        "total_users": user_count,
        "profiles_created": profile_count,
        "applications_tracked": application_count,
        "prep_sessions_completed": prep_session_count,
    }


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
