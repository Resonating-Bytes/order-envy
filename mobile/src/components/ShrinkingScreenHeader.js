import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OfflineBanner from './OfflineBanner';
import { useOfflineBannerHeight } from '../hooks/useOfflineBannerState';
import { colors } from '../theme/colors';

const TITLE_LARGE = 42;
const TITLE_SMALL = 21;
const BODY_LARGE = 96;
const BODY_SMALL = 52;

export const COLLAPSE_DISTANCE = BODY_LARGE - BODY_SMALL;

/** Extra space between the shrinking header chrome and scroll content */
export const HEADER_CONTENT_GAP = 12;

export { TITLE_LARGE, BODY_LARGE };

/** Top padding for scroll content sitting below header + optional offline banner */
export function getExpandedHeaderHeight(topInset, bannerHeight = 0) {
    return topInset + BODY_LARGE + bannerHeight + HEADER_CONTENT_GAP;
}

export default function ShrinkingScreenHeader({ scrollY, title, leftAction, rightAction }) {
    const insets = useSafeAreaInsets();
    const bannerHeight = useOfflineBannerHeight();

    const blueBodyHeight = scrollY.interpolate({
        inputRange: [0, COLLAPSE_DISTANCE],
        outputRange: [BODY_LARGE, BODY_SMALL],
        extrapolate: 'clamp',
    });

    const headerHeight = scrollY.interpolate({
        inputRange: [0, COLLAPSE_DISTANCE],
        outputRange: [
            insets.top + BODY_LARGE + bannerHeight,
            insets.top + BODY_SMALL + bannerHeight,
        ],
        extrapolate: 'clamp',
    });

    const titleSize = scrollY.interpolate({
        inputRange: [0, COLLAPSE_DISTANCE],
        outputRange: [TITLE_LARGE, TITLE_SMALL],
        extrapolate: 'clamp',
    });

    const blueSectionHeight = Animated.add(blueBodyHeight, insets.top);

    return (
        <Animated.View style={[styles.wrapper, { height: headerHeight }]}>
            <Animated.View
                style={[
                    styles.blueSection,
                    { height: blueSectionHeight, paddingTop: insets.top },
                ]}
            >
                <View style={styles.row}>
                    <View style={[styles.side, styles.sideLeft]}>
                        {leftAction}
                    </View>
                    <Animated.Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        style={[styles.title, { fontSize: titleSize }]}
                    >
                        {title}
                    </Animated.Text>
                    <View style={[styles.side, styles.sideRight]}>
                        {rightAction}
                    </View>
                </View>
            </Animated.View>
            <OfflineBanner />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
    },
    blueSection: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
    },
    row: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    side: {
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sideLeft: {
        width: 40,
    },
    sideRight: {
        flexDirection: 'row',
        gap: 8,
        flexShrink: 0,
    },
    title: {
        flex: 1,
        color: colors.white,
        fontWeight: '700',
        textAlign: 'center',
        marginHorizontal: 4,
    },
});
