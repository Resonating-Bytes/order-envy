import { buildRestaurantsListPath } from '../utils/restaurantApiPaths';
import { FULL_SYNC_INTERVAL_MS } from '../config/offline';
import { applyListSyncResponse } from './cacheMerge';

export function shouldUseDelta(syncMeta = {}, cachedData = {}) {
    if (!syncMeta.lastSyncedAt || !(cachedData.restaurants || []).length) {
        return false;
    }
    if (Date.now() - syncMeta.lastSyncedAt > FULL_SYNC_INTERVAL_MS) {
        return false;
    }
    return true;
}

/**
 * Fetch full or delta list from server and merge into cached regional snapshot.
 */
export async function fetchAndMergeRestaurantList({
    remoteFetch,
    lat,
    long,
    filterDist,
    cachedData = {},
    protectedIds = new Set(),
    syncMeta = {},
}) {
    const basePath = buildRestaurantsListPath({ lat, long, filterDist });
    const useDelta = shouldUseDelta(syncMeta, cachedData);
    const fetchPath = useDelta
        ? buildRestaurantsListPath({ lat, long, filterDist, since: syncMeta.lastSyncedAt })
        : basePath;

    const serverData = await remoteFetch(fetchPath, { _remoteOnly: true });
    const merged = applyListSyncResponse(serverData, cachedData, protectedIds);

    return {
        basePath,
        fetchPath,
        mode: serverData.mode || (useDelta ? 'delta' : 'full'),
        merged,
        syncedAt: serverData.syncedAt ?? Date.now(),
    };
}
