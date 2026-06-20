import {
    distanceMiles,
    formatDistance,
    getRestaurantDistance,
} from '../../src/utils/distance';

describe('distance', () => {
    test('distanceMiles is zero for identical points', () => {
        expect(distanceMiles(40.7128, -74.006, 40.7128, -74.006)).toBeCloseTo(0, 5);
    });

    test('getRestaurantDistance returns null without coordinates', () => {
        expect(getRestaurantDistance({ location: {} }, 40, -74)).toBeNull();
    });

    test('formatDistance formats short and long ranges', () => {
        expect(formatDistance(0.05)).toBe('< 0.1 mi');
        expect(formatDistance(2.34)).toBe('2.3 mi');
        expect(formatDistance(12.6)).toBe('13 mi');
        expect(formatDistance(null)).toBeNull();
    });
});
