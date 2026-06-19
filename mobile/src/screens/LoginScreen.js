import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import {
    GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_IOS_CLIENT_ID,
    GOOGLE_OAUTH_REDIRECT_URI,
    GOOGLE_WEB_CLIENT_ID,
    isGoogleSignInConfigured,
} from '../config';
import { isExpoGo, promptGoogleViaExpoProxy } from '../lib/googleSignIn';
import { colors } from '../theme/colors';

WebBrowser.maybeCompleteAuthSession();

function getGoogleRedirectUri(request) {
    return request?.redirectUri || GOOGLE_OAUTH_REDIRECT_URI;
}

function getGoogleAuthPayload(response, request) {
    if (!response || response.type !== 'success') {
        return null;
    }

    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (idToken) {
        return { idToken };
    }

    if (response.params?.code) {
        return {
            code: response.params.code,
            redirectUri: getGoogleRedirectUri(request),
            codeVerifier: request?.codeVerifier,
        };
    }

    return null;
}

function shouldUseExpoProxy() {
    if (!isExpoGo()) {
        return false;
    }
    // Platform OAuth clients redirect directly to the app without the auth.expo.io proxy.
    if (Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID) {
        return false;
    }
    if (Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID) {
        return false;
    }
    return true;
}

export default function LoginScreen() {
    const { login, loginWithGoogle } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const [googleRequest, , promptGoogleSignIn] = Google.useIdTokenAuthRequest({
        iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
        webClientId: GOOGLE_WEB_CLIENT_ID,
        redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
        selectAccount: true,
    });

    async function handleGooglePress() {
        setError('');
        setGoogleLoading(true);
        try {
            const response = shouldUseExpoProxy()
                ? await promptGoogleViaExpoProxy(googleRequest)
                : await promptGoogleSignIn();

            if (response?.type !== 'success') {
                if (response?.type === 'error') {
                    setError(response.error?.message || 'Google sign-in failed');
                }
                return;
            }

            const payload = getGoogleAuthPayload(response, googleRequest);
            if (!payload) {
                setError('Google sign-in did not return a token');
                return;
            }

            await loginWithGoogle(payload);
        } catch (err) {
            const detail = err.status ? ` (${err.status})` : '';
            setError(`${err.message || 'Google sign-in failed'}${detail}`);
        } finally {
            setGoogleLoading(false);
        }
    }
    async function handleLogin() {
        setError('');
        setSubmitting(true);
        try {
            await login(username.trim(), password);
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    }

    const busy = submitting || googleLoading;
    const googleEnabled = isGoogleSignInConfigured && !!googleRequest;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Order Envy</Text>
                <Text style={styles.subtitle}>Track what you've had and what to try next</Text>

                {googleEnabled ? (
                    <>
                        <GoogleSignInButton
                            onPress={handleGooglePress}
                            loading={googleLoading}
                            disabled={submitting}
                        />
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>
                    </>
                ) : null}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={username}
                    onChangeText={setUsername}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                    style={[styles.button, busy && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={busy || !username || !password}
                >
                    <Text style={styles.buttonText}>
                        {busy ? 'Signing in...' : 'Sign in'}
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f7ff',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.primaryDarker,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    dividerText: {
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    button: {
        marginTop: 8,
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    error: {
        color: '#b91c1c',
        fontSize: 14,
    },
});
