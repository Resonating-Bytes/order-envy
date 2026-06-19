const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const { limitText } = require('../utils/misc');

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    firstName: String,
    lastName: String,
    googleId: { type: String, unique: true, sparse: true },
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

UserSchema.methods.getFullName = function getFullName() {
    if (this.firstName && this.lastName) {
        return this.firstName + ` ` + this.lastName;
    }
    
    return this.username;
};

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);