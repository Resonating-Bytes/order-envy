import React, { useCallback, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import {
    createRestaurant,
    deleteRestaurant,
    fetchRestaurant,
    geocodeAddress,
    reverseGeocode,
    updateRestaurant,
} from '../api/client';
import LoadingView from '../components/LoadingView';
import ScrollToTopButton from '../components/ScrollToTopButton';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader, { useHeaderBackButton } from '../hooks/useShrinkingScreenHeader';
import { requestCurrentLocation } from '../utils/location';
import { notifyIfOfflineQueued } from '../utils/offlineFeedback';
import { getIsOnline } from '../lib/network';
import {
    buildRestaurantPayload,
    formatReverseGeocodeAddress,
    isValidLatLong,
    resolveRestaurantLocation,
} from '../utils/restaurantForm';
import { colors } from '../theme/colors';

function confirmNoAddress() {
    return new Promise((resolve) => {
        Alert.alert(
            'No address',
            'Are you sure you want to save a restaurant with no address?',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Save anyway', onPress: () => resolve(true) },
            ]
        );
    });
}

function confirmDelete(restaurantName) {
    return new Promise((resolve) => {
        Alert.alert(
            'Delete restaurant',
            `Delete ${restaurantName || 'this restaurant'}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
        );
    });
}

export default function RestaurantFormScreen({ route, navigation }) {
    const { mode, restaurantId, restaurantName: initialName } = route.params;
    const isEdit = mode === 'edit';
    const headerTitle = isEdit ? 'Edit restaurant' : 'New restaurant';
    const backButton = useHeaderBackButton(navigation);
    const {
        scrollRef,
        onScroll,
        scrollToTop,
        showScrollToTop,
        scrollY,
    } = useAnimatedScreenScroll();
    const headerPadding = useShrinkingScreenHeader(navigation, {
        title: headerTitle,
        scrollY,
        leftAction: backButton,
    });

    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [locating, setLocating] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState(initialName || '');
    const [website, setWebsite] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState(null);
    const [long, setLong] = useState(null);
    const [showFindMe, setShowFindMe] = useState(true);

    const loadRestaurant = useCallback(async () => {
        if (!isEdit || !restaurantId) return;

        setError('');
        try {
            const data = await fetchRestaurant(restaurantId);
            const restaurant = data.restaurant;
            setName(restaurant.name || '');
            setWebsite(restaurant.website || '');
            setPhone(restaurant.phone || '');
            setDescription(restaurant.description || '');
            setAddress(restaurant.location?.address || '');
            const savedLat = restaurant.location?.lat;
            const savedLong = restaurant.location?.long;
            setLat(savedLat);
            setLong(savedLong);
            setShowFindMe(!isValidLatLong(savedLat, savedLong));
        } catch (err) {
            setError(err.message || 'Failed to load restaurant');
        }
    }, [isEdit, restaurantId]);

    const handleFindMe = useCallback(async ({ silent = false } = {}) => {
        setError('');
        setLocating(true);
        try {
            const location = await requestCurrentLocation();
            if (!location.granted) {
                if (!silent) {
                    setError('Unable to retrieve your location');
                }
                return;
            }

            const result = await reverseGeocode(location.lat, location.long);
            const formatted = formatReverseGeocodeAddress(result);
            if (formatted) {
                setAddress(formatted);
                setLat(location.lat);
                setLong(location.long);
                setShowFindMe(false);
            } else {
                setAddress(`Failed to find address for ${location.lat} ${location.long}`);
            }
        } catch (err) {
            if (!silent) {
                setError(err.message || 'Failed to look up your location');
            }
        } finally {
            setLocating(false);
        }
    }, []);

    React.useEffect(() => {
        if (!isEdit) {
            handleFindMe({ silent: true });
        }
    }, [isEdit, handleFindMe]);

    React.useEffect(() => {
        if (!isEdit) return;
        loadRestaurant().finally(() => setLoading(false));
    }, [isEdit, loadRestaurant]);

    function handleAddressChange(value) {
        setAddress(value);
        setLat(null);
        setLong(null);
        setShowFindMe(true);
    }

    async function handleSave() {
        setError('');

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Restaurant name is required.');
            return;
        }

        const trimmedAddress = address.trim();
        if (!trimmedAddress) {
            const proceed = await confirmNoAddress();
            if (!proceed) return;
        }

        setSubmitting(true);
        try {
            const location = await resolveRestaurantLocation({
                address,
                lat,
                long,
                geocodeAddress,
            });

            const payload = buildRestaurantPayload({
                name: trimmedName,
                description,
                website,
                phone,
                address: location.address,
                lat: location.lat,
                long: location.long,
            });

            if (isEdit) {
                const result = await updateRestaurant(restaurantId, payload);
                notifyIfOfflineQueued(result, 'Restaurant');
                navigation.goBack();
            } else {
                const result = await createRestaurant(payload);
                notifyIfOfflineQueued(result, 'Restaurant');
                navigation.replace('RestaurantDetail', {
                    restaurantId: result.restaurant._id,
                    restaurantName: result.restaurant.name,
                });
            }
        } catch (err) {
            if (!getIsOnline() && /geocode|network|offline|fetch/i.test(err.message || '')) {
                setError('Offline — use Find me for GPS coordinates, or save with an address only.');
            } else {
                setError(err.message || 'Failed to save restaurant');
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        const proceed = await confirmDelete(name.trim() || initialName);
        if (!proceed) return;

        setDeleting(true);
        setError('');
        try {
            const result = await deleteRestaurant(restaurantId);
            notifyIfOfflineQueued(result, 'Delete');
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'RestaurantList' }],
                })
            );
        } catch (err) {
            setError(err.message || 'Failed to delete restaurant');
            setDeleting(false);
        }
    }

    if (loading) {
        return <LoadingView message="Loading restaurant..." />;
    }

    const busy = submitting || deleting || locating;

    return (
        <View style={styles.screen}>
            <ScrollView
                ref={scrollRef}
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingTop: headerPadding }]}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Restaurant name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus={!isEdit}
                />

                <Text style={styles.label}>Website</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Website"
                    value={website}
                    onChangeText={setWebsite}
                    autoCapitalize="none"
                    keyboardType="url"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Phone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="Description"
                    value={description}
                    onChangeText={setDescription}
                    autoCapitalize="sentences"
                    multiline
                    textAlignVertical="top"
                />

                <Text style={styles.label}>Address</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Address (at least City, State)"
                    value={address}
                    onChangeText={handleAddressChange}
                    autoCapitalize="words"
                />

                {showFindMe ? (
                    <Pressable
                        style={[styles.findMeButton, locating && styles.buttonDisabled]}
                        onPress={() => handleFindMe()}
                        disabled={busy}
                    >
                        <Text style={styles.findMeText}>
                            {locating ? 'Finding you...' : 'Use my location'}
                        </Text>
                    </Pressable>
                ) : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                    style={[styles.saveButton, busy && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={busy}
                >
                    <Text style={styles.saveButtonText}>
                        {submitting ? 'Saving...' : 'Save'}
                    </Text>
                </Pressable>

                {isEdit ? (
                    <Pressable
                        style={[styles.deleteButton, busy && styles.buttonDisabled]}
                        onPress={handleDelete}
                        disabled={busy}
                    >
                        <Text style={styles.deleteButtonText}>
                            {deleting ? 'Deleting...' : 'Delete restaurant'}
                        </Text>
                    </Pressable>
                ) : null}
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
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        fontSize: 15,
        minHeight: 44,
    },
    multiline: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    findMeButton: {
        marginTop: 12,
        backgroundColor: '#28a745',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    findMeText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    saveButton: {
        marginTop: 24,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
    },
    deleteButtonText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    error: {
        color: colors.error,
        marginTop: 12,
    },
});
