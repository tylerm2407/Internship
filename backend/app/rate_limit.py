"""Rate limiting middleware for InternshipMatch.

Uses slowapi for per-IP rate limiting. Expensive routes (Claude calls,
file parsing, admin) and auth routes get stricter limits to protect
cost and prevent enumeration.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# Route-specific rate limit strings
DEFAULT_LIMIT = "100/minute"
SENSITIVE_LIMIT = "10/minute"   # Claude-calling endpoints
AUTH_LIMIT = "5/minute"         # auth / account mutation
UPLOAD_LIMIT = "6/minute"       # resume + CSV uploads (cost: Claude Vision)
ADMIN_LIMIT = "30/minute"       # admin enumeration / exports
