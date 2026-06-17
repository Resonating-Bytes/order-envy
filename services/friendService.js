const Friends = require('../models/friends');
const User = require('../models/user');
const Rating = require('../models/rating');
const MenuItem = require('../models/menuItem');
const Restaurant = require('../models/restaurant');
const Recommendation = require('../models/recommendation');
const { generateToken, sendEmail, TokenType, getActiveFriendRequestsQuery } = require('../utils/misc');

function getAppOrigin(origin) {
    return origin || process.env.APP_ORIGIN || 'http://localhost:1979';
}

function clean(obj) {
    const result = { ...obj };
    for (const key of Object.keys(result)) {
        if (result[key] === null || result[key] === undefined || result[key] === '') {
            delete result[key];
        }
    }
    return result;
}

async function listFriendRequests(user) {
    return Friends.find(getActiveFriendRequestsQuery(user.username)).populate('source');
}

async function requestFriend(user, friendQuery, origin) {
    const foundUsers = await User.find(clean(friendQuery));
    if (foundUsers.length === 0) {
        const err = new Error('No user found with those details');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
    }
    if (foundUsers.length > 1) {
        const err = new Error('Multiple users found. Please be more specific.');
        err.status = 400;
        throw err;
    }

    const foundUser = foundUsers[0];
    const token = generateToken();
    const tokenExpire = new Date();
    tokenExpire.setTime(tokenExpire.getTime() + 7 * 24 * 60 * 60 * 1000);

    await Friends.deleteMany({
        $or: [
            { source: user._id, request: foundUser.username },
            { tokenExpire: { $lt: new Date() } },
        ],
    });

    await Friends.create({
        source: user._id,
        request: foundUser.username,
        token,
        tokenExpire,
        tokenType: TokenType.CONFIRM_FRIEND,
    });

    const appOrigin = getAppOrigin(origin);
    const subjectMsg = 'Confirm your Order Envy friend request';
    const htmlMsg = `<h1>You have a secret (food) admirer</h1>
        <p>${user.getFullName()} would like to be your friend on Order Envy!</p>
        <p>Use <a href="${appOrigin}/api/v1/friends/confirm/${token}">this link</a> to confirm.</p>
        <p>NOTE: the request will expire in one week</p>`;

    await new Promise((resolve, reject) => {
        sendEmail(foundUser.username, subjectMsg, htmlMsg, (error, info) => {
            if (error || (info && info.rejected && info.rejected.length)) {
                return reject(new Error('Failed to send friend request email'));
            }
            resolve();
        });
    });

    return { message: 'Friend request sent' };
}

async function inviteFriend(user, friendEmail, origin) {
    if (!friendEmail) {
        const err = new Error('Email required');
        err.status = 400;
        throw err;
    }

    const token = generateToken();
    const tokenExpire = new Date();
    tokenExpire.setTime(tokenExpire.getTime() + 7 * 24 * 60 * 60 * 1000);

    await Friends.create({
        source: user._id,
        request: friendEmail,
        token,
        tokenExpire,
        tokenType: TokenType.INVITE_FRIEND,
    });

    const appOrigin = getAppOrigin(origin);
    const inviteAddr = `${appOrigin}/register?from=${encodeURIComponent(user._id)}&token=${encodeURIComponent(token)}&usernamePlaceholder=${encodeURIComponent(friendEmail)}`;
    const subjectMsg = 'You have a friend request on OrderEnvy!';
    const htmlMsg = `<h1>How does it feel to be popular?</h1>
        <p>${user.getFullName()} wants to be your friend on Order Envy!</p>
        <a href="${inviteAddr}">Sign up</a> to add them as your friend.`;

    await new Promise((resolve, reject) => {
        sendEmail(friendEmail, subjectMsg, htmlMsg, (error, info) => {
            if (error || (info && info.rejected && info.rejected.length)) {
                return reject(new Error('Failed to send invite email'));
            }
            resolve();
        });
    });

    return { message: 'Invite sent' };
}

