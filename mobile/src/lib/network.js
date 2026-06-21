import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../config';

let isOnline = true;
const booleanListeners = new Set();
let pollTimer = null;
let unsubscribeNetInfo = null;
let appStateSub = null;

const OFFLINE_POLL_MS = 5000;
const PROBE_TIMEOUT_MS = 4000;

function isReachableState(state) {
    if (state.isConnected !== true) return false;
    if (state.type === 'none' || state.type === 'unknown') return false;
    return true;
}

function notifyBooleanListeners() {
    booleanListeners.forEach((listener) => listener(isOnline));
}

function setOnline(nextOnline) {
    if (nextOnline === isOnline) return;
    isOnline = nextOnline;
    notifyBooleanListeners();
    if (nextOnline) {
        stopOfflinePoll();
    } else {
        startOfflinePoll();
    }
}

async function probeBackendReachable() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

/** Re-check connectivity (NetInfo + optional health probe when reconnecting). */
export async function refreshNetworkStatus() {
    const state = await NetInfo.fetch();
    let nextOnline = isReachableState(state);

    if (!nextOnline && state.isConnected === true) {
        nextOnline = await probeBackendReachable();
    }

    if (nextOnline && state.isConnected === true && state.isInternetReachable === false) {
        nextOnline = await probeBackendReachable();
    }

    setOnline(nextOnline);
    return nextOnline;
}

function startOfflinePoll() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
        refreshNetworkStatus().catch(() => {});
    }, OFFLINE_POLL_MS);
}

function stopOfflinePoll() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
}

/** Sync snapshot used by apiFetch fast path. */
export function getIsOnline() {
    return isOnline;
}

/** True when the device likely has a route to the internet (best-effort). */
export async function isNetworkOnline() {
    const state = await NetInfo.fetch();
    if (!isReachableState(state)) {
        if (state.isConnected === true) {
            return probeBackendReachable();
        }
        return false;
    }
    return true;
}

export function isNetworkOnlineSync(state) {
    return isReachableState(state ?? {});
}

export function isNetworkFailureError(error) {
    if (error?.name === 'TypeError') return true;
    const message = String(error?.message ?? error ?? '').toLowerCase();
    return (
        message.includes('network request failed')
        || message.includes('failed to fetch')
        || message.includes('network error')
        || message.includes('load failed')
    );
}

/** Raw NetInfo events — used by the outbox worker. */
export function subscribeNetwork(listener) {
    return NetInfo.addEventListener(listener);
}

/** Boolean online/offline for UI and apiFetch. */
export function subscribeOnlineStatus(listener) {
    booleanListeners.add(listener);
    listener(isOnline);
    return () => booleanListeners.delete(listener);
}

export function initNetworkStatus() {
    refreshNetworkStatus().catch(() => {});

    unsubscribeNetInfo = subscribeNetwork((nextState) => {
        const nextOnline = isReachableState(nextState);
        if (nextOnline) {
            setOnline(true);
            return;
        }
        if (nextState.isConnected === true) {
            refreshNetworkStatus().catch(() => {});
            return;
        }
        setOnline(false);
    });

    appStateSub = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
            refreshNetworkStatus().catch(() => {});
        }
    });

    if (!isOnline) {
        startOfflinePoll();
    }

    return () => {
        unsubscribeNetInfo?.();
        unsubscribeNetInfo = null;
        appStateSub?.remove();
        appStateSub = null;
        stopOfflinePoll();
    };
}
