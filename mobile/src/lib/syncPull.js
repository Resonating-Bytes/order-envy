import { buildRestaurantsListPath } from '../utils/restaurantApiPaths';
import {
    getLocalEntities,
    getOutbox,
    getSyncMeta,
    readCacheMap,
    setCache,
    setSyncMeta,
} from '../storage/offlineStore';
import { SYNC_PULL_FILTER_DIST_MILES } from '../config/offline';
import { getProtectedRestaurantIds } from './cachePolicy';
import { fetchAndMergeRestaurantList } from './listSync';

/**
 * Pull a regional restaurant snapshot and merge into cache before flushing outbox writes.
 * Uses delta sync when a recent watermark and cached list exist; otherwise full fetch.
 */
export async function pullBeforeFlush(remoteFetch) {
    const syncMeta = await getSyncMeta();
    const { lastLat, lastLong } = syncMeta;

    if (lastLat == null || lastLong == null) {
        return { pulled: false, reason: 'no_location' };
    }

    const filterDist = SYNC_PULL_FILTER_DIST_MILES;
    const [cache, outbox, localEntities] = await Promise.all([
        readCacheMap(),
        getOutbox(),
        getLocalEntities(),
    ]);

    const basePath = buildRestaurantsListPath({
        lat: lastLat,
        long: lastLong,
        filterDist,
    });
    const cachedEntry = cache[basePath];
    const protectedIds = getProtectedRestaurantIds(outbox, localEntities);

    let result;
    try {
        result = await fetchAndMergeRestaurantList({
            remoteFetch,
            lat: lastLat,
            long: lastLong,
            filterDist,
            cachedData: cachedEntry?.data || {},
            protectedIds,
            syncMeta,
        });
    } catch (err) {
        return { pulled: false, reason: 'fetch_failed', error: err.message };
    }

    await setCache(result.basePath, result.merged, {
        queryLat: lastLat,
        queryLong: lastLong,
    });
    await setSyncMeta({ lastSyncedAt: result.syncedAt });

    return {
        pulled: true,
        path: result.basePath,
        mode: result.mode,
        protectedCount: protectedIds.size,
    };
}