async function confirmFriend(user, token, origin) {
    const friendRequest = await Friends.findOne({
        token,
        tokenType: { $in: [TokenType.CONFIRM_FRIEND, TokenType.INVITE_FRIEND] },
    });

    if (!friendRequest) {
        const err = new Error('Friend request not found');
        err.status = 404;
        throw err;
    }

    if (friendRequest.request !== user.username) {
        const err = new Error('This invite is not for you');
        err.status = 403;
        throw err;
    }

    const foundUser = await User.findById(friendRequest.source);
    if (!foundUser) {
        const err = new Error('Requesting user not found');
        err.status = 404;
        throw err;
    }

    user.friends.addToSet(friendRequest.source);
    await user.save();
    foundUser.friends.addToSet(user._id);
    await foundUser.save();
    await friendRequest.deleteOne();

    const appOrigin = getAppOrigin(origin);
    const subjectMsg = 'You have a new friend!';
    const htmlMsg = `<h1>They like you... they REALLY like you!</h1>
        <p>${user.getFullName()} confirmed your friend request on Order Envy!</p>
        <a href="${appOrigin}">OrderEnvy</a>`;

    await new Promise((resolve) => {
        sendEmail(foundUser.username, subjectMsg, htmlMsg, () => resolve());
    });

    return { message: 'Friend added' };
}

async function declineFriend(user, token) {
    const friendRequest = await Friends.findOne({
        token,
        tokenType: { $in: [TokenType.CONFIRM_FRIEND, TokenType.INVITE_FRIEND] },
    });

    if (!friendRequest || friendRequest.request !== user.username) {
        const err = new Error('Friend request not found');
        err.status = 404;
        throw err;
    }

    await friendRequest.deleteOne();
    return { message: 'Request declined' };
}

async function removeFriend(user, friendId) {
    const foundUser = await User.findById(friendId);
    if (!foundUser) {
        const err = new Error('Friend not found');
        err.status = 404;
        throw err;
    }

    user.friends = user.friends.filter((f) => !f.equals(foundUser._id));
    await user.save();
    foundUser.friends = foundUser.friends.filter((f) => !f.equals(user._id));
    await foundUser.save();

    return { message: 'Friend removed' };
}

async function getFriendActivity(user, friendId, { page = 0, pageSize = 5 } = {}) {
    const friend = await User.findById(friendId);
    if (!friend) {
        const err = new Error('Friend not found');
        err.status = 404;
        throw err;
    }

    const start = page * pageSize;
    const ratingObjs = await Rating.find({ user: friendId })
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(pageSize);

    const recentLookup = {};
    const recent = [];
    ratingObjs.forEach((r) => {
        recentLookup[r._id] = recent.length;
        recent.push({ rating: r, restaurant: null, menuItem: null });
    });

    const ratingIds = Object.keys(recentLookup);
    if (!ratingIds.length) {
        return { friend, recent: [], totalCount: 0, page, pageSize };
    }

    const menuItems = await MenuItem.find({ ratings: { $in: ratingIds } });
    const menuItemIds = [];
    menuItems.forEach((menuItem) => {
        menuItemIds.push(menuItem._id);
        menuItem.ratings.forEach((ratingId) => {
            if (ratingId in recentLookup) {
                recent[recentLookup[ratingId]].menuItem = menuItem;
            }
        });
    });

    const restaurants = await Restaurant.find({
        $or: [
            { ratings: { $in: ratingIds } },
            { menuItems: { $in: menuItemIds } },
        ],
    }).populate('menuItems');

    restaurants.forEach((restaurant) => {
        const assign = (ratings) => {
            for (const ratingId of ratings) {
                if (ratingId in recentLookup) {
                    recent[recentLookup[ratingId]].restaurant = restaurant;
                }
            }
        };
        assign(restaurant.ratings);
        restaurant.menuItems.forEach((mi) => assign(mi.ratings));
    });

    const totalCount = await Rating.countDocuments({ user: friendId });
    const filtered = recent.filter((r) => r.restaurant);

    return {
        friend,
        recent: filtered,
        totalCount,
        page: Number(page),
        pageSize: Number(pageSize),
    };
}

module.exports = {
    listFriendRequests,
    requestFriend,
    inviteFriend,
    confirmFriend,
    declineFriend,
    removeFriend,
    getFriendActivity,
};
