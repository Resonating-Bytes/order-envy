import { evictRegionalCache } from '../../src/lib/cachePolicy';

describe('evictRegionalCache', () => {
    test('removes stale and far-away cache entries but keeps protected restaurants', async () => {
        const now = Date.now();
        const store = {
            readCacheMap: jest.fn().mockResolvedValue({
                '/restaurants?lat=34&long=-118&filterDist=25': {
                    cachedAt: now,
                    lastAccessedAt: now,
                    queryLat: 34,
                    queryLong: -118,
                    data: { restaurants: [] },
                },
                '/restaurants/r-far': {
                    cachedAt: now,
                    lastAccessedAt: now,
                    lat: 40.7,
                    long: -74.0,
                    data: { restaurant: { _id: 'r-far' } },
                },
                '/restaurants/local-r1': {
                    cachedAt: now - (8 * 24 * 60 * 60 * 1000),
                    lat: 40.7,
                    long: -74.0,
                    data: { restaurant: { _id: 'local-r1' } },
                },
                '/restaurants/meta/ratings': {
                    cachedAt: now - (8 * 24 * 60 * 60 * 1000),
                    data: { ratingInfo: [] },
                },
            }),
            getSyncMeta: jest.fn().mockResolvedValue({ lastLat: 34.05, lastLong: -118.24 }),
            getOutbox: jest.fn().mockResolvedValue([
                { path: '/restaurants/local-r1', method: 'PUT' },
            ]),
            getLocalEntities: jest.fn().mockResolvedValue({ restaurants: {}, menuItems: {} }),
            writeCacheMap: jest.fn().mockResolvedValue(undefined),
        };

        const result = await evictRegionalCache(store, { now });

        expect(result.removed).toBe(1);
        expect(store.writeCacheMap).toHaveBeenCalledWith({
            '/restaurants?lat=34&long=-118&filterDist=25': expect.any(Object),
            '/restaurants/local-r1': expect.any(Object),
            '/restaurants/meta/ratings': expect.any(Object),
        });
    });
});
