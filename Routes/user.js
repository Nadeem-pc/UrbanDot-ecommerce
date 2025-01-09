const express = require("express")
const user = express.Router()
const passport  = require("passport")
const userController = require('../Controllers/user/userController')
const cartController = require('../Controllers/user/cartController')
const orderController = require('../Controllers/user/orderController')
const walletController = require('../Controllers/user/walletController')
const profileController = require('../Controllers/user/profileController')
const addressController = require('../Controllers/user/addressController')
const ShoppingController = require('../Controllers/user/shoppingController')
const wishlistController = require('../Controllers/user/wishlistController')
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

// Forgot Password
user.get('/forgotPassword', isBlocked,userController.loadForgotPassword)
user.post('/forgotPassword',userController.forgotPassword)
user.get('/changePassword/:token', userController.loadChangePassword)
user.post('/changePassword/:token', userController.updatePassword)

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
user.get('/wallet',isBlocked, userAuth,walletController.loadWallet)

// Cart Management
user.get('/cart', isBlocked, userAuth, cartController.loadCart)
user.post('/cart', userAuth, cartController.addToCart)
user.post('/removeProduct',cartController.removeProduct)
user.post('/cart/update',cartController.updateCart)

// Wishlist Management
user.get('/wishlist', isBlocked, userAuth, wishlistController.loadWishlist)
user.post('/wishlist',wishlistController.addToWishlist)
user.delete('/wishlist/remove/:productId',wishlistController.removeProduct)

// Order Management
user.post('/cancelProduct',orderController.cancelProduct)
user.post('/cancelOrder',orderController.cancelOrder)
user.post('/storeOrderDetails',orderController.storeOrderDetails)
user.get('/orderPlaced',isBlocked,userAuth, orderController.showOrderPlaced)
user.post('/returnProduct',orderController.returnProduct)
user.get('/downloadInvoice/:orderId',orderController.downloadInvoice)
user.get('/orderDetails/:orderId', isBlocked, userAuth, orderController.getOrderDetailsForUser)
user.post('/removeCoupon',orderController.removeCoupon)

// Checkout Management
user.get('/checkoutInitial',isBlocked, userAuth,orderController.loadFirstPageOfCheckout)
user.get('/checkout/:id',isBlocked,userAuth,orderController.loadAddNewAddress)
user.post('/addNewAddress',orderController.addNewAddress)
user.get('/payment',isBlocked,userAuth, orderController.loadPaymentPage)
user.post('/getUserAddress',orderController.getUserAddressInCheckout)
user.post('/createRazorpayOrder',orderController.createRazorpayOrder);
user.post('/verifyRazorpayPayment',orderController.verifyRazorpayPayment);
user.post('/verifyCoupon',orderController.verifyCoupon)
user.post('/handleFailedPayment',orderController.handleFailedPayment);
user.post('/retryPayment',orderController.retryPayment)

// Others
user.get('/blocked', userController.blockedUser)
user.get('/pageNotFound',userController.pageNotFound)
user.get('/unavailable',ShoppingController.productUnavailable)

// Google Authentication
user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    req.session.user = req.user._id
    res.redirect('/')
})

user.use(userController.pageNotFound)

module.exports = user   