const express = require('express')
const { use } = require('passport')
const mongoose = require('mongoose')
const Order = require('../../Models/orderSchema')


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
        const order = await Order.findOne({_id: new mongoose.Types.ObjectId(id)})

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

const updateOrderStatus = async (req,res) => {
    try {
        const { orderId, orderStatus } = req.body;
        
        if (orderStatus === 'Pending' || orderStatus === 'Shipped' || orderStatus === 'Delivered') {
            await Order.updateOne({ _id: orderId }, { $set: { orderStatus ,"orderedItems.$[].status":orderStatus }});
            return res.json({success:true, message: "Order status updated successfully!"});
        }

        res.status(500).json({success:false,message:"Something went wrong"})

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const cancelOrder = async (req,res) => {
    const {productId} = req.body
    const userId = req.session.user

    try {
        
        const cancelOrder = await Order.updateOne({userId,'orderedItems.product':productId},{$set:{"orderedItems.$[].status":"Cancelled"}})
        
        const cancelAll = await Order.updateOne({userId,"orderedItems.status":{$all:["Cancelled"]}},{$set:{orderStatus:"Cancelled"}})

        if(cancelOrder || cancelAll){
            return res.json({success:true, message: "Order cancelled successfully!"});
        }

        return res.json({success:false, message: "Order cancellation failed!"});
       
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

module.exports = { getOrdersList, getOrderDetails, updateOrderStatus, cancelOrder }