/** Bump when offline cache/outbox shape changes. Clears stale local data on upgrade. */
export const LOCAL_SCHEMA_VERSION = 1;

/** Max age for cached GET responses shown offline (7 days). */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
