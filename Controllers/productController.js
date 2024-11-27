const Product = require('../Models/productSchema')
const Category = require('../Models/categorySchema')
const User = require('../Models/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')


const loadProducts = async (req,res) => {
    try {
       return res.render('listProducts') 
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


module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct
}