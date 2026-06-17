const express = require('express');
const authService = require('../../../services/authService');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
    const result = await authService.register({
        ...req.body,
        origin: req.headers.origin,
    });
    sendJson(res, 201, result);
}));

router.get('/confirm/:token', asyncHandler(async (req, res) => {
    const result = await authService.confirmAccount(req.params.token, {
        inviteFrom: req.query.from,
        inviteToken: req.query.inviteToken,
    });
    sendJson(res, 200, result);
}));

router.post('/login', asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    sendJson(res, 200, result);
}));

router.post('/refresh', asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    sendJson(res, 200, result);
}));

router.post('/logout', asyncHandler(async (req, res) => {
    const result = await authService.logout(req.body.refreshToken);
    sendJson(res, 200, result);
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword({
        email: req.body.email,
        origin: req.headers.origin,
    });
    sendJson(res, 200, result);
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    sendJson(res, 200, result);
}));

module.exports = router;
