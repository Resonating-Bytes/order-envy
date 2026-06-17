const MenuItem = require('../models/menuItem');
const Restaurant = require('../models/restaurant');
const Note = require('../models/note');
const { filterUserOwned } = require('../utils/misc');

async function createMenuItem(restaurantId, data) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }

    const menuItem = await MenuItem.create({
        name: data.name,
        description: data.description,
        category: data.category,
    });

    restaurant.menuItems.push(menuItem._id);
    await restaurant.save();
    return menuItem;
}

async function getMenuItem(menuItemId, user) {
    const menuItem = await MenuItem.findById(menuItemId)
        .populate({ path: 'ratings', options: { sort: { createdAt: -1 } } });

    if (!menuItem) {
        const err = new Error('Menu item not found');
        err.status = 404;
        throw err;
    }

    let note = null;
    if (user) {
        note = await Note.findOne({ about: menuItem._id, user: user._id });
    }

    return { menuItem, note, userRatings: filterUserOwned(user, menuItem.ratings) };
}

async function updateMenuItem(menuItemId, data) {
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
        const err = new Error('Menu item not found');
        err.status = 404;
        throw err;
    }

    if (data.name !== undefined) menuItem.name = data.name;
    if (data.description !== undefined) menuItem.description = data.description;
    if (data.category !== undefined) menuItem.category = data.category;
    await menuItem.save();
    return menuItem;
}

async function deleteMenuItem(menuItemId) {
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
        const err = new Error('Menu item not found');
        err.status = 404;
        throw err;
    }
    await menuItem.deleteOne();
    return { message: 'Menu item deleted' };
}

module.exports = {
    createMenuItem,
    getMenuItem,
    updateMenuItem,
    deleteMenuItem,
};
