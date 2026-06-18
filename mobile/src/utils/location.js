import * as Location from 'expo-location';

export async function requestCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        return { granted: false };
    }

    const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
    });

    return {
        granted: true,
        lat: position.coords.latitude,
        long: position.coords.longitude,
    };
}
