const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId 

const cartSchema = mongoose.Schema({

    user : {
        type : ObjectId,
        ref : "User",
        required : true
    },

    items : [{
        productId : {
            type : ObjectId,
            ref : "Product",
            required : true
        },

        quantity : {
            type : Number,
            default : 1
        },

        price : {
            type : Number,
            required : true
        },

        totalPrice : {
            type : Number,
            required : true
        }
    }]
})

const Cart = mongoose.model("Cart", cartSchema)
module.exports = Cart