const express = require('express');
const userService = require('../../../services/userService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson, formatUser } = require('../../../lib/apiHelpers');

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    sendJson(res, 200, { user: formatUser(req.user) });
}));

router.get('/:userId', requireAuth, asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.params.userId, req.user);
    sendJson(res, 200, { user });
}));

router.put('/:userId', requireAuth, asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.params.userId, req.user, req.body);
    sendJson(res, 200, { user });
}));

router.delete('/:userId', requireAuth, asyncHandler(async (req, res) => {
    const result = await userService.deleteAccount(req.params.userId, req.user);
    sendJson(res, 200, result);
}));

module.exports = router;
