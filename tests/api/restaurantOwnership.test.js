const createApiApp = require('../../api/createApp');
const request = require('supertest');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');
const { createConfirmedUser, loginUser, bearerHeader } = require('../helpers/authHelper');

describe('API v1 restaurant ownership', () => {
    let app;
    let ownerAuth;
    let otherAuth;

    beforeAll(async () => {
        await connectTestDb();
        app = createApiApp();
    });

    beforeEach(async () => {
        await clearTestDb();
        const owner = await createConfirmedUser({ username: 'owner@example.com' });
        const other = await createConfirmedUser({ username: 'other@example.com' });
        const ownerLogin = await loginUser(app, { username: owner.username, password: 'test-password-123' });
        const otherLogin = await loginUser(app, { username: other.username, password: 'test-password-123' });
        ownerAuth = { user: owner, accessToken: ownerLogin.body.accessToken };
        otherAuth = { user: other, accessToken: otherLogin.body.accessToken };
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    async function createRestaurant(auth, name = 'Test Diner') {
        const res = await request(app)
            .post('/api/v1/restaurants')
            .set(bearerHeader(auth.accessToken))
            .send({ name });
        return res.body.restaurant._id;
    }

    it('allows anyone to edit unowned restaurants', async () => {
        const restaurantId = await createRestaurant(ownerAuth);

        const res = await request(app)
            .put(`/api/v1/restaurants/${restaurantId}`)
            .set(bearerHeader(otherAuth.accessToken))
            .send({ description: 'Updated by stranger' });

        expect(res.status).toBe(200);
        expect(res.body.restaurant.description).toBe('Updated by stranger');
    });

    it('blocks non-editors after ownership is claimed', async () => {
        const restaurantId = await createRestaurant(ownerAuth);

        await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/claim`)
            .set(bearerHeader(ownerAuth.accessToken));

        const denied = await request(app)
            .put(`/api/v1/restaurants/${restaurantId}`)
            .set(bearerHeader(otherAuth.accessToken))
            .send({ description: 'Should fail' });

        expect(denied.status).toBe(403);

        const allowed = await request(app)
            .put(`/api/v1/restaurants/${restaurantId}`)
            .set(bearerHeader(ownerAuth.accessToken))
            .send({ description: 'Owner edit' });

        expect(allowed.status).toBe(200);
    });

    it('allows delegated editors to edit menu items', async () => {
        const restaurantId = await createRestaurant(ownerAuth);

        await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/claim`)
            .set(bearerHeader(ownerAuth.accessToken));

        await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/editors`)
            .set(bearerHeader(ownerAuth.accessToken))
            .send({ userId: String(otherAuth.user._id) });

        const res = await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/menu-items`)
            .set(bearerHeader(otherAuth.accessToken))
            .send({ name: 'Editor Special', category: 'Entree' });

        expect(res.status).toBe(201);
    });

    it('returns canEdit flags on restaurant detail', async () => {
        const restaurantId = await createRestaurant(ownerAuth);

        await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/claim`)
            .set(bearerHeader(ownerAuth.accessToken));

        const ownerView = await request(app)
            .get(`/api/v1/restaurants/${restaurantId}`)
            .set(bearerHeader(ownerAuth.accessToken));

        const otherView = await request(app)
            .get(`/api/v1/restaurants/${restaurantId}`)
            .set(bearerHeader(otherAuth.accessToken));

        expect(ownerView.body.canEdit).toBe(true);
        expect(ownerView.body.canDelete).toBe(true);
        expect(otherView.body.canEdit).toBe(false);
        expect(otherView.body.canDelete).toBe(false);
    });

    it('prevents double claim', async () => {
        const restaurantId = await createRestaurant(ownerAuth);

        await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/claim`)
            .set(bearerHeader(ownerAuth.accessToken));

        const secondClaim = await request(app)
            .post(`/api/v1/restaurants/${restaurantId}/claim`)
            .set(bearerHeader(otherAuth.accessToken));

        expect(secondClaim.status).toBe(409);
    });
});
