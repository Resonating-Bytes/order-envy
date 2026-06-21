import { isNetworkFailureError, isNetworkOnlineSync } from '../../src/lib/network';

describe('isNetworkFailureError', () => {
    test('detects TypeError as network failure', () => {
        expect(isNetworkFailureError(new TypeError('Failed to fetch'))).toBe(true);
    });

    test('detects common fetch error messages', () => {
        expect(isNetworkFailureError(new Error('Network request failed'))).toBe(true);
        expect(isNetworkFailureError(new Error('Load failed'))).toBe(true);
    });

    test('returns false for API errors', () => {
        expect(isNetworkFailureError(new Error('Unauthorized'))).toBe(false);
    });
});

describe('isNetworkOnlineSync', () => {
    test('returns false when disconnected', () => {
        expect(isNetworkOnlineSync({ isConnected: false })).toBe(false);
    });

    test('returns true when connected even if reachability is stale false', () => {
        expect(isNetworkOnlineSync({
            isConnected: true,
            isInternetReachable: false,
            type: 'wifi',
        })).toBe(true);
    });

    test('returns true when connected and reachable', () => {
        expect(isNetworkOnlineSync({
            isConnected: true,
            isInternetReachable: true,
            type: 'wifi',
        })).toBe(true);
    });
});
