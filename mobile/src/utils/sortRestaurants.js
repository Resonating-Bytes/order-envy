import { sortRestaurantsByDistance } from './distance';

export const SORT_OPTIONS = [
    { id: 'name', label: 'Name' },
    { id: 'distance', label: 'Distance', requiresLocation: true },
    { id: 'rating', label: 'Rating' },
];

export function sortRestaurantsByRating(restaurants) {
    return [...restaurants].sort((a, b) => {
        const ratingA = a.userAverageRating;
        const ratingB = b.userAverageRating;

        if (ratingA == null && ratingB == null) {
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        if (ratingA == null) return 1;
        if (ratingB == null) return -1;
        if (ratingA === ratingB) {
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        return ratingB - ratingA;
    });
}

export function sortRestaurants(restaurants, sortBy, coords) {
    const list = [...restaurants];

    if (sortBy === 'distance' && coords) {
        return sortRestaurantsByDistance(list, coords.lat, coords.long);
    }

    if (sortBy === 'rating') {
        return sortRestaurantsByRating(list);
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
            disabled: needsLocation,
            hint: needsLocation ? 'Needs location' : undefined,
        };
    });
}
