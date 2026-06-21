import { getRatingImageSource, getRatingOptions } from '../../src/utils/ratings';

describe('getRatingOptions', () => {
    test('returns five normalized options with numeric values', () => {
        const options = getRatingOptions([]);
        expect(options).toHaveLength(5);
        expect(options.map((entry) => entry.value)).toEqual([1, 2, 3, 4, 5]);
    });

    test('fills missing value fields from defaults', () => {
        const options = getRatingOptions([
            { title: 'Bad' },
            { title: 'OK', value: 3 },
        ]);
        expect(options[0].value).toBe(1);
        expect(options[1].value).toBe(3);
        expect(options[0].alt).toBeTruthy();
    });
});

describe('getRatingImageSource', () => {
    test('returns bundled assets for ratings 1 through 5', () => {
        for (let rating = 1; rating <= 5; rating += 1) {
            const source = getRatingImageSource(rating);
            expect(source).toBeTruthy();
        }
    });
});
