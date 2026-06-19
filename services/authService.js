const crypto = require('crypto');
const User = require('../models/user');
const Friends = require('../models/friends');
const RefreshToken = require('../models/refreshToken');
const { signAccessToken, signRefreshToken, verifyToken } = require('../lib/jwt');
const { formatUser } = require('../lib/apiHelpers');
const { exchangeGoogleAuthCode, verifyGoogleIdToken } = require('../lib/googleAuth');
const { generateToken, sendEmail, TokenType } = require('../utils/misc');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function getAppOrigin(origin) {
    return origin || process.env.APP_ORIGIN || 'http://localhost:1979';
}

async function issueTokens(user) {
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await RefreshToken.create({
        user: user._id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
    });

    return { accessToken, refreshToken, user: formatUser(user) };
}

async function register({ username, password, firstName, lastName, origin }) {
    if (!username || !password) {
        const err = new Error('Username and password are required');
        err.status = 400;
        throw err;
    }

    const token = generateToken();
    const tokenExpire = new Date();
    tokenExpire.setTime(tokenExpire.getTime() + 60 * 60 * 1000);

    const user = new User({
        username,
        email: username,
        firstName,
        lastName,
        friends: [],
        token,
        tokenExpire,
        tokenType: TokenType.NEW_ACCOUNT,
    });

    await new Promise((resolve, reject) => {
        User.register(user, password, (err, registeredUser) => {
            if (err) return reject(err);
            resolve(registeredUser);
        });
    });

    const appOrigin = getAppOrigin(origin);
    const subjectMsg = 'Confirm Order Envy account';
    const htmlMsg = `<h1>Welcome to Order Envy</h1>
        <p>Use <a href="${appOrigin}/api/v1/auth/confirm/${token}">this link</a> to confirm your account</p>
        <p>NOTE: the link will expire in one hour</p>`;

    await new Promise((resolve, reject) => {
        sendEmail(username, subjectMsg, htmlMsg, (error, info) => {
            if (error || (info && info.rejected && info.rejected.length)) {
                return reject(new Error('Failed to send confirmation email'));
            }
            resolve();
        });
    });

    return { message: 'Registration successful. Please check your email to confirm your account.' };
}

async function confirmAccount(token, { inviteFrom, inviteToken } = {}) {
    const user = await User.findOne({ token, tokenType: TokenType.NEW_ACCOUNT });
    if (!user || !user.tokenExpire || user.tokenExpire.getTime() < Date.now()) {
        if (user) await user.deleteOne();
        const err = new Error('Invalid or expired confirmation token');
        err.status = 400;
        throw err;
    }

    user.token = undefined;
    user.tokenExpire = undefined;
    user.tokenType = undefined;
    await user.save();

    if (inviteFrom && inviteToken) {
        const tokenExpire = new Date();
        const friendRequest = await Friends.findOne({
            source: inviteFrom,
            request: user.username,
            token: inviteToken,
            tokenType: TokenType.INVITE_FRIEND,
            tokenExpire: { $gt: tokenExpire },
        });

        if (friendRequest) {
            const foundUser = await User.findById(friendRequest.source);
            if (foundUser) {
                user.friends.addToSet(foundUser._id);
                await user.save();
                foundUser.friends.addToSet(user._id);
                await foundUser.save();
                await friendRequest.deleteOne();
            }
        }
    }

    return { message: 'Account confirmed. You may now log in.' };
}

async function login({ username, password }) {
    const authResult = await new Promise((resolve, reject) => {
        User.authenticate()(username, password, (err, user, info) => {
            if (err) return reject(err);
            resolve({ user, info });
        });
    });

    const { user } = authResult;
    if (!user) {
        const err = new Error('Invalid username or password');
        err.status = 401;
        throw err;
    }

    if (user.tokenType === TokenType.NEW_ACCOUNT) {
        if (user.tokenExpire && user.tokenExpire.getTime() < Date.now()) {
            await user.deleteOne();
            const err = new Error('Account registration expired. Please register again.');
            err.status = 401;
            throw err;
        }
        const err = new Error('Account must be confirmed via email before logging in');
        err.status = 403;
        throw err;
    }

    const populated = await User.findById(user._id).populate('friends');
    return issueTokens(populated);
}

