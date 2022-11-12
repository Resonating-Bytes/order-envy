const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { cacheRestaurant } = require('../middleware/restaurant');
const { cacheMenuItem } = require('../middleware/menuItem');
const { userOwnsRating } = require('../middleware/rating');
const Rating = require('../models/rating');

// helper to build up route based on available pieces from request
function _buildRedirectRoute(restaurant, menuItem) {
    return (restaurant ? `/restaurants/${restaurant._id}` : ``) + (menuItem ? `/menuItems/${menuItem._id}` : ``);
}

// 'index' route
// no reason to view all ratings on their own, redirect to restaurant index page
router.get('/', (req, res) => {
    res.redirect('/restaurants');
});

// 'new' route
router.get('/new', isLoggedIn, cacheRestaurant, cacheMenuItem, (req, res) => {
    const { menuItem, restaurant } = res.locals;
    const restaurantRoute = (restaurant ? `/restaurants/${restaurant._id}` : ``);
    const menuItemRoute = (menuItem ? `/menuItems/${menuItem._id}` : ``);
    const rating = {rating: -1};
    res.render(`ratings/new`, { restaurantRoute, menuItemRoute, rating });
});

// 'create' route
router.post('/', isLoggedIn, cacheRestaurant, cacheMenuItem, (req, res) => {
    const newRating = {
        rating: req.body.rating.rating,
        comment: req.body.comment,
        user: res.locals.user,
    };

    Rating.create(newRating, (err, createdRating) => {
        const { restaurant, menuItem } = res.locals;
        if (err) {
            console.error(`Error: ${err.message}`);
            req.flash(`error`, `Error creating rating: ${err.message}`);
        } else {
            if (menuItem) {
                menuItem.ratings.push(createdRating);
                menuItem.save();
            } else if (restaurant) {
                restaurant.ratings.push(createdRating);
                restaurant.save();
            } else {
                req.flash(`error`, `Unknown error creating rating`);
                return res.redirect('back');
            }

            console.log('Created: ' + createdRating);
            req.flash(`success`, `Successfully created rating!`);
            const route = _buildRedirectRoute(restaurant);
            res.redirect(route);
        }
    });
});

// 'show' route
router.get('/:ratingID', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    const { rating, restaurant, menuItem } = res.locals;
    const restaurantRoute = (restaurant ? `/restaurants/${restaurant._id}` : ``);
    const menuItemRoute = (menuItem ? `/menuItems/${menuItem._id}` : ``);
    res.render('ratings/show', { rating, restaurant, restaurantRoute, menuItem, menuItemRoute, rating });
});

// 'edit' route
router.get('/:ratingID/edit', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    const { restaurant, menuItem, rating } = res.locals;
    if (rating) {
        const restaurantRoute = (restaurant ? `/restaurants/${restaurant._id}` : ``);
        const menuItemRoute = (menuItem ? `/menuItems/${menuItem._id}` : ``);
        res.render(`ratings/edit`, { menuItemRoute, restaurantRoute, rating });
    } else {
        req.flash(`error`, `Unknown error editing rating`);
        res.redirect(`/restaurants`);
    }
});

// 'update' route
router.put('/:ratingID', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    // since we already have the rating we can update it directly and save
    const { restaurant, menuItem, rating } = res.locals;
    if (rating) {
        Object.assign(rating, req.body.rating);
        rating.save();

        const route = _buildRedirectRoute(restaurant, menuItem);
        res.redirect(route + `/ratings/${rating._id}`);
    } else {
        req.flash(`error`, `Unknown error editing rating`);
        res.redirect(`/restaurants`);
    }
});

// 'delete' route
router.delete('/:ratingID', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    // since we already have the rating we can delete it directly
    const { menuItem, restaurant, rating } = res.locals;
    if (rating) {
        rating.remove((err) => {
            if (err) {
                console.error(`Error: ${err.message}`);
                req.flash(`error`, `Failed to remove rating: ${err.message}`);
            } else {
                req.flash(`success`, `Rating deleted`);
            }

            const route = _buildRedirectRoute(restaurant, menuItem);
            res.redirect(route);
        });
    } else {
        req.flash(`error`, `Unknown error deleting rating`);
        res.redirect(`/restaurants`);
    }
});

module.exports = router;
