/**
 * API compatibility metadata exposed to mobile clients.
 * Bump backendRevision when deploying API changes that require a newer app build.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BACKEND_REVISION = '20260620100000';
const MOBILE_APP_JSON = path.join(__dirname, '..', 'mobile', 'app.json');

const CAPABILITIES = [
    'google_auth',
    'friends',
    'recommendations',
    'restaurant_crud',
    'menu_item_crud',
    'checkin',
];

function readEnv(name, fallback) {
    const value = process.env[name];
    return value && String(value).trim() ? String(value).trim() : fallback;
}

function readMobileAppVersion() {
    try {
        const raw = fs.readFileSync(MOBILE_APP_JSON, 'utf8');
        const version = JSON.parse(raw)?.expo?.version;
        return version && String(version).trim() ? String(version).trim() : null;
    } catch {
        return null;
    }
}

function getBackendRevision() {
    return readEnv('API_BACKEND_REVISION', DEFAULT_BACKEND_REVISION);
}

function getMinAppVersion() {
    return readEnv('API_MIN_APP_VERSION', '1.0.0');
}

function getLatestAppVersion() {
    const envOverride = process.env.API_LATEST_APP_VERSION;
    if (envOverride && String(envOverride).trim()) {
        return String(envOverride).trim();
    }
    return readMobileAppVersion() || getMinAppVersion();
}

function getCompatibilityPayload() {
    return {
        minAppVersion: getMinAppVersion(),
        latestAppVersion: getLatestAppVersion(),
        backendRevision: getBackendRevision(),
        capabilities: [...CAPABILITIES],
    };
}

module.exports = {
    CAPABILITIES,
    DEFAULT_BACKEND_REVISION,
    getBackendRevision,
    getMinAppVersion,
    getLatestAppVersion,
    getCompatibilityPayload,
    readMobileAppVersion,
};
