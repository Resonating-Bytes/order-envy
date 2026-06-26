const mockDrainOutbox = jest.fn();
const mockPullBeforeFlush = jest.fn();
const mockGetOutbox = jest.fn(() => Promise.resolve([]));
const mockCanUseRemoteWrite = jest.fn(() => true);
const mockGetCachedCompatibility = jest.fn(() => ({}));
const mockGetIsOnline = jest.fn(() => true);
const mockIsNetworkOnline = jest.fn(() => Promise.resolve(true));
const mockIsNetworkOnlineSync = jest.fn(() => true);
const mockSubscribeNetwork = jest.fn(() => jest.fn());

jest.mock('../../src/lib/offlineWrites', () => ({
    drainOutbox: (...args) => mockDrainOutbox(...args),
}));

jest.mock('../../src/lib/syncPull', () => ({
    pullBeforeFlush: (...args) => mockPullBeforeFlush(...args),
}));

jest.mock('../../src/storage/offlineStore', () => ({
    getOutbox: () => mockGetOutbox(),
}));

jest.mock('../../src/lib/compatibility', () => ({
    canUseRemoteWrite: (...args) => mockCanUseRemoteWrite(...args),
    getCachedCompatibility: () => mockGetCachedCompatibility(),
}));

jest.mock('../../src/lib/network', () => ({
    getIsOnline: () => mockGetIsOnline(),
    isNetworkOnline: () => mockIsNetworkOnline(),
    isNetworkOnlineSync: (...args) => mockIsNetworkOnlineSync(...args),
    subscribeNetwork: (...args) => mockSubscribeNetwork(...args),
}));

jest.mock('react-native', () => ({
    AppState: {
        addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
}));

describe('outboxSync', () => {
    let flushOutbox;
    let startOutboxSync;
    let stopOutboxSync;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        mockCanUseRemoteWrite.mockReturnValue(true);
        mockGetIsOnline.mockReturnValue(true);
        mockIsNetworkOnline.mockResolvedValue(true);
        mockGetOutbox.mockResolvedValue([]);
        mockDrainOutbox.mockResolvedValue({ flushed: 0, remaining: 0, failed: false });
        mockPullBeforeFlush.mockResolvedValue({ pulled: false });

        ({ flushOutbox, startOutboxSync } = require('../../src/lib/outboxSync'));
        stopOutboxSync = startOutboxSync({
            remoteFetch: jest.fn(),
            onStateChange: jest.fn(),
        });
        await flushOutbox();
        mockDrainOutbox.mockClear();
        mockPullBeforeFlush.mockClear();
        mockGetOutbox.mockResolvedValue([]);
    });

    afterEach(() => {
        stopOutboxSync?.();
    });

    test('is single-flight while a flush is in progress', async () => {
        mockGetOutbox.mockImplementation(() => Promise.resolve([{ id: 'q1' }]));
        mockPullBeforeFlush.mockImplementation(() => Promise.resolve({ pulled: false }));
        let resolveDrain;
        let drainCalls = 0;
        mockDrainOutbox.mockImplementation(() => {
            drainCalls += 1;
            return new Promise((resolve) => {
                resolveDrain = resolve;
            });
        });

        const first = flushOutbox();
        const second = flushOutbox();

        await new Promise((resolve) => setImmediate(resolve));
        expect(mockPullBeforeFlush).toHaveBeenCalledTimes(1);
        expect(drainCalls).toBe(1);

        resolveDrain({ flushed: 1, remaining: 0, failed: false });
        await first;
        await second;
    });

    test('schedules exponential backoff retry after failure', async () => {
        jest.useFakeTimers();
        try {
            mockGetOutbox.mockResolvedValue([{ id: 'q1' }]);
            mockDrainOutbox
                .mockResolvedValueOnce({ flushed: 0, remaining: 1, failed: true, error: 'Server error' })
                .mockResolvedValueOnce({ flushed: 1, remaining: 0, failed: false });

            await flushOutbox();
            expect(mockDrainOutbox).toHaveBeenCalledTimes(1);

            await jest.advanceTimersByTimeAsync(1000);
            expect(mockDrainOutbox).toHaveBeenCalledTimes(2);
        } finally {
            jest.useRealTimers();
        }
    });

    test('skips drain when compatibility blocks remote writes', async () => {
        mockCanUseRemoteWrite.mockReturnValue(false);
        mockGetOutbox.mockResolvedValue([{ id: 'q1' }]);

        const result = await flushOutbox();

        expect(mockDrainOutbox).not.toHaveBeenCalled();
        expect(mockPullBeforeFlush).not.toHaveBeenCalled();
        expect(result.blocked).toBe(true);
    });

    test('pulls regional snapshot before draining outbox', async () => {
        mockGetOutbox.mockResolvedValue([{ id: 'q1' }]);
        mockPullBeforeFlush.mockResolvedValue({ pulled: true });
        mockDrainOutbox.mockResolvedValue({ flushed: 1, remaining: 0, failed: false });

        await flushOutbox();

        expect(mockPullBeforeFlush).toHaveBeenCalledTimes(1);
        expect(mockDrainOutbox).toHaveBeenCalledTimes(1);
    });
});
