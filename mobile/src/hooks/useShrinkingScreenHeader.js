import React, { useLayoutEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeaderButton from '../components/BackHeaderButton';
import ShrinkingScreenHeader, { getExpandedHeaderHeight } from '../components/ShrinkingScreenHeader';
import { useOfflineBannerHeight } from '../hooks/useOfflineBannerState';

export function useHeaderBackButton(navigation) {
    return useMemo(
        () => <BackHeaderButton onPress={() => navigation.goBack()} />,
        [navigation]
    );
}

export default function useShrinkingScreenHeader(navigation, {
    title,
    scrollY,
    leftAction,
    rightAction,
}) {
    const insets = useSafeAreaInsets();
    const bannerHeight = useOfflineBannerHeight();
    const headerPadding = getExpandedHeaderHeight(insets.top, bannerHeight);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTransparent: true,
            headerShadowVisible: false,
            headerTitle: '',
            header: () => (
                <ShrinkingScreenHeader
                    scrollY={scrollY}
                    title={title}
                    leftAction={leftAction}
                    rightAction={rightAction}
                />
            ),
        });
    }, [navigation, title, scrollY, leftAction, rightAction, bannerHeight]);

    return headerPadding;
}
