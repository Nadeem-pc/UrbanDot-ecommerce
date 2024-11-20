const express = require("express")
const user = express.Router()
const authController = require('../Controllers/User/authControllers')
const passport  = require("passport")

user.get('/pageNotFound',authController.pageNotFound)
user.get('/',authController.loadHomePage)
user.get('/login',authController.loadLogin)
user.post('/login',authController.verifyLogin)
user.get('/signup',authController.loadSignUp)
user.post('/signup',authController.insertSignUp)
user.get('/verifyOtp',authController.loadVerifyOtp)
user.post('/verifyOtp',authController.verifyOtp)
user.post('/resend-otp',authController.resendOtp)

user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    res.redirect('/')
})

module.exports = user   