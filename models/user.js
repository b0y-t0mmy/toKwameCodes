const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

let userScheme = new mongoose.Schema({
    username : String,
    email : { type: String, unique: 'That email is already taken.'},
    password : {
        type : String,
        select : false
    },
    role: Number, 
    resetPasswordToken : String,
    resetPasswordExpires : Date,
});

userScheme.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', userScheme);