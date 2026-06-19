import React from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function GoogleSignInButton({ onPress, disabled, loading }) {
    return (
        <Pressable
            style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color="#1a2b3c" />
            ) : (
                <View style={styles.content}>
                    <Image
                        source={require('../../assets/google-g.png')}
                        style={styles.logo}
                    />
                    <Text style={styles.label}>Sign in with Google</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#747775',
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logo: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f1f1f',
    },
});
