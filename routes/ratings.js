const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { cacheRestaurant } = require('../middleware/restaurant');
const { cacheMenuItem } = require('../middleware/menuItem');
const { userOwnsRating } = require('../middleware/rating');
const { flash, FlashType, getRatingInfo } = require('../utils/misc');
const Rating = require('../models/rating');
const Recommendation = require('../models/recommendation');

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
    const ratingData = {
        rating: -1,
        comment: "",
    };
    res.render(`ratings/new`, { restaurantRoute, menuItemRoute, ratingData });
});

// 'create' route
router.post('/', isLoggedIn, cacheRestaurant, cacheMenuItem, (req, res) => {
    const newRating = {
        ...req.body.ratingData,
        user: res.locals.user,
    };

    Rating.create(newRating, (err, createdRating) => {
        const { restaurant, menuItem } = res.locals;
        if (err) {
            flash(req, res, FlashType.ERROR, `Error creating rating: ${err.message}`);
        } else {
            let subQuery = {}
            if (menuItem) {
                menuItem.ratings.push(createdRating);
                menuItem.save();

                // grab recs for the menu item or the restaurant it is at
                subQuery = { "$or": [
                    { menuItem: menuItem._id },
                    { restaurant: restaurant._id },
                ]};
            } else if (restaurant) {
                restaurant.ratings.push(createdRating);
                restaurant.save();

                // only grab recs for the restaurant itself
                subQuery = { restaurant: restaurant._id };
            } else {
                flash(req, res, FlashType.ERROR, `Unknown error creating rating`);
                return res.redirect('back');
            }

            // clear out any recommendations related to the rating
            let recQuery = {
                "$and": [
                    { for: res.locals.user._id },
                    subQuery
                ]
            };
            Recommendation.find(recQuery, (err, recommendations) => {
                const menuItemId = (menuItem ? menuItem._id : null);
                recommendations.forEach((recommendation) => {
                    if (!err && recommendation && (recommendation.menuItem == null || recommendation.menuItem.equals(menuItemId))) {
                        recommendation.remove();
                    }
                });
            });

            flash(req, res, FlashType.SUCCESS, `Successfully created rating!`);
            const route = _buildRedirectRoute(restaurant);
            return res.redirect(route);
        }
    });
});

// 'show' route
router.get('/:ratingID', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    const { ratingData, restaurant, menuItem } = res.locals;
    const restaurantRoute = (restaurant ? `/restaurants/${restaurant._id}` : ``);
    const menuItemRoute = (menuItem ? `/menuItems/${menuItem._id}` : ``);
    res.render('ratings/show', { ratingData, restaurant, restaurantRoute, menuItem, menuItemRoute, getRatingInfo });
});

// 'edit' route
router.get('/:ratingID/edit', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    const { restaurant, menuItem, ratingData } = res.locals;
    if (ratingData) {
        const restaurantRoute = (restaurant ? `/restaurants/${restaurant._id}` : ``);
        const menuItemRoute = (menuItem ? `/menuItems/${menuItem._id}` : ``);
        res.render(`ratings/edit`, { menuItemRoute, restaurantRoute, ratingData });
    } else {
        flash(req, res, FlashType.ERROR, `Unknown error editing rating`);
        return res.redirect(`/restaurants`);
    }
});

// 'update' route
router.put('/:ratingID', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    // since we already have the rating we can update it directly and save
    const { restaurant, menuItem, ratingData } = res.locals;
    if (ratingData) {
        Object.assign(ratingData, req.body.ratingData);
        ratingData.save();

        const route = _buildRedirectRoute(restaurant, menuItem);
        res.redirect(route + `/ratings/${ratingData._id}`);
    } else {
        flash(req, res, FlashType.ERROR, `Unknown error editing rating`);
        return res.redirect(`/restaurants`);
    }
});

// 'delete' route
router.delete('/:ratingID', userOwnsRating, cacheRestaurant, cacheMenuItem, (req, res) => {
    // since we already have the rating we can delete it directly
    const { menuItem, restaurant, ratingData } = res.locals;
    if (ratingData) {
        ratingData.remove((err) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `Failed to remove rating: ${err.message}`);
            } else {
                flash(req, res, FlashType.SUCCESS, `Rating deleted`);
            }

            const route = _buildRedirectRoute(restaurant, menuItem);
            return res.redirect(route);
        });
    } else {
        flash(req, res, FlashType.ERROR, `Unknown error deleting rating`);
        return res.redirect(`/restaurants`);
    }
});

module.exports = router;
