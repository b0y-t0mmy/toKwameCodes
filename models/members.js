const mongoose = require("mongoose");

let personnelScheme = new mongoose.Schema({
    genderRadios : String,
    phone : Number,
    date : Date,
    category : String,
    region : String,
    farmName : String,
    location : String,
    city : String,
    address : String,
    hometown : String,
    imgUrl : {
        data : Buffer,
        contentType : String
    },
    produce : [String],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Personnel', personnelScheme);