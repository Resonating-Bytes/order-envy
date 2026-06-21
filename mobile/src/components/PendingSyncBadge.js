import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PendingSyncBadge() {
    return (
        <View style={styles.badge}>
            <Text style={styles.text}>Pending sync</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: '#fef3c7',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 4,
    },
    text: {
        color: '#92400e',
        fontSize: 11,
        fontWeight: '600',
    },
});
