import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';

function isValidCoord(value) {
    const n = Number(value);
    return !Number.isNaN(n);
}

export function getMapsUrls({ name, address, lat, long }) {
    const label = (name || address || 'Restaurant').trim();
    const trimmedAddress = address?.trim() || '';
    const encodedAddress = encodeURIComponent(trimmedAddress || label);
    const hasCoords = isValidCoord(lat) && isValidCoord(long);
    const latN = hasCoords ? Number(lat) : null;
    const longN = hasCoords ? Number(long) : null;

    const apple = hasCoords
        ? `http://maps.apple.com/?ll=${latN},${longN}&q=${encodeURIComponent(label)}`
        : `http://maps.apple.com/?q=${encodedAddress}`;

    const google = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${latN},${longN}`
        : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    const geo = hasCoords
        ? `geo:${latN},${longN}?q=${latN},${longN}(${encodeURIComponent(label)})`
        : `geo:0,0?q=${encodedAddress}`;

    return { apple, google, geo };
}

export function canOpenRestaurantInMaps(location) {
    const address = location?.address?.trim();
    return Boolean(address || (isValidCoord(location?.lat) && isValidCoord(location?.long)));
}

async function openUrl(url) {
    try {
        await Linking.openURL(url);
    } catch {
        throw new Error('No maps app available');
    }
}

export function openRestaurantInMaps({ name, location }) {
    if (!canOpenRestaurantInMaps(location)) {
        Alert.alert('No location', 'This restaurant has no address or coordinates to open in Maps.');
        return;
    }

    const urls = getMapsUrls({
        name,
        address: location?.address,
        lat: location?.lat,
        long: location?.long,
    });

    if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: ['Apple Maps', 'Google Maps', 'Cancel'],
                cancelButtonIndex: 2,
                title: 'Open in Maps',
            },
            (index) => {
                if (index === 0) {
                    openUrl(urls.apple).catch(() => {
                        Alert.alert('Unable to open', 'Could not open Apple Maps.');
                    });
                } else if (index === 1) {
                    openUrl(urls.google).catch(() => {
                        Alert.alert('Unable to open', 'Could not open Google Maps.');
                    });
                }
            }
        );
        return;
    }

    openUrl(urls.geo)
        .catch(() => openUrl(urls.google))
        .catch(() => {
            Alert.alert('Unable to open', 'Could not open a maps app.');
        });
}
