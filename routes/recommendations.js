const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const Recommendation = require('../models/recommendation');
const { flash, FlashType } = require('../utils/misc');

// 'add' recommendation
router.get('/', isLoggedIn, (req, res) => {
    const recommendation = {
        for: req.params.friendID,
        restaurant: req.query.restaurant,
        menuItem: req.query.menuItem,
    };
    const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
    };

    Recommendation.findOneAndUpdate(recommendation, recommendation, options, (err, createdRecommendation) => {
        if (err) {
            console.error(`Error: ${err.message}`);
            flash(req, res, FlashType.ERROR, `Error rendering lists: ${err.message}`);
        } else {
            if (createdRecommendation.from.addToSet(res.locals.user).length) {
                createdRecommendation.save();
                flash(req, res, FlashType.SUCCESS, `Recommendation created!`);
            } else {
                flash(req, res, FlashType.WARNING, `You already recommended that to them... be patient`);
            }
        }

        // always send them back where they came from
        return res.redirect('back');
    });
});

// 'remove' a recommendation
router.delete('/:recommendationID', isLoggedIn, (req, res) => {
    Recommendation.findByIdAndRemove(req.params.recommendationID, (err, recommendation) => {
      if (err) {
            flash(req, res, 'error', 'Failed to delete recommendation');
        } else {
            flash(req, res, 'success', 'Recommendation deleted');
        }

        return res.redirect('back');
    });
});

module.exports = router;
