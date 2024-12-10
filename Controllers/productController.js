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

const addProduct = async (req, res) => {
    try {
        const { name, description, category, price, quantity } = req.body;
      
        

        // Check for duplicate products
        const productExists = await Product.findOne({ productName: name });
        if (productExists) {
            return res.status(400).json({ status: false, message: "Product already exists" });
        }

        // Validate category
        const categoryData = await Category.findOne({ name: category });
        if (!categoryData) {
            return res.status(400).json({ status: false, message: "Invalid category" });
        }

        // Handle image uploads
        const images = [];
        if (req.files && req.files.length) {
            for (const file of req.files) {
                const resizedPath = path.join('Public', 'uploads', 'product-images', file.filename);
                await sharp(file.path).resize({ width: 350, height: 419 }).toFile(resizedPath);
                images.push(file.filename);
            }
        }

        console.log(images);
        

        // Create and save new product
        const newProduct = new Product({
            productName: name,
            description,
            category: categoryData._id,
            regularPrice: price,
            stock: quantity,
            images,
        });

        await newProduct.save();
        return res.status(201).json({ status: true, message: "Product added successfully" });
    } catch (error) {
        console.error("Error adding product:", error.message);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const productBlockAndUnblock = async (req, res) => {
    const { id, status } = req.params;
    try {
        const blockStatus = status === 'true';
        await Product.updateOne({ _id: id }, { $set: { isBlocked: blockStatus } });
        res.status(200).json({ success: true, message: `Product successfully ${blockStatus ? 'blocked' : 'unblocked'}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

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