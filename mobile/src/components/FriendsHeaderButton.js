import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import HeaderIconButton from './HeaderIconButton';
import { headerButton } from '../theme/header';
import { colors } from '../theme/colors';

export default function FriendsHeaderButton({ onPress }) {
    return (
        <HeaderIconButton
            onPress={onPress}
            accessibilityLabel="Friends"
            icon={<Ionicons name="people-outline" size={headerButton.iconSize} color={colors.primary} />}
        />
    );
}
