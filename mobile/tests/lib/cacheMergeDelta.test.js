import {
    applyListSyncResponse,
    mergeRestaurantListDelta,
} from '../../src/lib/cacheMerge';

describe('cacheMerge delta', () => {
    test('mergeRestaurantListDelta upserts changed rows and keeps protected locals', () => {
        const merged = mergeRestaurantListDelta(
            {
                mode: 'delta',
                syncedAt: 2000,
                restaurants: [{ _id: 'r1', name: 'Updated Cafe' }],
                recommendations: [{ id: 'rec1' }],
            },
            {
                restaurants: [
                    { _id: 'r1', name: 'Old Cafe' },
                    { _id: 'r2', name: 'Other' },
                ],
                recommendations: [],
            },
            new Set(['r2']),
        );

        expect(merged.restaurants).toHaveLength(2);
        expect(merged.restaurants.find((r) => r._id === 'r1').name).toBe('Updated Cafe');
        expect(merged.restaurants.find((r) => r._id === 'r2').name).toBe('Other');
        expect(merged.recommendations).toEqual([{ id: 'rec1' }]);
        expect(merged.syncedAt).toBe(2000);
    });

    test('applyListSyncResponse uses full merge for full responses', () => {
        const merged = applyListSyncResponse(
            {
                mode: 'full',
                restaurants: [{ _id: 'r1', name: 'Server' }],
            },
            { restaurants: [{ _id: 'r2', name: 'Cached' }] },
            new Set(),
        );

        expect(merged.restaurants.map((r) => r._id)).toEqual(['r1']);
    });
});
