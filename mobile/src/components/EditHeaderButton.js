import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { headerButton } from '../theme/header';
import { colors } from '../theme/colors';

export default function EditHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Edit restaurant"
            icon={<Ionicons name="create-outline" size={headerButton.iconSize} color={colors.primary} />}
        />
    );
}
