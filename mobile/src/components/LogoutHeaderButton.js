import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { colors } from '../theme/colors';

export default function LogoutHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Log out"
            icon={<Ionicons name="log-out-outline" size={18} color={colors.primary} />}
        />
    );
}
