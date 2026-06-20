import {
    getSortLabel,
    getSortOptions,
    sortRestaurants,
} from '../../src/utils/sortRestaurants';

describe('sortRestaurants', () => {
    const restaurants = [
        { _id: '1', name: 'Zeta', userAverageRating: 3 },
        { _id: '2', name: 'Alpha', userAverageRating: 5 },
        { _id: '3', name: 'Beta', userAverageRating: null },
    ];

    test('sorts by name by default', () => {
        const sorted = sortRestaurants(restaurants, 'name', null);
        expect(sorted.map((r) => r.name)).toEqual(['Alpha', 'Beta', 'Zeta']);
    });

    test('sorts by rating descending with nulls last', () => {
        const sorted = sortRestaurants(restaurants, 'rating', null);
        expect(sorted.map((r) => r.name)).toEqual(['Alpha', 'Zeta', 'Beta']);
    });

    test('getSortLabel returns human label', () => {
        expect(getSortLabel('rating')).toBe('Rating');
        expect(getSortLabel('unknown')).toBe('Name');
    });

    test('getSortOptions disables distance without location', () => {
        const options = getSortOptions(false);
        const distance = options.find((o) => o.id === 'distance');
        expect(distance.disabled).toBe(true);
        expect(distance.hint).toBe('Needs location');
    });
});
