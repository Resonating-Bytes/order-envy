import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function LoadingView({ message = 'Loading...' }) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2d6a4f" />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8faf8',
        gap: 12,
    },
    message: {
        color: '#4b5563',
        fontSize: 16,
    },
});
