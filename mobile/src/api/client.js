import { API_BASE_URL } from '../config';
import { clearSession, getStoredTokens, saveSession } from '../storage/session';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
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
        throw new ApiError(data.error || response.statusText || 'Request failed', response.status);
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

export async function fetchRestaurants() {
    return apiFetch('/restaurants');
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
