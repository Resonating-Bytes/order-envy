const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const Friends = require('../models/friends');
const MenuItem = require('../models/menuItem');
const Rating = require('../models/rating');
const Recommendation = require('../models/recommendation');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');
const { flash, FlashType, getActiveFriendRequestsQuery, getRatingInfo, generateToken, sendEmail, TokenType } = require('../utils/misc');

// 'index' route
router.get('/', isLoggedIn, (req, res) => {
    Friends.find(getActiveFriendRequestsQuery(res.locals.user.username)).populate('source').exec((err, friendRequests) => {
        if (err) {
            return res.redirect('back');
        }

        return res.render('friends/index', { baseURL: req.headers.origin, friendRequests });
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
            flash(req, res, FlashType.ERROR, `Error adding friend: ${err.message}`);
            return res.redirect('back');
        } else if (foundUsers.length === 1) {
            const foundUser = foundUsers[0];
            const token = generateToken();
            const tokenExpire = new Date();

            // check if there are any pending friend requests for this pair
            const friendQuery = {"$and": [{source: res.locals.user._id}, {request: foundUser.username}]};
            // and for any expired requests for any users while we are at it
            const dateQuery = {tokenExpire: {"$lt": tokenExpire}};

            // now that the date query is set, extend out the expire token for this operation
            tokenExpire.setTime(tokenExpire.getTime() + 7 * 24 * 60 * 60 * 1000);

            Friends.find({"$or": [friendQuery, dateQuery]}, (err, oldFriends) => {
                if (err) {
                    console.error(`Error deleting old friend entries: ${err.message}`);
                } else {
                    // remove found records
                    oldFriends.forEach((friend) => {
                        friend.remove();
                    });
                }

                // then create the new friend request
                const friend = {
                    source: res.locals.user._id,
                    request: foundUser.username,
                    token,
                    tokenExpire,
                    tokenType: TokenType.CONFIRM_FRIEND,
                };
                Friends.create(friend, (err, newFriend) => {
                    if (err || !newFriend) {
                        flash(req, res, FlashType.ERROR, `Error adding friend: ${err.message}`);
                        return res.redirect('back');
                    }

                    const subjectMsg = 'Confirm your Order Envy friend request';
                    const htmlMsg = '<h1>You have a secret (food) admirer</h1>' +
                        '<p>Ok, maybe not exactly, but ' + res.locals.user.getFullName() + ' would like to be your friend on Order Envy!</p>' +
                        '<p>Use <a href="' + req.headers.origin + '/users/' + res.locals.user._id + '/friends/confirm/' + token + '">this link</a> ' +
                        'to confirm your friend request and help each other to enjoy your next meal more.</p>' +
                        '<p>NOTE: the request will expire in one week</p>';
                    sendEmail(foundUser.username, subjectMsg, htmlMsg, (error, info) => {
                        if (error || info.rejected.length) {
                            flash(req, res, FlashType.ERROR, `Error: Failed to invite friend: ` + (error ? error : "unknown error"));
                        } else {
                            flash(req, res, FlashType.SUCCESS, `Request sent!`);
                        }
                        return res.redirect('back');
                    });
                });
            });
        } else if (foundUsers.length === 0) {
            flash(req, res, FlashType.WARNING, 
                `<form action="/users/${res.locals.user._id}/friends/invite" method="post">` +
                    `Failed to find a user with those details, would you like to ` +
                    `<input class="form-control" type="text" name="friendEmail" value="${req.body.friend.email}" hidden>` +
                    `<button class="btn btn-outline btn-outline-primary">invite</button> them?`+
                `</form>`
            );
            return res.redirect('back');
        } else {
            flash(req, res, FlashType.ERROR, `Found more than one user with those details, please be more specific`);
            return res.redirect(`/users/${res.locals.user._id}`);
        }
    });
});

