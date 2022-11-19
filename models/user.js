const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const { limitText } = require('../utils/misc');

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    firstName: String,
    lastName: String,
    friends: [
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

UserSchema.methods.getDisplayName = function getDisplayName() {
    return limitText(this.firstName || this.username || '', 15);
};

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);