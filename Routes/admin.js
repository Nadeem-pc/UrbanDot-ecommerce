const express = require('express')
const admin = express.Router()

const adminController = require('../Controllers/admin/adminController')
const categoryController = require('../Controllers/admin/categoryController')
const productController = require('../Controllers/admin/productController')
const userController = require('../Controllers/admin/userController')
const orderController = require('../Controllers/admin/orderController')
const stockController = require('../Controllers/admin/stockController')
const salesController = require('../Controllers/admin/salesController')
const offerController = require('../Controllers/admin/offerController')
const couponController = require('../Controllers/admin/couponController')
const dashboardController = require('../Controllers/admin/dashboardController')

const authMiddleware = require('../Middlewares/Admin/adminAuth')
const storage = require('../Middlewares/Admin/multer')
const multer = require('multer') 
const upload = multer({storage:storage})

// AUTHENTICATION MANAGEMENT 
admin.get('/login', authMiddleware.isLogout, adminController.loadAdminLogin)
admin.post('/login', adminController.verifyLogin)
admin.get('/logout', adminController.logout)

// DASHBOARD MANAGEMENT
admin.get('/dashboard', authMiddleware.isLogin, dashboardController.loadHome)
admin.get('/filtered_data',dashboardController.getFilteredData)

// USER MANAGEMENT 
admin.get('/users', authMiddleware.isLogin, userController.listUsers)
admin.put('/toogleBlock', userController.blockUser)

// CATEGORY MANAGEMENT
admin.get('/category', authMiddleware.isLogin, categoryController.loadCategories)
admin.get('/addCategory', authMiddleware.isLogin, categoryController.loadAddCategory)
admin.post('/addCategory', categoryController.addCategory)
admin.get('/listCategory',authMiddleware.isLogin, categoryController.listCategory)
admin.get('/unlistCategory', categoryController.unlistCategory)
admin.get('/editCategory/:id', authMiddleware.isLogin, categoryController.loadEditCategory)
admin.post('/editCategory',categoryController.editCategory)

// PRODUCT MANAGEMENT 
admin.get('/products',authMiddleware.isLogin, productController.loadProducts)
admin.post('/addProduct', upload.array("images",3), productController.addProduct)
admin.get('/addProduct',authMiddleware.isLogin, productController.loadAddProduct)
admin.post('/editProduct/:id', upload.array("images",3), productController.editProduct)
admin.get('/toogleProductBlock/:id/:status', productController.productBlockAndUnblock);
admin.get('/editProduct/:id',authMiddleware.isLogin, productController.loadEditProduct)

// ORDER MANAGEMENT
admin.get('/orders',authMiddleware.isLogin,orderController.getOrdersList)
admin.get('/orderDetails/:id',authMiddleware.isLogin, orderController.getOrderDetails)
admin.post('/updateOrderStatus',orderController.updateOrderStatus)
admin.post('/cancelOrder',orderController.cancelOrder)
admin.post('/returnProduct',orderController.approveReturnReq)

// STOCK MANAGEMENT
admin.get('/stocks',authMiddleware.isLogin,stockController.getStockDetails)
admin.post('/updateStock',stockController.updateProductStock)

// SALES REPORT
admin.get('/sales',authMiddleware.isLogin,salesController.loadSalesReport)
admin.get('/generate-excel',salesController.generateExcelReport)
admin.get('/generate-pdf',salesController.generatePDFReport)

// COUPON MANAGEMENT
admin.get('/coupons',authMiddleware.isLogin,couponController.loadCoupons)
admin.post('/addCoupon',couponController.createCoupon)
admin.patch('/unlistCoupon',couponController.deleteCoupon)

// OFFER MANAGEMENT
admin.get('/offer',authMiddleware.isLogin,offerController.loadOffer)
admin.post('/offer',offerController.addOffer)
admin.delete('/deleteOffer',offerController.deleteOffer)

// 404
admin.get('/pageNotFound',adminController.pageNotFound)

admin.use(adminController.pageNotFound)

module.exports = admin