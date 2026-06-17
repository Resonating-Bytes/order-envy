const express = require('express');
const noteService = require('../../../services/noteService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const note = await noteService.getNote({
        user: req.user,
        restaurantId: req.params.restaurantId,
        menuItemId: req.params.menuItemId,
    });
    sendJson(res, 200, { note });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const note = await noteService.upsertNote({
        user: req.user,
        restaurantId: req.params.menuItemId ? undefined : req.params.restaurantId,
        menuItemId: req.params.menuItemId,
        body: req.body.body,
    });
    sendJson(res, 200, { note });
}));

module.exports = router;
