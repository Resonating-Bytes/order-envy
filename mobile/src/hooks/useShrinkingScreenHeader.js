import React, { useLayoutEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeaderButton from '../components/BackHeaderButton';
import ShrinkingScreenHeader, { getExpandedHeaderHeight } from '../components/ShrinkingScreenHeader';

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
    const headerPadding = getExpandedHeaderHeight(insets.top);

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
    }, [navigation, title, scrollY, leftAction, rightAction]);

    return headerPadding;
}
