import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCompatibility } from '../context/CompatibilityContext';
import { useNetwork } from '../context/NetworkContext';

function formatCachedAt(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function OfflineBanner() {
    const { canRemoteWrite } = useCompatibility();
    const {
        isOnline,
        pendingCount,
        syncing,
        usingCachedData,
        cachedAt,
    } = useNetwork();

    const showPending = pendingCount > 0;
    const syncBlocked = showPending && !canRemoteWrite;

    if (isOnline && !showPending) {
        return null;
    }

    if (!isOnline && !showPending && !usingCachedData) {
        return null;
    }

    let message = '';
    if (!isOnline) {
        message = usingCachedData
            ? `Offline — showing saved data${cachedAt ? ` from ${formatCachedAt(cachedAt)}` : ''}.`
            : 'Offline — some data may be unavailable.';
    }

    if (showPending) {
        const pendingLabel = syncBlocked
            ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting — update the app to sync`
            : syncing
                ? 'Syncing changes...'
                : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`;
        message = message ? `${message} ${pendingLabel}.` : `${pendingLabel}.`;
    }

    if (!message) {
        return null;
    }

    return (
        <View style={styles.banner}>
            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#fef3c7',
        borderBottomWidth: 1,
        borderBottomColor: '#fcd34d',
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: 'center',
    },
    text: {
        color: '#92400e',
        fontSize: 13,
        lineHeight: 18,
    },
});
