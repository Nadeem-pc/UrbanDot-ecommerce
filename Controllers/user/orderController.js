const User = require('../../Models/userSchema')
const Cart = require('../../Models/cartSchema')
const Order = require('../../Models/orderSchema')
const Coupon = require('../../Models/couponSchema')
const Product = require('../../Models/productSchema')
const Address = require('../../Models/addressSchema')
const Wallet = require('../../Models/walletSchema')

const mongoose = require('mongoose')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const express = require('express')
const { use } = require('passport')
const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const session = require('express-session')


const loadFirstPageOfCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) }).populate('items.productId');

        if (!cart || !cart.items.length) {
            return res.redirect('/unavailable');
        }

        const validItems = [];
        const stockErrors = [];

        for (const item of cart.items) {
            const product = await Product.findById(item.productId).populate('category');
            if (
                product &&
                !product.isBlocked &&
                product.category.isActive !== false &&
                product.stock > 0
            ) {
                if (product.stock >= item.quantity) {
                    validItems.push({ ...item.toObject(), product });
                } else {
                    stockErrors.push({
                        productName: product.productName,
                        availableStock: product.stock,
                    });
                }
            }
        }

        if (stockErrors.length > 0) {
            // Render a page or redirect to a page with stock error details
            return res.render('stockErrorPage', {
                stockErrors, // Pass stock errors to the template
                message: "Some products have insufficient stock.",
            });
        }

        const addressResult = await Address.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $project: {
                    address: {
                        $filter: {
                            input: "$address",
                            as: "addr",
                            cond: { $eq: ["$$addr.isDeleted", false] },
                        },
                    },
                },
            },
        ]);
        const address = addressResult[0] || { address: [] };

        if (!validItems.length) {
            return res.redirect('/unavailable');
        }

        const totalPrice = validItems.reduce((total, item) => {
            const price = item.product.offerPrice !== null ? item.product.offerPrice : item.product.regularPrice;
            return total + item.quantity * price;
        }, 0);

        req.session.products = validItems;
        req.session.totalAmount = totalPrice;

        const currentDate = new Date();

        // Find only active coupons with future expiry dates
        const coupons = await Coupon.find({
            status: 'Active',
            expiresOn: { $gte: currentDate },
        });
    
        // Calculate days left for each coupon and include it in the response
        const couponsWithDaysLeft = coupons.map((coupon) => {
            const expiryDate = new Date(coupon.expiresOn);
            const timeDifference = expiryDate - currentDate;
    
            const daysLeft = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    
            return {
                ...coupon._doc,
                daysLeft, // Add daysLeft to the coupon data
            };
        });
    
        // Pass `couponsWithDaysLeft` to the frontend instead of `coupons`
        return res.render('checkoutFirstSlide', {
            coupons: couponsWithDaysLeft,
            address,
            cart,
            totalPrice,
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const verifyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid Coupon. Please try again' });
        }

        const now = new Date();
        if (coupon.status !== 'Active' || coupon.expiresOn < now) {
            return res.json({ success: false, message: 'Coupon is no longer valid' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        const totalAmount = cart.items.reduce((total, item) => total + item.totalPrice +50, 0);
        req.session.totalAmount = totalAmount
        const discountAmount = coupon.discount;
        req.session.discountAmount = coupon.discount
        const discountedTotal = totalAmount - discountAmount;

        if (totalAmount < coupon.minPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ${coupon.minPurchase} is required for activating this coupon`
            });
        }
        const couponUsed = await User.findOne({_id: userId,'usedCoupons.couponId': coupon._id})
        
        if(couponUsed){
            return res.json({success: false, message: "Coupon already used"})
        }

        await User.findByIdAndUpdate(
            userId,
            {
                $addToSet: {
                    usedCoupons: {
                        couponId: coupon._id
                    }
                }
            },
            { new: true }
        );
        
        return res.json({
            success: true,
            message: `Coupon applied! You saved ₹${discountAmount.toFixed(2)}`,
            discountAmount,
            totalAmount: discountedTotal,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const removeCoupon = async (req,res) => {
    const { couponCode } = req.body;
    const userId = req.session.user; 
    try {
        
        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code.' });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: {
                usedCoupons: { couponId: coupon._id }
            }
        });

        res.json({ success: true, message: 'Coupon removed successfully.' });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

const loadAddNewAddress = async (req,res) => {
    try {
        const cartId = req.params
        let cart = await Cart.findOne({_id:new mongoose.Types.ObjectId(cartId)}).populate('items.productId')   
        
        return res.render('addNewAddress',{cart,totalPrice:req.session.totalPayable, products:req.session.products})

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const addNewAddress = async (req,res) => {
    const{name,phone,pincode,fullAddress,city,country,state,addressType} = req.body
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
        return res.json({ error: "Internal Server Error" })
    }
}

const loadPaymentPage = async (req, res) => {
    try {
        const id = req.session.user;

        const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(id) }).populate('items.productId');
        const razorpayKey = process.env.RAZORPAY_KEY;
        return res.render('payment', { products: req.session.products, totalPrice : req.session.totalAmount, totalPayable : req.session.totalPayable, razorpayKey });

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const getUserAddressInCheckout = async (req,res) => {
    try {
        const{address,totalPayable} = req.body        
       req.session.address = address
       req.session.totalPayable = totalPayable
       
       if(req.session.address){
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

        let discountAmount = req.session.discountAmount || 0;

        const updateProductStock = async (orderedItems) => {
            for(const item of orderedItems){
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: -item.quantity } },
                    { new: true}
                )
            }
        }
        
        if (paymentMethod === 'COD') {
            const totalProductPrice = req.session.products.reduce((sum, item) => sum + item.price * item.quantity, 0); 
            if(totalProductPrice >= 950){
                return res.json({success:false, message: "Purchase above Rs 1000 cannot be proceed with COD"})
            }
        
            const orderedItems = req.session.products.map((item) => {
                const proportionalDiscount = (item.price * item.quantity / totalProductPrice) * discountAmount; 
                const discountedPrice = item.price - proportionalDiscount / item.quantity;
        
                return {
                    product: item.productId,
                    quantity: item.quantity,
                    discountApplied: proportionalDiscount.toFixed(2),
                    price: discountedPrice.toFixed(2), 
                };
            });
        
            const newOrder = new Order({
                userId: user,
                paymentMethod: 'COD',
                paymentStatus: 'Success',
                orderDate: formattedDate,
                orderId: req.session.orderId,
                address: req.session.address,
                orderedItems,
                totalDiscountApplied: discountAmount,
                totalAmount: req.session.totalPayable,
            });
        
            await newOrder.save();
            await updateProductStock(orderedItems)          
            await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } });
        
            req.session.address = null;
            req.session.products = null;
            req.session.totalPayable = null;
            req.session.totalAmount = null;
            req.session.discountAmount = null;
        
            res.status(201).json({ success: true });
        }else if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId: user });
        
            if (!wallet || wallet.balanceAmount < req.session.totalPayable) {
                return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
            }
        
            const categories = req.session.products.map(item => item.product.category.name).join(", ");
            wallet.balanceAmount -= req.session.totalPayable;
        
            wallet.transactions.push({
                type: "Debit",
                amount: req.session.totalPayable,
                date: new Date(),
                description: `Purchase on ${categories}`
            });
        
            await wallet.save();
        
            const totalProductPrice = req.session.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
            const orderedItems = req.session.products.map((item) => {
                const proportionalDiscount = (item.price * item.quantity / totalProductPrice) * discountAmount; 
                const discountedPrice = item.price - proportionalDiscount / item.quantity; 
                return {
                    product: item.productId,
                    quantity: item.quantity,
                    discountApplied: proportionalDiscount.toFixed(2),
                    price: discountedPrice.toFixed(2)
                };
            });
        
            const newOrder = new Order({
                userId: user,
                paymentMethod: 'Wallet',
                paymentStatus: 'Success',
                orderDate: formattedDate,
                orderId: req.session.orderId,
                address: req.session.address,
                orderedItems,
                totalDiscountApplied: discountAmount,
                totalAmount: req.session.totalPayable,
            });
        
            await newOrder.save();
            await updateProductStock(orderedItems);
            await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } });
        
            req.session.address = null;
            req.session.products = null;
            req.session.totalPayable = null;
            req.session.totalAmount = null;
            req.session.discountAmount = null;
        
            return res.status(201).json({ success: true });
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

const cancelProduct = async (req, res) => {
    try {
        const { productId, orderId } = req.body;

        // Find the order first to check payment method and get product details
        const order = await Order.findOne({ _id: orderId });
        if (!order) {
            return res.json({ status: false, message: "Order not found." });
        }

        const product = order.orderedItems.find(item => item.product.toString() === productId);
        if (!product) {
            return res.json({ status: false, message: "Product not found in order." });
        }

        const cancelOrder = await Order.updateOne(
            {
                _id: orderId,
                "orderedItems.product": productId,
            },
            {
                $set: {
                    "orderedItems.$.status": "Cancelled",
                },
            }
        );
        const refundAmount = product.price * product.quantity;

        const updatedTotalAmount = order.totalAmount - refundAmount;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { totalAmount: updatedTotalAmount },
            { new: true } 
        );
        

        if (cancelOrder.modifiedCount > 0) {
            // Refund logic for Wallet or Razorpay
            if (order.paymentMethod === "Wallet" || order.paymentMethod === "Razorpay" && order.paymentStatus === "Success") {

          
                // Update the user's wallet
                const wallet = await Wallet.findOne({ userId: order.userId });
                if (wallet) {
                    wallet.balanceAmount += refundAmount;
                    wallet.transactions.push({
                        type: "credit",
                        amount: refundAmount.toFixed(2),
                        description: `Refund for cancelled product on order ${order.orderId}`,
                    });
                    await wallet.save();
                } else {
                    await Wallet.create({
                        userId: order.userId,
                        balanceAmount: refundAmount.toFixed(2),
                        transactions: [
                            {
                                type: 'credit',
                                amount: refundAmount.toFixed(2),
                                description: `Refund for cancelled order ${order.orderId}`
                            }
                        ]
                    });
                }
            }

            // Check if all items are cancelled to update the overall order status
            const updatedOrder = await Order.findOne({ _id: orderId });
            if (updatedOrder.orderedItems.every(item => item.status === "Cancelled")) {
                await Order.updateOne(
                    { _id: orderId },
                    { $set: { orderStatus: "Cancelled" } }
                );
            }

            return res.json({ status: true, message: "Order cancelled and refund processed successfully." });
        }

        res.json({ status: false, message: "Order cancellation failed." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const cancelOrder = async (req,res) => {
    const { orderId } = req.body
    try {
        const order = await Order.findById(orderId);
        const cancelOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                orderStatus: 'Cancelled',
                "orderedItems.$[].status": "Cancelled" 
            },
            { new: true, arrayFilters: [] } 
        );
        if(!cancelOrder){
            return res.json({ success: false, message: "Order cancellation failed. Please try again"})
        }


        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { totalAmount: 0 },
            { new: true } 
        );

        if (order.paymentMethod === 'Wallet' || order.paymentMethod === 'Razorpay' && order.paymentStatus === 'Success') {
            // Refund the total amount to the user's wallet
            const refundAmount = order.totalAmount;

            const wallet = await Wallet.findOne({ userId: order.userId });
            if (wallet) {
                // Update wallet balance and add a transaction
                wallet.balanceAmount += refundAmount;
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for cancelled order ${order.orderId}`
                });
                await wallet.save();
            } else {
                // If the wallet doesn't exist, create a new wallet for the user
                await Wallet.create({
                    userId: order.userId,
                    balanceAmount: refundAmount,
                    transactions: [
                        {
                            type: 'credit',
                            amount: refundAmount,
                            description: `Refund for cancelled order ${order.orderId}`
                        }
                    ]
                });
            }
        }

        res.json({ success: true, message: "Order cancelled successfully"})
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const getOrderDetailsForUser = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const orderDetails = await Order.findById(orderId)
        .populate('orderedItems.product')
        .lean();

        if (!orderDetails) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const addressDetails = await Address.findOne(
            { "address._id": orderDetails.address },
            { address: { $elemMatch: { _id: orderDetails.address } } }
        );

        if (!addressDetails || !addressDetails.address || addressDetails.address.length === 0) {
            console.log('No address found for the given ObjectId');
            orderDetails.deliveryAddress = null;
        } else {
            orderDetails.deliveryAddress = addressDetails.address[0];
        }
        res.json(orderDetails);

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
});

