const List = require('../models/list');
const Restaurant = require('../models/restaurant');

async function listForUser(user) {
    return List.find({ users: user._id });
}

async function getList(listId) {
    const list = await List.findById(listId).populate('restaurants');
    if (!list) {
        const err = new Error('List not found');
        err.status = 404;
        throw err;
    }
    return list;
}

async function userOwnsList(list, user) {
    return list.users.some((u) => u.equals(user._id));
}

async function createList(user, { name }) {
    return List.create({ name, users: [user._id], restaurants: [] });
}

async function updateList(listId, user, { name }) {
    const list = await getList(listId);
    if (!(await userOwnsList(list, user))) {
        const err = new Error('You do not have permission for this list');
        err.status = 403;
        throw err;
    }
    if (name !== undefined) list.name = name;
    await list.save();
    return list;
}

async function deleteList(listId, user) {
    const list = await getList(listId);
    if (!(await userOwnsList(list, user))) {
        const err = new Error('You do not have permission for this list');
        err.status = 403;
        throw err;
    }
    await list.deleteOne();
    return { message: 'List deleted' };
}

async function addRestaurant(listId, user, restaurantId) {
    const list = await getList(listId);
    if (!(await userOwnsList(list, user))) {
        const err = new Error('You do not have permission for this list');
        err.status = 403;
        throw err;
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        const err = new Error('Restaurant not found');
        err.status = 404;
        throw err;
    }

    if (!list.restaurants.addToSet(restaurant._id).length) {
        const err = new Error(`Already in ${list.name}`);
        err.status = 409;
        throw err;
    }

    await list.save();
    return list;
}

async function removeRestaurant(listId, user, restaurantId) {
    const list = await getList(listId);
    if (!(await userOwnsList(list, user))) {
        const err = new Error('You do not have permission for this list');
        err.status = 403;
        throw err;
    }

    const oldLen = list.restaurants.length;
    list.restaurants = list.restaurants.filter((e) => !e.equals(restaurantId));
    if (oldLen === list.restaurants.length) {
        const err = new Error('Restaurant not found in list');
        err.status = 404;
        throw err;
    }

    await list.save();
    return list;
}

module.exports = {
    listForUser,
    getList,
    createList,
    updateList,
    deleteList,
    addRestaurant,
    removeRestaurant,
};
