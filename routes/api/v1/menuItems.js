const express = require('express');
const menuItemService = require('../../../services/menuItemService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');
const MenuItem = require('../../../models/menuItem');

const router = express.Router({ mergeParams: true });

router.get('/categories', (req, res) => {
    sendJson(res, 200, { categories: MenuItem.getCategories() });
});

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const menuItem = await menuItemService.createMenuItem(req.params.restaurantId, req.body);
    sendJson(res, 201, { menuItem });
}));

router.get('/:menuItemId', requireAuth, asyncHandler(async (req, res) => {
    const result = await menuItemService.getMenuItem(req.params.menuItemId, req.user);
    sendJson(res, 200, result);
}));

router.put('/:menuItemId', requireAuth, asyncHandler(async (req, res) => {
    const menuItem = await menuItemService.updateMenuItem(req.params.menuItemId, req.body);
    sendJson(res, 200, { menuItem });
}));

router.delete('/:menuItemId', requireAuth, asyncHandler(async (req, res) => {
    const result = await menuItemService.deleteMenuItem(req.params.menuItemId);
    sendJson(res, 200, result);
}));

module.exports = router;
