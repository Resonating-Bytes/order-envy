import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { fetchRestaurants, fetchRatingMeta } from '../api/client';
import DropdownPicker from '../components/DropdownPicker';
import LoadingView from '../components/LoadingView';
import LogoutHeaderButton from '../components/LogoutHeaderButton';
import RatingImage from '../components/RatingImage';
import ScrollToTopButton from '../components/ScrollToTopButton';
import ShrinkingScreenHeader, { getExpandedHeaderHeight } from '../components/ShrinkingScreenHeader';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import { useAuth } from '../context/AuthContext';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RADIUS_OPTIONS = [
    { id: 25, label: '25 miles' },
    { id: 50, label: '50 miles' },
    { id: 100, label: '100 miles' },
    { id: 'all', label: 'All restaurants' },
];

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
    onFilterChange,
    onSortChange,
}) {
    return (
        <View>
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
    const { logout, user } = useAuth();
    const userId = user?.id || user?._id;
    const insets = useSafeAreaInsets();
    const {
        scrollY,
        scrollRef,
        onScroll,
        scrollToTop,
        showScrollToTop,
    } = useAnimatedScreenScroll();
    const listTopPadding = getExpandedHeaderHeight(insets.top);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filterDist, setFilterDist] = useState(25);
    const [sortBy, setSortBy] = useState('name');
    const [coords, setCoords] = useState(null);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [ratingInfo, setRatingInfo] = useState([]);

    const displayedRestaurants = useMemo(
        () => sortRestaurants(restaurants, sortBy, coords),
        [restaurants, sortBy, coords]
    );

    const loadRestaurants = useCallback(async ({
        nextFilterDist = filterDist,
        nextCoords = coords,
        refreshLocation = false,
    } = {}) => {
        setError('');

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

        try {
            const useLocationFilter = activeCoords && nextFilterDist !== 'all';
            const data = await fetchRestaurants({
                lat: useLocationFilter ? activeCoords.lat : undefined,
                long: useLocationFilter ? activeCoords.long : undefined,
                filterDist: nextFilterDist,
            });

            const rawList = data.restaurants || [];

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
        } catch (err) {
            setError(err.message || 'Failed to load restaurants');
        }
    }, [coords, filterDist, userId]);

    React.useEffect(() => {
        loadRestaurants({ refreshLocation: true }).finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        fetchRatingMeta()
            .then((meta) => setRatingInfo(meta.ratingInfo || []))
            .catch(() => setRatingInfo([]));
    }, []);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerTransparent: true,
            headerShadowVisible: false,
            headerTitle: '',
            header: () => (
                <ShrinkingScreenHeader
                    scrollY={scrollY}
                    title="Restaurants"
                    rightAction={<LogoutHeaderButton onPress={logout} />}
                />
            ),
        });
    }, [navigation, logout, scrollY]);

    React.useEffect(() => {
        if (sortBy === 'distance' && !coords) {
            setSortBy('name');
        }
    }, [coords, sortBy]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRestaurants({ refreshLocation: true });
        setRefreshing(false);
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

    const renderListHeader = useCallback(() => (
        <ListFiltersHeader
            filterDist={filterDist}
            sortBy={sortBy}
            locationStatus={locationStatus}
            coords={coords}
            error={error}
            onFilterChange={handleFilterChange}
            onSortChange={setSortBy}
        />
    ), [filterDist, sortBy, locationStatus, coords, error, handleFilterChange]);

    const renderItem = useCallback(({ item }) => {
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
                    <View style={styles.metaRow}>
                        {item.location?.address ? (
                            <Text style={styles.address} numberOfLines={1}>
                                {item.location.address}
                            </Text>
                        ) : (
                            <View style={styles.addressSpacer} />
                        )}
                        {miles != null ? (
                            <Text style={styles.distance}>{formatDistance(miles)}</Text>
                        ) : null}
                    </View>
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
            </Pressable>
        );
    }, [coords, navigation, ratingInfo]);

    if (loading && !refreshing && restaurants.length === 0) {
        return <LoadingView message="Loading restaurants..." />;
    }

    return (
        <View style={styles.screen}>
            <FlatList
                ref={scrollRef}
                style={styles.list}
                data={displayedRestaurants}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                ListHeaderComponent={renderListHeader}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        progressViewOffset={listTopPadding}
                    />
                )}
                contentContainerStyle={
                    displayedRestaurants.length
                        ? [styles.listContent, { paddingTop: listTopPadding }]
                        : [styles.listEmpty, { paddingTop: listTopPadding }]
                }
                ListEmptyComponent={(
                    <Text style={styles.empty}>
                        {locationStatus === 'active' && filterDist !== 'all'
                            ? `No restaurants within ${filterDist} miles.`
                            : 'No restaurants yet.'}
                    </Text>
                )}
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
    listEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#f8faf8',
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
        justifyContent: 'center',
        gap: 4,
    },
    cardRating: {
        width: 56,
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 18,
    },
    address: {
        flex: 1,
        fontSize: 13,
        color: '#6b7280',
    },
    addressSpacer: {
        flex: 1,
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
