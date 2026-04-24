"""Rate limiting middleware for InternshipMatch.

Uses slowapi for per-IP rate limiting. Expensive routes (Claude calls,
file parsing, admin) and auth routes get stricter limits to protect
cost and prevent enumeration.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])

# Route-specific rate limit strings. Loosened for live demos — the original
# 10/min on Claude endpoints trips during a pitch if the presenter retries
# a few times. These are still strict enough to bound Claude cost on
# adversarial traffic.
DEFAULT_LIMIT = "200/minute"
SENSITIVE_LIMIT = "30/minute"   # Claude-calling endpoints
AUTH_LIMIT = "10/minute"        # auth / account mutation
UPLOAD_LIMIT = "15/minute"      # resume + CSV uploads (cost: Claude Vision)
ADMIN_LIMIT = "60/minute"       # admin enumeration / exports
