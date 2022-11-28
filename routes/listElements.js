const express = require('express');
const router = express.Router({mergeParams: true});

const { userOwnsList } = require('../middleware/list');
const { flash, FlashType } = require('../utils/misc');
const Restaurant = require('../models/restaurant');

// 'add' route
router.get('/addRestaurant/:restaurantID', userOwnsList, (req, res) => {
    const { list } = res.locals;
    if (list) {
        Restaurant.findById(req.params.restaurantID, (err, foundRestaurant) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `Error rendering lists: ${err.message}`);
            } else if (list.restaurants.addToSet(foundRestaurant).length) {
                const idx = list.restaurants.indexOf(foundRestaurant);
                // successfully added to the list
                list.save();
                flash(req, res, FlashType.SUCCESS, `Saved to list!`);
            } else {
                // tried to add something already in this list
                flash(req, res, FlashType.ERROR, `Already in ${list.name}`);
            }

            // always send them back where they came from
            res.redirect('back');
        });
    }
});

// 'remove' route
router.delete('/removeRestaurant/:restaurantID', userOwnsList, (req, res) => {
    const { list } = res.locals;
    if (list) {
        const oldLen = list.restaurants.length;
        list.restaurants = list.restaurants.filter((e) => {
            return !e.equals(req.params.restaurantID);
        });

        if (oldLen !== list.restaurants.length) {
            list.save();
            flash(req, res, FlashType.SUCCESS, `Removed from the list!`);
        } else {
            flash(req, res, FlashType.ERROR, `Failed to find restaurant`);
        }

        res.redirect('back');
    }
});

module.exports = router;
