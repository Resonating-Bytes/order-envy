require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('../lib/mongoose');
const apiV1Routes = require('../routes/api/v1');
const apiErrorHandler = require('../middleware/apiErrorHandler');
const optionalAuth = require('../middleware/optionalAuth');

const API_PREFIXES = ['/api/v1', '/v1'];

function createApiApp() {
    const app = express();

    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const healthHandler = (req, res) => {
        res.json({ ok: true, version: 'v1' });
    };

    API_PREFIXES.forEach((prefix) => {
        app.get(`${prefix}/health`, healthHandler);
    });

    const apiRouter = express.Router();

    apiRouter.use(async (req, res, next) => {
        try {
            await connectDB();
            next();
        } catch (err) {
            next(err);
        }
    });

    apiRouter.use(optionalAuth);
    apiRouter.use('/', apiV1Routes);

    API_PREFIXES.forEach((prefix) => {
        app.use(prefix, apiRouter);
    });

    app.use(apiErrorHandler);

    return app;
}

module.exports = createApiApp;
