const {
    getCompatibilityPayload,
    getBackendRevision,
    getMinAppVersion,
    getLatestAppVersion,
    readMobileAppVersion,
    CAPABILITIES,
} = require('../../lib/compatibility');

describe('lib/compatibility', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.API_BACKEND_REVISION;
        delete process.env.API_MIN_APP_VERSION;
        delete process.env.API_LATEST_APP_VERSION;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns default compatibility payload', () => {
        const mobileVersion = readMobileAppVersion();
        const payload = getCompatibilityPayload();
        expect(payload.minAppVersion).toBe('1.0.0');
        expect(payload.latestAppVersion).toBe(mobileVersion || '1.0.0');
        expect(payload.backendRevision).toBe('20260620100000');
        expect(payload.capabilities).toEqual(expect.arrayContaining(['google_auth', 'checkin']));
    });

    it('defaults latestAppVersion from mobile/app.json when env is unset', () => {
        expect(getLatestAppVersion()).toBe(readMobileAppVersion());
    });

    it('reads compatibility values from env overrides', () => {
        process.env.API_BACKEND_REVISION = '20260620999999';
        process.env.API_MIN_APP_VERSION = '1.2.0';
        process.env.API_LATEST_APP_VERSION = '1.3.0';

        expect(getBackendRevision()).toBe('20260620999999');
        expect(getMinAppVersion()).toBe('1.2.0');
        expect(getCompatibilityPayload()).toMatchObject({
            minAppVersion: '1.2.0',
            latestAppVersion: '1.3.0',
            backendRevision: '20260620999999',
        });
    });

    it('includes all documented capabilities', () => {
        expect(CAPABILITIES).toEqual([
            'google_auth',
            'friends',
            'recommendations',
            'restaurant_crud',
            'menu_item_crud',
            'checkin',
        ]);
    });
});
