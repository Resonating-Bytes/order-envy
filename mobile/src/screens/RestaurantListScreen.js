import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { fetchRestaurants } from '../api/client';
import LoadingView from '../components/LoadingView';
import { useAuth } from '../context/AuthContext';

export default function RestaurantListScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadRestaurants = useCallback(async () => {
        setError('');
        try {
            const data = await fetchRestaurants();
            setRestaurants(data.restaurants || []);
        } catch (err) {
            setError(err.message || 'Failed to load restaurants');
        }
    }, []);

    React.useEffect(() => {
        loadRestaurants().finally(() => setLoading(false));
    }, [loadRestaurants]);

    async function handleRefresh() {
        setRefreshing(true);
        await loadRestaurants();
        setRefreshing(false);
    }

    if (loading) {
        return <LoadingView message="Loading restaurants..." />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hi, {user?.displayName || user?.username}</Text>
                    <Text style={styles.headerSub}>Your restaurants</Text>
                </View>
                <Pressable onPress={logout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Log out</Text>
                </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <FlatList
                data={restaurants}
                keyExtractor={(item) => item._id}
                refreshControl={(
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                )}
                contentContainerStyle={restaurants.length ? styles.list : styles.listEmpty}
                ListEmptyComponent={(
                    <Text style={styles.empty}>No restaurants yet.</Text>
                )}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.card}
                        onPress={() => navigation.navigate('RestaurantDetail', {
                            restaurantId: item._id,
                            restaurantName: item.name,
                        })}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        {item.description ? (
                            <Text style={styles.description} numberOfLines={2}>
                                {item.description}
                            </Text>
                        ) : null}
                        {item.location?.address ? (
                            <Text style={styles.address} numberOfLines={1}>
                                {item.location.address}
                            </Text>
                        ) : null}
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8faf8',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    greeting: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1b4332',
    },
    headerSub: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    logoutButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    logoutText: {
        color: '#2d6a4f',
        fontWeight: '600',
    },
    list: {
        padding: 16,
        gap: 12,
    },
    listEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    description: {
        marginTop: 6,
        color: '#4b5563',
        fontSize: 14,
    },
    address: {
        marginTop: 6,
        color: '#6b7280',
        fontSize: 13,
    },
    empty: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 16,
    },
    error: {
        color: '#b91c1c',
        paddingHorizontal: 20,
        paddingTop: 8,
    },
});
