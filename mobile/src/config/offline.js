/** Bump when offline cache/outbox shape changes. Clears stale local data on upgrade. */
export const LOCAL_SCHEMA_VERSION = 1;

/** Max age for cached GET responses shown offline (7 days). */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Drop cached restaurants farther than this from last known location. */
export const CACHE_EVICT_DISTANCE_MILES = 150;

/** Default radius when pulling a regional snapshot before outbox flush. */
export const SYNC_PULL_FILTER_DIST_MILES = 100;

/** Re-fetch full list when watermark is older than this (matches cache TTL). */
export const FULL_SYNC_INTERVAL_MS = CACHE_MAX_AGE_MS;
