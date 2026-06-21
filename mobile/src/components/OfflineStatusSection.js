import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCompatibility } from '../context/CompatibilityContext';
import { useNetwork } from '../context/NetworkContext';

export default function OfflineStatusSection() {
    const { canRemoteWrite } = useCompatibility();
    const {
        isOnline,
        pendingCount,
        syncing,
        lastSyncError,
        flushOutbox,
    } = useNetwork();

    const syncBlocked = pendingCount > 0 && !canRemoteWrite;
    const canManualSync = pendingCount > 0 && isOnline && canRemoteWrite && !syncing;

    return (
        <View style={styles.section}>
            <Text style={styles.title}>Offline & sync</Text>
            <Text style={styles.row}>
                Connection:
                {' '}
                <Text style={styles.value}>{isOnline ? 'Online' : 'Offline'}</Text>
            </Text>
            <Text style={styles.row}>
                Remote writes:
                {' '}
                <Text style={styles.value}>{canRemoteWrite ? 'Allowed' : 'Blocked — update app'}</Text>
            </Text>
            <Text style={styles.row}>
                Pending changes:
                {' '}
                <Text style={styles.value}>{pendingCount}</Text>
            </Text>
            {syncBlocked ? (
                <Text style={styles.hint}>
                    Changes are saved on this device. Update the app to sync them to the server.
                </Text>
            ) : null}
            {syncing ? <Text style={styles.hint}>Syncing...</Text> : null}
            {lastSyncError ? (
                <Text style={styles.error}>{lastSyncError}</Text>
            ) : null}
            {canManualSync ? (
                <Pressable
                    style={[styles.button, syncing && styles.buttonDisabled]}
                    disabled={syncing}
                    onPress={() => flushOutbox()}
                >
                    <Text style={styles.buttonText}>Sync now</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    row: {
        fontSize: 14,
        color: '#4b5563',
    },
    value: {
        color: '#111827',
        fontWeight: '500',
    },
    hint: {
        fontSize: 13,
        color: '#6b7280',
    },
    error: {
        fontSize: 13,
        color: '#b91c1c',
    },
    button: {
        marginTop: 4,
        alignSelf: 'flex-start',
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
