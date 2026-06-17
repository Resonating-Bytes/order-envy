const User = require('../models/user');
const { verifyToken } = require('../lib/jwt');

module.exports = async function optionalAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return next();
    }

    try {
        const payload = verifyToken(token);
        if (payload.type === 'access') {
            const user = await User.findById(payload.sub).populate('friends');
            if (user) {
                req.user = user;
                req.apiUser = user;
            }
        }
    } catch (err) {
        // ignore invalid tokens for optional auth
    }

    next();
};
