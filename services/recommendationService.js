const Recommendation = require('../models/recommendation');

async function createRecommendation(user, { friendId, restaurantId, menuItemId }) {
    const recommendation = {
        for: friendId,
        restaurant: restaurantId,
        menuItem: menuItemId || undefined,
    };

    const created = await Recommendation.findOneAndUpdate(
        recommendation,
        recommendation,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!created.from.addToSet(user._id).length) {
        const err = new Error('You already recommended that to them');
        err.status = 409;
        throw err;
    }

    await created.save();
    return created;
}

async function deleteRecommendation(user, recommendationId) {
    const recommendation = await Recommendation.findById(recommendationId);
    if (!recommendation) {
        const err = new Error('Recommendation not found');
        err.status = 404;
        throw err;
    }
    await recommendation.deleteOne();
    return { message: 'Recommendation deleted' };
}

async function listForUser(user) {
    return Recommendation.find({ for: user._id })
        .populate('restaurant')
        .populate('menuItem')
        .populate('from')
        .sort('-updatedAt');
}

module.exports = {
    createRecommendation,
    deleteRecommendation,
    listForUser,
};
