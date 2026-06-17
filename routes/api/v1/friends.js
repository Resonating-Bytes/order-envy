const express = require('express');
const friendService = require('../../../services/friendService');
const requireAuth = require('../../../middleware/requireAuth');
const { asyncHandler, sendJson, sendError } = require('../../../lib/apiHelpers');

const router = express.Router();

router.get('/requests', requireAuth, asyncHandler(async (req, res) => {
    const friendRequests = await friendService.listFriendRequests(req.user);
    sendJson(res, 200, { friendRequests });
}));

router.post('/request', requireAuth, asyncHandler(async (req, res) => {
    try {
        const result = await friendService.requestFriend(req.user, req.body, req.headers.origin);
        sendJson(res, 201, result);
    } catch (err) {
        if (err.code === 'NOT_FOUND' && req.body.email) {
            return sendJson(res, 404, {
                error: err.message,
                canInvite: true,
                email: req.body.email,
            });
        }
        throw err;
    }
}));

router.post('/invite', requireAuth, asyncHandler(async (req, res) => {
    const result = await friendService.inviteFriend(req.user, req.body.email, req.headers.origin);
    sendJson(res, 201, result);
}));

router.post('/confirm/:token', requireAuth, asyncHandler(async (req, res) => {
    const result = await friendService.confirmFriend(req.user, req.params.token, req.headers.origin);
    sendJson(res, 200, result);
}));

router.delete('/decline/:token', requireAuth, asyncHandler(async (req, res) => {
    const result = await friendService.declineFriend(req.user, req.params.token);
    sendJson(res, 200, result);
}));

router.get('/:friendId/activity', requireAuth, asyncHandler(async (req, res) => {
    const result = await friendService.getFriendActivity(req.user, req.params.friendId, req.query);
    sendJson(res, 200, result);
}));

router.delete('/:friendId', requireAuth, asyncHandler(async (req, res) => {
    const result = await friendService.removeFriend(req.user, req.params.friendId);
    sendJson(res, 200, result);
}));

module.exports = router;
