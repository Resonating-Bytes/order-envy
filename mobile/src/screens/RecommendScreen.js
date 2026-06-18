import React, { useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { createRecommendation } from '../api/client';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader, { useHeaderBackButton } from '../hooks/useShrinkingScreenHeader';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { normalizeFriend } from '../utils/friends';

export default function RecommendScreen({ route, navigation }) {
    const {
        restaurantId,
        restaurantName,
        menuItemId,
        menuItemName,
    } = route.params;
    const { user } = useAuth();
    const backButton = useHeaderBackButton(navigation);
    const { scrollY, onScroll } = useAnimatedScreenScroll();
    const headerPadding = useShrinkingScreenHeader(navigation, {
        title: 'Recommend to',
        scrollY,
        leftAction: backButton,
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const targets = useMemo(() => {
        const list = [{
            id: user?.id || user?._id,
            label: 'Myself',
        }];
        (user?.friends || []).forEach((friend) => {
            const normalized = normalizeFriend(friend);
            if (!normalized) return;
            list.push({
                id: normalized.id,
                label: normalized.displayName,
            });
        });
        return list;
    }, [user]);

    const subjectLabel = menuItemName || restaurantName || 'this place';

    async function handleRecommend(friendId, label) {
        setError('');
        setSubmitting(true);
        try {
            await createRecommendation({
                friendId,
                restaurantId,
                menuItemId,
            });
            Alert.alert('Recommended', `Saved a recommendation for ${label}.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            if (err.status === 409) {
                setError('You already recommended this to them.');
            } else {
                setError(err.message || 'Failed to save recommendation');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingTop: headerPadding }]}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                <Text style={styles.subtitle}>
                    Who should know about {subjectLabel}?
                </Text>

                {targets.map((target) => (
                    <Pressable
                        key={target.id}
                        style={[styles.targetButton, submitting && styles.buttonDisabled]}
                        onPress={() => handleRecommend(target.id, target.label)}
                        disabled={submitting}
                    >
                        <Text style={styles.targetText}>{target.label}</Text>
                    </Pressable>
                ))}

                {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textMuted,
        marginBottom: 16,
        lineHeight: 22,
    },
    targetButton: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    targetText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primaryDarker,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    error: {
        color: colors.error,
        marginTop: 12,
    },
});
