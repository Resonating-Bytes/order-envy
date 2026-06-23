const Restaurant = require('../models/restaurant');
const isLoggedIn = require('./isLoggedIn');
const { flash, FlashType } = require('../utils/misc');
const { userCanEditRestaurant, userCanDeleteRestaurant, userCanManageRestaurant } = require('../lib/restaurantPermissions');

function denyEdit(req, res) {
    flash(req, res, FlashType.ERROR, `You don't have permission for that`);
    delete res.locals.restaurant;
    res.redirect('back');
}

function denyManage(req, res) {
    flash(req, res, FlashType.ERROR, `Only the restaurant owner can manage editors`);
    delete res.locals.restaurant;
    res.redirect('back');
}

function cacheRestaurantWithPeople(req, res, next) {
    Restaurant.findById(req.params.restaurantID)
        .populate('owner', 'username firstName lastName')
        .populate('editors', 'username firstName lastName')
        .exec((err, restaurant) => {
            if (err || !restaurant) {
                flash(req, res, FlashType.ERROR, `Restaurant not found`);
                return res.redirect('/restaurants');
            }
            res.locals.restaurant = restaurant;
            return next();
        });
}

module.exports = {
    /**
     * Passes if the restaurant referenced in req is found
     */
    cacheRestaurant: (req, res, next) => {
        Restaurant.findById(req.params.restaurantID, (err, restaurant) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `Restaurant not found: ${err.message}`);
                return res.redirect(`back`);
            }

            // pass the restaurant through to the next route
            res.locals.restaurant = restaurant;
            return next();
        });
    },

    /**
     * Passes if there is a valid user who may edit the restaurant.
     */
    canEditRestaurant: (req, res, next) => {
        isLoggedIn(req, res, () => {
            module.exports.cacheRestaurant(req, res, () => {
                const { restaurant, user } = res.locals;
                if (restaurant && userCanEditRestaurant(user, restaurant)) {
                    return next();
                }

                denyEdit(req, res);
            });
        });
    },

    /**
     * Passes if there is a valid user who may delete the restaurant.
     */
    canDeleteRestaurant: (req, res, next) => {
        isLoggedIn(req, res, () => {
            module.exports.cacheRestaurant(req, res, () => {
                const { restaurant, user } = res.locals;
                if (restaurant && userCanDeleteRestaurant(user, restaurant)) {
                    return next();
                }

                denyEdit(req, res);
            });
        });
    },

    /**
     * Passes if the user is the owner of a claimed restaurant (editor management).
     */
    canManageOwnedRestaurant: (req, res, next) => {
        isLoggedIn(req, res, () => {
            cacheRestaurantWithPeople(req, res, () => {
                const { restaurant, user } = res.locals;
                if (restaurant && restaurant.owner && userCanManageRestaurant(user, restaurant)) {
                    return next();
                }

                denyManage(req, res);
            });
        });
    },
};
