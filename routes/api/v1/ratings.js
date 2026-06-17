const express = require('express');
const ratingService = require('../../../services/ratingService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');

const router = express.Router({ mergeParams: true });

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    let rating;
    if (req.params.menuItemId) {
        rating = await ratingService.createRatingForMenuItem(
            req.params.restaurantId,
            req.params.menuItemId,
            req.user,
            req.body
        );
    } else {
        rating = await ratingService.createRatingForRestaurant(
            req.params.restaurantId,
            req.user,
            req.body
        );
    }
    sendJson(res, 201, { rating });
}));

router.get('/:ratingId', requireAuth, asyncHandler(async (req, res) => {
    const rating = await ratingService.getRating(req.params.ratingId, req.user);
    sendJson(res, 200, { rating });
}));

router.put('/:ratingId', requireAuth, asyncHandler(async (req, res) => {
    const rating = await ratingService.updateRating(req.params.ratingId, req.user, req.body);
    sendJson(res, 200, { rating });
}));

router.delete('/:ratingId', requireAuth, asyncHandler(async (req, res) => {
    const result = await ratingService.deleteRating(req.params.ratingId, req.user);
    sendJson(res, 200, result);
}));

module.exports = router;
