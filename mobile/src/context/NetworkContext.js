import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useCompatibility } from './CompatibilityContext';
import {
    flushOutbox as runFlushOutbox,
    getOutboxSyncLastError,
    getOutboxSyncSnapshot,
    startOutboxSync,
} from '../lib/outboxSync';
import { evictRegionalCache } from '../lib/cachePolicy';
import { getIsOnline, initNetworkStatus, subscribeOnlineStatus } from '../lib/network';
import * as offlineStore from '../storage/offlineStore';
import {
    ensureOfflineSchema,
    getOutbox,
    clearFetchMeta,
    subscribeFetchMeta,
    subscribePendingChange,
    subscribeSyncComplete,
} from '../storage/offlineStore';

const NetworkContext = createContext(null);

export function NetworkProvider({ children, remoteFetch }) {
    const { canRemoteWrite } = useCompatibility();
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

    const refreshSyncState = useCallback(async () => {
        const snapshot = await getOutboxSyncSnapshot();
        setPendingCount(snapshot.pendingCount);
        setSyncing(snapshot.isSyncing);
        setLastSyncError(snapshot.lastError || getOutboxSyncLastError() || '');
    }, []);

    const flushOutbox = useCallback(async () => {
        const result = await runFlushOutbox();
        await refreshSyncState();
        return result;
    }, [refreshSyncState]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            await ensureOfflineSchema();
            await evictRegionalCache(offlineStore);
            if (!cancelled) {
                await refreshPendingCount();
            }
        })();

        const stopNetworkStatus = initNetworkStatus();
        const unsubNetwork = subscribeOnlineStatus((online) => {
            setIsOnline(online);
            if (online) {
                clearFetchMeta();
                setUsingCachedData(false);
                setCachedAt(null);
            }
        });
        const unsubFetchMeta = subscribeFetchMeta((meta) => {
            if (meta.fromCache && !getIsOnline()) {
                setUsingCachedData(true);
                setCachedAt(meta.cachedAt || null);
                return;
            }
            if (!meta.fromCache) {
                setUsingCachedData(false);
                setCachedAt(null);
            }
        });
        const unsubPending = subscribePendingChange(() => {
            refreshPendingCount();
            refreshSyncState();
        });
        const unsubSync = subscribeSyncComplete(() => {
            refreshSyncState();
            setLastSyncError('');
        });

        const stopOutboxSync = remoteFetch
            ? startOutboxSync({
                remoteFetch,
                onStateChange: () => {
                    refreshSyncState();
                },
            })
            : () => {};

        return () => {
            cancelled = true;
            stopNetworkStatus();
            unsubNetwork();
            unsubFetchMeta();
            unsubPending();
            unsubSync();
            stopOutboxSync();
        };
    }, [remoteFetch, refreshPendingCount, refreshSyncState]);

    useEffect(() => {
        if (!canRemoteWrite || !remoteFetch) return undefined;
        flushOutbox().catch(() => {});
        return undefined;
    }, [canRemoteWrite, flushOutbox, remoteFetch]);

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
