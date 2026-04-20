"""Rate limiting middleware for InternshipMatch.

Uses slowapi (built on the limits library) for per-IP rate limiting.
Default: 100/minute. Sensitive endpoints get stricter limits.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Route-specific rate limit strings
DEFAULT_LIMIT = "100/minute"
SENSITIVE_LIMIT = "10/minute"
AUTH_LIMIT = "5/minute"
