import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import LoginScreen from '../screens/LoginScreen';
import RestaurantListScreen from '../screens/RestaurantListScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import CheckInScreen from '../screens/CheckInScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
    headerStyle: { backgroundColor: '#1b4332' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' },
};

function AppStack() {
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen
                name="RestaurantList"
                component={RestaurantListScreen}
                options={{ title: 'Order Envy' }}
            />
            <Stack.Screen
                name="RestaurantDetail"
                component={RestaurantDetailScreen}
                options={({ route }) => ({
                    title: route.params?.restaurantName || 'Restaurant',
                })}
            />
            <Stack.Screen
                name="CheckIn"
                component={CheckInScreen}
                options={{ title: 'Check in' }}
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
