const mongoose = require('mongoose')

const userSchema =  mongoose.Schema({
    username : {
        type : String,
        required : true
    },

    email : {
        type : String,
        required : true,
        unique : true
    },

    phone : {
        type : String,
        required : false,
        unique : true,
        sparse : true,
        default : null
    },

    password : {
        type : String,
        required : false
    },

    googleId : {
        type : String,
        default: null   
    },

    isBlocked : {
        type : Boolean,
        default : false
    },

    isAdmin : {
        type : Boolean,
        default : false 
    },

}, {timestamps: true})

const User = mongoose.model("User",userSchema)
module.exports = User