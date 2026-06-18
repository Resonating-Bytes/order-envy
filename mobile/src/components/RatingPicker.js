import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import {
    getRatingImageSource,
    getRatingInfo,
    getRatingOptions,
} from '../utils/ratings';

export default function RatingPicker({ value, onChange, ratingInfo = [] }) {
    const options = getRatingOptions(ratingInfo);

    return (
        <View style={styles.row}>
            {options.map((option) => {
                const selected = value === option.value;
                const info = getRatingInfo(ratingInfo, option.value);

                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        accessibilityRole="button"
                        accessibilityLabel={info.title}
                        accessibilityState={{ selected }}
                        style={[styles.button, selected && styles.buttonSelected]}
                    >
                        <Image
                            source={getRatingImageSource(option.value)}
                            style={[
                                styles.image,
                                selected ? styles.imageSelected : styles.imageUnselected,
                            ]}
                            resizeMode="contain"
                            accessibilityIgnoresInvertColors
                        />
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
        gap: 4,
    },
    button: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 2,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#fff',
    },
    buttonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    image: {
        width: 44,
        height: 44,
    },
    imageUnselected: {
        opacity: 0.5,
    },
    imageSelected: {
        opacity: 1,
    },
});
