import { shouldUseDelta } from '../../src/lib/listSync';
import { FULL_SYNC_INTERVAL_MS } from '../../src/config/offline';

describe('listSync', () => {
    test('shouldUseDelta requires watermark, cached rows, and fresh interval', () => {
        expect(shouldUseDelta({}, { restaurants: [{ _id: '1' }] })).toBe(false);
        expect(shouldUseDelta({ lastSyncedAt: Date.now() }, {})).toBe(false);
        expect(shouldUseDelta(
            { lastSyncedAt: Date.now() - FULL_SYNC_INTERVAL_MS - 1 },
            { restaurants: [{ _id: '1' }] },
        )).toBe(false);
        expect(shouldUseDelta(
            { lastSyncedAt: Date.now() - 1000 },
            { restaurants: [{ _id: '1' }] },
        )).toBe(true);
    });
});
