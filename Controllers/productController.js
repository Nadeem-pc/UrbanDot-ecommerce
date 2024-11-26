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
        
    }
    catch (error) {
        
    }
}


module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct
}