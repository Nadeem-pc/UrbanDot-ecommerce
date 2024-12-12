const express = require('express')
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
        .sort({createdAt:-1})
        
        return res.render('listOrders',{orders})
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}

const getOrderDetails = async (req, res) => {
    try {
        const id = req.params.id;

        // Fetch order details
        const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(id) });

        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },

            // Lookup user details
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },

            // Unwind orderedItems for detailed product information
            { $unwind: '$orderedItems' },

            // Lookup product details
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },

            // Lookup address details, specifically filtering for the matching address
            {
                $lookup: {
                    from: 'addresses',
                    let: { addressId: '$address' },
                    pipeline: [
                        { $unwind: '$address' },
                        { $match: { $expr: { $eq: ['$address._id', '$$addressId'] } } },
                    ],
                    as: 'userAddress',
                },
            },
        ]);

        return res.render('orderDetail', { order, orderDetails });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

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

const cancelOrder = async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user;

    try {
        await Order.updateOne(
            { userId, 'orderedItems.product': productId },
            { $set: { 'orderedItems.$.status': 'Cancelled' } }
        );

        const order = await Order.findOne({ userId });

        if (order && order.orderedItems.every(item => item.status === "Cancelled")) {
            // Update the overall order status to 'Cancelled' if all items are cancelled
            await Order.updateOne(
                { _id: order._id },
                { $set: { orderStatus: "Cancelled" } }
            );
        }
        return res.json({ success: true, message: "Order item cancelled successfully!" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getOrdersList, getOrderDetails, updateOrderStatus, cancelOrder }