function readGoogleClientId(value) {
    if (!value || value.includes('your-google')) {
        return '';
    }
    return value;
}

export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL || 'https://order-envy.vercel.app/api/v1';

export const GOOGLE_WEB_CLIENT_ID = readGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
export const GOOGLE_IOS_CLIENT_ID = readGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
export const GOOGLE_ANDROID_CLIENT_ID = readGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);

// Expo Go requires an https redirect; custom schemes (orderenvy://) are rejected by Web OAuth clients.
export const GOOGLE_OAUTH_REDIRECT_URI = 'https://auth.expo.io/@resonating-bytes/order-envy';

export const isGoogleSignInConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);
