const mockGetIsOnline = jest.fn(() => true);
const mockCanUseRemoteWrite = jest.fn(() => true);
const mockGetOutbox = jest.fn(() => []);
const mockRemoveOutboxItem = jest.fn(() => Promise.resolve());
const mockUpdateOutboxItem = jest.fn(() => Promise.resolve());
const mockSetIdMapEntry = jest.fn(() => Promise.resolve());
const mockGetLocalEntity = jest.fn(() => Promise.resolve(null));
const mockRemoveLocalEntity = jest.fn(() => Promise.resolve());

jest.mock('../../src/lib/network', () => ({
    getIsOnline: () => mockGetIsOnline(),
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
}));

import { assertRemoteWriteAllowed } from '../../src/lib/compatibility';
import { flushOutbox, isOfflineQueuedResult } from '../../src/lib/offlineWrites';

describe('flushOutbox', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetIsOnline.mockReturnValue(true);
        assertRemoteWriteAllowed.mockImplementation(() => {});
        mockGetOutbox.mockReturnValue([]);
    });

    test('skips when offline', async () => {
        mockGetIsOnline.mockReturnValue(false);
        mockGetOutbox.mockReturnValue([
            { id: 'q1', method: 'POST', path: '/restaurants', body: { name: 'Cafe' } },
        ]);

        const result = await flushOutbox(jest.fn());

        expect(result).toEqual({ flushed: 0, remaining: 1 });
    });

    test('returns blocked when compatibility disallows writes', async () => {
        assertRemoteWriteAllowed.mockImplementation(() => {
            throw new Error('Update the app');
        });
        mockGetOutbox.mockReturnValue([
            { id: 'q1', method: 'POST', path: '/restaurants', body: { name: 'Cafe' } },
        ]);

        const result = await flushOutbox(jest.fn());

        expect(result.blocked).toBe(true);
        expect(result.error).toBe('Update the app');
        expect(result.flushed).toBe(0);
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

        const result = await flushOutbox(remoteFetch);

        expect(remoteFetch).toHaveBeenCalledWith('/restaurants', expect.objectContaining({
            method: 'POST',
            _remoteOnly: true,
        }));
        expect(mockRemoveOutboxItem).toHaveBeenCalledWith('q1');
        expect(mockSetIdMapEntry).toHaveBeenCalledWith('local_abc', '507f1f77bcf86cd799439011');
        expect(result.flushed).toBe(1);
        expect(result.remaining).toBe(0);
    });

    test('stops on remote failure and records lastError', async () => {
        const remoteFetch = jest.fn(() => Promise.reject(new Error('Server error')));
        mockGetOutbox.mockReturnValue([
            { id: 'q1', method: 'POST', path: '/restaurants', body: { name: 'Cafe' } },
        ]);

        const result = await flushOutbox(remoteFetch);

        expect(mockUpdateOutboxItem).toHaveBeenCalledWith('q1', expect.objectContaining({
            lastError: 'Server error',
        }));
        expect(result.flushed).toBe(0);
    });
});

describe('isOfflineQueuedResult', () => {
    test('detects offline queued API responses', () => {
        expect(isOfflineQueuedResult({ offlineQueued: true })).toBe(true);
        expect(isOfflineQueuedResult({ restaurant: {} })).toBe(false);
    });
});
