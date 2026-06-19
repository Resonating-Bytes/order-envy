import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { GOOGLE_OAUTH_REDIRECT_URI } from '../config';

export function isExpoGo() {
    return (
        Constants.appOwnership === 'expo' ||
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    );
}

function getExpoGoReturnUri() {
    return Linking.createURL('expo-auth-session');
}

function buildProxyStartUrl(authUrl, returnUrl) {
    const params = new URLSearchParams({ authUrl, returnUrl });
    return `${GOOGLE_OAUTH_REDIRECT_URI}/start?${params.toString()}`;
}

function parseAuthResponse(url) {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    const error = params.error || errorCode;
    if (error) {
        return {
            type: 'error',
            error: {
                message: params.error_description || String(error),
            },
            params,
        };
    }
    return { type: 'success', params };
}

export async function promptGoogleViaExpoProxy(googleRequest) {
    if (!googleRequest?.url) {
        throw new Error('Google sign-in is not ready yet');
    }

    const returnUrl = getExpoGoReturnUri();
    const startUrl = buildProxyStartUrl(googleRequest.url, returnUrl);
    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

    if (result.type !== 'success' || !result.url) {
        return { type: result.type };
    }

    return parseAuthResponse(result.url);
}
