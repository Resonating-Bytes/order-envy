const Restaurant = require('../models/restaurant');
const Recommendation = require('../models/recommendation');
const Note = require('../models/note');
const List = require('../models/list');
const { averageRating, filterByDistance, getUserRestaurantRating } = require('../lib/apiHelpers');

function normalizeLatLong(val) {
    if (val === undefined || val === 'undefined' || val === null || val === 'null') {
        return NaN;
    }
    return val;
}

function groupMenuByCategory(restaurant) {
    const MenuItem = require('../models/menuItem');
    const categories = MenuItem.getCategories();
    const menuItems = restaurant.menuItems || [];
    return categories.map((label) => ({
        label,
        menuItems: menuItems.filter((item) => item.category === label),
    })).filter((group) => group.menuItems.length > 0);
}

async function listRestaurants(user, { lat, long, filterDist = 25 } = {}) {
    let query = Restaurant.find({}).sort('name');
    if (user) {
        query = query
            .populate({ path: 'ratings' })
            .populate({ path: 'menuItems', populate: { path: 'ratings' } });
    }

    let restaurants = await query;
    restaurants = filterByDistance(restaurants, lat, long, filterDist);

    if (user) {
        restaurants = restaurants.map((restaurant) => {
            const entry = restaurant.toObject();
            entry.userAverageRating = getUserRestaurantRating(restaurant, user._id);
            return entry;
        });
    }

    let recommendations = [];
    if (user) {
        const recs = await Recommendation.find({ for: user._id }).populate('restaurant').sort('menuItem');
        const uniqueRestaurants = {};
        for (const rec of recs) {
            if (!rec.restaurant) continue;
            const restId = String(rec.restaurant._id);
            if (!(restId in uniqueRestaurants)) {
                uniqueRestaurants[restId] = {
                    id: rec._id,
                    restaurant: rec.restaurant,
                    noDelete: !!rec.menuItem,
                    count: 0,
                    updatedAt: 0,
                };
            }
            uniqueRestaurants[restId].count += rec.from.length;
            uniqueRestaurants[restId].updatedAt = Math.max(
                uniqueRestaurants[restId].updatedAt,
                rec.updatedAt.getTime()
            );
        }
        recommendations = Object.values(uniqueRestaurants).sort((a, b) => {
            if (b.count === a.count) return b.updatedAt - a.updatedAt;
            return b.count - a.count;
        });
    }

    return { restaurants, recommendations };
}

async function getRestaurant(restaurantId, user) {
    const restaurant = await Restaurant.findById(restaurantId)
        .populate({ path: 'menuItems', options: { sort: 'name' }, populate: { path: 'ratings', options: { sort: { createdAt: -1 } } } })
        .populate({ path: 'ratings', options: { sort: { createdAt: -1 } } });

    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }

    let note = null;
    let lists = [];
    let recommendations = [];

    if (user) {
        note = await Note.findOne({ about: restaurant._id, user: user._id });
        lists = await List.find({ users: user._id });
        recommendations = await Recommendation.find({
            for: user._id,
            restaurant: restaurantId,
            menuItem: { $ne: null },
        }).populate('menuItem').populate('from').sort('-updatedAt');
        recommendations.sort((a, b) => b.from.length - a.from.length);
    }

    return {
        restaurant,
        categories: groupMenuByCategory(restaurant),
        userAverageRating: averageRating(restaurant.ratings, user && user._id),
        note,
        lists,
        recommendations,
    };
}

async function createRestaurant(data) {
    const restaurant = await Restaurant.create({
        name: data.name,
        description: data.description,
        website: data.website,
        phone: data.phone,
        location: {
            address: data.address,
            lat: normalizeLatLong(data.lat),
            long: normalizeLatLong(data.long),
        },
    });
    return restaurant;
}

async function updateRestaurant(restaurantId, data) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }

    if (data.name !== undefined) restaurant.name = data.name;
    if (data.description !== undefined) restaurant.description = data.description;
    if (data.website !== undefined) restaurant.website = data.website;
    if (data.phone !== undefined) restaurant.phone = data.phone;
    if (data.address !== undefined || data.lat !== undefined || data.long !== undefined) {
        restaurant.location = {
            address: data.address !== undefined ? data.address : restaurant.location.address,
            lat: data.lat !== undefined ? normalizeLatLong(data.lat) : restaurant.location.lat,
            long: data.long !== undefined ? normalizeLatLong(data.long) : restaurant.location.long,
        };
    }

    await restaurant.save();
    return restaurant;
}

async function deleteRestaurant(restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }
    await restaurant.deleteOne();
    return { message: 'Restaurant deleted' };
}

module.exports = {
    listRestaurants,
    getRestaurant,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    groupMenuByCategory,
};
