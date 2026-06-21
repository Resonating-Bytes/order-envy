import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ensureRatingAssetsLoaded, getRatingImageUri } from '../lib/ratingAssets';
import { colors } from '../theme/colors';
import { getRatingInfo, RATING_IMAGE_SOURCES } from '../utils/ratings';

const RATING_VALUES = [1, 2, 3, 4, 5];

function ratingImageSource(ratingValue, assetsReady) {
    if (assetsReady) {
        const uri = getRatingImageUri(ratingValue);
        if (uri) return { uri };
    }
    return RATING_IMAGE_SOURCES[ratingValue] || RATING_IMAGE_SOURCES[3];
}

export default function RatingPicker({ value, onChange, ratingInfo = [] }) {
    const [assetsReady, setAssetsReady] = useState(false);

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

    return (
        <View style={styles.row}>
            {RATING_VALUES.map((ratingValue) => {
                const selected = value === ratingValue;
                const info = getRatingInfo(ratingInfo, ratingValue);

                return (
                    <Pressable
                        key={ratingValue}
                        onPress={() => onChange(ratingValue)}
                        accessibilityRole="button"
                        accessibilityLabel={info.title}
                        accessibilityState={{ selected }}
                        style={[styles.button, selected && styles.buttonSelected]}
                    >
                        <View
                            style={[
                                styles.imageFrame,
                                selected ? styles.imageFrameSelected : styles.imageFrameUnselected,
                            ]}
                        >
                            <Image
                                source={ratingImageSource(ratingValue, assetsReady)}
                                style={styles.image}
                                resizeMode="contain"
                                accessibilityIgnoresInvertColors
                            />
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        width: '19%',
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#fff',
    },
    buttonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    imageFrame: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageFrameUnselected: {
        opacity: 0.55,
    },
    imageFrameSelected: {
        opacity: 1,
    },
    image: {
        width: 40,
        height: 40,
    },
});
