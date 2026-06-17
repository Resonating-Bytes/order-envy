import React, { useCallback, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { fetchRestaurant } from '../api/client';
import LoadingView from '../components/LoadingView';

export default function RestaurantDetailScreen({ route, navigation }) {
    const { restaurantId, restaurantName } = route.params;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{restaurant.name}</Text>
            {restaurant.description ? (
                <Text style={styles.description}>{restaurant.description}</Text>
            ) : null}
            {restaurant.location?.address ? (
                <Text style={styles.address}>{restaurant.location.address}</Text>
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
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1b4332',
    },
    description: {
        marginTop: 8,
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
    },
    address: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
    },
    rating: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '600',
        color: '#2d6a4f',
    },
    checkinButton: {
        marginTop: 20,
        marginBottom: 12,
        backgroundColor: '#2d6a4f',
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
        backgroundColor: '#2d6a4f',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
});
