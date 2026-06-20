import {
    buildRestaurantPayload,
    formatReverseGeocodeAddress,
    isValidLatLong,
    resolveRestaurantLocation,
} from '../../src/utils/restaurantForm';

describe('restaurantForm', () => {
    test('isValidLatLong accepts numeric coordinates', () => {
        expect(isValidLatLong(40.7, -74.0)).toBe(true);
        expect(isValidLatLong('bad', -74)).toBe(false);
    });

    test('formatReverseGeocodeAddress builds US-style address', () => {
        expect(formatReverseGeocodeAddress({
            street: '1 Main St',
            city: 'Anytown',
            state: 'NY',
            postalCode: '12345',
        })).toBe('1 Main St, Anytown NY 12345');
    });

    test('buildRestaurantPayload trims fields', () => {
        expect(buildRestaurantPayload({
            name: '  Cafe  ',
            description: ' nice ',
            website: '',
            phone: '',
            address: ' 123 St ',
            lat: 1,
            long: 2,
        })).toEqual({
            name: 'Cafe',
            description: 'nice',
            website: '',
            phone: '',
            address: '123 St',
            lat: 1,
            long: 2,
        });
    });

    test('resolveRestaurantLocation skips geocode when lat/long present', async () => {
        const geocodeAddress = jest.fn();
        const result = await resolveRestaurantLocation({
            address: '123 St',
            lat: 40.7,
            long: -74.0,
            geocodeAddress,
        });
        expect(geocodeAddress).not.toHaveBeenCalled();
        expect(result).toEqual({ address: '123 St', lat: 40.7, long: -74.0 });
    });

    test('resolveRestaurantLocation geocodes when coordinates missing', async () => {
        const geocodeAddress = jest.fn(() => Promise.resolve({ lat: 1.2, lng: 3.4 }));
        const result = await resolveRestaurantLocation({
            address: '123 St',
            lat: undefined,
            long: undefined,
            geocodeAddress,
        });
        expect(geocodeAddress).toHaveBeenCalledWith('123 St');
        expect(result).toEqual({ address: '123 St', lat: 1.2, long: 3.4 });
    });
});
