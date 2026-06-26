import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchRestaurants, fetchRestaurantsCached, fetchRatingMeta } from '../api/client';
import { loadLocalFirst } from '../lib/localFirst';
import DropdownPicker from '../components/DropdownPicker';
import LoadingView from '../components/LoadingView';
import SettingsHeaderButton from '../components/SettingsHeaderButton';
import FriendsHeaderButton from '../components/FriendsHeaderButton';
import RecommendationsSection from '../components/RecommendationsSection';
import RatingImage from '../components/RatingImage';
import ScrollToTopButton from '../components/ScrollToTopButton';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader from '../hooks/useShrinkingScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useOutboxSyncRefresh } from '../hooks/useOutboxSyncRefresh';
import PendingSyncBadge from '../components/PendingSyncBadge';
import {
    formatDistance,
    getRestaurantDistance,
} from '../utils/distance';
import { requestCurrentLocation } from '../utils/location';
import { getSortLabel, getSortOptions, sortRestaurants } from '../utils/sortRestaurants';
import {
    enrichRestaurantsFromDetails,
    enrichRestaurantsWithUserRatings,
    listIncludesUserRatings,
} from '../utils/restaurantList';
import { colors } from '../theme/colors';

const RADIUS_OPTIONS = [
    { id: 25, label: '25 miles' },
    { id: 50, label: '50 miles' },
    { id: 100, label: '100 miles' },
    { id: 'all', label: 'All restaurants' },
];

const ADD_RESTAURANT_ITEM = { _id: '__add_restaurant__', listType: 'add' };

function getRadiusLabel(filterDist) {
    return RADIUS_OPTIONS.find((option) => option.id === filterDist)?.label || 'All restaurants';
}

function getRadiusOptions(locationStatus) {
    return RADIUS_OPTIONS.map((option) => ({
        ...option,
        disabled: locationStatus === 'denied' && option.id !== 'all',
        hint: locationStatus === 'denied' && option.id !== 'all' ? 'Needs location' : undefined,
    }));
}

function ListFiltersHeader({
    filterDist,
    sortBy,
    locationStatus,
    coords,
    error,
    recommendations,
    onFilterChange,
    onSortChange,
    onPressRecommendation,
    onRecommendationDeleted,
}) {
    return (
        <View>
            <RecommendationsSection
                recommendations={recommendations}
                onPressItem={onPressRecommendation}
                onDeleted={onRecommendationDeleted}
            />
            <View style={listHeaderStyles.controlsRow}>
                <DropdownPicker
                    label="Within"
                    value={filterDist}
                    displayValue={getRadiusLabel(filterDist)}
                    options={getRadiusOptions(locationStatus)}
                    onChange={onFilterChange}
                    menuTitle="Show restaurants within"
                />
                <DropdownPicker
                    label="Sort by"
                    value={sortBy}
                    displayValue={getSortLabel(sortBy)}
                    options={getSortOptions(!!coords)}
                    onChange={onSortChange}
                    menuTitle="Sort by"
                />
            </View>
            {error ? <Text style={listHeaderStyles.error}>{error}</Text> : null}
        </View>
    );
}

