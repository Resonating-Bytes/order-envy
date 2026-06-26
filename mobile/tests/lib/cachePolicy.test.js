import {
    getProtectedRestaurantIds,
    isEvictableCachePath,
    shouldEvictCacheEntry,
} from '../../src/lib/cachePolicy';

describe('cachePolicy', () => {
    test('identifies evictable restaurant cache paths', () => {
        expect(isEvictableCachePath('/restaurants?lat=1&long=2&filterDist=25')).toBe(true);
        expect(isEvictableCachePath('/restaurants/abc123')).toBe(true);
        expect(isEvictableCachePath('/restaurants/abc123/checkin')).toBe(true);
        expect(isEvictableCachePath('/restaurants/meta/ratings')).toBe(false);
    });

    test('collects protected restaurant ids from outbox and local entities', () => {
        const protectedIds = getProtectedRestaurantIds(
            [
                { path: '/restaurants/r1', method: 'PUT' },
                { path: '/restaurants/r2/menu-items', method: 'POST', localEntityId: 'm1' },
                { localEntityType: 'restaurants', localEntityId: 'local-r3' },
            ],
            { restaurants: { 'local-r4': { _id: 'local-r4' } } },
        );

        expect([...protectedIds].sort()).toEqual(['local-r3', 'local-r4', 'r1', 'r2']);
    });

    test('evicts stale entries by last access time', () => {
        const now = Date.now();
        expect(shouldEvictCacheEntry(
            { cachedAt: now - (8 * 24 * 60 * 60 * 1000), lastAccessedAt: now - (8 * 24 * 60 * 60 * 1000) },
            { now },
        )).toBe(true);
    });

    test('evicts far-away entries when last location is known', () => {
        const now = Date.now();
        expect(shouldEvictCacheEntry(
            {
                cachedAt: now,
                lastAccessedAt: now,
                lat: 40.7,
                long: -74.0,
            },
            {
                now,
                lastLat: 34.05,
                lastLong: -118.24,
                maxDistanceMiles: 150,
            },
        )).toBe(true);
    });

    test('keeps protected restaurant detail entries', () => {
        const now = Date.now();
        expect(shouldEvictCacheEntry(
            {
                cachedAt: now - (8 * 24 * 60 * 60 * 1000),
                lat: 40.7,
                long: -74.0,
            },
            {
                now,
                lastLat: 34.05,
                lastLong: -118.24,
                restaurantId: 'local-r1',
                protectedIds: new Set(['local-r1']),
            },
        )).toBe(false);
    });
});
