const express = require('express');
const router = express.Router({mergeParams: true});

const isLoggedIn = require('../middleware/isLoggedIn');
const { canEditRestaurant } = require('../middleware/restaurant');
const { filterUserOwned, flash, FlashType, getCookies, getRatingInfo } = require('../utils/misc');
const List = require('../models/list');
const Recommendation = require('../models/recommendation');
const Note = require('../models/note');
const Restaurant = require('../models/restaurant');

// 'index' route
router.get('/', (req, res) => {
    if (req.cookies.loginRedirect) {
        const redirectUrl = req.cookies.loginRedirect;
        res.cookie('loginRedirect', undefined, {maxAge: 0, httpOnly: true});
        return res.redirect(redirectUrl);
    }

    Restaurant.find({}).sort('name').exec((err, restaurants) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error getting restaurants: ${err.message}`);
            res.redirect('/');
        } else {
            Recommendation.find({ for: req.user }).populate('restaurant').sort('menuItem').exec((err, recommendations) => {
                if (err) {
                    flash(req, res, FlashType.ERROR, `Error getting restaurants: ${err.message}`);
                    res.redirect('/');
                } else {
                    const cookies = getCookies(req);
                    const selectedValue = cookies['filterDist'] || 25;

                    const filterByDist = (restaurants) => {
                        const lat = cookies['lat'];
                        const long = cookies['long'];
                        if (isNaN(Number(lat)) || isNaN(Number(long))) {
                            return restaurants;
                        }

                        const denom = (180 / Math.PI);
                        const lat1 = lat / denom;
                        const long1 = long / denom;

                        const calcDist = (lat2, long2) => {
                            return (3963.0 * Math.acos((Math.sin(lat1) * Math.sin(lat2)) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(long2 - long1)));
                        };

                        return restaurants.filter((restaurant) => {
                            const {lat, long} = restaurant.location;
                            return (
                                selectedValue === 'all' ||
                                (!isNaN(Number(lat)) && !isNaN(Number(long)) && calcDist(lat / denom, long / denom) < Number(selectedValue))
                            );
                        });
                    }

                    const filterDistStr = `filterDist`;
                    const headerContent = `<select id="${filterDistStr}" onchange="filterByDistance('${filterDistStr}')">
                        <option value="25">25 miles</option>
                        <option value="100">100 miles</option>
                        <option value="500">500 miles</option>
                        <option value="all">All</option>
                    </select>`;

                    // only show the restaurant that recommendations come from on this page
                    if (recommendations.length) {
                        let uniqueRestaurants = {};
                        for (let i = 0; i < recommendations.length; i++) {
                            const restId = recommendations[i].restaurant._id;
                            if (!(restId in uniqueRestaurants)) {
                                uniqueRestaurants[restId] = {
                                    _id: recommendations[i]._id,
                                    restaurant: recommendations[i].restaurant,
                                    preventDelete: !!recommendations[i].menuItem,
                                    count: 0,
                                };
                            }
                            uniqueRestaurants[restId].count += recommendations[i].from.length;
                        }
                        recommendations = Object.values(uniqueRestaurants);

                        // order the recs based on total count of people recommending the restaurant and any menu items at it
                        recommendations.sort((a, b) => { return (b.count - a.count); });
                    }

                    res.render('restaurants/index', {
                        restaurants: filterByDist(restaurants),
                        recommendations,
                        onload: `"loadFilterByDistance('${filterDistStr}'); findMe('cookie');"`,
                        headerContent,
                    });
                }
            });
        }
    });
});

// 'new' route
router.get('/new', isLoggedIn, (req, res) => {
    res.render('restaurants/new');
});

// 'create' route
router.post('/', isLoggedIn, (req, res) => {
    const newRestaurant = {
        name: req.body.name,
        description: req.body.description,
        website: req.body.website,
        phone: req.body.phone,
        location: {
            address: req.body.address,
            lat: req.body.lat,
            long: req.body.long,
        },
    };

    Restaurant.create(newRestaurant, (err, createdRestaurant) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error creating restaurant: ${err.message}`);
            return res.redirect(`back`);
        } else {
            flash(req, res, FlashType.SUCCESS, `Successfully created restaurant!`);
            return res.redirect(`/restaurants/${createdRestaurant._id}`);
        }
    });
});

