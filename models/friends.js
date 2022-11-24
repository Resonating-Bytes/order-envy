const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const FriendsSchema = new mongoose.Schema({
    IDs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
         }
    ],
    token: String,
    tokenExpire: Date,
    tokenType: Number,
},
{
  timestamps: true
});

FriendsSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Friends", FriendsSchema);