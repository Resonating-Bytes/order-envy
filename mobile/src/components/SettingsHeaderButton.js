import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { headerButton } from '../theme/header';
import { colors } from '../theme/colors';

export default function SettingsHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Settings"
            icon={<Ionicons name="settings-outline" size={headerButton.iconSize} color={colors.primary} />}
        />
    );
}
