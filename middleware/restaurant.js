const Restaurant = require('../models/restaurant');
const isLoggedIn = require('./isLoggedIn');
const { flash, FlashType } = require('../utils/misc');

module.exports = {
    /**
     * Passes if the restaurant referenced in req is found
     */
    cacheRestaurant: (req, res, next) => {
        Restaurant.findById(req.params.restaurantID, (err, restaurant) => {
            if (err) {
                console.error(`Error: ${err.message}`);
                flash(req, res, FlashType.ERROR, `Restaurant not found: ${err.message}`);
                return res.redirect(`back`);
            }

            // pass the restaurant through to the next route
            res.locals.restaurant = restaurant;
            return next();
        });
    },

    /**
     * Passes if there is a valid user,
     * and the restaurant referenced in req is found
     */
    canEditRestaurant: (req, res, next) => {
        isLoggedIn(req, res, () => {
            module.exports.cacheRestaurant(req, res, () => {
                const { restaurant } = res.locals;
                if (restaurant) {
                    return next();
                }

                flash(req, res, FlashType.ERROR, `You don't have permission for that`);

                // clear out the restaurant so it isn't used by accident
                delete res.locals.restaurant;

                // if they are logged in but anything else goes wrong,
                // just send them back where they came from
                res.redirect('back');
            });
        });
    },
}
