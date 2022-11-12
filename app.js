const express = require('express');
const app = express();
const expressSession = require('express-session');
require('dotenv').config();

const bodyParser = require('body-parser');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const cookieParser = require('cookie-parser');

const User = require('./models/user');
const seedData = require('./seedData');

const friendRoutes = require('./routes/friends');
const indexRoutes = require('./routes/index');
const listRoutes = require('./routes/lists');
const listElementRoutes = require('./routes/listElements');
const locationRoutes = require('./routes/location');
const menuItemRoutes = require('./routes/menuItems');
const noteRoutes = require('./routes/notes');
const ratingRoutes = require('./routes/ratings');
const recommendationRoutes = require('./routes/recommendations');
const restaurantRoutes = require('./routes/restaurants');
const restaurantCheckinRoutes = require('./routes/restaurantCheckin');
const userRoutes = require('./routes/users');

// switching stack

app.use(express.static(__dirname + "/public"));
app.use(express.static("./lib"));
app.use(methodOverride('_method'));
app.use(flash()); // this needs to come before passport configuration
app.set('view engine', 'ejs');
app.use(cookieParser());

// set up express to store session info in the app
app.use(expressSession({
    secret: 'This is my super secret message used to encode things',
    resave: false,
    saveUninitialized: false,
}));

// these need to come after the express session is set up with the secret
app.use(passport.initialize());
app.use(passport.session());

// tell passport how to deal with the User in the session
// these are provided by passportLocalMongoose
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// 'body-parse' takes form data and builds a JS object out of it that we can manipulate
app.use(bodyParser.urlencoded({extended: true}));

const {DATABASE_URL} = process.env;
mongoose.connect(DATABASE_URL, { useNewUrlParser: true }); // add ':27017' to the address if it needs a port

// maybe populate the DB with some starting data
seedData();

// this will inject the signed in user to all pages
// so we can reference it on any page
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.warning = req.flash('warning');
    res.locals.success = req.flash('success');
    res.locals.ratingInfo = [
        {
            img: "/img/vomit",
            alt: "Vomit",
            title: "Pretty sure this gave me food poisoning",
        },
        {
            img: "/img/frowning",
            alt: "Frowning",
            title: "Only worth eating to survive long enough to find something better",
        },
        {
            img: "/img/neutral",
            alt: "Neutral",
            title: "Not worth getting again if there is another option to try",
        },
        {
            img: "/img/happy",
            alt: "Happy",
            title: "Always a solid choice to put this in your food hole",
        },
        {
            img: "/img/perfect",
            alt: "Perfect",
            title: "You may have died and went to taste bud heaven, why get anything else ever???",
        }
    ];

    // pull the user from the DB so we can populate fields properly
    User.findById((req.user || {})._id).populate('friends').exec((err, user) => {
        if (err) {
            req.flash(`error`, `Failed to populate user: ${err.message}`);
        } else {
            res.locals.user = user;
        }
        next();
    });
});

// wire up all the sub-routes
app.use('/', indexRoutes);
app.use('/users/share/:friendID', recommendationRoutes);
app.use('/users/:userID/friends', friendRoutes);
app.use('/users', userRoutes);
app.use('/lists/:listID/', listElementRoutes);
app.use('/lists', listRoutes);
app.use('/location', locationRoutes);
app.use('/restaurants', restaurantRoutes);
app.use('/restaurants/:restaurantID', restaurantCheckinRoutes);
app.use('/restaurants/:restaurantID/menuItems', menuItemRoutes);

// these endpoints share the same route handler because the logic is nearly identical
// there are slight variations if `menuItemID` is present in the request URL
app.use('/restaurants/:restaurantID/ratings', ratingRoutes);
app.use('/restaurants/:restaurantID/menuItems/:menuItemID/ratings', ratingRoutes);
app.use('/restaurants/:restaurantID/notes', noteRoutes);
app.use('/restaurants/:restaurantID/menuItems/:menuItemID/notes', noteRoutes);

const PORT = process.env.PORT || 1979;
const server = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
module.exports = server;