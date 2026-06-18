import React, { useCallback, useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    fetchCheckinData,
    fetchRatingMeta,
    submitCheckin,
} from '../api/client';
import LoadingView from '../components/LoadingView';
import RatingPicker from '../components/RatingPicker';
import { colors } from '../theme/colors';

export default function CheckInScreen({ route, navigation }) {
    const { restaurantId, restaurantName } = route.params;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [ratingInfo, setRatingInfo] = useState([]);
    const [categories, setCategories] = useState([]);
    const [restaurantRating, setRestaurantRating] = useState(null);
    const [restaurantComment, setRestaurantComment] = useState('');
    const [menuState, setMenuState] = useState({});

    const loadData = useCallback(async () => {
        setError('');
        try {
            const [checkinData, meta] = await Promise.all([
                fetchCheckinData(restaurantId),
                fetchRatingMeta(),
            ]);
            setCategories(checkinData.categories || []);
            setRatingInfo(meta.ratingInfo || []);

            const initialMenuState = {};
            (checkinData.categories || []).forEach((category) => {
                category.menuItems.forEach((item) => {
                    initialMenuState[item._id] = {
                        checked: false,
                        rating: null,
                        comment: '',
                    };
                });
            });
            setMenuState(initialMenuState);
        } catch (err) {
            setError(err.message || 'Failed to load check-in form');
        }
    }, [restaurantId]);

    React.useEffect(() => {
        loadData().finally(() => setLoading(false));
    }, [loadData]);

    const selectedMenuCount = useMemo(
        () => Object.values(menuState).filter((entry) => entry.checked).length,
        [menuState]
    );

    function updateMenuItem(menuItemId, patch) {
        setMenuState((current) => ({
            ...current,
            [menuItemId]: {
                ...current[menuItemId],
                ...patch,
            },
        }));
    }

    async function handleSubmit() {
        setError('');
        setSuccess('');

        const body = {};
        if (restaurantRating) {
            body[restaurantId] = {
                rating: restaurantRating,
                comment: restaurantComment.trim(),
            };
        }

        Object.entries(menuState).forEach(([menuItemId, entry]) => {
            if (entry.checked && entry.rating) {
                body[menuItemId] = {
                    checked: true,
                    rating: entry.rating,
                    comment: entry.comment.trim(),
                };
            }
        });

        if (!Object.keys(body).length) {
            setError('Rate the restaurant or at least one menu item before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await submitCheckin(restaurantId, body);
            setSuccess(result.message || 'Check-in saved');
            setTimeout(() => navigation.goBack(), 1200);
        } catch (err) {
            setError(err.message || 'Failed to submit check-in');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <LoadingView message="Loading check-in..." />;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
        >
            <Text style={styles.title}>{restaurantName}</Text>
            <Text style={styles.subtitle}>What did you have? Rate your visit.</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overall restaurant</Text>
                <RatingPicker
                    value={restaurantRating}
                    onChange={setRestaurantRating}
                    ratingInfo={ratingInfo}
                />
                <TextInput
                    style={styles.commentInput}
                    placeholder="Comment (optional)"
                    value={restaurantComment}
                    onChangeText={setRestaurantComment}
                    multiline
                />
            </View>

            {categories.map((category) => (
                <View key={category.label} style={styles.section}>
                    <Text style={styles.sectionTitle}>{category.label}</Text>
                    {category.menuItems.map((item) => {
                        const entry = menuState[item._id] || { checked: false, rating: null, comment: '' };
                        return (
                            <View key={item._id} style={styles.menuCard}>
                                <View style={styles.menuHeader}>
                                    <Text style={styles.menuName}>{item.name}</Text>
                                    <Switch
                                        value={entry.checked}
                                        onValueChange={(checked) => updateMenuItem(item._id, {
                                            checked,
                                            rating: checked ? entry.rating : null,
                                        })}
                                        trackColor={{ true: colors.primaryMuted, false: '#d1d5db' }}
                                        thumbColor={entry.checked ? colors.primary : '#f4f4f5'}
                                    />
                                </View>
                                {entry.checked ? (
                                    <>
                                        <RatingPicker
                                            value={entry.rating}
                                            onChange={(rating) => updateMenuItem(item._id, { rating })}
                                            ratingInfo={ratingInfo}
                                        />
                                        <TextInput
                                            style={styles.commentInput}
                                            placeholder="Comment (optional)"
                                            value={entry.comment}
                                            onChangeText={(comment) => updateMenuItem(item._id, { comment })}
                                            multiline
                                        />
                                    </>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            ))}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                <Text style={styles.submitButtonText}>
                    {submitting ? 'Saving...' : `Submit check-in (${selectedMenuCount} items)`}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8faf8',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primaryDarker,
    },
    subtitle: {
        marginTop: 6,
        marginBottom: 16,
        color: '#6b7280',
        fontSize: 14,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    menuCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 10,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    menuName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        fontSize: 14,
        minHeight: 44,
    },
    submitButton: {
        marginTop: 8,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    error: {
        color: '#b91c1c',
        marginBottom: 8,
    },
    success: {
        color: '#166534',
        marginBottom: 8,
        fontWeight: '600',
    },
});
