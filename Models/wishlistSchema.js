const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const wishlistSchema = mongoose.Schema({
    userId : {
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
        addedOn : {
            type : Date,
            default : Date.now
        }
    }]
})

const Wishlist = mongoose.model("Wishlist", wishlistSchema)
module.exports = Wishlist