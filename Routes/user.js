const express = require("express")
const user = express.Router()
const userController = require('../Controllers/userController')
const cartController = require('../Controllers/cartController')
const {isBlocked, isLogout, userAuth} = require('../Middlewares/User/userAuth')
const passport  = require("passport")

user.get('/pageNotFound',userController.pageNotFound)

user.get('/', isBlocked, userController.loadHomePage)

user.get('/login',isLogout, userController.loadLogin)

user.post('/login',userController.verifyLogin)

user.get('/signup',isLogout, userController.loadSignUp)

user.post('/signup', userController.insertSignUp)

user.get('/verifyOtp', isLogout, userController.loadVerifyOtp)

user.post('/verifyOtp',userController.verifyOtp)

user.post('/resend-otp',userController.resendOtp)

user.get('/blocked', userController.blockedUser)

user.get('/shop',userController.loadShop)

user.get('/product/:id',userController.loadProductDetail)

user.get('/profile',userAuth, userController.loadProfilePage)

user.post('/editUser',userController.editUserProfile)

user.post('/changePassword',userController.changePassword)

user.post('/addAddress',userController.addAddress)

user.get('/deleteAddress/:mainId/:id',userController.deleteAddress)

user.post('/cart', userAuth, cartController.addToCart)

user.get('/cart', userAuth, cartController.loadCart)

user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    res.redirect('/')
})

module.exports = user   