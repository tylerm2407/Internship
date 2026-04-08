"""One-time seed script for InternshipMatch Phase 1.

Reads firms.json and postings.json from the seed directory and inserts
them into Supabase via the db module. Run this once after setting up
the Supabase project and running the initial migration.

Usage:
    cd backend
    python seed/load_seed.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db import bulk_insert_firms, bulk_insert_postings, get_service_client


def main() -> None:
    """Load seed data into Supabase."""
    seed_dir = Path(__file__).resolve().parent

    # Load firms
    firms_path = seed_dir / "firms.json"
    if not firms_path.exists():
        print(f"ERROR: {firms_path} not found")
        sys.exit(1)

    with open(firms_path, "r", encoding="utf-8") as f:
        firms = json.load(f)

    print(f"Loading {len(firms)} firms...")
    bulk_insert_firms(firms)
    print(f"  Done. {len(firms)} firms seeded.")

    # Load postings
    postings_path = seed_dir / "postings.json"
    if not postings_path.exists():
        print(f"ERROR: {postings_path} not found")
        sys.exit(1)

    with open(postings_path, "r", encoding="utf-8") as f:
        postings = json.load(f)

    print(f"Loading {len(postings)} postings...")
    bulk_insert_postings(postings)
    print(f"  Done. {len(postings)} postings seeded.")

    # Load alumni
    alumni_path = seed_dir / "alumni.json"
    if alumni_path.exists():
        with open(alumni_path, "r", encoding="utf-8") as f:
            alumni = json.load(f)

        print(f"Loading {len(alumni)} alumni...")
        client = get_service_client()
        client.table("alumni").upsert(alumni, on_conflict="id").execute()
        print(f"  Done. {len(alumni)} alumni seeded.")

    print("\nSeed complete.")


if __name__ == "__main__":
    main()
