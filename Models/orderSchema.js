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

        discountApplied : {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            default: 'Pending',
        },

        returnStatus : {
            type : Boolean,
            default : false,
        },

        returnReason : {
            type : String,
            default : ""
        },

        adminApprovalStatus: {
            type: String,
            enum: ['Processing','Approved','Rejected'],
            default: 'Processing',
        },

    }],

    totalAmount : {
        type: Number,
        required : true
    },

    totalDiscountApplied : {
        type: Number,
        default: 0
    },

    shipping : {
        type : Number,
        required : true,
        default : 50
    },

    address: {
        type: ObjectId,
        ref: 'Address', 
        required: true,
    },

    orderStatus: {
        type: String,
        enum: ['Pending','Shipped','Delivered','Cancelled','Returned'],
        default: 'Pending',
    },

    paymentStatus: {
        type: String,
        enum : ['Pending','Failed','Success','Refunded'],
        default:'Pending'
    },

    paymentMethod: {
        type: String,
        enum: ['Wallet', 'COD', 'Razorpay'], 
        required: true,
    },

    orderDate : {
        type: Date, 
        default: Date.now,
        required: true,
    },

    createdAt: { type: Date, default: Date.now } 
})

const Order = mongoose.model("Order", orderSchema)
module.exports = Order