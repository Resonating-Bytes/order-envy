const createApiApp = require('../../api/createApp');
const request = require('supertest');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('API v1 health and public routes', () => {
    let app;

    beforeAll(async () => {
        await connectTestDb();
        app = createApiApp();
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    describe('GET /api/v1/health', () => {
        it('returns ok', async () => {
            const res = await request(app).get('/api/v1/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, version: 'v1' });
        });

        it('returns ok on Vercel-style /v1/health path', async () => {
            const res = await request(app).get('/v1/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, version: 'v1' });
        });
    });

    describe('GET /api/v1/restaurants/meta/ratings', () => {
        it('returns rating info', async () => {
            const res = await request(app).get('/api/v1/restaurants/meta/ratings');
            expect(res.status).toBe(200);
            expect(res.body.ratingInfo).toHaveLength(5);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('returns 401 for invalid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'nobody@example.com', password: 'wrong' });
            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('Protected routes', () => {
        it('returns 401 without token', async () => {
            const res = await request(app).get('/api/v1/users/me');
            expect(res.status).toBe(401);
        });
    });
});
