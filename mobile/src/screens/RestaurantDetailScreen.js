import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchRatingMeta, fetchRestaurant } from '../api/client';
import BackHeaderButton from '../components/BackHeaderButton';
import LoadingView from '../components/LoadingView';
import RatingImage from '../components/RatingImage';
import ScrollToTopButton from '../components/ScrollToTopButton';
import ShrinkingScreenHeader, { getExpandedHeaderHeight } from '../components/ShrinkingScreenHeader';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import { useAuth } from '../context/AuthContext';
import { formatDistance, getRestaurantDistance } from '../utils/distance';
import { requestCurrentLocation } from '../utils/location';
import { averageUserRating, getDisplayRestaurantRating } from '../utils/ratings';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RestaurantDetailScreen({ route, navigation }) {
    const { user } = useAuth();
    const { restaurantId, distanceMiles: passedDistanceMiles, restaurantName } = route.params;
    const insets = useSafeAreaInsets();
    const headerPadding = getExpandedHeaderHeight(insets.top);
    const {
        scrollY,
        scrollRef,
        onScroll,
        scrollToTop,
        showScrollToTop,
    } = useAnimatedScreenScroll();
    const hasLoadedRef = useRef(false);
    const [data, setData] = useState(null);
    const [ratingInfo, setRatingInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [coords, setCoords] = useState(null);
    const userId = user?.id || user?._id;

    const loadRestaurant = useCallback(async ({ silent = false } = {}) => {
        setError('');
        if (!silent) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const result = await fetchRestaurant(restaurantId);
            setData(result);
        } catch (err) {
            setError(err.message || 'Failed to load restaurant');
        } finally {
            if (!silent) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, [restaurantId]);

    React.useEffect(() => {
        fetchRatingMeta()
            .then((meta) => setRatingInfo(meta.ratingInfo || []))
            .catch(() => setRatingInfo([]));
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadRestaurant({ silent: hasLoadedRef.current });
            hasLoadedRef.current = true;
        }, [loadRestaurant])
    );

    React.useEffect(() => {
        if (passedDistanceMiles != null) return;

        requestCurrentLocation().then((location) => {
            if (location.granted) {
                setCoords({ lat: location.lat, long: location.long });
            }
        });
    }, [passedDistanceMiles]);

    const headerTitle = data?.restaurant?.name || restaurantName || 'Restaurant';

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerTransparent: true,
            headerShadowVisible: false,
            headerTitle: '',
            header: () => (
                <ShrinkingScreenHeader
                    scrollY={scrollY}
                    title={headerTitle}
                    leftAction={(
                        <BackHeaderButton onPress={() => navigation.goBack()} />
                    )}
                />
            ),
        });
    }, [navigation, headerTitle, scrollY]);

    const distanceMiles = useMemo(() => {
        if (passedDistanceMiles != null) return passedDistanceMiles;
        if (!coords || !data?.restaurant) return null;
        return getRestaurantDistance(data.restaurant, coords.lat, coords.long);
    }, [passedDistanceMiles, coords, data?.restaurant]);

    if (loading && !refreshing && !data) {
        return <LoadingView message="Loading restaurant..." />;
    }

    if ((error || !data) && !refreshing) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{error || 'Restaurant not found'}</Text>
                <Pressable style={styles.retryButton} onPress={() => loadRestaurant()}>
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    const { restaurant, categories } = data;
    const displayRating = getDisplayRestaurantRating({
        restaurant,
        categories,
        userId,
    });
    const hasAddress = Boolean(restaurant.location?.address);
    const hasDistance = distanceMiles != null;

    return (
        <View style={styles.screen}>
            <ScrollView
                ref={scrollRef}
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingTop: headerPadding }]}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
            {restaurant.description ? (
                <Text style={styles.description}>{restaurant.description}</Text>
            ) : null}
            {(hasAddress || hasDistance) ? (
                <View style={styles.addressRow}>
                    {hasAddress ? (
                        <Text style={styles.address} numberOfLines={2}>
                            {restaurant.location.address}
                        </Text>
                    ) : (
                        <View style={styles.addressSpacer} />
                    )}
                    {hasDistance ? (
                        <Text style={styles.distance}>{formatDistance(distanceMiles)}</Text>
                    ) : null}
                </View>
            ) : null}
            {displayRating ? (
                <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{displayRating.label}</Text>
                    <RatingImage
                        rating={displayRating.rating}
                        ratingInfo={ratingInfo}
                        size={56}
                    />
                </View>
            ) : null}

            <Pressable
                style={styles.checkinButton}
                onPress={() => navigation.navigate('CheckIn', {
                    restaurantId,
                    restaurantName: restaurant.name,
                })}
            >
                <Text style={styles.checkinButtonText}>Check in</Text>
            </Pressable>

            {categories.map((category) => (
                <View key={category.label} style={styles.section}>
                    <Text style={styles.sectionTitle}>{category.label}</Text>
                    {category.menuItems.map((item) => {
                        const itemRating = averageUserRating(item.ratings, userId);

                        return (
                            <View key={item._id} style={styles.menuItem}>
                                <View style={styles.menuItemHeader}>
                                    <View style={styles.menuItemText}>
                                        <Text style={styles.menuItemName}>{item.name}</Text>
                                        {item.description ? (
                                            <Text style={styles.menuItemDescription}>{item.description}</Text>
                                        ) : null}
                                    </View>
                                    {itemRating ? (
                                        <RatingImage
                                            rating={itemRating}
                                            ratingInfo={ratingInfo}
                                            size={44}
                                        />
                                    ) : null}
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}
            </ScrollView>
            <ScrollToTopButton visible={showScrollToTop} onPress={scrollToTop} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#f8faf8',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#f8faf8',
    },
    description: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 8,
    },
    address: {
        flex: 1,
        fontSize: 14,
        color: '#6b7280',
    },
    addressSpacer: {
        flex: 1,
    },
    distance: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    ratingRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    ratingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    checkinButton: {
        marginTop: 20,
        marginBottom: 12,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    checkinButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    menuItem: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    menuItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    menuItemDescription: {
        marginTop: 4,
        fontSize: 13,
        color: '#6b7280',
    },
    error: {
        color: '#b91c1c',
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
});
