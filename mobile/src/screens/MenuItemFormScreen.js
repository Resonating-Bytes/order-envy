import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    createMenuItem,
    deleteMenuItem,
    fetchMenuCategories,
    fetchMenuItem,
    updateMenuItem,
} from '../api/client';
import DropdownPicker from '../components/DropdownPicker';
import LoadingView from '../components/LoadingView';
import FormKeyboardAvoidingView from '../components/FormKeyboardAvoidingView';
import ScrollToTopButton from '../components/ScrollToTopButton';
import useAnimatedScreenScroll from '../hooks/useAnimatedScreenScroll';
import useShrinkingScreenHeader, { useHeaderBackButton } from '../hooks/useShrinkingScreenHeader';
import { notifyIfOfflineQueued } from '../utils/offlineFeedback';
import { colors } from '../theme/colors';

const DEFAULT_CATEGORY = 'Entree';

function confirmDelete(itemName) {
    return new Promise((resolve) => {
        Alert.alert(
            'Delete menu item',
            `Delete ${itemName || 'this menu item'}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
        );
    });
}

export default function MenuItemFormScreen({ route, navigation }) {
    const {
        mode,
        restaurantId,
        restaurantName,
        menuItemId,
        menuItemName: initialName,
    } = route.params;
    const isEdit = mode === 'edit';
    const headerTitle = isEdit ? 'Edit menu item' : 'Add menu item';
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

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState(initialName || '');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(DEFAULT_CATEGORY);
    const [nextAction, setNextAction] = useState('rating');

    const categoryOptions = useMemo(
        () => categories.map((label) => ({ id: label, label })),
        [categories]
    );

    const loadForm = useCallback(async () => {
        setError('');
        try {
            const categoriesResult = await fetchMenuCategories(restaurantId);
            const categoryList = categoriesResult.categories || [];
            setCategories(categoryList);

            if (isEdit && menuItemId) {
                const result = await fetchMenuItem(restaurantId, menuItemId);
                const menuItem = result.menuItem;
                setName(menuItem.name || '');
                setDescription(menuItem.description || '');
                setCategory(menuItem.category || DEFAULT_CATEGORY);
            } else if (!categoryList.includes(DEFAULT_CATEGORY) && categoryList.length > 0) {
                setCategory(categoryList[0]);
            }
        } catch (err) {
            setError(err.message || 'Failed to load form');
        }
    }, [isEdit, menuItemId, restaurantId]);

    React.useEffect(() => {
        loadForm().finally(() => setLoading(false));
    }, [loadForm]);

    async function handleSave() {
        setError('');

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Menu item name is required.');
            return;
        }

        const payload = {
            name: trimmedName,
            description: description.trim(),
            category,
        };

        setSubmitting(true);
        try {
            if (isEdit) {
                const result = await updateMenuItem(restaurantId, menuItemId, payload);
                notifyIfOfflineQueued(result, 'Menu item');
                navigation.goBack();
            } else {
                const result = await createMenuItem(restaurantId, payload);
                notifyIfOfflineQueued(result, 'Menu item');
                if (nextAction === 'rating') {
                    navigation.replace('CheckIn', {
                        restaurantId,
                        restaurantName,
                        focusMenuItemId: result.menuItem._id,
                    });
                } else if (nextAction === 'recommend') {
                    navigation.replace('Recommend', {
                        restaurantId,
                        restaurantName,
                        menuItemId: result.menuItem._id,
                        menuItemName: result.menuItem.name,
                    });
                } else {
                    navigation.goBack();
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to save menu item');
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
            const result = await deleteMenuItem(restaurantId, menuItemId);
            notifyIfOfflineQueued(result, 'Delete');
            navigation.goBack();
        } catch (err) {
            setError(err.message || 'Failed to delete menu item');
            setDeleting(false);
        }
    }

    if (loading) {
        return <LoadingView message="Loading menu item..." />;
    }

    const busy = submitting || deleting;

    return (
        <FormKeyboardAvoidingView style={styles.screen}>
            <ScrollView
                ref={scrollRef}
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingTop: headerPadding }]}
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {restaurantName ? (
                    <Text style={styles.restaurantName}>{restaurantName}</Text>
                ) : null}

                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Menu item name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus={!isEdit}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />

                <Text style={styles.label}>Category</Text>
                <DropdownPicker
                    label="Category"
                    value={category}
                    displayValue={category}
                    options={categoryOptions}
                    onChange={setCategory}
                    menuTitle="Category"
                    triggerStyle={styles.categoryTrigger}
                />

                {!isEdit ? (
                    <View style={styles.nextActionSection}>
                        <Text style={styles.nextActionTitle}>After saving...</Text>
                        <Pressable
                            style={styles.nextActionRow}
                            onPress={() => setNextAction('rating')}
                        >
                            <View style={[
                                styles.radioOuter,
                                nextAction === 'rating' && styles.radioOuterSelected,
                            ]}
                            >
                                {nextAction === 'rating' ? <View style={styles.radioInner} /> : null}
                            </View>
                            <Text style={styles.nextActionLabel}>
                                Add a rating for this menu item
                            </Text>
                        </Pressable>
                        <Pressable
                            style={styles.nextActionRow}
                            onPress={() => setNextAction('recommend')}
                        >
                            <View style={[
                                styles.radioOuter,
                                nextAction === 'recommend' && styles.radioOuterSelected,
                            ]}
                            >
                                {nextAction === 'recommend' ? <View style={styles.radioInner} /> : null}
                            </View>
                            <Text style={styles.nextActionLabel}>
                                Recommend this menu item
                            </Text>
                        </Pressable>
                    </View>
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
                    <>
                        <Pressable
                            style={styles.recommendButton}
                            onPress={() => navigation.navigate('Recommend', {
                                restaurantId,
                                restaurantName,
                                menuItemId,
                                menuItemName: name.trim() || initialName,
                            })}
                        >
                            <Text style={styles.recommendButtonText}>Recommend to...</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.deleteButton, busy && styles.buttonDisabled]}
                            onPress={handleDelete}
                            disabled={busy}
                        >
                            <Text style={styles.deleteButtonText}>
                                {deleting ? 'Deleting...' : 'Delete menu item'}
                            </Text>
                        </Pressable>
                    </>
                ) : null}
            </ScrollView>
            <ScrollToTopButton visible={showScrollToTop} onPress={scrollToTop} />
        </FormKeyboardAvoidingView>
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
    restaurantName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 4,
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
    categoryTrigger: {
        flex: 0,
        alignSelf: 'stretch',
        width: '100%',
    },
    nextActionSection: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 14,
    },
    nextActionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    nextActionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    nextActionTextBlock: {
        flex: 1,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    radioOuterSelected: {
        borderColor: colors.primary,
    },
    radioOuterDisabled: {
        borderColor: '#d1d5db',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    nextActionLabel: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        lineHeight: 22,
    },
    nextActionLabelDisabled: {
        fontSize: 15,
        color: '#9ca3af',
        lineHeight: 22,
    },
    nextActionHint: {
        marginTop: 2,
        fontSize: 13,
        color: '#9ca3af',
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
    recommendButton: {
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#9ca3af',
        backgroundColor: '#fff',
    },
    recommendButtonText: {
        color: '#374151',
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
