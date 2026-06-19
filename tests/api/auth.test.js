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

    describe('POST /api/v1/auth/google', () => {
        const { verifyGoogleIdToken, exchangeGoogleAuthCode } = require('../../lib/googleAuth');

        beforeEach(() => {
            verifyGoogleIdToken.mockReset();
            exchangeGoogleAuthCode.mockReset();
        });

        it('creates a new account for an unknown Google user', async () => {
            verifyGoogleIdToken.mockResolvedValue({
                sub: 'google-user-1',
                email: 'new-google@example.com',
                given_name: 'New',
                family_name: 'Googler',
                email_verified: true,
            });

            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({ idToken: 'valid-google-token' });

            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBeTruthy();
            expect(res.body.refreshToken).toBeTruthy();
            expect(res.body.user.username).toBe('new-google@example.com');
            expect(res.body.isNewUser).toBe(true);

            const user = await User.findOne({ googleId: 'google-user-1' });
            expect(user).toBeTruthy();
            expect(user.tokenType).toBeUndefined();
        });

        it('logs in an existing Google-linked user', async () => {
            const existing = await createConfirmedUser({
                username: 'linked@example.com',
                firstName: 'Linked',
            });
            existing.googleId = 'google-user-2';
            await existing.save();

            verifyGoogleIdToken.mockResolvedValue({
                sub: 'google-user-2',
                email: 'linked@example.com',
                email_verified: true,
            });

            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({ idToken: 'valid-google-token' });

            expect(res.status).toBe(200);
            expect(res.body.user.username).toBe('linked@example.com');
            expect(res.body.isNewUser).toBe(false);
        });

        it('links Google to an existing confirmed email/password account', async () => {
            await createConfirmedUser({ username: 'local@example.com' });

            verifyGoogleIdToken.mockResolvedValue({
                sub: 'google-user-3',
                email: 'local@example.com',
                given_name: 'Local',
                email_verified: true,
            });

            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({ idToken: 'valid-google-token' });

            expect(res.status).toBe(200);
            expect(res.body.user.username).toBe('local@example.com');

            const user = await User.findOne({ username: 'local@example.com' });
            expect(user.googleId).toBe('google-user-3');
        });

        it('auto-confirms a pending email account when Google email matches', async () => {
            await createPendingUser({ username: 'pending-google@example.com' });

            verifyGoogleIdToken.mockResolvedValue({
                sub: 'google-user-4',
                email: 'pending-google@example.com',
                email_verified: true,
            });

            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({ idToken: 'valid-google-token' });

            expect(res.status).toBe(200);
            const user = await User.findOne({ username: 'pending-google@example.com' });
            expect(user.googleId).toBe('google-user-4');
            expect(user.tokenType).toBeUndefined();
        });

        it('accepts an authorization code and exchanges it server-side', async () => {
            exchangeGoogleAuthCode.mockResolvedValue('exchanged-id-token');
            verifyGoogleIdToken.mockResolvedValue({
                sub: 'google-user-5',
                email: 'code-flow@example.com',
                given_name: 'Code',
                family_name: 'Flow',
                email_verified: true,
            });

            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({
                    code: 'google-auth-code',
                    redirectUri: 'https://auth.expo.io/@test/order-envy',
                    codeVerifier: 'pkce-verifier',
                });

            expect(res.status).toBe(200);
            expect(exchangeGoogleAuthCode).toHaveBeenCalledWith(
                'google-auth-code',
                'https://auth.expo.io/@test/order-envy',
                'pkce-verifier'
            );
            expect(verifyGoogleIdToken).toHaveBeenCalledWith('exchanged-id-token');
            expect(res.body.user.username).toBe('code-flow@example.com');
        });

        it('returns 400 when neither token nor code is provided', async () => {
            const res = await request(app)
                .post('/api/v1/auth/google')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/token|code/i);
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
