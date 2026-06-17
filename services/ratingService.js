const Rating = require('../models/rating');
const Recommendation = require('../models/recommendation');
const Restaurant = require('../models/restaurant');
const MenuItem = require('../models/menuItem');

async function clearRecommendations(userId, restaurant, menuItem) {
    let subQuery = {};
    if (menuItem) {
        subQuery = { $or: [{ menuItem: menuItem._id }, { restaurant: restaurant._id }] };
    } else if (restaurant) {
        subQuery = { restaurant: restaurant._id };
    } else {
        return;
    }

    const recommendations = await Recommendation.find({
        $and: [{ for: userId }, subQuery],
    });

    const menuItemId = menuItem ? menuItem._id : null;
    for (const recommendation of recommendations) {
        if (recommendation.menuItem == null || recommendation.menuItem.equals(menuItemId)) {
            await recommendation.deleteOne();
        }
    }
}

async function createRating({ user, restaurant, menuItem, rating, comment }) {
    const createdRating = await Rating.create({
        rating,
        comment,
        user: user._id,
    });

    if (menuItem) {
        menuItem.ratings.push(createdRating._id);
        await menuItem.save();
        await clearRecommendations(user._id, restaurant, menuItem);
    } else if (restaurant) {
        restaurant.ratings.push(createdRating._id);
        await restaurant.save();
        await clearRecommendations(user._id, restaurant, null);
    } else {
        const err = new Error('Restaurant or menu item required');
        err.status = 400;
        throw err;
    }

    return createdRating;
}

async function getRating(ratingId, user) {
    const rating = await Rating.findById(ratingId);
    if (!rating) {
        const err = new Error('Rating not found');
        err.status = 404;
        throw err;
    }
    if (!rating.user.equals(user._id)) {
        const err = new Error('You do not have permission for this rating');
        err.status = 403;
        throw err;
    }
    return rating;
}

async function updateRating(ratingId, user, { rating, comment }) {
    const ratingDoc = await getRating(ratingId, user);
    if (rating !== undefined) ratingDoc.rating = rating;
    if (comment !== undefined) ratingDoc.comment = comment;
    await ratingDoc.save();
    return ratingDoc;
}

async function deleteRating(ratingId, user) {
    const ratingDoc = await getRating(ratingId, user);
    await ratingDoc.deleteOne();
    return { message: 'Rating deleted' };
}

async function createRatingForRestaurant(restaurantId, user, data) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }
    return createRating({ user, restaurant, menuItem: null, ...data });
}

async function createRatingForMenuItem(restaurantId, menuItemId, user, data) {
    const restaurant = await Restaurant.findById(restaurantId);
    const menuItem = await MenuItem.findById(menuItemId);
    if (!restaurant || !menuItem) {
        const err = new Error('Restaurant or menu item not found');
        err.status = 404;
        throw err;
    }
    return createRating({ user, restaurant, menuItem, ...data });
}

module.exports = {
    createRating,
    createRatingForRestaurant,
    createRatingForMenuItem,
    getRating,
    updateRating,
    deleteRating,
    clearRecommendations,
};
