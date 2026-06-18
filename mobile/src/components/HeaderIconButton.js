import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { headerButton } from '../theme/header';

export const headerIconButtonStyles = StyleSheet.create({
    button: {
        width: headerButton.size,
        height: headerButton.size,
        borderRadius: headerButton.radius,
        backgroundColor: headerButton.backgroundColor,
        borderWidth: headerButton.borderWidth,
        borderColor: headerButton.borderColor,
        overflow: 'hidden',
    },
    iconFrame: {
        width: headerButton.size,
        height: headerButton.size,
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
