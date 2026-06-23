/**
 * Restaurant edit permissions.
 *
 * When no owner is set, any logged-in user may edit (legacy crowd-sourced behavior).
 * When an owner is set, only the owner and delegated editors may edit restaurant
 * metadata and menu items. Only the owner may delete the restaurant or manage editors.
 */

function userIdEquals(a, b) {
    if (!a || !b) return false;
    const idA = a._id || a;
    const idB = b._id || b;
    return String(idA) === String(idB);
}

function userCanEditRestaurant(user, restaurant) {
    if (!user) return false;
    if (!restaurant || !restaurant.owner) return true;
    if (userIdEquals(restaurant.owner, user._id)) return true;
    const editors = restaurant.editors || [];
    return editors.some((editor) => userIdEquals(editor, user._id));
}

function userCanDeleteRestaurant(user, restaurant) {
    if (!user) return false;
    if (!restaurant || !restaurant.owner) return true;
    return userIdEquals(restaurant.owner, user._id);
}

/** Claim ownership or manage delegated editors (owner only once claimed). */
function userCanManageRestaurant(user, restaurant) {
    if (!user || !restaurant) return false;
    if (!restaurant.owner) return true;
    return userIdEquals(restaurant.owner, user._id);
}

/** Manage delegated editors — only when ownership has been claimed. */
function userCanManageEditors(user, restaurant) {
    if (!user || !restaurant || !restaurant.owner) return false;
    return userIdEquals(restaurant.owner, user._id);
}

module.exports = {
    userIdEquals,
    userCanEditRestaurant,
    userCanDeleteRestaurant,
    userCanManageRestaurant,
    userCanManageEditors,
};
