const mongoose = require('mongoose')

const couponSchema = mongoose.Schema({
    name : {
        type : String,
        required : true
    },

    code : {
        type : String,
        required : true,
        unique : true
    },

    createdOn : {
        type : Date,
        default : Date.now(),
        required : true,
    },

    expiresOn : {
        type : Date,
        required : true,
    },

    discount : {
        type : Number,
        required : true
    },

    minPurchase : {
        type : Number,
        default : 0,
    },

    status : {
        type : String,
        enum : ['Active','Expired'],
        default : 'Active'
    },
})


const Coupon = mongoose.model("Coupon",couponSchema)
module.exports = Coupon