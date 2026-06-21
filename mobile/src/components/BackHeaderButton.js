import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { headerButton } from '../theme/header';
import { colors } from '../theme/colors';

export function BackChevronIcon({ color = colors.primary, size = headerButton.iconSize }) {
    return (
        <Ionicons
            name="chevron-back"
            size={size}
            color={color}
            style={{ marginLeft: -3 }}
        />
    );
}

export default function BackHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Go back"
            icon={<BackChevronIcon />}
        />
    );
}
