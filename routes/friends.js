const express = require('express');
const router = express.Router({mergeParams: true});
const nodemailer = require('nodemailer');

const isLoggedIn = require('../middleware/isLoggedIn');
const Friends = require('../models/friends');
const MenuItem = require('../models/menuItem');
const Rating = require('../models/rating');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');
const { getRatingInfo, generateToken, TokenType } = require('../utils/misc');

// 'index' route
router.get('/', isLoggedIn, (req, res) => {
    Friends.find({IDs: res.locals.user._id}).populate('IDs').exec((err, pendingFriends) => {
        if (err) {
            return res.redirect('back');
        }

        pendingFriends = pendingFriends.filter((value, idx, arr) => {
            return value.IDs[1].equals(res.locals.user._id);
        });

        return res.render('friends/index', { baseURL: req.headers.origin, pendingFriends });
    });
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
            return res.redirect('back');
        } else if (foundUsers.length === 1) {
            const foundUser = foundUsers[0];
            const token = generateToken();
            const tokenExpire = new Date();

            // check if there are any pending friend requests for this pair
            const friendQuery = {"$and": [{IDs: res.locals.user._id}, {IDs: foundUser._id}]};
            // and for any expired requests for any users while we are at it
            const dateQuery = {tokenExpire: {"$lt": tokenExpire}};

            // now that the date query is set, extend out the expire token for this operation
            tokenExpire.setTime(tokenExpire.getTime() + 7 * 24 * 60 * 60 * 1000);

            Friends.find({"$or": [friendQuery, dateQuery]}, (err, oldFriends) => {
                if (err) {
                    console.error(`Error deleting old friend entries: ${err.message}`);
                }

                // remove found records
                oldFriends.forEach((friend) => {
                    friend.remove();
                });

                // then create the new friend request
                const friends = {
                    IDs: [res.locals.user._id, foundUser._id],
                    token,
                    tokenExpire,
                    tokenType: TokenType.CONFIRM_FRIEND,
                };
                Friends.create(friends, (err, newFriend) => {
                    if (err) {
                        console.error(`Error: ${err.message}`);
                        req.flash(`error`, `Error adding friend: ${err.message}`);
                        return res.redirect('back');
                    }

                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL,
                            pass: process.env.EMAIL_PASSWORD,
                        }
                    });

                    const mailOptions = {
                        from: 'no-reply@orderenvy.com',
                        replyTo: 'no-reply@orderenvy.com',
                        to: foundUser.username,
                        subject: 'Confirm your Order Envy friend request',
                        html: '<h1>You have a secret admirer</h1>' +
                            '<p>Ok, maybe not exactly, but ' + res.locals.user.getFullName() + ' would like to be your friend on Order Envy!</p>' +
                            '<p>Use <a href="' + req.headers.origin + '/users/' + res.locals.user._id + '/friends/confirm/' + token + '">this link</a> ' +
                            'to confirm your friend request and help each other to enjoy your next meal more.</p>' +
                            '<p>NOTE: the request will expire in one week</p>'
                    };
                
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            req.flash(`error`, `Error: Failed to invite friend: ` + error);
                        } else {
                            req.flash(`success`, `Request sent!`);
                        }
                        return res.redirect('back');
                    });
                });
            });
        } else if (foundUsers.length === 0) {
            req.flash(`error`, `Failed to find a user with those details, please try again`);
            return res.redirect('back');
        } else {
            req.flash(`error`, `Found more than one user with those details, please be more specific`);
            return res.redirect(`/users/${res.locals.user._id}`);
        }
    });
});

// 'confirm' route
router.get('/confirm/:token', isLoggedIn, (req, res) => {
    const token = req.params.token;
    Friends.findOne({ token, tokenType: TokenType.CONFIRM_FRIEND }, (err, friendRequest) => {
        const localUserID = res.locals.user._id;
        if (err) {
            console.error(`Error: ${err.message}`);
            req.flash(`error`, `Error confirming friend: ${err.message}`);
            return res.redirect(`/login`);
        } else if (!(localUserID.equals(friendRequest.IDs[0]) || localUserID.equals(friendRequest.IDs[1]))) {
            req.flash(`error`, `This invite isn't for you!`);
            return res.redirect(`/login`);
        } else if (friendRequest) {
            const otherIdx = (localUserID.equals(friendRequest.IDs[0]) ? 1 : 0);
            const otherFriendID = friendRequest.IDs[otherIdx];
            User.findById(otherFriendID, (err, foundUser) => {
                if (err) {
                    console.error(`Error: Failed to find user`);
                    return res.redirect(`/users/${res.locals.user._id}/friends`);
                }

                if (res.locals.user.friends.addToSet(otherFriendID).length) {
                    res.locals.user.save();
                }

                // add the current user to the friend's list as well
                if (foundUser.friends.addToSet(localUserID).length) {
                    foundUser.save();
                }

                // delete the pending request
                friendRequest.remove();

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.EMAIL_PASSWORD,
                    }
                });

                const mailOptions = {
                    from: 'no-reply@orderenvy.com',
                    replyTo: 'no-reply@orderenvy.com',
                    to: foundUser.username,
                    subject: 'You have a new friend!',
                    html: '<h1>They like you... they REALLY like you!</h1>' +
                        '<p>' + res.locals.user.getFullName() + ' confirmed your friend request on Order Envy!</p>' +
                        '<p>Now go and help each other enjoy your meals more and regret less</p>' +
                        '<a href="' + req.headers.origin + '">OrderEnvy</a>'
                };
            
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        req.flash(`error`, `Error: Failed to confirm friend: ` + error);
                        return res.redirect(`/users/${res.locals.user._id}/friends`);
                    }
                });

                req.flash(`success`, `Successfully added friend!`);
                return res.redirect(`/users/${res.locals.user._id}/friends`);
            });
        } else {
            req.flash(`error`, `Failed to find a user with those details or invite expired, please try again`);
            return res.redirect('back');
        }
    });
});

// 'decline' route
router.delete('/decline/:token', isLoggedIn, (req, res) => {
    const token = req.params.token;
    Friends.findOne({ token, tokenType: TokenType.CONFIRM_FRIEND }, (err, friendRequest) => {
        res.redirect('back');
        if (err || !friendRequest || friendRequest.IDs.indexOf(res.locals.user._id) == -1) {
            req.flash(`error`, `Failed to find a user with those details, please try again`);
        } else {
            friendRequest.remove();
            req.flash(`success`, `Request removed`);
        }
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
                            const friendName = friend.getFullName();
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
    User.findById(req.params.friendID, (err, foundUser) => {
        if (err || !foundUser) {
            req.flash(`error`, `Failed to find a user with those details, please try again`);
        } else {
            // remove the specified ID from the current user friend list
            const { user } = res.locals;
            user.friends = user.friends.filter((friend) => { return !friend._id.equals(foundUser._id); });
            user.save();

            // now remove this user from the friend
            foundUser.friends = foundUser.friends.filter((friend) => { return !friend._id.equals(user._id); });
            foundUser.save();
        }

        res.redirect('back');
        req.flash(`success`, `Friend removed!`);
    });
});

module.exports = router;
