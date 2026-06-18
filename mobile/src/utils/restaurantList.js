import { fetchRestaurant } from '../api/client';
import {
    averageUserRating,
    getDisplayRestaurantRating,
} from './ratings';

export function getUserRestaurantRatingFromData(restaurant, userId) {
    const explicit = averageUserRating(restaurant?.ratings, userId);
    if (explicit != null) return explicit;

    let count = 0;
    let total = 0;

    for (const menuItem of restaurant?.menuItems || []) {
        for (const entry of menuItem.ratings || []) {
            const ratingUserId = entry.user && (entry.user._id || entry.user.id || entry.user);
            if (ratingUserId && String(ratingUserId) === String(userId)) {
                count += 1;
                total += entry.rating;
            }
        }
    }

    return count ? Math.round(total / count) : null;
}

export function listIncludesUserRatings(restaurants) {
    return restaurants.some((restaurant) => 'userAverageRating' in restaurant);
}

export function enrichRestaurantsWithUserRatings(restaurants, userId) {
    if (!userId) return restaurants;

    return restaurants.map((restaurant) => ({
        ...restaurant,
        userAverageRating: restaurant.userAverageRating
            ?? getUserRestaurantRatingFromData(restaurant, userId),
    }));
}

export async function enrichRestaurantsFromDetails(restaurants, userId) {
    if (!userId || !restaurants.length) return restaurants;

    return Promise.all(restaurants.map(async (restaurant) => {
        if (restaurant.userAverageRating != null) {
            return restaurant;
        }

        try {
            const detail = await fetchRestaurant(restaurant._id);
            const display = getDisplayRestaurantRating({
                restaurant: detail.restaurant,
                categories: detail.categories,
                userId,
            });

            return {
                ...restaurant,
                userAverageRating: display?.rating ?? null,
            };
        } catch {
            return restaurant;
        }
    }));
}

export async function enrichRestaurantList(restaurants, userId) {
    if (!userId || !restaurants.length) return restaurants;

    if (listIncludesUserRatings(restaurants)) {
        return enrichRestaurantsWithUserRatings(restaurants, userId);
    }

    return enrichRestaurantsFromDetails(restaurants, userId);
}
