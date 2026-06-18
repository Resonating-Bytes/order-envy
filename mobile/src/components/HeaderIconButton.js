import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export const headerIconButtonStyles = StyleSheet.create({
    button: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
    },
    iconFrame: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default function HeaderIconButton({
    onPress,
    icon,
    accessibilityLabel,
    style,
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            hitSlop={8}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={[headerIconButtonStyles.button, style]}
        >
            <View style={headerIconButtonStyles.iconFrame}>
                {icon}
            </View>
        </TouchableOpacity>
    );
}
