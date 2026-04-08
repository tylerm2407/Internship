"""FastAPI application for InternshipMatch.

Full API with all route groups: health, resume, opportunities, applications,
alumni/networking, prep, and timeline. Uses Supabase Auth via dependency
injection for all authenticated routes.
"""

from __future__ import annotations

import logging
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.auth import get_current_user_id
from app.fit_scorer import apply_qualitative_pass, compute_tier, score_all_postings
from app.models import (
    Application,
    ApplicationCreate,
    ApplicationUpdate,
    Firm,
    FitScore,
    NetworkingContactCreate,
    OpportunityResponse,
    OutreachDraftRequest,
    OutreachDraftResponse,
    Posting,
    PrepAnswerSubmit,
    PrepSessionStart,
    StudentProfile,
    TimelineEvent,
    TimelineEventCreate,
    WeeklySummary,
)
from app.resume_parser import parse_resume_pdf

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def _extract_token(request: Request) -> str:
    """Extract the raw JWT token from the Authorization header.

    Args:
        request: The incoming FastAPI request.

    Returns:
        The raw JWT token string.

    Raises:
        HTTPException: 401 if the header is missing or malformed.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return auth_header.removeprefix("Bearer ").strip()


# --- Lifespan ---


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify Supabase connectivity at startup."""
    try:
        firm_count = db.count_firms()
        posting_count = db.count_postings()
        logger.info(
            "startup.supabase_connected",
            extra={"firms": firm_count, "postings": posting_count},
        )
        if firm_count == 0:
            logger.warning("startup.no_firms_loaded — run seed/load_seed.py first")
    except Exception as e:
        logger.error("startup.supabase_unreachable", extra={"error": str(e)})
        raise RuntimeError(f"Cannot connect to Supabase: {e}")
    yield


# --- App ---


