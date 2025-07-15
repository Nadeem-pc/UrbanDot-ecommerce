const User = require('../../Models/userSchema')
const Product = require('../../Models/productSchema')
const Category = require('../../Models/categorySchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { default: mongoose } = require('mongoose')


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
        res.redirect('/admin/pageNotFound')
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
        res.redirect('/admin/pageNotFound')
    }
}

const addProduct = async (req, res) => {
    try {
        const { name, description, category, offerPrice, regularPrice, quantity } = req.body;
      
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

        // Create and save new product
        const newProduct = new Product({
            productName: name,
            description,
            category: categoryData._id,
            regularPrice,
            offerPrice,
            stock: quantity,
            images,
        });

        await newProduct.save();
        return res.status(201).json({ status: true, message: "Product added successfully" });

    }catch (error) {
        console.error("Error adding product:", error.message);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
}

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
}

const loadEditProduct = async(req,res) => {
    const {id} = req.params
    try {
        let product = await Product.findOne({_id:id}).populate('category')
        let category = await Category.find()
        return res.render('editProduct',{product,category})
    }
    catch (error) {
       console.log(error);
       res.redirect('/admin/pageNotFound')
    }
}

const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;

        const fieldsToUpdate = ['productName', 'description', 'regularPrice', 'offerPrice', 'category'];

        const updateData = {};
        fieldsToUpdate.forEach(field => {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        });

        if (req.files && req.files.length) {
            const images = [];
            for (const file of req.files) {
                const resizedPath = path.join('Public', 'uploads', 'product-images', file.filename);
                await sharp(file.path).resize({ width: 350, height: 419 }).toFile(resizedPath);
                images.push(file.filename);
            }
            updateData.images = images;
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true });

        if (!updatedProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }
        return res.status(200).json({ status: true, message: "Product updated successfully", product: updatedProduct });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


module.exports = {
    addProduct,
    editProduct,
    loadProducts,
    loadAddProduct,
    loadEditProduct,
    productBlockAndUnblock
}