import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    canUseRemoteWrite,
    fetchBackendCompatibility,
    setCachedCompatibility,
} from '../lib/compatibility';

const CompatibilityContext = createContext(null);

export function CompatibilityProvider({ children }) {
    const [compatibility, setCompatibility] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchBackendCompatibility();
            setCachedCompatibility(result);
            setCompatibility(result);
            return result;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const canRemoteWrite = canUseRemoteWrite(compatibility);

    const value = useMemo(() => ({
        compatibility,
        loading,
        refresh,
        canRemoteWrite,
    }), [compatibility, loading, refresh, canRemoteWrite]);

    return (
        <CompatibilityContext.Provider value={value}>
            {children}
        </CompatibilityContext.Provider>
    );
}

export function useCompatibility() {
    const context = useContext(CompatibilityContext);
    if (!context) {
        throw new Error('useCompatibility must be used within CompatibilityProvider');
    }
    return context;
}
