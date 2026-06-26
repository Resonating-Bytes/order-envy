import { API_BASE_URL } from '../config';
import { clearSession, getStoredTokens, saveSession } from '../storage/session';
import { assertRemoteWriteAllowed } from '../lib/compatibility';
import { getIsOnline, isNetworkFailureError } from '../lib/network';
import {
    getLocalRestaurantResponse,
    getLocalMenuItemResponse,
    getLocalCheckinData,
    getCachedCheckinData,
    handleOfflineWrite,
    isOfflineQueuedResult,
    listPendingLocalRestaurants,
    mergeRestaurantListData,
    resolveRestaurantIdForRead,
} from '../lib/offlineWrites';
import { isLocalId } from '../lib/offlineIds';
import {
    emitFetchMeta,
    getCache,
    getCacheEntry,
    getLocalEntities,
    getOutbox,
    getSyncMeta,
    setCache,
    setSyncMeta,
} from '../storage/offlineStore';
import { getRatingOptions } from '../utils/ratings';
import { buildRestaurantsListPath } from '../utils/restaurantApiPaths';
import { getProtectedRestaurantIds } from '../lib/cachePolicy';
import { mergeRestaurantDetailFromServer } from '../lib/cacheMerge';
import { fetchAndMergeRestaurantList } from '../lib/listSync';

export class ApiError extends Error {
    constructor(message, status, extras = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        Object.assign(this, extras);
    }
}

let refreshPromise = null;

function isWriteMethod(method) {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase());
}

function isAuthPath(path) {
    return path.startsWith('/auth/');
}

function isNetworkFailure(err) {
    return isNetworkFailureError(err);
}

function cacheMetaForGetPath(path) {
    if (!path.startsWith('/restaurants?')) return {};

    const query = path.slice(path.indexOf('?') + 1);
    const params = new URLSearchParams(query);
    const lat = params.get('lat');
    const long = params.get('long');
    if (lat == null || long == null) return {};

    const queryLat = Number(lat);
    const queryLong = Number(long);
    if (Number.isNaN(queryLat) || Number.isNaN(queryLong)) return {};

    return { queryLat, queryLong };
}

async function readCachedGet(path) {
    const cached = await getCache(path);
    if (!cached) return null;
    emitFetchMeta({ path, fromCache: true, cachedAt: cached.cachedAt });
    return cached.data;
}

async function writeCachedGet(path, data) {
    const meta = cacheMetaForGetPath(path);
    if (meta.queryLat != null && meta.queryLong != null) {
        await setSyncMeta({ lastLat: meta.queryLat, lastLong: meta.queryLong });
    }
    await setCache(path, data, meta);
}

async function refreshTokens(refreshToken) {
    if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new ApiError(data.error || 'Session expired', res.status);
                }
                await saveSession(data);
                return data;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

export async function remoteApiFetch(path, options = {}, retry = true) {
    const tokens = await getStoredTokens();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 401 && retry && tokens?.refreshToken) {
        try {
            const refreshed = await refreshTokens(tokens.refreshToken);
            return remoteApiFetch(path, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    Authorization: `Bearer ${refreshed.accessToken}`,
                },
            }, false);
        } catch (err) {
            await clearSession();
            throw err;
        }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ApiError(
            data.error || response.statusText || 'Request failed',
            response.status,
            data
        );
    }

    return data;
}

export async function apiFetch(path, options = {}, retry = true) {
    const method = (options.method || 'GET').toUpperCase();
    const online = getIsOnline();

    if (options._remoteOnly) {
        return remoteApiFetch(path, options, retry);
    }

    if (isWriteMethod(method) && !isAuthPath(path)) {
        const queueWrite = () => handleOfflineWrite(path, method, options.body);
        if (!online) {
            return queueWrite();
        }
        assertRemoteWriteAllowed();
        try {
            return await remoteApiFetch(path, options, retry);
        } catch (err) {
            if (isNetworkFailure(err)) {
                return queueWrite();
            }
            throw err;
        }
    }

    if (method === 'GET' && !online) {
        const cached = await readCachedGet(path);
        if (cached) return cached;
        throw new ApiError('No cached data available offline', 0, { offline: true });
    }

    try {
        const data = await remoteApiFetch(path, options, retry);
        if (method === 'GET') {
            await writeCachedGet(path, data);
            emitFetchMeta({ path, fromCache: false });
        }
        return data;
    } catch (err) {
        if (method === 'GET' && (isNetworkFailure(err) || !online)) {
            const cached = await readCachedGet(path);
            if (cached) return cached;
        }
        throw err;
    }
}

