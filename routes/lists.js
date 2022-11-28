const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { userOwnsList } = require('../middleware/list');
const { flash, FlashType } = require('../utils/misc');
const List = require('../models/list');
const User = require('../models/user');

// 'index' route
router.get('/', isLoggedIn, (req, res) => {
    List.find({users: res.locals.user}, (err, lists) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error rendering lists: ${err.message}`);
            res.redirect('/');
        } else {
            res.render('lists/index', { lists });
        }
    });
});

// 'new' route
router.get('/new', isLoggedIn, (req, res) => {
    const redirectID = req.params.redirectID;
    res.render(`lists/new`, { redirectID });
});

// 'create' route
router.post('/', isLoggedIn, (req, res) => {
    let newList = req.body.list;
    newList.users = [res.locals.user];
    
    List.create(newList, (err, createdList) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error creating list: ${err.message}`);
        } else {
            flash(req, res, FlashType.SUCCESS, `Successfully created list ${createdList}!`);
        }

        // succeed or fail, send them to the same place
        // back to the list index page by default
        // or the show page for a specific restaurant if we have one
        let route = `/lists/`;
        if (req.body.redirectID) {
            route += `/retaurants/${req.body.redirectID}`;
        }
        res.redirect(route);
    });
});

// 'show' route
router.get('/:listID', isLoggedIn, (req, res) => {
    List.findById(req.params.listID).populate('restaurants').exec((err, foundList) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error creating list: ${err.message}`);
            return res.redirect('back');
        } else {
            return res.render('lists/show', { list: foundList });
        }
    });
});

// 'edit' route
router.get('/:listID/edit', userOwnsList, (req, res) => {
    const { list } = res.locals;
    if (list) {
        return res.render(`lists/edit`, { list });
    } else {
        flash(req, res, FlashType.ERROR, `Unknown error editing list`);
        return res.redirect(`/lists`);
    }
});

// 'update' route
router.put('/:listID', userOwnsList, (req, res) => {
    // since we already have the list we can update it directly and save
    const { list } = res.locals;
    if (list) {
        Object.assign(list, req.body.list);
        list.save();
    } else {
        flash(req, res, FlashType.ERROR, `Unknown error editing list`);
    }

    return res.redirect(`/lists/${req.params.listID}`);
});

// 'delete' route
router.delete('/:listID', userOwnsList, (req, res) => {
    // since we already have the list we can delete it directly
    const { list } = res.locals;
    if (list) {
        list.remove((err) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `Failed to remove list: ${err.message}`);
            } else {
                flash(req, res, FlashType.SUCCESS, `List deleted`);
            }
        });
    } else {
        flash(req, res, FlashType.ERROR, `Unknown error deleting list`);
    }

    return res.redirect(`/lists`);
});

// 'addOwner'
router.get('/:listID/addOwner/:userID', userOwnsList, (req, res) => {
    const { list } = res.locals;
    if (list && list.users.addToSet(req.params.userID).length) {
        list.save();
        flash(req, res, FlashType.SUCCESS, `Added as owner of the list!`);
    }

    // always send them back where they came from
    return res.redirect('back');
});

module.exports = router;
