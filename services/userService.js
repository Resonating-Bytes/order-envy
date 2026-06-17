const User = require('../models/user');
const Friends = require('../models/friends');
const { formatUser } = require('../lib/apiHelpers');

async function getProfile(userId, requester) {
    if (!requester._id.equals(userId)) {
        const err = new Error('You can only view your own profile');
        err.status = 403;
        throw err;
    }
    const user = await User.findById(userId).populate('friends');
    return formatUser(user);
}

async function updateProfile(userId, requester, data) {
    if (!requester._id.equals(userId)) {
        const err = new Error('You can only update your own profile');
        err.status = 403;
        throw err;
    }

    const user = await User.findById(userId);
    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.username !== undefined) {
        user.username = data.username;
        user.email = data.username;
    }

    if (data.newPassword) {
        if (!data.oldPassword) {
            const err = new Error('Old password required to set new password');
            err.status = 400;
            throw err;
        }
        await new Promise((resolve, reject) => {
            user.changePassword(data.oldPassword, data.newPassword, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    await user.save();
    return formatUser(await User.findById(userId).populate('friends'));
}

async function deleteAccount(userId, requester) {
    if (!requester._id.equals(userId)) {
        const err = new Error('You can only delete your own account');
        err.status = 403;
        throw err;
    }

    const deletedUserId = requester._id;
    await requester.deleteOne();

    const users = await User.find({ friends: deletedUserId });
    for (const u of users) {
        u.friends = u.friends.filter((f) => !f.equals(deletedUserId));
        await u.save();
    }

    await Friends.deleteMany({ $or: [{ source: deletedUserId }, { request: deletedUserId }] });

    return { message: 'Account deleted' };
}

module.exports = { getProfile, updateProfile, deleteAccount };
