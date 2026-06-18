const RATING_INFO = [
    { value: 1, img: '/img/vomit', alt: 'Vomit', title: 'Pretty sure this gave me food poisoning' },
    { value: 2, img: '/img/frowning', alt: 'Frowning', title: 'Only worth eating to survive long enough to find something better' },
    { value: 3, img: '/img/neutral', alt: 'Neutral', title: 'Not worth getting again if there is another option to try' },
    { value: 4, img: '/img/happy', alt: 'Happy', title: 'Always a solid choice to put this in your food hole' },
    { value: 5, img: '/img/perfect', alt: 'Perfect', title: 'You may have died and went to taste bud heaven, why get anything else ever???' },
];

function sendJson(res, status, data) {
    return res.status(status).json(data);
}

function sendError(res, status, message) {
    return sendJson(res, status, { error: message });
}

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

function averageRating(ratings, userId) {
    let count = 0;
    let total = 0;
    if (userId) {
        for (const r of ratings || []) {
            const ratingUserId = r.user && (r.user._id || r.user);
            if (ratingUserId && String(ratingUserId) === String(userId)) {
                count++;
                total += r.rating;
            }
        }
    }
    return count ? Math.round(total / count) : null;
}

function averageDishRatings(restaurant, userId) {
    if (!userId || !restaurant) return null;

    let count = 0;
    let total = 0;

    for (const menuItem of restaurant.menuItems || []) {
        for (const rating of menuItem.ratings || []) {
            const ratingUserId = rating.user && (rating.user._id || rating.user);
            if (ratingUserId && String(ratingUserId) === String(userId)) {
                count++;
                total += rating.rating;
            }
        }
    }

    return count ? Math.round(total / count) : null;
}

function getUserRestaurantRating(restaurant, userId) {
    const explicit = averageRating(restaurant.ratings, userId);
    if (explicit != null) return explicit;
    return averageDishRatings(restaurant, userId);
}

function filterByDistance(restaurants, lat, long, maxMiles) {
    if (maxMiles === 'all' || maxMiles === undefined || maxMiles === null) {
        return restaurants;
    }
    if (isNaN(Number(lat)) || isNaN(Number(long))) {
        return restaurants;
    }

    const denom = 180 / Math.PI;
    const lat1 = lat / denom;
    const long1 = long / denom;
    const maxDist = Number(maxMiles);

    const calcDist = (lat2, long2) => {
        return 3963.0 * Math.acos(
            (Math.sin(lat1) * Math.sin(lat2)) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(long2 - long1)
        );
    };

    return restaurants.filter((restaurant) => {
        const rLat = restaurant.location && restaurant.location.lat;
        const rLong = restaurant.location && restaurant.location.long;
        if (isNaN(Number(rLat)) || isNaN(Number(rLong))) {
            return false;
        }
        return calcDist(rLat / denom, rLong / denom) < maxDist;
    });
}

function formatFriendRef(friend) {
    if (!friend) return null;
    if (typeof friend === 'object' && friend._id) {
        const displayName = (friend.getDisplayName && friend.getDisplayName())
            || friend.username
            || friend.email
            || 'Friend';
        return {
            id: String(friend._id),
            displayName,
        };
    }
    return { id: String(friend), displayName: String(friend) };
}

function formatUser(user) {
    if (!user) return null;
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.getDisplayName ? user.getDisplayName() : user.username,
        fullName: user.getFullName ? user.getFullName() : user.username,
        friends: (user.friends || []).map(formatFriendRef).filter(Boolean),
    };
}

module.exports = {
    RATING_INFO,
    sendJson,
    sendError,
    asyncHandler,
    averageRating,
    averageDishRatings,
    getUserRestaurantRating,
    filterByDistance,
    formatUser,
};
