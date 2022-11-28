const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { cacheRestaurant } = require('../middleware/restaurant');
const { cacheMenuItem } = require('../middleware/menuItem');
const { flash, FlashType } = require('../utils/misc');
const Note = require('../models/note');

// 'index' route
// no reason to view all notes on their own, redirect to restaurant index page
router.get('/', (req, res) => {
    res.redirect('/restaurants');
});

// 'new' route
// there is no explicit new form, it is part of the show pages for things that can contain notes
router.get('/new', (req, res) => {
    res.redirect('/restaurants');
});

// 'create' route
router.post('/', isLoggedIn, cacheRestaurant, cacheMenuItem, (req, res) => {
    const { restaurant, menuItem } = res.locals;
    const newNote = {
        body: req.body.note.body,
        about: (menuItem || restaurant),
        user: res.locals.user,
    };

    if (menuItem) {
        newNote.aboutModel = 'MenuItem';
    } else if (restaurant) {
        newNote.aboutModel = 'Restaurant';
    } else {
        flash(req, res, FlashType.ERROR, `Failed to find valid thing to attach the note to`);
        return res.redirect('/restaurants');
    }

    // this should be update or create, not just create
    Note.findOne({user: res.locals.user, about: newNote.about}, (err, foundNote) => {
        if (foundNote) {
            Object.assign(foundNote, newNote);
            foundNote.save();
            console.log('Updated: ' + foundNote);
            flash(req, res, FlashType.SUCCESS, `Successfully updated note!`);
            return res.redirect('back');
        } else {
            Note.create(newNote, (err, createdNote) => {
                if (err) {
                    console.error(`Error: ${err.message}`);
                    flash(req, res, FlashType.ERROR, `Error creating rating: ${err.message}`);
                } else {
                    console.log('Created: ' + createdNote);
                    flash(req, res, FlashType.SUCCESS, `Successfully saved note!`);
                }
                return res.redirect('back');
            });
        }
    });
});

// 'show' route
router.get('/:ratingID', (req, res) => {
    res.redirect('/restaurants');
});

// 'edit' route
router.get('/:ratingID/edit', (req, res) => {
    res.redirect('/restaurants');
});

// 'update' route
router.put('/:ratingID', (req, res) => {
    res.redirect('/restaurants');
});

// 'delete' route
router.delete('/:ratingID', (req, res) => {
    res.redirect('/restaurants');
});

module.exports = router;
