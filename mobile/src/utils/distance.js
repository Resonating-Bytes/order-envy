const EARTH_RADIUS_MILES = 3963.0;

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

export function distanceMiles(lat1, long1, lat2, long2) {
    const rLat1 = toRadians(lat1);
    const rLong1 = toRadians(long1);
    const rLat2 = toRadians(lat2);
    const rLong2 = toRadians(long2);

    return EARTH_RADIUS_MILES * Math.acos(
        (Math.sin(rLat1) * Math.sin(rLat2))
        + (Math.cos(rLat1) * Math.cos(rLat2) * Math.cos(rLong2 - rLong1))
    );
}

export function getRestaurantDistance(restaurant, lat, long) {
    const rLat = restaurant?.location?.lat;
    const rLong = restaurant?.location?.long;
    if (rLat == null || rLong == null || Number.isNaN(Number(rLat)) || Number.isNaN(Number(rLong))) {
        return null;
    }
    return distanceMiles(lat, long, Number(rLat), Number(rLong));
}

export function sortRestaurantsByDistance(restaurants, lat, long) {
    return [...restaurants].sort((a, b) => {
        const distA = getRestaurantDistance(a, lat, long);
        const distB = getRestaurantDistance(b, lat, long);

        if (distA == null && distB == null) return a.name.localeCompare(b.name);
        if (distA == null) return 1;
        if (distB == null) return -1;
        if (distA === distB) return a.name.localeCompare(b.name);
        return distA - distB;
    });
}

export function formatDistance(miles) {
    if (miles == null) return null;
    if (miles < 0.1) return '< 0.1 mi';
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
}
