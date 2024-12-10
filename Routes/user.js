const express = require("express")
const user = express.Router()
const passport  = require("passport")
const userController = require('../Controllers/user/userController')
const cartController = require('../Controllers/user/cartController')
const orderController = require('../Controllers/user/orderController')
const profileController = require('../Controllers/user/profileController')
const addressController = require('../Controllers/user/addressController')
const ShoppingController = require('../Controllers/user/shoppingController')
const {isBlocked, isLogout, userAuth} = require('../Middlewares/User/userAuth')

// Home Page
user.get('/', isBlocked, userController.loadHomePage)

// Login & Logout Management
user.post('/login',userController.verifyLogin)
user.get('/login',isLogout, userController.loadLogin)
user.post('/logout', userController.logout)

// SignUp Management
user.get('/signup',isLogout, userController.loadSignUp)
user.post('/signup', userController.insertSignUp)

// OTP Verification
user.get('/verifyOtp', isLogout, userController.loadVerifyOtp)
user.post('/verifyOtp',userController.verifyOtp)
user.post('/resend-otp',userController.resendOtp)

// Shopping page
user.get('/shop', isBlocked, ShoppingController.loadShop)
user.get('/product/:id', isBlocked, ShoppingController.loadProductDetail)

// Profile Management
user.get('/profile',isBlocked, userAuth, profileController.loadProfilePage)
user.post('/editUser',profileController.editUserProfile)
user.post('/changePassword',userController.changePassword)
user.post('/addAddress',addressController.addAddress)
user.get('/editAddress/:id', isBlocked, userAuth, addressController.loadEditAddress)
user.post('/editAddress',userAuth, addressController.editAddress)
user.get('/deleteAddress/:mainId/:id',addressController.deleteAddress)

// Cart Management
user.get('/cart', isBlocked, userAuth, cartController.loadCart)
user.post('/cart', userAuth, cartController.addToCart)
user.post('/removeProduct',cartController.removeProduct)

// Order Management
user.post('/cancelProduct',orderController.cancelProduct)
user.get('/orderDetails/:orderId', isBlocked, userAuth, orderController.getOrderDetailsForUser)

// Checkout Management
user.get('/checkoutInitial',isBlocked, userAuth,orderController.loadFirstPageOfCheckout)
user.get('/checkout/:id',isBlocked,userAuth,orderController.loadCheckout)
user.get('/payment',isBlocked,userAuth, orderController.loadPaymentPage)
user.post('/getUserAddress',orderController.getUserAddress)
user.post('/storeOrderDetails',orderController.storeOrderDetails)
user.get('/orderPlaced',isBlocked,userAuth, orderController.showOrderPlaced)

// Others
user.get('/blocked', userController.blockedUser)
user.get('/pageNotFound',userController.pageNotFound)

// Google Authentication
user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    res.redirect('/')
})


module.exports = user   