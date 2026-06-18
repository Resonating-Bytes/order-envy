import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { colors } from '../theme/colors';

const CHEVRON_SIZE = 22;

export function BackChevronIcon({ color = colors.primary, size = CHEVRON_SIZE }) {
    return <Ionicons name="chevron-back" size={size} color={color} />;
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
