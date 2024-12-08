const Order = require('../Models/orderSchema')
const Product = require('../Models/productSchema')
const User = require('../Models/userSchema')
const Address = require('../Models/addressSchema')
const mongoose = require('mongoose')
const Cart = require('../Models/cartSchema')
const { json } = require('express')

const loadCheckout = async (req,res) => {
    try {
        const cartId = req.params
        let cart = await Cart.findOne({_id:new mongoose.Types.ObjectId(cartId)}).populate('items.productId')   
        
        return res.render('checkout',{cart,totalPrice:req.session.totalPrice, products:req.session.products})

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const loadFirstPageOfCheckout = async (req,res) => {
    try {
        const id = req.session.user
        let cart = await Cart.findOne({userId:new mongoose.Types.ObjectId(id)}).populate('items.productId')
        let address = await Address.findOne({user:id})

        // Filter items that satisfy the conditions
        const validItems = [];
        for (const item of cart.items) {
            const product = await Product.findById(item.productId).populate('category');

            if (
                product &&
                !product.isBlocked &&
                product.category.isActive !== false &&
                product.stock > 0 &&
                product.stock >= item.quantity
            ) {
                validItems.push({ ...item.toObject(), product });
            }
        }

        if (!validItems.length) {
            return res.status(400).json({
                success: false,
                message: 'No valid products available for payment.'
            });
        }

        // Calculate total price for valid products
        const totalPrice = validItems.reduce((total, item) => {
            return total + item.quantity * item.product.regularPrice;
        }, 0);

        req.session.totalPrice = totalPrice
        req.session.products = validItems
        
        return res.render('checkoutFirstSlide',{address,cart,totalPrice})

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const loadPaymentPage = async (req, res) => {
    try {
        const id = req.session.user;

        const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(id) }).populate('items.productId');

        // Render payment page with valid products and totalPrice
        return res.render('payment', { products: req.session.products, totalPrice : req.session.totalPrice });

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const getUserAddress = async (req,res) => {
    try {
        const{address} = req.body
       req.session.userAddress = address
       
       const products = req.session.products

       if(req.session.userAddress){
        return res.json({status:true})
       }
       else{
        return res.json({status:false,message:"Select an Address to Deliver"})
       }
           
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const storeOrderDetails = async (req,res) => {
    try {
        const user = req.session.user
        const{paymentMethod} = req.body

        const date = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        const formattedDate = `${month} ${day} ${year}`;

        const newOrder = new Order({
            userId : user,
            address : req.session.userAddress,
            paymentMethod,
            orderedItems : req.session.products,
            totalAmount : req.session.totalPrice,
            orderDate : formattedDate,
            paymentStatus: 'Pending'
        })
       
        await newOrder.save()
        await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } })
        req.session.orderId = await Order.findOne({_id:newOrder._id})

        const COD = await Order.findOne({_id:newOrder._id,paymentMethod:"COD"})
        if(COD){
            res.status(201).json({ success: true})
        }
       
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const showOrderPlaced = async (req,res) => {
    try {
        orderId =  req.session.orderId
        return res.render('orderPlaced',{orderId})

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}


// ADMIN SIDE

const getOrdersList = async (req,res) => {
    try {
        let orders = await Order.aggregate([
            { $lookup: {
              from: 'users',
              localField: "userId",
              foreignField: "_id",
              as: "userDetails"
            }},
        ])
        
        return res.render('listOrders',{orders})
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const getOrderDetails = async (req,res) => {
    try {
        const id = req.params
        const order = await Order.findOne()

        const orderDetails = await Order.aggregate([
            { $match : {_id:new mongoose.Types.ObjectId(id)}},
            
            { $lookup: {
                from: 'users',
                localField: "userId",
                foreignField: "_id",
                as: "userDetails"
              }},

            { $unwind:"$orderedItems"},
            { $lookup: {
              from: 'products',
              localField: 'orderedItems.product',
              foreignField: '_id',
              as: 'productDetails'
            }},

            { $lookup: {
              from: 'addresses',
              localField: 'address',
              foreignField: 'address._id',
              as: "userAddress"
            }}
        ])
        
        return res.render('orderDetail',{order,orderDetails})

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}


module.exports = {
    loadCheckout,
    getUserAddress,
    loadPaymentPage,
    showOrderPlaced,
    storeOrderDetails,
    loadFirstPageOfCheckout,

    getOrdersList,
    getOrderDetails

}