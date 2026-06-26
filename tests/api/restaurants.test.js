const createApiApp = require('../../api/createApp');
const request = require('supertest');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');
const { createConfirmedUser, loginUser, bearerHeader } = require('../helpers/authHelper');

describe('API v1 restaurants', () => {
    let app;
    let auth;

    beforeAll(async () => {
        await connectTestDb();
        app = createApiApp();
    });

    beforeEach(async () => {
        await clearTestDb();
        const user = await createConfirmedUser({ username: 'chef@example.com' });
        const login = await loginUser(app, {
            username: user.username,
            password: 'test-password-123',
        });
        auth = {
            user,
            accessToken: login.body.accessToken,
        };
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    describe('GET /api/v1/restaurants', () => {
        it('lists restaurants without auth', async () => {
            await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Taco Palace' });

            const res = await request(app).get('/api/v1/restaurants');

            expect(res.status).toBe(200);
            expect(res.body.restaurants).toHaveLength(1);
            expect(res.body.restaurants[0].name).toBe('Taco Palace');
        });

        it('includes userAverageRating for authenticated users', async () => {
            const restaurantRes = await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Rated Cafe' });

            const restaurantId = restaurantRes.body.restaurant._id;

            const menuItemRes = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/menu-items`)
                .set(bearerHeader(auth.accessToken))
                .send({
                    name: 'Soup',
                    category: 'Entree',
                });

            await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/checkin`)
                .set(bearerHeader(auth.accessToken))
                .send({
                    [menuItemRes.body.menuItem._id]: {
                        checked: true,
                        rating: 5,
                        comment: 'Great soup',
                    },
                });

            const res = await request(app)
                .get('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken));

            expect(res.status).toBe(200);
            expect(res.body.restaurants[0].userAverageRating).toBe(5);
        });

        it('returns syncedAt on list responses', async () => {
            await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Sync Cafe' });

            const res = await request(app).get('/api/v1/restaurants');

            expect(res.status).toBe(200);
            expect(res.body.mode).toBe('full');
            expect(typeof res.body.syncedAt).toBe('number');
        });

        it('returns delta rows when since watermark is provided', async () => {
            const first = await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Alpha Diner', lat: 40.0, long: -105.0 });

            await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Beta Grill', lat: 40.01, long: -105.01 });

            const full = await request(app)
                .get('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken));

            const since = full.body.syncedAt;

            await request(app)
                .put(`/api/v1/restaurants/${first.body.restaurant._id}`)
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Alpha Diner Updated' });

            const delta = await request(app)
                .get(`/api/v1/restaurants?since=${since}`)
                .set(bearerHeader(auth.accessToken));

            expect(delta.status).toBe(200);
            expect(delta.body.mode).toBe('delta');
            expect(delta.body.restaurants).toHaveLength(1);
            expect(delta.body.restaurants[0].name).toBe('Alpha Diner Updated');
        });
    });

    describe('POST /api/v1/restaurants', () => {
        it('requires auth', async () => {
            const res = await request(app)
                .post('/api/v1/restaurants')
                .send({ name: 'No Auth Cafe' });

            expect(res.status).toBe(401);
        });

        it('creates a restaurant', async () => {
            const res = await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({
                    name: 'Burger Barn',
                    description: 'Great burgers',
                    address: '123 Main St',
                    lat: 40.0,
                    long: -105.0,
                });

            expect(res.status).toBe(201);
            expect(res.body.restaurant.name).toBe('Burger Barn');
            expect(res.body.restaurant.location.address).toBe('123 Main St');
        });
    });

    describe('Restaurant check-in flow', () => {
        it('creates menu items and records check-in ratings', async () => {
            const restaurantRes = await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Pizza Planet' });

            const restaurantId = restaurantRes.body.restaurant._id;

            const menuItemRes = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/menu-items`)
                .set(bearerHeader(auth.accessToken))
                .send({
                    name: 'Margherita',
                    description: 'Classic pie',
                    category: 'Entree',
                });

            const menuItemId = menuItemRes.body.menuItem._id;

            const checkinBody = {
                [restaurantId]: { rating: 4, comment: 'Solid spot' },
                [menuItemId]: { checked: true, rating: 5, comment: 'Perfect slice' },
            };

            const checkinRes = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/checkin`)
                .set(bearerHeader(auth.accessToken))
                .send(checkinBody);

            expect(checkinRes.status).toBe(201);
            expect(checkinRes.body.ratings).toHaveLength(2);
            expect(checkinRes.body.message).toMatch(/checked in/i);

            const detailRes = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}`)
                .set(bearerHeader(auth.accessToken));

            expect(detailRes.status).toBe(200);
            expect(detailRes.body.restaurant.ratings.length).toBeGreaterThan(0);
            expect(detailRes.body.categories[0].menuItems[0].ratings.length).toBeGreaterThan(0);
        });
    });

    describe('DELETE /api/v1/restaurants/:restaurantId', () => {
        it('deletes a restaurant', async () => {
            const created = await request(app)
                .post('/api/v1/restaurants')
                .set(bearerHeader(auth.accessToken))
                .send({ name: 'Temporary Diner' });

            const restaurantId = created.body.restaurant._id;

            const deleteRes = await request(app)
                .delete(`/api/v1/restaurants/${restaurantId}`)
                .set(bearerHeader(auth.accessToken));

            expect(deleteRes.status).toBe(200);

            const getRes = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}`)
                .set(bearerHeader(auth.accessToken));

            expect(getRes.status).toBe(404);
        });
    });
});
