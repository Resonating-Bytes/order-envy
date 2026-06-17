const { GEO_KEY } = process.env;

async function geocodeAddress(address) {
    const encoded = encodeURIComponent(address);
    const url = `http://www.mapquestapi.com/geocoding/v1/address?key=${GEO_KEY}&location=${encoded}`;
    const response = await fetch(url);
    if (!response.ok) {
        return {};
    }
    try {
        const body = await response.json();
        const { lat, lng } = body.results[0].locations[0].latLng;
        return { lat, lng };
    } catch (err) {
        console.error(`Error geocoding ${address}:`, err);
        return {};
    }
}

async function reverseGeocode(lat, long) {
    if (!lat || !long) {
        return {};
    }
    const url = `http://www.mapquestapi.com/geocoding/v1/reverse?key=${GEO_KEY}&location=${lat},${long}`;
    const response = await fetch(url);
    if (!response.ok) {
        return {};
    }
    try {
        const body = await response.json();
        const { street, adminArea5, adminArea3, postalCode } = body.results[0].locations[0];
        return { street, city: adminArea5, state: adminArea3, postalCode };
    } catch (err) {
        console.error(`Error reverse geocoding (${lat},${long}):`, err);
        return {};
    }
}

module.exports = { geocodeAddress, reverseGeocode };
