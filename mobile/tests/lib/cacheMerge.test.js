import {
    mergeRestaurantDetailFromServer,
    mergeRestaurantListFromServer,
} from '../../src/lib/cacheMerge';

describe('cacheMerge', () => {
    test('server list wins except protected local rows', () => {
        const merged = mergeRestaurantListFromServer(
            {
                restaurants: [
                    { _id: 'r1', name: 'Server Cafe' },
                    { _id: 'r2', name: 'Server Diner' },
                ],
            },
            {
                restaurants: [
                    { _id: 'r1', name: 'Local Cafe', _pendingSync: true },
                    { _id: 'local-r3', name: 'Pending Add', _pendingSync: true },
                ],
            },
            new Set(['r1', 'local-r3']),
        );

        expect(merged.restaurants.map((row) => row.name)).toEqual([
            'Pending Add',
            'Local Cafe',
            'Server Diner',
        ]);
        expect(merged.restaurants[1]._pendingSync).toBe(true);
    });

    test('protected detail keeps local restaurant fields', () => {
        const merged = mergeRestaurantDetailFromServer(
            {
                restaurant: { _id: 'r1', name: 'Server', description: 'Fresh' },
                menuByCategory: [{ label: 'Entree', menuItems: [{ _id: 'm1', name: 'Soup' }] }],
            },
            {
                restaurant: { _id: 'r1', name: 'Local', description: 'Queued', _pendingSync: true },
                menuByCategory: [],
            },
            { isProtected: true },
        );

        expect(merged.restaurant.name).toBe('Local');
        expect(merged.restaurant.description).toBe('Queued');
        expect(merged.restaurant._pendingSync).toBe(true);
    });
});
