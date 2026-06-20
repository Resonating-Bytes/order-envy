import appJson from '../../app.json';

/** Runtime app semver — read from mobile/app.json (single source of truth). */
export const APP_VERSION = appJson.expo.version;

/** Oldest API backend revision this app build supports. */
export const MIN_BACKEND_REVISION = '20260620100000';

/** API capabilities this build requires. */
export const REQUIRED_BACKEND_CAPABILITIES = [
    'google_auth',
    'friends',
    'recommendations',
    'restaurant_crud',
    'menu_item_crud',
    'checkin',
];

/**
 * Set EXPO_PUBLIC_FORCE_COMPATIBILITY_BLOCK=true in mobile/.env to preview blocked-save UX.
 * Restart Expo after changing.
 */
export const FORCE_COMPATIBILITY_BLOCK =
    process.env.EXPO_PUBLIC_FORCE_COMPATIBILITY_BLOCK === 'true';

export const APP_UPDATE_URL = process.env.EXPO_PUBLIC_APP_UPDATE_URL ?? '';
export const APP_UPDATE_URL_IOS = process.env.EXPO_PUBLIC_APP_UPDATE_URL_IOS ?? '';
export const APP_UPDATE_URL_ANDROID = process.env.EXPO_PUBLIC_APP_UPDATE_URL_ANDROID ?? '';

export function getAppUpdateUrl(platform) {
    const platformUrl = platform === 'ios'
        ? APP_UPDATE_URL_IOS
        : platform === 'android'
            ? APP_UPDATE_URL_ANDROID
            : '';
    return (platformUrl || APP_UPDATE_URL).trim();
}
