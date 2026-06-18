import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { colors } from '../theme/colors';

export default function FriendsHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Friends"
            icon={<Ionicons name="people-outline" size={18} color={colors.primary} />}
        />
    );
}