function averageRating(ratings, user) {
    let count = 0;
    let total = 0;
    if (user) {
        for (let r of ratings) {
            if (r.user && r.user._id.equals(user._id)) {
                count++;
                total += r.rating;
            }
        }
    }

    return (count ? Math.round(total / count) : null);
}

// 'show' route
router.get('/:restaurantID', (req, res) => {
    Restaurant.findById(req.params.restaurantID).populate({path: 'menuItems', options: {sort: 'name'}, populate: {path: 'ratings', options: {sort: {'createdAt': -1}}}}).populate({path: 'ratings', options: {sort: {'createdAt': -1}}}).exec((err, restaurant) => {
        if (err) {
            flash(req, res, FlashType.ERROR, `Error getting restaurant: ${err.message}`);
            return res.redirect(`/restaurants`);
        } else {
            List.find({ users: res.locals.user }, (err, lists) => {
                if (err) {
                    flash(req, res, FlashType.ERROR, `Error fetching lists: ${err.message}`);
                    return res.redirect(`/restaurants`);
                } else {
                    Recommendation.find({ for: req.user, restaurant: req.params.restaurantID }).where('menuItem').ne(null).populate('menuItem').populate('from').sort('-updatedAt').exec((err, recommendations) => {
                        if (err) {
                            flash(req, res, FlashType.ERROR, `Error fetching recommendations: ${err.message}`);
                            return res.redirect(`/restaurants`);
                        } else {
                            Note.findOne({ about: restaurant, user: res.locals.user }, (err, note) => {
                                if (err) {
                                    flash(req, res, FlashType.ERROR, `Error fetching note: ${err.message}`);
                                    return res.redirect(`/restaurants`);
                                } else {
                                    if (!('ratings' in res.locals)) {
                                        res.locals.ratings = [];
                                    }

                                    // sort the recs based on how many people recommended it, then by when it was created
                                    recommendations.sort((a, b) => { return (b.from.length - a.from.length); });
                                    res.render('restaurants/show', { restaurant, averageRating, filterUserOwned, lists, recommendations, note, getRatingInfo });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

// 'edit' route
router.get('/:restaurantID/edit', canEditRestaurant, (req, res) => {
    const { restaurant } = res.locals;
    if (restaurant) {
        res.render('restaurants/edit', {restaurant});
    }
});

// 'update' route
router.put('/:restaurantID', canEditRestaurant, (req, res) => {
    // since we already have the restaurant we can update it directly and save
    // othwerwise we would need to do the following:
    //   Restaurant.findByIdAndUpdate(req.params.restaurantID, req.body.restaurant, (err, updatedCampground) => {
    const { restaurant } = res.locals;
    if (restaurant) {
        req.body.restaurant.location = {
            address: req.body.restaurant.address,
            lat: req.body.restaurant.lat,
            long: req.body.restaurant.long,
        };
        delete req.body.restaurant.address;
        Object.assign(restaurant, req.body.restaurant);
        restaurant.save();
        res.redirect(`/restaurants/${restaurant._id}`);
    }
});

// 'delete' route
router.delete('/:restaurantID', canEditRestaurant, (req, res) => {
    // since we already have the restaurant we can delete it directly
    // othwerwise we would need to do the following:
    //   Restaurant.findByIdAndRemove(req.params.restaurantID, (err) => {
    const { restaurant } = res.locals;
    if (restaurant) {
        restaurant.remove((err) => {
            if (err) {
                flash(req, res, FlashType.ERROR, `Failed to remove restaurant: ${err.message}`);
            } else {
                flash(req, res, FlashType.SUCCESS, `Restaurant deleted`);
            }
    
            return res.redirect('/restaurants');
        });
    }
});

module.exports = router;
