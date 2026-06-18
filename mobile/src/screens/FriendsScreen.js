import React, { useCallback, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    confirmFriend,
    declineFriend,
    fetchFriendRequests,
    removeFriend,
} from '../api/client';
import LoadingView from '../components/LoadingView';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader, { useHeaderBackButton } from '../hooks/useShrinkingScreenHeader';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { normalizeFriend } from '../utils/friends';

function getRequestName(request) {
    return request.source?.getDisplayName?.()
        || request.source?.displayName
        || request.source?.username
        || request.source?.email
        || 'Friend request';
}

export default function FriendsScreen({ navigation }) {
    const { refreshUser } = useAuth();
    const backButton = useHeaderBackButton(navigation);
    const { scrollY, onScroll } = useAnimatedScreenScroll();
    const headerPadding = useShrinkingScreenHeader(navigation, {
        title: 'Friends',
        scrollY,
        leftAction: backButton,
    });

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [error, setError] = useState('');

    const loadFriends = useCallback(async () => {
        setError('');
        try {
            const [requestsData, profileUser] = await Promise.all([
                fetchFriendRequests(),
                refreshUser(),
            ]);
            setRequests(requestsData.friendRequests || []);
            setFriends((profileUser?.friends || [])
                .map(normalizeFriend)
                .filter(Boolean));
        } catch (err) {
            setError(err.message || 'Failed to load friends');
        }
    }, [refreshUser]);

    useFocusEffect(
        useCallback(() => {
            loadFriends().finally(() => setLoading(false));
        }, [loadFriends])
    );

    async function handleConfirm(token, name) {
        try {
            await confirmFriend(token);
            await loadFriends();
            Alert.alert('Friend added', `${name} is now your friend.`);
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to confirm request');
        }
    }

    function handleDecline(token, name) {
        Alert.alert('Decline request', `Decline the request from ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Decline',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await declineFriend(token);
                        await loadFriends();
                    } catch (err) {
                        Alert.alert('Error', err.message || 'Failed to decline request');
                    }
                },
            },
        ]);
    }

    function handleRemove(friend) {
        const label = friend.displayName || 'this friend';
        Alert.alert('Remove friend', `Remove ${label}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await removeFriend(friend.id);
                        await loadFriends();
                    } catch (err) {
                        Alert.alert('Error', err.message || 'Failed to remove friend');
                    }
                },
            },
        ]);
    }

    if (loading) {
        return <LoadingView message="Loading friends..." />;
    }

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingTop: headerPadding }]}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {error ? <Text style={styles.error}>{error}</Text> : null}

                {requests.length ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Friend requests</Text>
                        {requests.map((request) => {
                            const name = getRequestName(request);
                            const requestKey = request._id || request.token;
                            return (
                                <View key={requestKey} style={styles.row}>
                                    <Pressable
                                        style={[styles.actionButton, styles.confirmButton]}
                                        onPress={() => handleConfirm(request.token, name)}
                                    >
                                        <Text style={styles.confirmText}>{name}</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.iconButton, styles.declineButton]}
                                        onPress={() => handleDecline(request.token, name)}
                                        accessibilityLabel={`Decline ${name}`}
                                    >
                                        <Text style={styles.declineText}>×</Text>
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                <View style={styles.section}>
                    <Pressable
                        style={styles.addButton}
                        onPress={() => navigation.navigate('AddFriend')}
                    >
                        <Text style={styles.addButtonText}>Add friend</Text>
                    </Pressable>

                    {friends.length ? friends.map((friend) => (
                        <View key={friend.id} style={styles.row}>
                            <View style={styles.friendCard}>
                                <Text style={styles.friendName}>{friend.displayName}</Text>
                            </View>
                            <Pressable
                                style={[styles.iconButton, styles.declineButton]}
                                onPress={() => handleRemove(friend)}
                                accessibilityLabel={`Remove ${friend.displayName || 'friend'}`}
                            >
                                <Text style={styles.declineText}>×</Text>
                            </Pressable>
                        </View>
                    )) : (
                        <Text style={styles.empty}>No friends yet.</Text>
                    )}
                </View>
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
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 8,
        marginBottom: 8,
    },
    actionButton: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
    },
    confirmButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#28a745',
    },
    confirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#166534',
    },
    friendCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
    },
    friendName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primaryDarker,
    },
    iconButton: {
        width: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    declineButton: {
        borderColor: colors.error,
    },
    declineText: {
        fontSize: 22,
        lineHeight: 24,
        color: colors.error,
        fontWeight: '600',
    },
    addButton: {
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    addButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    empty: {
        color: colors.textMuted,
        fontSize: 14,
    },
    error: {
        color: colors.error,
        marginBottom: 12,
    },
});
