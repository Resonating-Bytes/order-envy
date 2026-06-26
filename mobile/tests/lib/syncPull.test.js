const mockGetSyncMeta = jest.fn();
const mockReadCacheMap = jest.fn();
const mockGetOutbox = jest.fn();
const mockGetLocalEntities = jest.fn();
const mockSetCache = jest.fn();
const mockSetSyncMeta = jest.fn();

jest.mock('../../src/storage/offlineStore', () => ({
    getSyncMeta: (...args) => mockGetSyncMeta(...args),
    readCacheMap: (...args) => mockReadCacheMap(...args),
    getOutbox: (...args) => mockGetOutbox(...args),
    getLocalEntities: (...args) => mockGetLocalEntities(...args),
    setCache: (...args) => mockSetCache(...args),
    setSyncMeta: (...args) => mockSetSyncMeta(...args),
}));

const { pullBeforeFlush } = require('../../src/lib/syncPull');

describe('syncPull', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSyncMeta.mockResolvedValue({ lastLat: 34.05, lastLong: -118.24 });
        mockReadCacheMap.mockResolvedValue({});
        mockGetOutbox.mockResolvedValue([]);
        mockGetLocalEntities.mockResolvedValue({ restaurants: {}, menuItems: {} });
        mockSetCache.mockResolvedValue(undefined);
        mockSetSyncMeta.mockResolvedValue(undefined);
    });

    test('skips pull when last location is unknown', async () => {
        mockGetSyncMeta.mockResolvedValue({ lastLat: null, lastLong: null });

        const result = await pullBeforeFlush(jest.fn());

        expect(result).toEqual({ pulled: false, reason: 'no_location' });
    });

    test('merges server list into cache and updates lastSyncedAt', async () => {
        const remoteFetch = jest.fn().mockResolvedValue({
            mode: 'full',
            syncedAt: 1700000000000,
            restaurants: [{ _id: 'r1', name: 'Server Cafe' }],
            recommendations: [],
        });

        const result = await pullBeforeFlush(remoteFetch);

        expect(remoteFetch).toHaveBeenCalledWith(
            '/restaurants?lat=34.05&long=-118.24&filterDist=100',
            { _remoteOnly: true },
        );
        expect(mockSetCache).toHaveBeenCalledWith(
            '/restaurants?lat=34.05&long=-118.24&filterDist=100',
            expect.objectContaining({
                restaurants: [{ _id: 'r1', name: 'Server Cafe' }],
            }),
            expect.objectContaining({
                queryLat: 34.05,
                queryLong: -118.24,
            }),
        );
        expect(mockSetSyncMeta).toHaveBeenCalledWith({ lastSyncedAt: 1700000000000 });
        expect(result.pulled).toBe(true);
        expect(result.mode).toBe('full');
    });

    test('uses since watermark when cached list and lastSyncedAt exist', async () => {
        const lastSyncedAt = Date.now() - 60_000;
        mockGetSyncMeta.mockResolvedValue({
            lastLat: 34.05,
            lastLong: -118.24,
            lastSyncedAt,
        });
        mockReadCacheMap.mockResolvedValue({
            '/restaurants?lat=34.05&long=-118.24&filterDist=100': {
                data: { restaurants: [{ _id: 'r1', name: 'Cached' }] },
            },
        });
        const remoteFetch = jest.fn().mockResolvedValue({
            mode: 'delta',
            syncedAt: lastSyncedAt + 1000,
            restaurants: [{ _id: 'r1', name: 'Updated' }],
            recommendations: [],
        });

        await pullBeforeFlush(remoteFetch);

        expect(remoteFetch).toHaveBeenCalledWith(
            `/restaurants?lat=34.05&long=-118.24&filterDist=100&since=${lastSyncedAt}`,
            { _remoteOnly: true },
        );
    });
});