// 'invite' route
router.post('/invite', isLoggedIn, (req, res) => {
    const friendEmail = req.body.friendEmail;
    if (!friendEmail || friendEmail === '') {
        flash(req, res, FlashType.ERROR, `Invalid email, failed to invite them`);
        return res.redirect(`/users/${res.locals.user._id}/friends/new`);
    } else {
        const token = generateToken();
        const tokenExpire = new Date();
        tokenExpire.setTime(tokenExpire.getTime() + 7 * 24 * 60 * 60 * 1000);

        const friend = {
            source: res.locals.user._id,
            request: friendEmail,
            token,
            tokenExpire,
            tokenType: TokenType.INVITE_FRIEND,
        };
        Friends.create(friend, (err, newFriend) => {
            if (err || !newFriend) {
                flash(req, res, FlashType.ERROR, `Error adding friend: ${err.message}`);
                return res.redirect('back');
            }

            const subjectMsg = 'You have a friend request on OrderEnvy!';
            const inviteAddr = `${req.headers.origin}/register?from=${encodeURIComponent(res.locals.user._id)}` +
                `&token=${encodeURIComponent(token)}&usernamePlaceholder=${encodeURIComponent(friendEmail)}`;
            const htmlMsg = `<h1>How does it feel to be popular?</h1>` +
                `<p>${res.locals.user.getFullName()} wants to be your friend on Order Envy!</p>` +
                `<a href="${inviteAddr}">Sign up</a> to add them as your friend and ` +
                `help each other avoid falling prey to missed meal opportunities.`;
            sendEmail(friendEmail, subjectMsg, htmlMsg, (error, info) => {
                if (error || info.rejected.length) {
                    flash(req, res, FlashType.ERROR, `Error: Failed to invite friend: ` + (error ? error : "unknown error"));
                } else {
                    flash(req, res, FlashType.SUCCESS, `Invite sent!`);
                }

                return res.redirect(`/users/${res.locals.user._id}/friends/new`);
            });
        });
    }
});

function recipientMatchesRequest(user, friendRequest) {
    if (!user || !friendRequest) return false;
    const recipient = friendRequest.request;
    return recipient === user.username || recipient === user.email;
}

// 'confirm' route
router.get('/confirm/:token', isLoggedIn, (req, res) => {
    const token = req.params.token;
    Friends.findOne({ token, tokenType: { "$in": [TokenType.CONFIRM_FRIEND, TokenType.INVITE_FRIEND] } }, (err, friendRequest) => {
        const localUserID = res.locals.user._id;
        if (err || !friendRequest) {
            flash(req, res, FlashType.ERROR, `Error confirming friend: ${err ? err.message : 'Request not found'}`);
            return res.redirect(`/users/${res.locals.user._id}/friends`);
        } else if (!recipientMatchesRequest(res.locals.user, friendRequest)) {
            flash(req, res, FlashType.ERROR, `This invite isn't for you!`);
            return res.redirect(`/users/${res.locals.user._id}/friends`);
        } else {
            User.findById(friendRequest.source, (err, foundUser) => {
                if (err) {
                    flash(req, res, FlashType.ERROR, `Error: Failed to find user: ${err.message}`);
                    return res.redirect(`/users/${res.locals.user._id}/friends`);
                }

                if (res.locals.user.friends.addToSet(friendRequest.source).length) {
                    res.locals.user.save();
                }

                // add the current user to the friend's list as well
                if (foundUser.friends.addToSet(localUserID).length) {
                    foundUser.save();
                }

                // delete the pending request
                friendRequest.remove();

                const subjectMsg = 'You have a new friend!';
                const htmlMsg = '<h1>They like you... they REALLY like you!</h1>' +
                    '<p>' + res.locals.user.getFullName() + ' confirmed your friend request on Order Envy!</p>' +
                    '<p>Now go and help each other enjoy your meals more and regret less</p>' +
                    '<a href="' + req.headers.origin + '">OrderEnvy</a>';
                sendEmail(foundUser.username, subjectMsg, htmlMsg, (error, info) => {
                    if (error || info.rejected.length) {
                        flash(req, res, FlashType.ERROR, `Error: Failed to confirm friend: ` + (error ? error : "unknown error"));
                        return res.redirect(`/users/${res.locals.user._id}/friends`);
                    }

                    flash(req, res, FlashType.SUCCESS, `Successfully added friend!`);
                    return res.redirect(`/users/${res.locals.user._id}/friends`);
                });
            });
        }
    });
});

// 'decline' route
router.delete('/decline/:token', isLoggedIn, (req, res) => {
    const token = req.params.token;
    Friends.findOne({ token, tokenType: { "$in": [TokenType.CONFIRM_FRIEND, TokenType.INVITE_FRIEND] } }, (err, friendRequest) => {
        if (err || !friendRequest || !recipientMatchesRequest(res.locals.user, friendRequest)) {
            flash(req, res, FlashType.ERROR, `Failed to find a user with those details, please try again`);
        } else {
            friendRequest.remove();
            flash(req, res, FlashType.SUCCESS, `Request removed`);
        }
        res.redirect('back');
    });
});

