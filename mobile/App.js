import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CompatibilityProvider } from './src/context/CompatibilityContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { remoteApiFetch } from './src/api/client';
import { ensureRatingAssetsLoaded } from './src/lib/ratingAssets';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    useEffect(() => {
        ensureRatingAssetsLoaded().catch(() => {});
    }, []);

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
