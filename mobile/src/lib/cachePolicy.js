import { distanceMiles } from '../utils/distance';
import {
    CACHE_EVICT_DISTANCE_MILES,
    CACHE_MAX_AGE_MS,
} from '../config/offline';

const META_PATH_PREFIXES = [
    '/restaurants/meta/',
];

export function isRestaurantListPath(path) {
    return path === '/restaurants' || (path.startsWith('/restaurants?') && !path.includes('/restaurants/'));
}

export function isRestaurantDetailPath(path) {
    return /^\/restaurants\/[^/?]+$/.test(path);
}

export function isRestaurantCheckinPath(path) {
    return /^\/restaurants\/[^/]+\/checkin$/.test(path);
}

export function isEvictableCachePath(path) {
    if (META_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return false;
    }
    return isRestaurantListPath(path)
        || isRestaurantDetailPath(path)
        || isRestaurantCheckinPath(path);
}

export function restaurantIdFromCachePath(path) {
    const detailMatch = path.match(/^\/restaurants\/([^/?]+)/);
    return detailMatch?.[1] || null;
}

export function getProtectedRestaurantIds(outbox = [], localEntities = {}) {
    const protectedIds = new Set(
        Object.keys(localEntities.restaurants || {}),
    );

    outbox.forEach((item) => {
        const restaurantMatch = item.path?.match(/^\/restaurants\/([^/]+)/);
        if (restaurantMatch) {
            protectedIds.add(restaurantMatch[1]);
        }
        if (item.localEntityType === 'restaurants' && item.localEntityId) {
            protectedIds.add(item.localEntityId);
        }
        const menuMatch = item.path?.match(/^\/restaurants\/([^/]+)\/menu-items/);
        if (menuMatch) {
            protectedIds.add(menuMatch[1]);
        }
    });

    return protectedIds;
}

export function shouldEvictCacheEntry(entry, {
    now = Date.now(),
    lastLat = null,
    lastLong = null,
    maxAgeMs = CACHE_MAX_AGE_MS,
    maxDistanceMiles = CACHE_EVICT_DISTANCE_MILES,
    restaurantId = null,
    protectedIds = new Set(),
} = {}) {
    if (!entry) return false;
    if (restaurantId && protectedIds.has(String(restaurantId))) {
        return false;
    }

    const accessedAt = entry.lastAccessedAt || entry.cachedAt || 0;
    if (now - accessedAt > maxAgeMs) {
        return true;
    }

    if (lastLat == null || lastLong == null) {
        return false;
    }

    const entryLat = entry.lat ?? entry.queryLat;
    const entryLong = entry.long ?? entry.queryLong;
    if (entryLat == null || entryLong == null) {
        return false;
    }

    return distanceMiles(lastLat, lastLong, entryLat, entryLong) > maxDistanceMiles;
}

/**
 * Drop aged or far-away regional cache entries. User ledger (outbox, entities, id map) is untouched.
 */
export async function evictRegionalCache(store, options = {}) {
    const {
        now = Date.now(),
        maxAgeMs = CACHE_MAX_AGE_MS,
        maxDistanceMiles = CACHE_EVICT_DISTANCE_MILES,
    } = options;

    const [cache, syncMeta, outbox, localEntities] = await Promise.all([
        store.readCacheMap(),
        store.getSyncMeta(),
        store.getOutbox(),
        store.getLocalEntities(),
    ]);

    const protectedIds = getProtectedRestaurantIds(outbox, localEntities);
    const next = { ...cache };
    let removed = 0;

    Object.entries(cache).forEach(([path, entry]) => {
        if (!isEvictableCachePath(path)) return;

        const restaurantId = restaurantIdFromCachePath(path);
        if (shouldEvictCacheEntry(entry, {
            now,
            lastLat: syncMeta.lastLat,
            lastLong: syncMeta.lastLong,
            maxAgeMs,
            maxDistanceMiles,
            restaurantId,
            protectedIds,
        })) {
            delete next[path];
            removed += 1;
        }
    });

    if (removed > 0) {
        await store.writeCacheMap(next);
    }

    return { removed };
}
