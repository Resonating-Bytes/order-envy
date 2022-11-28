const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const Friends = require('../models/friends');
const User = require('../models/user');
const { flash, FlashType } = require('../utils/misc');

// 'index' route
// no reason to view all users on their own, redirect to home page
router.get('/', (req, res) => {
    res.redirect('/');
});

// 'new' route
router.get('/new', (req, res) => {
    res.redirect('/register');
});

// 'create' route
router.post('/', (req, res) => {
    flash(req, res, FlashType.ERROR, `Error, use /register post route instead`);
    return res.redirect('back');
});

// 'show' route
router.get('/:userID', isLoggedIn, (req, res) => {
    if (req.user._id.equals(req.params.userID)) {
        return res.render('users/show');
    }

    res.redirect('back');
});

// 'edit' route
router.get('/:userID/edit', isLoggedIn, (req, res) => {
    if (req.user._id.equals(req.params.userID)) {
        return res.render('users/edit');
    }

    res.redirect('back');
});

// 'update' route
router.put('/:userID', isLoggedIn, (req, res) => {
    if (req.user._id.equals(req.params.userID)) {
        const { user } = res.locals;
        req.body.email = req.body.username;
        Object.assign(user, req.body.user);
        delete user.password; // don't leave this laying around for security
        (req.body.user.password ? user.changePassword(req.body.oldPassword, req.body.user.password) : Promise.resolve()).then(() => {
            user.save();
            flash(req, res, FlashType.SUCCESS, `Updated user info`);
            return res.redirect(`/`);
        }).catch(err => {
            flash(req, res, FlashType.ERROR, `Failed to save user info, please check all fields and try again`);
            return res.redirect('back');
        });
    } else {
        flash(req, res, FlashType.ERROR, `Failed to update user info`);
        return res.redirect('back');
    }
});

// 'delete' route
router.delete('/:userID', isLoggedIn, (req, res) => {
    if (req.user._id.equals(req.params.userID)) {
        const deletedUserId = req.user._id;
        req.user.remove((err) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `Failed to remove user: ${err.message}`);
            } else {
                flash(req, res, FlashType.SUCCESS, `User deleted`);

                // clean the user ID from other user friend lists
                User.find({friends: deletedUserId}, (err, users) => {
                    if (!err && users) {
                        users.forEach((user) => {
                            user.friends = user.friends.filter((friend) => { return !friend._id.equals(deletedUserId); });
                            user.save();
                        });
                    }
                });

                // clean any pending friend requests as well
                Friends.find({"$or": [{source: deletedUserId}, {request: deletedUserId}]}, (err, friendRequests) => {
                    if (!err && friendRequests) {
                        friendRequests.forEach((request) => {
                            request.remove();
                        });
                    }
                });
            }

            return res.redirect(`/logout`);
        });
    }
});

module.exports = router;
