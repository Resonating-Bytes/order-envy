import { loadLocalFirst } from '../../src/lib/localFirst';

describe('loadLocalFirst', () => {
    test('applies cache immediately then fresh data', async () => {
        const steps = [];

        await loadLocalFirst({
            getCached: async () => ({ restaurants: [{ _id: '1', name: 'Cached' }] }),
            fetchFresh: async () => ({ restaurants: [{ _id: '1', name: 'Fresh' }] }),
            apply: (data, meta) => steps.push({ name: data.restaurants[0].name, ...meta }),
            setLoading: jest.fn(),
            setError: jest.fn(),
        });

        expect(steps).toEqual([
            { name: 'Cached', fromCache: true },
            { name: 'Fresh', fromCache: false },
        ]);
    });

    test('shows loading until fresh when no cache', async () => {
        const setLoading = jest.fn();

        await loadLocalFirst({
            getCached: async () => null,
            fetchFresh: async () => ({ ok: true }),
            apply: jest.fn(),
            setLoading,
            setError: jest.fn(),
        });

        expect(setLoading).toHaveBeenCalledWith(true);
        expect(setLoading).toHaveBeenCalledWith(false);
    });

    test('keeps cache when fresh fetch fails', async () => {
        const apply = jest.fn();
        const setError = jest.fn();

        await loadLocalFirst({
            getCached: async () => ({ restaurants: [{ _id: '1' }] }),
            fetchFresh: async () => { throw new Error('offline'); },
            apply,
            setLoading: jest.fn(),
            setError,
        });

        expect(apply).toHaveBeenCalledTimes(1);
        expect(setError).toHaveBeenCalledWith('');
        expect(setError).not.toHaveBeenCalledWith('offline');
    });

    test('sets error when fresh fails and no cache', async () => {
        const setError = jest.fn();

        await expect(loadLocalFirst({
            getCached: async () => null,
            fetchFresh: async () => { throw new Error('network'); },
            apply: jest.fn(),
            setLoading: jest.fn(),
            setError,
        })).rejects.toThrow('network');

        expect(setError).toHaveBeenCalledWith('network');
    });
});
