import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function ScrollToTopButton({ visible, onPress }) {
    const insets = useSafeAreaInsets();
    const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(progress, {
            toValue: visible ? 1 : 0,
            useNativeDriver: true,
            friction: 7,
            tension: 80,
        }).start();
    }, [visible, progress]);

    const opacity = progress;
    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 0],
    });
    const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1],
    });

    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.container,
                {
                    bottom: Math.max(insets.bottom, 12) + 12,
                    opacity,
                    transform: [{ translateY }, { scale }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Scroll to top"
                style={styles.button}
            >
                <Ionicons name="chevron-up" size={22} color={colors.primary} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
});
