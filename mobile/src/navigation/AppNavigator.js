import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import LoginScreen from '../screens/LoginScreen';
import RestaurantListScreen from '../screens/RestaurantListScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import RestaurantFormScreen from '../screens/RestaurantFormScreen';
import MenuItemFormScreen from '../screens/MenuItemFormScreen';
import CheckInScreen from '../screens/CheckInScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import RecommendScreen from '../screens/RecommendScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const screenOptions = Platform.select({
    ios: {
        headerStyle: { backgroundColor: colors.primary },
        headerLargeStyle: { backgroundColor: colors.primary },
        headerShadowVisible: false,
        headerLargeTitle: false,
    },
    default: {
        headerStyle: { backgroundColor: colors.primary },
        headerShadowVisible: false,
        headerLargeTitle: false,
    },
});

function AppStack() {
    return (
        <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen
                name="RestaurantList"
                component={RestaurantListScreen}
                options={{ title: 'Restaurants' }}
            />
            <Stack.Screen
                name="RestaurantDetail"
                component={RestaurantDetailScreen}
                options={{ title: '' }}
            />
            <Stack.Screen
                name="CheckIn"
                component={CheckInScreen}
                options={{ title: '' }}
            />
            <Stack.Screen
                name="RestaurantForm"
                component={RestaurantFormScreen}
                options={{ title: '' }}
            />
            <Stack.Screen
                name="MenuItemForm"
                component={MenuItemFormScreen}
                options={{ title: '' }}
            />
            <Stack.Screen
                name="Friends"
                component={FriendsScreen}
                options={{ title: '' }}
            />
            <Stack.Screen
                name="AddFriend"
                component={AddFriendScreen}
                options={{ title: '' }}
            />
            <Stack.Screen
                name="Recommend"
                component={RecommendScreen}
                options={{ title: '' }}
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
