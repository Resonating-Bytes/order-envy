import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'orderenvy_access_token';
const REFRESH_TOKEN_KEY = 'orderenvy_refresh_token';
const USER_KEY = 'orderenvy_user';

export async function getStoredTokens() {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!accessToken || !refreshToken) {
        return null;
    }
    return { accessToken, refreshToken };
}

export async function saveSession({ accessToken, refreshToken, user }) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser() {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
}
