const express = require('express');

const authRoutes = require('./auth');
const restaurantRoutes = require('./restaurants');
const menuItemRoutes = require('./menuItems');
const ratingRoutes = require('./ratings');
const noteRoutes = require('./notes');
const listRoutes = require('./lists');
const friendRoutes = require('./friends');
const recommendationRoutes = require('./recommendations');
const userRoutes = require('./users');
const locationRoutes = require('./location');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/restaurants/:restaurantId/menu-items', menuItemRoutes);
router.use('/restaurants/:restaurantId/ratings', ratingRoutes);
router.use('/restaurants/:restaurantId/menu-items/:menuItemId/ratings', ratingRoutes);
router.use('/restaurants/:restaurantId/notes', noteRoutes);
router.use('/restaurants/:restaurantId/menu-items/:menuItemId/notes', noteRoutes);
router.use('/lists', listRoutes);
router.use('/friends', friendRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/users', userRoutes);
router.use('/location', locationRoutes);

module.exports = router;
