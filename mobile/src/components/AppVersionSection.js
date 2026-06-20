import React from 'react';
import {
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useCompatibility } from '../context/CompatibilityContext';
import { APP_VERSION, getAppUpdateUrl } from '../config/compatibility';
import { colors } from '../theme/colors';

function getStatusLabel(compatibility, loading) {
    if (loading) {
        return 'Checking server compatibility...';
    }
    if (!compatibility) {
        return 'Compatibility status unavailable.';
    }
    if (compatibility.preview) {
        return 'Preview mode: saving is blocked.';
    }
    if (compatibility.skipped) {
        return compatibility.warning || 'Could not verify server compatibility.';
    }
    if (!compatibility.ok) {
        return compatibility.message || 'Update required before saving.';
    }
    if (compatibility.updateOptional) {
        return compatibility.message;
    }
    return compatibility.message || 'App and server are compatible.';
}

function getStatusTone(compatibility, loading) {
    if (loading) return 'muted';
    if (!compatibility || compatibility.skipped) return 'warning';
    if (!compatibility.ok || compatibility.preview) return 'error';
    if (compatibility.updateOptional) return 'info';
    return 'success';
}

const toneStyles = {
    muted: { color: colors.textMuted },
    warning: { color: '#92400e' },
    error: { color: colors.error },
    info: { color: colors.primary },
    success: { color: colors.success },
};

export default function AppVersionSection() {
    const { compatibility, loading, refresh, canRemoteWrite } = useCompatibility();
    const tone = getStatusTone(compatibility, loading);
    const updateUrl = getAppUpdateUrl(Platform.OS);
    const showUpdateButton = Boolean(
        updateUrl && (
            compatibility?.appOutdated
            || compatibility?.updateOptional
            || !compatibility?.ok
        ),
    );

    async function handleOpenUpdate() {
        if (!updateUrl) return;
        await Linking.openURL(updateUrl);
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>App version</Text>
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Installed</Text>
                    <Text style={styles.rowValue}>{APP_VERSION}</Text>
                </View>
                {compatibility?.server?.backendRevision ? (
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Server API</Text>
                        <Text style={styles.rowValue}>{compatibility.server.backendRevision}</Text>
                    </View>
                ) : null}
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Saving</Text>
                    <Text style={[styles.rowValue, toneStyles[tone]]}>
                        {canRemoteWrite ? 'Allowed' : 'Blocked'}
                    </Text>
                </View>
                <Text style={[styles.statusText, toneStyles[tone]]}>
                    {getStatusLabel(compatibility, loading)}
                </Text>
                <View style={styles.actions}>
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={refresh}
                        disabled={loading}
                    >
                        <Text style={styles.secondaryButtonText}>
                            {loading ? 'Checking...' : 'Check again'}
                        </Text>
                    </Pressable>
                    {showUpdateButton ? (
                        <Pressable style={styles.primaryButton} onPress={handleOpenUpdate}>
                            <Text style={styles.primaryButtonText}>Get update</Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    rowLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    rowValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        flexShrink: 1,
        textAlign: 'right',
    },
    statusText: {
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    primaryButton: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
