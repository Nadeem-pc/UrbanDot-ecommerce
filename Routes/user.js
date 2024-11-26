const express = require("express")
const user = express.Router()
const authController = require('../Controllers/userController')
const {isBlocked, isLogout, userAuth} = require('../Middlewares/User/userAuth')
const passport  = require("passport")

user.get('/pageNotFound',authController.pageNotFound)

user.get('/', isBlocked, authController.loadHomePage)

user.get('/login',isLogout, authController.loadLogin)

user.post('/login',authController.verifyLogin)

user.get('/signup',isLogout, authController.loadSignUp)

user.post('/signup', authController.insertSignUp)

user.get('/verifyOtp', isLogout, authController.loadVerifyOtp)

user.post('/verifyOtp',authController.verifyOtp)

user.post('/resend-otp',authController.resendOtp)

user.get('/blocked', authController.blockedUser)

user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    res.redirect('/')
})

module.exports = user   