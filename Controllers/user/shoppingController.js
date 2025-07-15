const Product = require("../../Models/productSchema")
const Category = require("../../Models/categorySchema")

const express = require("express");
const mongoose = require('mongoose')
const session = require('express-session');


const loadShop = async (req, res) => {
  try {
    const { sort = 'new-arrivals', category = '', page = 1, search = '' } = req.query; 
    const limit = 6; 
    const skip = (page - 1) * limit;

    const listedCategories = await Category.find({ isListed: true }).select('_id'); 

    const query = { 
      isBlocked: false, 
      category: { $in: listedCategories.map(cat => cat._id) },
    };
    if (category) {
      query.category = category; 
    }
    if (search) {
      query.productName = { $regex: search, $options: 'i' }; 
    }

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
        sortOption.createdAt = -1; 
    }

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find({ isListed: true });

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

const loadProductDetail = async (req, res) => {
  const { id } = req.params;
  try {
      const product = await Product.findOne({ _id: id, isBlocked: false })
      .populate({
        path: 'category',
        match: { isListed: true }
    });
    if (!product || !product.category) {
      return res.redirect('/unavailable');
  }

      const recommendedProducts = await Product.find({
          category: product.category,
          _id: { $ne: id }
      }).limit(4);

      res.render('productDetail', { product, recommendedProducts });
  } catch (error) {
      console.log(error);
      res.redirect('/unavailable');
  }
};

const productUnavailable = async (req,res) => {
  try {
    return res.render('productUnavailable')
  } catch (error) {
    console.error("Error in loadShop:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


module.exports = { loadShop, loadProductDetail, productUnavailable }