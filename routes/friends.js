const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');
const { getRatingInfo } = require('../utils/misc');

// 'index' route
router.get('/', isLoggedIn, (req, res) => {
    res.redirect(`/users/${res.locals.user._id}`);
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
            const restaurantRatings = {
                path: 'ratings',
                match: {
                    user: req.params.friendID
                }
            };
            const menuItemRatings = {
                path: 'menuItems',
                populate: {
                    path: 'ratings',
                    match: {
                        user: req.params.friendID
                    }
                }
            };
            Restaurant.find({}).populate(restaurantRatings).populate(menuItemRatings).exec((err, restaurants) => {
                if (err) {
                    console.error(`Error: ${err.message}`);
                    res.redirect(`/users/${res.locals.user._id}/friends`);
                } else {
                    // pull all the ratings from restaurants and menu items for this friend
                    // we can't just pull the ratings directly because they don't have a link back to what they are rating
                    // and we need that so we can direct link to it
                    let recent = [];
                    restaurants.forEach((restaurant) => {
                        restaurant.ratings.forEach((ratingData) => {
                            recent.push({
                                ratingData,
                                restaurant,
                            });
                        });

                        restaurant.menuItems.forEach((menuItem) => {
                            menuItem.ratings.forEach((ratingData) => {
                                recent.push({
                                    ratingData,
                                    restaurant,
                                    menuItem,
                                });
                            });
                        });
                    });

                    // show most recent first
                    recent.sort((a, b) => {
                        return (a.ratingData.createdAt < b.ratingData.createdAt);
                    });

                    // show them a couple at a time
                    const pageSize = (req.query.pageSize || 5);
                    const page = (req.query.p || 0);
                    const start = page * pageSize;
                    const end = start + pageSize;
                    const urlBase = `/users/${res.locals.user._id}/friends/${req.params.friendID}?p=`;
                    const prevPage = (page > 0 ? urlBase + (Number(page) - 1) : undefined);
                    const nextPage = (end < recent.length ? urlBase + (Number(page) + 1) : undefined);
                    recent = recent.slice(start, end);

                    const friendName = friend.getDisplayName();
                    res.render('friends/show', { friendName, recent, prevPage, nextPage, getRatingInfo });
                }
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
