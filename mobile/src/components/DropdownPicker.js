import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function DropdownPicker({
    label,
    value,
    displayValue,
    options,
    onChange,
    disabled = false,
    menuTitle,
    triggerStyle,
}) {
    const [open, setOpen] = useState(false);

    function handleSelect(option) {
        if (option.disabled) {
            return;
        }
        onChange(option.id);
        setOpen(false);
    }

    const shownValue = displayValue || value;

    return (
        <>
            <Pressable
                style={[
                    styles.trigger,
                    disabled && styles.triggerDisabled,
                    triggerStyle,
                ]}
                onPress={() => !disabled && setOpen(true)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${shownValue}`}
                accessibilityState={{ expanded: open, disabled }}
            >
                <View style={styles.triggerText}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.value} numberOfLines={1}>{shownValue}</Text>
                </View>
                <Ionicons
                    name="chevron-down"
                    size={18}
                    color={disabled ? '#9ca3af' : colors.primary}
                />
            </Pressable>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.menu} onPress={(event) => event.stopPropagation()}>
                        <Text style={styles.menuTitle}>{menuTitle || label}</Text>
                        {options.map((option) => {
                            const selected = value === option.id;
                            const optionDisabled = !!option.disabled;

                            return (
                                <Pressable
                                    key={String(option.id)}
                                    style={[styles.option, selected && styles.optionSelected]}
                                    onPress={() => handleSelect(option)}
                                    disabled={optionDisabled}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        selected && styles.optionTextSelected,
                                        optionDisabled && styles.optionTextDisabled,
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {option.hint ? (
                                        <Text style={styles.optionHint}>{option.hint}</Text>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        backgroundColor: '#fafafa',
    },
    triggerDisabled: {
        opacity: 0.55,
        backgroundColor: '#f3f4f6',
    },
    triggerText: {
        flex: 1,
        minWidth: 0,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    value: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primaryDarker,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'center',
        padding: 24,
    },
    menu: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 8,
        overflow: 'hidden',
    },
    menuTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6b7280',
        paddingHorizontal: 16,
        paddingVertical: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    option: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    optionSelected: {
        backgroundColor: colors.primaryLight,
    },
    optionText: {
        fontSize: 16,
        color: '#111827',
    },
    optionTextSelected: {
        color: colors.primaryDarker,
        fontWeight: '700',
    },
    optionTextDisabled: {
        color: '#9ca3af',
    },
    optionHint: {
        marginTop: 2,
        fontSize: 12,
        color: '#9ca3af',
    },
});
