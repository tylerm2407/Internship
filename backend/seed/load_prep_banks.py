"""Load pre-generated interview question banks into Supabase.

Reads prep_corpus/shared_bank.json, prep_corpus/tier_bank.json, and
prep_corpus/firm_bank.json and upserts them into the bank_questions table.

Run:
    cd backend && python -m seed.load_prep_banks
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Make "app" importable when running as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from supabase import create_client

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

# Each shared-bank category key maps 1:1 to a session_type.
SESSION_TYPES = {
    "technical_accounting": "accounting",
    "technical_valuation": "valuation",
    "technical_ma": "ma",
    "technical_lbo": "lbo",
    "behavioral": "behavioral",
    "firm_specific": "firm_specific",
    "market_awareness": "market_awareness",
    "brain_teaser": "brain_teaser",
    "market_sizing": "market_sizing",
    "pitch_a_stock": "pitch_a_stock",
    "restructuring": "restructuring",
}


def _get_client():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def _load_json(name: str) -> dict:
    path = Path(__file__).resolve().parent.parent / "prep_corpus" / name
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _rows_from_shared(bank: dict) -> list[dict]:
    rows: list[dict] = []
    for session_type, questions in bank.items():
        if session_type not in SESSION_TYPES:
            continue
        category = SESSION_TYPES[session_type]
        for q in questions:
            rows.append(
                {
                    "firm_id": None,
                    "firm_tier": None,
                    "session_type": session_type,
                    "category": category,
                    "difficulty": q["d"],
                    "question_text": q["q"],
                    "hint": q.get("hint"),
                    "ideal_answer_outline": q.get("outline"),
                    "tags": q.get("tags", []),
                }
            )
    return rows


def _rows_from_tier(bank: dict) -> list[dict]:
    rows: list[dict] = []
    for tier, by_session in bank.items():
        for session_type, questions in by_session.items():
            if session_type not in SESSION_TYPES:
                continue
            category = SESSION_TYPES[session_type]
            for q in questions:
                rows.append(
                    {
                        "firm_id": None,
                        "firm_tier": tier,
                        "session_type": session_type,
                        "category": category,
                        "difficulty": q["d"],
                        "question_text": q["q"],
                        "hint": q.get("hint"),
                        "ideal_answer_outline": q.get("outline"),
                        "tags": q.get("tags", []),
                    }
                )
    return rows


def _rows_from_firms(bank: dict, firm_lookup: dict) -> list[dict]:
    rows: list[dict] = []
    for firm_name, by_session in bank.items():
        firm = firm_lookup.get(firm_name)
        if not firm:
            print(f"  [skip] firm not found in DB: {firm_name}")
            continue
        for session_type, questions in by_session.items():
            if session_type not in SESSION_TYPES:
                continue
            category = SESSION_TYPES[session_type]
            for q in questions:
                rows.append(
                    {
                        "firm_id": firm["id"],
                        "firm_tier": firm.get("tier"),
                        "session_type": session_type,
                        "category": category,
                        "difficulty": q["d"],
                        "question_text": q["q"],
                        "hint": q.get("hint"),
                        "ideal_answer_outline": q.get("outline"),
                        "tags": q.get("tags", []),
                    }
                )
    return rows


def main() -> None:
    client = _get_client()

    shared = _load_json("shared_bank.json")
    tier = _load_json("tier_bank.json")
    firm = _load_json("firm_bank.json")
    firm_wave2 = _load_json("firm_bank_wave2.json")

    # Merge wave2 into firm dict (wave2 firms are new, no overlap)
    firm.update(firm_wave2)

    firms_result = client.table("firms").select("id,name,tier").execute()
    firm_lookup: dict = {}
    for f in firms_result.data or []:
        if isinstance(f, dict) and "name" in f:
            firm_lookup[f["name"]] = f
    print(f"Loaded {len(firm_lookup)} firms from DB.")

    # Wipe existing bank rows so reruns don't duplicate
    print("Clearing existing bank_questions rows...")
    client.table("bank_questions").delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()

    shared_rows = _rows_from_shared(shared)
    tier_rows = _rows_from_tier(tier)
    firm_rows = _rows_from_firms(firm, firm_lookup)

    all_rows = shared_rows + tier_rows + firm_rows
    print(
        f"Prepared: {len(shared_rows)} shared, {len(tier_rows)} tier, "
        f"{len(firm_rows)} firm-specific — total {len(all_rows)}"
    )

    # Batch insert in chunks of 200
    BATCH = 200
    for i in range(0, len(all_rows), BATCH):
        chunk = all_rows[i : i + BATCH]
        client.table("bank_questions").insert(chunk).execute()
        print(f"  inserted {i + len(chunk)}/{len(all_rows)}")

    print("Done.")


if __name__ == "__main__":
    main()
