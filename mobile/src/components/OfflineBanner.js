import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    const {
        isOnline,
        pendingCount,
        syncing,
        usingCachedData,
        cachedAt,
        flushOutbox,
    } = useNetwork();

    const showOffline = !isOnline || usingCachedData;
    const showPending = pendingCount > 0;

    if (!showOffline && !showPending) {
        return null;
    }

    let message = '';
    if (!isOnline) {
        message = usingCachedData
            ? `Offline — showing saved data${cachedAt ? ` from ${formatCachedAt(cachedAt)}` : ''}.`
            : 'Offline — some data may be unavailable.';
    } else if (usingCachedData) {
        message = `Using saved data${cachedAt ? ` from ${formatCachedAt(cachedAt)}` : ''}.`;
    }

    if (showPending) {
        const pendingLabel = syncing
            ? 'Syncing changes...'
            : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`;
        message = message ? `${message} ${pendingLabel}.` : `${pendingLabel}.`;
    }

    return (
        <View style={styles.banner}>
            <Text style={styles.text}>{message}</Text>
            {showPending && isOnline && !syncing ? (
                <Pressable onPress={() => flushOutbox()} style={styles.button}>
                    <Text style={styles.buttonText}>Sync now</Text>
                </Pressable>
            ) : null}
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    text: {
        flex: 1,
        color: '#92400e',
        fontSize: 13,
        lineHeight: 18,
    },
    button: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#f59e0b',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
