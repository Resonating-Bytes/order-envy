import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { colors } from '../theme/colors';

export default function EditHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Edit restaurant"
            icon={<Ionicons name="create-outline" size={18} color={colors.primary} />}
        />
    );
}
