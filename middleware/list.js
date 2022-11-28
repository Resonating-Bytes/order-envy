const List = require('../models/list');
const isLoggedIn = require('./isLoggedIn');
const { flash, FlashType, isOwner } = require('../utils/misc');

module.exports = {
    /**
     * Passes if the list referenced in req is found
     */
    cacheList: (req, res, next) => {
        List.findById(req.params.listID, (err, list) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `List not found: ${err.message}`);
                return res.redirect(`back`);
            }

            // pass the list through to the next route
            res.locals.list = list;
            return next();
        });
    },

    /**
     * Passes if there is a valid user,
     * the list referenced in req is found,
     * and the current user is the creator
     */
    userOwnsList: (req, res, next) => {
        isLoggedIn(req, res, () => {
            module.exports.cacheList(req, res, () => {
                const { list, user } = res.locals;
                if (isOwner(user, list, 'users')) {
                    return next();
                }

                flash(req, res, FlashType.ERROR, `You don't have permission for that`);

                // clear out the list so it isn't used by accident
                delete res.locals.list;

                // if they are logged in but anything else goes wrong,
                // just send them back where they came from
                res.redirect('back');
            });
        });
    },
}
