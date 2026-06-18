import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getRatingImageSource, getRatingInfo } from '../utils/ratings';

export default function RatingImage({
    rating,
    ratingInfo = [],
    size = 48,
    showTitle = false,
    style,
    imageStyle,
}) {
    const info = getRatingInfo(ratingInfo, rating);

    return (
        <View style={[styles.container, style]} accessibilityLabel={info.alt}>
            <Image
                source={getRatingImageSource(rating)}
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
