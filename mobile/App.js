import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CompatibilityProvider } from './src/context/CompatibilityContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <CompatibilityProvider>
                <AuthProvider>
                    <StatusBar style="light" />
                    <AppNavigator />
                </AuthProvider>
            </CompatibilityProvider>
        </SafeAreaProvider>
    );
}
