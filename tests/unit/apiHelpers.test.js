const { averageRating, filterByDistance, formatUser } = require('../../lib/apiHelpers');

describe('apiHelpers', () => {
    describe('averageRating', () => {
        it('returns null when user has no ratings', () => {
            const ratings = [
                { user: 'user-a', rating: 5 },
                { user: 'user-b', rating: 3 },
            ];

            expect(averageRating(ratings, 'user-c')).toBeNull();
        });

        it('averages ratings for the given user', () => {
            const userId = 'user-a';
            const ratings = [
                { user: userId, rating: 4 },
                { user: userId, rating: 2 },
                { user: 'user-b', rating: 5 },
            ];

            expect(averageRating(ratings, userId)).toBe(3);
        });
    });

    describe('filterByDistance', () => {
        const restaurants = [
            { name: 'Near', location: { lat: 40.015, long: -105.27 } },
            { name: 'Far', location: { lat: 34.05, long: -118.25 } },
            { name: 'No coords', location: { lat: NaN, long: NaN } },
        ];

        it('returns all restaurants when lat/long are invalid', () => {
            const result = filterByDistance(restaurants, 'bad', 'bad', 25);
            expect(result).toHaveLength(3);
        });

        it('filters restaurants outside the radius', () => {
            const result = filterByDistance(restaurants, 40.015, -105.27, 25);
            expect(result.map((r) => r.name)).toEqual(['Near']);
        });
    });

    describe('formatUser', () => {
        it('returns null for missing user', () => {
            expect(formatUser(null)).toBeNull();
        });

        it('formats user fields for API responses', () => {
            const user = {
                _id: 'abc123',
                username: 'test@example.com',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                friends: [{ _id: 'friend1' }],
                getDisplayName: () => 'Test',
                getFullName: () => 'Test User',
            };

            expect(formatUser(user)).toEqual({
                id: 'abc123',
                username: 'test@example.com',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                displayName: 'Test',
                fullName: 'Test User',
                friends: ['friend1'],
            });
        });
    });
});
