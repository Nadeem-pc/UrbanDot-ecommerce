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
    
    resetToken : {
        type: String,
        default: null
    },
    
    resetTokenExpire : {
        type: Number,
        default: null
    },

},  )

const User = mongoose.model("User",userSchema)
module.exports = User