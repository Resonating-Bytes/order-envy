const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { cacheRestaurant } = require('../middleware/restaurant');
const { canEditMenuItem } = require('../middleware/menuItem');
const { filterUserOwned, flash, FlashType, getRatingInfo } = require('../utils/misc');

const MenuItem = require('../models/menuItem');
const Note = require('../models/note');

// 'index' route
// no reason to view all menuItems on their own, redirect to restaurant index page
router.get('/', (req, res) => {
    res.redirect('/restaurants');
});

// 'new' route
router.get('/new', isLoggedIn, cacheRestaurant, (req, res) => {
    const { restaurant } = res.locals;
    if (restaurant) {
        res.render('menuItems/new', { MenuItem, restaurant });
    } else {
        res.redirect('back');
    }
});

// 'create' route
router.post('/', isLoggedIn, cacheRestaurant, (req, res) => {
    const { menuItem } = req.body;
    MenuItem.create(menuItem, (err, createdMenuItem) => {
        if (err) {
            console.error(`Error: ${err.message}`);
            flash(req, res, FlashType.ERROR, `Error creating menuItem: ${err.message}`);
            return res.redirect('back');
        } else {
            console.log('Created: ' + createdMenuItem);
            flash(req, res, FlashType.SUCCESS, `Successfully created menu item!`);
            const { restaurant } = res.locals;
            if (restaurant) {
                restaurant.menuItems.push(createdMenuItem);
                restaurant.save();
                return res.redirect(`/restaurants/${restaurant._id}/menuItems/${createdMenuItem._id}/ratings/new`);
            }
        }

        return res.redirect('/restaurants');
    });
});

// 'show' route
router.get('/:menuItemID', cacheRestaurant, (req, res) => {
    if (!req.user) {
        return res.redirect('/restaurants');
    }

    MenuItem.findById(req.params.menuItemID).populate({path: 'ratings', options: {sort: {'createdAt': -1}}}).exec((err, menuItem) => {
        if (err) {
            console.error(`Error: ${err.message}`);
            return res.redirect(`/restaurants`);
        } else {
            Note.findOne({ about: menuItem, user: res.locals.user }, (err, note) => {
                if (err) {
                    console.error(`Error fetching note: ${err.message}`);
                    return res.redirect(`/restaurants`);
                } else {
                    if (!('ratings' in res.locals)) {
                        res.locals.ratings = [];
                    }
                    res.render('menuItems/show', { menuItem, filterUserOwned, note, getRatingInfo });
                }
            });
        }
    });
});

// 'edit' route
router.get('/:menuItemID/edit', canEditMenuItem, cacheRestaurant, (req, res) => {
    const { menuItem, restaurant } = res.locals;
    if (menuItem) {
        res.render('menuItems/edit', { MenuItem, menuItem, restaurant });
    }
});

// 'update' route
router.put('/:menuItemID', canEditMenuItem, cacheRestaurant, (req, res) => {
    const { menuItem, restaurant } = res.locals;
    if (menuItem && restaurant) {
        Object.assign(menuItem, req.body.menuItem);
        menuItem.save();
        if (restaurant) {
            return res.redirect(`/restaurants/${restaurant._id}`);
        }
    }

    res.redirect(`/restaurants`);
});

// 'delete' route
router.delete('/:menuItemID', canEditMenuItem, cacheRestaurant, (req, res) => {
    const { menuItem } = res.locals;
    if (menuItem) {
        menuItem.remove((err) => {
            if (err) {
                console.error(`Error: ${err.message}`);
                flash(req, res, FlashType.ERROR, `Failed to remove menuItem: ${err.message}`);
            } else {
                flash(req, res, FlashType.SUCCESS, `Menu item deleted`);
            }

            const { restaurant } = res.locals;
            if (restaurant) {
                return res.redirect(`/restaurants/${restaurant._id}`);
            } else {
                return res.redirect(`/restaurants`);
            }
        });
    }
});

module.exports = router;