export async function login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ApiError(data.error || 'Login failed', response.status);
    }
    await saveSession(data);
    return data;
}

export async function loginWithGoogle(payload) {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data.error
            || (response.status === 404
                ? 'Google sign-in API is not deployed yet'
                : `Google sign-in failed (${response.status})`);
        throw new ApiError(message, response.status, data);
    }
    await saveSession(data);
    return data;
}

export async function logout() {
    const tokens = await getStoredTokens();
    if (tokens?.refreshToken) {
        try {
            await apiFetch('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: tokens.refreshToken }),
            }, false);
        } catch (err) {
            // still clear local session
        }
    }
    await clearSession();
}

export async function fetchRestaurantsCached(params = {}) {
    const path = buildRestaurantsListPath(params);
    const entry = await getCacheEntry(path, { allowStale: true });
    const locals = await listPendingLocalRestaurants();
    if (!entry?.data && !locals.length) {
        return null;
    }
    return mergeRestaurantListData(entry?.data || { restaurants: [], recommendations: [] }, locals);
}

export async function fetchRestaurants({ lat, long, filterDist } = {}) {
    const path = buildRestaurantsListPath({ lat, long, filterDist });

    try {
        if (getIsOnline()) {
            const [syncMeta, cachedEntry, outbox, localEntities] = await Promise.all([
                getSyncMeta(),
                getCacheEntry(path, { allowStale: true, touch: false }),
                getOutbox(),
                getLocalEntities(),
            ]);
            const protectedIds = getProtectedRestaurantIds(outbox, localEntities);
            const { merged, syncedAt } = await fetchAndMergeRestaurantList({
                remoteFetch: remoteApiFetch,
                lat,
                long,
                filterDist,
                cachedData: cachedEntry?.data || {},
                protectedIds,
                syncMeta,
            });
            await writeCachedGet(path, merged);
            const syncPatch = { lastSyncedAt: syncedAt };
            if (lat != null && long != null) {
                syncPatch.lastLat = Number(lat);
                syncPatch.lastLong = Number(long);
            }
            await setSyncMeta(syncPatch);
            emitFetchMeta({ path, fromCache: false });
            const locals = await listPendingLocalRestaurants();
            return mergeRestaurantListData(merged, locals);
        }

        const data = await apiFetch(path);
        const locals = await listPendingLocalRestaurants();
        return mergeRestaurantListData(data, locals);
    } catch (err) {
        if (err.offline || isNetworkFailure(err)) {
            const cached = await getCacheEntry(path, { allowStale: true, touch: false });
            const locals = await listPendingLocalRestaurants();
            if (cached?.data || locals.length) {
                return mergeRestaurantListData(cached?.data || { restaurants: [] }, locals);
            }
        }
        throw err;
    }
}

export async function fetchRestaurantCached(restaurantId) {
    const resolvedId = await resolveRestaurantIdForRead(restaurantId);
    if (isLocalId(resolvedId)) {
        return getLocalRestaurantResponse(resolvedId);
    }
    const entry = await getCacheEntry(`/restaurants/${resolvedId}`, { allowStale: true });
    return entry?.data || null;
}

export async function fetchRestaurant(restaurantId) {
    const resolvedId = await resolveRestaurantIdForRead(restaurantId);
    if (isLocalId(resolvedId)) {
        const local = await getLocalRestaurantResponse(resolvedId);
        if (local) return local;
    }

    const path = `/restaurants/${resolvedId}`;

    try {
        if (getIsOnline()) {
            const [cachedEntry, outbox, localEntities] = await Promise.all([
                getCacheEntry(path, { allowStale: true, touch: false }),
                getOutbox(),
                getLocalEntities(),
            ]);
            const protectedIds = getProtectedRestaurantIds(outbox, localEntities);
            const serverData = await remoteApiFetch(path, { _remoteOnly: true });
            const merged = mergeRestaurantDetailFromServer(
                serverData,
                cachedEntry?.data,
                { isProtected: protectedIds.has(String(resolvedId)) },
            );
            await writeCachedGet(path, merged);
            emitFetchMeta({ path, fromCache: false });
            return merged;
        }

        return apiFetch(path);
    } catch (err) {
        if (err.offline || isNetworkFailure(err)) {
            const cached = await getCacheEntry(path, { allowStale: true, touch: false });
            if (cached?.data) return cached.data;
        }
        throw err;
    }
}