const createRazorpayOrder = async (req, res) => {
    try {
        const amount = req.session.totalPayable * 100; 

        const options = {
            amount: amount.toFixed(0),  
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({ success: true, orderId: order.id, amount: order.amount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { payment_id, order_id, signature, existingOrderId } = req.body;

        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest('hex');

        if (generated_signature === signature) {
            const existingOrder = await Order.findOne({ orderId: existingOrderId });

            if (existingOrder) {
                existingOrder.paymentStatus = "Success";
                existingOrder.paymentMethod = "Razorpay";
                await existingOrder.save();
                await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } });
                return res.status(200).json({ success: true });
            }

            const user = req.session.user;
            const date = new Date();
            const formattedDate = `${date.toDateString()}`;
            const orderId = generateOrderId();

            let discountAmount = req.session.discountAmount || 0;

            const updateProductStock = async (orderedItems) => {
                for(const item of orderedItems){
                    await Product.findByIdAndUpdate(
                        item.product,
                        { $inc: { stock: -item.quantity } },
                        { new: true}
                    )
                }
            }

            const totalProductPrice = req.session.products.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            const orderedItems = req.session.products.map((item) => {
                const proportionalDiscount = (item.price * item.quantity / totalProductPrice) * discountAmount; 
                const discountedPrice = item.price - proportionalDiscount / item.quantity; 

                return {
                    product: item.productId,
                    quantity: item.quantity,
                    discountApplied: proportionalDiscount.toFixed(2),
                    price: discountedPrice.toFixed(2),
                };
            });

            const newOrder = new Order({
                userId: user,
                paymentMethod: "Razorpay",
                paymentStatus: "Success",
                orderDate: formattedDate,
                orderId,
                address: req.session.address,
                orderedItems,
                totalDiscountApplied: discountAmount,
                totalAmount: req.session.totalPayable,
            });

            await newOrder.save();
            await updateProductStock(orderedItems)
            await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } });

            req.session.orderId = orderId;
            req.session.address = null;
            req.session.products = null;
            req.session.totalPayable = null;
            req.session.totalAmount = null;
            req.session.discountAmount = null;

            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const handleFailedPayment = async (req, res) => {
    try {
        const user = req.session.user;
        const date = new Date();
        const formattedDate = `${date.toDateString()}`;
        const orderId = generateOrderId();

        let discountAmount = req.session.discountAmount || 0;

        const totalProductPrice = req.session.products.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        const orderedItems = req.session.products.map((item) => {
            const proportionalDiscount = (item.price * item.quantity / totalProductPrice) * discountAmount;
            const discountedPrice = item.price - proportionalDiscount / item.quantity;

            return {
                product: item.productId,
                quantity: item.quantity,
                discountApplied: proportionalDiscount.toFixed(2),
                price: discountedPrice.toFixed(2),
            };
        });

        const newOrder = new Order({
            userId: user,
            paymentMethod: "Razorpay",
            paymentStatus: "Pending",
            orderDate: formattedDate,
            orderId,
            address: req.session.address,
            orderedItems,
            totalDiscountApplied: discountAmount,
            totalAmount: req.session.totalPayable,
        });

        await newOrder.save();
        await Cart.findOneAndUpdate({ userId: req.session.user }, { $set: { items: [] } });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to save order with pending status" });
    }
};

