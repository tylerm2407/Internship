"""Seed script for InternshipMatch demo data.

Loads alumni (public) and demo user data (applications, timeline, contacts,
prep sessions) using the service role client to bypass RLS.

Usage:
    cd backend
    python seed/load_demo_data.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db import get_service_client  # noqa: E402


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).isoformat()


def _days_ahead(n: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=n)).isoformat()


# --- Firm IDs (from firms.json) ---
GOLDMAN = "00000000-0000-4000-a000-000000000001"
JPMORGAN = "00000000-0000-4000-a000-000000000002"
MORGAN_STANLEY = "00000000-0000-4000-a000-000000000003"
BOFA = "00000000-0000-4000-a000-000000000004"
EVERCORE = "00000000-0000-4000-a000-000000000006"
LAZARD = "00000000-0000-4000-a000-000000000007"
MOELIS = "00000000-0000-4000-a000-000000000008"
HOULIHAN = "00000000-0000-4000-a000-000000000014"
WILLIAM_BLAIR = "00000000-0000-4000-a000-000000000015"
JEFFERIES = "00000000-0000-4000-a000-000000000017"

# --- Posting IDs (from postings.json) ---
GS_IB = "10000000-0000-4000-a000-000000000001"
GS_ST = "10000000-0000-4000-a000-000000000002"
JPM_IB = "10000000-0000-4000-a000-000000000004"
JPM_ER = "10000000-0000-4000-a000-000000000005"
MS_IB = "10000000-0000-4000-a000-000000000007"
BOFA_IB = "10000000-0000-4000-a000-000000000010"
EV_IB = "10000000-0000-4000-a000-000000000013"
WB_IB = "10000000-0000-4000-a000-000000000028"
JEF_IB = "10000000-0000-4000-a000-000000000031"
HL_IB = "10000000-0000-4000-a000-000000000025"

# --- Alumni IDs (from alumni.json) ---
SARAH_CHEN = "20000000-0000-4000-a000-000000000001"
MICHAEL_TORRES = "20000000-0000-4000-a000-000000000002"
EMILY_PARK = "20000000-0000-4000-a000-000000000003"
TYLER_BROOKS = "20000000-0000-4000-a000-000000000012"
CHRIS_MARTINEZ = "20000000-0000-4000-a000-000000000014"


def load_alumni() -> None:
    """Load alumni seed data."""
    seed_dir = Path(__file__).resolve().parent
    alumni_path = seed_dir / "alumni.json"

    if not alumni_path.exists():
        print(f"ERROR: {alumni_path} not found")
        return

    with open(alumni_path, "r", encoding="utf-8") as f:
        alumni = json.load(f)

    client = get_service_client()
    client.table("alumni").upsert(alumni, on_conflict="id").execute()
    print(f"  Loaded {len(alumni)} alumni.")


def seed_demo_user(client, user_id: str) -> None:  # type: ignore[no-untyped-def]
    """Seed all demo data for a given user ID."""

    # --- Applications (8 apps at various stages) ---
    apps = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": GS_IB,
            "firm_id": GOLDMAN,
            "status": "first_round",
            "group_division": "TMT",
            "applied_at": _days_ago(21),
            "notes": "Submitted online. Got HireVue invite 3 days later.",
            "next_action": "Prepare for Superday",
            "next_action_date": _days_ahead(5),
            "resume_version": "v3 — Finance focus",
            "created_at": _days_ago(30),
            "updated_at": _days_ago(2),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": JPM_IB,
            "firm_id": JPMORGAN,
            "status": "applied",
            "group_division": "Investment Banking",
            "applied_at": _days_ago(7),
            "notes": "Applied through school portal.",
            "next_action": "Wait for HireVue invite",
            "next_action_date": _days_ahead(7),
            "resume_version": "v3 — Finance focus",
            "created_at": _days_ago(14),
            "updated_at": _days_ago(7),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": EV_IB,
            "firm_id": EVERCORE,
            "status": "networking",
            "group_division": "Advisory",
            "notes": "Connected with Andrew Lee (VP). Scheduling call.",
            "next_action": "Send follow-up to Andrew",
            "next_action_date": _days_ahead(2),
            "created_at": _days_ago(10),
            "updated_at": _days_ago(3),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": WB_IB,
            "firm_id": WILLIAM_BLAIR,
            "status": "superday",
            "group_division": "Investment Banking",
            "applied_at": _days_ago(35),
            "notes": "Great phone screen with MD. Superday scheduled.",
            "next_action": "Superday at Chicago office",
            "next_action_date": _days_ahead(3),
            "resume_version": "v3 — Finance focus",
            "created_at": _days_ago(40),
            "updated_at": _days_ago(1),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": MS_IB,
            "firm_id": MORGAN_STANLEY,
            "status": "rejected",
            "group_division": "Capital Markets",
            "applied_at": _days_ago(45),
            "notes": "Rejection after first round. Feedback: need more technicals.",
            "created_at": _days_ago(50),
            "updated_at": _days_ago(15),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": JEF_IB,
            "firm_id": JEFFERIES,
            "status": "phone_screen",
            "group_division": "Leveraged Finance",
            "applied_at": _days_ago(14),
            "notes": "Phone screen with VP scheduled.",
            "next_action": "Phone screen call",
            "next_action_date": _days_ahead(1),
            "resume_version": "v2 — General",
            "created_at": _days_ago(20),
            "updated_at": _days_ago(3),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": HL_IB,
            "firm_id": HOULIHAN,
            "status": "offer",
            "group_division": "Financial Sponsors",
            "applied_at": _days_ago(60),
            "notes": "Offer received! Need to respond by Friday.",
            "next_action": "Respond to offer",
            "next_action_date": _days_ahead(4),
            "resume_version": "v3 — Finance focus",
            "created_at": _days_ago(65),
            "updated_at": _days_ago(1),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "posting_id": BOFA_IB,
            "firm_id": BOFA,
            "status": "researching",
            "group_division": None,
            "notes": "Looking into their healthcare group.",
            "next_action": "Research BofA healthcare team",
            "next_action_date": _days_ahead(5),
            "created_at": _days_ago(3),
            "updated_at": _days_ago(3),
        },
    ]

    print("  Inserting applications...")
    client.table("applications").upsert(apps, on_conflict="id").execute()

    # --- Networking Contacts (6 contacts at various outreach stages) ---
    contacts = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "alumni_id": SARAH_CHEN,
            "firm_id": GOLDMAN,
            "contact_name": "Sarah Chen",
            "contact_role": "Vice President",
            "contact_division": "Investment Banking",
            "connection_type": "alumni",
            "outreach_status": "call_completed",
            "outreach_date": _days_ago(14),
            "call_date": _days_ago(5),
            "call_notes": "Great conversation about GS TMT group culture. She recommended I highlight my tech sector knowledge in interviews.",
            "next_action": "Send thank-you note",
            "next_action_date": _days_ahead(0),
            "created_at": _days_ago(14),
            "updated_at": _days_ago(5),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "alumni_id": EMILY_PARK,
            "firm_id": JPMORGAN,
            "contact_name": "Emily Park",
            "contact_role": "Associate",
            "contact_division": "Investment Banking",
            "connection_type": "alumni",
            "outreach_status": "message_sent",
            "outreach_date": _days_ago(8),
            "next_action": "Follow up if no response by Friday",
            "next_action_date": _days_ahead(2),
            "created_at": _days_ago(8),
            "updated_at": _days_ago(8),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "alumni_id": TYLER_BROOKS,
            "firm_id": WILLIAM_BLAIR,
            "contact_name": "Tyler Brooks",
            "contact_role": "Analyst",
            "contact_division": "Investment Banking",
            "connection_type": "alumni",
            "outreach_status": "responded",
            "outreach_date": _days_ago(10),
            "next_action": "Schedule call for next week",
            "next_action_date": _days_ahead(3),
            "created_at": _days_ago(10),
            "updated_at": _days_ago(4),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "alumni_id": CHRIS_MARTINEZ,
            "firm_id": JEFFERIES,
            "contact_name": "Chris Martinez",
            "contact_role": "Analyst",
            "contact_division": "Leveraged Finance",
            "connection_type": "alumni",
            "outreach_status": "call_scheduled",
            "outreach_date": _days_ago(12),
            "call_date": _days_ahead(2),
            "next_action": "Prepare questions for call",
            "next_action_date": _days_ahead(1),
            "created_at": _days_ago(12),
            "updated_at": _days_ago(3),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "firm_id": EVERCORE,
            "contact_name": "Andrew Lee",
            "contact_role": "Vice President",
            "contact_division": "Advisory",
            "connection_type": "professor_referral",
            "outreach_status": "thank_you_sent",
            "outreach_date": _days_ago(21),
            "call_date": _days_ago(14),
            "call_notes": "Discussed Evercore deal flow and culture. Very helpful — offered to refer me internally.",
            "thank_you_sent_at": _days_ago(13),
            "created_at": _days_ago(21),
            "updated_at": _days_ago(13),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "firm_id": LAZARD,
            "contact_name": "Mark Stevens",
            "contact_role": "Managing Director",
            "contact_division": "Restructuring",
            "connection_type": "career_fair",
            "outreach_status": "followed_up",
            "outreach_date": _days_ago(18),
            "follow_up_date": _days_ago(10),
            "next_action": "Send second follow-up",
            "next_action_date": _days_ahead(1),
            "created_at": _days_ago(18),
            "updated_at": _days_ago(10),
        },
    ]

    print("  Inserting networking contacts...")
    client.table("networking_contacts").upsert(contacts, on_conflict="id").execute()

    # --- Timeline Events (12 events across the recruiting calendar) ---
    events = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "application_deadline",
            "title": "Goldman Sachs IB Summer Analyst deadline",
            "description": "Final deadline for 2027 summer analyst applications",
            "firm_id": GOLDMAN,
            "posting_id": GS_IB,
            "event_date": _days_ahead(12),
            "priority": "critical",
            "completed": False,
            "created_at": _days_ago(30),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "application_deadline",
            "title": "JPMorgan IB deadline",
            "firm_id": JPMORGAN,
            "posting_id": JPM_IB,
            "event_date": _days_ahead(8),
            "priority": "critical",
            "completed": True,
            "completed_at": _days_ago(7),
            "created_at": _days_ago(20),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "interview_scheduled",
            "title": "William Blair Superday",
            "description": "Full day of interviews at Chicago office. 4 rounds.",
            "firm_id": WILLIAM_BLAIR,
            "event_date": _days_ahead(3),
            "priority": "critical",
            "completed": False,
            "created_at": _days_ago(5),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "interview_scheduled",
            "title": "Jefferies phone screen",
            "description": "30-min call with VP in Leveraged Finance",
            "firm_id": JEFFERIES,
            "event_date": _days_ahead(1),
            "priority": "high",
            "completed": False,
            "created_at": _days_ago(3),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "networking_task",
            "title": "Follow up with Emily Park (JPMorgan)",
            "description": "No response after 8 days. Send polite follow-up.",
            "firm_id": JPMORGAN,
            "event_date": _days_ahead(0),
            "priority": "high",
            "completed": False,
            "created_at": _days_ago(1),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "follow_up_reminder",
            "title": "Send thank-you to Sarah Chen (Goldman)",
            "description": "Call completed 5 days ago. Thank-you overdue.",
            "firm_id": GOLDMAN,
            "event_date": _days_ahead(0),
            "priority": "high",
            "completed": False,
            "created_at": _days_ago(2),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "prep_milestone",
            "title": "Complete 2 behavioral mock sessions",
            "description": "Target: finish behavioral prep before William Blair Superday",
            "event_date": _days_ahead(2),
            "priority": "high",
            "completed": False,
            "created_at": _days_ago(7),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "prep_milestone",
            "title": "Review LBO modeling fundamentals",
            "description": "Weak area flagged in last prep session",
            "event_date": _days_ahead(5),
            "priority": "medium",
            "completed": False,
            "created_at": _days_ago(3),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "application_open",
            "title": "Moelis Summer Analyst apps open",
            "description": "Applications for 2027 summer class now live",
            "firm_id": MOELIS,
            "event_date": _days_ago(5),
            "priority": "medium",
            "completed": False,
            "created_at": _days_ago(5),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "diversity_program",
            "title": "Goldman Sachs Possibilities Summit",
            "description": "Early-look diversity program for sophomores and juniors",
            "firm_id": GOLDMAN,
            "event_date": _days_ahead(20),
            "priority": "medium",
            "completed": False,
            "created_at": _days_ago(10),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "custom",
            "title": "Bryant Finance Society guest speaker",
            "description": "MD from Houlihan Lokey speaking at club meeting",
            "event_date": _days_ahead(7),
            "priority": "low",
            "completed": False,
            "created_at": _days_ago(5),
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "event_type": "application_deadline",
            "title": "Evercore advisory application submitted",
            "firm_id": EVERCORE,
            "event_date": _days_ago(10),
            "priority": "critical",
            "completed": True,
            "completed_at": _days_ago(12),
            "created_at": _days_ago(25),
        },
    ]

    print("  Inserting timeline events...")
    client.table("timeline_events").upsert(events, on_conflict="id").execute()

    # --- Prep Sessions (3 past sessions) ---
    session1_id = str(uuid4())
    session2_id = str(uuid4())
    session3_id = str(uuid4())

    sessions = [
        {
            "id": session1_id,
            "user_id": user_id,
            "firm_id": GOLDMAN,
            "role_type": "investment_banking",
            "session_type": "behavioral",
            "questions_asked": 5,
            "questions_correct": 4,
            "overall_score": 78,
            "claude_feedback": "Strong storytelling in your STAR responses. Your leadership example was compelling. Work on quantifying impact more specifically — instead of 'improved efficiency', say 'reduced processing time by 30%'.",
            "duration_minutes": 18,
            "created_at": _days_ago(7),
        },
        {
            "id": session2_id,
            "user_id": user_id,
            "firm_id": WILLIAM_BLAIR,
            "role_type": "investment_banking",
            "session_type": "technical_accounting",
            "questions_asked": 5,
            "questions_correct": 3,
            "overall_score": 62,
            "claude_feedback": "Solid understanding of the three financial statements and how they link. Your explanation of depreciation's impact across all three was accurate. Need to review deferred revenue treatment and working capital changes more carefully.",
            "duration_minutes": 22,
            "created_at": _days_ago(4),
        },
        {
            "id": session3_id,
            "user_id": user_id,
            "firm_id": EVERCORE,
            "role_type": "investment_banking",
            "session_type": "technical_valuation",
            "questions_asked": 5,
            "questions_correct": 2,
            "overall_score": 48,
            "claude_feedback": "You understand the high-level framework of DCF analysis but struggled with the mechanics. Review WACC calculation components, terminal value methods (Gordon Growth vs Exit Multiple), and when to use unlevered vs levered free cash flow. This is a must-fix before Superday.",
            "duration_minutes": 25,
            "created_at": _days_ago(2),
        },
    ]

    print("  Inserting prep sessions...")
    client.table("prep_sessions").upsert(sessions, on_conflict="id").execute()

    # --- Prep Answers (sample answers for session 1) ---
    answers = [
        {
            "id": str(uuid4()),
            "session_id": session1_id,
            "user_id": user_id,
            "question_text": "Tell me about a time you led a team through a difficult situation.",
            "question_category": "behavioral",
            "question_difficulty": "medium",
            "user_answer": "As president of the Finance Society, I led a team of 8 to organize our annual stock pitch competition during COVID. We pivoted to virtual format in 2 weeks, increased participation by 40%, and raised $2,000 in sponsorships from local firms.",
            "score": 85,
            "feedback": "Excellent STAR structure with clear situation, task, action, and quantified result. The 40% participation increase and $2,000 in sponsorships are strong metrics.",
            "strengths": ["Clear STAR framework", "Quantified results", "Shows adaptability"],
            "improvements": ["Could mention what you learned from the experience", "Add context about team dynamics"],
            "created_at": _days_ago(7),
        },
        {
            "id": str(uuid4()),
            "session_id": session1_id,
            "user_id": user_id,
            "question_text": "Why investment banking?",
            "question_category": "behavioral",
            "question_difficulty": "easy",
            "user_answer": "I've always been fascinated by how companies grow and evolve. Through SMIF and my finance coursework, I developed a deep interest in valuation and deal execution. IB offers the best training ground to understand how businesses create value, and I want to be at the center of those transactions.",
            "score": 72,
            "feedback": "Good foundation but could be more specific. Reference a particular deal or transaction that excited you, and connect it to the specific firm you're interviewing with.",
            "strengths": ["Genuine passion comes through", "References relevant experience (SMIF)"],
            "improvements": ["Reference a specific deal or transaction", "Connect to the specific firm", "Mention long-term career goals"],
            "created_at": _days_ago(7),
        },
    ]

    print("  Inserting prep answers...")
    client.table("prep_answers").upsert(answers, on_conflict="id").execute()

    # --- Readiness Scores ---
    readiness = [
        {"user_id": user_id, "category": "accounting", "mastery_score": 3.2, "questions_attempted": 12, "last_practiced_at": _days_ago(4), "needs_review": False},
        {"user_id": user_id, "category": "valuation", "mastery_score": 1.8, "questions_attempted": 8, "last_practiced_at": _days_ago(2), "needs_review": True},
        {"user_id": user_id, "category": "ma", "mastery_score": 2.1, "questions_attempted": 5, "last_practiced_at": _days_ago(10), "needs_review": True},
        {"user_id": user_id, "category": "lbo", "mastery_score": 1.2, "questions_attempted": 3, "last_practiced_at": _days_ago(14), "needs_review": True},
        {"user_id": user_id, "category": "behavioral", "mastery_score": 4.1, "questions_attempted": 15, "last_practiced_at": _days_ago(7), "needs_review": False},
        {"user_id": user_id, "category": "firm_specific", "mastery_score": 2.8, "questions_attempted": 6, "last_practiced_at": _days_ago(5), "needs_review": False},
        {"user_id": user_id, "category": "market_awareness", "mastery_score": 3.5, "questions_attempted": 9, "last_practiced_at": _days_ago(3), "needs_review": False},
    ]

    print("  Inserting readiness scores...")
    for score in readiness:
        client.table("readiness_scores").upsert(
            score, on_conflict="user_id,category"
        ).execute()


def main() -> None:
    """Load all demo data."""
    client = get_service_client()

    print("Loading alumni...")
    load_alumni()

    # Find existing users or prompt for a user ID
    print("\nLooking for existing users...")
    result = client.table("users").select("id, email").limit(5).execute()

    if not result.data:
        print("No users found. Create an account first, then re-run this script.")
        print("The demo data needs a real user_id to associate with.")
        return

    print("Found users:")
    for i, user in enumerate(result.data):
        print(f"  [{i}] {user['email']} ({user['id']})")

    if len(result.data) == 1:
        user_id = result.data[0]["id"]
        print(f"\nUsing only user: {result.data[0]['email']}")
    else:
        try:
            choice = int(input("\nSelect user index (or press Enter for first): ") or "0")
            user_id = result.data[choice]["id"]
        except (ValueError, IndexError):
            user_id = result.data[0]["id"]

    print(f"\nSeeding demo data for user {user_id}...")
    seed_demo_user(client, user_id)

    print("\nDemo data loaded successfully.")
    print("  - 20 alumni across 14 firms")
    print("  - 8 applications at various stages")
    print("  - 6 networking contacts with outreach tracking")
    print("  - 12 timeline events (deadlines, interviews, prep milestones)")
    print("  - 3 prep sessions with feedback")
    print("  - 7 readiness scores across all categories")


if __name__ == "__main__":
    main()
