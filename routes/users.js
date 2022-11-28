const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
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
        if (window.confirm(`This will permanently delete your account, are you sure?`)) {
            req.user.remove((err) => {
                if (err) {
                    console.error(`Error: ${err.message}`);
                    flash(req, res, FlashType.ERROR, `Failed to remove user: ${err.message}`);
                } else {
                    flash(req, res, FlashType.SUCCESS, `User deleted`);
                }
                return res.redirect(`/`);
            });
        } else {
            return res.redirect(`back`);
        }
    }
});

module.exports = router;
