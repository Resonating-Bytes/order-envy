const express = require('express');
const listService = require('../../../services/listService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const lists = await listService.listForUser(req.user);
    sendJson(res, 200, { lists });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const list = await listService.createList(req.user, req.body);
    sendJson(res, 201, { list });
}));

router.get('/:listId', requireAuth, asyncHandler(async (req, res) => {
    const list = await listService.getList(req.params.listId);
    sendJson(res, 200, { list });
}));

router.put('/:listId', requireAuth, asyncHandler(async (req, res) => {
    const list = await listService.updateList(req.params.listId, req.user, req.body);
    sendJson(res, 200, { list });
}));

router.delete('/:listId', requireAuth, asyncHandler(async (req, res) => {
    const result = await listService.deleteList(req.params.listId, req.user);
    sendJson(res, 200, result);
}));

router.post('/:listId/restaurants/:restaurantId', requireAuth, asyncHandler(async (req, res) => {
    const list = await listService.addRestaurant(req.params.listId, req.user, req.params.restaurantId);
    sendJson(res, 200, { list });
}));

router.delete('/:listId/restaurants/:restaurantId', requireAuth, asyncHandler(async (req, res) => {
    const list = await listService.removeRestaurant(req.params.listId, req.user, req.params.restaurantId);
    sendJson(res, 200, { list });
}));

module.exports = router;
