const request = require('supertest');
const User = require('../../models/user');
const { TokenType } = require('../../utils/misc');

async function createConfirmedUser({
    username = `test-${Date.now()}@example.com`,
    password = 'test-password-123',
    firstName = 'Test',
    lastName = 'User',
} = {}) {
    const user = new User({
        username,
        email: username,
        firstName,
        lastName,
        friends: [],
    });

    const registered = await new Promise((resolve, reject) => {
        User.register(user, password, (err, savedUser) => {
            if (err) return reject(err);
            resolve(savedUser);
        });
    });

    registered.token = undefined;
    registered.tokenExpire = undefined;
    registered.tokenType = undefined;
    await registered.save();

    return registered;
}

async function createPendingUser({
    username = `pending-${Date.now()}@example.com`,
    password = 'test-password-123',
    firstName = 'Pending',
    lastName = 'User',
} = {}) {
    const token = 'test-confirm-token';
    const tokenExpire = new Date(Date.now() + 60 * 60 * 1000);
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
        User.register(user, password, (err, savedUser) => {
            if (err) return reject(err);
            resolve(savedUser);
        });
    });

    return User.findOne({ username });
}

async function loginUser(app, { username, password }) {
    return request(app)
        .post('/api/v1/auth/login')
        .send({ username, password });
}

function bearerHeader(accessToken) {
    return { Authorization: `Bearer ${accessToken}` };
}

module.exports = {
    createConfirmedUser,
    createPendingUser,
    loginUser,
    bearerHeader,
};
