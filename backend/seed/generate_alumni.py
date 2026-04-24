"""Generate a realistic Bryant alumni seed set.

Merges 80 synthetic Bryant alumni onto the existing hand-curated ones in
alumni.json, spread across a varied sample of firms from firms.json.

Each generated row:
- Has a unique UUID (stable across runs via deterministic hashing)
- Is attributed to Bryant University (this is the value prop of the app:
  Bryant students connecting with Bryant alumni)
- Has graduation years distributed 2016-2024 so students can find both
  recent grads (relatable) and senior alumni (door-opening)
- Has roles + divisions matched to firm tier (no "Math Center Tutor"
  listed as alumni at Goldman)
- Has `source = "seed"` so real CSV imports later don't conflict

Real Bryant alumni should replace this list via the CSV import flow
(backend/seed/alumni_template.csv) once Bryant Marcom provides the list.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

random.seed(42)  # deterministic across runs

SEED_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------
# Role + division pools by firm tier
# ---------------------------------------------------------------

ROLES_IB = [
    ("Analyst", "Investment Banking"),
    ("Associate", "Investment Banking"),
    ("Vice President", "Investment Banking"),
    ("Senior Associate", "Investment Banking"),
    ("Analyst", "Leveraged Finance"),
    ("Associate", "M&A"),
    ("Analyst", "Industrials Coverage"),
    ("Analyst", "TMT"),
    ("Analyst", "Healthcare"),
    ("Analyst", "Financial Sponsors"),
    ("Associate", "Equity Capital Markets"),
    ("Analyst", "Debt Capital Markets"),
    ("Associate", "Restructuring"),
]

ROLES_ST = [
    ("Analyst", "Equity Sales"),
    ("Associate", "Fixed Income Trading"),
    ("Analyst", "Prime Services"),
    ("Associate", "Rates Trading"),
    ("Analyst", "Credit Trading"),
    ("Vice President", "Equity Derivatives"),
]

ROLES_BUYSIDE = [
    ("Associate", "Private Equity"),
    ("Analyst", "Private Equity"),
    ("Vice President", "Private Equity"),
    ("Analyst", "Hedge Fund — Long/Short Equity"),
    ("Analyst", "Credit Investing"),
    ("Associate", "Growth Equity"),
    ("Analyst", "Special Situations"),
]

ROLES_QUANT = [
    ("Quantitative Researcher", "Systematic Equities"),
    ("Quantitative Trader", "Options Market Making"),
    ("Software Engineer", "Trading Systems"),
    ("Quantitative Developer", "Research Platform"),
]

ROLES_AM = [
    ("Equity Research Associate", "Consumer"),
    ("Equity Research Associate", "Financials"),
    ("Portfolio Analyst", "Multi-Asset"),
    ("Associate", "Client Coverage"),
]

ROLES_CORPORATE = [
    ("Financial Analyst", "FP&A"),
    ("Senior Financial Analyst", "Corporate Development"),
    ("Consultant", "Financial Advisory"),
]

ROLES_BY_TIER = {
    "bulge_bracket": ROLES_IB + ROLES_ST[:3],
    "elite_boutique": ROLES_IB,
    "middle_market": ROLES_IB,
    "boutique": ROLES_IB,
    "regional": ROLES_IB + ROLES_AM + ROLES_CORPORATE,
    "buy_side": ROLES_BUYSIDE + ROLES_AM,
    "quant": ROLES_QUANT,
}

# ---------------------------------------------------------------
# Diverse name pool — mix of backgrounds, realistic for a US undergrad school
# ---------------------------------------------------------------

FIRST_NAMES = [
    "Alex", "Olivia", "Marcus", "Priya", "Jordan", "Aiden", "Sophia",
    "Ethan", "Maya", "Lucas", "Isabella", "Noah", "Ava", "Mason",
    "Zoe", "Caleb", "Layla", "Dylan", "Amara", "Ryan", "Grace",
    "Elijah", "Harper", "Gabriel", "Chloe", "Daniel", "Aria", "Jackson",
    "Leah", "Omar", "Natalie", "Brandon", "Emma", "Theo", "Camila",
    "Xavier", "Riya", "Samuel", "Alina", "Victor", "Imani", "Mateo",
    "Sienna", "Ezekiel", "Madeline", "Nikhil", "Jocelyn", "Liam",
    "Ayanna", "Kenji",
]

LAST_NAMES = [
    "Patel", "Johnson", "Kim", "Garcia", "Nguyen", "Williams", "Chen",
    "Rivera", "Thompson", "Martinez", "Okafor", "Brown", "Lee", "Davis",
    "Ramirez", "Singh", "Wilson", "Cohen", "Ng", "Romero", "Silva",
    "Hughes", "Bennett", "Sullivan", "Goldberg", "Morales", "Murphy",
    "Kapoor", "Zhang", "O'Connor", "Das", "Carter", "Shah", "Foster",
    "Jiang", "Mendez", "Tran", "Reilly", "Shapiro", "Diaz", "Park",
    "DeLuca", "Khan", "Russo", "Akinyi", "Baker", "Kowalski", "Vasquez",
]

MAJORS = [
    "Finance", "Finance & Economics", "Accounting", "Applied Economics",
    "Finance and Mathematics", "Finance and Data Science",
    "International Business", "Finance and Political Science",
]

CITIES_BY_HQ = {
    # Bucket HQ strings into clean city names for display
    "New York": "New York, NY",
    "Chicago": "Chicago, IL",
    "Boston": "Boston, MA",
    "San Francisco": "San Francisco, CA",
    "Charlotte": "Charlotte, NC",
    "Providence": "Providence, RI",
    "Stamford": "Stamford, CT",
    "Greenwich": "Greenwich, CT",
}


def _city_from_hq(hq: str | None) -> str:
    if not hq:
        return "New York, NY"
    for key, city in CITIES_BY_HQ.items():
        if key.lower() in hq.lower():
            return city
    return hq


HOOKS_POOL = [
    "Bryant Finance Society (former president)",
    "Bryant Finance Society",
    "SMIF (Student Managed Investment Fund)",
    "Bryant Consulting Group",
    "Archway Investment Fund",
    "Wall Street Club",
    "Bryant Private Equity Club",
    "Sigma Phi Epsilon",
    "Beta Alpha Psi honors society",
    "Kappa Delta Pi",
    "Honors Program",
    "Prof. Johnson capstone",
    "Prof. Taylor (Corporate Finance)",
    "Studied abroad — LSE",
    "Studied abroad — Madrid",
    "Bryant Bulldogs D1 lacrosse",
    "Bryant Bulldogs track & field",
    "Resident Assistant",
    "Peer Mentor",
    "First-gen college student",
    "Veteran / ROTC",
    "Presidential Scholarship recipient",
]


def _hooks_for(firm_name: str, firm_hq: str | None) -> list[str]:
    """Pick 2-3 hooks, always including at least one Bryant-specific hook."""
    bryant_hooks = [h for h in HOOKS_POOL if "Bryant" in h or "Archway" in h or "SMIF" in h]
    other_hooks = [h for h in HOOKS_POOL if h not in bryant_hooks]
    count = random.choice([2, 2, 3])
    picked = [random.choice(bryant_hooks)]
    while len(picked) < count:
        candidate = random.choice(other_hooks)
        if candidate not in picked:
            picked.append(candidate)
    return picked


def _deterministic_uuid(seed: str) -> str:
    """Produce a version-4-shaped UUID string from a deterministic seed."""
    h = hashlib.sha1(seed.encode("utf-8")).hexdigest()
    return f"{h[0:8]}-{h[8:12]}-4{h[13:16]}-a{h[17:20]}-{h[20:32]}"


def _email_for(first: str, last: str, grad_year: int) -> str:
    return f"{first.lower()}.{last.lower().replace(chr(39), '')}{grad_year % 100:02d}@bryant.edu"


def _linkedin_for(first: str, last: str) -> str:
    slug = f"{first.lower()}-{last.lower().replace(chr(39), '-')}"
    return f"https://www.linkedin.com/in/{slug}"


def generate() -> list[dict]:
    firms_path = SEED_DIR / "firms.json"
    alumni_path = SEED_DIR / "alumni.json"

    with open(firms_path, encoding="utf-8") as f:
        firms = json.load(f)
    with open(alumni_path, encoding="utf-8") as f:
        existing = json.load(f)

    existing_ids = {a["id"] for a in existing}
    existing_pairs = {(a["name"], a["firm_id"]) for a in existing}

    # Pick firms weighted toward the tiers Bryant students actually target
    eligible_firms = [f for f in firms if f.get("tier") in ROLES_BY_TIER]
    random.shuffle(eligible_firms)

    new_rows: list[dict] = []
    target_new = 80
    idx = 0

    while len(new_rows) < target_new and idx < len(eligible_firms) * 3:
        firm = eligible_firms[idx % len(eligible_firms)]
        idx += 1
        tier = firm.get("tier", "middle_market")
        roles = ROLES_BY_TIER.get(tier, ROLES_IB)
        role_title, division = random.choice(roles)

        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"

        if (name, firm["id"]) in existing_pairs:
            continue

        grad_year = random.choice(
            [2016, 2017, 2018, 2019, 2020, 2020, 2021, 2021, 2022, 2022, 2023, 2024]
        )

        alum_id = _deterministic_uuid(f"{name}|{firm['id']}|{grad_year}")
        if alum_id in existing_ids:
            continue
        existing_ids.add(alum_id)
        existing_pairs.add((name, firm["id"]))

        new_rows.append(
            {
                "id": alum_id,
                "name": name,
                "firm_id": firm["id"],
                "current_role": role_title,
                "division": division,
                "graduation_year": grad_year,
                "school": "Bryant University",
                "major": random.choice(MAJORS),
                "connection_hooks": _hooks_for(firm["name"], firm.get("headquarters")),
                "email": _email_for(first, last, grad_year),
                "linkedin_url": _linkedin_for(first, last),
                "current_company": firm["name"],
                "city": _city_from_hq(firm.get("headquarters")),
                "added_by": None,
                "source": "seed",
            }
        )

    # Merge and write back
    merged = existing + new_rows
    with open(alumni_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    return new_rows


if __name__ == "__main__":
    new_rows = generate()
    print(f"Appended {len(new_rows)} synthetic alumni to alumni.json.")
    print("Re-run seed/load_seed.py to push them to Supabase.")
