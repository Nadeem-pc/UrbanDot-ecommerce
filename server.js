const express = require('express')
const app = express()
const path = require('path')
const env = require('dotenv').config()
const session = require('express-session')
const passport = require('./Config/passport')
const cache = require('nocache') 
const userRouter = require("./Routes/user")
const adminRouter = require("./Routes/admin")
const db = require('./Config/db')
const MongoStore = require('connect-mongo')
db()

app.use(express.json()) 
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        secure : false,
        httpOnly : true,
        maxAge : 48*60*60*1000
    },
    store :  MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(cache())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'Views/User'),path.join(__dirname,'Views/Admin')])
app.use(express.static(path.join(__dirname,'Public')))


// Middleware to set session data for use in views
app.use((req, res, next) => {
    res.locals.isLoggedIn = !!req.session.user; // Check if a user is logged in
    next();
});

app.use('/admin',adminRouter)
app.use('/',userRouter)

app.listen(process.env.PORT, () => {
    console.log("Server is running...");
})