import {
    compareSemver,
    evaluateBackendCompatibility,
    canUseRemoteWrite,
    assertRemoteWriteAllowed,
    setCachedCompatibility,
} from '../../src/lib/compatibility';
import { REQUIRED_BACKEND_CAPABILITIES } from '../../src/config/compatibility';

describe('compatibility', () => {
    const compatibleRemote = {
        minAppVersion: '1.0.0',
        latestAppVersion: '9.0.0',
        backendRevision: '20260620100000',
        capabilities: [...REQUIRED_BACKEND_CAPABILITIES],
    };

    beforeEach(() => {
        setCachedCompatibility(null);
    });

    test('compareSemver orders versions', () => {
        expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0);
        expect(compareSemver('1.0.0', '1.1.0')).toBeLessThan(0);
    });

    test('evaluateBackendCompatibility accepts current backend', () => {
        const result = evaluateBackendCompatibility(compatibleRemote);
        expect(result.ok).toBe(true);
    });

    test('evaluateBackendCompatibility flags outdated app', () => {
        const result = evaluateBackendCompatibility({
            ...compatibleRemote,
            minAppVersion: '99.0.0',
        });
        expect(result.ok).toBe(false);
        expect(result.appOutdated).toBe(true);
    });

    test('evaluateBackendCompatibility flags stale backend revision', () => {
        const result = evaluateBackendCompatibility({
            ...compatibleRemote,
            backendRevision: '20200101000000',
        });
        expect(result.ok).toBe(false);
        expect(result.backendStale).toBe(true);
    });

    test('evaluateBackendCompatibility flags missing capabilities', () => {
        const result = evaluateBackendCompatibility({
            ...compatibleRemote,
            capabilities: ['google_auth'],
        });
        expect(result.ok).toBe(false);
        expect(result.missingCapabilities.length).toBeGreaterThan(0);
    });

    test('canUseRemoteWrite allows skipped compatibility checks', () => {
        expect(canUseRemoteWrite({ ok: true, skipped: true })).toBe(true);
    });

    test('assertRemoteWriteAllowed throws when incompatible', () => {
        const blocked = {
            ok: false,
            message: 'Update required',
        };
        setCachedCompatibility(blocked);
        expect(() => assertRemoteWriteAllowed()).toThrow('Update required');
    });
});
