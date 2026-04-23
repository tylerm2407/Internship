"""Tests for the CORS origin parser.

Exercises `parse_allowed_origins` directly instead of reimporting
`app.main`, which avoids re-registering FastAPI routes and tripping
over `.env` loading in test runs.
"""

from __future__ import annotations

import pytest

from app.config import parse_allowed_origins


def test_parses_comma_separated_origins():
    assert parse_allowed_origins("https://a.example.com,https://b.example.com") == [
        "https://a.example.com",
        "https://b.example.com",
    ]


def test_trims_whitespace():
    assert parse_allowed_origins(" https://a.example.com , https://b.example.com ") == [
        "https://a.example.com",
        "https://b.example.com",
    ]


def test_rejects_wildcard():
    with pytest.raises(ValueError, match="cannot contain"):
        parse_allowed_origins("*")


def test_rejects_wildcard_mixed():
    with pytest.raises(ValueError, match="cannot contain"):
        parse_allowed_origins("https://real.example.com,*")


def test_rejects_empty():
    with pytest.raises(ValueError, match="at least one origin"):
        parse_allowed_origins(",  ,  ")


def test_env_fallback(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://from-env.example.com")
    assert parse_allowed_origins() == ["https://from-env.example.com"]


def test_env_default_when_unset(monkeypatch):
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    assert parse_allowed_origins() == ["http://localhost:3000"]
