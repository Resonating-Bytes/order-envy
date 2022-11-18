const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const MenuItem = require('../models/menuItem');
const Rating = require('../models/rating');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');
const { getRatingInfo } = require('../utils/misc');

// 'index' route
router.get('/', isLoggedIn, (req, res) => {
    if (req.user._id.equals(req.params.userID)) {
        return res.render('friends/index');
    }

    res.redirect('back');
});

// 'new' route
router.get('/new', isLoggedIn, (req, res) => {
    res.render('friends/new');
});

function clean(obj) {
    for (var propName in obj) { 
        if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
            delete obj[propName];
        }
    }

    return obj;
}

// 'create' route
router.post('/', isLoggedIn, (req, res) => {
    User.find(clean(req.body.friend), (err, foundUsers) => {
        if (err) {
            console.error(`Error: ${err.message}`);
            req.flash(`error`, `Error adding friend: ${err.message}`);
        } else if (foundUsers.length === 1) {
            const foundUser = foundUsers[0];
            if (res.locals.user.friends.addToSet(foundUser).length) {
                res.locals.user.save();
            }

            // add the current user to the friend's list as well
            if (foundUser.friends.addToSet(res.locals.user)) {
                foundUser.save();
            }

            console.log('Added: ' + foundUser);
            req.flash(`success`, `Successfully added friend!`);
        } else if (foundUsers.length === 0) {
            req.flash(`error`, `Failed to find a user with those details, please try again`);
            return res.redirect('back');
        } else {
            req.flash(`error`, `Found more than one user with those details, please be more specific`);
        }

        // succeed or fail, send them back to the friend index page
        res.redirect(`/users/${res.locals.user._id}`);
    });
});

// 'show' route
router.get('/:friendID', isLoggedIn, (req, res) => {
    User.findById(req.params.friendID, (err, friend) => {
        if (err) {
            console.error(`Error: ${err.message}`);
            res.redirect(`/users/${res.locals.user._id}/friends`);
        } else {
            // grab the slice of ratings associated with this user for the page being displayed
            const pageSize = (req.query.pageSize || 5);
            const page = (req.query.p || 0);
            const start = page * pageSize;
            Rating.find({user: req.params.friendID}).sort({ createdAt: -1 }).skip(start).limit(pageSize).exec((err, ratingObjs) => {
                if (err) {
                    console.error(`Error: ${err.message}`);
                    return res.redirect(`/users/${res.locals.user._id}/friends`);
                }

                // build a lookup table to quickly go from rating ID to menu/restaurant data
                let recentLookup = {};
                let recent = [];
                ratingObjs.forEach((r) => {
                    recentLookup[r._id] = recent.length;
                    recent.push({
                        ratingData: r, restaurant: undefined, menuItem: undefined
                    });
                });

                // find all menu items that are tied to the selected ratings and fill in their data in the recent list
                const ratingQuery = {
                    ratings: {
                        "$in": Object.keys(recentLookup)
                    }
                };
                MenuItem.find(ratingQuery).exec((err, menuItems) => {
                    if (err) {
                        console.error(`Error: ${err.message}`);
                        return res.redirect(`/users/${res.locals.user._id}/friends`);
                    }

                    // track the menu item IDs involved so we can get the restaurants they are owned by next
                    let menuItemIds = [];
                    let menuItemLookup = {}
                    menuItems.forEach((menuItem) => {
                        menuItemIds.push(menuItem._id);
                        menuItem.ratings.forEach((ratingId) => {
                            if (ratingId in recentLookup) {
                                recent[recentLookup[ratingId]].menuItem = menuItem;
                                menuItemLookup[menuItem._id] = ratingId;
                            }
                        });
                    });

                    // grab restaurants that have ratings or menu items with ratings related to the current query
                    const menuItemsQuery = {
                        menuItems: {
                            "$in": menuItemIds
                        }
                    };
                    Restaurant.find({"$or": [ratingQuery, menuItemsQuery]}).exec((err, restaurants) => {
                        if (err) {
                            console.error(`Error: ${err.message}`);
                            return res.redirect(`/users/${res.locals.user._id}/friends`);
                        }

                        restaurants.forEach((restaurant) => {
                            restaurant.ratings.forEach((ratingId) => {
                                if (ratingId in recentLookup) {
                                    const ratingIdx = recentLookup[ratingId];
                                    recent[ratingIdx].restaurant = restaurant;
                                }
                            });

                            restaurant.menuItems.forEach((menuItemId) => {
                                const ratingId = menuItemLookup[menuItemId];
                                if (ratingId in recentLookup) {
                                    const ratingIdx = recentLookup[ratingId];
                                    recent[ratingIdx].restaurant = restaurant;
                                }
                            });
                        });

                        // grab the total count of ratings by this user
                        // used to determine what the last page is
                        Rating.find({user: req.params.friendID}).count((err, count) => {
                            if (err) {
                                console.error(`Error: ${err.message}`);
                                return res.redirect(`/users/${res.locals.user._id}/friends`);
                            }

                            const end = start + pageSize;
                            const urlBase = `/users/${res.locals.user._id}/friends/${req.params.friendID}?p=`;
                            const prevPage = (page > 0 ? urlBase + (Number(page) - 1) : undefined);
                            const nextPage = (end < count ? urlBase + (Number(page) + 1) : undefined);
                            const friendName = friend.getDisplayName();
                            res.render('friends/show', { friendName, recent, prevPage, nextPage, getRatingInfo });
                        });
                    });
                });
            });
        }
    });
});

// 'edit' route
router.get('/:friendID/edit', isLoggedIn, (req, res) => {
    // doesn't make sense to edit your friends at this point
    res.redirect(`/users/${res.locals.user._id}`);
});

// 'update' route
router.put('/:friendID', isLoggedIn, (req, res) => {
    // doesn't make sense to edit your friends at this point
    res.redirect(`/users/${res.locals.user._id}`);
});

// 'delete' route
router.delete('/:friendID', isLoggedIn, (req, res) => {
    const { user } = res.locals;
    user.friends = user.friends.filter((friend) => { return !friend._id.equals(req.params.friendID); });
    user.save();
    res.redirect('back');
});

module.exports = router;
