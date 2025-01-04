const mongoose = require('mongoose')
const Category = require('./categorySchema')

const ObjectId = mongoose.Schema.Types.ObjectId

const productSchema = mongoose.Schema({
    productName : {
        type : String,
        required : true
    },

    description : {
        type : String,
        required : true
    },

    // specification : {
    //     type : String,
    //     required : true
    // },

    category : {
        type : ObjectId,
        ref : "Category",
        required : true
    },

    regularPrice: {
        type: Number,
        required: true
    },

    offerPrice : {
        type: Number,
    },

    stock : {
        type: Number,
        default : true 
    },

    images : {
        type : [String],
        required : true
    },

    avgRating : {
        type : Number,
        required : false
    },

    isBlocked : {
        type : Boolean,
        default : false 
    } 
    
}, { timestamps : true })

const Product = mongoose.model("Product",productSchema)
module.exports = Product