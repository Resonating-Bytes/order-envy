const express = require('express');
const router = express.Router({mergeParams: true});
const passport = require('passport');
const nodemailer = require('nodemailer');

const Recommendation = require('../models/recommendation');
const User = require('../models/user');

const {generateToken, TokenType} = require('../utils/misc');

// index route
router.get('/', (req, res) => {
    // if there is no user there is no reason to stay on this page
    if (!req.user) {
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
    // sanity check, also done as part of form validation on the page
    if (req.body.password != req.body.confirmPassword) {
        req.flash(`error`, `Error: Passwords need to match`);
        return res.redirect('/register');
    }

    const token = generateToken();
    const tokenExpire = new Date();
    tokenExpire.setTime(tokenExpire.getTime() + 60 * 60 * 1000);;
    const user = {
        username: req.body.username,
        email: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        friends: [],
        token,
        tokenExpire,
        tokenType: TokenType.NEW_ACCOUNT,
    };
    User.register(new User(user), req.body.password, (err, newUser) => {
        if (err) {
            console.error(err);
            req.flash(`error`, `Failed to register user: ${err.message}`);
            return res.redirect('/register');
        }

        // new user has been created
        passport.authenticate('local', {
            failureRedirect: '/register',
        })(req, res, () => {
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
                to: req.body.username,
                subject: 'Confirm Order Envy account',
                html: '<h1>Welcome to Order Envy</h1>' +
                    '<p>Use <a href="' + req.headers.origin + '/register/' + token + '">this link</a> to confirm your account</p>' +
                    '<p>NOTE: the password will expire in one hour</p>'
            };
        
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    // remove the user entry since it wasn't set up properly
                    req.user.remove();
                    req.flash(`error`, `Error: Failed to send email: ` + error);
                    return res.redirect('/register');
                } else {
                    req.logout({keepSessionInfo: false}, (err) => {
                        if (err) {
                            console.log(`Error while logging out: ${err}`);
                        }
                        return res.render('registerSent');
                    });
                }
            });
        });
    });
});

router.get('/register/:token', (req, res) => {
    const token = req.params.token;
    User.findOne({ token, tokenType: TokenType.NEW_ACCOUNT }, (err, user) => {
        const tokenExpire = (user && user.tokenExpire ? user.tokenExpire.getTime() : 0);
        if (err || tokenExpire < Date.now()) {
            if (user) {
                user.remove();
            }
            req.flash(`error`, `Error: Failed to validate account, please try again`);
            return res.redirect('/register');
        } else {
            // clear the token so the user isn't deleted on accident later
            user.token = undefined;
            user.tokenExpire = undefined;
            user.tokenType = undefined;
            user.save();
            req.flash(`info`, `Account validated!`);
            return res.redirect('/login');
        }
    });
});

router.get('/login', (req, res) => {
    if (req.user) {
        return res.redirect('/restaurants');
    }

    res.render('login');
});

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
}), (req, res) => {
    if (req.user.tokenType == TokenType.NEW_ACCOUNT) {
        if (req.user.tokenExpire.getTime() < Date.now()) {
            req.user.remove();
            req.flash(`error`, `Error: Account registration token expired, please register again`);
            return res.redirect('/register');
        } else {
            req.logout({keepSessionInfo: false}, (err) => {
                if (err) {
                    console.log(`Error while logging out: ${err}`);
                }
                req.flash(`error`, `Error: Account must be validated first, please check your email`);
                return res.redirect(`back`);
            });
        }
    } else {
        return res.redirect('/restaurants');
    }
});

router.get('/forgotPassword', (req, res) => {
    res.render('forgotPassword');
});

router.post('/forgotPassword', (req, res) => {
    const email = req.body.email;

    User.findByUsername(email, (err, user) => {
        if (err) {
            req.flash(`error`, `Error: No user found with that email`);
            return res.redirect('/forgotPassword');
        }

        // store a unique token with an expiration date in 1 hour on the user
        var token = generateToken();
        var tokenExpire = new Date();
        tokenExpire.setTime(tokenExpire.getTime() + 60 * 60 * 1000);

        User.updateOne(
            { _id: user._id },
            { token, tokenExpire, tokenType: TokenType.FORGOT_PASSWORD },
            (err, result) => {
                if (err || result.modifiedCount != 1) {
                    req.flash(`error`, `Error: Failed to generate reset token, please try again`);
                    return res.redirect('/forgotPassword');
                } else {
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
                        to: user.username,
                        subject: 'Reset Order Envy password',
                        html: '<h1>Order Envy</h1>' +
                            '<p>Use <a href="' + req.headers.origin + '/resetPassword/' + token + '">this link</a> to complete the reset process</p>' +
                            '<p>NOTE: the password will expire in one hour</p>'
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            req.flash(`error`, `Error: Failed to send email: ` + error);
                            return res.redirect('/forgotPassword');
                        } else {
                            req.flash(`info`, `Success!`);
                            return res.render('resetSent', {email: email});
                        }
                    });
                }
        });
    });
});

router.get('/resetPassword/:token', (req, res) => {
    const token = req.params.token;
    User.findOne({ token: token, tokenType: TokenType.FORGOT_PASSWORD }, (err, user) => {
        const tokenExpire = (user && user.tokenExpire ? user.tokenExpire.getTime() : 0);
        if (err || tokenExpire < Date.now()) {
            req.flash(`error`, `Error: Reset token expired, please try again`);
            return res.redirect('/forgotPassword');
        } else {
            return res.render('resetPassword', {token: token, email: user.username});
        }
    });
});

router.post('/resetPassword', (req, res) => {
    const token = req.body.token;

    // sanity check, also done as part of form validation on the page
    if (req.body.newPassword != req.body.confirmPassword) {
        req.flash(`error`, `Error: Passwords need to match`);
        return res.redirect('/resetPassword/' + token);
    }

    // update the password
    User.findOne({ token: token, tokenType: TokenType.FORGOT_PASSWORD }, (err, user) => {
        const tokenExpire = (user ? user.tokenExpire.getTime() : 0);
        if (err || tokenExpire < Date.now()) {
            req.flash(`error`, `Error: No user found or token expired`);
            return res.redirect('/forgotPassword');
        }

        user.setPassword(req.body.newPassword, (err, updatedUser) => { 
            if (err) {
                req.flash(`error`, `Error: Failed to update password`);
                return res.redirect('/forgotPassword');
            }

            User.updateOne(
                { _id: updatedUser._id },
                { hash: updatedUser.hash, salt: updatedUser.salt, $unset: { token: 1, tokenExpire: 1, tokenType: 1 } },
                (err, result) => {
                    if (err || result.modifiedCount != 1) {
                        req.flash(`error`, `Error: Failed to update password, please try again`);
                        return res.redirect('/forgotPassword');
                    } else {
                        req.flash(`success`, `Password successfully changed!`);
                        return res.redirect('/login');
                    }
            });
        });
    });
});

router.get('/logout', (req, res) => {
    // this will trash the current session
    req.logout({keepSessionInfo: false}, (error) => {
        if (error) {
            console.error(`Error during log out: ${error}`);
        }
    });

    req.flash(`success`, `Logged you out!`);

    // send them back to the login page
    res.redirect('/login');
});

module.exports = router;