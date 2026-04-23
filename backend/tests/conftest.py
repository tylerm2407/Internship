"""Shared pytest fixtures for the backend test suite.

Add `backend/` to sys.path once so tests can `from app ...` without
path hacks in each file.
"""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def user_id() -> UUID:
    return UUID("00000000-0000-4000-a000-000000000042")


@pytest.fixture
def auth_token() -> str:
    return "test.jwt.token"


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}
