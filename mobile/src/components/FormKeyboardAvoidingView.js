import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

export default function FormKeyboardAvoidingView({ children, style }) {
    return (
        <KeyboardAvoidingView
            style={[{ flex: 1 }, style]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {children}
        </KeyboardAvoidingView>
    );
}
