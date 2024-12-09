// Frontend Validation (Optional JavaScript Example):
function validateProductName(productName) {
    const minLength = 3;
    const maxLength = 100;
    const allowedCharacters = /^[a-zA-Z0-9\s\-\&\.\']+$/;

    if (!productName) {
        return "Product name cannot be empty.";
    }
    if (productName.length < minLength || productName.length > maxLength) {
        return `Product name must be between ${minLength} and ${maxLength} characters.`;
    }
    if (!allowedCharacters.test(productName)) {
        return "Product name contains invalid characters.";
    }
    return "Valid";
}


// Backend Validation with Express.js and Mongoose:
// Validation Logic in Controller:
const Product = require('../models/product'); // Assuming you have a Mongoose Product model.

const validateProductName = async (req, res, next) => {
    const { productName } = req.body;

    // Validation criteria
    const minLength = 3;
    const maxLength = 100;
    const allowedCharacters = /^[a-zA-Z0-9\s\-\&\.\']+$/;

    if (!productName) {
        return res.status(400).json({ error: "Product name cannot be empty." });
    }
    if (productName.length < minLength || productName.length > maxLength) {
        return res.status(400).json({ error: `Product name must be between ${minLength} and ${maxLength} characters.` });
    }
    if (!allowedCharacters.test(productName)) {
        return res.status(400).json({ error: "Product name contains invalid characters." });
    }

    // Check uniqueness
    const existingProduct = await Product.findOne({ name: productName });
    if (existingProduct) {
        return res.status(400).json({ error: "Product name already exists." });
    }

    next(); // Proceed to the next middleware or route handler
};

module.exports = validateProductName;

// 2.	Route Implementation:
const express = require('express');
const router = express.Router();
const validateProductName = require('../middlewares/validateProductName');
const Product = require('../models/product');

// Create product route
router.post('/products', validateProductName, async (req, res) => {
    try {
        const { productName, ...rest } = req.body;

        // Create and save the product
        const newProduct = new Product({
            name: productName,
            ...rest
        });
        await newProduct.save();

        res.status(201).json({ message: "Product created successfully." });
    } catch (error) {
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const validateProductName = require('../middlewares/validateProductName');
const Product = require('../models/product');

// Create product route
router.post('/products', validateProductName, async (req, res) => {
    try {
        const { productName, ...rest } = req.body;

        // Create and save the product
        const newProduct = new Product({
            name: productName,
            ...rest
        });
        await newProduct.save();

        res.status(201).json({ message: "Product created successfully." });
    } catch (error) {
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;

// 3.	Mongoose Schema:
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 100,
        match: /^[a-zA-Z0-9\s\-\&\.\']+$/
    },
    // Other fields like price, description, etc.
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);