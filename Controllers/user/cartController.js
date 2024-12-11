const mongoose = require('mongoose')
const Cart = require('../../Models/cartSchema')
const Product = require('../../Models/productSchema')


const addToCart = async (req,res) => {
    try {
        const productId = new mongoose.Types.ObjectId(req.body.productId)
        let quantity = req.body.quantity
        const userId = req.session.user
        
        const product = await Product.findById(productId).populate('category');
        let cart = await Cart.findOne({ userId })
        const {regularPrice: price} = product
        
        
        if(!cart){
            cart = new Cart({ userId, items:[{productId, quantity, price, totalPrice: price * quantity}] })
            console.log(cart)
        }
        else{
            let productInCart = cart.items.find((item) => item.productId.toString() == productId.toString()) 
            
            if(!productInCart){
                cart.items.push({
                    productId,
                    quantity,
                    totalPrice: price * quantity,
                    price
                })
            }
            else{
               return res.json({status : false, message:"Product already exist in cart"})
            }     
        }
        await cart.save();
        res.status(200).json({ status : true, message: "Product added to cart"}); 

    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const loadCart = async (req,res) => {
    try {
        const cart = await Cart.findOne({ userId : req.session.user }).populate('items.productId')
        
        if(!cart){
            return res.render('cart', { cart })
        }

        cart.totalPrice = cart.items.reduce((total, item) => {
            return total += item.quantity * item.productId.regularPrice;
        }, 0)

        res.render('cart', {cart : cart})

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

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

const updateCart = async (req,res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.user
    
    try {

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const price = product.regularPrice; 
        const totalPrice = price * quantity;

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        // Update the specific product in the cart
        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex !== -1) {
            // If the item exists, update the quantity and totalPrice
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].totalPrice = totalPrice;
        } else {
            // If the item doesn't exist, add it
            cart.items.push({ productId, quantity, price, totalPrice });
        }

        // Save the updated cart
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
}


module.exports = { loadCart, addToCart, removeProduct, updateCart }