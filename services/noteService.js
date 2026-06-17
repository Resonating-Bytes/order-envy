const Note = require('../models/note');
const Restaurant = require('../models/restaurant');
const MenuItem = require('../models/menuItem');

async function upsertNote({ user, restaurantId, menuItemId, body }) {
    let about;
    let aboutModel;

    if (menuItemId) {
        about = await MenuItem.findById(menuItemId);
        aboutModel = 'MenuItem';
    } else if (restaurantId) {
        about = await Restaurant.findById(restaurantId);
        aboutModel = 'Restaurant';
    }

    if (!about) {
        const err = new Error('Valid restaurant or menu item required');
        err.status = 404;
        throw err;
    }

    const existing = await Note.findOne({ user: user._id, about: about._id });
    if (existing) {
        existing.body = body;
        await existing.save();
        return existing;
    }

    return Note.create({
        body,
        about: about._id,
        aboutModel,
        user: user._id,
    });
}

async function getNote({ user, restaurantId, menuItemId }) {
    let aboutId = menuItemId || restaurantId;
    if (!aboutId) return null;
    return Note.findOne({ user: user._id, about: aboutId });
}

module.exports = { upsertNote, getNote };
