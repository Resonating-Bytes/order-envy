const MenuItem = require('../models/menuItem');
const Restaurant = require('../models/restaurant');
const ratingService = require('./ratingService');

async function submitCheckin(restaurantId, user, body) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }

    const ratings = [];

    const restaurantKey = String(restaurant._id);
    if (body[restaurantKey]) {
        const { rating, comment } = body[restaurantKey];
        if (rating !== undefined && rating !== null) {
            const created = await ratingService.createRating({
                user,
                restaurant,
                menuItem: null,
                rating: Number(rating),
                comment,
            });
            ratings.push(created);
        }
    }

    const entries = { ...body };
    delete entries[restaurantKey];

    for (const menuItemId of Object.keys(entries)) {
        const { checked, rating, comment } = entries[menuItemId] || {};
        if (checked && rating !== undefined && rating !== null) {
            const menuItem = await MenuItem.findById(menuItemId);
            if (menuItem) {
                const created = await ratingService.createRating({
                    user,
                    restaurant,
                    menuItem,
                    rating: Number(rating),
                    comment,
                });
                ratings.push(created);
            }
        }
    }

    return { ratings, message: 'Successfully checked in' };
}

module.exports = { submitCheckin };
