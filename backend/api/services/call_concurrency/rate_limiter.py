import time
import uuid
from dataclasses import dataclass
from typing import Optional

import redis.asyncio as aioredis
from loguru import logger

from api.constants import REDIS_URL

# Fleet-wide mirror of every live slot ("<org_id>:<slot_id>", scored by acquire
# time), maintained by the acquire/release paths alongside the per-org sets so
# the autoscaling scrape (get_fleet_concurrent_count) is a single ZCOUNT instead
# of a keyspace scan. Deliberately outside the "concurrent_calls:" prefix so it
# can never collide with an org or scope counter key.
FLEET_CONCURRENT_KEY = "concurrent_calls_fleet"


@dataclass(frozen=True)
class ConcurrentSlotAcquisition:
    slot_id: str
    active_count: int


class RateLimiter:
    """Sliding window rate limiter to enforce strict per-second limits and concurrent call limits.
    Gracefully falls back to process-local in-memory tracking when Redis is unavailable or down.
    """

    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self.stale_call_timeout = 1200  # 20 minutes in seconds
        self._redis_down_until: float = 0.0
        self._memory_slots: dict[str, dict[str, float]] = {}
        self._memory_workflow_mappings: dict[int, dict] = {}
        self._memory_rate_limits: dict[str, list[float]] = {}

    def _should_try_redis(self) -> bool:
        return time.time() >= self._redis_down_until

    def _mark_redis_down(self, exc: Exception) -> None:
        logger.warning(f"Redis unavailable ({exc}), using in-memory concurrency fallback")
        self._redis_down_until = time.time() + 10.0

    def _mem_prune_slots(self, key: str, stale_cutoff: float) -> dict[str, float]:
        slots = self._memory_slots.get(key, {})
        valid = {k: v for k, v in slots.items() if v > stale_cutoff}
        self._memory_slots[key] = valid
        return valid

    def _mem_acquire_slot_details(
        self,
        organization_id: int,
        max_concurrent: int,
        *,
        scope_key: str | None = None,
        scope_max_concurrent: int | None = None,
    ) -> Optional[ConcurrentSlotAcquisition]:
        now = time.time()
        stale_cutoff = now - self.stale_call_timeout
        concurrent_key = f"concurrent_calls:{organization_id}"
        org_slots = self._mem_prune_slots(concurrent_key, stale_cutoff)

        if len(org_slots) >= max_concurrent:
            return None

        slot_id = f"{int(now * 1000)}_{uuid.uuid4().hex[:8]}"

        if scope_key:
            scope_concurrent_key = f"concurrent_calls:{scope_key}"
            scope_slots = self._mem_prune_slots(scope_concurrent_key, stale_cutoff)
            if len(scope_slots) >= (scope_max_concurrent or 0):
                return None
            scope_slots[slot_id] = now
            self._memory_slots[scope_concurrent_key] = scope_slots

        org_slots[slot_id] = now
        self._memory_slots[concurrent_key] = org_slots
        return ConcurrentSlotAcquisition(
            slot_id=slot_id,
            active_count=len(org_slots),
        )

    def _mem_release_slot(
        self,
        organization_id: int,
        slot_id: str,
        scope_key: str | None = None,
    ) -> bool:
        concurrent_key = f"concurrent_calls:{organization_id}"
        removed = False
        if concurrent_key in self._memory_slots:
            removed = bool(self._memory_slots[concurrent_key].pop(slot_id, None))
        if scope_key:
            scope_concurrent_key = f"concurrent_calls:{scope_key}"
            if scope_concurrent_key in self._memory_slots:
                self._memory_slots[scope_concurrent_key].pop(slot_id, None)
        return removed

    def _mem_get_count(self, organization_id: int) -> int:
        stale_cutoff = time.time() - self.stale_call_timeout
        return len(
            self._mem_prune_slots(f"concurrent_calls:{organization_id}", stale_cutoff)
        )

    def _mem_store_mapping_if_absent(
        self,
        workflow_run_id: int,
        organization_id: int,
        slot_id: str,
        scope_key: str | None = None,
    ) -> bool:
        if workflow_run_id in self._memory_workflow_mappings:
            return False
        self._memory_workflow_mappings[workflow_run_id] = {
            "org_id": organization_id,
            "slot_id": slot_id,
            "scope_key": scope_key,
            "created_at": time.time(),
        }
        return True

    def _mem_get_mapping(
        self, workflow_run_id: int
    ) -> Optional[tuple[int, str, str | None]]:
        mapping = self._memory_workflow_mappings.get(workflow_run_id)
        if mapping:
            return (
                int(mapping["org_id"]),
                str(mapping["slot_id"]),
                mapping.get("scope_key"),
            )
        return None

    def _mem_delete_mapping(self, workflow_run_id: int) -> bool:
        return bool(self._memory_workflow_mappings.pop(workflow_run_id, None))

    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis connection"""
        if self.redis_client is None:
            self.redis_client = await aioredis.from_url(
                REDIS_URL, decode_responses=True
            )
        return self.redis_client

    async def acquire_token(
        self,
        organization_id: int,
        rate_limit: int = 1,
        *,
        scope_key: str | None = None,
    ) -> bool:
        """
        Enforces strict rate limit: max N calls per rolling second window
        Returns True if allowed, False if rate limited
        """
        key = f"rate_limit:{scope_key or organization_id}"
        now = time.time()
        window_start = now - 1.0

        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                lua_script = """
                local key = KEYS[1]
                local now = tonumber(ARGV[1])
                local window_start = tonumber(ARGV[2])
                local max_requests = tonumber(ARGV[3])
                
                redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
                local current_requests = redis.call('ZCARD', key)
                
                if current_requests < max_requests then
                    redis.call('ZADD', key, now, ARGV[4])
                    redis.call('EXPIRE', key, 2)
                    return 1
                else
                    return 0
                end
                """
                result = await redis_client.eval(
                    lua_script, 1, key, now, window_start, rate_limit, uuid.uuid4().hex
                )
                self._redis_down_until = 0.0
                return bool(result)
            except Exception as e:
                self._mark_redis_down(e)

        # In-memory fallback
        timestamps = [
            t for t in self._memory_rate_limits.get(key, []) if t > window_start
        ]
        if len(timestamps) < rate_limit:
            timestamps.append(now)
            self._memory_rate_limits[key] = timestamps
            return True
        self._memory_rate_limits[key] = timestamps
        return False

    async def get_next_available_slot(
        self, organization_id: int, rate_limit: int = 1, *, scope_key: str | None = None
    ) -> float:
        """
        Returns seconds until next available slot
        Useful for implementing retry with backoff
        """
        key = f"rate_limit:{scope_key or organization_id}"
        now = time.time()
        window_start = now - 1.0

        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                oldest = await redis_client.zrange(key, 0, 0, withscores=True)
                self._redis_down_until = 0.0
                if not oldest:
                    return 0.0
                oldest_time = oldest[0][1]
                next_available = oldest_time + 1.0
                return max(0, next_available - now)
            except Exception as e:
                self._mark_redis_down(e)

        timestamps = sorted(
            [t for t in self._memory_rate_limits.get(key, []) if t > window_start]
        )
        if len(timestamps) < rate_limit:
            return 0.0
        oldest_time = timestamps[0]
        return max(0, (oldest_time + 1.0) - now)

    async def try_acquire_concurrent_slot(
        self, organization_id: int, max_concurrent: int = 20
    ) -> Optional[str]:
        """
        Try to acquire a concurrent call slot.
        Returns a unique slot_id if successful, None if limit reached.
        """
        acquisition = await self.try_acquire_concurrent_slot_details(
            organization_id, max_concurrent
        )
        return acquisition.slot_id if acquisition else None

    async def try_acquire_concurrent_slot_details(
        self,
        organization_id: int,
        max_concurrent: int = 20,
        *,
        scope_key: str | None = None,
        scope_max_concurrent: int | None = None,
    ) -> Optional[ConcurrentSlotAcquisition]:
        """
        Try to acquire a concurrent call slot.
        Returns the slot_id and post-acquire active count if successful,
        or None if the limit is reached.
        """
        now = time.time()
        stale_cutoff = now - self.stale_call_timeout
        slot_id = f"{int(now * 1000)}_{uuid.uuid4().hex[:8]}"

        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                concurrent_key = f"concurrent_calls:{organization_id}"
                scope_concurrent_key = (
                    f"concurrent_calls:{scope_key}" if scope_key else ""
                )

                lua_script = """
                local key = KEYS[1]
                local scope_key = KEYS[2]
                local fleet_key = KEYS[3]
                local now = tonumber(ARGV[1])
                local max_concurrent = tonumber(ARGV[2])
                local stale_cutoff = tonumber(ARGV[3])
                local slot_id = ARGV[4]
                local scope_max_concurrent = tonumber(ARGV[5])
                local fleet_member = ARGV[6]

                -- Remove stale entries
                redis.call('ZREMRANGEBYSCORE', key, 0, stale_cutoff)

                -- Get current count
                local current_count = redis.call('ZCARD', key)

                if current_count >= max_concurrent then
                    return nil
                end

                if scope_key ~= '' then
                    redis.call('ZREMRANGEBYSCORE', scope_key, 0, stale_cutoff)
                    if redis.call('ZCARD', scope_key) >= scope_max_concurrent then
                        return nil
                    end
                    redis.call('ZADD', scope_key, now, slot_id)
                    redis.call('EXPIRE', scope_key, 3600)
                end

                redis.call('ZADD', key, now, slot_id)
                redis.call('EXPIRE', key, 3600)

                redis.call('ZREMRANGEBYSCORE', fleet_key, 0, stale_cutoff)
                redis.call('ZADD', fleet_key, now, fleet_member)
                redis.call('EXPIRE', fleet_key, 3600)
                return {slot_id, current_count + 1}
                """

                result = await redis_client.eval(
                    lua_script,
                    3,
                    concurrent_key,
                    scope_concurrent_key,
                    FLEET_CONCURRENT_KEY,
                    now,
                    max_concurrent,
                    stale_cutoff,
                    slot_id,
                    scope_max_concurrent if scope_max_concurrent is not None else 0,
                    f"{organization_id}:{slot_id}",
                )
                self._redis_down_until = 0.0
                if not result:
                    return None

                acquired_slot_id, active_count = result
                return ConcurrentSlotAcquisition(
                    slot_id=str(acquired_slot_id),
                    active_count=int(active_count),
                )
            except Exception as e:
                self._mark_redis_down(e)

        # In-memory fallback
        return self._mem_acquire_slot_details(
            organization_id,
            max_concurrent,
            scope_key=scope_key,
            scope_max_concurrent=scope_max_concurrent,
        )

    async def release_concurrent_slot(
        self,
        organization_id: int,
        slot_id: str,
        scope_key: str | None = None,
    ) -> bool | None:
        """
        Release a concurrent call slot (and its scope counter entry, if any).
        Returns True if the slot was released, False if it was already gone.
        """
        if not slot_id:
            return False

        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                concurrent_key = f"concurrent_calls:{organization_id}"
                removed = await redis_client.zrem(concurrent_key, slot_id)
                await redis_client.zrem(
                    FLEET_CONCURRENT_KEY, f"{organization_id}:{slot_id}"
                )
                if scope_key:
                    await redis_client.zrem(f"concurrent_calls:{scope_key}", slot_id)
                self._redis_down_until = 0.0
                return bool(removed)
            except Exception as e:
                self._mark_redis_down(e)

        return self._mem_release_slot(organization_id, slot_id, scope_key=scope_key)

    async def get_concurrent_count(
        self, organization_id: int, *, raise_on_error: bool = False
    ) -> int:
        """
        Get current number of active concurrent calls for an organization.
        Automatically cleans up stale entries.
        """
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                concurrent_key = f"concurrent_calls:{organization_id}"
                stale_cutoff = time.time() - self.stale_call_timeout
                await redis_client.zremrangebyscore(concurrent_key, 0, stale_cutoff)
                count = await redis_client.zcard(concurrent_key)
                self._redis_down_until = 0.0
                return count
            except Exception as e:
                self._mark_redis_down(e)
                if raise_on_error:
                    raise

        return self._mem_get_count(organization_id)

    async def get_fleet_concurrent_count(self) -> int:
        """Total active calls across every org."""
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                stale_cutoff = time.time() - self.stale_call_timeout
                count = await redis_client.zcount(
                    FLEET_CONCURRENT_KEY, stale_cutoff, "+inf"
                )
                self._redis_down_until = 0.0
                return count
            except Exception as e:
                self._mark_redis_down(e)

        stale_cutoff = time.time() - self.stale_call_timeout
        total = 0
        for k, slots in self._memory_slots.items():
            if k.startswith("concurrent_calls:") and not k.startswith(
                "concurrent_calls:campaign:"
            ):
                total += len({s: ts for s, ts in slots.items() if ts > stale_cutoff})
        return total

    async def store_workflow_slot_mapping(
        self, workflow_run_id: int, organization_id: int, slot_id: str
    ) -> bool:
        """Store the mapping between workflow_run_id and its concurrent slot."""
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                mapping_key = f"workflow_slot_mapping:{workflow_run_id}"
                await redis_client.hset(
                    mapping_key,
                    mapping={"org_id": organization_id, "slot_id": slot_id},
                )
                await redis_client.expire(mapping_key, self.stale_call_timeout)
                self._redis_down_until = 0.0
                return True
            except Exception as e:
                self._mark_redis_down(e)

        self._memory_workflow_mappings[workflow_run_id] = {
            "org_id": organization_id,
            "slot_id": slot_id,
            "created_at": time.time(),
        }
        return True

    async def store_workflow_slot_mapping_if_absent(
        self,
        workflow_run_id: int,
        organization_id: int,
        slot_id: str,
        scope_key: str | None = None,
    ) -> bool:
        """Store mapping only if no mapping already exists."""
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                mapping_key = f"workflow_slot_mapping:{workflow_run_id}"
                lua_script = """
                local key = KEYS[1]
                local org_id = ARGV[1]
                local slot_id = ARGV[2]
                local ttl = tonumber(ARGV[3])
                local scope_key = ARGV[4]

                if redis.call('EXISTS', key) == 1 then
                    return 0
                end

                redis.call('HSET', key, 'org_id', org_id, 'slot_id', slot_id)
                if scope_key ~= '' then
                    redis.call('HSET', key, 'scope_key', scope_key)
                end
                redis.call('EXPIRE', key, ttl)
                return 1
                """
                stored = await redis_client.eval(
                    lua_script,
                    1,
                    mapping_key,
                    organization_id,
                    slot_id,
                    self.stale_call_timeout,
                    scope_key or "",
                )
                self._redis_down_until = 0.0
                return bool(stored)
            except Exception as e:
                self._mark_redis_down(e)

        return self._mem_store_mapping_if_absent(
            workflow_run_id, organization_id, slot_id, scope_key=scope_key
        )

    async def get_workflow_slot_mapping(
        self, workflow_run_id: int
    ) -> Optional[tuple[int, str, str | None]]:
        """Get the concurrent slot mapping for a workflow run."""
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                mapping_key = f"workflow_slot_mapping:{workflow_run_id}"
                mapping = await redis_client.hgetall(mapping_key)
                self._redis_down_until = 0.0
                if mapping and "org_id" in mapping and "slot_id" in mapping:
                    return (
                        int(mapping["org_id"]),
                        mapping["slot_id"],
                        mapping.get("scope_key") or None,
                    )
                return None
            except Exception as e:
                self._mark_redis_down(e)

        return self._mem_get_mapping(workflow_run_id)

    async def reconcile_workflow_slot_mapping(
        self,
        workflow_run_id: int,
        *,
        organization_id: int,
        slot_id: str | None = None,
        scope_key: str | None = None,
    ) -> None:
        """Durable cleanup, including after the workflow mapping's TTL expires."""
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                mapping_key = f"workflow_slot_mapping:{workflow_run_id}"
                mapping = await redis_client.hgetall(mapping_key)
                slots = {(slot_id, scope_key)} if slot_id else set()
                if mapping:
                    if int(mapping["org_id"]) != organization_id:
                        raise ValueError(
                            f"Slot mapping organization mismatch for run {workflow_run_id}"
                        )
                    slots.add((mapping["slot_id"], mapping.get("scope_key") or None))
                for reserved_slot_id, reserved_scope in slots:
                    await self.release_concurrent_slot(
                        organization_id, reserved_slot_id, scope_key=reserved_scope
                    )
                await redis_client.delete(mapping_key)
                self._redis_down_until = 0.0
                return
            except Exception as e:
                self._mark_redis_down(e)

        # In-memory cleanup
        mapping = self._mem_get_mapping(workflow_run_id)
        if mapping:
            self._mem_release_slot(organization_id, mapping[1], scope_key=mapping[2])
        if slot_id:
            self._mem_release_slot(organization_id, slot_id, scope_key=scope_key)
        self._mem_delete_mapping(workflow_run_id)

    async def delete_workflow_slot_mapping(self, workflow_run_id: int) -> bool:
        """Delete the workflow slot mapping after releasing the slot."""
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                mapping_key = f"workflow_slot_mapping:{workflow_run_id}"
                deleted = await redis_client.delete(mapping_key)
                self._redis_down_until = 0.0
                return bool(deleted)
            except Exception as e:
                self._mark_redis_down(e)

        return self._mem_delete_mapping(workflow_run_id)

    async def select_from_number(
        self,
        organization_id: int,
        telephony_configuration_id: int | None,
        from_numbers: list[str],
    ) -> str | None:
        """Rotate active caller IDs without reserving them for a call's lifetime."""
        numbers = sorted(set(from_numbers))
        if not numbers:
            return None
        key = f"caller_id_rotation:{organization_id}:{telephony_configuration_id}"
        if self._should_try_redis():
            try:
                redis_client = await self._get_redis()
                index = await redis_client.eval(
                    "local n = redis.call('INCR', KEYS[1]); "
                    "redis.call('EXPIRE', KEYS[1], 86400); return n - 1",
                    1,
                    key,
                )
                self._redis_down_until = 0.0
                return numbers[int(index) % len(numbers)]
            except Exception as exc:
                self._mark_redis_down(exc)

        return numbers[0]

    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            try:
                await self.redis_client.close()
            except Exception:
                pass
            self.redis_client = None


# Global rate limiter instance
rate_limiter = RateLimiter()
