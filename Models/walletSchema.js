const mongoose = require ('mongoose')
const ObjectId = mongoose.Types.ObjectId

const walletSchema = mongoose.Schema ({
    userId : {
        type : ObjectId,
        ref : "User",
        required : true
    },

    balanceAmount : {
        type : Number,
        default : 0
    },

    transactions: [{
        type: {
            type: String,
            required: true
        },

        amount: {
            type: Number,
            required: true
        },

        date: {
            type: Date,
            default: Date.now()
        },

        description: {
            type: String,
            required: true
        }
    }]
})

const Wallet = mongoose.model("Wallet", walletSchema)
module.exports = Wallet