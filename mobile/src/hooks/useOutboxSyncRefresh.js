import { useEffect, useRef } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { subscribeSyncComplete } from '../storage/offlineStore';

/**
 * Re-run a loader when sync completes or pending outbox count drops (BFR pattern).
 */
export function useOutboxSyncRefresh(refresh) {
    const { pendingCount } = useNetwork();
    const prevPendingRef = useRef(pendingCount);

    useEffect(() => {
        const unsub = subscribeSyncComplete((result) => {
            if (result?.flushed > 0) {
                refresh();
            }
        });
        return unsub;
    }, [refresh]);

    useEffect(() => {
        const prev = prevPendingRef.current;
        if (prev > 0 && pendingCount < prev) {
            refresh();
        }
        prevPendingRef.current = pendingCount;
    }, [pendingCount, refresh]);
}
