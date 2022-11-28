const { flash, FlashType } = require('../utils/misc');

module.exports = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    flash(req, res, FlashType.ERROR, `Please log in first`);
    res.cookie('loginRedirect', req.originalUrl, {maxAge: 5*60*1000, httpOnly: true});
    res.redirect('/login');
}
