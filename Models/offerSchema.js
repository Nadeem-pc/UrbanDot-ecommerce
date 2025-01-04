const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId;

const offerSchema = mongoose.Schema({
    title: {
        type:String,
        required:true,
        trim:true
    },

    discount: {
        type:Number,
        required:true
    },

    appliedTo: {
        type: String,
        required: true
    },

    productId: {
        type: ObjectId,
        ref: 'Product',
        required: function() {
            return this.applyTo === "Product"
        }
    },

    categoryId: {
        type: ObjectId,
        ref: 'Category', 
        required: function () {
            return this.applyTo === 'Category';
        }
    },
    
    isActive: {
        type: Boolean
    },
    
    activateOn: {
        type:Date,
        required:true
    },

    expiresOn:{
        type:Date,
        required:true
    },

})

const Offer = mongoose.model("Offer",offerSchema)
module.exports = Offer