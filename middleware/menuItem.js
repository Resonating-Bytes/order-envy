const MenuItem = require('../models/menuItem');
const Restaurant = require('../models/restaurant');
const isLoggedIn = require('./isLoggedIn');
const { flash, FlashType } = require('../utils/misc');
const { userCanEditRestaurant } = require('../lib/restaurantPermissions');

function denyEdit(req, res) {
    flash(req, res, FlashType.ERROR, `You don't have permission for that`);
    delete res.locals.menuItem;
    res.redirect('back');
}

async function loadRestaurantForMenuItem(req) {
    const restaurantId = req.params.restaurantID;
    if (restaurantId) {
        return Restaurant.findById(restaurantId);
    }
    const menuItemId = req.params.menuItemID;
    if (!menuItemId) return null;
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return null;
    return Restaurant.findOne({ menuItems: menuItem._id });
}

module.exports = {
    /**
     * Passes if the menu item referenced in req is found
     */
    cacheMenuItem: (req, res, next) => {
        MenuItem.findById(req.params.menuItemID, (err, menuItem) => {
            if (err) {
                flash(req, res, FlashType.ERROR, ` not found: ${err.message}`);
                return res.redirect(`back`);
            }

            // pass the menu item through to the next route
            res.locals.menuItem = menuItem;
            return next();
        });
    },

    /**
     * Passes if there is a valid user who may edit menu items for this restaurant.
     */
    canEditMenuItem: (req, res, next) => {
        isLoggedIn(req, res, async () => {
            try {
                const restaurant = await loadRestaurantForMenuItem(req);
                if (!restaurant) {
                    flash(req, res, FlashType.ERROR, 'Restaurant not found');
                    return res.redirect('back');
                }
                res.locals.restaurant = restaurant;
                if (userCanEditRestaurant(res.locals.user, restaurant)) {
                    return next();
                }
                denyEdit(req, res);
            } catch (err) {
                flash(req, res, FlashType.ERROR, err.message);
                res.redirect('back');
            }
        });
    },
};
