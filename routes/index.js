const express = require('express');
const router = express.Router({mergeParams: true});
const passport = require('passport');

const Friends = require('../models/friends');
const User = require('../models/user');

const { flash, FlashType, generateToken, getActiveFriendRequestsQuery, sendEmail, TokenType } = require('../utils/misc');

// index route
router.get('/', (req, res) => {
    // if there is no user there is no reason to stay on this page
    if (!req.user) {
        return res.redirect('/restaurants');
    }

    res.render('home');
});

// show signup form
router.get('/register', (req, res) => {
    if (req.query.from && req.query.token) {
        res.cookie('inviteFrom', req.query.from, {maxAge: 5*60*1000, httpOnly: true});
        res.cookie('inviteToken', req.query.token, {maxAge: 5*60*1000, httpOnly: true});
    }

    res.render('register', {usernamePlaceholder: req.query.usernamePlaceholder});
});

// handle signing up a new user
router.post('/register', (req, res) => {
    // sanity check, also done as part of form validation on the page
    if (req.body.password != req.body.confirmPassword) {
        flash(req, res, FlashType.ERROR, `Error: Passwords need to match`);
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
            flash(req, res, FlashType.ERROR, `Failed to register user: ${err.message}`);
            return res.redirect('/register');
        }

        // new user has been created
        passport.authenticate('local', {
            failureRedirect: '/register',
        })(req, res, () => {
            const subjectMsg = 'Confirm Order Envy account';
            const htmlMsg = '<h1>Welcome to Order Envy</h1>' +
                '<p>Use <a href="' + req.headers.origin + '/register/' + token + '">this link</a> to confirm your account</p>' +
                '<p>NOTE: the link will expire in one hour</p>';
            sendEmail(req.body.username, subjectMsg, htmlMsg, (error, info) => {
                if (error || info.rejected.length) {
                    // remove the user entry since it wasn't set up properly
                    req.user.remove();
                    flash(req, res, FlashType.ERROR, `Error: Failed to send email: ` + (error ? error : "unknown error"));
                    return res.redirect('/register');
                } else {
                    req.logout({keepSessionInfo: false}, (err) => {
                        if (err) {
                            flash(req, res, FlashType.ERROR, `Error while logging out: ${err}`);
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
            flash(req, res, FlashType.ERROR, `Error: Failed to validate account, please try again`);
            return res.redirect('/register');
        } else {
            // clear the token so the user isn't deleted on accident later
            user.token = undefined;
            user.tokenExpire = undefined;
            user.tokenType = undefined;
            user.save();

            // check if the user was invited by an existing user
            if (req.cookies.inviteFrom && req.cookies.inviteToken) {
                const tokenExpire = new Date();
                const dateQuery = {tokenExpire: {"$gt": tokenExpire}};
                const tokenQuery = {token: req.cookies.inviteToken, tokenType: TokenType.INVITE_FRIEND};
                Friends.findOne({"$and": [{source: req.cookies.inviteFrom, request: user.username}, dateQuery, tokenQuery]}, (error, friendRequest) => {
                    if (error || !friendRequest) {
                        flash(req, res, FlashType.ERROR, `Error: Failed to find find friend request: ${err.message}`);
                        return res.redirect('back');
                    }

                    User.findById(friendRequest.source, (err, foundUser) => {
                        if (err) {
                            flash(req, res, FlashType.ERROR, `Error: Failed to find user: ${err.message}`);
                            return res.redirect('back');
                        }
        
                        if (user.friends.addToSet(foundUser._id).length) {
                            user.save();
                        }
        
                        // add the current user to the friend's list as well
                        if (foundUser.friends.addToSet(user._id).length) {
                            foundUser.save();

                            // send them an email so they know the invited friend joined
                            const subjectMsg = 'They said YES!';
                            const htmlMsg = '<h1>It is a beautiful day to order something new</h1>' +
                                '<p>' + user.getFullName() + ' accepted your invite to help each other eat better on Order Envy!</p>' +
                                '<p>Now go and help each other enjoy your meals more and regret less</p>';
                            sendEmail(foundUser.username, subjectMsg, htmlMsg, (error, info) => {
                                if (error) {
                                    console.error(`Error sending invite accept email: ${error}`);
                                }
                            });
                        }

                        // let them know a friend was added
                        flash(req, res, FlashType.SUCCESS, `Added ${foundUser.getFullName()} as a friend!`);

                        // delete the pending request
                        friendRequest.remove();

                        // clear the cookies after they are used
                        res.cookie('inviteFrom', undefined, {maxAge: 0, httpOnly: true});
                        res.cookie('inviteToken', undefined, {maxAge: 0, httpOnly: true});

                        flash(req, res, FlashType.SUCCESS, `Account validated!`);
                        return res.redirect('/login');
                    });
                });
            } else {
                flash(req, res, FlashType.SUCCESS, `Account validated!`);
                return res.redirect('/login');
            }
        }
    });
});

router.get('/login', (req, res) => {
    if (req.user) {
        return res.redirect('/restaurants');
    }

    res.render('login');
});

router.get('/loginFailed', (req, res) => {
    flash(req, res, FlashType.ERROR, `Username or password incorrect, please try again`);
    res.redirect('/login');
});

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/loginFailed',
}), (req, res) => {
    if (req.user.tokenType == TokenType.NEW_ACCOUNT) {
        if (req.user.tokenExpire.getTime() < Date.now()) {
            req.user.remove();
            flash(req, res, FlashType.ERROR, `Error: Account registration token expired, please register again`);
            return res.redirect('/register');
        } else {
            req.logout({keepSessionInfo: false}, (err) => {
                flash(req, res, FlashType.ERROR, `Error: Account must be validated first, please check your email\n${err}`);
                return res.redirect(`back`);
            });
        }
    } else {
        Friends.find(getActiveFriendRequestsQuery(req.user.username)).count((err, friendRequestCount) => {
            if (!err && friendRequestCount) {
                const baseMsg = (friendRequestCount == 1 ? `You have a pending friend request` : `You have pending friend requests`);
                flash(req, res, FlashType.INFO, `${baseMsg} <a href="/users/${req.user._id}/friends" class="btn btn-outline btn-outline-primary">here</a>`);
            }

            return res.redirect('/restaurants');
        });
    }
});

router.get('/forgotPassword', (req, res) => {
    res.render('forgotPassword');
});

router.post('/forgotPassword', (req, res) => {
    const email = req.body.email;

    User.findByUsername(email, (err, user) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error: No user found with that email`);
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
                    flash(req, res, FlashType.ERROR, `Error: Failed to generate reset token, please try again`);
                    return res.redirect('/forgotPassword');
                } else {
                const subjectMsg = 'Reset Order Envy password';
                const htmlMsg = '<h1>Order Envy</h1>' +
                    '<p>Use <a href="' + req.headers.origin + '/resetPassword/' + token + '">this link</a> to complete the reset process</p>' +
                    '<p>NOTE: the password will expire in one hour</p>';
                sendEmail(user.username, subjectMsg, htmlMsg, (error, info) => {
                        if (error || info.rejected.length) {
                            flash(req, res, FlashType.ERROR, `Error: Failed to send email: ` + (error ? error : "unknown error"));
                            return res.redirect('/forgotPassword');
                        } else {
                            flash(req, res, FlashType.SUCCESS, `Success!`);
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
            flash(req, res, FlashType.ERROR, `Error: Reset token expired, please try again`);
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
        flash(req, res, FlashType.ERROR, `Error: Passwords need to match`);
        return res.redirect('/resetPassword/' + token);
    }

    // update the password
    User.findOne({ token: token, tokenType: TokenType.FORGOT_PASSWORD }, (err, user) => {
        const tokenExpire = (user ? user.tokenExpire.getTime() : 0);
        if (err || tokenExpire < Date.now()) {
            flash(req, res, FlashType.ERROR, `Error: No user found or token expired`);
            return res.redirect('/forgotPassword');
        }

        user.setPassword(req.body.newPassword, (err, updatedUser) => { 
            if (err) {
                flash(req, res, FlashType.ERROR, `Error: Failed to update password`);
                return res.redirect('/forgotPassword');
            }

            User.updateOne(
                { _id: updatedUser._id },
                { hash: updatedUser.hash, salt: updatedUser.salt, $unset: { token: 1, tokenExpire: 1, tokenType: 1 } },
                (err, result) => {
                    if (err || result.modifiedCount != 1) {
                        flash(req, res, FlashType.ERROR, `Error: Failed to update password, please try again`);
                        return res.redirect('/forgotPassword');
                    } else {
                        flash(req, res, FlashType.SUCCESS, `Password successfully changed!`);
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
            flash(req, res, FlashType.ERROR, `Error during log out: ${error}`);
        }
    });

    flash(req, res, FlashType.SUCCESS, `Logged you out!`);

    // send them back to the login page
    res.redirect('/login');
});

module.exports = router;