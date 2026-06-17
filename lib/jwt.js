const jwt = require('jsonwebtoken');

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '30d';

const DEV_FALLBACK_SECRET = 'This is my super secret message used to encode things';

function getSecrets() {
    const secret = process.env.JWT_SECRET
        || process.env.SESSION_SECRET
        || (process.env.NODE_ENV !== 'production' ? DEV_FALLBACK_SECRET : null);
    if (!secret) {
        throw new Error('JWT_SECRET or SESSION_SECRET must be set');
    }
    return secret;
}

function signAccessToken(userId) {
    return jwt.sign({ sub: String(userId), type: 'access' }, getSecrets(), { expiresIn: ACCESS_EXPIRY });
}

function signRefreshToken(userId) {
    return jwt.sign({ sub: String(userId), type: 'refresh' }, getSecrets(), { expiresIn: REFRESH_EXPIRY });
}

function verifyToken(token) {
    return jwt.verify(token, getSecrets());
}

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyToken,
    ACCESS_EXPIRY,
    REFRESH_EXPIRY,
};
