const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

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

    usedCoupons : [{
        couponId : {
            type : ObjectId,
            ref : "Coupon",
            required : true
        }
    }]

},  )

const User = mongoose.model("User",userSchema)
module.exports = User