async function loginWithGoogle({ idToken, id_token, code, redirectUri, codeVerifier }) {
    let token = idToken || id_token;
    if (!token && code) {
        token = await exchangeGoogleAuthCode(code, redirectUri, codeVerifier);
    }
    if (!token) {
        const err = new Error('Google ID token or authorization code required');
        err.status = 400;
        throw err;
    }

    const payload = await verifyGoogleIdToken(token);
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();

    let user = await User.findOne({ googleId });
    if (user) {
        const populated = await User.findById(user._id).populate('friends');
        return { ...(await issueTokens(populated)), isNewUser: false };
    }

    user = await User.findOne({ username: email });
    if (user) {
        if (user.googleId && user.googleId !== googleId) {
            const err = new Error('This email is linked to a different Google account');
            err.status = 409;
            throw err;
        }

        if (user.tokenType === TokenType.NEW_ACCOUNT) {
            user.token = undefined;
            user.tokenExpire = undefined;
            user.tokenType = undefined;
        }

        user.googleId = googleId;
        if (!user.firstName && payload.given_name) {
            user.firstName = payload.given_name;
        }
        if (!user.lastName && payload.family_name) {
            user.lastName = payload.family_name;
        }
        await user.save();

        const populated = await User.findById(user._id).populate('friends');
        return { ...(await issueTokens(populated)), isNewUser: false };
    }

    const newUser = new User({
        username: email,
        email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        googleId,
        friends: [],
    });

    await new Promise((resolve, reject) => {
        User.register(newUser, crypto.randomBytes(32).toString('hex'), (err, registeredUser) => {
            if (err) return reject(err);
            resolve(registeredUser);
        });
    });

    const populated = await User.findById(newUser._id).populate('friends');
    return { ...(await issueTokens(populated)), isNewUser: true };
}

async function refresh(refreshToken) {
    if (!refreshToken) {
        const err = new Error('Refresh token required');
        err.status = 400;
        throw err;
    }

    let payload;
    try {
        payload = verifyToken(refreshToken);
    } catch (e) {
        const err = new Error('Invalid refresh token');
        err.status = 401;
        throw err;
    }

    if (payload.type !== 'refresh') {
        const err = new Error('Invalid token type');
        err.status = 401;
        throw err;
    }

    const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
    if (!stored) {
        const err = new Error('Refresh token revoked or not found');
        err.status = 401;
        throw err;
    }

    await stored.deleteOne();

    const user = await User.findById(payload.sub).populate('friends');
    if (!user) {
        const err = new Error('User not found');
        err.status = 401;
        throw err;
    }

    return issueTokens(user);
}

async function logout(refreshToken) {
    if (refreshToken) {
        await RefreshToken.deleteOne({ tokenHash: hashToken(refreshToken) });
    }
    return { message: 'Logged out' };
}

async function forgotPassword({ email, origin }) {
    const user = await User.findOne({ username: email });
    if (!user) {
        const err = new Error('No user found with that email');
        err.status = 404;
        throw err;
    }

    const token = generateToken();
    const tokenExpire = new Date();
    tokenExpire.setTime(tokenExpire.getTime() + 60 * 60 * 1000);

    await User.updateOne(
        { _id: user._id },
        { token, tokenExpire, tokenType: TokenType.FORGOT_PASSWORD }
    );

    const appOrigin = getAppOrigin(origin);
    const subjectMsg = 'Reset Order Envy password';
    const htmlMsg = `<h1>Order Envy</h1>
        <p>Use <a href="${appOrigin}/resetPassword/${token}">this link</a> to complete the reset process</p>
        <p>NOTE: the link will expire in one hour</p>`;

    await new Promise((resolve, reject) => {
        sendEmail(user.username, subjectMsg, htmlMsg, (error, info) => {
            if (error || (info && info.rejected && info.rejected.length)) {
                return reject(new Error('Failed to send reset email'));
            }
            resolve();
        });
    });

    return { message: 'Password reset email sent' };
}

async function resetPassword({ token, newPassword }) {
    const user = await User.findOne({ token, tokenType: TokenType.FORGOT_PASSWORD });
    if (!user || !user.tokenExpire || user.tokenExpire.getTime() < Date.now()) {
        const err = new Error('Invalid or expired reset token');
        err.status = 400;
        throw err;
    }

    await new Promise((resolve, reject) => {
        user.setPassword(newPassword, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    await User.updateOne(
        { _id: user._id },
        { hash: user.hash, salt: user.salt, $unset: { token: 1, tokenExpire: 1, tokenType: 1 } }
    );

    return { message: 'Password successfully changed' };
}

module.exports = {
    register,
    confirmAccount,
    login,
    loginWithGoogle,
    refresh,
    logout,
    forgotPassword,
    resetPassword,
};
