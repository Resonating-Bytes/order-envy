const express = require('express');
const recommendationService = require('../../../services/recommendationService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const recommendations = await recommendationService.listForUser(req.user);
    sendJson(res, 200, { recommendations });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const recommendation = await recommendationService.createRecommendation(req.user, req.body);
    sendJson(res, 201, { recommendation });
}));

router.delete('/:recommendationId', requireAuth, asyncHandler(async (req, res) => {
    const result = await recommendationService.deleteRecommendation(req.user, req.params.recommendationId);
    sendJson(res, 200, result);
}));

module.exports = router;
