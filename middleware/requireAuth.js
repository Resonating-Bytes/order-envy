const User = require('../models/user');
const { verifyToken } = require('../lib/jwt');
const { sendError } = require('../lib/apiHelpers');

module.exports = async function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return sendError(res, 401, 'Authentication required');
    }

    try {
        const payload = verifyToken(token);
        if (payload.type !== 'access') {
            return sendError(res, 401, 'Invalid token type');
        }

        const user = await User.findById(payload.sub).populate('friends');
        if (!user) {
            return sendError(res, 401, 'User not found');
        }

        req.user = user;
        req.apiUser = user;
        next();
    } catch (err) {
        return sendError(res, 401, 'Invalid or expired token');
    }
};
