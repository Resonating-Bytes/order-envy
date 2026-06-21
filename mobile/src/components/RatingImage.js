import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ensureRatingAssetsLoaded, getRatingImageUri } from '../lib/ratingAssets';
import { getRatingInfo, RATING_IMAGE_SOURCES } from '../utils/ratings';

export default function RatingImage({
    rating,
    ratingInfo = [],
    size = 48,
    showTitle = false,
    style,
    imageStyle,
}) {
    const [assetsReady, setAssetsReady] = useState(false);
    const info = getRatingInfo(ratingInfo, rating);
    const rounded = Math.round(Number(rating));

    useEffect(() => {
        let cancelled = false;
        ensureRatingAssetsLoaded()
            .then(() => {
                if (!cancelled) setAssetsReady(true);
            })
            .catch(() => {
                if (!cancelled) setAssetsReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const source = assetsReady && getRatingImageUri(rounded)
        ? { uri: getRatingImageUri(rounded) }
        : (RATING_IMAGE_SOURCES[rounded] || RATING_IMAGE_SOURCES[3]);

    return (
        <View style={[styles.container, style]} accessibilityLabel={info.alt}>
            <Image
                source={source}
                style={[
                    styles.image,
                    { width: size, height: size },
                    imageStyle,
                ]}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
            />
            {showTitle ? (
                <Text style={styles.title} numberOfLines={2}>
                    {info.title}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    image: {
        width: 48,
        height: 48,
    },
    title: {
        marginTop: 4,
        fontSize: 11,
        color: '#6b7280',
        textAlign: 'center',
    },
});
