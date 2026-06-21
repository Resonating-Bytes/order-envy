export const DEFAULT_RATING_INFO = [
    {
        value: 1,
        img: '/img/vomit',
        alt: 'Vomit',
        title: 'Pretty sure this gave me food poisoning',
    },
    {
        value: 2,
        img: '/img/frowning',
        alt: 'Frowning',
        title: 'Only worth eating to survive long enough to find something better',
    },
    {
        value: 3,
        img: '/img/neutral',
        alt: 'Neutral',
        title: 'Not worth getting again if there is another option to try',
    },
    {
        value: 4,
        img: '/img/happy',
        alt: 'Happy',
        title: 'Always a solid choice to put this in your food hole',
    },
    {
        value: 5,
        img: '/img/perfect',
        alt: 'Perfect',
        title: 'You may have died and went to taste bud heaven, why get anything else ever???',
    },
];

export const RATING_IMAGE_SOURCES = {
    1: require('../../assets/ratings/vomit.png'),
    2: require('../../assets/ratings/frowning.png'),
    3: require('../../assets/ratings/neutral.png'),
    4: require('../../assets/ratings/happy.png'),
    5: require('../../assets/ratings/perfect.png'),
};

export function getRatingOptions(ratingInfo = []) {
    const source = ratingInfo?.length ? ratingInfo : DEFAULT_RATING_INFO;
    return source.map((entry, index) => ({
        ...DEFAULT_RATING_INFO[index],
        ...entry,
        value: Number(entry?.value ?? index + 1),
    }));
}

export function getRatingInfo(ratingInfo, rating) {
    const options = getRatingOptions(ratingInfo);
    if (rating == null || Number.isNaN(Number(rating))) {
        return options[2];
    }

    const rounded = Math.round(Number(rating));
    const idx = Math.min(Math.max(rounded - 1, 0), options.length - 1);
    return options[idx];
}

export function getRatingImageSource(rating) {
    const rounded = Math.round(Number(rating));
    return RATING_IMAGE_SOURCES[rounded] || RATING_IMAGE_SOURCES[3];
}

export function averageUserRating(ratings, userId) {
    if (!userId || !Array.isArray(ratings)) return null;

    let count = 0;
    let total = 0;

    for (const entry of ratings) {
        const ratingUserId = entry.user && (entry.user._id || entry.user.id || entry.user);
        if (ratingUserId && String(ratingUserId) === String(userId)) {
            count += 1;
            total += entry.rating;
        }
    }

    return count ? Math.round(total / count) : null;
}

export function averageDishRatings(categories, userId) {
    if (!userId || !Array.isArray(categories)) return null;

    let count = 0;
    let total = 0;

    for (const category of categories) {
        for (const item of category.menuItems || []) {
            if (!Array.isArray(item.ratings)) continue;

            for (const entry of item.ratings) {
                const ratingUserId = entry.user && (entry.user._id || entry.user.id || entry.user);
                if (ratingUserId && String(ratingUserId) === String(userId)) {
                    count += 1;
                    total += entry.rating;
                }
            }
        }
    }

    return count ? Math.round(total / count) : null;
}

export function getDisplayRestaurantRating({ restaurant, categories, userId }) {
    const explicit = averageUserRating(restaurant?.ratings, userId);
    if (explicit != null) {
        return {
            rating: explicit,
            label: 'Your average rating',
        };
    }

    const fromDishes = averageDishRatings(categories, userId);
    if (fromDishes != null) {
        return {
            rating: fromDishes,
            label: 'Your average from dishes',
        };
    }

    return null;
}
