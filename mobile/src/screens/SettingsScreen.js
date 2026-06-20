import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader, { useHeaderBackButton } from '../hooks/useShrinkingScreenHeader';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

function Field({ label, children }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

export default function SettingsScreen({ navigation }) {
    const { user, logout, refreshUser, updateProfile } = useAuth();
    const backButton = useHeaderBackButton(navigation);
    const { scrollY, onScroll } = useAnimatedScreenScroll();
    const headerPadding = useShrinkingScreenHeader(navigation, {
        title: 'Settings',
        scrollY,
        leftAction: backButton,
    });

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const syncFormFromUser = useCallback(() => {
        setEmail(user?.email || user?.username || '');
        setFirstName(user?.firstName || '');
        setLastName(user?.lastName || '');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            refreshUser();
        }, [refreshUser])
    );

    useEffect(() => {
        syncFormFromUser();
    }, [syncFormFromUser]);

    async function handleSave() {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Email is required.');
            return;
        }

        if (newPassword || confirmPassword || oldPassword) {
            if (!oldPassword) {
                setError('Enter your current password to set a new one.');
                return;
            }
            if (!newPassword) {
                setError('Enter a new password.');
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('New passwords do not match.');
                return;
            }
        }

        const payload = {
            username: trimmedEmail,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
        };
        if (newPassword) {
            payload.oldPassword = oldPassword;
            payload.newPassword = newPassword;
        }

        setError('');
        setSubmitting(true);
        try {
            await updateProfile(payload);
            Alert.alert('Saved', 'Your profile was updated.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setSubmitting(false);
        }
    }

    function handleLogoutPress() {
        Alert.alert(
            'Log out?',
            'You will need to sign in again to use Order Envy.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: () => {
                        logout();
                    },
                },
            ],
        );
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
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.card}>
                        <Field label="Email">
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                            />
                        </Field>
                        <Field label="First name">
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCorrect={false}
                            />
                        </Field>
                        <Field label="Last name">
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                autoCorrect={false}
                            />
                        </Field>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Change password</Text>
                    <Text style={styles.help}>
                        Leave blank to keep your current password. Google sign-in accounts
                        need a password set on the web before changing it here.
                    </Text>
                    <View style={styles.card}>
                        <Field label="Current password">
                            <TextInput
                                style={styles.input}
                                value={oldPassword}
                                onChangeText={setOldPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </Field>
                        <Field label="New password">
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </Field>
                        <Field label="Confirm new password">
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </Field>
                    </View>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                    style={[styles.saveButton, submitting && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={submitting}
                >
                    <Text style={styles.saveButtonText}>
                        {submitting ? 'Saving...' : 'Save changes'}
                    </Text>
                </Pressable>

                <View style={styles.section}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.logoutButton,
                            pressed && styles.logoutButtonPressed,
                        ]}
                        onPress={handleLogoutPress}
                    >
                        <Text style={styles.logoutButtonText}>Log out</Text>
                    </Pressable>
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
    help: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 10,
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 14,
    },
    field: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fafafa',
        fontSize: 15,
        minHeight: 44,
    },
    saveButton: {
        marginBottom: 24,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    error: {
        color: colors.error,
        marginBottom: 12,
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.error,
        paddingVertical: 14,
        alignItems: 'center',
    },
    logoutButtonPressed: {
        opacity: 0.85,
    },
    logoutButtonText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
    },
});
