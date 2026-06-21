const mockGetIsOnline = jest.fn(() => true);
const mockIsNetworkOnline = jest.fn(() => Promise.resolve(true));
const mockCanUseRemoteWrite = jest.fn(() => true);
const mockGetOutbox = jest.fn(() => []);
const mockRemoveOutboxItem = jest.fn(() => Promise.resolve());
const mockUpdateOutboxItem = jest.fn(() => Promise.resolve());
const mockSetIdMapEntry = jest.fn(() => Promise.resolve());
const mockGetLocalEntity = jest.fn(() => Promise.resolve(null));
const mockRemoveLocalEntity = jest.fn(() => Promise.resolve());

jest.mock('../../src/lib/network', () => ({
    getIsOnline: () => mockGetIsOnline(),
    isNetworkOnline: () => mockIsNetworkOnline(),
}));

jest.mock('../../src/lib/compatibility', () => ({
    assertRemoteWriteAllowed: jest.fn(),
    canUseRemoteWrite: (...args) => mockCanUseRemoteWrite(...args),
}));

jest.mock('../../src/storage/offlineStore', () => ({
    getOutbox: () => mockGetOutbox(),
    removeOutboxItem: (...args) => mockRemoveOutboxItem(...args),
    updateOutboxItem: (...args) => mockUpdateOutboxItem(...args),
    setIdMapEntry: (...args) => mockSetIdMapEntry(...args),
    getLocalEntity: (...args) => mockGetLocalEntity(...args),
    removeLocalEntity: (...args) => mockRemoveLocalEntity(...args),
    readCacheMap: jest.fn(() => Promise.resolve({})),
    writeCacheMap: jest.fn(() => Promise.resolve()),
    patchRestaurantListCache: jest.fn(() => Promise.resolve()),
    emitSyncComplete: jest.fn(),
}));

import { assertRemoteWriteAllowed } from '../../src/lib/compatibility';
import { drainOutbox, isOfflineQueuedResult, mergeRestaurantListData } from '../../src/lib/offlineWrites';

describe('drainOutbox', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetIsOnline.mockReturnValue(true);
        mockIsNetworkOnline.mockResolvedValue(true);
        assertRemoteWriteAllowed.mockImplementation(() => {});
        mockGetOutbox.mockReturnValue([]);
    });

    test('skips when offline', async () => {
        mockGetIsOnline.mockReturnValue(false);
        mockIsNetworkOnline.mockResolvedValue(false);
        mockGetOutbox.mockReturnValue([
            { id: 'q1', method: 'POST', path: '/restaurants', body: { name: 'Cafe' } },
        ]);

        const result = await drainOutbox(jest.fn());

        expect(result).toEqual({ flushed: 0, remaining: 1, failed: false });
    });

    test('returns blocked when compatibility disallows writes', async () => {
        assertRemoteWriteAllowed.mockImplementation(() => {
            throw new Error('Update the app');
        });
        mockGetOutbox.mockReturnValue([
            { id: 'q1', method: 'POST', path: '/restaurants', body: { name: 'Cafe' } },
        ]);

        const result = await drainOutbox(jest.fn());

        expect(result.blocked).toBe(true);
        expect(result.error).toBe('Update the app');
        expect(result.flushed).toBe(0);
        expect(result.failed).toBe(false);
    });

    test('replays queued restaurant create and remaps local id', async () => {
        const remoteFetch = jest.fn(() => Promise.resolve({
            restaurant: { _id: '507f1f77bcf86cd799439011', name: 'Cafe' },
        }));

        let outbox = [
            {
                id: 'q1',
                method: 'POST',
                path: '/restaurants',
                body: { name: 'Cafe' },
                localEntityId: 'local_abc',
                localEntityType: 'restaurants',
            },
        ];
        mockGetOutbox.mockImplementation(() => outbox);
        mockRemoveOutboxItem.mockImplementation(() => {
            outbox = [];
            return Promise.resolve();
        });

        const result = await drainOutbox(remoteFetch);

        expect(remoteFetch).toHaveBeenCalledWith('/restaurants', expect.objectContaining({
            method: 'POST',
            _remoteOnly: true,
        }));
        expect(mockRemoveOutboxItem).toHaveBeenCalledWith('q1');
        expect(mockSetIdMapEntry).toHaveBeenCalledWith('local_abc', '507f1f77bcf86cd799439011');
        expect(result.flushed).toBe(1);
        expect(result.remaining).toBe(0);
        expect(result.failed).toBe(false);
    });

    test('stops on remote failure and records lastError', async () => {
        const remoteFetch = jest.fn(() => Promise.reject(new Error('Server error')));
        mockGetOutbox.mockReturnValue([
            { id: 'q1', method: 'POST', path: '/restaurants', body: { name: 'Cafe' } },
        ]);

        const result = await drainOutbox(remoteFetch);

        expect(mockUpdateOutboxItem).toHaveBeenCalledWith('q1', expect.objectContaining({
            lastError: 'Server error',
        }));
        expect(result.flushed).toBe(0);
        expect(result.failed).toBe(true);
        expect(result.error).toBe('Server error');
    });
});

describe('mergeRestaurantListData', () => {
    test('prepends local restaurants missing from remote list', () => {
        const local = { _id: 'local_1', name: 'Offline Cafe', _pendingSync: true };
        const result = mergeRestaurantListData(
            { restaurants: [{ _id: '507f1f77bcf86cd799439011', name: 'Online' }] },
            [local],
        );

        expect(result.restaurants).toHaveLength(2);
        expect(result.restaurants[0]._id).toBe('local_1');
    });
});

describe('isOfflineQueuedResult', () => {
    test('detects offline queued API responses', () => {
        expect(isOfflineQueuedResult({ offlineQueued: true })).toBe(true);
        expect(isOfflineQueuedResult({ restaurant: {} })).toBe(false);
    });
});
