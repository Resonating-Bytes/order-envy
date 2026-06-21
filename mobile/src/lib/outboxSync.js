import { AppState } from 'react-native';
import { drainOutbox } from './offlineWrites';
import { canUseRemoteWrite, getCachedCompatibility } from './compatibility';
import {
    getIsOnline,
    isNetworkOnline,
    isNetworkOnlineSync,
    subscribeNetwork,
} from './network';
import { getOutbox } from '../storage/offlineStore';

let flushInFlight = null;
let retryTimer = null;
let retryAttempt = 0;
let lastError = null;
let remoteFetchImpl = null;
let notifyState = () => {};

const MAX_BACKOFF_MS = 5 * 60 * 1000;

function canFlush() {
    return canUseRemoteWrite(getCachedCompatibility());
}

function scheduleRetry() {
    if (retryTimer) return;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * (2 ** retryAttempt));
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
        retryTimer = null;
        flushOutbox().catch(() => {});
    }, delay);
}

function clearRetry() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
}

export async function getOutboxSyncSnapshot() {
    const outbox = await getOutbox();
    return {
        pendingCount: outbox.length,
        lastError,
        isSyncing: Boolean(flushInFlight),
    };
}

/**
 * Replay pending outbox rows when online and remote writes are allowed.
 * Single-flight with exponential backoff on failure (BFR pattern).
 */
export async function flushOutbox() {
    if (!remoteFetchImpl) {
        return { flushed: 0, remaining: 0, failed: false };
    }
    if (flushInFlight) return flushInFlight;

    flushInFlight = (async () => {
        notifyState();

        if (!canFlush()) {
            notifyState();
            return {
                flushed: 0,
                remaining: (await getOutbox()).length,
                blocked: true,
                failed: false,
            };
        }

        if (!(await isNetworkOnline()) && !getIsOnline()) {
            notifyState();
            return {
                flushed: 0,
                remaining: (await getOutbox()).length,
                failed: false,
            };
        }

        const pending = await getOutbox();
        if (!pending.length) {
            lastError = null;
            retryAttempt = 0;
            clearRetry();
            notifyState();
            return { flushed: 0, remaining: 0, failed: false };
        }

        const result = await drainOutbox(remoteFetchImpl);

        if (result.blocked) {
            lastError = result.error || null;
            notifyState();
            return result;
        }

        if (result.failed) {
            lastError = result.error || 'Sync failed';
            scheduleRetry();
            notifyState();
            return result;
        }

        lastError = null;
        retryAttempt = 0;
        clearRetry();
        notifyState();
        return result;
    })();

    try {
        return await flushInFlight;
    } finally {
        flushInFlight = null;
        notifyState();
    }
}

/** NetInfo reconnect, app foreground, and initial mount (BFR pattern). */
export function startOutboxSync({ remoteFetch, onStateChange }) {
    remoteFetchImpl = remoteFetch;
    notifyState = onStateChange ?? (() => {});

    const trigger = () => {
        flushOutbox().catch(() => {});
    };

    const unsubNet = subscribeNetwork((state) => {
        if (isNetworkOnlineSync(state)) {
            trigger();
        } else {
            notifyState();
        }
    });

    const appSub = AppState.addEventListener('change', (next) => {
        if (next === 'active') trigger();
    });

    trigger();

    return () => {
        notifyState = () => {};
        remoteFetchImpl = null;
        unsubNet();
        appSub.remove();
        clearRetry();
    };
}

export function getOutboxSyncLastError() {
    return lastError;
}
