const mongoose = require('mongoose')
const env = require('dotenv').config()

const connectDb = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database Connected Successfully"); 
    }
    catch(error){
        console.log("Database Connection Error",error.message);
        process.exit(1)
    }
}

module.exports = connectDb
