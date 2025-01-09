const express = require('express')
const mongoose = require('mongoose')
const Order = require('../../Models/orderSchema')
const Wallet = require('../../Models/walletSchema')
const Product = require('../../Models/productSchema')


const getOrdersList = async (req, res) => {
    try {
        const { page = 1 } = req.query; 
        const limit = 10;
        const skip = (page - 1) * limit; 
        const totalOrders = await Order.countDocuments();

        // Fetch paginated orders with aggregation and sorting
        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip }, 
            { $limit: limit }, 
        ]);

        const totalPages = Math.ceil(totalOrders / limit);

        return res.render('listOrders', {
            orders,
            currentPage: parseInt(page),
            totalPages,
        })

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.redirect('/admin/pageNotFound');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(id) });

        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },

            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },

            { $unwind: '$orderedItems' },

            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },

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
        res.redirect('/admin/pageNotFound')
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, orderStatus } = req.body;

        if (['Pending', 'Shipped', 'Delivered'].includes(orderStatus)) {
            await Order.updateOne(
                { _id: orderId },
                { 
                    $set: { 
                        orderStatus, 
                        "orderedItems.$[elem].status": orderStatus 
                    }
                },
                {
                    arrayFilters: [{ "elem.status": { $ne: "Cancelled" } }] 
                }
            );

            return res.json({ success: true, message: "Order status updated successfully!" });
        }

        res.status(400).json({ success: false, message: "Invalid order status" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

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

const approveReturnReq = async (req, res) => {
    try {
        const { productId, orderId, action } = req.body;

        // Validate input
        if (!productId || !orderId) {
            return res.status(400).json({ success: false, message: "Missing productId or orderId." });
        }

        if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid productId or orderId." });
        }

        if (action === "approve") {
            // Approve return request
            const reqApproved = await Order.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(orderId),
                    'orderedItems.product': new mongoose.Types.ObjectId(productId),
                },
                { 
                    $set: { 
                        'orderedItems.$.adminApprovalStatus': 'Approved', 
                        'orderedItems.$.status': 'Returned', 
                        orderStatus: "Returned", 
                        paymentStatus: "Refunded" 
                    } 
                }
            );

            if (reqApproved.matchedCount === 0) {
                return res.json({ success: false, message: "No matching order or product found." });
            }

            const order = await Order.findById(orderId);

            if (order && (order.paymentMethod === "Razorpay" || order.paymentMethod === "COD" || order.paymentMethod === "Wallet")) {
                const orderedItem = order.orderedItems.find(item => item.product.toString() === productId);

                if (orderedItem) {
                    const amountToAdd = orderedItem.price * orderedItem.quantity;

                    const product = await Product.findById(productId).populate('category');
                    if (!product) {
                        return res.status(404).json({ success: false, message: "Product not found." });
                    }

                    const wallet = await Wallet.findOne({ userId: order.userId });
                    if (wallet) {
                        wallet.balanceAmount += amountToAdd;
                        wallet.transactions.push({
                            type: "credit",
                            amount: amountToAdd,
                            description: `Refund for ${product.category.name}`, 
                        });
                        await wallet.save();
                    }
                }
            }

            return res.json({ success: true, message: "Return request approved successfully!" });
        } else {
            // Reject return request
            const reqRejected = await Order.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(orderId),
                    'orderedItems.product': new mongoose.Types.ObjectId(productId),
                },
                { 
                    $set: { 
                        'orderedItems.$.adminApprovalStatus': "Rejected", 
                    } 
                }
            );

            if (reqRejected.matchedCount === 0) {
                return res.json({ success: false, message: "No matching order or product found." });
            }

            return res.json({ success: true, message: "Return request rejected successfully!" });
        }
    } catch (error) {
        console.error("Error in approveReturnReq:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports = { getOrdersList, getOrderDetails, updateOrderStatus, cancelOrder, approveReturnReq }