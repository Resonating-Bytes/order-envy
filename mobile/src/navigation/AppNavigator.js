import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import LoginScreen from '../screens/LoginScreen';
import RestaurantListScreen from '../screens/RestaurantListScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import CheckInScreen from '../screens/CheckInScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const blueHeaderOptions = {
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: colors.white,
    headerTitleAlign: 'center',
    headerTitleStyle: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 17,
    },
    headerBackButtonDisplayMode: 'minimal',
    headerShadowVisible: false,
    headerLargeTitle: false,
};

const screenOptions = Platform.select({
    ios: {
        ...blueHeaderOptions,
        headerLargeStyle: { backgroundColor: colors.primary },
    },
    default: blueHeaderOptions,
});

function AppStack() {
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen
                name="RestaurantList"
                component={RestaurantListScreen}
                options={{
                    title: 'Restaurants',
                    headerBackTitle: 'Restaurants',
                }}
            />
            <Stack.Screen
                name="RestaurantDetail"
                component={RestaurantDetailScreen}
                options={{
                    title: '',
                    headerBackTitle: 'Restaurants',
                }}
            />
            <Stack.Screen
                name="CheckIn"
                component={CheckInScreen}
                options={{
                    title: 'Check in',
                    headerLargeTitle: false,
                }}
            />
        </Stack.Navigator>
    );
}

export default function AppNavigator() {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return <LoadingView message="Starting Order Envy..." />;
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <AppStack /> : <LoginScreen />}
        </NavigationContainer>
    );
}