const returnProduct = async (req,res) => {
    try {
        const{ productId, orderId, reason } = req.body

        let sendReturnReq = await Order.updateOne(
            { _id : orderId, "orderedItems.product" : productId },
            { $set: { "orderedItems.$.returnStatus" : true, "orderedItems.$.returnReason": reason } }
        );

        if(!sendReturnReq){
            return res.json({ status: false, message: "product return failed." });
        }
        res.json({ status: true, message: "Return request sended successfully" })
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
}

const downloadInvoice = async (req, res) => {
    const { orderId } = req.params;
    const user = req.session.user
    try {
        const order = await Order.findOne({ orderId }).populate({
            path: 'orderedItems.product',
            select: 'productName',
        })

        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found" });
        }

        const shippingAddress = await Address.findOne({user})
          
        let address =  shippingAddress.address.find(address => String(address._id)  == String(order.address))
              
        const orderDetails = {
            orderId: orderId,
            orderDate: new Date(order.orderDate),
            paymentMethod: order.paymentMethod,
            totalAmount: order.totalAmount,
            totalDiscountApplied: order.totalDiscountApplied,
            address,
            orderedItems: order.orderedItems.map(item => ({
                productName: item.product.productName,
                quantity: item.quantity,
                price: item.price,
                discountApplied: item.discountApplied,
                totalPrice: item.quantity * item.price,
            })),
        };

        // Create a new PDF document
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${orderId}-invoice.pdf`);
        doc.pipe(res);
        
        // Add Invoice Header
        doc.fontSize(28).font('Helvetica-Bold').fillColor('#4CAF50').text('UrbanDot', { align: 'left' }).moveDown();
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#000000').text('Invoice', { align: 'center' });
        doc.moveTo(50, doc.y + 5).lineTo(560, doc.y + 5).stroke('#000000'); // Add underline below "Invoice"
        doc.moveDown(2);
        
        // Add Order Details
        doc.fontSize(13).font('Helvetica-Bold').text('Order Details', { indent: 20 });
        doc.moveDown();
        doc.fontSize(11).font('Helvetica').text(`Order Id: ${orderDetails.orderId}`, { indent: 20 });
        doc.text(`Order Date: ${orderDetails.orderDate.toDateString()}`, { indent: 20 });
        doc.text(`Payment Method: ${orderDetails.paymentMethod}`, { indent: 20 });
        doc.moveDown();
        
        // Add Shipping Address
        doc.fontSize(13).font('Helvetica-Bold').text('Shipping Address', { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`Name: ${orderDetails.address.name}`, { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`Address: ${orderDetails.address.fullAddress}`, { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`${orderDetails.address.city}`, { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`${orderDetails.address.state}`, { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`${orderDetails.address.country}`, { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`${orderDetails.address.pincode}`, { indent: 20 }).moveDown();
        doc.fontSize(11).font('Helvetica').text(`Mobile: ${orderDetails.address.phone}`, { indent: 20 }).moveDown();
        
        doc.moveDown();

        // Prepare Table Data
        const tableData = {
            headers: ['Product Name', 'Quantity', 'Unit Price', 'Discount Applied', 'Total Price'],
            rows: orderDetails.orderedItems.map(item => [
                item.productName,
                item.quantity.toString(),
                `Rs ${item.price.toFixed(2)}`,
                `Rs ${item.discountApplied.toFixed(2)}`,
                `Rs ${item.totalPrice.toFixed(2)}`
            ]),
        };

        // Add Table to the PDF
        doc.moveDown();
        doc.table(tableData, {
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
            prepareRow: (row, i) => doc.font('Helvetica').fontSize(10),
            columnSpacing: 11, // Add spacing between columns
            padding: 5, // Add padding inside each cell
            width: 530, // Adjust the table width
            x: 45
        });

        // Add Total Summary
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`Discount Applied: Rs ${orderDetails.totalDiscountApplied.toFixed(2)}`, { align: 'right' });
        doc.text("Delivery Charges: Rs 50.00", { align: 'right' });
        doc.text(`Total Amount: Rs ${orderDetails.totalAmount.toFixed(2)}`, { align: 'right' });
        doc.moveDown(3);
        doc.fontSize(13).text("Thank you for shopping with us!", { align: 'center' });

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const existingOrder = await Order.findOne({ orderId }).populate('orderedItems.product');
        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const orderedItems = existingOrder.orderedItems;
        for (let item of orderedItems) {
            const product = item.product;
            const newStock = product.stock - item.quantity;

            if (newStock < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product: ${product.productName}`
                });
            }

            product.stock = newStock;
            await product.save();
        }

        const amount = existingOrder.totalAmount * 100; // Convert to paisa
        const options = {
            amount: amount.toFixed(0),
            currency: "INR",
            receipt: `retry_order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({ success: true, orderId: order.id, amount: order.amount });
    } catch (error) {
        console.error("Error creating retry payment:", error);
        res.status(500).json({ success: false, message: "Failed to retry payment" });
    }
};


module.exports = {
    cancelOrder,
    verifyCoupon,
    removeCoupon,
    cancelProduct,
    retryPayment,
    returnProduct,
    addNewAddress,
    showOrderPlaced,
    loadPaymentPage,
    downloadInvoice,
    storeOrderDetails,
    loadAddNewAddress,
    createRazorpayOrder,
    handleFailedPayment,
    verifyRazorpayPayment,
    getOrderDetailsForUser,
    loadFirstPageOfCheckout,
    getUserAddressInCheckout,
}