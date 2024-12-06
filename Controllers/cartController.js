const mongoose = require('mongoose')
const Product = require('../Models/productSchema')
const Cart = require('../Models/cartSchema')


const addToCart = async (req,res) => {
    try {
        const productId = new mongoose.Types.ObjectId(req.body.productId)
        const userId = req.session.user
        
        const product = await Product.findById(productId).populate('category');
        let cart = await Cart.findOne({ userId })
        const {regularPrice: price} = product
        
        
        if(!cart){
            cart = new Cart({ userId, items:[{productId, quantity: 1, price, totalPrice: price}] })
            console.log(cart)
        }
        else{
            let productInCart = cart.items.find((item) => item.productId.toString() == productId.toString()) 
            
            if(!productInCart){
                cart.items.push({
                    productId,
                    quantity : 1,
                    totalPrice: price,
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
            return res.render('cart', { cart : { items : [] }})
        }

        cart.totalPrice = cart.items.reduce((total, item) => {
            return total += item.quantity * item.productId.price;
        }, 0)

        res.render('cart', { cart : cart})

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    loadCart,
    addToCart
}