import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteRecommendation } from '../api/client';
import { colors } from '../theme/colors';

function getRecommendationLabel(item) {
    return item.menuItem?.name || item.restaurant?.name || 'Recommendation';
}

export default function RecommendationsSection({
    recommendations,
    onPressItem,
    onDeleted,
}) {
    if (!recommendations?.length) return null;

    async function handleDelete(item, label) {
        Alert.alert(
            'Remove recommendation',
            `Remove the recommendation for ${label}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRecommendation(item.id || item._id);
                            onDeleted?.();
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to remove recommendation');
                        }
                    },
                },
            ]
        );
    }

    return (
        <View style={styles.section}>
            <Text style={styles.title}>Recommendations</Text>
            {recommendations.map((item) => {
                const label = getRecommendationLabel(item);
                const restaurantId = item.restaurant?._id;
                const menuItemId = item.menuItem?._id;
                const key = item.id || item._id || `${restaurantId}-${menuItemId || 'restaurant'}`;
                const recommenderNames = (item.from || [])
                    .map((user) => {
                        if (!user) return null;
                        const id = user._id || user.id;
                        return user.fullName || user.displayName || user.firstName || 'Friend';
                    })
                    .filter(Boolean);

                return (
                    <View key={key} style={styles.row}>
                        <Pressable
                            style={styles.card}
                            onPress={() => onPressItem?.({
                                restaurantId,
                                menuItemId,
                                restaurantName: item.restaurant?.name,
                                menuItemName: item.menuItem?.name,
                            })}
                        >
                            <View style={styles.cardMain}>
                                <Text style={styles.cardTitle} numberOfLines={2}>{label}</Text>
                                {recommenderNames.length ? (
                                    <Text style={styles.cardMeta} numberOfLines={2}>
                                        {`From: ${recommenderNames.join(', ')}`}
                                    </Text>
                                ) : item.count > 1 ? (
                                    <Text style={styles.cardMeta}>{item.count} recommendations</Text>
                                ) : null}
                            </View>
                            <View style={styles.cardChevron}>
                                <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
                            </View>
                        </Pressable>
                        {!item.noDelete ? (
                            <Pressable
                                style={styles.deleteButton}
                                onPress={() => handleDelete(item, label)}
                                accessibilityLabel={`Remove recommendation for ${label}`}
                            >
                                <Text style={styles.deleteText}>×</Text>
                            </Pressable>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 8,
        marginBottom: 8,
    },
    card: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f8faf8',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    cardMain: {
        flex: 1,
        minWidth: 0,
    },
    cardChevron: {
        flexShrink: 0,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primaryDarker,
    },
    cardMeta: {
        marginTop: 4,
        fontSize: 13,
        color: colors.textMuted,
    },
    deleteButton: {
        width: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteText: {
        fontSize: 22,
        lineHeight: 24,
        color: colors.error,
        fontWeight: '600',
    },
});
