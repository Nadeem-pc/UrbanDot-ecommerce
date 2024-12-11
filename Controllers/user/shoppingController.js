const Product = require("../../Models/productSchema")
const Category = require("../../Models/categorySchema")

const express = require("express");
const mongoose = require('mongoose')
const session = require('express-session');


const loadShop = async (req, res) => {
    try {
      const { sort = 'new-arrivals', category = '', page = 1, search = '' } = req.query; // Include search parameter
      const limit = 6; // Products per page
      const skip = (page - 1) * limit;
  
      // Fetch listed categories for filtering
      const listedCategories = await Category.find({ isListed: true }).select('_id'); // Fetch IDs of listed categories
  
      // Build the query object
      const query = { 
        isBlocked: false, // Exclude blocked products
        category: { $in: listedCategories.map(cat => cat._id) }, // Exclude products from unlisted categories
      };
      if (category) {
        query.category = category; // Include specific category if provided
      }
      if (search) {
        query.productName = { $regex: search, $options: 'i' }; // Case-insensitive search
      }
  
      // Sorting options
      let sortOption = {};
      switch (sort) {
        case "low-to-high":
          sortOption.regularPrice = 1;
          break;
        case "high-to-low":
          sortOption.regularPrice = -1;
          break;
        case "name-asc":
          sortOption.productName = 1;
          break;
        case "name-desc":
          sortOption.productName = -1;
          break;
        default:
          sortOption.createdAt = -1; // Default: New arrivals
      }
  
      // Fetch products with filters, sorting, pagination, and search
      const products = await Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit);
  
      // Count total products for pagination
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
  
      // Fetch all categories for the sidebar (only include listed categories)
      const categories = await Category.find({ isListed: true });
  
      // Render the shop page
      res.render("shop", {
        products,
        categories,
        currentPage: parseInt(page, 10),
        totalPages,
        sort,
        selectedCategory: category,
        searchTerm: search,
      });
    } catch (error) {
      console.error("Error in loadShop:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
}

const loadProductDetail = async (req,res) => {
    const {id} = req.params  
    try {
        const product = await Product.findOne({_id:id,isBlocked:false})
        const recommendedProducts = await Product.find({
            category : product.category,
            _id : {$ne:id}
        }).limit(4)
        res.render('productDetail',{product, recommendedProducts})
    }
    catch (error) {
        console.log(error);
        res.redirect('/unavailable')
    }
}

const productUnavailable = async (req,res) => {
    try {
        return res.render('productUnavailable')
    } catch (error) {
        console.error("Error in loadShop:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { loadShop, loadProductDetail, productUnavailable }