import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CompatibilityProvider } from './src/context/CompatibilityContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { remoteApiFetch } from './src/api/client';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <CompatibilityProvider>
                <NetworkProvider remoteFetch={remoteApiFetch}>
                    <AuthProvider>
                        <StatusBar style="light" />
                        <AppNavigator />
                    </AuthProvider>
                </NetworkProvider>
            </CompatibilityProvider>
        </SafeAreaProvider>
    );
}
