"""Tests for the rate-limiter configuration.

Verifies the limiter singleton exists, default limits are set, and the
named constants stay parseable by slowapi.
"""

from __future__ import annotations

from app.rate_limit import (
    ADMIN_LIMIT,
    AUTH_LIMIT,
    DEFAULT_LIMIT,
    SENSITIVE_LIMIT,
    UPLOAD_LIMIT,
    limiter,
)


def test_limiter_is_configured():
    assert limiter is not None
    assert limiter._default_limits, "default limits should be set"


def test_limit_strings_are_valid_format():
    # slowapi limits follow "<count>/<period>" format
    for name, value in {
        "DEFAULT_LIMIT": DEFAULT_LIMIT,
        "SENSITIVE_LIMIT": SENSITIVE_LIMIT,
        "AUTH_LIMIT": AUTH_LIMIT,
        "UPLOAD_LIMIT": UPLOAD_LIMIT,
        "ADMIN_LIMIT": ADMIN_LIMIT,
    }.items():
        assert "/" in value, f"{name}={value!r} should contain '/'"
        count, period = value.split("/", 1)
        assert count.isdigit(), f"{name} count must be numeric"
        assert period in ("second", "minute", "hour", "day"), (
            f"{name} period must be a time unit"
        )


def test_sensitive_is_stricter_than_default():
    # SENSITIVE protects expensive Claude calls — must be lower than default
    default_count = int(DEFAULT_LIMIT.split("/")[0])
    sensitive_count = int(SENSITIVE_LIMIT.split("/")[0])
    assert sensitive_count < default_count


def test_auth_is_strictest():
    # AUTH is the tightest limit (brute-force protection)
    auth_count = int(AUTH_LIMIT.split("/")[0])
    sensitive_count = int(SENSITIVE_LIMIT.split("/")[0])
    assert auth_count <= sensitive_count
