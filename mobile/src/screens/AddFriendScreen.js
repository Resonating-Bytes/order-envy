import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { inviteFriend, requestFriend } from '../api/client';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader, { useHeaderBackButton } from '../hooks/useShrinkingScreenHeader';
import { colors } from '../theme/colors';

export default function AddFriendScreen({ navigation }) {
    const backButton = useHeaderBackButton(navigation);
    const { scrollY, onScroll } = useAnimatedScreenScroll();
    const headerPadding = useShrinkingScreenHeader(navigation, {
        title: 'Add friend',
        scrollY,
        leftAction: backButton,
    });

    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        const value = email.trim();
        if (!value) {
            setError('Enter your friend\'s email.');
            return;
        }

        setError('');
        setSubmitting(true);
        try {
            const body = value.includes('@') ? { email: value } : { username: value };
            await requestFriend(body);
            Alert.alert(
                'Friend request sent',
                `${value} already uses Order Envy. We emailed them to confirm your friend request.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (err) {
            if (err.status === 404 && (err.canInvite || value.includes('@'))) {
                try {
                    await inviteFriend(value);
                    Alert.alert(
                        'Invite sent',
                        `${value} isn't on Order Envy yet. We emailed them an invite to sign up and be your friend.`,
                        [{ text: 'OK', onPress: () => navigation.goBack() }],
                    );
                } catch (inviteErr) {
                    setError(inviteErr.message || 'Failed to send invite');
                }
            } else {
                setError(err.message || 'Failed to add friend');
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
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                <Text style={styles.help}>
                    Enter your friend's email address. If they already use Order Envy, we'll
                    send a friend request. If not, we'll email them an invite to join.
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="friend@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                    style={[styles.button, submitting && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={styles.buttonText}>
                        {submitting ? 'Sending...' : 'Send'}
                    </Text>
                </Pressable>
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
    },
    help: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 12,
        lineHeight: 20,
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
    button: {
        marginTop: 20,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    error: {
        color: colors.error,
        marginTop: 12,
    },
});
