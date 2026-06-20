import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { flushOutbox as runFlushOutbox } from '../lib/offlineWrites';
import { getIsOnline, initNetworkStatus, subscribeOnlineStatus } from '../lib/network';
import {
    ensureOfflineSchema,
    getOutbox,
    subscribeFetchMeta,
    subscribePendingChange,
} from '../storage/offlineStore';

const NetworkContext = createContext(null);

export function NetworkProvider({ children, remoteFetch }) {
    const [isOnline, setIsOnline] = useState(getIsOnline());
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSyncError, setLastSyncError] = useState('');
    const [usingCachedData, setUsingCachedData] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);

    const refreshPendingCount = useCallback(async () => {
        const outbox = await getOutbox();
        setPendingCount(outbox.length);
    }, []);

    const flushOutbox = useCallback(async () => {
        if (!remoteFetch || !getIsOnline()) {
            await refreshPendingCount();
            return { flushed: 0, remaining: pendingCount };
        }

        setSyncing(true);
        setLastSyncError('');
        try {
            const result = await runFlushOutbox(remoteFetch);
            await refreshPendingCount();
            if (result.blocked && result.error) {
                setLastSyncError(result.error);
            } else if (result.remaining > 0) {
                const outbox = await getOutbox();
                const failed = outbox.find((item) => item.lastError);
                if (failed?.lastError) {
                    setLastSyncError(failed.lastError);
                }
            }
            return result;
        } catch (err) {
            setLastSyncError(err.message || 'Sync failed');
            throw err;
        } finally {
            setSyncing(false);
        }
    }, [pendingCount, refreshPendingCount, remoteFetch]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            await ensureOfflineSchema();
            if (!cancelled) {
                await refreshPendingCount();
            }
        })();

        initNetworkStatus();
        const unsubNetwork = subscribeOnlineStatus((online) => {
            setIsOnline(online);
        });
        const unsubFetchMeta = subscribeFetchMeta((meta) => {
            setUsingCachedData(!!meta.fromCache);
            setCachedAt(meta.cachedAt || null);
        });
        const unsubPending = subscribePendingChange(() => {
            refreshPendingCount();
        });

        return () => {
            cancelled = true;
            unsubNetwork();
            unsubFetchMeta();
            unsubPending();
        };
    }, [refreshPendingCount]);

    useEffect(() => {
        if (!isOnline || !remoteFetch) return undefined;

        const timer = setTimeout(() => {
            flushOutbox().catch(() => {});
        }, 500);

        return () => clearTimeout(timer);
    }, [isOnline, flushOutbox, remoteFetch]);

    const value = useMemo(() => ({
        isOnline,
        pendingCount,
        syncing,
        lastSyncError,
        usingCachedData,
        cachedAt,
        flushOutbox,
        refreshPendingCount,
    }), [
        isOnline,
        pendingCount,
        syncing,
        lastSyncError,
        usingCachedData,
        cachedAt,
        flushOutbox,
        refreshPendingCount,
    ]);

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within NetworkProvider');
    }
    return context;
}
