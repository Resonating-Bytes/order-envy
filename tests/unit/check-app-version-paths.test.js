const path = require('node:path');

// Inline the same rules as scripts/check-app-version.js for unit testing.
const APP_PATHS = [/^mobile\//];
const APP_EXEMPT = [/^mobile\/tests\//];

function needsAppVersionBump(files) {
    return files.some((file) => {
        if (APP_EXEMPT.some((pattern) => pattern.test(file))) return false;
        return APP_PATHS.some((pattern) => pattern.test(file));
    });
}

describe('check-app-version path rules', () => {
    test('requires bump for mobile App.js and assets', () => {
        expect(needsAppVersionBump(['mobile/App.js'])).toBe(true);
        expect(needsAppVersionBump(['mobile/assets/icon.png'])).toBe(true);
        expect(needsAppVersionBump(['mobile/src/lib/offlineIds.js'])).toBe(true);
    });

    test('does not require bump for mobile tests only', () => {
        expect(needsAppVersionBump(['mobile/tests/lib/offlineIds.test.js'])).toBe(false);
    });

    test('does not require bump for non-mobile paths', () => {
        expect(needsAppVersionBump(['docs/hosting.md', 'lib/compatibility.js'])).toBe(false);
    });
});
