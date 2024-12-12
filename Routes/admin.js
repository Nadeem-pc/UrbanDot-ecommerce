const express = require('express')
const admin = express.Router()

const adminController = require('../Controllers/admin/adminController')
const categoryController = require('../Controllers/admin/categoryController')
const productController = require('../Controllers/admin/productController')
const orderController = require('../Controllers/admin/orderController')
const userController = require('../Controllers/admin/userController')
const stockController = require('../Controllers/admin/stockController')

const authMiddleware = require('../Middlewares/Admin/adminAuth')
const storage = require('../Middlewares/Admin/multer')
const multer = require('multer') 
const upload = multer({storage:storage})

// AUTHENTICATION MANAGEMENT 
admin.get('/login', authMiddleware.isLogout, adminController.loadAdminLogin)
admin.post('/login', adminController.verifyLogin)
admin.get('/dashboard', authMiddleware.isLogin, adminController.loadHome)

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

// STOCK MANAGEMENT
admin.get('/stocks',authMiddleware.isLogin,stockController.getStockDetails)
admin.post('/updateStock',stockController.updateProductStock)


module.exports = admin