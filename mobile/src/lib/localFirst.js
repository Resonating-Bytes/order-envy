/**
 * Local-first load: apply cached data immediately, then refresh from network.
 */

/**
 * @param {object} options
 * @param {() => Promise<*|null>} options.getCached - Stale-ok local snapshot (may be null).
 * @param {() => Promise<*>} options.fetchFresh - Network fetch; updates cache on success.
 * @param {(data: *, meta: { fromCache: boolean }) => void} options.apply
 * @param {(loading: boolean) => void} [options.setLoading]
 * @param {(refreshing: boolean) => void} [options.setRefreshing]
 * @param {(message: string) => void} [options.setError]
 * @param {boolean} [options.silent] - Background refresh (no loading spinner).
 */
export async function loadLocalFirst({
    getCached,
    fetchFresh,
    apply,
    setLoading,
    setRefreshing,
    setError,
    silent = false,
}) {
    if (setError) setError('');

    if (silent && setRefreshing) {
        setRefreshing(true);
    } else if (setLoading) {
        setLoading(true);
    }

    const cached = await getCached();
    const hasCached = cached != null;

    if (hasCached) {
        apply(cached, { fromCache: true });
        if (!silent && setLoading) {
            setLoading(false);
        }
    }

    try {
        const fresh = await fetchFresh();
        apply(fresh, { fromCache: false });
    } catch (err) {
        if (!hasCached && setError) {
            setError(err.message || 'Failed to load');
        }
        if (!hasCached) {
            throw err;
        }
    } finally {
        if (!hasCached && !silent && setLoading) {
            setLoading(false);
        }
        if (silent && setRefreshing) {
            setRefreshing(false);
        }
    }
}
