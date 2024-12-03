const mongoose = require('mongoose')
const User = require('../Models/userSchema')
const ObjectId = mongoose.Schema.Types.ObjectId

const addressSchema = mongoose.Schema({
    user : {
        type : ObjectId,
        ref : "User",
        required : true 
    },

    city : {
        type : String,
        required : true
    },

    pincode : {
        type : String,
        required : true
    },

    state : {
        type : String,
        required : true
    },

    country : {
        type : String,
        required : true
    },

    address : {
        type : String,
        required : true
    },

},{ timestamps : true })

const Address = mongoose.model("Address",addressSchema)
module.exports = Address