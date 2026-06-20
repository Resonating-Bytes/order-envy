import { API_BASE_URL } from '../config';
import {
    APP_VERSION,
    FORCE_COMPATIBILITY_BLOCK,
    MIN_BACKEND_REVISION,
    REQUIRED_BACKEND_CAPABILITIES,
} from '../config/compatibility';

let cachedCompatibility = null;

export function getCachedCompatibility() {
    return cachedCompatibility;
}

export function setCachedCompatibility(result) {
    cachedCompatibility = result;
}

function parseSemver(version) {
    const parts = String(version ?? '0.0.0').split('.').map((n) => Number.parseInt(n, 10));
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

export function compareSemver(a, b) {
    const left = parseSemver(a);
    const right = parseSemver(b);
    if (left.major !== right.major) return left.major - right.major;
    if (left.minor !== right.minor) return left.minor - right.minor;
    return left.patch - right.patch;
}

function compareLex(a, b) {
    return String(a).localeCompare(String(b));
}

function hasRequiredCapabilities(serverCapabilities = []) {
    const available = new Set(serverCapabilities);
    const missing = REQUIRED_BACKEND_CAPABILITIES.filter((cap) => !available.has(cap));
    return missing;
}

export function evaluateBackendCompatibility(data) {
    if (FORCE_COMPATIBILITY_BLOCK) {
        return {
            ok: false,
            preview: true,
            message: 'Preview: saving is disabled until you update the app.',
            server: data,
        };
    }

    if (!data) {
        return {
            ok: true,
            skipped: true,
            warning: 'Could not verify server compatibility.',
        };
    }

    if (compareSemver(APP_VERSION, data.minAppVersion) < 0) {
        return {
            ok: false,
            appOutdated: true,
            message: 'This app version is too old. Update Order Envy to continue saving.',
            server: data,
        };
    }

    if (compareLex(data.backendRevision, MIN_BACKEND_REVISION) < 0) {
        return {
            ok: false,
            backendStale: true,
            message: 'The server is running an older API than this app expects. Try again later.',
            server: data,
        };
    }

    const missingCapabilities = hasRequiredCapabilities(data.capabilities);
    if (missingCapabilities.length) {
        return {
            ok: false,
            missingCapabilities,
            message: 'This app build requires a newer server. Try again later.',
            server: data,
        };
    }

    const updateOptional = data.latestAppVersion
        && compareSemver(APP_VERSION, data.latestAppVersion) < 0;

    return {
        ok: true,
        updateOptional,
        message: updateOptional
            ? `Version ${data.latestAppVersion} is available.`
            : 'App and server are compatible.',
        server: data,
    };
}

export function canUseRemoteWrite(compatibility) {
    if (FORCE_COMPATIBILITY_BLOCK) {
        return false;
    }
    if (!compatibility || compatibility.skipped) {
        return true;
    }
    return compatibility.ok === true;
}

export async function fetchBackendCompatibility() {
    try {
        const response = await fetch(`${API_BASE_URL}/meta/compatibility`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                ok: true,
                skipped: true,
                warning: data.error || 'Could not verify server compatibility.',
            };
        }
        return evaluateBackendCompatibility(data);
    } catch (error) {
        return {
            ok: true,
            skipped: true,
            warning: error.message || 'Could not verify server compatibility.',
        };
    }
}

export function assertRemoteWriteAllowed(compatibility = getCachedCompatibility()) {
    if (canUseRemoteWrite(compatibility)) {
        return;
    }
    const err = new Error(compatibility?.message || 'Update the app before saving changes.');
    err.status = 426;
    err.code = 'COMPATIBILITY_BLOCKED';
    throw err;
}