app = FastAPI(
    title="InternshipMatch API",
    description="AI recruiting agent for business school students targeting finance internships.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# HEALTH
# ================================================================


@app.get("/api/health")
async def health() -> dict:
    """Health check with data layer status.

    Returns:
        Dictionary with status, version, firm/posting counts, and API config status.
    """
    try:
        firm_count = db.count_firms()
        posting_count = db.count_postings()
        anthropic_status = "configured" if os.getenv("ANTHROPIC_API_KEY") else "missing"

        return {
            "status": "ok",
            "version": "0.2.0",
            "firms_loaded": firm_count,
            "postings_loaded": posting_count,
            "anthropic_api": anthropic_status,
        }
    except Exception as e:
        logger.error("health.check_failed", extra={"error": str(e)})
        return {
            "status": "degraded",
            "version": "0.2.0",
            "error": str(e),
        }


# ================================================================
# RESUME
# ================================================================


@app.post("/api/resume/upload")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Parse an uploaded resume PDF via Claude Vision.

    Returns the parsed StudentProfile for user review. Does NOT save
    to the database. The user must call POST /api/resume/confirm after
    reviewing and editing the parsed fields.

    Args:
        request: The incoming request.
        file: The uploaded PDF file.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with parsed_profile and a review message.

    Raises:
        HTTPException: 422 if the file is not a PDF or is too large.
    """
    logger.info("resume.upload.started", extra={"user_id": str(user_id)})

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted")

    try:
        pdf_bytes = await file.read()
        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="File too large (max 10MB)")

        profile = parse_resume_pdf(pdf_bytes, user_id)

        logger.info("resume.upload.parsed", extra={"user_id": str(user_id)})
        return {
            "parsed_profile": profile.model_dump(mode="json"),
            "message": "Profile parsed successfully. Review all fields before saving.",
        }

    except ValueError as e:
        logger.error("resume.upload.parse_failed", extra={"user_id": str(user_id), "error": str(e)})
        raise HTTPException(status_code=422, detail=f"Failed to parse resume: {e}")
    except HTTPException:
        raise
    except Exception:
        logger.error("resume.upload.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="An unexpected error occurred while parsing the resume")


@app.post("/api/resume/confirm", status_code=201)
async def confirm_resume(
    profile: StudentProfile,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Save a reviewed and confirmed StudentProfile to the database.

    Called after the user reviews and edits the parsed profile from
    POST /api/resume/upload.

    Args:
        profile: The confirmed StudentProfile.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with saved profile and confirmation message.
    """
    if profile.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot save a profile for another user")

    try:
        token = _extract_token(request)
        profile.last_updated = datetime.now(timezone.utc)
        profile_data = profile.model_dump(mode="json")
        saved = db.upsert_profile(profile_data, token)

        logger.info("resume.confirm.saved", extra={"user_id": str(user_id)})
        return {
            "profile": saved,
            "message": "Profile saved successfully.",
        }

    except HTTPException:
        raise
    except Exception:
        logger.error("resume.confirm.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to save profile")


@app.get("/api/resume")
async def get_resume(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return the current user's saved StudentProfile.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the user's profile.

    Raises:
        HTTPException: 404 if no profile exists.
    """
    try:
        token = _extract_token(request)
        profile = db.get_profile(str(user_id), token)
        if profile is None:
            raise HTTPException(status_code=404, detail="No profile found. Upload a resume first.")

        return {"profile": profile}

    except HTTPException:
        raise
    except Exception:
        logger.error("resume.get.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")


# ================================================================
# OPPORTUNITIES
# ================================================================


@app.get("/api/opportunities")
async def get_opportunities(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    limit: int = Query(default=30, ge=1, le=100),
    min_score: int = Query(default=0, ge=0, le=100),
    role_type: str | None = Query(default=None),
) -> dict:
    """Return ranked opportunities with fit scores for the current user.

    Loads the user's profile, scores all postings deterministically,
    runs Claude's qualitative pass on the top 30, and returns results
    sorted by final score descending. Results are cached for 24 hours.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).
        limit: Max number of opportunities to return (1-100, default 30).
        min_score: Minimum fit score filter (0-100, default 0).
        role_type: Optional filter by role type.

    Returns:
        Dictionary with opportunities list, total_evaluated, and scoring metadata.
    """
    token = _extract_token(request)
    logger.info("opportunities.requested", extra={"user_id": str(user_id), "limit": limit, "min_score": min_score})

    # Load profile
    profile_data = db.get_profile(str(user_id), token)
    if profile_data is None:
        raise HTTPException(
            status_code=404,
            detail="No profile found. Upload and save your resume first.",
        )
    profile = StudentProfile(**profile_data)

    # Determine class year from the users table or profile
    user_class_year = profile_data.get("current_class_year", "sophomore")

    # Check for cached scores
    try:
        cached_scores = db.get_fit_scores(str(user_id), token)
    except Exception:
        cached_scores = []

    if cached_scores:
        opportunities = []
        for score_data in cached_scores:
            if score_data["score"] < min_score:
                continue

            posting_data = db.get_firm_by_id(score_data.get("posting_id", ""))
            # Fetch actual posting
            try:
                svc = db.get_service_client()
                posting_result = svc.table("postings").select("*").eq("id", score_data["posting_id"]).execute()
                if not posting_result.data or posting_result.data[0].get("closed_at") is not None:  # type: ignore[union-attr]
                    continue
                p_data: dict = posting_result.data[0]  # type: ignore[assignment]

                if role_type and p_data.get("role_type") != role_type:
                    continue

                firm_data = db.get_firm_by_id(str(p_data["firm_id"]))
                if firm_data is None:
                    continue

                opportunities.append({
                    "posting": p_data,
                    "firm": firm_data,
                    "fit_score": score_data,
                })
            except Exception:
                continue

        if opportunities:
            opportunities.sort(key=lambda o: o["fit_score"]["score"], reverse=True)
            return {
                "opportunities": opportunities[:limit],
                "total_evaluated": len(cached_scores),
                "from_cache": True,
                "scoring_completed_at": cached_scores[0].get("computed_at") if cached_scores else None,
            }

    # No valid cache — compute fresh scores
    try:
        firms_data = db.get_all_firms()
        postings_data = db.get_open_postings()
    except Exception as e:
        logger.error("opportunities.data_load.error", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to load firms and postings")

    firms = [Firm(**f) for f in firms_data]
    postings = [Posting(**p) for p in postings_data]

    if role_type:
        postings = [p for p in postings if p.role_type == role_type]

    firms_map = {f.id: f for f in firms}

    # Phase 1: deterministic scoring
    scored = score_all_postings(profile, postings, firms_map, user_class_year)
    total_evaluated = len(scored)

    if not scored:
        return {
            "opportunities": [],
            "total_evaluated": 0,
            "from_cache": False,
            "scoring_completed_at": datetime.now(timezone.utc).isoformat(),
        }

    # Phase 2: Claude qualitative pass on top 30
    try:
        fit_scores = apply_qualitative_pass(profile, scored, limit=min(30, len(scored)))
    except Exception as e:
        logger.error("opportunities.qualitative_pass.error", extra={"error": str(e)})
        fit_scores = []
        for posting, firm, base_score in scored[:30]:
            tier = compute_tier(base_score)
            fit_scores.append(
                FitScore(
                    user_id=user_id,
                    posting_id=posting.id,
                    score=base_score,
                    tier=tier,
                    rationale=f"Base score {base_score}/100. Qualitative review unavailable.",
                    strengths=["Deterministic scoring completed"],
                    gaps=["Qualitative review could not be completed"],
                    computed_at=datetime.now(timezone.utc),
                )
            )

    # Cache scores
    try:
        scores_to_cache = [fs.model_dump(mode="json") for fs in fit_scores]
        db.upsert_fit_scores(scores_to_cache, token)
    except Exception as e:
        logger.warning("opportunities.cache_write.error", extra={"error": str(e)})

    # Build response
    posting_firm_map = {p.id: firms_map.get(p.firm_id) for p, _, _ in scored}
    opportunities = []
    for fs in fit_scores:
        if fs.score < min_score:
            continue

        posting = next((p for p, _, _ in scored if p.id == fs.posting_id), None)
        if posting is None:
            continue
        firm = posting_firm_map.get(posting.id)
        if firm is None:
            continue

        opportunities.append({
            "posting": posting.model_dump(mode="json"),
            "firm": firm.model_dump(mode="json"),
            "fit_score": fs.model_dump(mode="json"),
        })

    opportunities.sort(key=lambda o: o["fit_score"]["score"], reverse=True)

    return {
        "opportunities": opportunities[:limit],
        "total_evaluated": total_evaluated,
        "from_cache": False,
        "scoring_completed_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/firms")
async def list_firms() -> dict:
    """Return all firms in the registry.

    Returns:
        Dictionary with firms list.
    """
    try:
        firms = db.get_all_firms()
        return {"firms": firms}
    except Exception:
        logger.error("firms.list.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve firms")


@app.get("/api/firms/{firm_id}")
async def get_firm(firm_id: UUID) -> dict:
    """Return a single firm with its open postings.

    Args:
        firm_id: The firm's UUID.

    Returns:
        Dictionary with firm details and postings list.

    Raises:
        HTTPException: 404 if the firm is not found.
    """
    try:
        firm = db.get_firm_by_id(str(firm_id))
        if firm is None:
            raise HTTPException(status_code=404, detail="Firm not found")

        postings = db.get_postings_by_firm(str(firm_id))

        return {
            "firm": firm,
            "postings": postings,
        }

    except HTTPException:
        raise
    except Exception:
        logger.error("firms.get.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve firm")


# ================================================================
# APPLICATIONS
# ================================================================


@app.get("/api/applications")
async def get_applications(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return all applications for the current user.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with applications list.
    """
    try:
        token = _extract_token(request)
        applications = db.get_applications(str(user_id), token)
        logger.info("applications.listed", extra={"user_id": str(user_id), "count": len(applications)})
        return {"applications": applications}
    except Exception:
        logger.error("applications.list.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve applications")


@app.post("/api/applications", status_code=201)
async def create_application(
    body: ApplicationCreate,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Create a new application.

    Args:
        body: The application creation payload.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the created application.
    """
    try:
        token = _extract_token(request)
        now = datetime.now(timezone.utc).isoformat()
        app_data = {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "posting_id": str(body.posting_id),
            "firm_id": str(body.firm_id),
            "status": body.status,
            "group_division": body.group_division,
            "notes": body.notes,
            "created_at": now,
            "updated_at": now,
        }

        created = db.create_application(app_data, token)
        logger.info("application.created", extra={"user_id": str(user_id), "firm_id": str(body.firm_id)})
        return {"application": created}
    except Exception:
        logger.error("application.create.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to create application")


@app.patch("/api/applications/{app_id}")
async def update_application(
    app_id: UUID,
    body: ApplicationUpdate,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Update an application's status or fields.

    Automatically creates a status change audit entry when the status field changes.

    Args:
        app_id: The application's UUID.
        body: The fields to update.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the updated application.
    """
    try:
        token = _extract_token(request)

        # Fetch current application to detect status change
        current_apps = db.get_applications(str(user_id), token)
        current_app = next((a for a in current_apps if a["id"] == str(app_id)), None)
        if current_app is None:
            raise HTTPException(status_code=404, detail="Application not found")

        updates = body.model_dump(exclude_none=True)
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Create status change audit entry if status changed
        if body.status and body.status != current_app.get("status"):
            change_data = {
                "id": str(uuid4()),
                "application_id": str(app_id),
                "user_id": str(user_id),
                "from_status": current_app.get("status", ""),
                "to_status": body.status,
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "notes": body.notes,
            }
            try:
                db.insert_status_change(change_data, token)
            except Exception as e:
                logger.warning("application.status_change.audit_failed", extra={"error": str(e)})

        updated = db.update_application(str(app_id), updates, token)
        logger.info("application.updated", extra={"app_id": str(app_id)})
        return {"application": updated}
    except HTTPException:
        raise
    except Exception:
        logger.error("application.update.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to update application")


@app.get("/api/applications/stats")
async def get_application_stats(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return summary statistics for the user's applications.

    Groups by status and by firm tier.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with by_status and by_tier breakdowns plus total count.
    """
    try:
        token = _extract_token(request)
        applications = db.get_applications(str(user_id), token)

        by_status: dict[str, int] = {}
        by_tier: dict[str, int] = {}

        for app_row in applications:
            status = app_row.get("status", "unknown")
            by_status[status] = by_status.get(status, 0) + 1

            firm_id = app_row.get("firm_id")
            if firm_id:
                firm = db.get_firm_by_id(firm_id)
                if firm:
                    tier = firm.get("tier", "unknown")
                    by_tier[tier] = by_tier.get(tier, 0) + 1

        logger.info("applications.stats", extra={"user_id": str(user_id), "total": len(applications)})
        return {
            "total": len(applications),
            "by_status": by_status,
            "by_tier": by_tier,
        }
    except Exception:
        logger.error("applications.stats.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to compute application stats")


# ================================================================
# ALUMNI & NETWORKING
# ================================================================


@app.get("/api/alumni/{firm_id}")
async def get_alumni(
    firm_id: UUID,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return alumni at a specific firm.

    Args:
        firm_id: The firm's UUID.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with alumni list and firm details.
    """
    try:
        token = _extract_token(request)
        alumni = db.get_alumni_by_firm(str(firm_id), token)
        firm = db.get_firm_by_id(str(firm_id))

        if firm is None:
            raise HTTPException(status_code=404, detail="Firm not found")

        logger.info("alumni.listed", extra={"firm_id": str(firm_id), "count": len(alumni)})
        return {
            "alumni": alumni,
            "firm": firm,
            "count": len(alumni),
        }
    except HTTPException:
        raise
    except Exception:
        logger.error("alumni.get.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve alumni")


@app.get("/api/networking/contacts")
async def get_networking_contacts(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return all networking contacts for the current user.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with contacts list.
    """
    try:
        token = _extract_token(request)
        contacts = db.get_networking_contacts(str(user_id), token)
        logger.info("networking.contacts.listed", extra={"user_id": str(user_id), "count": len(contacts)})
        return {"contacts": contacts}
    except Exception:
        logger.error("networking.contacts.list.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve networking contacts")


@app.post("/api/networking/contacts", status_code=201)
async def create_networking_contact(
    body: NetworkingContactCreate,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Add a new networking contact.

    Args:
        body: The contact creation payload.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the created contact.
    """
    try:
        token = _extract_token(request)
        now = datetime.now(timezone.utc).isoformat()
        contact_data = {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "alumni_id": str(body.alumni_id) if body.alumni_id else None,
            "firm_id": str(body.firm_id),
            "contact_name": body.contact_name,
            "contact_role": body.contact_role,
            "contact_division": body.contact_division,
            "connection_type": body.connection_type,
            "referred_by_id": str(body.referred_by_id) if body.referred_by_id else None,
            "outreach_status": "not_contacted",
            "created_at": now,
            "updated_at": now,
        }

        created = db.create_networking_contact(contact_data, token)
        logger.info("networking.contact.created", extra={"user_id": str(user_id), "contact_name": body.contact_name})
        return {"contact": created}
    except Exception:
        logger.error("networking.contact.create.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to create networking contact")


@app.patch("/api/networking/contacts/{contact_id}")
async def update_networking_contact(
    contact_id: UUID,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Update a networking contact's fields.

    Accepts a JSON body with any updatable fields from NetworkingContact.

    Args:
        contact_id: The contact's UUID.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the updated contact.
    """
    try:
        token = _extract_token(request)
        body = await request.json()
        body["updated_at"] = datetime.now(timezone.utc).isoformat()

        updated = db.update_networking_contact(str(contact_id), body, token)
        logger.info("networking.contact.updated", extra={"contact_id": str(contact_id)})
        return {"contact": updated}
    except Exception:
        logger.error("networking.contact.update.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to update networking contact")


@app.post("/api/networking/draft-outreach")
async def draft_outreach(
    body: OutreachDraftRequest,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Generate AI-drafted outreach messages for a networking contact.

    Uses the user's profile and the contact's info to generate personalized
    outreach message variants via Claude.

    Args:
        body: The outreach draft request with contact_id and tone.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with generated drafts, contact name, firm name, and hooks used.
    """
    try:
        token = _extract_token(request)

        # Fetch contact
        contacts = db.get_networking_contacts(str(user_id), token)
        contact = next((c for c in contacts if c["id"] == str(body.contact_id)), None)
        if contact is None:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Fetch firm
        firm = db.get_firm_by_id(contact["firm_id"])
        if firm is None:
            raise HTTPException(status_code=404, detail="Firm not found")

        # Fetch profile
        profile_data = db.get_profile(str(user_id), token)
        if profile_data is None:
            raise HTTPException(status_code=404, detail="Profile not found. Upload a resume first.")

        # Fetch alumni info if linked
        connection_hooks: list[str] = []
        if contact.get("alumni_id"):
            alumni_list = db.get_alumni_by_firm(contact["firm_id"], token)
            alum = next((a for a in alumni_list if a["id"] == contact["alumni_id"]), None)
            if alum:
                connection_hooks = alum.get("connection_hooks", [])

        # Generate outreach via Claude
        from app.claude_client import _get_client as get_anthropic_client

        anthropic_client = get_anthropic_client()
        prompt = f"""You are a networking coach for undergraduate finance students. Generate {2 if body.tone == 'professional' else 3} short outreach message variants (each under 80 words) for a student reaching out to a finance professional.

Student: {profile_data.get('name', 'Student')} at {profile_data.get('school', 'university')}, {profile_data.get('major', 'Finance')} major
Contact: {contact['contact_name']}, {contact.get('contact_role', 'Professional')} at {firm['name']}
Connection type: {contact.get('connection_type', 'cold_outreach')}
Shared hooks: {', '.join(connection_hooks) if connection_hooks else 'None known'}
Tone: {body.tone}

Return a JSON object:
{{"drafts": ["message 1", "message 2"], "connection_hooks_used": ["hook1"]}}

Return ONLY the JSON object."""

        import json
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()  # type: ignore[union-attr]
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [line for line in lines[1:] if line.strip() != "```"]
            text = "\n".join(lines)
        result = json.loads(text)

        logger.info("networking.outreach.drafted", extra={"user_id": str(user_id), "contact_id": str(body.contact_id)})
        return {
            "drafts": result.get("drafts", []),
            "contact_name": contact["contact_name"],
            "firm_name": firm["name"],
            "connection_hooks_used": result.get("connection_hooks_used", connection_hooks),
        }
    except HTTPException:
        raise
    except Exception:
        logger.error("networking.outreach.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to generate outreach drafts")


@app.get("/api/networking/nudges")
async def get_networking_nudges(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Get follow-up reminders and thank-you reminders for networking contacts.

    Returns contacts that need follow-ups (message sent > 5 days ago, no response)
    and contacts that had calls but no thank-you sent.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with follow_up_nudges and thank_you_nudges lists.
    """
    try:
        token = _extract_token(request)
        contacts = db.get_networking_contacts(str(user_id), token)

        now = datetime.now(timezone.utc)
        follow_up_nudges: list[dict] = []
        thank_you_nudges: list[dict] = []

        for contact in contacts:
            # Follow-up nudge: message sent but no response after 5+ days
            if contact.get("outreach_status") in ("message_sent", "followed_up"):
                outreach_date = contact.get("outreach_date")
                if outreach_date:
                    sent_at = datetime.fromisoformat(outreach_date.replace("Z", "+00:00"))
                    days_since = (now - sent_at).days
                    if days_since >= 5:
                        follow_up_nudges.append({
                            "contact_id": contact["id"],
                            "contact_name": contact["contact_name"],
                            "firm_id": contact["firm_id"],
                            "days_since_outreach": days_since,
                            "message": f"Follow up with {contact['contact_name']} — {days_since} days since outreach",
                        })

            # Thank-you nudge: call completed but no thank-you sent
            if contact.get("outreach_status") == "call_completed" and not contact.get("thank_you_sent_at"):
                thank_you_nudges.append({
                    "contact_id": contact["id"],
                    "contact_name": contact["contact_name"],
                    "firm_id": contact["firm_id"],
                    "message": f"Send thank-you to {contact['contact_name']} after your call",
                })

        logger.info(
            "networking.nudges.computed",
            extra={"user_id": str(user_id), "follow_ups": len(follow_up_nudges), "thank_yous": len(thank_you_nudges)},
        )
        return {
            "follow_up_nudges": follow_up_nudges,
            "thank_you_nudges": thank_you_nudges,
        }
    except Exception:
        logger.error("networking.nudges.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to compute networking nudges")


# ================================================================
# PREP
# ================================================================


@app.post("/api/prep/start", status_code=201)
async def start_prep_session(
    body: PrepSessionStart,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Start a new interview prep session and return questions.

    Generates firm-specific practice questions via Claude based on the
    session type and the user's profile.

    Args:
        body: The session start payload with firm_id, role_type, session_type, and question_count.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with session details and generated questions.
    """
    try:
        token = _extract_token(request)

        firm = db.get_firm_by_id(str(body.firm_id))
        if firm is None:
            raise HTTPException(status_code=404, detail="Firm not found")

        profile_data = db.get_profile(str(user_id), token)

        # Create the session record
        session_id = str(uuid4())
        session_data = {
            "id": session_id,
            "user_id": str(user_id),
            "firm_id": str(body.firm_id),
            "role_type": body.role_type,
            "session_type": body.session_type,
            "questions_asked": 0,
            "questions_correct": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        created_session = db.create_prep_session(session_data, token)

        # Generate questions via Claude
        import json
        from app.claude_client import _get_client as get_anthropic_client

        anthropic_client = get_anthropic_client()
        prompt = f"""You are an interview prep coach for undergraduate finance students preparing for {body.role_type} roles at {firm['name']} ({firm.get('tier', 'unknown tier')}).

Generate exactly {body.question_count} interview questions for a {body.session_type} session.

{"Student profile: " + json.dumps({k: v for k, v in profile_data.items() if k in ('major', 'gpa', 'coursework_completed', 'prior_experience', 'technical_skills')}) if profile_data else "No student profile available."}

Return a JSON array of question objects:
[
  {{
    "question_text": "the question",
    "category": "{body.session_type.replace('technical_', '')}",
    "difficulty": "easy|medium|hard",
    "hint": "optional hint for the student"
  }}
]

Mix difficulties. Make questions specific to {firm['name']} and the {body.role_type} role where possible. Return ONLY the JSON array."""

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()  # type: ignore[union-attr]
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [line for line in lines[1:] if line.strip() != "```"]
            text = "\n".join(lines)
        questions = json.loads(text)

        logger.info(
            "prep.session.started",
            extra={"user_id": str(user_id), "firm": firm["name"], "session_type": body.session_type, "questions": len(questions)},
        )
        return {
            "session": created_session,
            "questions": questions,
        }
    except HTTPException:
        raise
    except Exception:
        logger.error("prep.start.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to start prep session")


@app.post("/api/prep/answer")
async def submit_prep_answer(
    body: PrepAnswerSubmit,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Submit an answer to a prep question and get Claude's evaluation.

    Args:
        body: The answer submission with session_id, question, and user_answer.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with score, feedback, strengths, and improvements.
    """
    try:
        token = _extract_token(request)

        profile_data = db.get_profile(str(user_id), token)

        # Evaluate via Claude
        import json
        from app.claude_client import _get_client as get_anthropic_client

        anthropic_client = get_anthropic_client()
        prompt = f"""You are an interview prep evaluator for finance students.

Question: {body.question_text}
Category: {body.question_category}
Difficulty: {body.question_difficulty}
Student's answer: {body.user_answer}

Evaluate the answer and return a JSON object:
{{
  "score": <0-100>,
  "feedback": "<2-3 sentences of specific feedback>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}}

For technical questions, evaluate correctness and depth.
For behavioral questions, evaluate STAR framework usage and specificity.
Be honest — a weak answer should score below 50.

Return ONLY the JSON object."""

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()  # type: ignore[union-attr]
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [line for line in lines[1:] if line.strip() != "```"]
            text = "\n".join(lines)
        evaluation = json.loads(text)

        # Save answer record
        answer_data = {
            "id": str(uuid4()),
            "session_id": str(body.session_id),
            "user_id": str(user_id),
            "question_text": body.question_text,
            "question_category": body.question_category,
            "question_difficulty": body.question_difficulty,
            "user_answer": body.user_answer,
            "score": evaluation.get("score", 0),
            "feedback": evaluation.get("feedback", ""),
            "strengths": evaluation.get("strengths", []),
            "improvements": evaluation.get("improvements", []),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        db.create_prep_answer(answer_data, token)

        # Update session counters
        try:
            session_updates = {
                "questions_asked": 1,  # Will be incremented server-side ideally; simplified here
            }
            if evaluation.get("score", 0) >= 70:
                session_updates["questions_correct"] = 1
            db.update_prep_session(str(body.session_id), session_updates, token)
        except Exception as e:
            logger.warning("prep.answer.session_update_failed", extra={"error": str(e)})

        # Update readiness score
        try:
            readiness_data = {
                "user_id": str(user_id),
                "category": body.question_category,
                "last_practiced_at": datetime.now(timezone.utc).isoformat(),
                "needs_review": evaluation.get("score", 0) < 50,
            }
            db.upsert_readiness_score(readiness_data, token)
        except Exception as e:
            logger.warning("prep.answer.readiness_update_failed", extra={"error": str(e)})

        logger.info(
            "prep.answer.evaluated",
            extra={"user_id": str(user_id), "session_id": str(body.session_id), "score": evaluation.get("score")},
        )
        return {"evaluation": evaluation, "answer_id": answer_data["id"]}
    except HTTPException:
        raise
    except Exception:
        logger.error("prep.answer.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to evaluate answer")


@app.get("/api/prep/readiness")
async def get_readiness(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Get readiness scores by category for the current user.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with readiness scores per category.
    """
    try:
        token = _extract_token(request)
        scores = db.get_readiness_scores(str(user_id), token)
        logger.info("prep.readiness.fetched", extra={"user_id": str(user_id), "categories": len(scores)})
        return {"readiness_scores": scores}
    except Exception:
        logger.error("prep.readiness.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve readiness scores")


@app.get("/api/prep/history")
async def get_prep_history(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return past prep sessions for the current user.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with sessions list.
    """
    try:
        token = _extract_token(request)
        sessions = db.get_prep_sessions(str(user_id), token)
        logger.info("prep.history.fetched", extra={"user_id": str(user_id), "sessions": len(sessions)})
        return {"sessions": sessions}
    except Exception:
        logger.error("prep.history.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve prep history")


@app.post("/api/prep/why-firm")
async def why_firm(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Generate 'Why this firm?' talking points for a specific firm.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with talking_points list and firm name.
    """
    try:
        token = _extract_token(request)
        body = await request.json()
        firm_id = body.get("firm_id")
        if not firm_id:
            raise HTTPException(status_code=422, detail="firm_id is required")

        firm = db.get_firm_by_id(str(firm_id))
        if firm is None:
            raise HTTPException(status_code=404, detail="Firm not found")

        profile_data = db.get_profile(str(user_id), token)
        if profile_data is None:
            raise HTTPException(status_code=404, detail="Profile not found. Upload a resume first.")

        import json
        from app.claude_client import _get_client as get_anthropic_client

        anthropic_client = get_anthropic_client()
        prompt = f"""You are an interview coach helping a finance student prepare a "Why {firm['name']}?" answer.

Student profile:
- School: {profile_data.get('school', 'N/A')}
- Major: {profile_data.get('major', 'N/A')}
- Target roles: {profile_data.get('target_roles', [])}
- Prior experience: {json.dumps(profile_data.get('prior_experience', [])[:3])}

Firm: {firm['name']}
Tier: {firm.get('tier', 'N/A')}
Headquarters: {firm.get('headquarters', 'N/A')}
Recruiting profile: {firm.get('recruiting_profile', 'N/A')}

Generate 4-5 specific, personalized talking points that connect this student's background to this firm. Each point should be 1-2 sentences. Avoid generic platitudes.

Return a JSON object:
{{"talking_points": ["point 1", "point 2", "point 3", "point 4"]}}

Return ONLY the JSON object."""

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()  # type: ignore[union-attr]
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [line for line in lines[1:] if line.strip() != "```"]
            text = "\n".join(lines)
        result = json.loads(text)

        logger.info("prep.why_firm.generated", extra={"user_id": str(user_id), "firm": firm["name"]})
        return {
            "talking_points": result.get("talking_points", []),
            "firm_name": firm["name"],
        }
    except HTTPException:
        raise
    except Exception:
        logger.error("prep.why_firm.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to generate talking points")


# ================================================================
# TIMELINE
# ================================================================


@app.get("/api/timeline")
async def get_timeline(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    upcoming_only: bool = Query(default=False),
    weeks_ahead: int = Query(default=0, ge=0),
) -> dict:
    """Return all timeline events for the current user.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).
        upcoming_only: If True, only return future events.
        weeks_ahead: If > 0, limit to events within this many weeks.

    Returns:
        Dictionary with events list.
    """
    try:
        token = _extract_token(request)
        events = db.get_timeline_events(str(user_id), token, upcoming_only=upcoming_only)

        if weeks_ahead > 0:
            cutoff = (datetime.now(timezone.utc) + timedelta(weeks=weeks_ahead)).isoformat()
            events = [e for e in events if e.get("event_date", "") <= cutoff]

        logger.info("timeline.listed", extra={"user_id": str(user_id), "count": len(events)})
        return {"events": events}
    except Exception:
        logger.error("timeline.list.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to retrieve timeline events")


@app.get("/api/timeline/weekly")
async def get_weekly_summary(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Return this week's summary using the WeeklySummary model.

    Groups events by priority and identifies overdue items.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary matching the WeeklySummary schema.
    """
    try:
        token = _extract_token(request)
        now = datetime.now(timezone.utc)

        # Compute week boundaries (Monday to Sunday)
        days_since_monday = now.weekday()
        week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)

        all_events = db.get_timeline_events(str(user_id), token)

        urgent_items: list[dict] = []
        upcoming_items: list[dict] = []
        overdue_items: list[dict] = []

        for event in all_events:
            event_date_str = event.get("event_date", "")
            if not event_date_str:
                continue

            event_date = datetime.fromisoformat(event_date_str.replace("Z", "+00:00"))
            is_completed = event.get("completed", False)

            if not is_completed and event_date < now:
                overdue_items.append(event)
            elif week_start <= event_date <= week_end and not is_completed:
                priority = event.get("priority", "medium")
                if priority in ("critical", "high"):
                    urgent_items.append(event)
                else:
                    upcoming_items.append(event)

        # Get networking nudges for the weekly view
        contacts = db.get_networking_contacts(str(user_id), token)
        networking_nudges: list[str] = []
        for contact in contacts:
            if contact.get("outreach_status") in ("message_sent", "followed_up"):
                outreach_date = contact.get("outreach_date")
                if outreach_date:
                    sent_at = datetime.fromisoformat(outreach_date.replace("Z", "+00:00"))
                    days_since = (now - sent_at).days
                    if days_since >= 5:
                        networking_nudges.append(
                            f"Follow up with {contact['contact_name']} — {days_since} days since outreach"
                        )

        # Compute stats
        applications = db.get_applications(str(user_id), token)
        prep_sessions = db.get_prep_sessions(str(user_id), token)

        stats = {
            "applications_submitted": sum(1 for a in applications if a.get("status") not in ("researching", "networking")),
            "contacts_made": len(contacts),
            "prep_sessions_completed": len(prep_sessions),
        }

        # Determine recruiting phase based on time of year
        month = now.month
        if month in (8, 9, 10):
            phase_name = "Application Wave"
            phase_description = "Peak application season. Focus on submitting applications and networking."
        elif month in (11, 12, 1):
            phase_name = "Interview Season"
            phase_description = "Firms are conducting interviews. Focus on prep and follow-ups."
        elif month in (2, 3, 4):
            phase_name = "Decision Period"
            phase_description = "Offers are coming in. Focus on evaluating options and wrapping up."
        else:
            phase_name = "Preparation Phase"
            phase_description = "Build your profile, network, and prepare for the next cycle."

        logger.info(
            "timeline.weekly.computed",
            extra={
                "user_id": str(user_id),
                "urgent": len(urgent_items),
                "upcoming": len(upcoming_items),
                "overdue": len(overdue_items),
            },
        )
        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "phase_name": phase_name,
            "phase_description": phase_description,
            "urgent_items": urgent_items,
            "upcoming_items": upcoming_items,
            "overdue_items": overdue_items,
            "networking_nudges": networking_nudges,
            "stats": stats,
        }
    except Exception:
        logger.error("timeline.weekly.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to compute weekly summary")


@app.post("/api/timeline/events", status_code=201)
async def create_timeline_event(
    body: TimelineEventCreate,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Create a custom timeline event.

    Args:
        body: The event creation payload.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the created event.
    """
    try:
        token = _extract_token(request)
        event_data = {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "event_type": body.event_type,
            "title": body.title,
            "description": body.description,
            "firm_id": str(body.firm_id) if body.firm_id else None,
            "event_date": body.event_date.isoformat(),
            "priority": body.priority,
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        created = db.create_timeline_event(event_data, token)
        logger.info("timeline.event.created", extra={"user_id": str(user_id), "title": body.title})
        return {"event": created}
    except Exception:
        logger.error("timeline.event.create.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to create timeline event")


@app.patch("/api/timeline/events/{event_id}")
async def update_timeline_event(
    event_id: UUID,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Mark a timeline event as complete or update its fields.

    Args:
        event_id: The event's UUID.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with the updated event.
    """
    try:
        token = _extract_token(request)
        body = await request.json()

        # If marking as completed, set completed_at
        if body.get("completed") is True:
            body["completed_at"] = datetime.now(timezone.utc).isoformat()

        updated = db.update_timeline_event(str(event_id), body, token)
        logger.info("timeline.event.updated", extra={"event_id": str(event_id)})
        return {"event": updated}
    except Exception:
        logger.error("timeline.event.update.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to update timeline event")


@app.delete("/api/timeline/events/{event_id}")
async def delete_timeline_event(
    event_id: UUID,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Delete a custom timeline event.

    Args:
        event_id: The event's UUID.
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with deletion confirmation.
    """
    try:
        token = _extract_token(request)
        db.delete_timeline_event(str(event_id), token)
        logger.info("timeline.event.deleted", extra={"event_id": str(event_id)})
        return {"deleted": True, "event_id": str(event_id)}
    except Exception:
        logger.error("timeline.event.delete.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to delete timeline event")


@app.post("/api/timeline/generate")
async def generate_timeline(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Regenerate the user's recruiting timeline from their profile and postings.

    Creates timeline events based on posting deadlines, class year,
    and target roles.

    Args:
        request: The incoming request.
        user_id: The authenticated user's UUID (injected).

    Returns:
        Dictionary with generated events count.
    """
    try:
        token = _extract_token(request)

        profile_data = db.get_profile(str(user_id), token)
        if profile_data is None:
            raise HTTPException(status_code=404, detail="Profile not found. Upload a resume first.")

        # Get user's fit scores to find relevant postings
        fit_scores = db.get_fit_scores(str(user_id), token)
        relevant_posting_ids = [s["posting_id"] for s in fit_scores if s.get("score", 0) >= 55]

        events_created = 0
        now = datetime.now(timezone.utc)

        # Create deadline events for relevant postings
        for posting_id in relevant_posting_ids[:30]:
            try:
                svc = db.get_service_client()
                posting_result = svc.table("postings").select("*").eq("id", posting_id).execute()
                if not posting_result.data:
                    continue
                posting: dict = posting_result.data[0]  # type: ignore[assignment]

                if posting.get("deadline") and posting["deadline"] > now.isoformat():
                    event_data = {
                        "id": str(uuid4()),
                        "user_id": str(user_id),
                        "event_type": "application_deadline",
                        "title": f"Deadline: {posting['title']}",
                        "description": f"Application deadline for {posting['title']}",
                        "firm_id": posting.get("firm_id"),
                        "posting_id": posting_id,
                        "event_date": posting["deadline"],
                        "priority": "high",
                        "completed": False,
                        "created_at": now.isoformat(),
                    }
                    db.create_timeline_event(event_data, token)
                    events_created += 1
            except Exception as e:
                logger.warning("timeline.generate.posting_failed", extra={"posting_id": posting_id, "error": str(e)})
                continue

        # Add general recruiting milestones based on class year
        class_year = profile_data.get("current_class_year", "sophomore")
        milestones = _get_recruiting_milestones(class_year, now.year)
        for milestone in milestones:
            milestone_date = milestone["date"]
            if milestone_date > now.isoformat():
                event_data = {
                    "id": str(uuid4()),
                    "user_id": str(user_id),
                    "event_type": milestone["event_type"],
                    "title": milestone["title"],
                    "description": milestone.get("description"),
                    "priority": milestone.get("priority", "medium"),
                    "event_date": milestone_date,
                    "completed": False,
                    "created_at": now.isoformat(),
                }
                db.create_timeline_event(event_data, token)
                events_created += 1

        logger.info("timeline.generated", extra={"user_id": str(user_id), "events_created": events_created})
        return {"events_created": events_created, "message": f"Generated {events_created} timeline events."}
    except HTTPException:
        raise
    except Exception:
        logger.error("timeline.generate.error", extra={"traceback": traceback.format_exc()})
        raise HTTPException(status_code=500, detail="Failed to generate timeline")


def _get_recruiting_milestones(class_year: str, current_year: int) -> list[dict]:
    """Generate standard recruiting milestones based on class year.

    Args:
        class_year: The student's current class year.
        current_year: The current calendar year.

    Returns:
        List of milestone dicts with date, title, event_type, and priority.
    """
    milestones: list[dict] = []

    if class_year == "sophomore":
        milestones = [
            {
                "date": f"{current_year}-09-01T00:00:00+00:00",
                "title": "Start networking for sophomore programs",
                "event_type": "networking_task",
                "priority": "high",
                "description": "Begin reaching out to alumni and attending info sessions for sophomore insight programs.",
            },
            {
                "date": f"{current_year}-10-15T00:00:00+00:00",
                "title": "Diversity program deadlines approaching",
                "event_type": "diversity_program",
                "priority": "critical",
                "description": "Many diversity-focused sophomore programs have October/November deadlines.",
            },
            {
                "date": f"{current_year + 1}-01-15T00:00:00+00:00",
                "title": "Spring sophomore program applications",
                "event_type": "application_deadline",
                "priority": "high",
                "description": "Late-cycle sophomore programs open in January. Don't miss these.",
            },
        ]
    elif class_year == "junior":
        milestones = [
            {
                "date": f"{current_year}-08-01T00:00:00+00:00",
                "title": "Summer analyst applications open",
                "event_type": "application_open",
                "priority": "critical",
                "description": "Major banks open summer analyst applications in August. Apply within the first 2 weeks.",
            },
            {
                "date": f"{current_year}-09-15T00:00:00+00:00",
                "title": "Peak networking season",
                "event_type": "networking_task",
                "priority": "high",
                "description": "Info sessions, coffee chats, and recruiting events are concentrated in September-October.",
            },
            {
                "date": f"{current_year}-11-01T00:00:00+00:00",
                "title": "First round interviews begin",
                "event_type": "interview_scheduled",
                "priority": "critical",
                "description": "Most BB and EB first rounds happen in November-December.",
            },
            {
                "date": f"{current_year + 1}-01-15T00:00:00+00:00",
                "title": "Superday season",
                "event_type": "interview_scheduled",
                "priority": "critical",
                "description": "Superdays for remaining positions. Prep intensively.",
            },
        ]
    elif class_year == "senior":
        milestones = [
            {
                "date": f"{current_year}-09-01T00:00:00+00:00",
                "title": "Full-time applications open",
                "event_type": "application_open",
                "priority": "critical",
                "description": "Apply for full-time positions if you don't have a return offer.",
            },
        ]
    else:
        milestones = [
            {
                "date": f"{current_year}-09-01T00:00:00+00:00",
                "title": "Start exploring finance careers",
                "event_type": "prep_milestone",
                "priority": "medium",
                "description": "Attend info sessions and start learning about different finance roles.",
            },
        ]

    return milestones
