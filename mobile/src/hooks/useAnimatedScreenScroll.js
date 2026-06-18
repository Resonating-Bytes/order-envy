import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

const SCROLL_TO_TOP_THRESHOLD = 120;

export default function useAnimatedScreenScroll() {
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: false,
            listener: (event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                setShowScrollToTop(offsetY > SCROLL_TO_TOP_THRESHOLD);
            },
        },
    );

    const scrollToTop = useCallback(() => {
        const node = scrollRef.current;
        if (!node) return;

        if (typeof node.scrollToOffset === 'function') {
            node.scrollToOffset({ offset: 0, animated: true });
            return;
        }

        if (typeof node.scrollTo === 'function') {
            node.scrollTo({ y: 0, animated: true });
        }
    }, []);

    return {
        scrollY,
        scrollRef,
        onScroll,
        scrollToTop,
        showScrollToTop,
    };
}
