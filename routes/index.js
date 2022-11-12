const express = require('express');
const router = express.Router({mergeParams: true});
const passport = require('passport');

const Recommendation = require('../models/recommendation');
const User = require('../models/user');

// index route
router.get('/', (req, res) => {
    // first check if there is a stored URL to redirect to
    if (req.cookies.loginRedirect) {
        const redirectUrl = req.cookies.loginRedirect;
        res.cookie('loginRedirect', undefined, {maxAge: 0, httpOnly: true});
        return res.redirect(redirectUrl);
    } else if (!req.user) {
        return res.redirect('/restaurants');
    }

    Recommendation.find({for: (req.user || {})._id}).populate('restaurant').populate('menuItem').sort('-updatedAt').exec((err, recommendations) => {
        if (err) {
            console.error(err);
            req.flash(`error`, `Failed to grab recommendations: ${err.message}`);
        }
        const numRecs = req.query.numRecs || 5;
        res.render('home', { recommendations: recommendations.slice(0, numRecs) });
    });
});

// show signup form
router.get('/register', (req, res) => {
    res.render('register');
});

// handle signing up a new user
router.post('/register', (req, res) => {
    const user = {
        username: req.body.username, 
        email: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        friends: [],
    };
    User.register(new User(user), req.body.password, (err, newUser) => {
        if (err) {
            console.error(err);
            req.flash(`error`, `Failed to register user: ${err.message}`);
            return res.redirect('/register');
        }

        // new user has been created
        passport.authenticate('local', {
            successRedirect: '/restaurants',
            failureRedirect: '/register',
        })(req, res, () => {});
    });
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
}), (req, res) => {
    // nothing to actually do, user will be redirected on success or failure
});

function logoutCB(error)
{
    console.error(error);
}

router.get('/logout', (req, res) => {
    // this will trash the current session
    req.logout({keepSessionInfo: false}, logoutCB);

    req.flash(`success`, `Logged you out!`);

    // send them back to the home page
    res.redirect('/restaurants');
});

module.exports = router;