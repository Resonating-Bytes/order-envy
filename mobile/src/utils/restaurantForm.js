export function isValidLatLong(lat, long) {
    const latN = Number(lat);
    const longN = Number(long);
    return !Number.isNaN(latN) && !Number.isNaN(longN);
}

export function formatReverseGeocodeAddress({ street, city, state, postalCode }) {
    if (street && city && state && postalCode) {
        return `${street}, ${city} ${state} ${postalCode}`;
    }
    return null;
}

export function buildRestaurantPayload({ name, description, website, phone, address, lat, long }) {
    return {
        name: name.trim(),
        description: description.trim(),
        website: website.trim(),
        phone: phone.trim(),
        address: address.trim(),
        lat,
        long,
    };
}

export async function resolveRestaurantLocation({
    address,
    lat,
    long,
    geocodeAddress,
}) {
    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
        return { address: '', lat: NaN, long: NaN };
    }

    if (isValidLatLong(lat, long)) {
        return {
            address: trimmedAddress,
            lat: Number(lat),
            long: Number(long),
        };
    }

    const result = await geocodeAddress(trimmedAddress);
    if (result.lat != null && result.lng != null) {
        return {
            address: trimmedAddress,
            lat: result.lat,
            long: result.lng,
        };
    }

    return {
        address: trimmedAddress,
        lat: NaN,
        long: NaN,
    };
}
