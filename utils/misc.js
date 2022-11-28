/**
 * Collection of random reusable utility functions
 */
 let FlashType = {
    ERROR: 'error',
    WARNING: 'warning',
    SUCCESS: 'success',
    INFO: 'info',
}

let TokenType = {
    // define what token is being used for
    NEW_ACCOUNT: 0,
    FORGOT_PASSWORD: 1,
    CONFIRM_FRIEND: 2,
}

module.exports = {
    FlashType,
    TokenType,

    isOwner: (user, obj, param) => {
        const member = (obj ? obj[param] : {});
        if (typeof member === 'object' && member.length) {
            for (let element of member) {
                const { _id } = element;
                if (user && _id && _id.equals(user._id)) {
                    return true;
                }
            }
        } else {
            const { _id } = member;
            return (user && _id && _id.equals(user._id));
        }

        return false;
    },

    // return all objects in the given array that are owned by the given user
    filterUserOwned: (user, objs) => {
        return (user ? objs.filter((obj) => { return obj.user && user._id.equals(obj.user._id); }) : []);
    },

    // clip the input text to the desired length
    limitText: (txt, len) => {
        if (txt && txt.length > len) {
            return txt.slice(0, len) + `...`;
        }
    
        return txt;
    },

    // get the rating info to use given the rating value
    getRatingInfo: (ratingInfo, rating) => {
        // make sure the rating stays in the bounds of the defined images
        // also have to convert from 1 based index to 0 based
        if (isNaN(rating)) {
            rating = 3;
        }
        rating = Math.round(rating);
        const idx = Math.min(Math.max(rating - 1, 0), ratingInfo.length);
        return ratingInfo[idx];
    },

    getCookies: (request) => {
        var cookies = {};
        if (request.headers && request.headers.cookie) {
            request.headers.cookie.split(';').forEach(function (cookie) {
                const parts = cookie.match(/(.*?)=(.*)$/)
                cookies[parts[1].trim()] = (parts[2] || '').trim();
            });
        }
        return cookies;
    },

    generateToken: () => {
        var buf = new Buffer.alloc(16);
        for (var i = 0; i < buf.length; i++) {
            buf[i] = Math.floor(Math.random() * 256);
        }
    
        // swap out characters that mess with the address
        var id = buf.toString('base64').slice(0, -2).replaceAll(/=|\/|\?/g, '_');
        return id;
    },

    flash: (req, res, type, msg) => {
        if (req) {
            req.flash(type, msg);
        }
        if (res && res.locals) {
            if (type in res.locals && typeof(res.locals[type]) == 'object') {
                res.locals[type].push(msg);
            } else {
                res.locals[type] = [msg];
            }
        }
    
        switch (type) {
        case FlashType.ERROR:
            console.error(msg);
            break;
    
        case FlashType.WARNING:
            console.warn(msg);
            break;
    
        default:
            console.log(msg);
            break;
        }
    },

    getActiveFriendRequestsQuery: (userId) => {
        const tokenExpire = new Date();
        const dateQuery = {tokenExpire: {"$gt": tokenExpire}};
        return {"$and": [{request: userId}, dateQuery]};
    },    
}
