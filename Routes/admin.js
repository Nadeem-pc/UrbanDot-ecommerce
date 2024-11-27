const express = require('express')
const admin = express.Router()
const adminController = require('../Controllers/adminController')
const categoryController = require('../Controllers/categoryController')
const productController = require('../Controllers/productController')
const authMiddleware = require('../Middlewares/Admin/adminAuth')
const multer = require('multer') 
const storage = require('../Middlewares/Admin/multer')
const upload = multer({storage:storage})

// AUTHENTICATION MANAGEMENT 
admin.get('/login', authMiddleware.isLogout, adminController.loadAdminLogin)
admin.post('/login', adminController.verifyLogin)
admin.get('/dashboard', authMiddleware.isLogin, adminController.loadHome)

// USER MANAGEMENT 
admin.get('/users', authMiddleware.isLogin, adminController.listUsers)
admin.put('/toogleBlock', adminController.blockUser)

// CATEGORY MANAGEMENT
admin.get('/category', authMiddleware.isLogin, categoryController.loadCategories)
admin.get('/addCategory', authMiddleware.isLogin, categoryController.loadAddCategory)
admin.post('/addCategory', categoryController.addCategory)
admin.get('/listCategory', categoryController.listCategory)
admin.get('/unlistCategory', categoryController.unlistCategory)
admin.get('/editCategory/:id', authMiddleware.isLogin, categoryController.loadEditCategory)
admin.post('/editCategory',categoryController.editCategory)

// PRODUCT MANAGEMENT 
admin.get('/products', authMiddleware.isLogin, productController.loadProducts)
admin.get('/addProduct', productController.loadAddProduct)
admin.post('/addProduct', upload.array("images",3), productController.addProduct)


module.exports = admin