import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const RATING_LABELS = {
    1: 'Awful',
    2: 'Poor',
    3: 'Okay',
    4: 'Good',
    5: 'Amazing',
};

export default function RatingPicker({ value, onChange, ratingInfo = [] }) {
    const options = ratingInfo.length
        ? ratingInfo
        : [1, 2, 3, 4, 5].map((rating) => ({ value: rating, title: RATING_LABELS[rating] }));

    return (
        <View style={styles.row}>
            {options.map((option) => {
                const selected = value === option.value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        style={[styles.button, selected && styles.buttonSelected]}
                    >
                        <Text style={[styles.value, selected && styles.valueSelected]}>
                            {option.value}
                        </Text>
                        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>
                            {option.title || option.alt}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    button: {
        minWidth: 58,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    buttonSelected: {
        borderColor: '#2d6a4f',
        backgroundColor: '#e8f5e9',
    },
    value: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
    },
    valueSelected: {
        color: '#1b4332',
    },
    label: {
        marginTop: 2,
        fontSize: 10,
        color: '#6b7280',
        textAlign: 'center',
    },
    labelSelected: {
        color: '#1b4332',
    },
});
