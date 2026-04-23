"""Application configuration helpers.

Pulled out of main.py so tests can exercise config parsing without
importing the full FastAPI app (which registers routes, loads .env,
and pulls in every dependency).
"""

from __future__ import annotations

import os


def parse_allowed_origins(raw: str | None = None) -> list[str]:
    """Parse the ALLOWED_ORIGINS env var into a list of origins.

    Rejects wildcards (incompatible with allow_credentials=True) and
    empty configs up front so misconfigurations surface at startup
    instead of silently breaking CORS in browsers.

    Args:
        raw: Override string (mainly for tests). Falls back to env.
    """
    if raw is None:
        raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if any(o == "*" for o in origins):
        raise ValueError("ALLOWED_ORIGINS cannot contain '*' when credentials are enabled")
    if not origins:
        raise ValueError("ALLOWED_ORIGINS must contain at least one origin")
    return origins
