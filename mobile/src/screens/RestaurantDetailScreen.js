import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { fetchRestaurant } from '../api/client';
import BackHeaderButton from '../components/BackHeaderButton';
import LoadingView from '../components/LoadingView';
import ShrinkingScreenHeader, { getExpandedHeaderHeight } from '../components/ShrinkingScreenHeader';
import { formatDistance, getRestaurantDistance } from '../utils/distance';
import { requestCurrentLocation } from '../utils/location';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RestaurantDetailScreen({ route, navigation }) {
    const { restaurantId, distanceMiles: passedDistanceMiles, restaurantName } = route.params;
    const insets = useSafeAreaInsets();
    const headerPadding = getExpandedHeaderHeight(insets.top);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [coords, setCoords] = useState(null);

    const loadRestaurant = useCallback(async () => {
        setError('');
        try {
            const result = await fetchRestaurant(restaurantId);
            setData(result);
        } catch (err) {
            setError(err.message || 'Failed to load restaurant');
        }
    }, [restaurantId]);

    React.useEffect(() => {
        loadRestaurant().finally(() => setLoading(false));
    }, [loadRestaurant]);

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

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
    );

    const distanceMiles = useMemo(() => {
        if (passedDistanceMiles != null) return passedDistanceMiles;
        if (!coords || !data?.restaurant) return null;
        return getRestaurantDistance(data.restaurant, coords.lat, coords.long);
    }, [passedDistanceMiles, coords, data?.restaurant]);

    if (loading) {
        return <LoadingView message="Loading restaurant..." />;
    }

    if (error || !data) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{error || 'Restaurant not found'}</Text>
                <Pressable style={styles.retryButton} onPress={() => {
                    setLoading(true);
                    loadRestaurant().finally(() => setLoading(false));
                }}>
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    const { restaurant, categories, userAverageRating } = data;
    const hasAddress = Boolean(restaurant.location?.address);
    const hasDistance = distanceMiles != null;

    return (
        <ScrollView
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
            {userAverageRating ? (
                <Text style={styles.rating}>Your average rating: {userAverageRating}/5</Text>
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
                    {category.menuItems.map((item) => (
                        <View key={item._id} style={styles.menuItem}>
                            <Text style={styles.menuItemName}>{item.name}</Text>
                            {item.description ? (
                                <Text style={styles.menuItemDescription}>{item.description}</Text>
                            ) : null}
                        </View>
                    ))}
                </View>
            ))}
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
    rating: {
        marginTop: 10,
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
