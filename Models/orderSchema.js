const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

const orderSchema = mongoose.Schema({

    userId : {
        type : ObjectId,
        ref : "User",
        required : true
    },

    orderId : {
        type: String,
        required: true,
        unique: true
    },

    orderedItems : [{
        product : {
            type : ObjectId,
            ref : "Product",
            required : true
        },

        quantity : {
            type: Number,
            required: true,
        },

        price : {
            type: Number,
            required : true
        },

        status: {
            type: String,
            default: 'Pending',
        },
    }],

    totalAmount : {
        type: Number,
        required : true
    },

    address: {
        type: ObjectId,
        ref: 'Address', 
        required: true,
    },

    orderStatus: {
        type: String,
        enum: ['Pending','Shipped','Delivered','Cancelled'],
        default: 'Pending',
    },

    paymentStatus: {
        type: String,
        enum : ['Pending','Failed','Success',],
        default:'Pending'
    },

    paymentMethod: {
        type: String,
        enum: ['Wallet', 'COD', 'razorpay'], 
        required: true,
    },

    orderDate : {
        type : String
    },

},{ timestamps : true } )

const Order = mongoose.model("Order", orderSchema)
module.exports = Order