const mongoose = require('mongoose')

const adminSchmema = mongoose.Schema({
    email : {
        type : String,
        required : true
    },

    password : {
        type : String,
        required : true
    }
})

const Admin = mongoose.model("Admin",adminSchmema)
module.exports = Admin