// 'show' route
router.get('/:friendID', isLoggedIn, (req, res) => {
    User.findById(req.params.friendID, (err, friend) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error showing friend: ${err.message}`);
            res.redirect(`/users/${res.locals.user._id}/friends`);
        } else {
            // grab the slice of ratings associated with this user for the page being displayed
            const pageSize = (req.query.pageSize || 5);
            const page = (req.query.p || 0);
            const start = page * pageSize;
            Rating.find({user: req.params.friendID}).sort({ createdAt: -1 }).skip(start).limit(pageSize).exec((err, ratingObjs) => {
                if (err) {
                    flash(req, res, FlashType.ERROR, `Error getting ratings for friend: ${err.message}`);
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
                        flash(req, res, FlashType.ERROR, `Error getting menu items for friend: ${err.message}`);
                        return res.redirect(`/users/${res.locals.user._id}/friends`);
                    }

                    // track the menu item IDs involved so we can get the restaurants they are owned by next
                    let menuItemIds = [];
                    menuItems.forEach((menuItem) => {
                        menuItemIds.push(menuItem._id);
                        menuItem.ratings.forEach((ratingId) => {
                            if (ratingId in recentLookup) {
                                const ratingIdx = recentLookup[ratingId];
                                recent[ratingIdx].menuItem = menuItem;
                            }
                        });
                    });

                    // grab restaurants that have ratings or menu items with ratings related to the current query
                    const menuItemsQuery = {
                        menuItems: {
                            "$in": menuItemIds
                        }
                    };
                    Restaurant.find({"$or": [ratingQuery, menuItemsQuery]}).populate('menuItems').exec((err, restaurants) => {
                        if (err) {
                            flash(req, res, FlashType.ERROR, `Error getting restaurants for friend: ${err.message}`);
                            return res.redirect(`/users/${res.locals.user._id}/friends`);
                        }

                        const processRatings = (ratings, restaurant) => {
                            let foundRating = false;
                            for (let i = 0; i < ratings.length; i++) {
                                const ratingId = ratings[i];
                                if (ratingId in recentLookup) {
                                    const ratingIdx = recentLookup[ratingId];
                                    recent[ratingIdx].restaurant = restaurant;
                                    foundRating = true;
                                }
                            }

                            return foundRating;
                        };

                        let restaurantIds = new Set();
                        restaurants.forEach((restaurant) => {
                            if (processRatings(restaurant.ratings, restaurant)) {
                                restaurantIds.add(restaurant._id);
                            }

                            restaurant.menuItems.forEach((menuItem) => {
                                processRatings(menuItem.ratings, restaurant);
                            });
                        });

                        // grab the total count of ratings by this user
                        // used to determine what the last page is
                        Rating.find({user: req.params.friendID}).count((err, count) => {
                            if (err) {
                                flash(req, res, FlashType.ERROR, `Error getting rating count for friend: ${err.message}`);
                                return res.redirect(`/users/${res.locals.user._id}/friends`);
                            }

                            // look for recs for the active user that relate to the restaurants and menu items being displayed
                            const recQuery = {
                                for: res.locals.user,
                                "$or": [
                                    { menuItem: menuItemIds },
                                    {
                                        "$and": [
                                            { restaurant: restaurantIds },
                                            { menuItem: undefined },
                                        ]
                                    },
                                ]
                            };
                            Recommendation.find(recQuery, (err, recObjs) => {
                                if (err) {
                                    recObjs= [];
                                }

                                // convert from the full DB object to just the rec IDs
                                let recommendations = [];
                                recObjs.forEach((rec) => {
                                    recommendations.push((rec.menuItem ? rec.menuItem._id : rec.restaurant._id).valueOf());
                                });

                                // remove any entries that didn't get a restaurant set
                                recent = recent.filter((r) => { return !!r.restaurant; });

                                const end = start + pageSize;
                                const urlBase = `/users/${res.locals.user._id}/friends/${req.params.friendID}?p=`;
                                const prevPage = (page > 0 ? urlBase + (Number(page) - 1) : undefined);
                                const nextPage = (end < count ? urlBase + (Number(page) + 1) : undefined);
                                const friendName = friend.getFullName();
                                res.render('friends/show', { friendName, recent, recommendations, prevPage, nextPage, getRatingInfo });
                            });
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
            flash(req, res, FlashType.ERROR, `Failed to find a user with those details, please try again`);
        } else {
            // remove the specified ID from the current user friend list
            const { user } = res.locals;
            user.friends = user.friends.filter((friend) => { return !friend._id.equals(foundUser._id); });
            user.save();

            // now remove this user from the friend
            foundUser.friends = foundUser.friends.filter((friend) => { return !friend._id.equals(user._id); });
            foundUser.save();

            flash(req, res, FlashType.SUCCESS, `Friend removed!`);
        }

        res.redirect('back');
    });
});

module.exports = router;
