const express = require('express');
const restaurantService = require('../../../services/restaurantService');
const checkinService = require('../../../services/checkinService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson, RATING_INFO } = require('../../../lib/apiHelpers');

const router = express.Router();

router.get('/meta/ratings', (req, res) => {
    sendJson(res, 200, { ratingInfo: RATING_INFO });
});

router.get('/', asyncHandler(async (req, res) => {
    const { lat, long, filterDist, since } = req.query;
    const result = await restaurantService.listRestaurants(req.user || null, {
        lat,
        long,
        filterDist,
        since,
    });
    sendJson(res, 200, result);
}));

router.get('/:restaurantId', asyncHandler(async (req, res) => {
    const result = await restaurantService.getRestaurant(req.params.restaurantId, req.user || null);
    sendJson(res, 200, result);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const restaurant = await restaurantService.createRestaurant(req.body);
    sendJson(res, 201, { restaurant });
}));

router.put('/:restaurantId', requireAuth, asyncHandler(async (req, res) => {
    const restaurant = await restaurantService.updateRestaurant(req.params.restaurantId, req.body, req.user);
    sendJson(res, 200, { restaurant });
}));

router.delete('/:restaurantId', requireAuth, asyncHandler(async (req, res) => {
    const result = await restaurantService.deleteRestaurant(req.params.restaurantId, req.user);
    sendJson(res, 200, result);
}));

router.post('/:restaurantId/claim', requireAuth, asyncHandler(async (req, res) => {
    const restaurant = await restaurantService.claimRestaurant(req.params.restaurantId, req.user);
    sendJson(res, 200, { restaurant });
}));

router.post('/:restaurantId/editors', requireAuth, asyncHandler(async (req, res) => {
    const restaurant = await restaurantService.addEditor(
        req.params.restaurantId,
        req.user,
        req.body.userId
    );
    sendJson(res, 200, { restaurant });
}));

router.delete('/:restaurantId/editors/:editorUserId', requireAuth, asyncHandler(async (req, res) => {
    const restaurant = await restaurantService.removeEditor(
        req.params.restaurantId,
        req.user,
        req.params.editorUserId
    );
    sendJson(res, 200, { restaurant });
}));

router.get('/:restaurantId/checkin', requireAuth, asyncHandler(async (req, res) => {
    const result = await restaurantService.getRestaurant(req.params.restaurantId, req.user);
    sendJson(res, 200, { restaurant: result.restaurant, categories: result.categories });
}));

router.post('/:restaurantId/checkin', requireAuth, asyncHandler(async (req, res) => {
    const result = await checkinService.submitCheckin(req.params.restaurantId, req.user, req.body);
    sendJson(res, 201, result);
}));

module.exports = router;
