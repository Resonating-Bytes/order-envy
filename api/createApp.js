require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('../lib/mongoose');
const apiV1Routes = require('../routes/api/v1');
const apiErrorHandler = require('../middleware/apiErrorHandler');
const optionalAuth = require('../middleware/optionalAuth');

function createApiApp() {
    const app = express();

    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/v1/health', (req, res) => {
        res.json({ ok: true, version: 'v1' });
    });

    app.use(async (req, res, next) => {
        try {
            await connectDB();
            next();
        } catch (err) {
            next(err);
        }
    });

    app.use(optionalAuth);
    app.use('/v1', apiV1Routes);
    app.use(apiErrorHandler);

    return app;
}

module.exports = createApiApp;
