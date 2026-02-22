# @claude-header v1 RATE-LIMITING:token-bucket-rate-limiter
# 1:imp:time[31]
# 2:imp:threading[32]
# 3:imp:dataclass,field[33] from dataclasses
# 4:imp:Optional,Dict,Callable[34] from typing
# 5:imp:wraps[35] from functools
# 6:cls:BucketConfig[38-43] rate-limit-bucket-config
# 6a:prop:max_tokens[41]
# 6b:prop:refill_rate[42]
# 6c:prop:refill_interval[43]
# 7:cls:TokenBucket[46-52] bucket-state
# 7a:prop:tokens[49]
# 7b:prop:last_refill[50]
# 7c:prop:config[51]
# 7d:prop:lock[52]
# 8:cls:RateLimitExceeded(Exception)[55-60]
# 8a:mtd:__init__(bucket_name,retry_after)[57-60]
# 9:fn:_calculate_refill(bucket)[63-68]->float
# 10:fn:create_bucket(name,config)[71-77]->TokenBucket
# 11:cls:RateLimiter[80-143] multi-bucket-rate-limiter
# 11a:mtd:__init__()[83-85]
# 11b:mtd:register(name,max_tokens,refill_rate)[87-91]
# 11c:mtd:consume(name,tokens)[93-106]->bool
# 11d:mtd:consume_or_raise(name,tokens)[108-114]
# 11e:mtd:remaining(name)[116-124]->float
# 11f:mtd:reset(name)[126-133]
# 11g:mtd:decorator(name,tokens)[135-143]->Callable
# 12:fn:create_limiter_from_config(config_dict)[146-162]->RateLimiter builds-from-config-dict
# @end-claude-header
"""Rate limiter module using token bucket algorithm."""

import time
import threading
from dataclasses import dataclass, field
from typing import Optional, Dict, Callable
from functools import wraps


@dataclass
class BucketConfig:
    """Configuration for a single rate limit bucket."""
    max_tokens: int
    refill_rate: float  # tokens per second
    refill_interval: float = 1.0


@dataclass
class TokenBucket:
    """Token bucket state."""
    tokens: float
    last_refill: float
    config: BucketConfig
    lock: threading.Lock = field(default_factory=threading.Lock)


class RateLimitExceeded(Exception):
    """Raised when a rate limit is exceeded."""
    def __init__(self, bucket_name: str, retry_after: float):
        self.bucket_name = bucket_name
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded for '{bucket_name}'. Retry after {retry_after:.1f}s")


def _calculate_refill(bucket: TokenBucket) -> float:
    """Compute how many tokens to add based on elapsed time."""
    now = time.monotonic()
    elapsed = now - bucket.last_refill
    new_tokens = elapsed * bucket.config.refill_rate
    return min(bucket.tokens + new_tokens, bucket.config.max_tokens)


def create_bucket(name: str, config: BucketConfig) -> TokenBucket:
    """Initialize a new token bucket with full tokens."""
    return TokenBucket(
        tokens=config.max_tokens,
        last_refill=time.monotonic(),
        config=config,
    )


class RateLimiter:
    """Multi-bucket rate limiter with automatic token refill."""

    def __init__(self):
        self._buckets: Dict[str, TokenBucket] = {}
        self._global_lock = threading.Lock()

    def register(self, name: str, max_tokens: int, refill_rate: float) -> None:
        """Register a new rate limit bucket."""
        config = BucketConfig(max_tokens=max_tokens, refill_rate=refill_rate)
        with self._global_lock:
            self._buckets[name] = create_bucket(name, config)

    def consume(self, name: str, tokens: int = 1) -> bool:
        """Try to consume tokens from a bucket. Returns True if allowed."""
        bucket = self._buckets.get(name)
        if bucket is None:
            raise KeyError(f"Unknown bucket: {name}")

        with bucket.lock:
            bucket.tokens = _calculate_refill(bucket)
            bucket.last_refill = time.monotonic()

            if bucket.tokens >= tokens:
                bucket.tokens -= tokens
                return True
            return False

    def consume_or_raise(self, name: str, tokens: int = 1) -> None:
        """Consume tokens or raise RateLimitExceeded."""
        if not self.consume(name, tokens):
            bucket = self._buckets[name]
            deficit = tokens - bucket.tokens
            retry_after = deficit / bucket.config.refill_rate
            raise RateLimitExceeded(name, retry_after)

    def remaining(self, name: str) -> float:
        """Get remaining tokens in a bucket."""
        bucket = self._buckets.get(name)
        if bucket is None:
            raise KeyError(f"Unknown bucket: {name}")
        with bucket.lock:
            bucket.tokens = _calculate_refill(bucket)
            bucket.last_refill = time.monotonic()
            return bucket.tokens

    def reset(self, name: str) -> None:
        """Reset a bucket to full capacity."""
        bucket = self._buckets.get(name)
        if bucket is None:
            raise KeyError(f"Unknown bucket: {name}")
        with bucket.lock:
            bucket.tokens = bucket.config.max_tokens
            bucket.last_refill = time.monotonic()

    def decorator(self, name: str, tokens: int = 1) -> Callable:
        """Create a decorator that rate-limits function calls."""
        def wrapper(func: Callable) -> Callable:
            @wraps(func)
            def inner(*args, **kwargs):
                self.consume_or_raise(name, tokens)
                return func(*args, **kwargs)
            return inner
        return wrapper


def create_limiter_from_config(config_dict: Dict[str, dict]) -> RateLimiter:
    """Build a RateLimiter from a config dictionary.

    Expected format:
        {
            "api_calls": {"max_tokens": 100, "refill_rate": 10},
            "uploads": {"max_tokens": 5, "refill_rate": 0.1},
        }
    """
    limiter = RateLimiter()
    for name, settings in config_dict.items():
        limiter.register(
            name=name,
            max_tokens=settings["max_tokens"],
            refill_rate=settings["refill_rate"],
        )
    return limiter
