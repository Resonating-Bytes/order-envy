const createApiApp = require('../../api/createApp');
const request = require('supertest');
const { sendEmail } = require('../../utils/misc');
const User = require('../../models/user');
const RefreshToken = require('../../models/refreshToken');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');
const { createConfirmedUser, createPendingUser } = require('../helpers/authHelper');

describe('API v1 auth', () => {
    let app;

    beforeAll(async () => {
        await connectTestDb();
        app = createApiApp();
    });

    beforeEach(async () => {
        await clearTestDb();
        sendEmail.mockClear();
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    describe('POST /api/v1/auth/register', () => {
        it('creates a pending account and sends confirmation email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser@example.com',
                    password: 'secure-pass-123',
                    firstName: 'New',
                    lastName: 'User',
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toMatch(/confirm/i);
            expect(sendEmail).toHaveBeenCalledTimes(1);

            const user = await User.findOne({ username: 'newuser@example.com' });
            expect(user).toBeTruthy();
            expect(user.token).toBeTruthy();
        });

        it('returns 400 when username or password is missing', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ username: 'newuser@example.com' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/required/i);
        });
    });

    describe('GET /api/v1/auth/confirm/:token', () => {
        it('confirms a pending account', async () => {
            const pending = await createPendingUser({ username: 'confirm-me@example.com' });

            const res = await request(app)
                .get(`/api/v1/auth/confirm/${pending.token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/confirmed/i);

            const updated = await User.findById(pending._id);
            expect(updated.token).toBeUndefined();
            expect(updated.tokenType).toBeUndefined();
        });

        it('returns 400 for invalid token', async () => {
            const res = await request(app)
                .get('/api/v1/auth/confirm/not-a-real-token');

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/invalid|expired/i);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('returns tokens for a confirmed user', async () => {
            const user = await createConfirmedUser({
                username: 'login-user@example.com',
                password: 'login-pass-123',
            });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: user.username, password: 'login-pass-123' });

            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBeTruthy();
            expect(res.body.refreshToken).toBeTruthy();
            expect(res.body.user.username).toBe(user.username);
        });

        it('returns 403 for unconfirmed account', async () => {
            const pending = await createPendingUser({ username: 'still-pending@example.com' });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: pending.username, password: 'test-password-123' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/confirm/i);
        });

        it('returns 401 for invalid credentials', async () => {
            await createConfirmedUser({ username: 'known-user@example.com' });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'known-user@example.com', password: 'wrong-password' });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid/i);
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        it('issues new tokens and keeps a single active refresh token', async () => {
            const user = await createConfirmedUser({ username: 'refresh-user@example.com' });
            const login = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: user.username, password: 'test-password-123' });

            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken: login.body.refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBeTruthy();
            expect(res.body.refreshToken).toBeTruthy();

            const meRes = await request(app)
                .get('/api/v1/users/me')
                .set({ Authorization: `Bearer ${res.body.accessToken}` });

            expect(meRes.status).toBe(200);
            expect(meRes.body.user.username).toBe(user.username);

            const storedCount = await RefreshToken.countDocuments({ user: user._id });
            expect(storedCount).toBe(1);
        });

        it('returns 401 after logout', async () => {
            const user = await createConfirmedUser({ username: 'logout-user@example.com' });
            const login = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: user.username, password: 'test-password-123' });

            await request(app)
                .post('/api/v1/auth/logout')
                .send({ refreshToken: login.body.refreshToken });

            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken: login.body.refreshToken });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('revokes the refresh token', async () => {
            const user = await createConfirmedUser({ username: 'revoke-user@example.com' });
            const login = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: user.username, password: 'test-password-123' });

            const res = await request(app)
                .post('/api/v1/auth/logout')
                .send({ refreshToken: login.body.refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/logged out/i);
            expect(await RefreshToken.countDocuments({ user: user._id })).toBe(0);
        });
    });
});
