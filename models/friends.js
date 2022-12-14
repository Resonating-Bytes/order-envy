const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const FriendsSchema = new mongoose.Schema({
    // user requesting to add a friend
    source: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: false,
    },
    // who they want to be friends with
    request: String,
    // used to expire the request
    token: String,
    tokenExpire: Date,
    tokenType: Number,
},
{
  timestamps: true
});

module.exports = mongoose.model("Friends", FriendsSchema);