const listHeaderStyles = StyleSheet.create({
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    error: {
        color: '#b91c1c',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
});

export default function RestaurantListScreen({ navigation }) {
    const { user } = useAuth();
    const userId = user?.id || user?._id;
    const hasLoadedRef = useRef(false);
    const {
        scrollY,
        scrollRef,
        onScroll,
        scrollToTop,
        showScrollToTop,
    } = useAnimatedScreenScroll();

    const headerLeftAction = React.useMemo(() => (
        <FriendsHeaderButton onPress={() => navigation.navigate('Friends')} />
    ), [navigation]);

    const headerRightAction = React.useMemo(() => (
        <SettingsHeaderButton onPress={() => navigation.navigate('Settings')} />
    ), [navigation]);

    const handleAddRestaurant = useCallback(() => {
        navigation.navigate('RestaurantForm', { mode: 'create' });
    }, [navigation]);

    const headerPadding = useShrinkingScreenHeader(navigation, {
        title: 'Restaurants',
        scrollY,
        leftAction: headerLeftAction,
        rightAction: headerRightAction,
    });
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filterDist, setFilterDist] = useState(25);
    const [sortBy, setSortBy] = useState('name');
    const [coords, setCoords] = useState(null);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [ratingInfo, setRatingInfo] = useState([]);
    const [recommendations, setRecommendations] = useState([]);

    const displayedRestaurants = useMemo(
        () => sortRestaurants(restaurants, sortBy, coords),
        [restaurants, sortBy, coords]
    );

    const listData = useMemo(
        () => [ADD_RESTAURANT_ITEM, ...displayedRestaurants],
        [displayedRestaurants]
    );

    const loadRestaurants = useCallback(async ({
        nextFilterDist = filterDist,
        nextCoords = coords,
        refreshLocation = false,
        silent = false,
    } = {}) => {
        let activeCoords = nextCoords;
        if (refreshLocation || !activeCoords) {
            const location = await requestCurrentLocation();
            if (location.granted) {
                activeCoords = { lat: location.lat, long: location.long };
                setCoords(activeCoords);
                setLocationStatus('active');
            } else {
                setCoords(null);
                setLocationStatus('denied');
                activeCoords = null;
                if (nextFilterDist !== 'all') {
                    setFilterDist('all');
                    nextFilterDist = 'all';
                }
            }
        }

        const useLocationFilter = activeCoords && nextFilterDist !== 'all';
        const fetchParams = {
            lat: useLocationFilter ? activeCoords.lat : undefined,
            long: useLocationFilter ? activeCoords.long : undefined,
            filterDist: nextFilterDist,
        };

        const applyListData = (data) => {
            const rawList = data.restaurants || [];
            setRecommendations(data.recommendations || []);

            if (!userId) {
                setRestaurants(rawList);
                return;
            }

            if (listIncludesUserRatings(rawList)) {
                setRestaurants(enrichRestaurantsWithUserRatings(rawList, userId));
                return;
            }

            setRestaurants(rawList);
            enrichRestaurantsFromDetails(rawList, userId)
                .then(setRestaurants)
                .catch(() => {});
        };

        try {
            await loadLocalFirst({
                getCached: () => fetchRestaurantsCached(fetchParams),
                fetchFresh: () => fetchRestaurants(fetchParams),
                apply: applyListData,
                setLoading: silent ? undefined : setLoading,
                setRefreshing: silent ? setRefreshing : undefined,
                setError,
                silent,
            });
        } catch {
            // loadLocalFirst already surfaced the error when no cache was available
        }
    }, [coords, filterDist, userId]);

    React.useEffect(() => {
        loadRestaurants({ refreshLocation: true }).finally(() => {
            hasLoadedRef.current = true;
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (!hasLoadedRef.current) return undefined;
            loadRestaurants({ refreshLocation: false, silent: true });
            return undefined;
        }, [loadRestaurants])
    );

    useOutboxSyncRefresh(() => {
        loadRestaurants({ refreshLocation: false, silent: true });
    });

    React.useEffect(() => {
        fetchRatingMeta()
            .then((meta) => setRatingInfo(meta.ratingInfo || []))
            .catch(() => setRatingInfo([]));
    }, []);

    React.useEffect(() => {
        if (sortBy === 'distance' && !coords) {
            setSortBy('name');
        }
    }, [coords, sortBy]);

    const handleRefresh = useCallback(async () => {
        await loadRestaurants({ refreshLocation: true, silent: true });
    }, [loadRestaurants]);

    const handleFilterChange = useCallback(async (value) => {
        if (locationStatus === 'denied' && value !== 'all') {
            setError('Enable location permission to filter by distance.');
            return;
        }

        setError('');
        setFilterDist(value);
        setLoading(true);
        await loadRestaurants({ nextFilterDist: value });
        setLoading(false);
    }, [locationStatus, loadRestaurants]);

    const handlePressRecommendation = useCallback((item) => {
        navigation.navigate('RestaurantDetail', {
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
        });
    }, [navigation]);

    const renderListHeader = useCallback(() => (
        <ListFiltersHeader
            filterDist={filterDist}
            sortBy={sortBy}
            locationStatus={locationStatus}
            coords={coords}
            error={error}
            recommendations={recommendations}
            onFilterChange={handleFilterChange}
            onSortChange={setSortBy}
            onPressRecommendation={handlePressRecommendation}
            onRecommendationDeleted={handleRefresh}
        />
    ), [
        filterDist,
        sortBy,
        locationStatus,
        coords,
        error,
        recommendations,
        handleFilterChange,
        handlePressRecommendation,
        handleRefresh,
    ]);

    const renderAddRestaurant = useCallback(() => (
        <Pressable
            style={({ pressed }) => [
                styles.addCard,
                pressed && styles.addCardPressed,
            ]}
            onPress={handleAddRestaurant}
        >
            <Ionicons name="add" size={22} color={colors.primary} />
            <Text style={styles.addCardText}>Add restaurant</Text>
        </Pressable>
    ), [handleAddRestaurant]);

    const renderItem = useCallback(({ item }) => {
        if (item.listType === 'add') {
            return renderAddRestaurant();
        }

        const miles = coords
            ? getRestaurantDistance(item, coords.lat, coords.long)
            : null;

        return (
            <Pressable
                style={styles.card}
                onPress={() => navigation.navigate('RestaurantDetail', {
                    restaurantId: item._id,
                    restaurantName: item.name,
                    distanceMiles: miles,
                })}
            >
                <View style={styles.cardMain}>
                    <Text style={styles.name} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {item._pendingSync ? <PendingSyncBadge /> : null}
                    {(miles != null || item.location?.address) ? (
                        <View style={styles.metaRow}>
                            {miles != null ? (
                                <Text style={styles.distance}>{formatDistance(miles)}</Text>
                            ) : null}
                            {item.location?.address ? (
                                <Text style={styles.address} numberOfLines={1}>
                                    {item.location.address}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                </View>
                {item.userAverageRating != null ? (
                    <View style={styles.cardRating}>
                        <RatingImage
                            rating={item.userAverageRating}
                            ratingInfo={ratingInfo}
                            size={56}
                        />
                    </View>
                ) : null}
                <View style={styles.cardChevron}>
                    <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
                </View>
            </Pressable>
        );
    }, [coords, navigation, ratingInfo, renderAddRestaurant]);

    const emptyMessage = locationStatus === 'active' && filterDist !== 'all'
        ? `No restaurants within ${filterDist} miles.`
        : 'No restaurants yet.';

    const renderListFooter = useCallback(() => (
        displayedRestaurants.length === 0 ? (
            <Text style={styles.empty}>{emptyMessage}</Text>
        ) : null
    ), [displayedRestaurants.length, emptyMessage]);

    if (loading && !refreshing && restaurants.length === 0) {
        return <LoadingView message="Loading restaurants..." />;
    }

    return (
        <View style={styles.screen}>
            <FlatList
                ref={scrollRef}
                style={styles.list}
                data={listData}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        progressViewOffset={headerPadding}
                    />
                )}
                contentContainerStyle={[styles.listContent, { paddingTop: headerPadding }]}
            />
            <ScrollToTopButton visible={showScrollToTop} onPress={scrollToTop} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#f8faf8',
    },
    addCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginTop: 12,
        marginBottom: 12,
    },
    addCardPressed: {
        opacity: 0.85,
    },
    addCardText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    cardMain: {
        flex: 1,
        minWidth: 0,
        gap: 4,
    },
    cardRating: {
        width: 56,
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    cardChevron: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: 2,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 18,
    },
    address: {
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        color: '#6b7280',
    },
    metaSeparator: {
        fontSize: 13,
        color: '#d1d5db',
        flexShrink: 0,
    },
    distance: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
        flexShrink: 0,
    },
    empty: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 16,
        paddingVertical: 24,
    },
});
