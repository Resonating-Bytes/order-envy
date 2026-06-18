import { API_BASE_URL } from '../config';
import { clearSession, getStoredTokens, saveSession } from '../storage/session';

export class ApiError extends Error {
    constructor(message, status, extras = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        Object.assign(this, extras);
    }
}

let refreshPromise = null;

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

export async function apiFetch(path, options = {}, retry = true) {
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
            return apiFetch(path, {
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

export async function fetchRestaurants({ lat, long, filterDist } = {}) {
    const params = new URLSearchParams();

    if (filterDist === 'all') {
        params.set('filterDist', 'all');
    } else if (lat != null && long != null && filterDist != null) {
        params.set('lat', String(lat));
        params.set('long', String(long));
        params.set('filterDist', String(filterDist));
    }

    const query = params.toString();
    return apiFetch(`/restaurants${query ? `?${query}` : ''}`);
}

export async function fetchRestaurant(restaurantId) {
    return apiFetch(`/restaurants/${restaurantId}`);
}

export async function fetchCheckinData(restaurantId) {
    return apiFetch(`/restaurants/${restaurantId}/checkin`);
}

export async function fetchRatingMeta() {
    return apiFetch('/restaurants/meta/ratings');
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