export { isOfflineQueuedResult };

export async function fetchCheckinData(restaurantId) {
    const resolvedId = await resolveRestaurantIdForRead(restaurantId);
    if (isLocalId(resolvedId)) {
        const local = await getLocalCheckinData(resolvedId);
        if (local) return local;
    }
    try {
        return await apiFetch(`/restaurants/${resolvedId}/checkin`);
    } catch (err) {
        const cached = await getCachedCheckinData(resolvedId);
        if (cached) {
            if (!getIsOnline()) {
                const detailEntry = await getCache(`/restaurants/${resolvedId}`);
                emitFetchMeta({
                    path: `/restaurants/${resolvedId}/checkin`,
                    fromCache: true,
                    cachedAt: detailEntry?.cachedAt || null,
                });
            }
            return cached;
        }
        throw err;
    }
}

export async function fetchRatingMeta() {
    const path = '/restaurants/meta/ratings';
    if (!getIsOnline()) {
        const cached = await getCache(path);
        return {
            ratingInfo: getRatingOptions(cached?.data?.ratingInfo || []),
        };
    }
    try {
        const meta = await apiFetch(path);
        return {
            ratingInfo: getRatingOptions(meta?.ratingInfo || []),
        };
    } catch (err) {
        const cached = await getCache(path);
        return {
            ratingInfo: getRatingOptions(cached?.data?.ratingInfo || []),
        };
    }
}

export async function submitCheckin(restaurantId, body) {
    return apiFetch(`/restaurants/${restaurantId}/checkin`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function fetchCurrentUser() {
    return apiFetch('/users/me');
}

export async function updateUserProfile(userId, data) {
    return apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function geocodeAddress(address) {
    return apiFetch(`/location/latlong/${encodeURIComponent(address)}`);
}

export async function reverseGeocode(lat, long) {
    const params = new URLSearchParams({
        lat: String(lat),
        long: String(long),
    });
    return apiFetch(`/location/address?${params}`);
}

export async function createRestaurant(data) {
    return apiFetch('/restaurants', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateRestaurant(restaurantId, data) {
    return apiFetch(`/restaurants/${restaurantId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteRestaurant(restaurantId) {
    return apiFetch(`/restaurants/${restaurantId}`, {
        method: 'DELETE',
    });
}

export async function fetchMenuCategories(restaurantId) {
    return apiFetch(`/restaurants/${restaurantId}/menu-items/categories`);
}

export async function fetchMenuItem(restaurantId, menuItemId) {
    if (isLocalId(menuItemId)) {
        const local = await getLocalMenuItemResponse(menuItemId);
        if (local) return local;
    }
    return apiFetch(`/restaurants/${restaurantId}/menu-items/${menuItemId}`);
}

export async function createMenuItem(restaurantId, data) {
    return apiFetch(`/restaurants/${restaurantId}/menu-items`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateMenuItem(restaurantId, menuItemId, data) {
    return apiFetch(`/restaurants/${restaurantId}/menu-items/${menuItemId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteMenuItem(restaurantId, menuItemId) {
    return apiFetch(`/restaurants/${restaurantId}/menu-items/${menuItemId}`, {
        method: 'DELETE',
    });
}

export async function fetchFriendRequests() {
    return apiFetch('/friends/requests');
}

export async function requestFriend(body) {
    return apiFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function inviteFriend(email) {
    return apiFetch('/friends/invite', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function confirmFriend(token) {
    return apiFetch(`/friends/confirm/${token}`, {
        method: 'POST',
    });
}

export async function declineFriend(token) {
    return apiFetch(`/friends/decline/${token}`, {
        method: 'DELETE',
    });
}

export async function removeFriend(friendId) {
    return apiFetch(`/friends/${friendId}`, {
        method: 'DELETE',
    });
}

export async function fetchRecommendations() {
    return apiFetch('/recommendations');
}

export async function createRecommendation({ friendId, restaurantId, menuItemId }) {
    return apiFetch('/recommendations', {
        method: 'POST',
        body: JSON.stringify({
            friendId,
            restaurantId,
            menuItemId,
        }),
    });
}

export async function deleteRecommendation(recommendationId) {
    return apiFetch(`/recommendations/${recommendationId}`, {
        method: 'DELETE',
    });
}
