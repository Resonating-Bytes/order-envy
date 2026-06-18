import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { colors } from '../theme/colors';

export default function BackHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Go back"
            icon={<Ionicons name="arrow-back-outline" size={18} color={colors.primary} />}
        />
    );
}
