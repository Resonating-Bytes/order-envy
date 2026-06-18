import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { colors } from '../theme/colors';

export default function AddHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Add restaurant"
            icon={<Ionicons name="add" size={22} color={colors.primary} />}
        />
    );
}
