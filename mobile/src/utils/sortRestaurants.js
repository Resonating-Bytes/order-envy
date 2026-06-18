import { sortRestaurantsByDistance } from './distance';

export const SORT_OPTIONS = [
    { id: 'name', label: 'Name' },
    { id: 'distance', label: 'Distance', requiresLocation: true },
    { id: 'rating', label: 'Rating', disabled: true },
];

export function sortRestaurants(restaurants, sortBy, coords) {
    const list = [...restaurants];

    if (sortBy === 'distance' && coords) {
        return sortRestaurantsByDistance(list, coords.lat, coords.long);
    }

    if (sortBy === 'rating') {
        return list;
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function getSortLabel(sortBy) {
    return SORT_OPTIONS.find((option) => option.id === sortBy)?.label || 'Name';
}

export function getSortOptions(locationAvailable) {
    return SORT_OPTIONS.map((option) => {
        const needsLocation = option.requiresLocation && !locationAvailable;
        return {
            id: option.id,
            label: option.label,
            disabled: option.disabled || needsLocation,
            hint: option.disabled
                ? 'Coming soon'
                : needsLocation
                    ? 'Needs location'
                    : undefined,
        };
    });
}
