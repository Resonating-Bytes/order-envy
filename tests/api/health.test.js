const createApiApp = require('../../api/createApp');
const request = require('supertest');
const mongoose = require('mongoose');

describe('API v1', () => {
    let app;

    beforeAll(() => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
        process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
        app = createApiApp();
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    describe('GET /v1/health', () => {
        it('returns ok', async () => {
            const res = await request(app).get('/v1/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, version: 'v1' });
        });
    });

    describe('GET /v1/restaurants/meta/ratings', () => {
        it('returns rating info', async () => {
            const res = await request(app).get('/v1/restaurants/meta/ratings');
            expect(res.status).toBe(200);
            expect(res.body.ratingInfo).toHaveLength(5);
        });
    });

    describe('POST /v1/auth/login', () => {
        it('returns 401 for invalid credentials', async () => {
            const res = await request(app)
                .post('/v1/auth/login')
                .send({ username: 'nobody@example.com', password: 'wrong' });
            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('Protected routes', () => {
        it('returns 401 without token', async () => {
            const res = await request(app).get('/v1/users/me');
            expect(res.status).toBe(401);
        });
    });
});
