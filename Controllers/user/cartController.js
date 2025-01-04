const mongoose = require('mongoose')
const Cart = require('../../Models/cartSchema')
const Product = require('../../Models/productSchema')
const Wishlist = require('../../Models/wishlistSchema')


const addToCart = async (req, res) => {
    try {
        const productId = new mongoose.Types.ObjectId(req.body.productId);
        const quantity = req.body.quantity;
        const userId = req.session.user;

        // Fetch the product and determine the price (offerPrice or regularPrice)
        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const price = product.offerPrice !== null ? product.offerPrice : product.regularPrice;

        // Find or create the cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            // Create a new cart if it doesn't exist
            cart = new Cart({
                userId,
                items: [{ productId, quantity, price, totalPrice: price * quantity }],
            });
        } else {
            // Check if the product already exists in the cart
            const productInCart = cart.items.find((item) => item.productId.toString() === productId.toString());

            if (!productInCart) {
                // Add new product to cart
                cart.items.push({
                    productId,
                    quantity,
                    price,
                    totalPrice: price * quantity,
                });
            } else {
                return res.json({ status: false, message: "Product already exists in cart" });
            }
        }

        // Check if the product is in the wishlist and remove it
        const productInWishlist = await Wishlist.findOne({ userId, "items.productId": productId });
        if (productInWishlist) {
            await Wishlist.updateOne(
                { userId },
                { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } }
            );
        }

        // Save the updated cart
        await cart.save();
        res.status(200).json({ status: true, message: "Product added to cart" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const loadCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.session.user }).populate('items.productId');

        if (!cart) {
            return res.render('cart', { cart });
        }

        cart.totalPrice = cart.items.reduce((total, item) => {
            const price = item.productId.offerPrice !== null ? item.productId.offerPrice : item.productId.regularPrice;
            return total + item.quantity * price;
        }, 0);

        res.render('cart', { cart });
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound'); 
    }
};

const removeProduct = async (req,res) => {
    try {
        const{mainId,productId} = req.body

        await Cart.updateOne(
            { _id: new mongoose.Types.ObjectId(mainId) }, 
            { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } } 
        );
        
        return res.json({status:true,message:"Product removed from cart"})
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const updateCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.user;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const maxAllowedQuantity = Math.min(product.stock, 10);
        if (quantity > maxAllowedQuantity) {
            return res.status(400).json({
                success: false,
                message: `Maximum quantity allowed is ${maxAllowedQuantity}.`,
            });
        }

        const price = product.offerPrice !== null ? product.offerPrice : product.regularPrice;
        const totalPrice = price * quantity;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex !== -1) {
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].totalPrice = totalPrice;
        } else {
            cart.items.push({ productId, quantity, price, totalPrice });
        }

        await cart.save();

        // Calculate the cart subtotal
        const cartSubtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        res.status(200).json({
            success: true,
            message: "Cart updated successfully.",
            totalPrice,
            cartSubtotal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


module.exports = { loadCart, addToCart, removeProduct, updateCart }