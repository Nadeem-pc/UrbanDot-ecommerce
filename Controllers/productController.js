const Product = require('../Models/productSchema')
const Category = require('../Models/categorySchema')
const User = require('../Models/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { log } = require('console')


const loadProducts = async (req,res) => {
    try {
        // const search = req.query.search || ""
        // let search = ""
        // if(req.query.search){
        //     search = req.query.search
        // }
        const page = parseInt(req.query.page) || 1
        const limit = 8

        const productData = await Product.find({
            // $or:[
            //     {productName:{$regex:".*"+search+".*"}},
            //     {category:{$regex:".*"+search+".*"}}
            // ],
        })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('category')
        .exec(); 

        // const count = await Product.find({
        //     $or:[
        //         {productName:{$regex:".*"+search+".*"}},
        //         {category:{$regex:".*"+search+".*"}}
        //     ],
        // }).countDocuments()
        const count = await Product.countDocuments();

        const category = await Category.find({isListed:true})

        if(category){
            res.render('listProducts',{
                data : productData,
                currentPage : page,
                totalPages : Math.ceil(count/limit),
                cat : category
            }) 
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
}

const loadAddProduct = async (req,res) => {
    try {
        const category = await Category.find({isListed:true})
        return res.render('addProduct',{
            cat : category
        })    
    }
    catch (error) {
        console.log(error);
        return res.status(500).json("Internal Server Error");
    }
}

const addProduct = async (req,res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName  : products.name,
        })

        if(!productExists){
            const images = [];

            if(req.files && req.files.length > 0){
                for(let i = 0; i < req.files.length; i++){
                    const originalImagePath = req.files[i].path
                    const resizedImagePath = path.join('Public','uploads','product-images',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:350,height:419}).toFile(resizedImagePath)
                    images.push(req.files[i].filename)
                }
            }

            const categoryId = await Category.findOne({name:products.category})
            if(!categoryId){
                return res.status(400).json({status:false, message:"Invalid category"})
            }

            const newProduct = new Product({
                productName : products.name, 
                description : products.description,
                category : categoryId._id,
                regularPrice : products.price,
                stock : products.quantity,
                images : images 
            }) 

            await newProduct.save()

            return res.status(201).json({status:true, message:"Product added successfully"})
 
        }else{
            return res.status(400).json({status:false, message:"Product already exists"})
        }
    }
    catch (error) {
        console.log(error.message);
        // return res.status(500).json({status:false,message:'somwthing wrong'});
    }
}

const productBlockAndUnblock = async (req,res) => {
    const {id,status} = req.params
    try {
        await Product.updateOne({_id:id},{$set:{isBlocked:status}})
        res.redirect('/admin/products')
    }
    catch (error) {
       console.log(error);
    } 
}

const loadEditProduct = async(req,res) => {
    const {id} = req.params
    try {
        let product = await Product.findOne({_id:id})
        let category = await Category.findOne({name:product.category})
        return res.render('editProduct',{product,category})
    }
    catch (error) {
       console.log(error);
    }
}



module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct,
    productBlockAndUnblock,
    loadEditProduct
}