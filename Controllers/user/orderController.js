const User = require('../../Models/userSchema')
const Cart = require('../../Models/cartSchema')
const Order = require('../../Models/orderSchema')
const Product = require('../../Models/productSchema')
const Address = require('../../Models/addressSchema')

const mongoose = require('mongoose')
const express = require('express')
const { use } = require('passport')
const session = require('express-session')


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
            return res.redirect('/unavailable')
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

const loadAddNewAddress = async (req,res) => {
    try {
        const cartId = req.params
        let cart = await Cart.findOne({_id:new mongoose.Types.ObjectId(cartId)}).populate('items.productId')   
        
        return res.render('addNewAddress',{cart,totalPrice:req.session.totalPrice, products:req.session.products})

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const addNewAddress = async (req,res) => {
    const{name,phone,pincode,city,fullAddress,country,state,addressType} = req.body
    const userId = req.session.user

    try {
        const userData = await User.findOne({_id:userId})
        const userAddress = await Address.findOne({user:userData._id})

        if(!userAddress){
            const newAddress = new Address({
                user : userData._id,
                address : [{addressType,name,city,pincode,phone,country,state,fullAddress}]
            });

            await newAddress.save()
            return res.status(200).json({status:true})
        }
        else{
            userAddress.address.push({addressType,name,city,pincode,phone,country,state,fullAddress})
            await userAddress.save()
            return res.status(200).json({status:true})
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
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
        req.session.orderId = generateOrderId()
        
        const newOrder = new Order({
            userId : user,
            paymentMethod,
            paymentStatus: 'Pending',
            orderDate : formattedDate,
            orderId : req.session.orderId,
            address : req.session.userAddress,
            orderedItems : req.session.products,
            totalAmount : req.session.totalPrice,
        })
       
        await newOrder.save()
        await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } })

        const COD = await Order.findOne({_id:newOrder._id,paymentMethod:"COD"})
        if(COD){
            res.status(201).json({ success: true})
        }
       
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const generateOrderId = () => {
    const timestamp = Date.now(); 
    const randomValue = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${randomValue}`;
}

const showOrderPlaced = async (req,res) => {
    try {
    
        const orderId = req.session.orderId
        return res.render('orderPlaced',{orderId})

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const cancelProduct = async (req,res) => {
    try {
        const {productId,orderId} = req.body
        let cancelOrder = await Order.pdateOne({_id:orderId,"orderedItems.product":productId},{$set:{orderStatus:"Cancelled"}})

        if(cancelOrder){
            return res.json({status:true,message:"Order cancelled"})
        }
        res.json({status:false,message:"Order cancellation failed"})

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const getOrderDetailsForUser = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const orderDetails = await Order.findById(orderId)
            .populate('orderedItems.product') // Populating ordered products
            .populate('address'); // Populating the address

        // let address = await Order.aggregate([
        //     {$match:{_id:orderId}},
        //     { $lookup: {
        //       from: 'addresses',
        //       localField: "address",
        //       foreignField: "address._id",
        //       as: "userAddress"
        //     }},
        // ])    

        if (!orderDetails) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(orderDetails);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: 'Server error' });
    }
}


module.exports = {
    cancelProduct,
    addNewAddress,
    getUserAddress,
    showOrderPlaced,
    loadPaymentPage,
    storeOrderDetails,
    loadAddNewAddress,
    getOrderDetailsForUser,
    loadFirstPageOfCheckout,
}