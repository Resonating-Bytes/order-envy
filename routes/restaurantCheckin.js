const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { cacheRestaurant } = require('../middleware/restaurant');
const MenuItem = require('../models/menuItem');
const Rating = require('../models/rating');
const Restaurant = require('../models/restaurant');
const { flash, FlashType } = require('../utils/misc');

router.get('/checkin', isLoggedIn, cacheRestaurant, (req, res) => {
    Restaurant.findById(req.params.restaurantID).populate('menuItems').exec((err, restaurant) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Restaurant not found: ${err.message}`);
            return res.redirect(`back`);
        } else {
            return res.render('restaurants/checkin', { restaurant });
        }
    });
});

function createRating(restaurant, menuItem, rating, comment, user) {
    const newRating = {
        rating,
        comment,
        user,
    };
    
    Rating.create(newRating, (err, createdRating) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error creating rating: ${err.message}`);
        } else {
            if (menuItem) {
                menuItem.ratings.push(createdRating);
                menuItem.save();
            } else if (restaurant) {
                restaurant.ratings.push(createdRating);
                restaurant.save();
            } else {
                flash(req, res, FlashType.ERROR, `Unknown error creating rating`);
            }
        }
    });
}

router.post('/checkin', isLoggedIn, cacheRestaurant, (req, res) => {
    // first extract the restaurant info
    if (req.body[res.locals.restaurant._id]) {
        const { rating, comment } = req.body[res.locals.restaurant._id];
        if (rating !== undefined && rating !== null) {
            createRating(res.locals.restaurant, null, rating, comment, res.locals.user);
        }

        // strip it out so we know the rest of the keys in the body are all menu items
        delete req.body[res.locals.restaurant._id];
    }

    Object.keys(req.body).forEach((menuItemID) => {
        const { checked, rating, comment } = req.body[menuItemID] || {};
        if (checked  && rating !== undefined && rating !== null) {
            MenuItem.findById(menuItemID, (err, menuItem) => {
                if (err) {
                    flash(req, res, FlashType.ERROR, `Failed to find menu item`);
                    return res.redirect('back');
                } else {
                    createRating(res.locals.restaurant, menuItem, rating, comment, res.locals.user);
                }
            });
        }
    });

    flash(req, res, 'success', 'Successfully checked in');
    return res.redirect(`/restaurants/${res.locals.restaurant._id}`);
});

module.exports = router;
