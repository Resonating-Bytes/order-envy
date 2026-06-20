#!/usr/bin/env node
/**
 * CI: when mobile app code changes, require semver bump + CHANGELOG entry.
 * Usage: node scripts/check-app-version.js [--base origin/main] [--head HEAD]
 */

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, parseBaseHeadArgs, listChangedFiles, readFileAtRef } = require('./lib/ci-git');

const APP_JSON = path.join(ROOT, 'mobile', 'app.json');
const PACKAGE_JSON = path.join(ROOT, 'mobile', 'package.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

const APP_PATHS = [/^mobile\/src\//, /^mobile\/app\.json$/, /^mobile\/package\.json$/];
const APP_EXEMPT = [/^mobile\/tests\//];

function needsAppVersionBump(files) {
    return files.some((file) => {
        if (APP_EXEMPT.some((pattern) => pattern.test(file))) return false;
        return APP_PATHS.some((pattern) => pattern.test(file));
    });
}

function readAppVersionFromRef(ref) {
    const content = readFileAtRef(ref, 'mobile/app.json');
    if (!content) return null;
    return JSON.parse(content).expo.version;
}

function readAppVersionFromDisk() {
    if (!fs.existsSync(APP_JSON)) return null;
    return JSON.parse(fs.readFileSync(APP_JSON, 'utf8')).expo.version;
}

function readPackageVersionFromDisk() {
    if (!fs.existsSync(PACKAGE_JSON)) return null;
    return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version;
}

function assertPackageJsonMatchesAppVersion(appVersion) {
    const packageVersion = readPackageVersionFromDisk();
    if (!packageVersion) {
        fail(`could not read version from ${path.relative(ROOT, PACKAGE_JSON)}`);
    }
    if (packageVersion !== appVersion) {
        fail(
            `mobile/package.json version (${packageVersion}) must match mobile/app.json expo.version (${appVersion}).`,
        );
    }
}

function parseSemver(version) {
    const parts = String(version ?? '0.0.0').split('.').map((n) => Number.parseInt(n, 10));
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function compareSemver(a, b) {
    const left = parseSemver(a);
    const right = parseSemver(b);
    if (left.major !== right.major) return left.major - right.major;
    if (left.minor !== right.minor) return left.minor - right.minor;
    return left.patch - right.patch;
}

function fail(message) {
    console.error(`\napp-version check failed:\n${message}\n`);
    process.exit(1);
}

function pass(message) {
    console.log(`app-version check passed: ${message}`);
    process.exit(0);
}

function main() {
    const { base, head } = parseBaseHeadArgs(process.argv);
    const changed = listChangedFiles(base, head);

    const headVersion = readAppVersionFromDisk();
    if (!headVersion) {
        fail(`could not read expo.version from ${path.relative(ROOT, APP_JSON)}`);
    }
    assertPackageJsonMatchesAppVersion(headVersion);

    if (!needsAppVersionBump(changed)) {
        pass('no mobile app paths changed — app version bump not required');
    }

    const baseVersion = readAppVersionFromRef(base) ?? readAppVersionFromDisk();

    if (baseVersion && compareSemver(headVersion, baseVersion) <= 0) {
        fail(
            `mobile code changed but app version was not bumped (${baseVersion} → ${headVersion}).\n` +
            'Bump expo.version in mobile/app.json and the same version in mobile/package.json.',
        );
    }

    if (!fs.existsSync(CHANGELOG)) {
        fail('CHANGELOG.md is required when bumping the app version.');
    }

    const changelog = fs.readFileSync(CHANGELOG, 'utf8');
    if (!changelog.includes(`## [${headVersion}]`)) {
        fail(`CHANGELOG.md must include "## [${headVersion}]" for this release.`);
    }

    if (!changed.includes('CHANGELOG.md')) {
        fail('CHANGELOG.md must be updated when bumping the app version.');
    }

    pass(`app version ${baseVersion} → ${headVersion} with CHANGELOG entry`);
}

main();
